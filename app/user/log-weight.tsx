import { useLanguage } from '@/context/LanguageContext';
import { useUserData } from '@/context/UserDataContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';
import { coupleService, coupleWeightLogService } from '../../services/firestore.service';

const isWeb = Platform.OS === 'web';

interface WeightEntry {
  id: string;
  date: string;
  weight: number;
  height?: number;
  waist?: number;
  bmi?: number;
  whtr?: number;
  notes?: string;
  loggedAt?: any;
}

export default function LogWeightScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const { refreshWeightHistory, refreshUserInfo } = useUserData();
  const { language, t } = useLanguage();

  const [step, setStep] = useState<'log' | 'history'>('log');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('165');
  const [waist, setWaist] = useState('');
  const [notes, setNotes] = useState('');
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const toastAnim = useRef(new Animated.Value(-100)).current;
  
  // Firestore state
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [userGender, setUserGender] = useState<'male' | 'female' | null>(null);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Load user session and weight history
  useEffect(() => {
    loadUserSession();
  }, []);

  // Subscribe to weight logs when coupleId and gender are available
  useEffect(() => {
    if (!coupleId || !userGender) return;
    
    const unsubscribe = coupleWeightLogService.subscribe(
      coupleId,
      userGender,
      (logs) => {
        const formattedLogs: WeightEntry[] = logs.map(log => ({
          id: log.id || '',
          date: log.date,
          weight: log.weight,
          height: log.height,
          waist: log.waist,
          bmi: log.bmi,
          whtr: log.whtr,
          notes: log.notes,
          loggedAt: log.loggedAt
        }));
        setWeightHistory(formattedLogs);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [coupleId, userGender]);

  const loadUserSession = async () => {
    try {
      const storedCoupleId = await AsyncStorage.getItem('coupleId');
      const storedGender = await AsyncStorage.getItem('userGender') as 'male' | 'female' | null;
      
      if (storedCoupleId && storedGender) {
        setCoupleId(storedCoupleId);
        setUserGender(storedGender);
        
        // Load user's saved height from profile
        const coupleData = await coupleService.get(storedCoupleId);
        if (coupleData) {
          const userData = storedGender === 'male' ? coupleData.male : coupleData.female;
          if (userData?.height) {
            setHeight(userData.height.toString());
          }
        }
      } else {
        setIsLoading(false);
        showToast('Please log in again', 'error');
      }
    } catch (error) {
      console.error('Error loading session:', error);
      setIsLoading(false);
    }
  };

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

  const handleSave = async () => {
    if (!weight || parseFloat(weight) <= 0) {
      showToast(t('log.weight.enterValidWeight'), 'error');
      return;
    }

    if (!coupleId || !userGender) {
      showToast(t('error.sessionExpired'), 'error');
      console.error('Missing session data - coupleId:', coupleId, 'userGender:', userGender);
      return;
    }

    setIsSaving(true);

    try {
      const weightValue = unit === 'lbs' ? parseFloat(weight) * 0.453592 : parseFloat(weight);
      const heightValue = parseFloat(height) || 165;
      const waistValue = waist ? parseFloat(waist) : undefined;
      
      const bmi = parseFloat(calculateBMI());
      const whtr = calculateWHtR();

      console.log('Saving weight log:', { coupleId, userGender, weightValue, heightValue, waistValue, bmi, whtr });

      const logData = {
        weight: Math.round(weightValue * 10) / 10,
        height: heightValue,
        waist: waistValue,
        bmi: Math.round(bmi * 10) / 10,
        whtr: whtr ? parseFloat(whtr) : undefined,
        notes: notes || undefined,
        date: new Date().toISOString().split('T')[0],
      };

      const logId = await coupleWeightLogService.add(coupleId, userGender, logData);
      console.log('Weight log saved with ID:', logId);
      
      // Update streak for logging activity
      await coupleService.updateStreak(coupleId, userGender);

      showToast(t('log.weight.successMessage'), 'success');
      
      // Refresh context data so other pages show updated values
      refreshWeightHistory();
      refreshUserInfo();
      
      setWeight('');
      setWaist('');
      setNotes('');
    } catch (error: any) {
      console.error('Error saving weight:', error);
      const errorMessage = error?.message || t('error.unknown');
      showToast(errorMessage, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Format timestamp to 12-hour AM/PM format in IST (Indian Standard Time)
  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString(language === 'ta' ? 'ta-IN' : 'en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
      });
    } catch (e) {
      return '';
    }
  };

  const handleDeleteLatest = () => {
    if (!coupleId || weightHistory.length === 0) return;
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!coupleId || weightHistory.length === 0) return;
    
    const latestEntry = weightHistory[0];
    setShowDeleteModal(false);
    setIsDeleting(true);
    
    try {
      await coupleWeightLogService.delete(coupleId, latestEntry.id);
      showToast(t('log.weight.deleteSuccess'), 'success');
    } catch (error) {
      console.error('Error deleting entry:', error);
      showToast(t('log.weight.deleteFailed'), 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#0f172a" />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>{t('log.weight.measurements')}</Text>
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
          {t('log.weight.logWeight')}
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
          {t('log.weight.history')}
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
            {new Date().toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-US', {
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
              <Text style={[styles.unitText, unit === 'kg' && styles.unitTextActive]}>{t('log.weight.kg')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.unitButton, unit === 'lbs' && styles.unitButtonActive]}
              onPress={() => setUnit('lbs')}
            >
              <Text style={[styles.unitText, unit === 'lbs' && styles.unitTextActive]}>{t('log.weight.lbs')}</Text>
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
                <Text style={styles.bmiLabel}>{t('log.weight.bmi')}</Text>
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
          <Text style={styles.inputLabel}>{t('log.weight.height')}</Text>
          <View style={styles.inputRow}>
            <MaterialCommunityIcons name="human-male-height" size={24} color="#64748b" />
            <TextInput
              style={styles.textInput}
              value={height}
              onChangeText={setHeight}
              placeholder={t('log.weight.enterHeight')}
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Waist Measurement */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>{t('log.weight.waist')}</Text>
          <Text style={styles.inputHelper}>
            {t('log.weight.waistHelper')}
          </Text>
          <View style={styles.inputRow}>
            <MaterialCommunityIcons name="tape-measure" size={24} color="#64748b" />
            <TextInput
              style={styles.textInput}
              value={waist}
              onChangeText={setWaist}
              placeholder={t('log.weight.enterWaist')}
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
            />
          </View>
          {waist && whtr && (
            <View style={styles.whtrContainer}>
              <View style={styles.whtrRow}>
                <Text style={styles.whtrLabel}>{t('log.weight.whtr')}</Text>
                <Text style={[styles.whtrValue, { color: whtrCategory.color }]}>{whtr}</Text>
                <View style={[styles.categoryBadge, { backgroundColor: whtrCategory.color + '20' }]}>
                  <Text style={[styles.categoryText, { color: whtrCategory.color }]}>
                    {language === 'ta' ? t(`log.weight.${whtrCategory.label.toLowerCase()}`) : whtrCategory.label}
                  </Text>
                </View>
              </View>
              <Text style={styles.whtrInfo}>
                {t('log.weight.whtrInfo')}
              </Text>
            </View>
          )}
        </View>

        {/* Notes */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>{t('log.weight.notes')}</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('log.weight.notesPlaceholderWeight')}
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && { opacity: 0.7 }]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={isSaving}
        >
          <LinearGradient
            colors={['#006dab', '#005a8f']}
            style={styles.saveButtonGradient}
          >
            {isSaving ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.saveButtonText}>{t('log.exercise.saving')}</Text>
              </>
            ) : (
              <>
                <Text style={styles.saveButtonText}>{t('log.weight.saveMeasurement')}</Text>
                <Ionicons name="checkmark" size={20} color="#fff" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  const renderHistory = () => {
    if (isLoading) {
      return (
        <View style={[styles.content, { alignItems: 'center', justifyContent: 'center', minHeight: 300 }]}>
          <ActivityIndicator size="large" color="#006dab" />
          <Text style={{ marginTop: 16, color: '#64748b' }}>{t('log.weight.loadingHistory')}</Text>
        </View>
      );
    }

    if (weightHistory.length === 0) {
      return (
        <View style={[styles.content, { alignItems: 'center', justifyContent: 'center', minHeight: 300 }]}>
          <MaterialCommunityIcons name="scale-bathroom" size={64} color="#cbd5e1" />
          <Text style={{ marginTop: 16, fontSize: 18, fontWeight: '600', color: '#64748b' }}>
            {t('log.weight.noEntriesYet')}
          </Text>
          <Text style={{ marginTop: 8, color: '#94a3b8', textAlign: 'center' }}>
            {t('log.weight.startLogging')}
          </Text>
          <TouchableOpacity
            style={{ marginTop: 24, backgroundColor: '#006dab', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
            onPress={() => setStep('log')}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>{t('log.weight.logFirstWeight')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const lastEntry = weightHistory[0];
    const firstEntry = weightHistory[weightHistory.length - 1];
    const totalChange = firstEntry.weight - lastEntry.weight;

    return (
      <View style={styles.content}>
        {/* Progress Summary */}
        <View style={styles.progressCard}>
          <LinearGradient
            colors={['#006dab', '#005a8f']}
            style={styles.progressGradient}
          >
            <Text style={styles.progressTitle}>{t('log.weight.yourProgress')}</Text>
            <View style={styles.progressStats}>
              <View style={styles.progressStat}>
                <Text style={styles.progressValue}>{lastEntry.weight}</Text>
                <Text style={styles.progressLabel}>{t('log.weight.currentKg')}</Text>
              </View>
              <View style={styles.progressDivider} />
              <View style={styles.progressStat}>
                <Text style={styles.progressValue}>{firstEntry.weight}</Text>
                <Text style={styles.progressLabel}>{t('log.weight.startingKg')}</Text>
              </View>
              <View style={styles.progressDivider} />
              <View style={styles.progressStat}>
                <Text style={[styles.progressValue, { color: totalChange > 0 ? '#98be4e' : '#f59e0b' }]}>
                  {totalChange > 0 ? '-' : '+'}{Math.abs(totalChange).toFixed(1)}
                </Text>
                <Text style={styles.progressLabel}>{t('log.weight.lostKg')}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* History List */}
        <Text style={styles.historyTitle}>{t('log.weight.recentEntries')} ({weightHistory.length})</Text>
        {weightHistory.map((entry, index) => {
          const prevEntry = weightHistory[index + 1];
          const change = prevEntry ? entry.weight - prevEntry.weight : 0;
          const isLatest = index === 0;
          
          return (
            <View key={entry.id} style={[styles.historyItem, isLatest && styles.historyItemLatest]}>
              <View style={styles.historyDate}>
                <Text style={styles.historyDay}>
                  {new Date(entry.date).getDate()}
                </Text>
                <Text style={styles.historyMonth}>
                  {t(`months.${['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'][new Date(entry.date).getMonth()]}`)}
                </Text>
                {entry.loggedAt && (
                  <Text style={styles.historyTime}>
                    {formatTimestamp(entry.loggedAt)}
                  </Text>
                )}
                {isLatest && (
                  <View style={styles.latestBadge}>
                    <Text style={styles.latestBadgeText}>{t('log.weight.latest')}</Text>
                  </View>
                )}
              </View>
              <View style={styles.historyDetails}>
                <View style={styles.historyMain}>
                  <MaterialCommunityIcons name="scale-bathroom" size={20} color="#64748b" />
                  <Text style={styles.historyWeight}>{entry.weight} {t('log.weight.kg')}</Text>
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
                {entry.bmi && (
                  <View style={styles.historyWaist}>
                    <Text style={styles.historyWaistText}>{t('log.weight.bmi')}: {entry.bmi}</Text>
                  </View>
                )}
                {entry.waist && (
                  <View style={styles.historyWaist}>
                    <MaterialCommunityIcons name="tape-measure" size={16} color="#94a3b8" />
                    <Text style={styles.historyWaistText}>{t('log.weight.waistCm')}: {entry.waist} {t('log.weight.cm')}</Text>
                    {entry.whtr && <Text style={styles.historyWaistText}> • WHtR: {entry.whtr}</Text>}
                  </View>
                )}
                {entry.notes && (
                  <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' }}>
                    {entry.notes}
                  </Text>
                )}
              </View>
              {isLatest && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDeleteLatest}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#ef4444" />
                  ) : (
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  // Delete Confirmation Modal
  const renderDeleteModal = () => (
    <Modal
      visible={showDeleteModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowDeleteModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, isMobile && styles.modalContentMobile]}>
          <View style={styles.modalIconContainer}>
            <Ionicons name="warning" size={48} color="#ef4444" />
          </View>
          <Text style={styles.modalTitle}>{t('log.weight.deleteEntryQuestion')}</Text>
          <Text style={styles.modalMessage}>
            {t('log.weight.deleteConfirm')}
          </Text>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={() => setShowDeleteModal(false)}
            >
              <Text style={styles.modalButtonCancelText}>{t('log.weight.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonDelete]}
              onPress={confirmDelete}
            >
              <Ionicons name="trash-outline" size={18} color="#fff" />
              <Text style={styles.modalButtonDeleteText}>{t('log.weight.delete')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {renderDeleteModal()}
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
    width: 65,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    marginRight: 16,
    paddingRight: 16,
  },
  historyDay: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  historyMonth: { fontSize: 12, color: '#64748b', textTransform: 'uppercase' },
  historyTime: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
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
  historyItemLatest: {
    borderWidth: 2,
    borderColor: '#006dab',
  },
  latestBadge: {
    backgroundColor: '#006dab',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  latestBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  
  // Delete Confirmation Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalContentMobile: {
    maxWidth: '90%',
    padding: 24,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  modalButtonCancel: {
    backgroundColor: '#f1f5f9',
  },
  modalButtonCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  modalButtonDelete: {
    backgroundColor: '#ef4444',
  },
  modalButtonDeleteText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});
