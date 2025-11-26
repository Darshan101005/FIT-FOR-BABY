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

interface Goal {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  type: 'daily' | 'weekly';
  defaultValue: number;
  unit: string;
  min: number;
  max: number;
}

const defaultGoals: Goal[] = [
  {
    id: 'daily-steps',
    title: 'Daily Steps',
    description: 'Target number of steps to walk each day',
    icon: 'walk',
    color: '#22c55e',
    type: 'daily',
    defaultValue: 10000,
    unit: 'steps',
    min: 5000,
    max: 20000,
  },
  {
    id: 'couple-walking',
    title: 'Couple Walking',
    description: 'Minutes of walking together with partner per week',
    icon: 'account-group',
    color: '#8b5cf6',
    type: 'weekly',
    defaultValue: 180,
    unit: 'minutes',
    min: 60,
    max: 420,
  },
  {
    id: 'high-knees',
    title: 'High Knees Exercise',
    description: 'Minutes of high knees exercise per week',
    icon: 'run-fast',
    color: '#f59e0b',
    type: 'weekly',
    defaultValue: 90,
    unit: 'minutes',
    min: 30,
    max: 180,
  },
  {
    id: 'weight-loss-weekly',
    title: 'Weekly Weight Goal',
    description: 'Target weight loss per week (recommended 0.5-1 kg)',
    icon: 'scale-bathroom',
    color: '#006dab',
    type: 'weekly',
    defaultValue: 0.5,
    unit: 'kg',
    min: 0.25,
    max: 1.5,
  },
  {
    id: 'daily-calories',
    title: 'Daily Calorie Burn',
    description: 'Target calories to burn through exercise',
    icon: 'fire',
    color: '#ef4444',
    type: 'daily',
    defaultValue: 300,
    unit: 'kcal',
    min: 100,
    max: 800,
  },
  {
    id: 'water-intake',
    title: 'Water Intake',
    description: 'Daily water consumption target',
    icon: 'cup-water',
    color: '#06b6d4',
    type: 'daily',
    defaultValue: 8,
    unit: 'glasses',
    min: 4,
    max: 15,
  },
];

const userPresets = [
  {
    id: 'beginner',
    name: 'Beginner',
    description: 'For users just starting their fitness journey',
    color: '#22c55e',
    goals: { 'daily-steps': 6000, 'couple-walking': 90, 'high-knees': 45, 'weight-loss-weekly': 0.25, 'daily-calories': 150 },
  },
  {
    id: 'intermediate',
    name: 'Intermediate',
    description: 'For users with moderate fitness level',
    color: '#f59e0b',
    goals: { 'daily-steps': 8000, 'couple-walking': 150, 'high-knees': 75, 'weight-loss-weekly': 0.5, 'daily-calories': 250 },
  },
  {
    id: 'advanced',
    name: 'Advanced',
    description: 'For highly motivated users',
    color: '#ef4444',
    goals: { 'daily-steps': 12000, 'couple-walking': 210, 'high-knees': 120, 'weight-loss-weekly': 0.75, 'daily-calories': 400 },
  },
];

