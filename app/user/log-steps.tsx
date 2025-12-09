import { useLanguage } from '@/context/LanguageContext';
import { useUserData } from '@/context/UserDataContext';
import { cloudinaryService } from '@/services/cloudinary.service';
import { coupleService, coupleStepsService, formatDateString } from '@/services/firestore.service';
import { geminiService, StepValidationResult } from '@/services/gemini.service';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
    Animated,
    KeyboardAvoidingView,
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

// FIT-FOR-BABY Color Palette
const COLORS = {
  primary: '#006dab',
  primaryDark: '#005a8f',
  primaryLight: '#e0f2fe',
  accent: '#98be4e',
  accentDark: '#7ba83c',
  accentLight: '#e8f5d6',
  background: '#f5f5f5',
  cardBackground: '#ffffff',
  text: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  error: '#ef4444',
  errorLight: '#fee2e2',
};

interface StepEntry {
  id: string;
  stepCount: number;
  loggedAt: Date;
  proofImageUrl?: string;
}

const STEPS_STORAGE_KEY = '@fitforbaby_steps_today';

export default function LogStepsScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const { refreshDailyData } = useUserData();
  const { t } = useLanguage();

  const [stepCount, setStepCount] = useState('');
  const [stepEntries, setStepEntries] = useState<StepEntry[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<StepValidationResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [userGender, setUserGender] = useState<'male' | 'female'>('male');
  const toastAnim = useRef(new Animated.Value(-100)).current;

  // Load user data and step entries on focus
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        setIsLoading(true);
        try {
          const [storedCoupleId, storedGender] = await Promise.all([
            AsyncStorage.getItem('coupleId'),
            AsyncStorage.getItem('userGender'),
          ]);
          
          if (storedCoupleId && storedGender) {
            setCoupleId(storedCoupleId);
            setUserGender(storedGender as 'male' | 'female');
            
            // Load today's step entries from Firestore
            const today = formatDateString(new Date());
            const entries = await coupleStepsService.getByDate(storedCoupleId, storedGender as 'male' | 'female', today);
            
            // Convert Firestore entries to local format
            const localEntries: StepEntry[] = entries.map(entry => ({
              id: entry.id,
              stepCount: entry.stepCount,
              loggedAt: entry.loggedAt?.toDate() || new Date(),
              proofImageUrl: entry.proofImageUrl,
            }));
            
            setStepEntries(localEntries);
          }
        } catch (error) {
          console.error('Error loading step data:', error);
          showToast('Failed to load step entries', 'error');
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
      }).start(() => {
        setToast({ visible: false, message: '', type: '' });
      });
    }, 3000);
  };

  const pickImageFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      showToast('Permission to access gallery is required', 'error');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      showToast('Image selected successfully', 'success');
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      showToast('Permission to access camera is required', 'error');
      return;
    }
    
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      showToast('Photo captured successfully', 'success');
    }
  };

  const handleAddSteps = async () => {
    if (!stepCount || parseInt(stepCount) <= 0) {
      showToast('Please enter a valid step count', 'error');
      return;
    }

    // Image is now optional
    if (!coupleId) {
      showToast('User session not found. Please login again.', 'error');
      return;
    }

    setIsSaving(true);
    setUploadProgress(0);
    setValidationResult(null);
    
    try {
      const stepsToAdd = parseInt(stepCount);
      let proofImageUrl: string | null = null;
      
      // Only validate and upload image if provided
      if (imageUri) {
        if (geminiService.isConfigured()) {
          setIsValidating(true);
          showToast('Verifying your step count...', 'success');
          
          const validation = await geminiService.validateStepCountImage(imageUri, stepsToAdd);
          setValidationResult(validation);
          setIsValidating(false);
          
          if (!validation.isValid) {
            setIsSaving(false);
            return;
          }
          
          if (validation.extractedStepCount) {
            showToast(`Verified: ${validation.extractedStepCount.toLocaleString()} steps`, 'success');
          }
        }
        
        showToast('Uploading proof image...', 'success');
        const userId = `${coupleId}_${userGender === 'male' ? 'M' : 'F'}`;
        proofImageUrl = await cloudinaryService.uploadStepProof(
          userId,
          imageUri,
          (progress) => setUploadProgress(progress)
        );
      }
      
      const entryId = await coupleStepsService.add(coupleId, userGender, {
        stepCount: stepsToAdd,
        proofImageUrl: proofImageUrl || undefined,
        proofType: imageUri ? 'gallery' : undefined,
        source: 'manual',
        // Save AI validation info
        aiValidated: imageUri ? geminiService.isConfigured() : false,
        aiExtractedCount: validationResult?.extractedStepCount || null,
        aiConfidence: validationResult?.confidence || null,
      });
      
      // Update streak for logging activity
      await coupleService.updateStreak(coupleId, userGender);

      // Add to local state
      const newEntry: StepEntry = {
        id: entryId,
        stepCount: stepsToAdd,
        loggedAt: new Date(),
        proofImageUrl: proofImageUrl || undefined,
      };

      const updatedEntries = [newEntry, ...stepEntries];
      setStepEntries(updatedEntries);
      
      // Also update AsyncStorage for home page quick access
      const totalSteps = updatedEntries.reduce((sum, e) => sum + e.stepCount, 0);
      await AsyncStorage.setItem(STEPS_STORAGE_KEY, JSON.stringify({
        date: new Date().toDateString(),
        totalSteps: totalSteps
      }));
      
      setStepCount('');
      setImageUri(null);
      setUploadProgress(0);
      showToast(`${stepsToAdd.toLocaleString()} steps added! Total: ${totalSteps.toLocaleString()}`, 'success');
      
      // Refresh context data so home page shows updated values
      refreshDailyData();
    } catch (error) {
      console.error('Error adding steps:', error);
      showToast('Failed to save steps. Please try again.', 'error');
    } finally {
      setIsSaving(false);
      setUploadProgress(0);
    }
  };

  const getTotalSteps = () => {
    return stepEntries.reduce((sum, entry) => sum + entry.stepCount, 0);
  };

  const handleRemoveEntry = async (id: string) => {
    if (!coupleId) {
      showToast('User session not found', 'error');
      return;
    }

    try {
      // Delete from Firestore
      await coupleStepsService.delete(coupleId, id);
      
      // Remove from local state
      const updatedEntries = stepEntries.filter(entry => entry.id !== id);
      setStepEntries(updatedEntries);
      
      // Update AsyncStorage
      const totalSteps = updatedEntries.reduce((sum, entry) => sum + entry.stepCount, 0);
      await AsyncStorage.setItem(STEPS_STORAGE_KEY, JSON.stringify({
        date: new Date().toDateString(),
        totalSteps: totalSteps
      }));
      
      showToast(t('log.steps.entryDeleted'), 'success');
      
      // Refresh context data
      refreshDailyData();
    } catch (error) {
      console.error('Error deleting entry:', error);
      showToast(t('common.failedToDelete'), 'error');
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = () => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    };
    return new Date().toLocaleDateString('en-US', options);
  };

  return (
    <View style={styles.container}>
      {/* Toast */}
      {toast.visible && (
        <Animated.View
          style={[
            styles.toast,
            toast.type === 'error' ? styles.toastError : styles.toastSuccess,
            { transform: [{ translateY: toastAnim }] }
          ]}
        >
          <View style={styles.toastContent}>
            <Ionicons 
              name={toast.type === 'error' ? 'close-circle' : 'checkmark-circle'} 
              size={22} 
              color={toast.type === 'error' ? COLORS.error : COLORS.accent} 
            />
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('log.steps.title')}</Text>
          <Text style={styles.headerSubtitle}>{formatDate()}</Text>
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Icon Header */}
            <View style={styles.iconHeader}>
              <LinearGradient
                colors={[COLORS.accent, COLORS.accentDark]}
                style={styles.iconCircle}
              >
                <MaterialCommunityIcons name="shoe-print" size={48} color="#ffffff" />
              </LinearGradient>
            </View>

            <Text style={styles.stepTitle}>{t('log.steps.title')}</Text>
            <Text style={styles.stepDescription}>
              {t('log.steps.stepCounterDesc')}
            </Text>

            {/* Image Upload Section - Optional */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>{t('log.steps.stepCounter')} <Text style={{ color: COLORS.textMuted, fontWeight: '400' }}>({t('feedback.other').toLowerCase() === 'other' ? 'Optional' : 'விருப்பம்'})</Text></Text>
              
              {imageUri ? (
                <View style={styles.imagePreviewContainer}>
                  <Image 
                    source={{ uri: imageUri }} 
                    style={styles.imagePreview}
                    contentFit="cover"
                  />
                  <TouchableOpacity 
                    style={styles.changeImageButton}
                    onPress={() => setImageUri(null)}
                  >
                    <Ionicons name="close-circle" size={24} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.imageUploadRow}>
                  <TouchableOpacity 
                    style={[styles.uploadButton, { backgroundColor: COLORS.primaryDark }]}
                    onPress={pickImageFromGallery}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[COLORS.primary, COLORS.primaryDark]}
                      style={styles.uploadButtonGradient}
                    >
                      <Ionicons name="images" size={24} color="#ffffff" />
                      <Text style={styles.uploadButtonText}>{t('log.steps.chooseFromGallery')}</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.uploadButton, { backgroundColor: COLORS.accentDark }]}
                    onPress={takePhoto}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[COLORS.accent, COLORS.accentDark]}
                      style={styles.uploadButtonGradient}
                    >
                      <Ionicons name="camera" size={24} color="#ffffff" />
                      <Text style={styles.uploadButtonText}>{t('log.steps.takePhoto')}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Step Input Section */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>{t('log.steps.count')}</Text>
              <View style={styles.textInputContainer}>
                <MaterialCommunityIcons name="shoe-print" size={20} color={COLORS.textSecondary} />
                <TextInput
                  style={styles.textInput}
                  placeholder={t('log.steps.enterSteps')}
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="number-pad"
                  value={stepCount}
                  onChangeText={(text) => setStepCount(text.replace(/[^0-9]/g, ''))}
                  maxLength={6}
                />
              </View>
            </View>

            {/* Submit Button - Requires step count, image is optional */}
            <TouchableOpacity
              style={[styles.submitButton, (!stepCount || isSaving || isValidating) && styles.submitButtonDisabled]}
              onPress={handleAddSteps}
              activeOpacity={0.85}
              disabled={!stepCount || isSaving || isValidating}
            >
              <LinearGradient
                colors={(!stepCount || isSaving || isValidating) ? ['#94a3b8', '#64748b'] : [COLORS.accent, COLORS.accentDark]}
                style={styles.submitButtonGradient}
              >
                {isValidating ? (
                  <>
                    <Ionicons name="shield-checkmark" size={20} color="#ffffff" />
                    <Text style={styles.submitButtonText}>{t('common.loading')}</Text>
                  </>
                ) : isSaving ? (
                  <Text style={styles.submitButtonText}>
                    {uploadProgress > 0 && uploadProgress < 100 
                      ? `${t('common.loading')} ${Math.round(uploadProgress)}%` 
                      : t('common.loading')}
                  </Text>
                ) : (
                  <>
                    <Ionicons name="add-circle" size={20} color="#ffffff" />
                    <Text style={styles.submitButtonText}>{t('log.steps.addSteps')}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* AI Validation Error */}
            {validationResult && !validationResult.isValid && (
              <View style={styles.validationError}>
                <Ionicons name="close-circle" size={22} color={COLORS.error} />
                <View style={styles.validationErrorContent}>
                  <Text style={styles.validationErrorTitle}>{validationResult.message}</Text>
                  {validationResult.aiReason && (
                    <Text style={styles.validationErrorReason}>{validationResult.aiReason}</Text>
                  )}
                </View>
              </View>
            )}
            
            {/* Helper text for optional image */}
            {!imageUri && (
              <View style={[styles.proofRequiredMessage, { backgroundColor: COLORS.primary + '10', borderColor: COLORS.primary + '30' }]}>
                <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
                <Text style={[styles.proofRequiredText, { color: COLORS.primary }]}>
                  {t('log.steps.stepCounterDesc')}
                </Text>
              </View>
            )}

            {/* Step Entries List */}
            {stepEntries.length > 0 && (
              <View style={styles.entriesSection}>
                <View style={styles.entriesHeader}>
                  <Text style={styles.inputLabel}>{t('log.steps.todaysTotal')} ({stepEntries.length})</Text>
                  <View style={styles.totalBadge}>
                    <Text style={styles.totalBadgeText}>{t('home.goal')}: {getTotalSteps().toLocaleString()}</Text>
                  </View>
                </View>
                {stepEntries.map((entry, index) => (
                  <View key={entry.id} style={styles.entryCard}>
                    <View style={styles.entryContent}>
                      <View style={styles.entryLeft}>
                        <View style={styles.entryIconContainer}>
                          <MaterialCommunityIcons name="shoe-print" size={20} color={COLORS.accent} />
                        </View>
                        <View style={styles.entryInfo}>
                          <Text style={styles.entrySteps}>{entry.stepCount.toLocaleString()} {t('home.steps')}</Text>
                          <Text style={styles.entryTime}>{formatTime(entry.loggedAt)}</Text>
                        </View>
                      </View>
                      <TouchableOpacity 
                        style={styles.deleteButton}
                        onPress={() => handleRemoveEntry(entry.id)}
                      >
                        <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Empty State */}
            {stepEntries.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="shoe-print" size={48} color={COLORS.border} />
                <Text style={styles.emptyStateText}>{t('log.steps.noHistory')}</Text>
                <Text style={styles.emptyStateHint}>{t('log.steps.enterSteps')}</Text>
              </View>
            )}

            {/* Info Card */}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={24} color={COLORS.primary} />
              <Text style={styles.infoText}>
                {t('log.steps.stepCounterDesc')}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  toast: {
    position: 'absolute',
    top: 0,
    left: isWeb ? undefined : 16,
    right: isWeb ? 20 : 16,
    zIndex: 1000,
    backgroundColor: COLORS.cardBackground,
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
  toastError: { borderLeftColor: COLORS.error },
  toastSuccess: { borderLeftColor: COLORS.accent },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toastText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
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
  headerCenter: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  content: {
    padding: isWeb ? 40 : 20,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  iconHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  imageUploadRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  uploadButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 8,
  },
  uploadButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    flexShrink: 1,
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  changeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 4,
  },
  textInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 0,
    gap: 12,
  },
  textInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    backgroundColor: 'transparent',
  },
  submitButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  entriesSection: {
    marginBottom: 24,
  },
  entriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  totalBadge: {
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  totalBadgeText: {
    color: COLORS.accentDark,
    fontSize: 14,
    fontWeight: '700',
  },
  entryCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  entryImage: {
    width: '100%',
    height: 120,
  },
  entryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  entryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  entryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryInfo: {
    gap: 2,
  },
  entrySteps: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  entryTime: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    marginBottom: 24,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  emptyStateHint: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.primaryDark,
    lineHeight: 20,
  },
  proofRequiredMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: COLORS.errorLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.error + '30',
  },
  proofRequiredText: {
    fontSize: 13,
    color: COLORS.error,
    fontWeight: '500',
  },
  validationError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 20,
    marginBottom: 24,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: COLORS.errorLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.error + '40',
  },
  validationErrorContent: {
    flex: 1,
  },
  validationErrorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.error,
  },
  validationErrorReason: {
    fontSize: 13,
    color: COLORS.error + 'CC',
    marginTop: 4,
    lineHeight: 18,
  },
});
