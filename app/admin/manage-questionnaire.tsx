import { listBaseQuestions, setQuestionnaireCustomization } from '@/data/questionnaireParser';
import { questionnaireCustomizationService } from '@/services/firestore.service';
import { translateListToTamil, translateToTamil } from '@/services/translate.service';
import { CustomQuestion, EditedQuestion } from '@/types/firebase.types';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
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

type QType = 'mcq' | 'fillup' | 'textfield';
const TYPE_LABELS: Record<QType, string> = { mcq: 'Multiple Choice', fillup: 'Short Answer', textfield: 'Long Answer' };

const genId = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// Capitalize the first alphabetic character; keep the rest as typed.
const capitalizeFirst = (t: string): string => {
  const s = (t || '').trim();
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
};

interface OptionPair { en: string; ta: string; }

export default function ManageQuestionnaireScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [translatingQ, setTranslatingQ] = useState(false);      // question translate
  const [translatingOpts, setTranslatingOpts] = useState(false); // options translate
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [disabledQuestions, setDisabledQuestions] = useState<string[]>([]);
  const [editedQuestions, setEditedQuestions] = useState<Record<string, EditedQuestion>>({});
  const [adminId, setAdminId] = useState<string | undefined>(undefined);

  const [viewGender, setViewGender] = useState<'men' | 'women'>('women');

  // Form (used for both add-custom and edit-existing)
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);
  const [editingBaseId, setEditingBaseId] = useState<string | null>(null);
  const [formGender, setFormGender] = useState<'men' | 'women' | 'both'>('both');
  const [formType, setFormType] = useState<QType>('mcq');
  const [formQuestionEn, setFormQuestionEn] = useState('');
  const [formQuestionTa, setFormQuestionTa] = useState('');
  const [formOptions, setFormOptions] = useState<OptionPair[]>([{ en: '', ta: '' }, { en: '', ta: '' }]);

  useEffect(() => {
    const load = async () => {
      try {
        const uid = await AsyncStorage.getItem('adminUid');
        setAdminId(uid || undefined);
        const c = await questionnaireCustomizationService.get();
        setCustomQuestions(c.customQuestions);
        setDisabledQuestions(c.disabledQuestions);
        setEditedQuestions(c.editedQuestions || {});
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const showBanner = (type: 'success' | 'error', msg: string) => {
    setBanner({ type, msg });
    setTimeout(() => setBanner(null), 4000);
  };

  const baseQuestions = useMemo(() => listBaseQuestions(viewGender === 'men' ? 'male' : 'female'), [viewGender]);

  const isEditingBase = !!editingBaseId;

  const resetForm = () => {
    setEditingCustomId(null); setEditingBaseId(null);
    setFormGender('both'); setFormType('mcq');
    setFormQuestionEn(''); setFormQuestionTa('');
    setFormOptions([{ en: '', ta: '' }, { en: '', ta: '' }]);
  };

  const addOption = () => setFormOptions(prev => [...prev, { en: '', ta: '' }]);
  const removeOption = (i: number) => setFormOptions(prev => prev.filter((_, idx) => idx !== i));
  const setOptionEn = (i: number, v: string) => setFormOptions(prev => prev.map((o, idx) => idx === i ? { ...o, en: v } : o));
  const setOptionTa = (i: number, v: string) => setFormOptions(prev => prev.map((o, idx) => idx === i ? { ...o, ta: v } : o));

  // ---- Translation ----
  const handleTranslateQuestion = async () => {
    if (!formQuestionEn.trim()) return showBanner('error', 'Type the English question first.');
    setTranslatingQ(true);
    const r = await translateToTamil(formQuestionEn.trim());
    setTranslatingQ(false);
    if (r.success && r.text) { setFormQuestionTa(r.text); showBanner('success', 'Translated. You can still edit the Tamil text.'); }
    else showBanner('error', r.error || 'Translation failed. Please type Tamil manually.');
  };

  const handleTranslateOptions = async () => {
    const ens = formOptions.map(o => o.en.trim());
    if (ens.every(e => !e)) return showBanner('error', 'Add English options first.');
    setTranslatingOpts(true);
    const tas = await translateListToTamil(ens);
    setTranslatingOpts(false);
    setFormOptions(prev => prev.map((o, i) => ({ ...o, ta: o.en.trim() ? (tas[i] || o.ta) : o.ta })));
    showBanner('success', 'Options translated. You can still edit them.');
  };

  // ---- Save form (add/update custom OR edit base) ----
  const handleAddOrUpdate = () => {
    if (!formQuestionEn.trim()) return showBanner('error', 'Enter the question (English).');

    let optionsEn: string[] | undefined;
    let optionsTa: string[] | undefined;
    if (formType === 'mcq') {
      const pairs = formOptions.filter(o => o.en.trim());
      if (pairs.length < 2) return showBanner('error', 'Add at least 2 options for a multiple-choice question.');
      optionsEn = pairs.map(o => capitalizeFirst(o.en));
      optionsTa = pairs.map(o => (o.ta.trim() || ''));
      // If no Tamil provided at all, leave undefined so base/english is used
      if (optionsTa.every(t => !t)) optionsTa = undefined;
    }

    const questionEn = capitalizeFirst(formQuestionEn);
    const questionTa = formQuestionTa.trim() || undefined;

    if (isEditingBase) {
      // Save an override for an existing base question
      const edit: EditedQuestion = {
        question: questionEn,
        questionTamil: questionTa,
        options: optionsEn,
        optionsTamil: optionsTa,
      };
      setEditedQuestions(prev => ({ ...prev, [editingBaseId!]: edit }));
      showBanner('success', 'Existing question edited (remember to Save Changes).');
    } else if (editingCustomId) {
      setCustomQuestions(prev => prev.map(q => q.id === editingCustomId ? {
        ...q, gender: formGender, type: formType, question: questionEn, questionTamil: questionTa, options: optionsEn, optionsTamil: optionsTa,
      } : q));
      showBanner('success', 'Question updated (remember to Save Changes).');
    } else {
      const nq: CustomQuestion = { id: genId(), gender: formGender, type: formType, question: questionEn, questionTamil: questionTa, options: optionsEn, optionsTamil: optionsTa, enabled: true };
      setCustomQuestions(prev => [...prev, nq]);
      showBanner('success', 'Question added (remember to Save Changes).');
    }
    resetForm();
  };

  const scrollToForm = () => {
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 50);
  };

  const startEditCustom = (q: CustomQuestion) => {
    resetForm();
    scrollToForm();
    setEditingCustomId(q.id);
    setFormGender(q.gender);
    setFormType(q.type);
    setFormQuestionEn(q.question);
    setFormQuestionTa(q.questionTamil || '');
    if (q.type === 'mcq') {
      const opts = (q.options || []).map((en, i) => ({ en, ta: q.optionsTamil?.[i] || '' }));
      setFormOptions(opts.length ? opts : [{ en: '', ta: '' }, { en: '', ta: '' }]);
    }
  };

  const startEditBase = (bq: ReturnType<typeof listBaseQuestions>[number]) => {
    resetForm();
    scrollToForm();
    setEditingBaseId(bq.questionId);
    const override = editedQuestions[bq.questionId];
    setFormType(bq.type as QType);
    setFormQuestionEn(override?.question || bq.question || '');
    setFormQuestionTa(override?.questionTamil || bq.questionTamil || '');
    if (bq.type === 'mcq') {
      const en = override?.options || bq.options || [];
      const ta = override?.optionsTamil || bq.optionsTamil || [];
      const opts = en.map((e, i) => ({ en: e, ta: ta[i] || '' }));
      setFormOptions(opts.length ? opts : [{ en: '', ta: '' }, { en: '', ta: '' }]);
    }
    // Scroll hint
    showBanner('success', 'Editing existing question — update fields and Add/Update, then Save Changes.');
  };

  const revertBaseEdit = (questionId: string) => {
    setEditedQuestions(prev => { const n = { ...prev }; delete n[questionId]; return n; });
    if (editingBaseId === questionId) resetForm();
    showBanner('success', 'Reverted to original (remember to Save Changes).');
  };

  const deleteCustom = (id: string) => {
    setCustomQuestions(prev => prev.filter(q => q.id !== id));
    if (editingCustomId === id) resetForm();
    showBanner('success', 'Question removed (remember to Save Changes).');
  };

  const toggleCustomEnabled = (id: string) => setCustomQuestions(prev => prev.map(q => q.id === id ? { ...q, enabled: !q.enabled } : q));
  const toggleBaseDisabled = (questionId: string) => setDisabledQuestions(prev => prev.includes(questionId) ? prev.filter(x => x !== questionId) : [...prev, questionId]);

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await questionnaireCustomizationService.save({ customQuestions, disabledQuestions, editedQuestions }, adminId);
      setQuestionnaireCustomization({ customQuestions, disabledQuestions, editedQuestions });
      showBanner('success', 'All changes saved. Users will see the updated questionnaire.');
    } catch (e) {
      console.error(e);
      showBanner('error', 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Manage Questionnaire</Text>
            <Text style={styles.subtitle}>Add, edit, translate, disable or remove questions</Text>
          </View>
          <TouchableOpacity style={[styles.saveAllBtn, saving && { opacity: 0.6 }]} onPress={handleSaveAll} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <><Ionicons name="save" size={16} color="#fff" /><Text style={styles.saveAllText}>Save Changes</Text></>}
          </TouchableOpacity>
        </View>

        {banner && (
          <View style={[styles.banner, banner.type === 'success' ? styles.bannerSuccess : styles.bannerError]}>
            <Ionicons name={banner.type === 'success' ? 'checkmark-circle' : 'alert-circle'} size={18} color={banner.type === 'success' ? COLORS.success : COLORS.error} />
            <Text style={[styles.bannerText, { color: banner.type === 'success' ? '#15803d' : '#b91c1c' }]}>{banner.msg}</Text>
          </View>
        )}

        {/* Add / Edit question */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>
            {isEditingBase ? 'Edit Existing Question' : editingCustomId ? 'Edit Question' : 'Add Question'}
          </Text>

          {!isEditingBase && (
            <>
              <Text style={styles.fieldLabel}>Who should see this?</Text>
              <View style={styles.segment}>
                {(['both', 'women', 'men'] as const).map(g => (
                  <TouchableOpacity key={g} style={[styles.segBtn, formGender === g && styles.segBtnActive]} onPress={() => setFormGender(g)}>
                    <Text style={[styles.segText, formGender === g && styles.segTextActive]}>{g === 'both' ? 'Both' : g === 'women' ? 'Female' : 'Male'}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Question Type</Text>
              <View style={styles.segment}>
                {(['mcq', 'fillup', 'textfield'] as QType[]).map(t => (
                  <TouchableOpacity key={t} style={[styles.segBtn, formType === t && styles.segBtnActive]} onPress={() => setFormType(t)}>
                    <Text style={[styles.segText, formType === t && styles.segTextActive]}>{TYPE_LABELS[t]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
          {isEditingBase && (
            <View style={styles.infoPill}><Text style={styles.infoPillText}>Type: {TYPE_LABELS[formType]}</Text></View>
          )}

          <Text style={styles.fieldLabel}>Question (English)</Text>
          <TextInput style={styles.input} placeholder="Type the question in English..." placeholderTextColor={COLORS.textMuted} value={formQuestionEn} onChangeText={setFormQuestionEn} multiline />

          <View style={styles.taHeaderRow}>
            <Text style={styles.fieldLabel}>Question (Tamil)</Text>
            <TouchableOpacity style={styles.translateBtn} onPress={handleTranslateQuestion} disabled={translatingQ}>
              {translatingQ ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="language" size={16} color={COLORS.primary} />}
              <Text style={styles.translateBtnText}>Translate</Text>
            </TouchableOpacity>
          </View>
          <TextInput style={styles.input} placeholder="தமிழில் கேள்வி (or use Translate)" placeholderTextColor={COLORS.textMuted} value={formQuestionTa} onChangeText={setFormQuestionTa} multiline />

          {formType === 'mcq' && (
            <>
              <View style={styles.taHeaderRow}>
                <Text style={styles.fieldLabel}>Options (English / Tamil)</Text>
                <TouchableOpacity style={styles.translateBtn} onPress={handleTranslateOptions} disabled={translatingOpts}>
                  {translatingOpts ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="language" size={16} color={COLORS.primary} />}
                  <Text style={styles.translateBtnText}>Translate all</Text>
                </TouchableOpacity>
              </View>
              {formOptions.map((opt, i) => (
                <View key={i} style={styles.optionBlock}>
                  <View style={styles.optionRow}>
                    <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder={`Option ${i + 1} (English)`} placeholderTextColor={COLORS.textMuted} value={opt.en} onChangeText={(v) => setOptionEn(i, v)} />
                    {formOptions.length > 2 && (
                      <TouchableOpacity onPress={() => removeOption(i)} style={styles.optRemove}><Ionicons name="close-circle" size={22} color={COLORS.error} /></TouchableOpacity>
                    )}
                  </View>
                  <TextInput style={[styles.input, { marginTop: 6 }]} placeholder={`Option ${i + 1} (Tamil)`} placeholderTextColor={COLORS.textMuted} value={opt.ta} onChangeText={(v) => setOptionTa(i, v)} />
                </View>
              ))}
              <TouchableOpacity style={styles.addOptBtn} onPress={addOption}>
                <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
                <Text style={styles.addOptText}>Add Option</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.formBtnRow}>
            {(editingCustomId || isEditingBase) && <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>}
            <TouchableOpacity style={styles.primaryBtn} onPress={handleAddOrUpdate}>
              <Ionicons name={(editingCustomId || isEditingBase) ? 'checkmark' : 'add'} size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>{isEditingBase ? 'Apply Edit' : editingCustomId ? 'Update Question' : 'Add Question'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Custom questions list */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Added Questions ({customQuestions.length})</Text>
          {customQuestions.length === 0 ? (
            <Text style={styles.muted}>No added questions yet. Use "Add Question" above.</Text>
          ) : (
            customQuestions.map(q => (
              <View key={q.id} style={styles.qRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.qText, !q.enabled && styles.qTextDisabled]}>{q.question}</Text>
                  {!!q.questionTamil && <Text style={styles.qTamil}>{q.questionTamil}</Text>}
                  <Text style={styles.qMeta}>{TYPE_LABELS[q.type]} • {q.gender === 'both' ? 'Both' : q.gender === 'women' ? 'Female' : 'Male'}{q.type === 'mcq' && q.options ? ` • ${q.options.length} options` : ''}{!q.enabled ? ' • DISABLED' : ''}</Text>
                </View>
                <View style={styles.qActions}>
                  <TouchableOpacity onPress={() => toggleCustomEnabled(q.id)}><Ionicons name={q.enabled ? 'eye' : 'eye-off'} size={20} color={q.enabled ? COLORS.success : COLORS.textMuted} /></TouchableOpacity>
                  <TouchableOpacity onPress={() => startEditCustom(q)}><Ionicons name="pencil" size={18} color={COLORS.primary} /></TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteCustom(q.id)}><Ionicons name="trash-outline" size={18} color={COLORS.error} /></TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Existing base questions */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Existing Questions</Text>
          <View style={styles.segment}>
            {(['women', 'men'] as const).map(g => (
              <TouchableOpacity key={g} style={[styles.segBtn, viewGender === g && styles.segBtnActive]} onPress={() => setViewGender(g)}>
                <Text style={[styles.segText, viewGender === g && styles.segTextActive]}>{g === 'women' ? 'Female' : 'Male'} Questionnaire</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.hintRow}>
            <Ionicons name="pencil" size={14} color={COLORS.textMuted} />
            <Text style={styles.hint}>Tap the pencil to change text/options (English & Tamil). The eye toggle hides a question from users.</Text>
          </View>
          {baseQuestions.map((q, idx) => {
            const isDisabled = disabledQuestions.includes(q.questionId);
            const override = editedQuestions[q.questionId];
            const displayEn = override?.question || q.question;
            const displayTa = override?.questionTamil || q.questionTamil;
            // Show a section header whenever the section changes
            const showSectionHeader = idx === 0 || baseQuestions[idx - 1].sectionId !== q.sectionId;
            return (
              <View key={q.questionId}>
                {showSectionHeader && (
                  <View style={styles.sectionHeader}>
                    <Ionicons name="folder-open-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.sectionHeaderText}>{q.sectionTitle}</Text>
                  </View>
                )}
                <View style={styles.qRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.qText, isDisabled && styles.qTextDisabled]}>{q.number}. {displayEn}{override ? '  (edited)' : ''}</Text>
                    {!!displayTa && <Text style={styles.qTamil}>{displayTa}</Text>}
                    <Text style={styles.qMeta}>{q.type === 'mcq' ? 'Multiple Choice' : q.type === 'fillup' ? 'Short Answer' : 'Long Answer'}{isDisabled ? ' • HIDDEN' : ''}</Text>
                  </View>
                  <View style={styles.qActions}>
                    {override && <TouchableOpacity onPress={() => revertBaseEdit(q.questionId)}><Ionicons name="refresh" size={18} color={COLORS.warning} /></TouchableOpacity>}
                    <TouchableOpacity onPress={() => startEditBase(q)}><Ionicons name="pencil" size={18} color={COLORS.primary} /></TouchableOpacity>
                    <TouchableOpacity onPress={() => toggleBaseDisabled(q.questionId)}><Ionicons name={isDisabled ? 'eye-off' : 'eye'} size={22} color={isDisabled ? COLORS.textMuted : COLORS.success} /></TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
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
  saveAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  saveAllText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, marginBottom: 12, borderWidth: 1 },
  bannerSuccess: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  bannerError: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  bannerText: { flex: 1, fontSize: 13, fontWeight: '500' },
  card: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  cardLabel: { fontSize: 15, fontWeight: '700', color: COLORS.primary, marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8, marginTop: 8 },
  hint: { fontSize: 12, color: COLORS.textMuted, flex: 1 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, marginBottom: 14 },
  infoPill: { alignSelf: 'flex-start', backgroundColor: COLORS.borderLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginTop: 4 },
  infoPillText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  segment: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  segBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  segText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  segTextActive: { color: '#fff' },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.textPrimary, backgroundColor: COLORS.background, marginBottom: 10, ...(isWeb ? { outlineStyle: 'none' } as any : {}) },
  taHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 4 },
  translateBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.primary + '12' },
  translateBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  optionBlock: { marginBottom: 12, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optRemove: { padding: 2 },
  addOptBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  addOptText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  formBtnRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  primaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelBtn: { paddingHorizontal: 18, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center' },
  cancelBtnText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  muted: { color: COLORS.textMuted, fontSize: 13, paddingVertical: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary + '10', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginTop: 16, marginBottom: 4 },
  sectionHeaderText: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  qRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, gap: 12 },
  qText: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  qTamil: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  qTextDisabled: { color: COLORS.textMuted, textDecorationLine: 'line-through' },
  qMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  qActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
});
