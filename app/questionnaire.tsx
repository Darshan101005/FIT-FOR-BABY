import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  useWindowDimensions
} from 'react-native';
import { getSectionsByGender, Question, QuestionSection } from '../data/questionnaireData';

const isWeb = Platform.OS === 'web';

export default function QuestionnaireScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Mock gender - in real app, this would come from context/auth
  const userGender: 'male' | 'female' = 'female';
  
  const sections = useMemo(() => getSectionsByGender(userGender), [userGender]);
  
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const toastAnim = useRef(new Animated.Value(-100)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  const isMobileWeb = useMemo(() => {
    if (!isWeb) return false;
    return /Mobi|Android|iPhone/i.test(navigator.userAgent);
  }, []);

  const isMobile = screenWidth < 768;

  const currentSection = sections[currentSectionIndex];
  const filteredQuestions = currentSection?.questions.filter(
    q => !q.genderSpecific || q.genderSpecific === userGender
  ) || [];
  const currentQuestion = filteredQuestions[currentQuestionIndex];

  const totalQuestionsAnswered = Object.keys(answers).length;
  const totalQuestions = sections.reduce((acc, section) => {
    return acc + section.questions.filter(q => !q.genderSpecific || q.genderSpecific === userGender).length;
  }, 0);
  const progressPercentage = Math.round((totalQuestionsAnswered / totalQuestions) * 100);

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

  const animateTransition = (callback: () => void) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      callback();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleAnswer = (value: any) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: value
    }));
  };

  const handleMultiSelect = (value: string) => {
    const currentValues = answers[currentQuestion.id] || [];
    let newValues;
    
    if (value === 'none') {
      newValues = currentValues.includes('none') ? [] : ['none'];
    } else {
      if (currentValues.includes(value)) {
        newValues = currentValues.filter((v: string) => v !== value);
      } else {
        newValues = [...currentValues.filter((v: string) => v !== 'none'), value];
      }
    }
    
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: newValues
    }));
  };

  const validateCurrentAnswer = (): boolean => {
    if (!currentQuestion.required) return true;
    
    const answer = answers[currentQuestion.id];
    
    if (answer === undefined || answer === null || answer === '') {
      showToast('Please answer this question to continue', 'error');
      return false;
    }
    
    if (currentQuestion.type === 'multiselect' && (!answer || answer.length === 0)) {
      showToast('Please select at least one option', 'error');
      return false;
    }
    
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentAnswer()) return;

    animateTransition(() => {
      if (currentQuestionIndex < filteredQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else if (currentSectionIndex < sections.length - 1) {
        setCurrentSectionIndex(prev => prev + 1);
        setCurrentQuestionIndex(0);
      } else {
        // Questionnaire completed
        showToast('Questionnaire completed!', 'success');
        setTimeout(() => {
          router.replace('/user/home');
        }, 1500);
      }
    });
  };

  const handlePrevious = () => {
    animateTransition(() => {
      if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex(prev => prev - 1);
      } else if (currentSectionIndex > 0) {
        const prevSection = sections[currentSectionIndex - 1];
        const prevFilteredQuestions = prevSection.questions.filter(
          q => !q.genderSpecific || q.genderSpecific === userGender
        );
        setCurrentSectionIndex(prev => prev - 1);
        setCurrentQuestionIndex(prevFilteredQuestions.length - 1);
      }
    });
  };

  const handleSkip = () => {
    showToast('Progress saved! You can continue later from your profile.', 'success');
    setTimeout(() => {
      router.replace('/user/home');
    }, 1500);
  };

  const isFirstQuestion = currentSectionIndex === 0 && currentQuestionIndex === 0;
  const isLastQuestion = currentSectionIndex === sections.length - 1 && 
    currentQuestionIndex === filteredQuestions.length - 1;

  const renderQuestion = () => {
    if (!currentQuestion) return null;

    switch (currentQuestion.type) {
      case 'text':
        return (
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder={currentQuestion.placeholder}
              placeholderTextColor="#94a3b8"
              value={answers[currentQuestion.id] || ''}
              onChangeText={(value) => handleAnswer(value)}
              multiline={currentQuestion.id === 'additional_comments'}
              numberOfLines={currentQuestion.id === 'additional_comments' ? 4 : 1}
            />
          </View>
        );

      case 'number':
        return (
          <View style={styles.numberInputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.textInput, styles.numberInput]}
                placeholder={currentQuestion.placeholder}
                placeholderTextColor="#94a3b8"
                value={answers[currentQuestion.id]?.toString() || ''}
                onChangeText={(value) => handleAnswer(parseFloat(value) || '')}
                keyboardType="numeric"
              />
            </View>
            {currentQuestion.unit && (
              <View style={styles.unitBadge}>
                <Text style={styles.unitText}>{currentQuestion.unit}</Text>
              </View>
            )}
          </View>
        );

      case 'select':
      case 'radio':
        return (
          <View style={styles.optionsContainer}>
            {currentQuestion.options?.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionCard,
                  answers[currentQuestion.id] === option.value && styles.optionCardSelected
                ]}
                onPress={() => handleAnswer(option.value)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.radioOuter,
                  answers[currentQuestion.id] === option.value && styles.radioOuterSelected
                ]}>
                  {answers[currentQuestion.id] === option.value && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Text style={[
                  styles.optionText,
                  answers[currentQuestion.id] === option.value && styles.optionTextSelected
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'multiselect':
        return (
          <View style={styles.optionsContainer}>
            {currentQuestion.options?.map((option) => {
              const isSelected = (answers[currentQuestion.id] || []).includes(option.value);
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionCard,
                    isSelected && styles.optionCardSelected
                  ]}
                  onPress={() => handleMultiSelect(option.value)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.checkbox,
                    isSelected && styles.checkboxSelected
                  ]}>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#ffffff" />}
                  </View>
                  <Text style={[
                    styles.optionText,
                    isSelected && styles.optionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );

      case 'scale':
        const scaleValue = answers[currentQuestion.id] || 5;
        return (
          <View style={styles.scaleContainer}>
            <View style={styles.scaleLabels}>
              <Text style={styles.scaleLabelText}>Low</Text>
              <Text style={styles.scaleLabelText}>High</Text>
            </View>
            <View style={styles.scaleButtons}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.scaleButton,
                    scaleValue === num && styles.scaleButtonSelected
                  ]}
                  onPress={() => handleAnswer(num)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.scaleButtonText,
                    scaleValue === num && styles.scaleButtonTextSelected
                  ]}>
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.scaleValue}>Selected: {scaleValue}</Text>
          </View>
        );

      case 'date':
        return (
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="DD/MM/YYYY"
              placeholderTextColor="#94a3b8"
              value={answers[currentQuestion.id] || ''}
              onChangeText={(value) => handleAnswer(value)}
              keyboardType="numeric"
            />
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {toast.visible && (
        <Animated.View
          style={[
            styles.toast,
            toast.type === 'error' ? styles.toastError : styles.toastSuccess,
            { transform: [{ translateY: toastAnim }] }
          ]}
        >
          <View style={styles.toastContent}>
            <Text style={styles.toastIcon}>{toast.type === 'error' ? '✗' : '✓'}</Text>
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Save & Continue Later</Text>
          </TouchableOpacity>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
            </View>
            <Text style={styles.progressText}>{progressPercentage}% Complete</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.contentWrapper, isMobile && styles.mobileContentWrapper]}>
            {/* Section Header */}
            <Animated.View style={[styles.sectionHeader, { opacity: fadeAnim }]}>
              <View style={styles.sectionIconContainer}>
                <LinearGradient
                  colors={['#006dab', '#005a8f']}
                  style={styles.sectionIconGradient}
                >
                  <Ionicons 
                    name={currentSection?.icon as any || 'help-outline'} 
                    size={28} 
                    color="#ffffff" 
                  />
                </LinearGradient>
              </View>
              <Text style={styles.sectionTitle}>{currentSection?.title}</Text>
              <Text style={styles.sectionDescription}>{currentSection?.description}</Text>
              <View style={styles.questionCounter}>
                <Text style={styles.questionCounterText}>
                  Question {currentQuestionIndex + 1} of {filteredQuestions.length}
                </Text>
              </View>
            </Animated.View>

            {/* Question */}
            <Animated.View style={[styles.questionContainer, { opacity: fadeAnim }]}>
              <Text style={styles.questionText}>{currentQuestion?.question}</Text>
              {!currentQuestion?.required && (
                <Text style={styles.optionalText}>(Optional)</Text>
              )}
              
              <View style={styles.answerContainer}>
                {renderQuestion()}
              </View>
            </Animated.View>

            {/* Navigation Buttons */}
            <View style={styles.navigationContainer}>
              <TouchableOpacity
                style={[styles.navButton, styles.prevButton, isFirstQuestion && styles.navButtonDisabled]}
                onPress={handlePrevious}
                disabled={isFirstQuestion}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={20} color={isFirstQuestion ? '#94a3b8' : '#006dab'} />
                <Text style={[styles.prevButtonText, isFirstQuestion && styles.navButtonTextDisabled]}>
                  Previous
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navButton}
                onPress={handleNext}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#006dab', '#005a8f']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.nextButtonGradient}
                >
                  <Text style={styles.nextButtonText}>
                    {isLastQuestion ? 'Complete' : 'Next'}
                  </Text>
                  <Ionicons 
                    name={isLastQuestion ? 'checkmark' : 'arrow-forward'} 
                    size={20} 
                    color="#ffffff" 
                  />
                </LinearGradient>
              </TouchableOpacity>
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
  toastError: {
    borderLeftColor: '#ef4444',
  },
  toastSuccess: {
    borderLeftColor: '#98be4e',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toastIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  toastText: {
    color: '#1e293b',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingTop: isWeb ? 20 : 50,
    paddingBottom: 16,
    paddingHorizontal: isWeb ? 40 : 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#98be4e',
  },
  skipText: {
    color: '#98be4e',
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    alignItems: 'flex-end',
    gap: 6,
  },
  progressBar: {
    width: 120,
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#98be4e',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: isWeb ? 40 : 20,
  },
  contentWrapper: {
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
  },
  mobileContentWrapper: {
    paddingHorizontal: 0,
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  sectionIconContainer: {
    marginBottom: 16,
  },
  sectionIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 12,
  },
  questionCounter: {
    backgroundColor: '#e2e8f0',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  questionCounterText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  questionContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: isWeb ? 32 : 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    lineHeight: 28,
  },
  optionalText: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 24,
  },
  answerContainer: {
    marginTop: 16,
  },
  inputWrapper: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    overflow: 'hidden',
  },
  textInput: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  numberInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  numberInput: {
    flex: 1,
    textAlign: 'center',
  },
  unitBadge: {
    backgroundColor: '#006dab',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  unitText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  optionCardSelected: {
    borderColor: '#006dab',
    backgroundColor: '#eff6ff',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#006dab',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#006dab',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#006dab',
    borderColor: '#006dab',
  },
  optionText: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
    flex: 1,
  },
  optionTextSelected: {
    color: '#006dab',
    fontWeight: '600',
  },
  scaleContainer: {
    alignItems: 'center',
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  scaleLabelText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  scaleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  scaleButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  scaleButtonSelected: {
    backgroundColor: '#006dab',
    borderColor: '#006dab',
  },
  scaleButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b',
  },
  scaleButtonTextSelected: {
    color: '#ffffff',
  },
  scaleValue: {
    marginTop: 16,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  navButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  prevButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#006dab',
    gap: 8,
  },
  navButtonDisabled: {
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  prevButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#006dab',
  },
  navButtonTextDisabled: {
    color: '#94a3b8',
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
