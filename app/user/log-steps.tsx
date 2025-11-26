import { useTheme } from '@/context/ThemeContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
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

export default function LogStepsScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const { colors, isDarkMode } = useTheme();

  const [stepCount, setStepCount] = useState('');
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      }).start(() => {
        setToast({ visible: false, message: '', type: '' });
      });
    }, 3000);
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      showToast('Permission to access gallery is required!', 'error');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProofImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      showToast('Permission to access camera is required!', 'error');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProofImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!stepCount || parseInt(stepCount) <= 0) {
      showToast('Please enter a valid step count', 'error');
      return;
    }

    if (!proofImage) {
      showToast('Please upload a screenshot of your watch', 'error');
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      showToast(`${parseInt(stepCount).toLocaleString()} steps logged successfully!`, 'success');
      
      setTimeout(() => {
        router.back();
      }, 1500);
    }, 1000);
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Toast */}
      {toast.visible && (
        <Animated.View
          style={[
            styles.toast,
            { backgroundColor: colors.cardBackground },
            toast.type === 'error' ? styles.toastError : styles.toastSuccess,
            { transform: [{ translateY: toastAnim }] }
          ]}
        >
          <View style={styles.toastContent}>
            <Text style={[styles.toastIcon, { color: colors.text }]}>
              {toast.type === 'error' ? '✗' : '✓'}
            </Text>
            <Text style={[styles.toastText, { color: colors.text }]}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Log Steps</Text>
          <Text style={[styles.headerDate, { color: colors.textSecondary }]}>{formatDate()}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, isMobile && styles.scrollContentMobile]}
          showsVerticalScrollIndicator={false}
        >
          {/* Icon Header */}
          <View style={styles.iconHeader}>
            <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? '#1a2d3d' : '#e0f2fe' }]}>
              <MaterialCommunityIcons name="shoe-print" size={48} color="#006dab" />
            </View>
            <Text style={[styles.pageTitle, { color: colors.text }]}>Enter Your Steps</Text>
            <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
              Enter the step count from your smartwatch or fitness tracker
            </Text>
          </View>

          {/* Step Count Input */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Step Count</Text>
            <View style={[styles.stepInputContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <MaterialCommunityIcons name="counter" size={24} color="#006dab" />
              <TextInput
                style={[styles.stepInput, { color: colors.text }]}
                placeholder="Enter step count"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                value={stepCount}
                onChangeText={(text) => setStepCount(text.replace(/[^0-9]/g, ''))}
                maxLength={6}
              />
              {stepCount && (
                <Text style={[styles.stepsUnit, { color: colors.textSecondary }]}>steps</Text>
              )}
            </View>
            {stepCount && parseInt(stepCount) > 0 && (
              <Text style={[styles.formattedSteps, { color: '#006dab' }]}>
                {parseInt(stepCount).toLocaleString()} steps
              </Text>
            )}
          </View>

          {/* Photo Proof Section */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Upload Proof</Text>
            <Text style={[styles.inputHint, { color: colors.textSecondary }]}>
              Take a photo or upload a screenshot of your watch/tracker
            </Text>

            {proofImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: proofImage }} style={styles.imagePreview} />
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => setProofImage(null)}
                >
                  <Ionicons name="close-circle" size={28} color="#ef4444" />
                </TouchableOpacity>
                <View style={styles.imageOverlay}>
                  <Ionicons name="checkmark-circle" size={32} color="#98be4e" />
                  <Text style={styles.imageOverlayText}>Photo uploaded</Text>
                </View>
              </View>
            ) : (
              <View style={styles.uploadOptionsRow}>
                <TouchableOpacity 
                  style={[styles.uploadOption, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                  onPress={takePhoto}
                  activeOpacity={0.7}
                >
                  <View style={[styles.uploadIconCircle, { backgroundColor: isDarkMode ? '#1a2d3d' : '#e0f2fe' }]}>
                    <Ionicons name="camera" size={28} color="#006dab" />
                  </View>
                  <Text style={[styles.uploadOptionText, { color: colors.text }]}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.uploadOption, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                  onPress={pickImage}
                  activeOpacity={0.7}
                >
                  <View style={[styles.uploadIconCircle, { backgroundColor: isDarkMode ? '#1a3329' : '#e8f5d6' }]}>
                    <Ionicons name="images" size={28} color="#98be4e" />
                  </View>
                  <Text style={[styles.uploadOptionText, { color: colors.text }]}>Gallery</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Info Card */}
          <View style={[styles.infoCard, { backgroundColor: isDarkMode ? '#1a2d3d' : '#e0f2fe' }]}>
            <Ionicons name="information-circle" size={24} color="#006dab" />
            <Text style={[styles.infoText, { color: isDarkMode ? '#a0c4e8' : '#0369a1' }]}>
              Your step count will be verified by our team. Please ensure the screenshot clearly shows your step count and date.
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Submit Button */}
      <View style={[styles.bottomBar, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!stepCount || !proofImage) && styles.submitButtonDisabled,
            isSubmitting && styles.submitButtonLoading,
          ]}
          onPress={handleSubmit}
          disabled={!stepCount || !proofImage || isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <Text style={styles.submitButtonText}>Submitting...</Text>
          ) : (
            <>
              <MaterialCommunityIcons name="shoe-print" size={20} color="#ffffff" />
              <Text style={styles.submitButtonText}>Submit Steps</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toast: {
    position: 'absolute',
    top: 0,
    left: isWeb ? undefined : 16,
    right: isWeb ? 20 : 16,
    zIndex: 1000,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
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
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toastIcon: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  toastText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: isWeb ? 24 : 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerDate: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  scrollContentMobile: {
    padding: 20,
  },
  iconHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  inputHint: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  stepInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  stepInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
  },
  stepsUnit: {
    fontSize: 16,
    fontWeight: '500',
  },
  formattedSteps: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'right',
  },
  uploadOptionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadOption: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  uploadIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 14,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 12,
  },
  imageOverlayText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  bottomBar: {
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#006dab',
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#006dab',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
  },
  submitButtonLoading: {
    backgroundColor: '#0284c7',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