export default function AdminGoalsScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const toastAnim = useRef(new Animated.Value(-100)).current;

  const [goals, setGoals] = useState<{ [key: string]: number }>(
    Object.fromEntries(defaultGoals.map(g => [g.id, g.defaultValue]))
  );
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const [applyTo, setApplyTo] = useState<'all' | 'new' | 'selected'>('all');

  const showToast = (message: string, type: 'error' | 'success') => {
    setToast({ visible: true, message, type });
    Animated.spring(toastAnim, { toValue: 20, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(toastAnim, { toValue: -100, duration: 300, useNativeDriver: true })
        .start(() => setToast({ visible: false, message: '', type: '' }));
    }, 2500);
  };

  const handlePresetSelect = (preset: typeof userPresets[0]) => {
    setGoals({ ...goals, ...preset.goals });
    setActivePreset(preset.id);
    showToast(`${preset.name} preset applied`, 'success');
  };

  const handleGoalChange = (goalId: string, value: number) => {
    setGoals({ ...goals, [goalId]: value });
    setActivePreset(null);
  };

  const handleSaveGoals = () => {
    showToast('Goals saved successfully!', 'success');
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#0f172a" />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>Goal Settings</Text>
        <Text style={styles.headerSubtitle}>Configure default user goals</Text>
      </View>
      <TouchableOpacity style={styles.saveButton} onPress={handleSaveGoals}>
        <Ionicons name="checkmark" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderPresets = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Presets</Text>
      <Text style={styles.sectionDescription}>
        Apply predefined goal sets based on user fitness level
      </Text>
      <View style={styles.presetsRow}>
        {userPresets.map((preset) => (
          <TouchableOpacity
            key={preset.id}
            style={[
              styles.presetCard,
              activePreset === preset.id && { borderColor: preset.color, borderWidth: 2 },
            ]}
            onPress={() => handlePresetSelect(preset)}
          >
            <View style={[styles.presetIcon, { backgroundColor: preset.color + '20' }]}>
              <Ionicons 
                name={preset.id === 'beginner' ? 'leaf' : preset.id === 'intermediate' ? 'fitness' : 'flame'} 
                size={24} 
                color={preset.color} 
              />
            </View>
            <Text style={styles.presetName}>{preset.name}</Text>
            <Text style={styles.presetDescription}>{preset.description}</Text>
            {activePreset === preset.id && (
              <View style={[styles.presetCheck, { backgroundColor: preset.color }]}>
                <Ionicons name="checkmark" size={14} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderApplyOptions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Apply Goals To</Text>
      <View style={styles.applyOptions}>
        {[
          { id: 'all', label: 'All Users', description: 'Apply to all existing users' },
          { id: 'new', label: 'New Users Only', description: 'Apply only to new registrations' },
          { id: 'selected', label: 'Selected Users', description: 'Choose specific users' },
        ].map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[styles.applyOption, applyTo === option.id && styles.applyOptionActive]}
            onPress={() => setApplyTo(option.id as any)}
          >
            <View style={styles.radioButton}>
              {applyTo === option.id && <View style={styles.radioButtonInner} />}
            </View>
            <View style={styles.applyOptionText}>
              <Text style={[styles.applyOptionLabel, applyTo === option.id && styles.applyOptionLabelActive]}>
                {option.label}
              </Text>
              <Text style={styles.applyOptionDesc}>{option.description}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderGoalEditor = (goal: Goal) => {
    const value = goals[goal.id];
    const percentage = ((value - goal.min) / (goal.max - goal.min)) * 100;

    return (
      <View key={goal.id} style={styles.goalCard}>
        <View style={styles.goalHeader}>
          <View style={[styles.goalIcon, { backgroundColor: goal.color + '20' }]}>
            <MaterialCommunityIcons name={goal.icon as any} size={24} color={goal.color} />
          </View>
          <View style={styles.goalInfo}>
            <Text style={styles.goalTitle}>{goal.title}</Text>
            <Text style={styles.goalDescription}>{goal.description}</Text>
            <View style={styles.goalType}>
              <Text style={styles.goalTypeText}>
                {goal.type === 'daily' ? '📅 Daily' : '📆 Weekly'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.goalValue}>
          <TouchableOpacity
            style={styles.adjustButton}
            onPress={() => handleGoalChange(goal.id, Math.max(goal.min, value - (goal.id === 'weight-loss-weekly' ? 0.25 : goal.max > 1000 ? 500 : 5)))}
          >
            <Ionicons name="remove" size={20} color="#64748b" />
          </TouchableOpacity>
          
          <View style={styles.valueDisplay}>
            <Text style={[styles.valueNumber, { color: goal.color }]}>{value}</Text>
            <Text style={styles.valueUnit}>{goal.unit}</Text>
          </View>

          <TouchableOpacity
            style={styles.adjustButton}
            onPress={() => handleGoalChange(goal.id, Math.min(goal.max, value + (goal.id === 'weight-loss-weekly' ? 0.25 : goal.max > 1000 ? 500 : 5)))}
          >
            <Ionicons name="add" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View style={styles.sliderContainer}>
          <View style={styles.sliderTrack}>
            <View style={[styles.sliderFill, { width: `${percentage}%`, backgroundColor: goal.color }]} />
          </View>
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>{goal.min} {goal.unit}</Text>
            <Text style={styles.sliderLabel}>{goal.max} {goal.unit}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderDailyGoals = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>📅 Daily Goals</Text>
      {defaultGoals.filter(g => g.type === 'daily').map(renderGoalEditor)}
    </View>
  );

  const renderWeeklyGoals = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>📆 Weekly Goals</Text>
      {defaultGoals.filter(g => g.type === 'weekly').map(renderGoalEditor)}
    </View>
  );

  const renderFertilityGoals = () => (
    <View style={styles.section}>
      <View style={styles.fertilityCard}>
        <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.fertilityGradient}>
          <MaterialCommunityIcons name="heart-pulse" size={32} color="#fff" />
          <View style={styles.fertilityInfo}>
            <Text style={styles.fertilityTitle}>Fertility-Focused Goals</Text>
            <Text style={styles.fertilityDescription}>
              Based on research: Couples with obesity (BMI ≥30) who achieve 5-10% weight loss and maintain 10,000 daily steps show improved fertility outcomes.
            </Text>
          </View>
        </LinearGradient>
        <View style={styles.fertilityRecommendations}>
          <View style={styles.recommendation}>
            <MaterialCommunityIcons name="walk" size={20} color="#22c55e" />
            <Text style={styles.recommendationText}>
              Couple walking: 60 min/day, 3 days/week
            </Text>
          </View>
          <View style={styles.recommendation}>
            <MaterialCommunityIcons name="run-fast" size={20} color="#f59e0b" />
            <Text style={styles.recommendationText}>
              High knees: 30 min/day, 3 days/week
            </Text>
          </View>
          <View style={styles.recommendation}>
            <MaterialCommunityIcons name="scale-bathroom" size={20} color="#006dab" />
            <Text style={styles.recommendationText}>
              Target: 5-10% total body weight loss
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {toast.visible && (
        <Animated.View style={[styles.toast, toast.type === 'error' ? styles.toastError : styles.toastSuccess, { transform: [{ translateY: toastAnim }] }]}>
          <View style={styles.toastContent}>
            <Text style={styles.toastIcon}>{toast.type === 'error' ? '✗' : '✓'}</Text>
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}

      {renderHeader()}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {renderPresets()}
          {renderApplyOptions()}
          {renderFertilityGoals()}
          {renderDailyGoals()}
          {renderWeeklyGoals()}

          <TouchableOpacity style={styles.saveFullButton} onPress={handleSaveGoals}>
            <LinearGradient colors={['#006dab', '#005a8f']} style={styles.saveFullGradient}>
              <Text style={styles.saveFullText}>Save Goal Settings</Text>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  toast: {
    position: 'absolute', top: 0, left: isWeb ? undefined : 16, right: isWeb ? 20 : 16, zIndex: 1000,
    backgroundColor: '#ffffff', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12,
    elevation: 8, maxWidth: isWeb ? 320 : undefined, borderLeftWidth: 4,
  },
  toastError: { borderLeftColor: '#ef4444' },
  toastSuccess: { borderLeftColor: '#98be4e' },
  toastContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toastIcon: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  toastText: { color: '#1e293b', fontSize: 14, fontWeight: '600', flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',
    paddingTop: isWeb ? 20 : 50, paddingBottom: 16, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, marginLeft: 16 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  headerSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  saveButton: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#22c55e',
    alignItems: 'center', justifyContent: 'center',
  },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  content: { padding: isWeb ? 40 : 16, maxWidth: 800, width: '100%', alignSelf: 'center' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  sectionDescription: { fontSize: 14, color: '#64748b', marginBottom: 16 },
  presetsRow: { flexDirection: 'row', gap: 12 },
  presetCard: {
    flex: 1, backgroundColor: '#ffffff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04,
    shadowRadius: 6, elevation: 1, position: 'relative', borderWidth: 2, borderColor: 'transparent',
  },
  presetIcon: {
    width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  presetName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  presetDescription: { fontSize: 12, color: '#64748b', marginTop: 4 },
  presetCheck: {
    position: 'absolute', top: 10, right: 10, width: 24, height: 24,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  applyOptions: { backgroundColor: '#ffffff', borderRadius: 14, overflow: 'hidden' },
  applyOption: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  applyOptionActive: { backgroundColor: '#eff6ff' },
  radioButton: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#94a3b8',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  radioButtonInner: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#006dab',
  },
  applyOptionText: { flex: 1 },
  applyOptionLabel: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  applyOptionLabelActive: { color: '#006dab' },
  applyOptionDesc: { fontSize: 12, color: '#64748b', marginTop: 2 },
  fertilityCard: { backgroundColor: '#ffffff', borderRadius: 20, overflow: 'hidden' },
  fertilityGradient: {
    flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16,
  },
  fertilityInfo: { flex: 1 },
  fertilityTitle: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  fertilityDescription: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 4, lineHeight: 20 },
  fertilityRecommendations: { padding: 16, gap: 12 },
  recommendation: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recommendationText: { fontSize: 14, color: '#0f172a', flex: 1 },
  goalCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  goalHeader: { flexDirection: 'row', marginBottom: 16 },
  goalIcon: {
    width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  goalInfo: { flex: 1 },
  goalTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  goalDescription: { fontSize: 13, color: '#64748b', marginTop: 2 },
  goalType: { marginTop: 6 },
  goalTypeText: { fontSize: 11, color: '#94a3b8' },
  goalValue: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, gap: 20,
  },
  adjustButton: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },
  valueDisplay: { alignItems: 'center' },
  valueNumber: { fontSize: 36, fontWeight: '800' },
  valueUnit: { fontSize: 14, color: '#64748b', marginTop: 2 },
  sliderContainer: {},
  sliderTrack: {
    height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden',
  },
  sliderFill: { height: '100%', borderRadius: 4 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  sliderLabel: { fontSize: 11, color: '#94a3b8' },
  saveFullButton: {
    borderRadius: 14, overflow: 'hidden', marginTop: 16,
    shadowColor: '#006dab', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveFullGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8,
  },
  saveFullText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
});
