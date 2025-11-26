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

interface WeightEntry {
  id: string;
  date: string;
  weight: number;
  height?: number;
  waist?: number;
  notes?: string;
}

// Mock historical data
const mockHistory: WeightEntry[] = [
  { id: '1', date: '2024-11-20', weight: 85.2, waist: 92 },
  { id: '2', date: '2024-11-15', weight: 86.0, waist: 93 },
  { id: '3', date: '2024-11-10', weight: 86.8, waist: 94 },
  { id: '4', date: '2024-11-05', weight: 87.5, waist: 95 },
  { id: '5', date: '2024-11-01', weight: 88.0, waist: 96 },
];

export default function LogWeightScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;

  const [step, setStep] = useState<'log' | 'history'>('log');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('165');
  const [waist, setWaist] = useState('');
  const [notes, setNotes] = useState('');
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
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

  const calculateBMI = () => {
    const weightNum = parseFloat(weight) || 0;
    const heightNum = parseFloat(height) || 165;
    const heightInMeters = heightNum / 100;
    const weightInKg = unit === 'lbs' ? weightNum * 0.453592 : weightNum;
    return (weightInKg / (heightInMeters * heightInMeters)).toFixed(1);
  };

  const calculateWHtR = () => {
    const waistNum = parseFloat(waist) || 0;
    const heightNum = parseFloat(height) || 165;
    if (!waistNum || !heightNum) return null;
    return (waistNum / heightNum).toFixed(2);
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Underweight', color: '#f59e0b' };
    if (bmi < 25) return { label: 'Normal', color: '#22c55e' };
    if (bmi < 30) return { label: 'Overweight', color: '#f59e0b' };
    return { label: 'Obese', color: '#ef4444' };
  };

  const getWHtRCategory = (whtr: number) => {
    if (whtr < 0.4) return { label: 'Low risk', color: '#22c55e' };
    if (whtr < 0.5) return { label: 'Normal', color: '#22c55e' };
    if (whtr < 0.6) return { label: 'Moderate risk', color: '#f59e0b' };
    return { label: 'High risk', color: '#ef4444' };
  };

  const handleSave = () => {
    if (!weight || parseFloat(weight) <= 0) {
      showToast('Please enter a valid weight', 'error');
      return;
    }
    showToast('Weight logged successfully!', 'success');
    setTimeout(() => {
      setWeight('');
      setWaist('');
      setNotes('');
    }, 1500);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#0f172a" />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>Weight & Measurements</Text>
      </View>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabs}>
      <TouchableOpacity
        style={[styles.tab, step === 'log' && styles.tabActive]}
        onPress={() => setStep('log')}
      >
        <MaterialCommunityIcons
          name="scale-bathroom"
          size={20}
          color={step === 'log' ? '#006dab' : '#64748b'}
        />
        <Text style={[styles.tabText, step === 'log' && styles.tabTextActive]}>
          Log Weight
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, step === 'history' && styles.tabActive]}
        onPress={() => setStep('history')}
      >
        <MaterialCommunityIcons
          name="chart-line"
          size={20}
          color={step === 'history' ? '#006dab' : '#64748b'}
        />
        <Text style={[styles.tabText, step === 'history' && styles.tabTextActive]}>
          History
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderLogWeight = () => {
    const bmi = calculateBMI();
    const bmiNum = parseFloat(bmi) || 0;
    const bmiCategory = getBMICategory(bmiNum);
    const whtr = calculateWHtR();
    const whtrNum = parseFloat(whtr || '0');
    const whtrCategory = getWHtRCategory(whtrNum);

    return (
      <View style={styles.content}>
        {/* Date */}
        <View style={styles.dateContainer}>
          <Ionicons name="calendar-outline" size={20} color="#64748b" />
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </View>

        {/* Weight Input */}
        <View style={styles.mainInputCard}>
          <View style={styles.unitToggle}>
            <TouchableOpacity
              style={[styles.unitButton, unit === 'kg' && styles.unitButtonActive]}
              onPress={() => setUnit('kg')}
            >
              <Text style={[styles.unitText, unit === 'kg' && styles.unitTextActive]}>kg</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.unitButton, unit === 'lbs' && styles.unitButtonActive]}
              onPress={() => setUnit('lbs')}
            >
              <Text style={[styles.unitText, unit === 'lbs' && styles.unitTextActive]}>lbs</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.weightInputContainer}>
            <MaterialCommunityIcons name="scale-bathroom" size={32} color="#006dab" />
            <TextInput
              style={styles.weightInput}
              value={weight}
              onChangeText={setWeight}
              placeholder="0.0"
              placeholderTextColor="#cbd5e1"
              keyboardType="decimal-pad"
              selectTextOnFocus
            />
            <Text style={styles.weightUnit}>{unit}</Text>
          </View>

          {weight && parseFloat(weight) > 0 && (
            <View style={styles.bmiContainer}>
              <View style={styles.bmiRow}>
                <Text style={styles.bmiLabel}>BMI</Text>
                <Text style={[styles.bmiValue, { color: bmiCategory.color }]}>{bmi}</Text>
                <View style={[styles.categoryBadge, { backgroundColor: bmiCategory.color + '20' }]}>
                  <Text style={[styles.categoryText, { color: bmiCategory.color }]}>
                    {bmiCategory.label}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Height Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Height (cm)</Text>
          <View style={styles.inputRow}>
            <MaterialCommunityIcons name="human-male-height" size={24} color="#64748b" />
            <TextInput
              style={styles.textInput}
              value={height}
              onChangeText={setHeight}
              placeholder="Enter height"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Waist Measurement */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Waist Circumference (cm)</Text>
          <Text style={styles.inputHelper}>
            Measure at your belly button level
          </Text>
          <View style={styles.inputRow}>
            <MaterialCommunityIcons name="tape-measure" size={24} color="#64748b" />
            <TextInput
              style={styles.textInput}
              value={waist}
              onChangeText={setWaist}
              placeholder="Enter waist measurement"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
            />
          </View>
          {waist && whtr && (
            <View style={styles.whtrContainer}>
              <View style={styles.whtrRow}>
                <Text style={styles.whtrLabel}>Waist-to-Height Ratio (WHtR)</Text>
                <Text style={[styles.whtrValue, { color: whtrCategory.color }]}>{whtr}</Text>
                <View style={[styles.categoryBadge, { backgroundColor: whtrCategory.color + '20' }]}>
                  <Text style={[styles.categoryText, { color: whtrCategory.color }]}>
                    {whtrCategory.label}
                  </Text>
                </View>
              </View>
              <Text style={styles.whtrInfo}>
                WHtR &lt; 0.5 is recommended for optimal health
              </Text>
            </View>
          )}
        </View>

        {/* Notes */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Notes (optional)</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Time of day, clothing, how you feel..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Health Tips */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb-outline" size={20} color="#f59e0b" />
            <Text style={styles.tipsTitle}>Tips for Accurate Measurements</Text>
          </View>
          <View style={styles.tipsList}>
            <Text style={styles.tipItem}>• Weigh yourself at the same time each day</Text>
            <Text style={styles.tipItem}>• Best time: Morning, after using restroom</Text>
            <Text style={styles.tipItem}>• Wear similar clothing or weigh without clothes</Text>
            <Text style={styles.tipItem}>• For waist: Stand relaxed, don't suck in</Text>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#006dab', '#005a8f']}
            style={styles.saveButtonGradient}
          >
            <Text style={styles.saveButtonText}>Save Measurement</Text>
            <Ionicons name="checkmark" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  const renderHistory = () => {
    const lastEntry = mockHistory[0];
    const firstEntry = mockHistory[mockHistory.length - 1];
    const totalChange = firstEntry.weight - lastEntry.weight;

    return (
      <View style={styles.content}>
        {/* Progress Summary */}
        <View style={styles.progressCard}>
          <LinearGradient
            colors={['#006dab', '#005a8f']}
            style={styles.progressGradient}
          >
            <Text style={styles.progressTitle}>Your Progress</Text>
            <View style={styles.progressStats}>
              <View style={styles.progressStat}>
                <Text style={styles.progressValue}>{lastEntry.weight}</Text>
                <Text style={styles.progressLabel}>Current (kg)</Text>
              </View>
              <View style={styles.progressDivider} />
              <View style={styles.progressStat}>
                <Text style={styles.progressValue}>{firstEntry.weight}</Text>
                <Text style={styles.progressLabel}>Starting (kg)</Text>
              </View>
              <View style={styles.progressDivider} />
              <View style={styles.progressStat}>
                <Text style={[styles.progressValue, { color: totalChange > 0 ? '#98be4e' : '#f59e0b' }]}>
                  {totalChange > 0 ? '-' : '+'}{Math.abs(totalChange).toFixed(1)}
                </Text>
                <Text style={styles.progressLabel}>Lost (kg)</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Simple Chart Visualization */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Weight Trend</Text>
          <View style={styles.chartContainer}>
            {mockHistory.slice().reverse().map((entry, index) => {
              const maxWeight = Math.max(...mockHistory.map(e => e.weight));
              const minWeight = Math.min(...mockHistory.map(e => e.weight));
              const range = maxWeight - minWeight || 1;
              const heightPercent = ((entry.weight - minWeight) / range) * 100;
              
              return (
                <View key={entry.id} style={styles.chartBar}>
                  <View style={styles.chartBarContainer}>
                    <View 
                      style={[
                        styles.chartBarFill, 
                        { 
                          height: `${Math.max(20, heightPercent)}%`,
                          backgroundColor: index === mockHistory.length - 1 ? '#006dab' : '#94a3b8'
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.chartBarLabel}>{formatDate(entry.date)}</Text>
                  <Text style={styles.chartBarValue}>{entry.weight}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* History List */}
        <Text style={styles.historyTitle}>Recent Entries</Text>
        {mockHistory.map((entry, index) => {
          const prevEntry = mockHistory[index + 1];
          const change = prevEntry ? entry.weight - prevEntry.weight : 0;
          
          return (
            <View key={entry.id} style={styles.historyItem}>
              <View style={styles.historyDate}>
                <Text style={styles.historyDay}>
                  {new Date(entry.date).toLocaleDateString('en-US', { day: 'numeric' })}
                </Text>
                <Text style={styles.historyMonth}>
                  {new Date(entry.date).toLocaleDateString('en-US', { month: 'short' })}
                </Text>
              </View>
              <View style={styles.historyDetails}>
                <View style={styles.historyMain}>
                  <MaterialCommunityIcons name="scale-bathroom" size={20} color="#64748b" />
                  <Text style={styles.historyWeight}>{entry.weight} kg</Text>
                  {change !== 0 && (
                    <View style={[
                      styles.changeBadge,
                      { backgroundColor: change < 0 ? '#dcfce7' : '#fef2f2' }
                    ]}>
                      <Ionicons
                        name={change < 0 ? 'arrow-down' : 'arrow-up'}
                        size={12}
                        color={change < 0 ? '#22c55e' : '#ef4444'}
                      />
                      <Text style={[
                        styles.changeText,
                        { color: change < 0 ? '#22c55e' : '#ef4444' }
                      ]}>
                        {Math.abs(change).toFixed(1)}
                      </Text>
                    </View>
                  )}
                </View>
                {entry.waist && (
                  <View style={styles.historyWaist}>
                    <MaterialCommunityIcons name="tape-measure" size={16} color="#94a3b8" />
                    <Text style={styles.historyWaistText}>Waist: {entry.waist} cm</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
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
      {renderTabs()}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {step === 'log' && renderLogWeight()}
        {step === 'history' && renderHistory()}
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    gap: 8,
  },
  tabActive: {
    backgroundColor: '#eff6ff',
    borderWidth: 2,
    borderColor: '#006dab',
  },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#006dab' },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  content: {
    padding: isWeb ? 40 : 20,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dateText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  mainInputCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  unitToggle: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 4,
    marginBottom: 24,
  },
  unitButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  unitButtonActive: {
    backgroundColor: '#006dab',
  },
  unitText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  unitTextActive: { color: '#ffffff' },
  weightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  weightInput: {
    fontSize: 56,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    minWidth: 150,
  },
  weightUnit: {
    fontSize: 24,
    fontWeight: '600',
    color: '#64748b',
  },
  bmiContainer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  bmiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  bmiLabel: { fontSize: 16, fontWeight: '600', color: '#64748b' },
  bmiValue: { fontSize: 28, fontWeight: '800' },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: { fontSize: 12, fontWeight: '700' },
  inputSection: { marginBottom: 24 },
  inputLabel: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  inputHelper: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  textInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0f172a',
  },
  whtrContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
  },
  whtrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  whtrLabel: { fontSize: 13, color: '#64748b' },
  whtrValue: { fontSize: 18, fontWeight: '800' },
  whtrInfo: { fontSize: 12, color: '#64748b', marginTop: 4 },
  notesInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    fontSize: 16,
    color: '#0f172a',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  tipsCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: '#92400e' },
  tipsList: { gap: 4 },
  tipItem: { fontSize: 13, color: '#78350f', lineHeight: 20 },
  saveButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#006dab',
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
  progressCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#006dab',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  progressGradient: {
    padding: 24,
  },
  progressTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff', marginBottom: 16 },
  progressStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  progressStat: { alignItems: 'center' },
  progressValue: { fontSize: 28, fontWeight: '800', color: '#ffffff' },
  progressLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  progressDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  chartTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
  },
  chartBarContainer: {
    width: '60%',
    height: '100%',
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 6,
  },
  chartBarLabel: { fontSize: 10, color: '#64748b', marginTop: 8 },
  chartBarValue: { fontSize: 11, fontWeight: '700', color: '#0f172a' },
  historyTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  historyItem: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  historyDate: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    marginRight: 16,
    paddingRight: 16,
  },
  historyDay: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  historyMonth: { fontSize: 12, color: '#64748b', textTransform: 'uppercase' },
  historyDetails: { flex: 1 },
  historyMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyWeight: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  changeText: { fontSize: 12, fontWeight: '700' },
  historyWaist: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  historyWaistText: { fontSize: 13, color: '#64748b' },
});
