import {
    getNextPosition,
    getPreviousPosition,
    getQuestionByPosition,
    getSectionSummary,
    parseQuestionnaire
} from '@/data/questionnaireParser';
import { questionnaireService } from '@/services/firestore.service';
import { QuestionnaireProgress as FirestoreQuestionnaireProgress, QuestionnaireAnswer, QuestionnaireLanguage } from '@/types/firebase.types';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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

export default function QuestionnaireScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const scrollViewRef = useRef<ScrollView>(null);

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [showLanguageSelector, setShowLanguageSelector] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<QuestionnaireLanguage | null>(null);
  const [existingProgress, setExistingProgress] = useState<FirestoreQuestionnaireProgress | null>(null);
  const [currentPosition, setCurrentPosition] = useState({ partIndex: 0, sectionIndex: 0, questionIndex: 0 });
  const [answers, setAnswers] = useState<Record<string, QuestionnaireAnswer>>({});
  const [currentAnswer, setCurrentAnswer] = useState<string | string[]>('');
  const [conditionalAnswer, setConditionalAnswer] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSectionOverview, setShowSectionOverview] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'scroll'>('card');
  
  // User data from AsyncStorage
  const [coupleId, setCoupleId] = useState<string>('');
  const [gender, setGender] = useState<'male' | 'female'>('female');

  // Toast state
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const toastAnim = useRef(new Animated.Value(-100)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const isMobile = screenWidth < 768;

  // Load user data from AsyncStorage on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedCoupleId = await AsyncStorage.getItem('coupleId');
        const storedGender = await AsyncStorage.getItem('userGender');
        
        if (storedCoupleId) {
          setCoupleId(storedCoupleId);
        }
        if (storedGender) {
          setGender(storedGender as 'male' | 'female');
        }
      } catch (error) {
        console.error('Error loading user data from AsyncStorage:', error);
      }
    };
    
    loadUserData();
  }, []);

  // Load existing progress when coupleId and gender are available
  useEffect(() => {
    if (coupleId && gender) {
      loadProgress();
    }
  }, [coupleId, gender]);

  const loadProgress = async () => {
    if (!coupleId || !gender) {
      setIsLoading(false);
      return;
    }

    try {
      const progress = await questionnaireService.getProgress(coupleId, gender);
      if (progress) {
        setExistingProgress(progress);
        
        // If completed, redirect to profile
        if (progress.isComplete) {
          showToast('Questionnaire already completed!', 'success');
          setTimeout(() => router.replace('/user/profile'), 1500);
          return;
        }

        // Resume from saved position
        setSelectedLanguage(progress.language);
        setCurrentPosition(progress.currentPosition);
        setAnswers(progress.answers);
        setShowLanguageSelector(false);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading progress:', error);
      setIsLoading(false);
    }
  };

  // Get current question data
  const currentQuestionData = useMemo(() => {
    if (!selectedLanguage) return null;
    return getQuestionByPosition(
      selectedLanguage,
      gender,
      currentPosition.partIndex,
      currentPosition.sectionIndex,
      currentPosition.questionIndex
    );
  }, [selectedLanguage, gender, currentPosition]);

  // Get section summary
  const sectionSummary = useMemo(() => {
    if (!selectedLanguage) return [];
    return getSectionSummary(selectedLanguage, gender);
  }, [selectedLanguage, gender]);

  // Calculate overall progress
  const progressStats = useMemo(() => {
    if (!selectedLanguage) return { answered: 0, total: 0, percent: 0 };
    const parsed = parseQuestionnaire(selectedLanguage, gender);
    const answered = Object.keys(answers).length;
    const total = parsed.totalQuestions;
    return {
      answered,
      total,
      percent: Math.round((answered / total) * 100),
    };
  }, [selectedLanguage, gender, answers]);

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

  // Handle language selection
  const handleLanguageSelect = async (language: QuestionnaireLanguage) => {
    // Validate coupleId is available
    if (!coupleId) {
      showToast(
        language === 'english' 
          ? 'Please login to start the questionnaire' 
          : 'கேள்வித்தாளைத் தொடங்க உள்நுழையவும்',
        'error'
      );
      router.replace('/login');
      return;
    }
    
    // Check if there's existing progress with a different language
    if (existingProgress && existingProgress.language !== language) {
      Alert.alert(
        language === 'english' ? 'Change Language?' : 'மொழி மாற்றவா?',
        language === 'english'
          ? 'Your existing progress will be lost if you change the language. Do you want to continue?'
          : 'மொழியை மாற்றினால் உங்கள் தற்போதைய முன்னேற்றம் இழக்கப்படும். தொடர விரும்புகிறீர்களா?',
        [
          {
            text: language === 'english' ? 'Cancel' : 'ரத்து செய்',
            style: 'cancel',
          },
          {
            text: language === 'english' ? 'Continue' : 'தொடர்',
            style: 'destructive',
            onPress: async () => {
              await questionnaireService.resetQuestionnaire(coupleId, gender);
              startNewQuestionnaire(language);
            },
          },
        ]
      );
    } else if (existingProgress && existingProgress.language === language) {
      // Resume with same language
      setSelectedLanguage(language);
      setShowLanguageSelector(false);
    } else {
      // Start fresh
      startNewQuestionnaire(language);
    }
  };

  const startNewQuestionnaire = async (language: QuestionnaireLanguage) => {
    // Double-check coupleId is available
    if (!coupleId) {
      showToast('Session expired. Please login again.', 'error');
      router.replace('/login');
      return;
    }
    
    try {
      setIsLoading(true);
      await questionnaireService.startQuestionnaire(coupleId, gender, language);
      setSelectedLanguage(language);
      setCurrentPosition({ partIndex: 0, sectionIndex: 0, questionIndex: 0 });
      setAnswers({});
      setShowLanguageSelector(false);
      setIsLoading(false);
    } catch (error) {
      console.error('Error starting questionnaire:', error);
      showToast('Failed to start questionnaire', 'error');
      setIsLoading(false);
    }
  };

  // Handle answer selection for MCQ
  const handleMCQSelect = (option: string) => {
    setCurrentAnswer(option);
  };

  // Handle multiple selection (for questions that might need it)
  const handleMultiSelect = (option: string) => {
    const current = Array.isArray(currentAnswer) ? currentAnswer : [];
    if (current.includes(option)) {
      setCurrentAnswer(current.filter((o) => o !== option));
    } else {
      setCurrentAnswer([...current, option]);
    }
  };
  
  // Detect if current question is multi-select
  // Multi-select questions: exposure at work, food habits (with processed food option), 
  // psychological symptoms, type of exercise
  const isMultiSelectQuestion = useMemo(() => {
    if (!currentQuestionData?.question) return false;
    const q = currentQuestionData.question.question?.toLowerCase() || '';
    const qNum = currentQuestionData.question.number;
    
    // Men Q8 (work exposure), Men Q9 (exercise type)
    // Women Q5 (psychological symptoms), Women Q18 (exercise type)
    const multiSelectKeywords = [
      'exposed to any of the following',
      'psychological complaints',
      'type of physical exercises',
      'type of exercise performed',
      'which are suitable',
    ];
    
    return multiSelectKeywords.some(keyword => q.includes(keyword)) ||
           // Tamil equivalents
           q.includes('எந்த வகையான உடற்பயிற்சி') ||
           q.includes('கீழ்க்காணும்') ||
           q.includes('மன உபாதைகள்');
  }, [currentQuestionData]);

  // Handle text input change
  const handleTextInput = (text: string) => {
    setCurrentAnswer(text);
  };

  // Save current answer and move to next
  const handleNext = async () => {
    if (!currentQuestionData || !selectedLanguage) return;

    // Validate answer
    if (!currentAnswer || (Array.isArray(currentAnswer) && currentAnswer.length === 0)) {
      showToast(
        selectedLanguage === 'english'
          ? 'Please answer this question'
          : 'தயவுசெய்து இந்த கேள்விக்கு பதிலளிக்கவும்',
        'error'
      );
      return;
    }

    setIsSaving(true);

    try {
      // Create answer object - don't include conditionalAnswer if empty (Firestore doesn't accept undefined)
      const answer: QuestionnaireAnswer = {
        questionId: currentQuestionData.questionId,
        partId: currentQuestionData.partId,
        sectionId: currentQuestionData.sectionId,
        questionNumber: currentQuestionData.question?.number || '',
        questionText: currentQuestionData.question?.question || '',
        answer: currentAnswer,
        answeredAt: Timestamp.now(),
        ...(conditionalAnswer ? { conditionalAnswer } : {}),
      };

      // Save to Firestore
      await questionnaireService.saveAnswer(coupleId, gender, answer);

      // Update local state
      setAnswers((prev) => ({ ...prev, [currentQuestionData.questionId]: answer }));

      // Check if last question
      if (currentQuestionData.isLastQuestion) {
        await questionnaireService.completeQuestionnaire(coupleId, gender);
        showToast(
          selectedLanguage === 'english'
            ? 'Questionnaire completed!'
            : 'கேள்வித்தாள் முடிந்தது!',
          'success'
        );
        setTimeout(() => router.replace('/user/home'), 1500);
        return;
      }

      // Move to next question
      const nextPos = getNextPosition(
        selectedLanguage,
        gender,
        currentPosition.partIndex,
        currentPosition.sectionIndex,
        currentPosition.questionIndex
      );

      if (nextPos) {
        await questionnaireService.updatePosition(coupleId, gender, nextPos);
        animateTransition(() => {
          setCurrentPosition(nextPos);
          setCurrentAnswer('');
          setConditionalAnswer('');
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        });
      }
    } catch (error) {
      console.error('Error saving answer:', error);
      showToast('Failed to save answer', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Go to previous question
  const handlePrevious = () => {
    if (!selectedLanguage) return;

    const prevPos = getPreviousPosition(
      selectedLanguage,
      gender,
      currentPosition.partIndex,
      currentPosition.sectionIndex,
      currentPosition.questionIndex
    );

    if (prevPos) {
      animateTransition(() => {
        setCurrentPosition(prevPos);
        // Load previous answer if exists
        const prevQuestionData = getQuestionByPosition(
          selectedLanguage,
          gender,
          prevPos.partIndex,
          prevPos.sectionIndex,
          prevPos.questionIndex
        );
        if (prevQuestionData && answers[prevQuestionData.questionId]) {
          setCurrentAnswer(answers[prevQuestionData.questionId].answer);
          setConditionalAnswer(answers[prevQuestionData.questionId].conditionalAnswer || '');
        } else {
          setCurrentAnswer('');
          setConditionalAnswer('');
        }
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      });
    }
  };

  // Save and exit
  const handleSaveAndExit = async () => {
    await questionnaireService.updatePosition(coupleId, gender, currentPosition);
    showToast(
      selectedLanguage === 'english'
        ? 'Progress saved! You can resume later.'
        : 'முன்னேற்றம் சேமிக்கப்பட்டது! பின்னர் தொடரலாம்.',
      'success'
    );
    setTimeout(() => router.replace('/user/home'), 1500);
  };

  // Jump to section
  const handleJumpToSection = (startPosition: { partIndex: number; sectionIndex: number; questionIndex: number }) => {
    setCurrentPosition(startPosition);
    setShowSectionOverview(false);
    setCurrentAnswer('');
    setConditionalAnswer('');
  };

  // Load answer when question changes
  useEffect(() => {
    if (currentQuestionData && answers[currentQuestionData.questionId]) {
      setCurrentAnswer(answers[currentQuestionData.questionId].answer);
      setConditionalAnswer(answers[currentQuestionData.questionId].conditionalAnswer || '');
    } else {
      setCurrentAnswer('');
      setConditionalAnswer('');
    }
  }, [currentQuestionData?.questionId]);

  // Render loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#006dab" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Render language selector
  if (showLanguageSelector) {
    return (
      <View style={styles.languageSelectorContainer}>
        <View style={styles.languageCard}>
          <Text style={styles.languageTitle}>Choose Your Language</Text>
          <Text style={styles.languageSubtitle}>மொழியைத் தேர்ந்தெடுக்கவும்</Text>

          {existingProgress && (
            <View style={styles.existingProgressBanner}>
              <Ionicons name="information-circle" size={20} color="#f59e0b" />
              <Text style={styles.existingProgressText}>
                You have existing progress ({existingProgress.progress.percentComplete}% complete) in{' '}
                {existingProgress.language === 'english' ? 'English' : 'Tamil'}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.languageButton,
              existingProgress?.language === 'english' && styles.languageButtonActive,
            ]}
            onPress={() => handleLanguageSelect('english')}
          >
            <Text style={styles.languageButtonText}>English</Text>
            {existingProgress?.language === 'english' && (
              <Text style={styles.resumeText}>Resume →</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.languageButton,
              existingProgress?.language === 'tamil' && styles.languageButtonActive,
            ]}
            onPress={() => handleLanguageSelect('tamil')}
          >
            <Text style={styles.languageButtonText}>தமிழ்</Text>
            {existingProgress?.language === 'tamil' && (
              <Text style={styles.resumeText}>தொடர் →</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelButtonText}>Cancel / ரத்து செய்</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Render section overview - showing questions and progress
  if (showSectionOverview) {
    return (
      <View style={styles.container}>
        <View style={styles.overviewHeader}>
          <TouchableOpacity onPress={() => setShowSectionOverview(false)} style={styles.overviewBackBtn}>
            <Ionicons name="close" size={24} color="#0f172a" />
          </TouchableOpacity>
          <View style={styles.overviewTitleContainer}>
            <Text style={styles.overviewTitle}>
              {selectedLanguage === 'english' ? 'Your Progress' : 'உங்கள் முன்னேற்றம்'}
            </Text>
            <Text style={styles.overviewSubtitle}>
              {progressStats.answered} / {progressStats.total} {selectedLanguage === 'english' ? 'answered' : 'பதில்'}
            </Text>
          </View>
          <View style={styles.overviewProgressCircle}>
            <Text style={styles.overviewProgressPercent}>{progressStats.percent}%</Text>
          </View>
        </View>

        <ScrollView 
          style={styles.overviewContent}
          contentContainerStyle={styles.overviewContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {sectionSummary.map((section, sectionIndex) => {
            // Count answered questions in this section
            const sectionAnswerKeys = Object.keys(answers).filter((id) =>
              id.includes(section.sectionId)
            );
            const answeredCount = sectionAnswerKeys.length;
            const isComplete = answeredCount === section.questionCount;
            const progress = section.questionCount > 0 ? (answeredCount / section.questionCount) * 100 : 0;

            return (
              <View key={`${section.partId}_${section.sectionId}`} style={styles.overviewSectionCard}>
                <View style={styles.overviewSectionHeader}>
                  <View style={[styles.overviewSectionIcon, isComplete && styles.overviewSectionIconComplete]}>
                    {isComplete ? (
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    ) : (
                      <Text style={styles.overviewSectionNum}>{sectionIndex + 1}</Text>
                    )}
                  </View>
                  <View style={styles.overviewSectionInfo}>
                    <Text style={styles.overviewSectionTitle}>{section.sectionTitle}</Text>
                    <View style={styles.overviewSectionProgressBar}>
                      <View style={[styles.overviewSectionProgressFill, { width: `${progress}%` }]} />
                    </View>
                  </View>
                  <Text style={[styles.overviewSectionCount, isComplete && { color: '#98be4e' }]}>
                    {answeredCount}/{section.questionCount}
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={styles.overviewSectionButton}
                  onPress={() => handleJumpToSection(section.startPosition)}
                >
                  <Text style={styles.overviewSectionButtonText}>
                    {isComplete 
                      ? (selectedLanguage === 'english' ? 'Review Answers' : 'பதில்களை மதிப்பாய்வு செய்') 
                      : answeredCount > 0 
                        ? (selectedLanguage === 'english' ? 'Continue' : 'தொடர்')
                        : (selectedLanguage === 'english' ? 'Start Section' : 'பிரிவைத் தொடங்கு')}
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="#006dab" />
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
        
        {/* Continue button at bottom */}
        <View style={styles.overviewFooter}>
          <TouchableOpacity 
            style={styles.overviewContinueBtn}
            onPress={() => setShowSectionOverview(false)}
          >
            <Text style={styles.overviewContinueBtnText}>
              {selectedLanguage === 'english' ? 'Continue Questionnaire' : 'கேள்வித்தாளைத் தொடரவும்'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!currentQuestionData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Unable to load question</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadProgress}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { question, partTitle, sectionTitle, isFirstQuestion, isLastQuestion, currentInSection, totalInSection } =
    currentQuestionData;

  return (
    <View style={styles.container}>
      {/* Toast */}
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

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleSaveAndExit} style={styles.saveExitButton}>
            <Ionicons name="close" size={20} color="#64748b" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progressStats.percent}%` }]} />
              </View>
            </View>
            <Text style={styles.progressText}>
              {progressStats.answered}/{progressStats.total}
            </Text>
          </View>

          <TouchableOpacity onPress={() => setShowSectionOverview(true)} style={styles.overviewButton}>
            <Ionicons name="menu" size={22} color="#006dab" />
          </TouchableOpacity>
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
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{sectionTitle}</Text>
              </View>
              <View style={styles.questionCounter}>
                <Text style={styles.questionCounterText}>
                  {selectedLanguage === 'english'
                    ? `Question ${currentInSection} of ${totalInSection}`
                    : `கேள்வி ${currentInSection} / ${totalInSection}`}
                </Text>
              </View>
            </Animated.View>

            {/* Question */}
            {question && (
            <Animated.View style={[styles.questionContainer, { opacity: fadeAnim }]}>
              <View style={styles.questionNumberBadge}>
                <Text style={styles.questionNumber}>{question.number}</Text>
              </View>
              <Text style={styles.questionText}>{question.question}</Text>

              <View style={styles.answerContainer}>
                {question.type === 'fillup' ? (
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.textInput}
                      placeholder={
                        selectedLanguage === 'english' ? 'Enter your answer' : 'உங்கள் பதிலை உள்ளிடவும்'
                      }
                      placeholderTextColor="#94a3b8"
                      value={typeof currentAnswer === 'string' ? currentAnswer : ''}
                      onChangeText={handleTextInput}
                      multiline
                    />
                  </View>
                ) : question.type === 'mcq' && question.options ? (
                  <View style={styles.optionsContainer}>
                    {/* Multi-select hint */}
                    {isMultiSelectQuestion && (
                      <View style={styles.multiSelectHint}>
                        <Ionicons name="checkbox-outline" size={16} color="#006dab" />
                        <Text style={styles.multiSelectHintText}>
                          {selectedLanguage === 'english' 
                            ? 'Select all that apply' 
                            : 'பொருந்தும் அனைத்தையும் தேர்ந்தெடுக்கவும்'}
                        </Text>
                      </View>
                    )}
                    {question.options.map((option, index) => {
                      const isSelected = isMultiSelectQuestion 
                        ? (Array.isArray(currentAnswer) && currentAnswer.includes(option))
                        : currentAnswer === option;
                      
                      return (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.optionCard,
                            isSelected && styles.optionCardSelected,
                          ]}
                          onPress={() => isMultiSelectQuestion ? handleMultiSelect(option) : handleMCQSelect(option)}
                          activeOpacity={0.7}
                        >
                          {isMultiSelectQuestion ? (
                            // Checkbox for multi-select
                            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                              {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                            </View>
                          ) : (
                            // Radio for single select
                            <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                              {isSelected && <View style={styles.radioInner} />}
                            </View>
                          )}
                          <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                            {option}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : null}

                {/* Conditional text field */}
                {question.conditional_textfield && currentAnswer && (
                  <View style={styles.conditionalContainer}>
                    <Text style={styles.conditionalLabel}>{question.conditional_textfield}</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.textInput}
                        placeholder={
                          selectedLanguage === 'english' ? 'Please specify' : 'குறிப்பிடவும்'
                        }
                        placeholderTextColor="#94a3b8"
                        value={conditionalAnswer}
                        onChangeText={setConditionalAnswer}
                      />
                    </View>
                  </View>
                )}
              </View>
            </Animated.View>
            )}

            {/* Navigation Buttons */}
            <View style={styles.navigationContainer}>
              <TouchableOpacity
                style={[styles.navButton, styles.prevButton, isFirstQuestion && styles.navButtonDisabled]}
                onPress={handlePrevious}
                disabled={isFirstQuestion}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="arrow-back"
                  size={20}
                  color={isFirstQuestion ? '#94a3b8' : '#006dab'}
                />
                <Text style={[styles.prevButtonText, isFirstQuestion && styles.navButtonTextDisabled]}>
                  {selectedLanguage === 'english' ? 'Previous' : 'முந்தைய'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navButton}
                onPress={handleNext}
                disabled={isSaving}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#006dab', '#005a8f']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.nextButtonGradient}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.nextButtonText}>
                        {isLastQuestion
                          ? selectedLanguage === 'english'
                            ? 'Complete'
                            : 'முடி'
                          : selectedLanguage === 'english'
                          ? 'Next'
                          : 'அடுத்து'}
                      </Text>
                      <Ionicons
                        name={isLastQuestion ? 'checkmark' : 'arrow-forward'}
                        size={20}
                        color="#ffffff"
                      />
                    </>
                  )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#006dab',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Language Selector
  languageSelectorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  languageCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  languageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 4,
  },
  languageSubtitle: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  existingProgressBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    gap: 10,
  },
  existingProgressText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
  },
  languageButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageButtonActive: {
    borderColor: '#006dab',
    backgroundColor: '#eff6ff',
  },
  languageButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  resumeText: {
    fontSize: 14,
    color: '#006dab',
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },

  // Toast
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

  // Header
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingTop: isWeb ? 16 : 50,
    paddingBottom: 12,
    paddingHorizontal: isWeb ? 24 : 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    gap: 12,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  saveExitButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  saveExitText: {
    color: '#98be4e',
    fontSize: 13,
    fontWeight: '600',
  },
  overviewButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#eff6ff',
  },
  progressContainer: {
    flex: 1,
    maxWidth: 200,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#98be4e',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    marginLeft: 12,
  },

  // Section Overview (new improved)
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingTop: isWeb ? 20 : 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 16,
  },
  overviewBackBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  overviewTitleContainer: {
    flex: 1,
  },
  overviewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  overviewSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  overviewProgressCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#006dab',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewProgressPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  overviewContent: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  overviewContentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  overviewSectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  overviewSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  overviewSectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewSectionIconComplete: {
    backgroundColor: '#98be4e',
  },
  overviewSectionNum: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  overviewSectionInfo: {
    flex: 1,
  },
  overviewSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 6,
  },
  overviewSectionProgressBar: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  overviewSectionProgressFill: {
    height: '100%',
    backgroundColor: '#98be4e',
    borderRadius: 2,
  },
  overviewSectionCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  overviewSectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    gap: 6,
  },
  overviewSectionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#006dab',
  },
  overviewFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  overviewContinueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#006dab',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  overviewContinueBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },

  // Section List (old - keeping for compatibility)
  sectionListContainer: {
    flex: 1,
    padding: 20,
  },
  sectionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  sectionStatusIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionStatusIconComplete: {
    backgroundColor: '#98be4e',
  },
  sectionStatusNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  sectionCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  sectionCardSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },

  // Content
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

  // Section Header
  sectionHeader: {
    marginBottom: 24,
  },
  sectionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginBottom: 12,
  },
  sectionBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#006dab',
  },
  questionCounter: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  questionCounterText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },

  // Question
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
  questionNumberBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#006dab',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  questionNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  questionText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 24,
    lineHeight: 28,
  },
  answerContainer: {
    marginTop: 8,
  },

  // Input
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
    minHeight: 56,
  },

  // Options
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
  
  // Multi-select styles
  multiSelectHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  multiSelectHintText: {
    fontSize: 13,
    color: '#006dab',
    fontWeight: '500',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxSelected: {
    borderColor: '#006dab',
    backgroundColor: '#006dab',
  },

  // Conditional
  conditionalContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  conditionalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 10,
  },

  // Navigation
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
