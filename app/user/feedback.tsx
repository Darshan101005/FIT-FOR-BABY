import BottomNavBar from '@/components/navigation/BottomNavBar';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useUserData } from '@/context/UserDataContext';
import { feedbackService } from '@/services/firestore.service';
import { FeedbackCategory as FeedbackCategoryType } from '@/types/firebase.types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
    ActivityIndicator,
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

interface FeedbackCategory {
  id: FeedbackCategoryType;
  icon: string;
  label: string;
  color: string;
}

const feedbackCategories: FeedbackCategory[] = [
  { id: 'bug', icon: 'bug', label: 'Report Bug', color: '#ef4444' },
  { id: 'feature', icon: 'bulb', label: 'Feature Request', color: '#f59e0b' },
  { id: 'improvement', icon: 'trending-up', label: 'Improvement', color: '#22c55e' },
  { id: 'question', icon: 'help-circle', label: 'Question', color: '#3b82f6' },
  { id: 'other', icon: 'chatbubble', label: 'Other', color: '#8b5cf6' },
];

const ratingEmojis = [
  { rating: 1, emoji: '😞', label: 'Very Poor' },
  { rating: 2, emoji: '😕', label: 'Poor' },
  { rating: 3, emoji: '😐', label: 'Okay' },
  { rating: 4, emoji: '🙂', label: 'Good' },
  { rating: 5, emoji: '😍', label: 'Excellent' },
];

