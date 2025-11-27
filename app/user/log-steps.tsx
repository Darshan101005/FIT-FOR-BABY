import BottomNavBar from '@/components/navigation/BottomNavBar';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions,
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
  steps: number;
  timestamp: Date;
  imageUri?: string;
}

const STEPS_STORAGE_KEY = '@fitforbaby_steps_today';

export default function LogStepsScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;

  const [stepCount, setStepCount] = useState('');
  const [stepEntries, setStepEntries] = useState<StepEntry[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const toastAnim = useRef(new Animated.Value(-100)).current;

  // Load saved entries on mount
  useEffect(() => {
    loadSavedEntries();
  }, []);

  const loadSavedEntries = async () => {
    try {
      const savedData = await AsyncStorage.getItem(STEPS_STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        // Check if saved data is from today
        const today = new Date().toDateString();
        if (parsed.date === today && parsed.entries) {
          setStepEntries(parsed.entries.map((e: any) => ({
            ...e,
            timestamp: new Date(e.timestamp)
          })));
        }
      }
    } catch (error) {
      console.error('Error loading saved entries:', error);
    }
  };

  const saveEntriesToStorage = async (entries: StepEntry[]) => {
    try {
      const today = new Date().toDateString();
      const totalSteps = entries.reduce((sum, entry) => sum + entry.steps, 0);
      await AsyncStorage.setItem(STEPS_STORAGE_KEY, JSON.stringify({
        date: today,
        entries: entries,
        totalSteps: totalSteps
      }));
    } catch (error) {
      console.error('Error saving entries:', error);
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

    if (!imageUri) {
      showToast('Please upload or take a photo of your step count', 'error');
      return;
    }

    const newEntry: StepEntry = {
      id: Date.now().toString(),
      steps: parseInt(stepCount),
      timestamp: new Date(),
      imageUri: imageUri,
    };

    const updatedEntries = [newEntry, ...stepEntries];
    setStepEntries(updatedEntries);
    await saveEntriesToStorage(updatedEntries);
    
    setStepCount('');
    setImageUri(null);
    showToast(`${parseInt(stepCount).toLocaleString()} steps logged!`, 'success');
  };

  const getTotalSteps = () => {
    return stepEntries.reduce((sum, entry) => sum + entry.steps, 0);
  };

  const handleRemoveEntry = async (id: string) => {
    const updatedEntries = stepEntries.filter(entry => entry.id !== id);
    setStepEntries(updatedEntries);
    await saveEntriesToStorage(updatedEntries);
    showToast('Entry deleted', 'success');
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

  const handleSaveAll = async () => {
    if (stepEntries.length === 0) {
      showToast('Please add at least one step entry', 'error');
      return;
    }

    const totalSteps = getTotalSteps();
    await saveEntriesToStorage(stepEntries);
    showToast(`Total ${totalSteps.toLocaleString()} steps saved!`, 'success');
    
    setTimeout(() => {
      router.back();
    }, 1500);
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
          <Text style={styles.headerTitle}>Log Steps</Text>
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

            <Text style={styles.stepTitle}>Log Your Steps</Text>
            <Text style={styles.stepDescription}>
              Upload a screenshot or photo of your step counter
            </Text>

            {/* Image Upload Section */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Step Counter Image</Text>
              
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
                    style={styles.uploadButton}
                    onPress={pickImageFromGallery}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[COLORS.primary, COLORS.primaryDark]}
                      style={styles.uploadButtonGradient}
                    >
                      <Ionicons name="images" size={24} color="#ffffff" />
                      <Text style={styles.uploadButtonText}>Gallery</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.uploadButton}
                    onPress={takePhoto}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[COLORS.accent, COLORS.accentDark]}
                      style={styles.uploadButtonGradient}
                    >
                      <Ionicons name="camera" size={24} color="#ffffff" />
                      <Text style={styles.uploadButtonText}>Camera</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Step Input Section */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Enter Step Count</Text>
              <View style={styles.textInputContainer}>
                <MaterialCommunityIcons name="shoe-print" size={20} color={COLORS.textSecondary} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter step count from image"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="number-pad"
                  value={stepCount}
                  onChangeText={(text) => setStepCount(text.replace(/[^0-9]/g, ''))}
                  maxLength={6}
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, (!stepCount || !imageUri) && styles.submitButtonDisabled]}
              onPress={handleAddSteps}
              activeOpacity={0.85}
              disabled={!stepCount || !imageUri}
            >
              <LinearGradient
                colors={(!stepCount || !imageUri) ? ['#94a3b8', '#64748b'] : [COLORS.accent, COLORS.accentDark]}
                style={styles.submitButtonGradient}
              >
                <Ionicons name="add-circle" size={20} color="#ffffff" />
                <Text style={styles.submitButtonText}>Add Steps</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Step Entries List */}
            {stepEntries.length > 0 && (
              <View style={styles.entriesSection}>
                <View style={styles.entriesHeader}>
                  <Text style={styles.inputLabel}>Today's Step Entries ({stepEntries.length})</Text>
                  <View style={styles.totalBadge}>
                    <Text style={styles.totalBadgeText}>Total: {getTotalSteps().toLocaleString()}</Text>
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
                          <Text style={styles.entrySteps}>{entry.steps.toLocaleString()} steps</Text>
                          <Text style={styles.entryTime}>{formatTime(entry.timestamp)}</Text>
                        </View>
                      </View>
                      {index === 0 ? (
                        <TouchableOpacity 
                          style={styles.deleteButton}
                          onPress={() => handleRemoveEntry(entry.id)}
                        >
                          <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.checkmarkContainer}>
                          <Ionicons name="checkmark-circle" size={24} color={COLORS.accent} />
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Empty State */}
            {stepEntries.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="shoe-print" size={48} color={COLORS.border} />
                <Text style={styles.emptyStateText}>No steps logged yet</Text>
                <Text style={styles.emptyStateHint}>Upload an image and enter your step count</Text>
              </View>
            )}

            {/* Info Card */}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={24} color={COLORS.primary} />
              <Text style={styles.infoText}>
                Upload a screenshot or photo of your step counter (fitness app, smartwatch, etc.) and enter the step count shown.
              </Text>
            </View>

            {/* Save Button */}
            {stepEntries.length > 0 && (
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveAll}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  style={styles.saveButtonGradient}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                  <Text style={styles.saveButtonText}>
                    Save {getTotalSteps().toLocaleString()} Steps
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  uploadButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
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
  saveButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
});
