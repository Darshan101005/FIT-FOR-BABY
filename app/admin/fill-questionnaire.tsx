import { generateQuestionId, parseQuestionnaire, setQuestionnaireCustomization } from '@/data/questionnaireParser';
import { questionnaireCustomizationService, questionnaireService } from '@/services/firestore.service';
import { QuestionnaireAnswer, QuestionnaireLanguage } from '@/types/firebase.types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const isWeb = Platform.OS === 'web';

const COLORS = {
  primary: '#006dab',
  accent: '#98be4e',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  background: '#f8fafc',
  surface: '#ffffff',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
};

export default function FillQuestionnaireScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const coupleId = (params.coupleId as string) || '';
  const gender = ((params.gender as string) === 'male' ? 'male' : 'female') as 'male' | 'female';
  const coupleName = (params.coupleName as string) || coupleId;

  const [language, setLanguage] = useState<QuestionnaireLanguage>('english');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [answers, setAnswers] = useState<Record<string, QuestionnaireAnswer>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);
  const [custReady, setCustReady] = useState(0);

  const showBanner = (type: 'success' | 'error', msg: string) => {
    setBanner({ type, msg });
    setTimeout(() => setBanner(null), 4000);
  };

  // Load customization + existing progress
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        try {
          const c = await questionnaireCustomizationService.get();
          setQuestionnaireCustomization(c);
          setCustReady((v) => v + 1);
        } catch { /* ignore */ }

        const progress = await questionnaireService.getProgress(coupleId, gender);
        if (!mounted) return;
        if (progress) {
          setHasExisting(true);
          setIsComplete(!!progress.isComplete);
          setAnswers(progress.answers || {});
          if (progress.language) setLanguage(progress.language);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    const failsafe = setTimeout(() => setLoading(false), 15000);
    return () => { mounted = false; clearTimeout(failsafe); };
  }, [coupleId, gender]);

  // Parse the questionnaire for the chosen language + gender
  const parsed = useMemo(() => parseQuestionnaire(language, gender), [language, gender, custReady]);

  const totalQuestions = parsed.totalQuestions;
  const answeredCount = Object.keys(answers).length;

  const setAnswer = (
    partId: string, sectionId: string, number: string, questionText: string,
    value: string | string[], conditionalAnswer?: string
  ) => {
    const questionId = generateQuestionId(partId, sectionId, number);
    setAnswers((prev) => {
      const next = { ...prev };
      const isEmpty = value === '' || (Array.isArray(value) && value.length === 0);
      if (isEmpty && !conditionalAnswer) {
        delete next[questionId];
        return next;
      }
      next[questionId] = {
        questionId, partId, sectionId, questionNumber: number,
        questionText,
        answer: value,
        conditionalAnswer: conditionalAnswer || undefined,
        answeredAt: Timestamp.now(),
      };
      return next;
    });
  };

  const handleSave = async (markComplete: boolean) => {
    if (!coupleId) return showBanner('error', 'No couple selected.');
    setSaving(true);
    try {
      await questionnaireService.adminSaveResponses(coupleId, gender, language, answers, markComplete);
      setIsComplete(markComplete);
      setHasExisting(true);
      showBanner('success', markComplete ? 'Questionnaire saved & marked complete.' : 'Progress saved.');
    } catch (e) {
      console.error(e);
      showBanner('error', 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await questionnaireService.resetQuestionnaire(coupleId, gender);
      setAnswers({});
      setIsComplete(false);
      setHasExisting(false);
      showBanner('success', 'Questionnaire deleted. You can fill it again.');
    } catch (e) {
      console.error(e);
      showBanner('error', 'Failed to delete.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Fill Questionnaire</Text>
            <Text style={styles.subtitle}>{coupleName} • {gender === 'male' ? 'Male' : 'Female'}</Text>
          </View>
        </View>

        {banner && (
          <View style={[styles.banner, banner.type === 'success' ? styles.bannerSuccess : styles.bannerError]}>
            <Ionicons name={banner.type === 'success' ? 'checkmark-circle' : 'alert-circle'} size={18} color={banner.type === 'success' ? COLORS.success : COLORS.error} />
            <Text style={[styles.bannerText, { color: banner.type === 'success' ? '#15803d' : '#b91c1c' }]}>{banner.msg}</Text>
          </View>
        )}

        {/* Status + language + progress */}
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View style={[styles.statusPill, isComplete ? styles.pillComplete : hasExisting ? styles.pillPartial : styles.pillNew]}>
              <Text style={styles.statusPillText}>{isComplete ? 'Completed' : hasExisting ? 'In Progress' : 'Not Started'}</Text>
            </View>
            <Text style={styles.progressText}>{answeredCount} / {totalQuestions} answered</Text>
          </View>

          <Text style={styles.fieldLabel}>Language</Text>
          <View style={styles.segment}>
            {(['english', 'tamil'] as QuestionnaireLanguage[]).map((l) => (
              <TouchableOpacity key={l} style={[styles.segBtn, language === l && styles.segBtnActive]} onPress={() => setLanguage(l)}>
                <Text style={[styles.segText, language === l && styles.segTextActive]}>{l === 'english' ? 'English' : 'தமிழ்'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {hasExisting && (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} disabled={deleting}>
              {deleting ? <ActivityIndicator size="small" color={COLORS.error} /> : <Ionicons name="trash-outline" size={16} color={COLORS.error} />}
              <Text style={styles.deleteBtnText}>Delete & start over</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Questions grouped by part/section */}
        {parsed.parts.map((part) => (
          <View key={part.id} style={styles.card}>
            <Text style={styles.partTitle}>{part.title}</Text>
            {part.sections.map((section) => (
              <View key={section.id} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {section.questions.map((q) => {
                  const questionId = generateQuestionId(part.id, section.id, q.number);
                  const current = answers[questionId];
                  const currentVal = current?.answer;
                  return (
                    <View key={questionId} style={styles.qBlock}>
                      <Text style={styles.qText}>{q.number}. {q.question}</Text>

                      {q.type === 'mcq' ? (
                        <View style={styles.optionsWrap}>
                          {(q.options || []).map((opt, oi) => {
                            const selected = currentVal === opt;
                            return (
                              <TouchableOpacity
                                key={oi}
                                style={[styles.optionBtn, selected && styles.optionBtnActive]}
                                onPress={() => setAnswer(part.id, section.id, q.number, q.question, selected ? '' : opt, current?.conditionalAnswer)}
                              >
                                <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={16} color={selected ? COLORS.primary : COLORS.textMuted} />
                                <Text style={[styles.optionText, selected && styles.optionTextActive]}>{opt}</Text>
                              </TouchableOpacity>
                            );
                          })}
                          {!!q.conditional_textfield && (
                            <TextInput
                              style={styles.input}
                              placeholder={q.conditional_textfield}
                              placeholderTextColor={COLORS.textMuted}
                              value={current?.conditionalAnswer || ''}
                              onChangeText={(t) => setAnswer(part.id, section.id, q.number, q.question, (currentVal as string) || '', t)}
                            />
                          )}
                        </View>
                      ) : (
                        <TextInput
                          style={[styles.input, q.type === 'textfield' && { minHeight: 80, textAlignVertical: 'top' }]}
                          placeholder={language === 'english' ? 'Type answer...' : 'பதிலை உள்ளிடவும்...'}
                          placeholderTextColor={COLORS.textMuted}
                          value={(currentVal as string) || ''}
                          onChangeText={(t) => setAnswer(part.id, section.id, q.number, q.question, t)}
                          multiline={q.type === 'textfield'}
                          keyboardType={q.type === 'fillup' ? 'default' : 'default'}
                        />
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        ))}

        {/* Save actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.saveBtn, styles.saveDraft, saving && { opacity: 0.6 }]} onPress={() => handleSave(false)} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="save-outline" size={18} color={COLORS.primary} />}
            <Text style={[styles.saveBtnText, { color: COLORS.primary }]}>Save Progress</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.saveBtn, styles.saveComplete, saving && { opacity: 0.6 }]} onPress={() => handleSave(true)} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark-circle" size={18} color="#fff" />}
            <Text style={styles.saveBtnText}>Save & Complete</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 16, maxWidth: 900, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.borderLight, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, marginBottom: 12, borderWidth: 1 },
  bannerSuccess: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  bannerError: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  bannerText: { flex: 1, fontSize: 13, fontWeight: '500' },
  card: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  pillComplete: { backgroundColor: '#dcfce7' },
  pillPartial: { backgroundColor: '#fef3c7' },
  pillNew: { backgroundColor: COLORS.borderLight },
  statusPillText: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  progressText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
  segment: { flexDirection: 'row', gap: 8 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  segBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  segText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  segTextActive: { color: '#fff' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, alignSelf: 'flex-start' },
  deleteBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.error },
  partTitle: { fontSize: 16, fontWeight: '800', color: COLORS.primary, marginBottom: 8 },
  section: { marginTop: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8, marginTop: 8 },
  qBlock: { marginBottom: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  qText: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 10, lineHeight: 20 },
  optionsWrap: { gap: 8 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  optionBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  optionText: { fontSize: 14, color: COLORS.textPrimary, flex: 1 },
  optionTextActive: { color: COLORS.primary, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.textPrimary, backgroundColor: COLORS.background, marginTop: 8, ...(isWeb ? { outlineStyle: 'none' } as any : {}) },
  actionRow: { flexDirection: 'row', gap: 10 },
  saveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  saveDraft: { borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: COLORS.surface },
  saveComplete: { backgroundColor: COLORS.primary },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
