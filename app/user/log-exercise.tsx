import { useLanguage } from '@/context/LanguageContext';
import { useUserData } from '@/context/UserDataContext';
import { coupleExerciseService, coupleService, globalSettingsService } from '@/services/firestore.service';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';
const isWeb = Platform.OS === 'web';

interface ExerciseType {
  id: string;
  name: string;
  nameTamil: string;
  icon: string;
  image: any;
  colors: [string, string];
  iconColor: string;
  caloriesPerMinute: number;
  isCouple?: boolean;
  requiresSteps?: boolean;
  weeklyTarget?: { minutes: number; days: number };
}

const exerciseTypes: ExerciseType[] = [
  {
    id: 'couple-walking',
    name: 'Couple Walking',
    nameTamil: 'தம்பதிகள் நடைப்பயிற்சி',
    icon: 'walk',
    image: require('../../assets/images/couple_walk.png'),
    colors: ['#dcfce7', '#bbf7d0'],
    iconColor: '#22c55e',
    caloriesPerMinute: 4,
    isCouple: true,
    requiresSteps: true,
  },
  {
    id: 'high-knees',
    name: 'High Knees',
    nameTamil: 'ஹை நீஸ்',
    icon: 'run-fast',
    image: require('../../assets/images/highknees.png'),
    colors: ['#fef3c7', '#fde68a'],
    iconColor: '#f59e0b',
    caloriesPerMinute: 8,
  },
  {
    id: 'yoga',
    name: 'Yoga/Pranayama',
    nameTamil: 'யோகா/பிராணாயாமா',
    icon: 'meditation',
    image: require('../../assets/images/yoga.png'),
    colors: ['#ede9fe', '#ddd6fe'],
    iconColor: '#8b5cf6',
    caloriesPerMinute: 3,
  },
  {
    id: 'strength',
    name: 'Strength Training',
    nameTamil: 'பலப்பயிற்சி',
    icon: 'dumbbell',
    image: require('../../assets/images/strength_training.png'),
    colors: ['#fee2e2', '#fecaca'],
    iconColor: '#ef4444',
    caloriesPerMinute: 5,
  },
  {
    id: 'swimming',
    name: 'Swimming',
    nameTamil: 'நீச்சல்',
    icon: 'swim',
    image: require('../../assets/images/swim.png'),
    colors: ['#cffafe', '#a5f3fc'],
    iconColor: '#06b6d4',
    caloriesPerMinute: 7,
  },
  {
    id: 'cycling',
    name: 'Cycling',
    nameTamil: 'சைக்கிள் ஓட்டுதல்',
    icon: 'bike',
    image: require('../../assets/images/cycle.png'),
    colors: ['#dbeafe', '#bfdbfe'],
    iconColor: '#3b82f6',
    caloriesPerMinute: 6,
  },
  {
    id: 'other',
    name: 'Other Exercise',
    nameTamil: 'பிற உடற்பயிற்சி',
    icon: 'run',
    image: require('../../assets/images/run_male.jpg'),
    colors: ['#f1f5f9', '#e2e8f0'],
    iconColor: '#64748b',
    caloriesPerMinute: 5,
  },
];

const intensityLevels = [
  { id: 'light', label: 'Light', multiplier: 0.8, color: '#22c55e' },
  { id: 'moderate', label: 'Moderate', multiplier: 1, color: '#f59e0b' },
  { id: 'vigorous', label: 'Vigorous', multiplier: 1.3, color: '#ef4444' },
];

