import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Animated,
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
  colors: [string, string];
  caloriesPerMinute: number;
  isCouple?: boolean;
  weeklyTarget?: { minutes: number; days: number };
}

const exerciseTypes: ExerciseType[] = [
  {
    id: 'couple-walking',
    name: 'Couple Walking',
    nameTamil: 'தம்பதிகள் நடைப்பயிற்சி',
    icon: 'walk',
    colors: ['#22c55e', '#16a34a'],
    caloriesPerMinute: 4,
    isCouple: true,
    weeklyTarget: { minutes: 180, days: 3 },
  },
  {
    id: 'high-knees',
    name: 'High Knees',
    nameTamil: 'ஹை நீஸ்',
    icon: 'run-fast',
    colors: ['#f59e0b', '#d97706'],
    caloriesPerMinute: 8,
    weeklyTarget: { minutes: 90, days: 3 },
  },
  {
    id: 'yoga',
    name: 'Yoga/Pranayama',
    nameTamil: 'யோகா/பிராணாயாமா',
    icon: 'meditation',
    colors: ['#8b5cf6', '#7c3aed'],
    caloriesPerMinute: 3,
  },
  {
    id: 'strength',
    name: 'Strength Training',
    nameTamil: 'பலப்பயிற்சி',
    icon: 'dumbbell',
    colors: ['#ef4444', '#dc2626'],
    caloriesPerMinute: 5,
  },
  {
    id: 'swimming',
    name: 'Swimming',
    nameTamil: 'நீச்சல்',
    icon: 'swim',
    colors: ['#06b6d4', '#0891b2'],
    caloriesPerMinute: 7,
  },
  {
    id: 'cycling',
    name: 'Cycling',
    nameTamil: 'சைக்கிள் ஓட்டுதல்',
    icon: 'bike',
    colors: ['#3b82f6', '#2563eb'],
    caloriesPerMinute: 6,
  },
  {
    id: 'other',
    name: 'Other Exercise',
    nameTamil: 'பிற உடற்பயிற்சி',
    icon: 'run',
    colors: ['#64748b', '#475569'],
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

  const [step, setStep] = useState<'type' | 'details' | 'summary'>('type');
  const [selectedExercise, setSelectedExercise] = useState<ExerciseType | null>(null);
  const [duration, setDuration] = useState('30');
  const [intensity, setIntensity] = useState('moderate');
  const [steps, setSteps] = useState('');
  const [partnerParticipated, setPartnerParticipated] = useState(false);
  const [perceivedExertion, setPerceivedExertion] = useState(5);
  const [notes, setNotes] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const toastAnim = useRef(new Animated.Value(-100)).current;

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
      showToast('Please enter a valid duration', 'error');
      return;
    }
    setStep('summary');
  };

  const handleSave = () => {
    // Save to backend/storage
    showToast('Exercise logged successfully!', 'success');
    setTimeout(() => {
      router.back();
    }, 1500);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={handleBack} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#0f172a" />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>Log Exercise</Text>
        {selectedExercise && (
          <Text style={styles.headerSubtitle}>{selectedExercise.name}</Text>
        )}
      </View>
    </View>
  );

  const renderExerciseSelection = () => (
    <View style={styles.content}>
      <Text style={styles.stepTitle}>Choose Exercise Type</Text>
      <Text style={styles.stepDescription}>
        What activity did you do today?
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
              <MaterialCommunityIcons name={exercise.icon as any} size={32} color="#fff" />
            </LinearGradient>
            <Text style={styles.exerciseLabel}>{exercise.name}</Text>
            <Text style={styles.exerciseLabelTamil}>{exercise.nameTamil}</Text>
            {exercise.weeklyTarget && (
              <View style={styles.targetBadge}>
                <Text style={styles.targetBadgeText}>
                  {exercise.weeklyTarget.minutes} min/{exercise.weeklyTarget.days}x week
                </Text>
              </View>
            )}
            {exercise.isCouple && (
              <View style={[styles.targetBadge, { backgroundColor: '#fef3c7' }]}>
                <Text style={[styles.targetBadgeText, { color: '#d97706' }]}>
                  👫 With Partner
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
            <MaterialCommunityIcons name={selectedExercise.icon as any} size={32} color="#fff" />
          </LinearGradient>
          <View>
            <Text style={styles.selectedName}>{selectedExercise.name}</Text>
            <Text style={styles.selectedNameTamil}>{selectedExercise.nameTamil}</Text>
          </View>
        </View>

        {/* Duration */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Duration (minutes)</Text>
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
            {[15, 30, 45, 60].map((mins) => (
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
                  {mins} min
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Intensity */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Intensity Level</Text>
          <View style={styles.intensityOptions}>
            {intensityLevels.map((level) => (
              <TouchableOpacity
                key={level.id}
                style={[
                  styles.intensityOption,
                  intensity === level.id && { 
                    backgroundColor: level.color + '20', 
                    borderColor: level.color 
                  },
                ]}
                onPress={() => setIntensity(level.id)}
              >
                <View style={[styles.intensityDot, { backgroundColor: level.color }]} />
                <Text
                  style={[
                    styles.intensityText,
                    intensity === level.id && { color: level.color, fontWeight: '700' },
                  ]}
                >
                  {level.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Steps (optional) */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Steps (optional)</Text>
          <View style={styles.stepsInputContainer}>
            <MaterialCommunityIcons name="shoe-print" size={20} color="#64748b" />
            <TextInput
              style={styles.stepsInput}
              value={steps}
              onChangeText={setSteps}
              placeholder="Enter step count"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Partner Participation (for couple exercises) */}
        {selectedExercise.isCouple && (
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Partner Participated?</Text>
            <View style={styles.partnerOptions}>
              <TouchableOpacity
                style={[
                  styles.partnerOption,
                  partnerParticipated && styles.partnerOptionActive,
                ]}
                onPress={() => setPartnerParticipated(true)}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={partnerParticipated ? '#22c55e' : '#94a3b8'}
                />
                <Text
                  style={[
                    styles.partnerOptionText,
                    partnerParticipated && styles.partnerOptionTextActive,
                  ]}
                >
                  Yes, together!
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
                  name="close-circle"
                  size={24}
                  color={!partnerParticipated ? '#ef4444' : '#94a3b8'}
                />
                <Text
                  style={[
                    styles.partnerOptionText,
                    !partnerParticipated && styles.partnerOptionTextActive,
                  ]}
                >
                  Solo
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Perceived Exertion */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>How hard did you work? (1-10)</Text>
          <View style={styles.exertionContainer}>
            <View style={styles.exertionLabels}>
              <Text style={styles.exertionLabelText}>Easy</Text>
              <Text style={styles.exertionLabelText}>Hard</Text>
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
          <Text style={styles.inputLabel}>Notes (optional)</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Weather, location, how you felt..."
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
            <Text style={styles.continueButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSummary = () => {
    if (!selectedExercise) return null;

    const calories = calculateCalories();
    const intensityLabel = intensityLevels.find(i => i.id === intensity)?.label || '';

    return (
      <View style={styles.content}>
        <Text style={styles.stepTitle}>Exercise Summary</Text>
        <Text style={styles.stepDescription}>
          {new Date().toLocaleDateString('en-US', { 
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
            <MaterialCommunityIcons name={selectedExercise.icon as any} size={40} color="#fff" />
            <View style={styles.summaryHeaderText}>
              <Text style={styles.summaryExerciseName}>{selectedExercise.name}</Text>
              <Text style={styles.summaryDuration}>{duration} minutes • {intensityLabel}</Text>
            </View>
          </LinearGradient>

          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <MaterialCommunityIcons name="fire" size={24} color="#ef4444" />
              <Text style={styles.summaryStatValue}>{calories}</Text>
              <Text style={styles.summaryStatLabel}>Calories</Text>
            </View>
            {steps && (
              <View style={styles.summaryStat}>
                <MaterialCommunityIcons name="shoe-print" size={24} color="#22c55e" />
                <Text style={styles.summaryStatValue}>{steps}</Text>
                <Text style={styles.summaryStatLabel}>Steps</Text>
              </View>
            )}
            <View style={styles.summaryStat}>
              <MaterialCommunityIcons name="speedometer" size={24} color="#f59e0b" />
              <Text style={styles.summaryStatValue}>{perceivedExertion}/10</Text>
              <Text style={styles.summaryStatLabel}>Effort</Text>
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
                {partnerParticipated ? 'Exercised with partner' : 'Exercised solo'}
              </Text>
            </View>
          )}

          {notes && (
            <View style={styles.notesPreview}>
              <Text style={styles.notesPreviewLabel}>Notes:</Text>
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
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#22c55e', '#16a34a']}
              style={styles.saveButtonGradient}
            >
              <Text style={styles.saveButtonText}>Save Exercise</Text>
              <Ionicons name="checkmark" size={20} color="#fff" />
            </LinearGradient>
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
  },
  selectedName: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  selectedNameTamil: { fontSize: 14, color: '#64748b', marginTop: 2 },
  inputSection: { marginBottom: 24 },
  inputLabel: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
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
  intensityDot: { width: 10, height: 10, borderRadius: 5 },
  intensityText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
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
  partnerOptionActive: { backgroundColor: '#f0fdf4', borderColor: '#22c55e' },
  partnerOptionText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  partnerOptionTextActive: { color: '#22c55e' },
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
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
});