export default function FeedbackScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const { colors, isDarkMode } = useTheme();
  const { userInfo } = useUserData();
  const { t } = useLanguage();

  const [selectedCategory, setSelectedCategory] = useState<FeedbackCategoryType | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toastAnim = useRef(new Animated.Value(-100)).current;
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });

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
    }, 2500);
  };

  const handleSubmit = async () => {
    if (!selectedCategory) {
      showToast('Please select a category', 'error');
      return;
    }
    if (!rating) {
      showToast('Please rate your experience', 'error');
      return;
    }
    if (feedbackText.trim().length < 10) {
      showToast('Please provide more details (at least 10 characters)', 'error');
      return;
    }

    if (!userInfo) {
      showToast('User information not available', 'error');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await feedbackService.submit({
        coupleId: userInfo.coupleId,
        coupleName: `${userInfo.name} & ${userInfo.partnerName}`,
        userId: userInfo.userId,
        userName: userInfo.name,
        userEmail: userInfo.email,
        userGender: userInfo.gender,
        category: selectedCategory,
        rating: rating,
        message: feedbackText.trim(),
      });
      
      setIsSubmitting(false);
      setSubmitted(true);
      showToast('Feedback submitted successfully!', 'success');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setIsSubmitting(false);
      showToast('Failed to submit feedback. Please try again.', 'error');
    }
  };

  const resetForm = () => {
    setSelectedCategory(null);
    setRating(null);
    setFeedbackText('');
    setSubmitted(false);
  };

  const renderSuccessView = () => (
    <View style={styles.successContainer}>
      <View style={[styles.successIcon, { backgroundColor: '#22c55e20' }]}>
        <Ionicons name="checkmark-circle" size={80} color="#22c55e" />
      </View>
      <Text style={[styles.successTitle, { color: colors.text }]}>
        {t('feedback.successTitle')}
      </Text>
      <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
        {t('feedback.successMessage')}
      </Text>
      <View style={styles.successActions}>
        <TouchableOpacity
          style={[styles.successButton, { backgroundColor: colors.primary }]}
          onPress={resetForm}
        >
          <Ionicons name="create-outline" size={20} color="#fff" />
          <Text style={styles.successButtonText}>{t('feedback.submitAnother')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.successButtonOutline, { borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.successButtonOutlineText, { color: colors.text }]}>
            {t('feedback.goBack')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {toast.visible && (
        <Animated.View
          style={[
            styles.toast,
            { backgroundColor: colors.cardBackground },
            toast.type === 'error' ? styles.toastError : styles.toastSuccess,
            { transform: [{ translateY: toastAnim }] },
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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient colors={colors.headerBackground as [string, string]} style={styles.header}>
            <View style={styles.headerTop}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{t('feedback.title')}</Text>
              <View style={{ width: 40 }} />
            </View>
            <Text style={styles.headerSubtitle}>
              {t('feedback.subtitle')}
            </Text>
          </LinearGradient>

          <View style={[styles.content, isMobile && styles.contentMobile]}>
            {submitted ? (
              renderSuccessView()
            ) : (
              <>
                {/* Category Selection */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {t('feedback.category')}
                  </Text>
                  <View style={styles.categoryGrid}>
                    {feedbackCategories.map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.categoryCard,
                          { 
                            backgroundColor: colors.cardBackground,
                            borderColor: selectedCategory === category.id 
                              ? category.color 
                              : colors.border,
                            borderWidth: selectedCategory === category.id ? 2 : 1,
                          },
                        ]}
                        onPress={() => setSelectedCategory(category.id)}
                      >
                        <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                          <Ionicons name={category.icon as any} size={24} color={category.color} />
                        </View>
                        <Text style={[
                          styles.categoryLabel,
                          { 
                            color: selectedCategory === category.id 
                              ? category.color 
                              : colors.text,
                          },
                        ]}>
                          {category.label}
                        </Text>
                        {selectedCategory === category.id && (
                          <View style={[styles.categoryCheck, { backgroundColor: category.color }]}>
                            <Ionicons name="checkmark" size={12} color="#fff" />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Rating */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {t('feedback.rating')}
                  </Text>
                  <View style={[styles.ratingCard, { backgroundColor: colors.cardBackground }]}>
                    <View style={styles.ratingRow}>
                      {ratingEmojis.map((item) => (
                        <TouchableOpacity
                          key={item.rating}
                          style={[
                            styles.ratingItem,
                            rating === item.rating && [
                              styles.ratingItemActive,
                              { backgroundColor: colors.primary + '15', borderColor: colors.primary },
                            ],
                          ]}
                          onPress={() => setRating(item.rating)}
                        >
                          <Text style={styles.ratingEmoji}>{item.emoji}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {rating && (
                      <Text style={[styles.ratingLabel, { color: colors.primary }]}>
                        {ratingEmojis.find(r => r.rating === rating)?.label}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Feedback Text */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {t('feedback.details')}
                  </Text>
                  <View style={[styles.textAreaContainer, { backgroundColor: colors.cardBackground }]}>
                    <TextInput
                      style={[styles.textArea, { color: colors.text }]}
                      placeholder={t('feedback.detailsPlaceholder')}
                      placeholderTextColor={colors.textMuted}
                      value={feedbackText}
                      onChangeText={setFeedbackText}
                      multiline
                      numberOfLines={6}
                      textAlignVertical="top"
                    />
                    <Text style={[styles.charCount, { color: colors.textMuted }]}>
                      {feedbackText.length}/500
                    </Text>
                  </View>
                </View>

                {/* Email (Display Only) */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {t('feedback.contactEmail')}
                  </Text>
                  <View style={[styles.emailContainer, { backgroundColor: colors.cardBackground }]}>
                    <Ionicons name="mail-outline" size={20} color={colors.textMuted} />
                    <Text style={[styles.emailInput, { color: colors.text }]}>
                      {userInfo?.email || t('common.noData')}
                    </Text>
                  </View>
                  <Text style={[styles.emailHint, { color: colors.textMuted }]}>
                    {t('feedback.emailHint')}
                  </Text>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    { backgroundColor: colors.primary },
                    isSubmitting && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="send" size={20} color="#fff" />
                      <Text style={styles.submitButtonText}>{t('feedback.submit')}</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Privacy Note */}
                <View style={[styles.privacyNote, { backgroundColor: isDarkMode ? colors.cardBackground : '#f8fafc' }]}>
                  <Ionicons name="shield-checkmark" size={18} color={colors.textMuted} />
                  <Text style={[styles.privacyText, { color: colors.textMuted }]}>
                    {t('feedback.privacyNote')}
                  </Text>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomNavBar />
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
  toastIcon: { fontSize: 18, fontWeight: 'bold' },
  toastText: { fontSize: 14, fontWeight: '600', flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: isWeb ? 40 : 100,
  },
  header: {
    paddingTop: isWeb ? 20 : 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 8,
  },
  content: {
    padding: isWeb ? 40 : 20,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  contentMobile: {
    padding: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    flexBasis: '30%',
    flexGrow: 1,
    minWidth: 100,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    position: 'relative',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  categoryCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  ratingItem: {
    padding: 10,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  ratingItemActive: {
    borderWidth: 2,
  },
  ratingEmoji: {
    fontSize: 28,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
  },
  textAreaContainer: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  textArea: {
    fontSize: 15,
    lineHeight: 24,
    minHeight: 140,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  emailInput: {
    flex: 1,
    fontSize: 15,
  },
  emailHint: {
    fontSize: 12,
    marginTop: 8,
    marginLeft: 4,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 14,
    gap: 10,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  // Success View
  successContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  successActions: {
    width: '100%',
    gap: 12,
  },
  successButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 10,
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  successButtonOutline: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  successButtonOutlineText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