export default function LogExerciseScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const { refreshDailyData } = useUserData();
  const { language, t } = useLanguage();

  const [step, setStep] = useState<'type' | 'details' | 'summary'>('type');
  const [selectedExercise, setSelectedExercise] = useState<ExerciseType | null>(null);
  const [duration, setDuration] = useState('30');
  const [intensity, setIntensity] = useState<'light' | 'moderate' | 'vigorous'>('moderate');
  const [steps, setSteps] = useState('');
  const [partnerParticipated, setPartnerParticipated] = useState(false);
  const [perceivedExertion, setPerceivedExertion] = useState(5);
  const [notes, setNotes] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [userGender, setUserGender] = useState<'male' | 'female'>('male');
  const [dailyExerciseGoal, setDailyExerciseGoal] = useState(60);
  const [todayExercises, setTodayExercises] = useState<any[]>([]);
  const [goalSettings, setGoalSettings] = useState<{ coupleWalkingMinutes: number; highKneesMinutes: number } | null>(null);
  const toastAnim = useRef(new Animated.Value(-100)).current;

  // Load user data and goal settings on focus
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        setIsLoading(true);
        try {
          const [storedCoupleId, storedGender, settings] = await Promise.all([
            AsyncStorage.getItem('coupleId'),
            AsyncStorage.getItem('userGender'),
            globalSettingsService.get(),
          ]);
          
          if (storedCoupleId) setCoupleId(storedCoupleId);
          if (storedGender) setUserGender(storedGender as 'male' | 'female');
          if (settings) {
            setGoalSettings({
              coupleWalkingMinutes: settings.coupleWalkingMinutes || 60,
              highKneesMinutes: settings.highKneesMinutes || 30,
            });
            // Use coupleWalkingMinutes as the daily exercise goal
            setDailyExerciseGoal(settings.coupleWalkingMinutes || 60);
          }

          // Load today's exercises
          if (storedCoupleId && storedGender) {
            const today = new Date().toISOString().split('T')[0];
            const exercises = await coupleExerciseService.getByDate(storedCoupleId, storedGender as 'male' | 'female', today);
            setTodayExercises(exercises);
          }
        } catch (error) {
          console.error('Error loading data:', error);
        } finally {
          setIsLoading(false);
        }
      };
      loadData();
    }, [])
  );

  const showToast = (message: string, type: 'error' | 'success') => {
    setToast({ visible: true, message, type });
    Animated.spring(toastAnim, {
      toValue: 20,
      useNativeDriver: true,
    }).start();
    setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setToast({ visible: false, message: '', type: '' }));
    }, 3000);
  };

  const calculateCalories = () => {
    if (!selectedExercise) return 0;
    const durationNum = parseInt(duration) || 0;
    const intensityMultiplier = intensityLevels.find(i => i.id === intensity)?.multiplier || 1;
    return Math.round(selectedExercise.caloriesPerMinute * durationNum * intensityMultiplier);
  };

  const handleSelectExercise = (exercise: ExerciseType) => {
    setSelectedExercise(exercise);
    setStep('details');
  };

  const handleBack = () => {
    if (step === 'summary') {
      setStep('details');
    } else if (step === 'details') {
      setSelectedExercise(null);
      setStep('type');
    } else {
      router.back();
    }
  };

  const handleContinue = () => {
    if (!duration || parseInt(duration) <= 0) {
      showToast(t('log.exercise.enterValidDuration'), 'error');
      return;
    }
    if (selectedExercise?.requiresSteps && (!steps || parseInt(steps) <= 0)) {
      showToast(t('log.exercise.enterValidSteps'), 'error');
      return;
    }
    setStep('summary');
  };

  const handleSave = async () => {
    if (!selectedExercise || !coupleId) {
      showToast(t('error.sessionError') || 'Session error. Please try again.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const caloriesBurned = calculateCalories();
      
      await coupleExerciseService.add(coupleId, userGender, {
        exerciseType: selectedExercise.id,
        exerciseName: selectedExercise.name,
        nameTamil: selectedExercise.nameTamil,
        duration: parseInt(duration),
        intensity: intensity,
        caloriesPerMinute: selectedExercise.caloriesPerMinute,
        caloriesBurned: caloriesBurned,
        perceivedExertion: perceivedExertion,
        steps: selectedExercise.requiresSteps ? parseInt(steps) : undefined,
        partnerParticipated: partnerParticipated,
        notes: notes || undefined,
      });
      
      // Update streak for logging activity
      await coupleService.updateStreak(coupleId, userGender);

      // Check if goal achieved
      let goalMessage = '';
      if (goalSettings) {
        if (selectedExercise.id === 'couple-walking' && parseInt(duration) >= goalSettings.coupleWalkingMinutes) {
          goalMessage = language === 'ta' ? ' 🎉 தினசரி நடைப்பயிற்சி இலக்கு அடைந்தது!' : ' 🎉 Daily walking goal achieved!';
        } else if (selectedExercise.id === 'high-knees' && parseInt(duration) >= goalSettings.highKneesMinutes) {
          goalMessage = language === 'ta' ? ' 🎉 ஹை நீஸ் இலக்கு அடைந்தது!' : ' 🎉 High knees goal achieved!';
        }
      }

      const successMsg = language === 'ta' 
        ? `உடற்பயிற்சி பதிவானது! ${caloriesBurned} கலோரி எரிந்தது.${goalMessage}`
        : `Exercise logged! ${caloriesBurned} cal burned.${goalMessage}`;
      showToast(successMsg, 'success');
      
      // Refresh context data so home page shows updated values
      refreshDailyData();
      
      setTimeout(() => {
        router.back();
      }, 2000);
    } catch (error) {
      console.error('Error saving exercise:', error);
      showToast(t('log.exercise.saveFailed'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={handleBack} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#0f172a" />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>{t('log.exercise.title')}</Text>
        {selectedExercise && (
          <Text style={styles.headerSubtitle}>{language === 'ta' ? selectedExercise.nameTamil : selectedExercise.name}</Text>
        )}
      </View>
    </View>
  );

  const renderExerciseSelection = () => (
    <View style={styles.content}>
      <Text style={styles.stepTitle}>{t('log.exercise.chooseType')}</Text>
      <Text style={styles.stepDescription}>
        {t('log.exercise.whatActivity')}
      </Text>
      <View style={styles.exerciseGrid}>
        {exerciseTypes.map((exercise) => (
          <TouchableOpacity
            key={exercise.id}
            style={styles.exerciseCard}
            onPress={() => handleSelectExercise(exercise)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={exercise.colors}
              style={styles.exerciseIconContainer}
            >
              <Image source={exercise.image} style={styles.exerciseImage} resizeMode="cover" />
            </LinearGradient>
            <Text style={styles.exerciseLabel}>{language === 'ta' ? exercise.nameTamil : exercise.name}</Text>
            {language !== 'ta' && (
              <Text style={styles.exerciseLabelTamil}>{exercise.nameTamil}</Text>
            )}
            {exercise.isCouple && (
              <View style={[styles.targetBadge, { backgroundColor: '#fef3c7' }]}>
                <Text style={[styles.targetBadgeText, { color: '#d97706' }]}>
                  👫 {t('log.exercise.withPartner')}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderDetails = () => {
    if (!selectedExercise) return null;

    return (
      <View style={styles.content}>
        <View style={styles.selectedHeader}>
          <LinearGradient
            colors={selectedExercise.colors}
            style={styles.selectedIcon}
          >
            <Image source={selectedExercise.image} style={styles.selectedExerciseImage} resizeMode="cover" />
          </LinearGradient>
          <View>
            <Text style={styles.selectedName}>{language === 'ta' ? selectedExercise.nameTamil : selectedExercise.name}</Text>
            {language !== 'ta' && (
              <Text style={styles.selectedNameTamil}>{selectedExercise.nameTamil}</Text>
            )}
          </View>
        </View>

        {/* Duration */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>{t('log.exercise.duration')}</Text>
          <View style={styles.durationContainer}>
            <TouchableOpacity
              style={styles.durationButton}
              onPress={() => setDuration(Math.max(5, parseInt(duration) - 5).toString())}
            >
              <Ionicons name="remove" size={24} color="#006dab" />
            </TouchableOpacity>
            <TextInput
              style={styles.durationInput}
              value={duration}
              onChangeText={setDuration}
              keyboardType="numeric"
              selectTextOnFocus
            />
            <TouchableOpacity
              style={styles.durationButton}
              onPress={() => setDuration((parseInt(duration) + 5).toString())}
            >
              <Ionicons name="add" size={24} color="#006dab" />
            </TouchableOpacity>
          </View>
          <View style={styles.quickDurations}>
            {[10, 15, 30, 45, 60].map((mins) => (
              <TouchableOpacity
                key={mins}
                style={[
                  styles.quickDurationButton,
                  duration === mins.toString() && styles.quickDurationButtonActive,
                ]}
                onPress={() => setDuration(mins.toString())}
              >
                <Text
                  style={[
                    styles.quickDurationText,
                    duration === mins.toString() && styles.quickDurationTextActive,
                  ]}
                >
                  {mins} {t('log.exercise.min')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Intensity */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>{t('log.exercise.intensityLevel')}</Text>
          <View style={styles.intensityOptions}>
            {intensityLevels.map((level) => (
              <TouchableOpacity
                key={level.id}
                style={[
                  styles.intensityOption,
                  intensity === level.id && styles.intensityOptionActive,
                ]}
                onPress={() => setIntensity(level.id as 'light' | 'moderate' | 'vigorous')}
              >
                <Text
                  style={[
                    styles.intensityText,
                    intensity === level.id && styles.intensityTextActive,
                  ]}
                >
                  {t(`log.exercise.${level.id}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Steps - Mandatory for Couple Walking only */}
        {selectedExercise.requiresSteps && (
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>{t('log.exercise.stepCount')} <Text style={styles.requiredStar}>*</Text></Text>
            <View style={styles.stepsInputContainer}>
              <MaterialCommunityIcons name="shoe-print" size={20} color="#64748b" />
              <TextInput
                style={styles.stepsInput}
                value={steps}
                onChangeText={setSteps}
                placeholder={t('log.exercise.enterStepCount')}
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
              />
            </View>
            <Text style={styles.inputHint}>{t('log.exercise.requiredForCoupleWalking')}</Text>
          </View>
        )}

        {/* Partner Participation (for couple exercises) */}
        {selectedExercise.isCouple && (
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>{t('log.exercise.partnerParticipated')}</Text>
            <View style={styles.partnerOptions}>
              <TouchableOpacity
                style={[
                  styles.partnerOption,
                  partnerParticipated && styles.partnerOptionActive,
                ]}
                onPress={() => setPartnerParticipated(true)}
              >
                <Ionicons
                  name="people"
                  size={24}
                  color={partnerParticipated ? '#0f172a' : '#94a3b8'}
                />
                <Text
                  style={[
                    styles.partnerOptionText,
                    partnerParticipated && styles.partnerOptionTextActive,
                  ]}
                >
                  {t('log.exercise.yesTogether')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.partnerOption,
                  !partnerParticipated && styles.partnerOptionActive,
                ]}
                onPress={() => setPartnerParticipated(false)}
              >
                <Ionicons
                  name="person"
                  size={24}
                  color={!partnerParticipated ? '#0f172a' : '#94a3b8'}
                />
                <Text
                  style={[
                    styles.partnerOptionText,
                    !partnerParticipated && styles.partnerOptionTextActive,
                  ]}
                >
                  {t('log.exercise.solo')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Perceived Exertion */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>{t('log.exercise.howHardWork')}</Text>
          <View style={styles.exertionContainer}>
            <View style={styles.exertionLabels}>
              <Text style={styles.exertionLabelText}>{t('log.exercise.easy')}</Text>
              <Text style={styles.exertionLabelText}>{t('log.exercise.hard')}</Text>
            </View>
            <View style={styles.exertionButtons}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.exertionButton,
                    perceivedExertion === num && styles.exertionButtonActive,
                  ]}
                  onPress={() => setPerceivedExertion(num)}
                >
                  <Text
                    style={[
                      styles.exertionButtonText,
                      perceivedExertion === num && styles.exertionButtonTextActive,
                    ]}
                  >
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>{t('log.exercise.notesOptional')}</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('log.exercise.notesPlaceholder')}
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#006dab', '#005a8f']}
            style={styles.continueButtonGradient}
          >
            <Text style={styles.continueButtonText}>{t('log.exercise.continue')}</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSummary = () => {
    if (!selectedExercise) return null;

    const calories = calculateCalories();

    return (
      <View style={styles.content}>
        <Text style={styles.stepTitle}>{t('log.exercise.summary')}</Text>
        <Text style={styles.stepDescription}>
          {new Date().toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          })}
        </Text>

        <View style={styles.summaryCard}>
          <LinearGradient
            colors={selectedExercise.colors}
            style={styles.summaryHeader}
          >
            <Image source={selectedExercise.image} style={styles.summaryExerciseImage} resizeMode="cover" />
            <View style={styles.summaryHeaderText}>
              <Text style={[styles.summaryExerciseName, { color: selectedExercise.iconColor }]}>{language === 'ta' ? selectedExercise.nameTamil : selectedExercise.name}</Text>
              <Text style={[styles.summaryDuration, { color: selectedExercise.iconColor, opacity: 0.8 }]}>{duration} {t('log.exercise.minutes')} • {t(`log.exercise.${intensity}`)}</Text>
            </View>
          </LinearGradient>

          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <MaterialCommunityIcons name="fire" size={24} color="#ef4444" />
              <Text style={styles.summaryStatValue}>{calories}</Text>
              <Text style={styles.summaryStatLabel}>{t('log.exercise.calories')}</Text>
            </View>
            {steps && (
              <View style={styles.summaryStat}>
                <MaterialCommunityIcons name="shoe-print" size={24} color="#22c55e" />
                <Text style={styles.summaryStatValue}>{steps}</Text>
                <Text style={styles.summaryStatLabel}>{t('log.exercise.steps')}</Text>
              </View>
            )}
            <View style={styles.summaryStat}>
              <MaterialCommunityIcons name="speedometer" size={24} color="#f59e0b" />
              <Text style={styles.summaryStatValue}>{perceivedExertion}/10</Text>
              <Text style={styles.summaryStatLabel}>{t('log.exercise.effort')}</Text>
            </View>
          </View>

          {selectedExercise.isCouple && (
            <View style={styles.partnerStatus}>
              <Ionicons
                name={partnerParticipated ? 'people' : 'person'}
                size={20}
                color={partnerParticipated ? '#22c55e' : '#64748b'}
              />
              <Text style={styles.partnerStatusText}>
                {partnerParticipated ? t('log.exercise.exercisedWithPartner') : t('log.exercise.exercisedSolo')}
              </Text>
            </View>
          )}

          {notes && (
            <View style={styles.notesPreview}>
              <Text style={styles.notesPreviewLabel}>{t('log.exercise.notes')}</Text>
              <Text style={styles.notesPreviewText}>{notes}</Text>
            </View>
          )}
        </View>

        <View style={styles.summaryActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setStep('details')}
          >
            <Ionicons name="pencil" size={20} color="#006dab" />
            <Text style={styles.editButtonText}>{t('log.exercise.edit')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={isSaving}
          >
            <View style={styles.saveButtonSolid}>
              {isSaving ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.saveButtonText}>{t('log.exercise.saving')}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.saveButtonText}>{t('log.exercise.save')}</Text>
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                </>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {toast.visible && (
        <Animated.View
          style={[
            styles.toast,
            toast.type === 'error' ? styles.toastError : styles.toastSuccess,
            { transform: [{ translateY: toastAnim }] },
          ]}
        >
          <View style={styles.toastContent}>
            <Text style={styles.toastIcon}>{toast.type === 'error' ? '✗' : '✓'}</Text>
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}

      {renderHeader()}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {step === 'type' && renderExerciseSelection()}
        {step === 'details' && renderDetails()}
        {step === 'summary' && renderSummary()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  toast: {
    position: 'absolute',
    top: 0,
    left: isWeb ? undefined : 16,
    right: isWeb ? 20 : 16,
    zIndex: 1000,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxWidth: isWeb ? 320 : undefined,
    borderLeftWidth: 4,
  },
  toastError: { borderLeftColor: '#ef4444' },
  toastSuccess: { borderLeftColor: '#98be4e' },
  toastContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toastIcon: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  toastText: { color: '#1e293b', fontSize: 14, fontWeight: '600', flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingTop: isWeb ? 20 : 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, marginLeft: 16 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  headerSubtitle: { fontSize: 14, color: '#64748b', marginTop: 2 },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  content: {
    padding: isWeb ? 40 : 20,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  stepTitle: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  stepDescription: { fontSize: 16, color: '#64748b', marginBottom: 24 },
  exerciseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  exerciseCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  exerciseIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  exerciseImage: {
    width: 60,
    height: 60,
    borderRadius: 16,
  },
  exerciseLabel: { fontSize: 14, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
  exerciseLabelTamil: { fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 2 },
  targetBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#dcfce7',
    borderRadius: 6,
  },
  targetBadgeText: { fontSize: 10, fontWeight: '600', color: '#16a34a' },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 32,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
  },
  selectedIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  selectedExerciseImage: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  selectedName: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  selectedNameTamil: { fontSize: 14, color: '#64748b', marginTop: 2 },
  inputSection: { marginBottom: 24 },
  inputLabel: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  requiredStar: { color: '#ef4444', fontWeight: '700' },
  inputHint: { fontSize: 12, color: '#64748b', marginTop: 8 },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 16,
  },
  durationButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#006dab',
  },
  durationInput: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    minWidth: 80,
  },
  quickDurations: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  quickDurationButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  quickDurationButtonActive: { backgroundColor: '#006dab' },
  quickDurationText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  quickDurationTextActive: { color: '#ffffff' },
  intensityOptions: { flexDirection: 'row', gap: 10 },
  intensityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 8,
  },
  intensityOptionActive: {
    backgroundColor: '#e2e8f0',
    borderColor: '#64748b',
  },
  intensityText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  intensityTextActive: { color: '#0f172a', fontWeight: '700' },
  stepsInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  stepsInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0f172a',
  },
  partnerOptions: { flexDirection: 'row', gap: 12 },
  partnerOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 8,
  },
  partnerOptionActive: { backgroundColor: '#e2e8f0', borderColor: '#64748b' },
  partnerOptionText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  partnerOptionTextActive: { color: '#0f172a' },
  exertionContainer: {},
  exertionLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  exertionLabelText: { fontSize: 12, color: '#64748b' },
  exertionButtons: { flexDirection: 'row', gap: 6 },
  exertionButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exertionButtonActive: { backgroundColor: '#006dab' },
  exertionButtonText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  exertionButtonTextActive: { color: '#ffffff' },
  notesInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    fontSize: 16,
    color: '#0f172a',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  continueButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#006dab',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 16,
  },
  continueButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  continueButtonText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  summaryExerciseImage: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  summaryHeaderText: { flex: 1 },
  summaryExerciseName: { fontSize: 20, fontWeight: '800', color: '#ffffff' },
  summaryDuration: { fontSize: 14, color: 'rgba(255, 255, 255, 0.9)', marginTop: 4 },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  summaryStat: { alignItems: 'center' },
  summaryStatValue: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginTop: 8 },
  summaryStatLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },
  partnerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  partnerStatusText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  notesPreview: { padding: 16 },
  notesPreviewLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 4 },
  notesPreviewText: { fontSize: 14, color: '#0f172a', lineHeight: 20 },
  summaryActions: { flexDirection: 'row', gap: 12 },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#006dab',
    gap: 8,
  },
  editButtonText: { fontSize: 16, fontWeight: '700', color: '#006dab' },
  saveButton: {
    flex: 2,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#98be4e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonSolid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#98be4e',
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
});
