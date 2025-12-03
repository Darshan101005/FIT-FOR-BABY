import {
    generateQuestionId,
    getNextPosition,
    getPreviousPosition,
    getQuestionByPosition,
    parseQuestionnaire
} from '@/data/questionnaireParser';
import { questionnaireService } from '@/services/firestore.service';
import { QuestionnaireProgress as FirestoreQuestionnaireProgress, QuestionnaireAnswer, QuestionnaireLanguage, QuestionnaireQuestion } from '@/types/firebase.types';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    KeyboardAvoidingView,
    Modal,
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
  const { viewOnly } = useLocalSearchParams<{ viewOnly?: string }>();
  const isViewOnly = viewOnly === 'true';
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
  const [viewMode, setViewMode] = useState<'card' | 'scroll'>('card');
  const [sectionFormState, setSectionFormState] = useState<Record<string, { answer: string | string[]; conditional?: string }>>({});
  const [showLangSwitchModal, setShowLangSwitchModal] = useState(false);
  const [showLangConfirmModal, setShowLangConfirmModal] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState<QuestionnaireLanguage | null>(null);
  
  // User data from AsyncStorage
  const [coupleId, setCoupleId] = useState<string>('');
  const [gender, setGender] = useState<'male' | 'female'>('female');

  // Toast state
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const toastAnim = useRef(new Animated.Value(-100)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const isMobile = screenWidth < 768;

  const isQuestionMultiSelect = (question?: QuestionnaireQuestion | null) => {
    if (!question?.question) return false;
    const text = question.question.toLowerCase();
    const keywords = [
      'type of physical exercises',
      'type of exercise',
      'psychological complaints',
      'exposed to any of the following',
      'choose which are suitable',
      'எந்த வகையான உடற்பயிற்சி',
      'மன உபாதைகள்',
      'பொருந்தும் அனைத்தையும்',
    ];
    return keywords.some((keyword) => text.includes(keyword));
  };

  // Helper function to determine if conditional textfield should be shown
  // This checks if the selected answer triggers the need for additional input
  const shouldShowConditionalField = (
    question: QuestionnaireQuestion | null,
    answer: string | string[]
  ): boolean => {
    if (!question?.conditional_textfield) return false;
    if (!answer || (Array.isArray(answer) && answer.length === 0)) return false;

    const qText = question.question?.toLowerCase() || '';
    const conditionalText = question.conditional_textfield.toLowerCase();
    const answerStr = Array.isArray(answer) ? answer.join(', ').toLowerCase() : answer.toLowerCase();

    // For Yes/No questions with "If yes" conditional
    if (conditionalText.includes('if yes') || conditionalText.includes('ஆம் எனில்')) {
      return answerStr === 'yes' || answerStr === 'ஆம்' || answerStr.includes('yes') || answerStr.includes('ஆம்');
    }

    // For food habits question - show if processed/junk food selected
    if (qText.includes('food habits') || qText.includes('உணவு பழக்க') || qText.includes('உணவுப் பழக்க')) {
      return answerStr.includes('processed') || answerStr.includes('junk') || 
             answerStr.includes('செயலாக்கப்பட்ட') || answerStr.includes('சுகாதாரமற்ற');
    }

    // For consanguinity question
    if (qText.includes('consanguinity') || qText.includes('உறவு முறைத் திருமணம்')) {
      // Check if user selected the "Yes" option which has the conditional text embedded
      return answerStr.includes('yes') || answerStr.includes('ஆம்') || answerStr.includes('degree');
    }

    // For co-morbidities 
    if (qText.includes('co-morbidities') || qText.includes('comorbidities') || qText.includes('பிற நோய்கள்')) {
      return answerStr === 'yes' || answerStr === 'ஆம்' || answerStr.includes('yes') || answerStr.includes('ஆம்');
    }

    // Default: don't show conditional for other cases unless it matches common "if" patterns
    return false;
  };

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
        
        // If in viewOnly mode, load and display the completed questionnaire
        if (isViewOnly && progress.isComplete) {
          setSelectedLanguage(progress.language);
          setCurrentPosition({ partIndex: 0, sectionIndex: 0, questionIndex: 0 });
          setAnswers(progress.answers);
          setShowLanguageSelector(false);
          setIsLoading(false);
          return;
        }
        
        // If completed and not viewOnly mode, redirect to profile
        if (progress.isComplete && !isViewOnly) {
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

  // Calculate overall progress
  const progressStats = useMemo(() => {
    if (!selectedLanguage) return { answered: 0, total: 0, percent: 0 };
    const parsed = parseQuestionnaire(selectedLanguage, gender);
    const answered = Object.keys(answers).length;
    const total = parsed.totalQuestions;
    const rawPercent = total === 0 ? 0 : Math.round((answered / total) * 100);
    const percent = Math.max(0, Math.min(100, rawPercent));
    return {
      answered,
      total,
      percent,
    };
  }, [selectedLanguage, gender, answers]);

  const sectionQuestions = useMemo(() => {
    if (!selectedLanguage) return [];
    const parsed = parseQuestionnaire(selectedLanguage, gender);
    const part = parsed.parts[currentPosition.partIndex];
    if (!part) return [];
    const section = part.sections[currentPosition.sectionIndex];
    if (!section) return [];
    return section.questions.map((question, index) => ({
      question,
      questionIndex: index,
      questionId: generateQuestionId(part.id, section.id, question.number),
      partId: part.id,
      sectionId: section.id,
      sectionTitle: section.title,
    }));
  }, [selectedLanguage, gender, currentPosition]);

  useEffect(() => {
    if (viewMode !== 'scroll') return;
    setSectionFormState((prev) => {
      const nextState: Record<string, { answer: string | string[]; conditional?: string }> = {};
      sectionQuestions.forEach(({ question, questionId }) => {
        const stored = answers[questionId];
        const isMulti = isQuestionMultiSelect(question);
        const fallback = isMulti ? [] : '';
        nextState[questionId] = {
          answer: prev[questionId]?.answer ?? stored?.answer ?? fallback,
          conditional: prev[questionId]?.conditional ?? stored?.conditionalAnswer ?? '',
        };
      });
      return nextState;
    });
  }, [viewMode, sectionQuestions, answers]);

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

  const updateSectionAnswer = (
    questionId: string,
    payload: Partial<{ answer: string | string[]; conditional: string }>
  ) => {
    setSectionFormState((prev) => ({
      ...prev,
      [questionId]: {
        answer: payload.answer !== undefined ? payload.answer : prev[questionId]?.answer ?? '',
        conditional: payload.conditional !== undefined ? payload.conditional : prev[questionId]?.conditional ?? '',
      },
    }));
  };

  const toggleSectionMulti = (questionId: string, option: string) => {
    const current = sectionFormState[questionId]?.answer;
    const list = Array.isArray(current) ? current : [];
    if (list.includes(option)) {
      updateSectionAnswer(questionId, { answer: list.filter((item) => item !== option) });
    } else {
      updateSectionAnswer(questionId, { answer: [...list, option] });
    }
  };

  const validateAnswerForQuestion = (
    question: QuestionnaireQuestion | null,
    answer: string | string[],
    conditional?: string
  ): { valid: boolean; message?: string } => {
    if (!question) {
      return { valid: false, message: 'Question unavailable' };
    }

    const qText = question.question?.toLowerCase() || '';

    if (question.type === 'fillup') {
      if (typeof answer !== 'string') {
        return { valid: false, message: 'Please provide a text response.' };
      }
      const trimmed = answer.trim();
      
      // Basic validation - just check it's not empty
      if (trimmed.length === 0) {
        return { valid: false, message: 'Please enter an answer.' };
      }

      // Smart validation based on question content
      // Age questions - allow reasonable adult ages (no strict limits)
      if (qText.includes('age') && !qText.includes('menarche') && !qText.includes('marriage')) {
        const ageValue = Number(trimmed);
        if (Number.isNaN(ageValue) || ageValue < 1 || ageValue > 120) {
          return { valid: false, message: 'Please enter a valid age.' };
        }
      }
      
      // Age at menarche - typically 8-18
      if (qText.includes('menarche') || qText.includes('முதல் மாதவிடாய')) {
        const ageValue = Number(trimmed);
        if (Number.isNaN(ageValue) || ageValue < 8 || ageValue > 20) {
          return { valid: false, message: 'Please enter a valid age at menarche (typically 8-20 years).' };
        }
      }

      // Coitus frequency - just needs to be a small positive number (1-20 per week is reasonable)
      if (qText.includes('coitus') || qText.includes('உடலுறவ')) {
        const freqValue = Number(trimmed);
        if (Number.isNaN(freqValue) || freqValue < 0 || freqValue > 50) {
          return { valid: false, message: 'Please enter a valid frequency.' };
        }
      }

      // Duration questions (menstruation, infertility, marriage) - allow reasonable ranges
      if ((qText.includes('duration') || qText.includes('காலம்')) && !qText.includes('exercise')) {
        const durationValue = Number(trimmed);
        // Just check it's a positive number, no strict upper limit
        if (!Number.isNaN(durationValue) && durationValue < 0) {
          return { valid: false, message: 'Please enter a valid duration.' };
        }
      }

      // Interval between cycles - typically 21-45 days
      if (qText.includes('interval') && qText.includes('cycle')) {
        const intervalValue = Number(trimmed);
        if (!Number.isNaN(intervalValue) && (intervalValue < 15 || intervalValue > 60)) {
          return { valid: false, message: 'Please enter a valid cycle interval (typically 15-60 days).' };
        }
      }

      // Distance questions - any positive number
      if (qText.includes('distance') || qText.includes('தொலைவு') || qText.includes('kms')) {
        const distValue = Number(trimmed);
        if (!Number.isNaN(distValue) && distValue < 0) {
          return { valid: false, message: 'Please enter a valid distance.' };
        }
      }

      // Income - any positive number
      if (qText.includes('income') || qText.includes('வருமானம்')) {
        const incomeValue = Number(trimmed);
        if (!Number.isNaN(incomeValue) && incomeValue < 0) {
          return { valid: false, message: 'Please enter a valid income amount.' };
        }
      }
    }

    if (question.type === 'mcq') {
      if (isQuestionMultiSelect(question)) {
        if (!Array.isArray(answer) || answer.length === 0) {
          return { valid: false, message: 'Select at least one option.' };
        }
      } else if (typeof answer !== 'string' || !answer) {
        return { valid: false, message: 'Select an option to continue.' };
      }
    }

    // Only require conditional answer if the answer triggers the conditional field
    if (shouldShowConditionalField(question, answer) && !conditional?.trim()) {
      return { valid: false, message: question.conditional_textfield || 'Please provide additional details.' };
    }

    return { valid: true };
  };
  
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

    const validation = validateAnswerForQuestion(currentQuestionData.question, currentAnswer, conditionalAnswer);
    if (!validation.valid) {
      showToast(validation.message || 'Please verify your answer', 'error');
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

  const handleSectionSubmit = async () => {
    if (viewMode !== 'scroll' || !selectedLanguage) return;
    if (!sectionQuestions.length) return;

    const answersToSave: Record<string, QuestionnaireAnswer> = {};

    for (const item of sectionQuestions) {
      const stored = sectionFormState[item.questionId] || {
        answer: answers[item.questionId]?.answer,
        conditional: answers[item.questionId]?.conditionalAnswer,
      };
      const answerValue = stored?.answer ?? (isQuestionMultiSelect(item.question) ? [] : '');
      const validation = validateAnswerForQuestion(item.question, answerValue, stored?.conditional);
      if (!validation.valid) {
        showToast(validation.message || 'Please complete all questions in this section.', 'error');
        return;
      }

      answersToSave[item.questionId] = {
        questionId: item.questionId,
        partId: item.partId,
        sectionId: item.sectionId,
        questionNumber: item.question.number || '',
        questionText: item.question.question || '',
        answer: answerValue,
        answeredAt: Timestamp.now(),
        ...(stored?.conditional ? { conditionalAnswer: stored.conditional } : {}),
      };
    }

    setIsSaving(true);
    try {
      for (const answer of Object.values(answersToSave)) {
        await questionnaireService.saveAnswer(coupleId, gender, answer);
      }

      setAnswers((prev) => ({ ...prev, ...answersToSave }));

      const lastQuestionIndex = sectionQuestions[sectionQuestions.length - 1].questionIndex;
      const nextPos = getNextPosition(
        selectedLanguage,
        gender,
        currentPosition.partIndex,
        currentPosition.sectionIndex,
        lastQuestionIndex
      );

      if (nextPos) {
        await questionnaireService.updatePosition(coupleId, gender, nextPos);
        setCurrentPosition(nextPos);
        showToast(
          selectedLanguage === 'english' ? 'Section saved!' : 'பிரிவு சேமிக்கப்பட்டது!',
          'success'
        );
      } else {
        await questionnaireService.completeQuestionnaire(coupleId, gender);
        showToast(
          selectedLanguage === 'english' ? 'Questionnaire completed!' : 'கேள்வித்தாள் முடிந்தது!',
          'success'
        );
        setTimeout(() => router.replace('/user/home'), 1500);
      }
    } catch (error) {
      console.error('Error saving section answers:', error);
      showToast(
        selectedLanguage === 'english'
          ? 'Unable to save section. Please try again.'
          : 'பிரிவை சேமிக்க முடியவில்லை. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.',
        'error'
      );
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

  // Save and exit - auto saves progress and navigates back
  const handleSaveAndExit = async () => {
    try {
      await questionnaireService.updatePosition(coupleId, gender, currentPosition);
      showToast(
        selectedLanguage === 'english'
          ? 'Progress saved!'
          : 'முன்னேற்றம் சேமிக்கப்பட்டது!',
        'success'
      );
      setTimeout(() => router.replace('/user/home'), 1000);
    } catch (error) {
      console.error('Error saving progress:', error);
      router.replace('/user/home');
    }
  };

  // Save progress without exiting
  const handleSaveProgress = async () => {
    try {
      await questionnaireService.updatePosition(coupleId, gender, currentPosition);
      showToast(
        selectedLanguage === 'english'
          ? 'Progress saved!'
          : 'முன்னேற்றம் சேமிக்கப்பட்டது!',
        'success'
      );
    } catch (error) {
      console.error('Error saving progress:', error);
      showToast(
        selectedLanguage === 'english'
          ? 'Failed to save progress'
          : 'சேமிக்க முடியவில்லை',
        'error'
      );
    }
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

  // Language switch modal (shown during questionnaire)
  const renderLangSwitchModal = () => (
    <Modal
      visible={showLangSwitchModal}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowLangSwitchModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.langModalContent}>
          <Text style={styles.langModalTitle}>Switch Language / மொழி மாற்றவும்</Text>
          <Text style={styles.langModalSubtitle}>Switching language will restart the questionnaire from the first question and delete previous answers. மொழியை மாற்றினால் கேள்வித்தாள் மீண்டும் முதல் கேள்வியிலிருந்து தொடங்கி, பழைய பதில்கள் அழிக்கப்படும்.</Text>

          <TouchableOpacity
            style={[styles.langOption, selectedLanguage === 'english' && styles.langOptionActive]}
            onPress={() => {
              setPendingLanguage('english');
              if (selectedLanguage !== 'english') setShowLangConfirmModal(true);
              else setShowLangSwitchModal(false);
            }}
          >
            <Text style={styles.langOptionText}>English</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.langOption, selectedLanguage === 'tamil' && styles.langOptionActive]}
            onPress={() => {
              setPendingLanguage('tamil');
              if (selectedLanguage !== 'tamil') setShowLangConfirmModal(true);
              else setShowLangSwitchModal(false);
            }}
          >
            <Text style={styles.langOptionText}>தமிழ்</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={() => setShowLangSwitchModal(false)}>
            <Text style={styles.cancelButtonText}>Cancel / ரத்து செய்</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Confirmation modal shown when switching to a different language
  const renderLangConfirmModal = () => (
    <Modal
      visible={showLangConfirmModal}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowLangConfirmModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.langConfirmContent}>
          <Text style={styles.langConfirmTitle}>Confirm Language Change</Text>
          <Text style={styles.langConfirmText}>
            English: Changing language will delete your previous answers and restart the questionnaire from the first question. Do you want to continue?
          </Text>
          <Text style={styles.langConfirmText}>
            தமிழ்: மொழியை மாற்றினால் உங்கள் முன் பதில்கள் அழிக்கப்படும் மற்றும் கேள்வித்தாள் முதல் கேள்வியிலிருந்து மீண்டும் தொடங்கப்படும். தொடரவா?
          </Text>

          <View style={styles.langConfirmActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowLangConfirmModal(false);
                setShowLangSwitchModal(false);
                setPendingLanguage(null);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel / ரத்து செய்</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={async () => {
                if (!pendingLanguage) return;
                setShowLangConfirmModal(false);
                setShowLangSwitchModal(false);
                // Reset stored progress and start fresh in chosen language
                try {
                  await questionnaireService.resetQuestionnaire(coupleId, gender);
                } catch (err) {
                  console.error('Error resetting questionnaire:', err);
                }
                // startNewQuestionnaire handles starting state and saving
                startNewQuestionnaire(pendingLanguage);
                setPendingLanguage(null);
              }}
            >
              <Text style={styles.confirmButtonText}>Continue / தொடர்</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

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
  const isCurrentMultiSelect = isQuestionMultiSelect(question);

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
          <TouchableOpacity onPress={isViewOnly ? () => router.back() : handleSaveAndExit} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#0f172a" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.progressContainer}>
              <Text style={styles.headerTitle}>
                {isViewOnly 
                  ? (selectedLanguage === 'english' ? 'Your Responses' : 'உங்கள் பதில்கள்')
                  : partTitle}
              </Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progressStats.percent}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {progressStats.answered}/{progressStats.total}{' '}
                {selectedLanguage === 'english' ? 'answered' : 'பதில்கள்'}
              </Text>
            </View>
          </View>

          {!isViewOnly && (
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleSaveProgress} style={styles.saveButton}>
                <Ionicons name="save-outline" size={20} color="#006dab" />
                <Text style={styles.saveButtonText}>
                  {selectedLanguage === 'english' ? 'Save' : 'சேமி'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowLangSwitchModal(true)} style={styles.languageSwitchBtn}>
                <Ionicons name="language" size={22} color="#006dab" />
              </TouchableOpacity>
            </View>
          )}
          {isViewOnly && (
            <View style={styles.headerActions}>
              <View style={[styles.viewOnlyBadge]}>
                <Ionicons name="eye-outline" size={16} color="#006dab" />
                <Text style={styles.viewOnlyBadgeText}>
                  {selectedLanguage === 'english' ? 'View Only' : 'படிக்க மட்டும்'}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
      {renderLangSwitchModal()}
      {renderLangConfirmModal()}

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
            <View style={styles.viewToggleContainer}>
              <TouchableOpacity
                style={[styles.viewToggleButton, viewMode === 'card' && styles.viewToggleButtonActive]}
                onPress={() => setViewMode('card')}
                activeOpacity={0.85}
              >
                <Ionicons name="albums-outline" size={16} color={viewMode === 'card' ? '#fff' : '#006dab'} />
                <Text style={[styles.viewToggleText, viewMode === 'card' && styles.viewToggleTextActive]}>
                  {selectedLanguage === 'english' ? 'Cards Mode' : 'கார்டு முறை'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.viewToggleButton, viewMode === 'scroll' && styles.viewToggleButtonActive]}
                onPress={() => setViewMode('scroll')}
                activeOpacity={0.85}
              >
                <Ionicons name="document-text-outline" size={16} color={viewMode === 'scroll' ? '#fff' : '#006dab'} />
                <Text style={[styles.viewToggleText, viewMode === 'scroll' && styles.viewToggleTextActive]}>
                  {selectedLanguage === 'english' ? 'Form Mode' : 'படிவ முறை'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Section Header */}
            <Animated.View style={[styles.sectionHeader, { opacity: fadeAnim }]}>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{sectionTitle}</Text>
              </View>
              <View style={styles.questionCounter}>
                <Text style={styles.questionCounterText}>
                  {viewMode === 'card'
                    ? selectedLanguage === 'english'
                      ? `Question ${currentInSection} of ${totalInSection}`
                      : `கேள்வி ${currentInSection} / ${totalInSection}`
                    : `${totalInSection} ${selectedLanguage === 'english' ? 'questions in this section' : 'கேள்விகள்'}`}
                </Text>
              </View>
            </Animated.View>

            {viewMode === 'card' ? (
              <>
                <Animated.View style={[styles.questionWrapper, { opacity: fadeAnim }]}>
                  <LinearGradient colors={['#eef2ff', '#fefefe']} style={styles.questionGradient}>
                    <View style={styles.questionContainer}>
                      <View style={styles.questionNumberBadge}>
                        <Text style={styles.questionNumber}>{question?.number}</Text>
                      </View>
                      <Text style={styles.questionText}>{question?.question}</Text>

                      <View style={styles.answerContainer}>
                        {question?.type === 'fillup' ? (
                          <View style={styles.inputWrapper}>
                            <TextInput
                              style={[styles.textInput, isViewOnly && styles.textInputDisabled]}
                              placeholder={
                                selectedLanguage === 'english' ? 'Enter your answer' : 'உங்கள் பதிலை உள்ளிடவும்'
                              }
                              placeholderTextColor="#94a3b8"
                              value={typeof currentAnswer === 'string' ? currentAnswer : ''}
                              onChangeText={handleTextInput}
                              multiline
                              editable={!isViewOnly}
                            />
                          </View>
                        ) : question?.type === 'mcq' && question?.options ? (
                          <View style={styles.optionsContainer}>
                            {isCurrentMultiSelect && !isViewOnly && (
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
                              const isSelected = isCurrentMultiSelect
                                ? Array.isArray(currentAnswer) && currentAnswer.includes(option)
                                : currentAnswer === option;
                              return (
                                <TouchableOpacity
                                  key={`${option}-${index}`}
                                  style={[styles.optionCard, isSelected && styles.optionCardSelected, isViewOnly && styles.optionCardViewOnly]}
                                  onPress={() =>
                                    !isViewOnly && (isCurrentMultiSelect ? handleMultiSelect(option) : handleMCQSelect(option))
                                  }
                                  activeOpacity={isViewOnly ? 1 : 0.8}
                                  disabled={isViewOnly}
                                >
                                  {isCurrentMultiSelect ? (
                                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                                      {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                                    </View>
                                  ) : (
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

                        {shouldShowConditionalField(question, currentAnswer) && (
                          <View style={styles.conditionalContainer}>
                            <Text style={styles.conditionalLabel}>{question?.conditional_textfield}</Text>
                            <View style={styles.inputWrapper}>
                              <TextInput
                                style={[styles.textInput, isViewOnly && styles.textInputDisabled]}
                                placeholder={selectedLanguage === 'english' ? 'Please specify' : 'குறிப்பிடவும்'}
                                placeholderTextColor="#94a3b8"
                                value={conditionalAnswer}
                                onChangeText={setConditionalAnswer}
                                editable={!isViewOnly}
                              />
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  </LinearGradient>
                </Animated.View>

                <View style={styles.navigationContainer}>
                  <TouchableOpacity
                    style={[styles.navButton, styles.prevButton, isFirstQuestion && styles.navButtonDisabled]}
                    onPress={handlePrevious}
                    disabled={isFirstQuestion}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="arrow-back" size={20} color={isFirstQuestion ? '#94a3b8' : '#006dab'} />
                    <Text style={[styles.prevButtonText, isFirstQuestion && styles.navButtonTextDisabled]}>
                      {selectedLanguage === 'english' ? 'Previous' : 'முந்தைய'}
                    </Text>
                  </TouchableOpacity>

                  {isViewOnly ? (
                    // View-only navigation - just Previous/Next without saving
                    <TouchableOpacity
                      style={[styles.navButton, isLastQuestion && styles.navButtonDisabled]}
                      onPress={() => {
                        if (!isLastQuestion && selectedLanguage) {
                          const nextPos = getNextPosition(
                            selectedLanguage,
                            gender,
                            currentPosition.partIndex,
                            currentPosition.sectionIndex,
                            currentPosition.questionIndex
                          );
                          if (nextPos) {
                            animateTransition(() => {
                              setCurrentPosition(nextPos);
                              // Load the answer for next question
                              const nextQuestionData = getQuestionByPosition(
                                selectedLanguage,
                                gender,
                                nextPos.partIndex,
                                nextPos.sectionIndex,
                                nextPos.questionIndex
                              );
                              if (nextQuestionData && answers[nextQuestionData.questionId]) {
                                setCurrentAnswer(answers[nextQuestionData.questionId].answer);
                                setConditionalAnswer(answers[nextQuestionData.questionId].conditionalAnswer || '');
                              } else {
                                setCurrentAnswer('');
                                setConditionalAnswer('');
                              }
                            });
                          }
                        }
                      }}
                      disabled={isLastQuestion}
                      activeOpacity={0.85}
                    >
                      <LinearGradient 
                        colors={isLastQuestion ? ['#94a3b8', '#94a3b8'] : ['#006dab', '#005a8f']} 
                        start={{ x: 0, y: 0 }} 
                        end={{ x: 1, y: 0 }} 
                        style={styles.nextButtonGradient}
                      >
                        <Text style={styles.nextButtonText}>
                          {selectedLanguage === 'english' ? 'Next' : 'அடுத்து'}
                        </Text>
                        <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                      </LinearGradient>
                    </TouchableOpacity>
                  ) : (
                    // Normal edit mode navigation
                    <TouchableOpacity
                      style={styles.navButton}
                      onPress={handleNext}
                      disabled={isSaving}
                      activeOpacity={0.85}
                    >
                      <LinearGradient colors={['#006dab', '#005a8f']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextButtonGradient}>
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
                            <Ionicons name={isLastQuestion ? 'checkmark' : 'arrow-forward'} size={20} color="#ffffff" />
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            ) : (
              <Animated.View style={[styles.sectionFormContainer, { opacity: fadeAnim }]}>
                <Text style={styles.sectionFormTitle}>{sectionTitle}</Text>
                <Text style={styles.sectionFormSubtitle}>
                  {sectionQuestions.length} {selectedLanguage === 'english' ? 'questions' : 'கேள்விகள்'}
                </Text>

                {sectionQuestions.map(({ question: sectionQuestion, questionId }) => {
                  const isMulti = isQuestionMultiSelect(sectionQuestion);
                  const entry = sectionFormState[questionId] || {
                    answer: answers[questionId]?.answer ?? (isMulti ? [] : ''),
                    conditional: answers[questionId]?.conditionalAnswer ?? '',
                  };
                  const value = isMulti
                    ? Array.isArray(entry.answer)
                      ? entry.answer
                      : entry.answer
                      ? [String(entry.answer)]
                      : []
                    : typeof entry.answer === 'string'
                    ? entry.answer
                    : '';
                  return (
                    <View key={questionId} style={styles.sectionQuestionCard}>
                      <Text style={styles.sectionQuestionLabel}>
                        {sectionQuestion.number}. {sectionQuestion.question}
                      </Text>

                      {sectionQuestion.type === 'fillup' ? (
                        <View style={styles.inputWrapper}>
                          <TextInput
                            style={styles.textInput}
                            placeholder={selectedLanguage === 'english' ? 'Enter your answer' : 'உங்கள் பதிலை உள்ளிடவும்'}
                            placeholderTextColor="#94a3b8"
                            value={typeof value === 'string' ? value : ''}
                            onChangeText={(text) => updateSectionAnswer(questionId, { answer: text })}
                            multiline
                          />
                        </View>
                      ) : sectionQuestion.type === 'mcq' && sectionQuestion.options ? (
                        <View style={styles.optionsContainer}>
                          {isMulti && (
                            <View style={styles.multiSelectHint}>
                              <Ionicons name="checkbox-outline" size={16} color="#006dab" />
                              <Text style={styles.multiSelectHintText}>
                                {selectedLanguage === 'english'
                                  ? 'Select all that apply'
                                  : 'பொருந்தும் அனைத்தையும் தேர்ந்தெடுக்கவும்'}
                              </Text>
                            </View>
                          )}
                          {sectionQuestion.options.map((option) => {
                            const isSelected = isMulti
                              ? Array.isArray(value) && value.includes(option)
                              : value === option;
                            return (
                              <TouchableOpacity
                                key={`${questionId}-${option}`}
                                style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                                onPress={() =>
                                  isMulti
                                    ? toggleSectionMulti(questionId, option)
                                    : updateSectionAnswer(questionId, { answer: option })
                                }
                                activeOpacity={0.85}
                              >
                                {isMulti ? (
                                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                                    {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                                  </View>
                                ) : (
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

                      {shouldShowConditionalField(sectionQuestion, value) && (
                        <View style={styles.conditionalContainer}>
                          <Text style={styles.conditionalLabel}>{sectionQuestion.conditional_textfield}</Text>
                          <View style={styles.inputWrapper}>
                            <TextInput
                              style={styles.textInput}
                              placeholder={selectedLanguage === 'english' ? 'Please specify' : 'குறிப்பிடவும்'}
                              placeholderTextColor="#94a3b8"
                              value={entry.conditional || ''}
                              onChangeText={(text) => updateSectionAnswer(questionId, { conditional: text })}
                            />
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}

                <TouchableOpacity
                  style={[styles.sectionSubmitButton, isSaving && styles.sectionSubmitButtonDisabled]}
                  onPress={handleSectionSubmit}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.sectionSubmitText}>
                        {selectedLanguage === 'english' ? 'Save Section & Continue' : 'பிரிவை சேமித்து தொடரவும்'}
                      </Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </>
                  )}
                </TouchableOpacity>
              </Animated.View>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewToggleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  viewToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5f5',
    backgroundColor: '#fff',
  },
  viewToggleButtonActive: {
    backgroundColor: '#006dab',
    borderColor: '#006dab',
  },
  viewToggleText: {
    color: '#006dab',
    fontWeight: '600',
  },
  viewToggleTextActive: {
    color: '#fff',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#006dab',
  },
  viewOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#dbeafe',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  viewOnlyBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#006dab',
  },
  languageSwitchBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  progressContainer: {
    flex: 1,
    maxWidth: 260,
    gap: 8,
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
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
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
  questionWrapper: {
    width: '100%',
  },
  questionGradient: {
    borderRadius: 24,
    padding: 1,
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
  textInputDisabled: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
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
  optionCardViewOnly: {
    opacity: 0.9,
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
  sectionFormContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionFormTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionFormSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  sectionQuestionCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  sectionQuestionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  sectionSubmitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#006dab',
  },
  sectionSubmitButtonDisabled: {
    opacity: 0.6,
  },
  sectionSubmitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
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
  // Language switch / modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  langModalContent: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  langModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  langModalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  langOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  langOptionActive: {
    borderColor: '#006dab',
    backgroundColor: '#eff6ff',
  },
  langOptionText: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '600',
  },
  langConfirmContent: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  langConfirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  langConfirmText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  langConfirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  confirmButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
