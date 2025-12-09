import BottomNavBar from '@/components/navigation/BottomNavBar';
import { ProgressPageSkeleton } from '@/components/ui/SkeletonLoader';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useUserData } from '@/context/UserDataContext';
import { CoupleWeightLog, coupleExerciseService, coupleService, coupleStepsService, coupleWeightLogService, formatDateString, globalSettingsService } from '@/services/firestore.service';
import { GlobalSettings } from '@/types/firebase.types';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';

const isWeb = Platform.OS === 'web';

interface ChartData {
  label: string;
  date: string;
  steps: number;
  calories: number;
  exercise: number;
}

// Keep WeeklyData as alias for backward compatibility
interface WeeklyData {
  day: string;
  date: string;
  steps: number;
  calories: number;
  exercise: number;
}

interface WeightData {
  date: string;
  weight: number;
  label: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji?: string;
  image?: any;
  backgroundColor: string;
  isUnlocked: boolean;
  unlockedAt?: Date;
  requirement: string;
}

export default function ProgressScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const { colors } = useTheme();
  const { t, language } = useLanguage();

  // Get cached data from context
  const { 
    userInfo, 
    globalSettings: cachedGlobalSettings,
    weeklyStats: cachedWeeklyStats,
    weightHistory: cachedWeightHistory,
    streak: cachedStreak,
    isInitialized
  } = useUserData();

  const [selectedRange, setSelectedRange] = useState('week');
  const [selectedMetric, setSelectedMetric] = useState<'steps' | 'calories' | 'exercise'>('steps');
  
  // User data
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [userGender, setUserGender] = useState<'male' | 'female'>('male');
  const [userWeight, setUserWeight] = useState(60);
  
  // Dynamic data from Firestore
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [monthlyData, setMonthlyData] = useState<ChartData[]>([]);
  const [threeMonthData, setThreeMonthData] = useState<ChartData[]>([]);
  const [weightHistory, setWeightHistory] = useState<WeightData[]>([]);
  const [coupleWeeksJoined, setCoupleWeeksJoined] = useState(0);
  const [totalWalksTogether, setTotalWalksTogether] = useState(0);
  const [combinedWeightLost, setCombinedWeightLost] = useState(0);
  
  // Weekly goal tracking
  const [weeklyStepsTotal, setWeeklyStepsTotal] = useState(0);
  const [coupleWalkingMinutes, setCoupleWalkingMinutes] = useState(0);
  const [highKneesMinutes, setHighKneesMinutes] = useState(0);
  
  // Global settings from Firestore
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedFull, setHasLoadedFull] = useState(false);

  // Sync with context data for instant display
  useEffect(() => {
    if (userInfo) {
      setCoupleId(userInfo.coupleId || null);
      setUserGender(userInfo.gender || 'male');
      if (userInfo.weight) {
        setUserWeight(userInfo.weight);
      }
    }
  }, [userInfo]);

  useEffect(() => {
    if (cachedGlobalSettings) {
      setGlobalSettings(cachedGlobalSettings);
    }
  }, [cachedGlobalSettings]);

  useEffect(() => {
    if (cachedWeeklyStats) {
      setWeeklyStepsTotal(cachedWeeklyStats.totalSteps);
      setCoupleWalkingMinutes(cachedWeeklyStats.coupleWalkingMinutes);
      setHighKneesMinutes(cachedWeeklyStats.highKneesMinutes);
    }
  }, [cachedWeeklyStats]);

  useEffect(() => {
    if (cachedWeightHistory && cachedWeightHistory.length > 0) {
      // Transform cached weight history to WeightData format
      const firstLog = cachedWeightHistory[cachedWeightHistory.length - 1];
      const latestLog = cachedWeightHistory[0];
      
      const weightData: WeightData[] = [];
      weightData.push({
        date: firstLog.date,
        weight: firstLog.weight,
        label: t('progress.start'),
      });
      
      if (cachedWeightHistory.length > 1) {
        weightData.push({
          date: latestLog.date,
          weight: latestLog.weight,
          label: t('progress.current'),
        });
      }
      
      setWeightHistory(weightData);
      setCombinedWeightLost(Math.max(0, firstLog.weight - latestLog.weight));
    }
  }, [cachedWeightHistory, t]);

  useEffect(() => {
    // Only show content once we have actual data, not just initialized flag
    // hasLoadedFull will be set true after useFocusEffect completes
    if (hasLoadedFull) {
      setIsLoading(false);
    }
  }, [hasLoadedFull]);

  // Achievements with translations - using useMemo to re-compute when language changes
  const getInitialAchievements = (): Achievement[] => [
    {
      id: '7-day-streak',
      title: t('achievement.7DayStreak.title'),
      description: t('achievement.7DayStreak.desc'),
      emoji: '🔥',
      backgroundColor: '#fef3c7',
      isUnlocked: false,
      requirement: t('achievement.7DayStreak.req'),
    },
    {
      id: '10k-steps',
      title: t('achievement.10kSteps.title'),
      description: t('achievement.10kSteps.desc'),
      emoji: '👟',
      backgroundColor: '#e8f5d6',
      isUnlocked: false,
      requirement: t('achievement.10kSteps.req'),
    },
    {
      id: 'partner-goals',
      title: t('achievement.partnerGoals.title'),
      description: t('achievement.partnerGoals.desc'),
      image: require('../../assets/images/couple.jpg'),
      backgroundColor: '#ede9fe',
      isUnlocked: false,
      requirement: t('achievement.partnerGoals.req'),
    },
    {
      id: '5kg-lost',
      title: t('achievement.5kgLost.title'),
      description: t('achievement.5kgLost.desc'),
      emoji: '⚖️',
      backgroundColor: '#dbeafe',
      isUnlocked: false,
      requirement: t('achievement.5kgLost.req'),
    },
    {
      id: 'weekly-warrior',
      title: t('achievement.weeklyWarrior.title'),
      description: t('achievement.weeklyWarrior.desc'),
      emoji: '🏆',
      backgroundColor: '#fce7f3',
      isUnlocked: false,
      requirement: t('achievement.weeklyWarrior.req'),
    },
    {
      id: 'first-exercise',
      title: t('achievement.firstExercise.title'),
      description: t('achievement.firstExercise.desc'),
      emoji: '💪',
      backgroundColor: '#ccfbf1',
      isUnlocked: false,
      requirement: t('achievement.firstExercise.req'),
    },
  ];
  
  const [achievements, setAchievements] = useState<Achievement[]>(getInitialAchievements);
  
  // Update achievements when language changes
  useEffect(() => {
    setAchievements(prev => prev.map((ach) => {
      const initial = getInitialAchievements().find(a => a.id === ach.id);
      return initial ? { ...ach, title: initial.title, description: initial.description, requirement: initial.requirement } : ach;
    }));
  }, [t]);

  // Helper function to get week start/end dates
  const getWeekDates = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    return { start: monday, end: sunday };
  };

  // Helper function to calculate calories from steps
  const calculateCaloriesFromSteps = (steps: number, weight: number): number => {
    return Math.round(0.0004 * weight * steps);
  };

  // Load all data
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          // Only show loading on first load, not on subsequent focuses
          if (!hasLoadedFull && !isInitialized) {
            setIsLoading(true);
          }
          
          // Get user session data - use context if available
          let storedCoupleId = userInfo?.coupleId || null;
          let storedGender = userInfo?.gender || null;
          let settings = cachedGlobalSettings;
          
          if (!storedCoupleId || !storedGender) {
            const [scId, sGender] = await Promise.all([
              AsyncStorage.getItem('coupleId'),
              AsyncStorage.getItem('userGender'),
            ]) as [string | null, string | null];

            storedCoupleId = scId;
            // Only accept 'male' or 'female' values for storedGender; otherwise treat as null
            storedGender = (sGender === 'male' || sGender === 'female') ? sGender : null;
          }
          
          if (!settings) {
            settings = await globalSettingsService.get();
          }

          if (!storedCoupleId || !storedGender) {
            setIsLoading(false);
            return;
          }

          setCoupleId(storedCoupleId);
          setUserGender(storedGender as 'male' | 'female');
          setGlobalSettings(settings);

          // Get couple data
          const couple = await coupleService.get(storedCoupleId);
          if (couple) {
            const user = couple[storedGender as 'male' | 'female'];
            if (user.weight) {
              setUserWeight(user.weight);
            }
            
            // Calculate weeks joined
            if (couple.createdAt) {
              const createdDate = couple.createdAt.toDate ? couple.createdAt.toDate() : new Date(couple.createdAt);
              const weeksJoined = Math.floor((Date.now() - createdDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
              setCoupleWeeksJoined(Math.max(1, weeksJoined));
            }
          }

          // Get week date range
          const { start, end } = getWeekDates();
          const startStr = formatDateString(start);
          const endStr = formatDateString(end);

          // Fetch weekly steps
          const stepsEntries = await coupleStepsService.getByDateRange(
            storedCoupleId,
            storedGender as 'male' | 'female',
            startStr,
            endStr
          );

          // Fetch weekly exercise logs
          const exerciseLogs = await coupleExerciseService.getByDateRange(
            storedCoupleId,
            storedGender as 'male' | 'female',
            startStr,
            endStr
          );

          // Fetch weight history (get all logs for accurate start weight)
          const weightLogs = await coupleWeightLogService.getAll(
            storedCoupleId,
            storedGender as 'male' | 'female',
            365 // Fetch up to a year of data
          );

          // Build weekly data - 7 days Mon-Sun
          const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          const weeklyDataArr: WeeklyData[] = [];
          let totalWeekSteps = 0;
          let totalCoupleWalkingMins = 0;
          let totalHighKneesMins = 0;

          for (let i = 0; i < 7; i++) {
            const date = new Date(start);
            date.setDate(start.getDate() + i);
            const dateStr = formatDateString(date);
            
            // Sum steps for this day
            const daySteps = stepsEntries
              .filter(e => e.date === dateStr)
              .reduce((sum, e) => sum + e.stepCount, 0);
            
            // Sum exercise for this day
            const dayExercise = exerciseLogs
              .filter(e => e.date === dateStr)
              .reduce((sum, e) => sum + e.duration, 0);
            
            // Calculate calories from steps
            const dayCalories = calculateCaloriesFromSteps(daySteps, userWeight) + 
              exerciseLogs.filter(e => e.date === dateStr).reduce((sum, e) => sum + e.caloriesBurned, 0);

            weeklyDataArr.push({
              day: weekDays[i],
              date: dateStr,
              steps: daySteps,
              calories: dayCalories,
              exercise: dayExercise,
            });

            totalWeekSteps += daySteps;

            // Sum couple walking and high knees minutes
            exerciseLogs.filter(e => e.date === dateStr).forEach(log => {
              if (log.exerciseType === 'couple-walking' || log.partnerParticipated) {
                totalCoupleWalkingMins += log.duration;
              }
              if (log.exerciseType === 'high-knees') {
                totalHighKneesMins += log.duration;
              }
            });
          }

          setWeeklyData(weeklyDataArr);
          setWeeklyStepsTotal(totalWeekSteps);
          setCoupleWalkingMinutes(totalCoupleWalkingMins);
          setHighKneesMinutes(totalHighKneesMins);

          // ===== LOAD MONTHLY DATA (weeks of current month) =====
          const now = new Date();
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          
          // Calculate how many weeks in this month
          const weeksInMonth = Math.ceil((monthEnd.getDate() + monthStart.getDay()) / 7);
          
          // Fetch all data for the month
          const monthStepsEntries = await coupleStepsService.getByDateRange(
            storedCoupleId,
            storedGender as 'male' | 'female',
            formatDateString(monthStart),
            formatDateString(monthEnd)
          );
          const monthExerciseLogs = await coupleExerciseService.getByDateRange(
            storedCoupleId,
            storedGender as 'male' | 'female',
            formatDateString(monthStart),
            formatDateString(monthEnd)
          );

          // Aggregate by week
          const monthlyDataArr: ChartData[] = [];
          for (let w = 0; w < weeksInMonth; w++) {
            const weekStart = new Date(monthStart);
            weekStart.setDate(monthStart.getDate() + (w * 7) - monthStart.getDay() + (w === 0 ? 0 : 0));
            
            // Calculate actual week boundaries within the month
            const wkStart = new Date(monthStart);
            wkStart.setDate(1 + (w * 7));
            if (wkStart > monthEnd) continue;
            
            const wkEnd = new Date(wkStart);
            wkEnd.setDate(wkStart.getDate() + 6);
            if (wkEnd > monthEnd) wkEnd.setTime(monthEnd.getTime());

            let weekSteps = 0;
            let weekCalories = 0;
            let weekExercise = 0;

            // Sum data for this week
            for (let d = new Date(wkStart); d <= wkEnd; d.setDate(d.getDate() + 1)) {
              const dateStr = formatDateString(new Date(d));
              weekSteps += monthStepsEntries.filter(e => e.date === dateStr).reduce((sum, e) => sum + e.stepCount, 0);
              weekExercise += monthExerciseLogs.filter(e => e.date === dateStr).reduce((sum, e) => sum + e.duration, 0);
              weekCalories += calculateCaloriesFromSteps(weekSteps, userWeight) + 
                monthExerciseLogs.filter(e => e.date === dateStr).reduce((sum, e) => sum + e.caloriesBurned, 0);
            }

            monthlyDataArr.push({
              label: `W${w + 1}`,
              date: formatDateString(wkStart),
              steps: weekSteps,
              calories: weekCalories,
              exercise: weekExercise,
            });
          }
          setMonthlyData(monthlyDataArr);

          // ===== LOAD 3-MONTH DATA (past 3 months) =====
          const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          
          const threeMonthDataArr: ChartData[] = [];
          for (let m = 0; m < 3; m++) {
            const mStart = new Date(now.getFullYear(), now.getMonth() - 2 + m, 1);
            const mEnd = new Date(now.getFullYear(), now.getMonth() - 2 + m + 1, 0);
            
            const mStepsEntries = await coupleStepsService.getByDateRange(
              storedCoupleId,
              storedGender as 'male' | 'female',
              formatDateString(mStart),
              formatDateString(mEnd)
            );
            const mExerciseLogs = await coupleExerciseService.getByDateRange(
              storedCoupleId,
              storedGender as 'male' | 'female',
              formatDateString(mStart),
              formatDateString(mEnd)
            );

            const monthSteps = mStepsEntries.reduce((sum, e) => sum + e.stepCount, 0);
            const monthExercise = mExerciseLogs.reduce((sum, e) => sum + e.duration, 0);
            const monthCalories = calculateCaloriesFromSteps(monthSteps, userWeight) + 
              mExerciseLogs.reduce((sum, e) => sum + e.caloriesBurned, 0);

            threeMonthDataArr.push({
              label: monthNames[mStart.getMonth()],
              date: formatDateString(mStart),
              steps: monthSteps,
              calories: monthCalories,
              exercise: monthExercise,
            });
          }
          setThreeMonthData(threeMonthDataArr);

          // Process weight history
          // Data comes from Firestore ordered by date DESC (most recent first)
          // So: weightLogs[0] = most recent (current), weightLogs[last] = oldest (start)
          if (weightLogs.length > 0) {
            // First entry ever logged is at the END of the array (oldest)
            // Most recent (current) is at the BEGINNING
            const firstLogEver = weightLogs[weightLogs.length - 1]; // Oldest = Start
            const latestLog = weightLogs[0]; // Most recent = Current
            
            // Create weight data array
            const weightData: WeightData[] = [];
            
            // Start weight (first ever logged)
            weightData.push({
              date: firstLogEver.date,
              weight: firstLogEver.weight,
              label: 'Start',
            });
            
            // Current weight (most recent)
            if (weightLogs.length > 1) {
              weightData.push({
                date: latestLog.date,
                weight: latestLog.weight,
                label: 'Current',
              });
            }
            
            setWeightHistory(weightData);

            // Calculate weight change
            if (weightLogs.length >= 1) {
              const startWeight = firstLogEver.weight;
              const currentWeight = latestLog.weight;
              setCombinedWeightLost(Math.max(0, startWeight - currentWeight));
            }
          }

          // Calculate total walks together (all time)
          const allExerciseLogs = await coupleExerciseService.getByDateRange(
            storedCoupleId,
            storedGender as 'male' | 'female',
            '2020-01-01', // Start from a long time ago
            formatDateString(new Date())
          );
          const totalWalks = allExerciseLogs.filter(
            log => log.exerciseType === 'couple-walking' || log.partnerParticipated
          ).length;
          setTotalWalksTogether(totalWalks);

          // Update achievements based on data
          updateAchievements(totalWalks, weightLogs, weeklyDataArr, exerciseLogs.length > 0);

        } catch (error) {
          console.error('Error loading progress data:', error);
        } finally {
          setIsLoading(false);
          setHasLoadedFull(true);
        }
      };

      loadData();
    }, [hasLoadedFull, isInitialized, userInfo, cachedGlobalSettings])
  );

  // Update achievements based on actual data
  const updateAchievements = (
    totalWalks: number, 
    weightLogs: CoupleWeightLog[], 
    weeklyData: WeeklyData[],
    hasExercise: boolean
  ) => {
    setAchievements(prev => prev.map(achievement => {
      let isUnlocked = achievement.isUnlocked;
      
      switch (achievement.id) {
        case 'partner-goals':
          isUnlocked = totalWalks >= 4;
          break;
        case '5kg-lost':
          if (weightLogs.length >= 2) {
            const sortedLogs = [...weightLogs].sort((a, b) => a.date.localeCompare(b.date));
            const weightLost = sortedLogs[0].weight - sortedLogs[sortedLogs.length - 1].weight;
            isUnlocked = weightLost >= 5;
          }
          break;
        case '10k-steps':
          const daysOver10k = weeklyData.filter(d => d.steps >= 10000).length;
          isUnlocked = daysOver10k >= 3;
          break;
        case 'first-exercise':
          isUnlocked = hasExercise;
          break;
        // Other achievements will be unlocked based on additional logic later
      }
      
      return { ...achievement, isUnlocked };
    }));
  };

  // Get chart data based on selected range
  const getChartData = (): ChartData[] => {
    switch (selectedRange) {
      case 'week':
        return weeklyData.length > 0 
          ? weeklyData.map(d => ({ label: d.day, date: d.date, steps: d.steps, calories: d.calories, exercise: d.exercise }))
          : [
              { label: 'Mon', date: '', steps: 0, calories: 0, exercise: 0 },
              { label: 'Tue', date: '', steps: 0, calories: 0, exercise: 0 },
              { label: 'Wed', date: '', steps: 0, calories: 0, exercise: 0 },
              { label: 'Thu', date: '', steps: 0, calories: 0, exercise: 0 },
              { label: 'Fri', date: '', steps: 0, calories: 0, exercise: 0 },
              { label: 'Sat', date: '', steps: 0, calories: 0, exercise: 0 },
              { label: 'Sun', date: '', steps: 0, calories: 0, exercise: 0 },
            ];
      case 'month':
        return monthlyData.length > 0 
          ? monthlyData 
          : [
              { label: 'W1', date: '', steps: 0, calories: 0, exercise: 0 },
              { label: 'W2', date: '', steps: 0, calories: 0, exercise: 0 },
              { label: 'W3', date: '', steps: 0, calories: 0, exercise: 0 },
              { label: 'W4', date: '', steps: 0, calories: 0, exercise: 0 },
            ];
      case '3months':
        return threeMonthData.length > 0 
          ? threeMonthData 
          : [
              { label: 'Sep', date: '', steps: 0, calories: 0, exercise: 0 },
              { label: 'Oct', date: '', steps: 0, calories: 0, exercise: 0 },
              { label: 'Nov', date: '', steps: 0, calories: 0, exercise: 0 },
            ];
      default:
        return [];
    }
  };

  const chartData = getChartData();

  // Keep currentData for backward compatibility with summary cards (always weekly)
  const currentData = weeklyData.length > 0 ? weeklyData : [
    { day: 'Mon', date: '', steps: 0, calories: 0, exercise: 0 },
    { day: 'Tue', date: '', steps: 0, calories: 0, exercise: 0 },
    { day: 'Wed', date: '', steps: 0, calories: 0, exercise: 0 },
    { day: 'Thu', date: '', steps: 0, calories: 0, exercise: 0 },
    { day: 'Fri', date: '', steps: 0, calories: 0, exercise: 0 },
    { day: 'Sat', date: '', steps: 0, calories: 0, exercise: 0 },
    { day: 'Sun', date: '', steps: 0, calories: 0, exercise: 0 },
  ];

  const totalSteps = currentData.reduce((acc, day) => acc + day.steps, 0);
  const daysWithData = currentData.filter(day => day.steps > 0 || day.calories > 0 || day.exercise > 0).length;
  const avgSteps = daysWithData > 1 ? Math.round(totalSteps / daysWithData) : totalSteps;
  const totalCalories = currentData.reduce((acc, day) => acc + day.calories, 0);
  const totalExercise = currentData.reduce((acc, day) => acc + day.exercise, 0);
  const isFirstDayOrWeek = daysWithData <= 1;

  const startWeight = weightHistory.length > 0 ? weightHistory[0].weight : 0;
  const currentWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weight : 0;
  const weightLost = Math.max(0, startWeight - currentWeight);

  const getMaxValue = () => {
    switch (selectedMetric) {
      case 'steps':
        return Math.max(...chartData.map(d => d.steps), 1);
      case 'calories':
        return Math.max(...chartData.map(d => d.calories), 1);
      case 'exercise':
        return Math.max(...chartData.map(d => d.exercise), 1);
    }
  };

  // Get today's index in the week (Monday = 0, Sunday = 6)
  const getTodayIndex = () => {
    const dayOfWeek = new Date().getDay();
    // getDay() returns 0 for Sunday, 1 for Monday, etc.
    // We want Monday = 0, so convert: Sunday (0) -> 6, Monday (1) -> 0, etc.
    return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  };

  const getValue = (data: WeeklyData) => {
    switch (selectedMetric) {
      case 'steps':
        return data.steps;
      case 'calories':
        return data.calories;
      case 'exercise':
        return data.exercise;
    }
  };

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'k';
    }
    return value.toString();
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#0f172a" />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>{t('progress.title')}</Text>
        <Text style={styles.headerSubtitle}>{t('progress.trackHealthJourney')}</Text>
      </View>
      <View style={{ width: 40 }} />
    </View>
  );

  // Define timeRanges with translations inside component
  const getTimeRanges = () => [
    { id: 'week', label: t('progress.thisWeek') },
    { id: 'month', label: t('progress.thisMonth') },
    { id: '3months', label: t('progress.past3Months') },
  ];

  const renderTimeRangeSelector = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.timeRangeScroll}
      contentContainerStyle={styles.timeRangeContent}
    >
      {getTimeRanges().map((range) => (
        <TouchableOpacity
          key={range.id}
          style={[
            styles.timeRangeButton,
            selectedRange === range.id && styles.timeRangeButtonActive,
          ]}
          onPress={() => setSelectedRange(range.id)}
        >
          <Text
            style={[
              styles.timeRangeText,
              selectedRange === range.id && styles.timeRangeTextActive,
            ]}
          >
            {range.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderSummaryCards = () => (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryRow}>
        <TouchableOpacity 
          style={[
            styles.summaryCard,
            selectedMetric === 'steps' && styles.summaryCardActive,
          ]}
          activeOpacity={0.8}
          onPress={() => setSelectedMetric('steps')}
        >
          <View style={[
            styles.summaryGradientWrapper,
            selectedMetric === 'steps' && { backgroundColor: '#e8f5d6' },
          ]}>
            <MaterialCommunityIcons 
              name="walk" 
              size={28} 
              color={selectedMetric === 'steps' ? '#98be4e' : '#94a3b8'} 
            />
            <Text style={[
              styles.summaryValue,
              selectedMetric === 'steps' && { color: '#98be4e' },
            ]}>
              {formatValue(avgSteps)}
            </Text>
            <Text style={[
              styles.summaryLabel,
              selectedMetric === 'steps' && { color: '#7ba83c' },
            ]}>
              {isFirstDayOrWeek ? t('progress.totalSteps') : t('progress.avgSteps')}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.summaryCard,
            selectedMetric === 'calories' && styles.summaryCardActive,
          ]}
          activeOpacity={0.8}
          onPress={() => setSelectedMetric('calories')}
        >
          <View style={[
            styles.summaryGradientWrapper,
            selectedMetric === 'calories' && { backgroundColor: '#fee2e2' },
          ]}>
            <MaterialCommunityIcons 
              name="fire" 
              size={28} 
              color={selectedMetric === 'calories' ? '#ef4444' : '#94a3b8'} 
            />
            <Text style={[
              styles.summaryValue,
              selectedMetric === 'calories' && { color: '#ef4444' },
            ]}>
              {formatValue(totalCalories)}
            </Text>
            <Text style={[
              styles.summaryLabel,
              selectedMetric === 'calories' && { color: '#dc2626' },
            ]}>
              {t('progress.totalCalories')}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.summaryCard,
            selectedMetric === 'exercise' && styles.summaryCardActive,
          ]}
          activeOpacity={0.8}
          onPress={() => setSelectedMetric('exercise')}
        >
          <View style={[
            styles.summaryGradientWrapper,
            selectedMetric === 'exercise' && { backgroundColor: '#fef3c7' },
          ]}>
            <MaterialCommunityIcons 
              name="run-fast" 
              size={28} 
              color={selectedMetric === 'exercise' ? '#f59e0b' : '#94a3b8'} 
            />
            <Text style={[
              styles.summaryValue,
              selectedMetric === 'exercise' && { color: '#f59e0b' },
            ]}>
              {formatValue(totalExercise)}
            </Text>
            <Text style={[
              styles.summaryLabel,
              selectedMetric === 'exercise' && { color: '#d97706' },
            ]}>
              {t('progress.exerciseMin')}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getChartTitle = () => {
    const metricKeys = {
      steps: t('progress.steps'),
      calories: t('progress.calories'),
      exercise: t('progress.exercise')
    };
    const metricName = metricKeys[selectedMetric] || selectedMetric;
    switch (selectedRange) {
      case 'week': return `${t('progress.weekly')} ${metricName}`;
      case 'month': return `${t('progress.monthly')} ${metricName}`;
      case '3months': return `${t('progress.threeMonth')} ${metricName}`;
      case 'all': return `${t('progress.allTime')} ${metricName}`;
      default: return `${t('progress.weekly')} ${metricName}`;
    }
  };

  const renderWeeklyChart = () => {
    const maxVal = getMaxValue();

    return (
      <View style={styles.chartCard}>
        <View style={[styles.chartHeader, isMobile && styles.chartHeaderMobile]}>
          <Text style={styles.chartTitle}>{getChartTitle()}</Text>
          <View style={styles.chartLegend}>
            <View style={[styles.legendDot, { backgroundColor: '#006dab' }]} />
            <Text style={styles.legendText}>
              {selectedMetric === 'steps' ? t('progress.steps') : 
               selectedMetric === 'calories' ? t('progress.calories') : t('progress.minutes')}
            </Text>
          </View>
        </View>

        <View style={styles.chartContainer}>
          {chartData.map((data, index) => {
            const value = selectedMetric === 'steps' ? data.steps : 
                          selectedMetric === 'calories' ? data.calories : data.exercise;
            const barHeight = maxVal > 0 ? (value / maxVal) * 100 : 0; // Max height is 100px
            
            // For weekly view, highlight today
            let isHighlighted = false;
            if (selectedRange === 'week') {
              const todayDayOfWeek = new Date().getDay();
              const todayIndex = todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1;
              isHighlighted = index === todayIndex;
            } else if (selectedRange === 'month') {
              // Highlight current week
              const now = new Date();
              const currentWeekOfMonth = Math.ceil(now.getDate() / 7);
              isHighlighted = index === currentWeekOfMonth - 1;
            } else if (selectedRange === '3months') {
              // Highlight current month (last one)
              isHighlighted = index === chartData.length - 1;
            }

            return (
              <View key={data.label} style={styles.chartBar}>
                <Text style={[styles.chartValue, isMobile && styles.chartValueMobile]}>
                  {formatValue(value)}
                </Text>
                <View style={styles.chartBarContainer}>
                  <View style={{ flex: 1 }} />
                  <LinearGradient
                    colors={isHighlighted ? ['#98be4e', '#7ba83c'] : ['#006dab', '#005a8f']}
                    style={[styles.chartBarFill, { height: barHeight }]}
                  />
                </View>
                <Text style={[styles.chartDay, isHighlighted && styles.chartDayActive]}>
                  {data.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderWeightProgress = () => {
    // Handle empty weight history
    if (weightHistory.length === 0) {
      return (
        <View style={styles.chartCard}>
          <View style={[styles.chartHeader, isMobile && styles.chartHeaderMobile]}>
            <Text style={styles.chartTitle}>{t('progress.weightProgress')}</Text>
          </View>
          <View style={styles.emptyChartContainer}>
            <Ionicons name="scale-outline" size={48} color="#94a3b8" />
            <Text style={styles.emptyChartText}>{t('progress.noWeightData')}</Text>
            <Text style={styles.emptyChartSubtext}>{t('progress.logWeightToSee')}</Text>
          </View>
        </View>
      );
    }

    // Calculate weight change
    const weightChange = startWeight - currentWeight;
    const isWeightReduced = weightChange > 0;
    const isNoChange = weightChange === 0;
    // Black when no change, green when reduced, red when gained
    const changeColor = isNoChange ? '#0f172a' : isWeightReduced ? '#98be4e' : '#ef4444';
    const changeText = isWeightReduced 
      ? `${weightChange.toFixed(1)} ${t('log.weight.kgLost')}` 
      : weightChange < 0 
        ? `${Math.abs(weightChange).toFixed(1)} ${t('log.weight.kgGained')}`
        : t('progress.noChange');
    // Border color: default gray when no change
    const borderColor = isNoChange ? '#e2e8f0' : changeColor;

    return (
      <View style={styles.chartCard}>
        <View style={[styles.chartHeader, isMobile && styles.chartHeaderMobile]}>
          <Text style={styles.chartTitle}>{t('progress.weightProgress')}</Text>
        </View>

        <View style={styles.weightProgressContainer}>
          {/* Start Weight */}
          <View style={styles.weightBox}>
            <Text style={styles.weightBoxLabel}>{t('progress.start')}</Text>
            <Text style={styles.weightBoxValue}>{startWeight}</Text>
            <Text style={styles.weightBoxUnit}>{t('progress.kg')}</Text>
          </View>

          {/* Arrow and Change */}
          <View style={styles.weightChangeContainer}>
            <Ionicons name="arrow-forward" size={24} color={changeColor} />
            <Text style={[styles.weightChangeText, { color: changeColor }]}>
              {changeText}
            </Text>
          </View>

          {/* Current Weight */}
          <View style={[styles.weightBox, { borderColor: borderColor }]}>
            <Text style={styles.weightBoxLabel}>{t('progress.current')}</Text>
            <Text style={[styles.weightBoxValue, { color: isNoChange ? '#0f172a' : changeColor }]}>{currentWeight}</Text>
            <Text style={[styles.weightBoxUnit, { color: isNoChange ? '#64748b' : changeColor }]}>{t('progress.kg')}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderGoalProgress = () => {
    // Calculate goal progress based on Firestore settings and actual data
    // Steps: daily target × 7 = weekly target
    const dailyStepsTarget = globalSettings?.dailySteps || 7000;
    const stepsTarget = dailyStepsTarget * 7;
    const currentSteps = weeklyStepsTotal;
    const stepsPercent = Math.min((currentSteps / stepsTarget) * 100, 100);

    // Couple Walking: daily target × 7 = weekly target (in minutes)
    const dailyCoupleWalkingTarget = globalSettings?.coupleWalkingMinutes || 60;
    const coupleWalkingTarget = dailyCoupleWalkingTarget * 7;
    const coupleWalkingPercent = Math.min((coupleWalkingMinutes / coupleWalkingTarget) * 100, 100);

    // High Knees: daily target × 7 = weekly target (in minutes)
    const dailyHighKneesTarget = globalSettings?.highKneesMinutes || 30;
    const highKneesTarget = dailyHighKneesTarget * 7;
    const highKneesPercent = Math.min((highKneesMinutes / highKneesTarget) * 100, 100);

    return (
      <View style={styles.goalsSection}>
        <Text style={styles.sectionTitle}>{t('progress.weeklyGoals')}</Text>
        
        {/* Steps Goal */}
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <View style={[styles.goalIcon, { backgroundColor: '#98be4e20' }]}>
              <MaterialCommunityIcons name="walk" size={24} color="#98be4e" />
            </View>
            <View style={styles.goalInfo}>
              <Text style={styles.goalTitle}>{t('progress.weeklySteps')}</Text>
              <Text style={styles.goalStats}>
                <Text style={{ color: '#98be4e', fontWeight: '800' }}>
                  {currentSteps.toLocaleString()}
                </Text>
                {' / '}{stepsTarget.toLocaleString()} {t('progress.steps')}
              </Text>
            </View>
            <Text style={[styles.goalPercent, { color: '#98be4e' }]}>
              {Math.round(stepsPercent)}%
            </Text>
          </View>
          <View style={styles.goalProgressBar}>
            <View style={[styles.goalProgressFill, { width: `${stepsPercent}%`, backgroundColor: '#98be4e' }]} />
          </View>
        </View>

        {/* Couple Walking Goal */}
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <View style={[styles.goalIcon, { backgroundColor: '#3b82f620' }]}>
              <Ionicons name="people" size={24} color="#3b82f6" />
            </View>
            <View style={styles.goalInfo}>
              <Text style={styles.goalTitle}>{t('progress.coupleWalking')}</Text>
              <Text style={styles.goalStats}>
                <Text style={{ color: '#3b82f6', fontWeight: '800' }}>
                  {coupleWalkingMinutes}
                </Text>
                {' / '}{coupleWalkingTarget} {t('progress.minsWeek')}
              </Text>
            </View>
            <Text style={[styles.goalPercent, { color: '#3b82f6' }]}>
              {Math.round(coupleWalkingPercent)}%
            </Text>
          </View>
          <View style={styles.goalProgressBar}>
            <View style={[styles.goalProgressFill, { width: `${coupleWalkingPercent}%`, backgroundColor: '#3b82f6' }]} />
          </View>
        </View>

        {/* High Knees Goal */}
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <View style={[styles.goalIcon, { backgroundColor: '#f59e0b20' }]}>
              <MaterialCommunityIcons name="run-fast" size={24} color="#f59e0b" />
            </View>
            <View style={styles.goalInfo}>
              <Text style={styles.goalTitle}>{t('progress.highKnees')}</Text>
              <Text style={styles.goalStats}>
                <Text style={{ color: '#f59e0b', fontWeight: '800' }}>
                  {highKneesMinutes}
                </Text>
                {' / '}{highKneesTarget} {t('progress.minsWeek')}
              </Text>
            </View>
            <Text style={[styles.goalPercent, { color: '#f59e0b' }]}>
              {Math.round(highKneesPercent)}%
            </Text>
          </View>
          <View style={styles.goalProgressBar}>
            <View style={[styles.goalProgressFill, { width: `${highKneesPercent}%`, backgroundColor: '#f59e0b' }]} />
          </View>
        </View>
      </View>
    );
  };

  const renderAchievements = () => {
    // Separate unlocked and locked achievements
    const unlockedAchievements = achievements.filter(a => a.isUnlocked);
    const lockedAchievements = achievements.filter(a => !a.isUnlocked);

    return (
      <View style={styles.achievementsSection}>
        {/* Recent Achievements (Unlocked) */}
        {unlockedAchievements.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t('progress.recentAchievements')}</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.achievementsScroll}
            >
              {unlockedAchievements.map((achievement) => (
                <View key={achievement.id} style={styles.achievementCard}>
                  <View style={[styles.achievementBadge, { backgroundColor: achievement.backgroundColor, overflow: 'hidden' }]}>
                    {achievement.image ? (
                      <Image 
                        source={achievement.image} 
                        style={styles.coupleAchievementImage}
                        contentFit="cover"
                      />
                    ) : (
                      <Text style={styles.achievementEmoji}>{achievement.emoji}</Text>
                    )}
                  </View>
                  <View style={styles.unlockedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#98be4e" />
                  </View>
                  <Text style={styles.achievementTitle}>{achievement.title}</Text>
                  <Text style={styles.achievementDesc}>{achievement.description}</Text>
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {/* All Achievements (Locked with lock icon) */}
        <Text style={[styles.sectionTitle, unlockedAchievements.length > 0 && { marginTop: 24 }]}>
          {t('progress.allAchievements')}
        </Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.achievementsScroll}
        >
          {lockedAchievements.map((achievement) => (
            <View key={achievement.id} style={[styles.achievementCard, styles.lockedAchievementCard]}>
              <View style={[styles.achievementBadge, { backgroundColor: achievement.backgroundColor, overflow: 'hidden' }]}>
                {achievement.image ? (
                  <Image 
                    source={achievement.image} 
                    style={[styles.coupleAchievementImage, styles.lockedImage]}
                    contentFit="cover"
                  />
                ) : (
                  <Text style={[styles.achievementEmoji, styles.lockedEmoji]}>{achievement.emoji}</Text>
                )}
                {/* Lock overlay */}
                <View style={styles.lockOverlay}>
                  <Ionicons name="lock-closed" size={20} color="#ffffff" />
                </View>
              </View>
              <Text style={[styles.achievementTitle, styles.lockedText]}>{achievement.title}</Text>
              <Text style={[styles.achievementDesc, styles.lockedText]}>{achievement.requirement}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderCoupleProgress = () => (
    <View style={styles.coupleSection}>
      <View style={styles.coupleCard}>
        <View style={styles.coupleHeader}>
          <View style={styles.coupleTitleRow}>
            <Image 
              source={require('../../assets/images/couple.jpg')} 
              style={styles.coupleJourneyImage}
              contentFit="cover"
            />
            <Text style={styles.coupleTitle}>{t('progress.coupleJourney')}</Text>
          </View>
          <Text style={styles.coupleSubtitle}>{coupleWeeksJoined} {t('progress.weeksTogether')}</Text>
        </View>
        
        <View style={styles.coupleStatsCenter}>
          <Text style={styles.coupleStatValueLarge}>{totalWalksTogether}</Text>
          <Text style={styles.coupleStatLabelLarge}>{t('progress.walksTogether')}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderHeader()}

      {isLoading ? (
        <ProgressPageSkeleton isMobile={isMobile} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {renderTimeRangeSelector()}
            {renderSummaryCards()}
            {renderWeeklyChart()}
            {renderWeightProgress()}
            {renderGoalProgress()}
            {renderCoupleProgress()}
            {renderAchievements()}
          </View>
        </ScrollView>
      )}
      
      {/* Bottom Navigation */}
      <BottomNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  headerCenter: { flex: 1, marginLeft: 16 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  headerSubtitle: { fontSize: 14, color: '#64748b', marginTop: 2 },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { flexGrow: 1, paddingBottom: isWeb ? 40 : 100 },
  content: {
    padding: isWeb ? 40 : 16,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  timeRangeScroll: { marginBottom: 20, marginHorizontal: -16 },
  timeRangeContent: { paddingHorizontal: 16, gap: 8 },
  timeRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  timeRangeButtonActive: {
    backgroundColor: '#006dab',
    borderColor: '#006dab',
  },
  timeRangeText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  timeRangeTextActive: { color: '#ffffff' },
  summaryContainer: { gap: 12, marginBottom: 20 },
  summaryRow: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
  },
  summaryCardActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryGradientWrapper: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
    borderRadius: 16,
  },
  summaryGradient: {
    padding: 16,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
  },
  summaryValue: { fontSize: 22, fontWeight: '800', color: '#94a3b8', marginTop: 8 },
  summaryLabel: { fontSize: 11, color: '#94a3b8', marginTop: 4, textAlign: 'center' },
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 8,
  },
  chartHeaderMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  chartTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  chartLegend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: '#64748b' },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    paddingTop: 20,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    height: 120,
  },
  chartValue: { fontSize: 9, fontWeight: '600', color: '#64748b', marginBottom: 4 },
  chartValueMobile: { fontSize: 8 },
  chartBarContainer: {
    width: 24,
    height: 100,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    overflow: 'hidden',
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 6,
  },
  chartDay: { fontSize: 12, fontWeight: '600', color: '#64748b', marginTop: 8 },
  chartDayActive: { color: '#98be4e', fontWeight: '800' },
  weightSummary: {
    backgroundColor: '#e8f5d6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  weightLostText: { fontSize: 13, fontWeight: '700', color: '#98be4e' },
  // New simple weight progress styles
  weightProgressContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 20,
    gap: 8,
  },
  weightBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    minWidth: 80,
  },
  weightBoxLabel: { 
    fontSize: 11, 
    color: '#64748b', 
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },
  weightBoxValue: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: '#0f172a',
  },
  weightBoxUnit: { 
    fontSize: 13, 
    color: '#64748b', 
    fontWeight: '600',
    marginTop: 2,
  },
  weightChangeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    flexShrink: 1,
    minWidth: 60,
  },
  weightChangeText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  // Keep old styles for backward compatibility
  weightStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
  },
  weightStat: { alignItems: 'center' },
  weightStatLabel: { fontSize: 11, color: '#64748b' },
  weightStatValue: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  weightBarChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 100,
    paddingHorizontal: 10,
  },
  weightBarItem: {
    flex: 1,
    alignItems: 'center',
    height: 100,
  },
  weightBarContainer: {
    width: 20,
    height: 80,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  weightBarFill: {
    width: '100%',
    borderRadius: 4,
  },
  weightBarLabel: { fontSize: 9, color: '#64748b', marginTop: 6 },
  weightChartContainer: {
    flexDirection: 'row',
    height: 120,
    marginBottom: 8,
  },
  weightYAxis: {
    width: 40,
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  yAxisLabel: { fontSize: 10, color: '#94a3b8', textAlign: 'right' },
  weightChartArea: {
    flex: 1,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  lineChartContainer: {
    flex: 1,
    position: 'relative',
  },
  dataPoint: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -6,
    marginBottom: -6,
  },
  dataPointDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#006dab',
  },
  dataPointDotActive: {
    backgroundColor: '#98be4e',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#98be4e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  weightXAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 40,
    marginTop: 4,
  },
  xAxisLabel: { fontSize: 10, color: '#94a3b8' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  goalsSection: { marginBottom: 24 },
  goalCard: {
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
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalInfo: { flex: 1, marginLeft: 12 },
  goalTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  goalStats: { fontSize: 13, color: '#64748b', marginTop: 2 },
  goalSubtext: { fontSize: 11, color: '#94a3b8' },
  goalPercent: { fontSize: 18, fontWeight: '800' },
  goalsLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    gap: 10,
  },
  goalsLoadingText: {
    fontSize: 14,
    color: '#64748b',
  },
  goalProgressBar: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  coupleSection: { marginBottom: 24 },
  coupleCard: {
    borderRadius: 20,
    padding: 24,
    backgroundColor: '#ede9fe',
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  coupleHeader: { marginBottom: 20 },
  coupleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  coupleJourneyImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  coupleTitle: { fontSize: 20, fontWeight: '800', color: '#7c3aed' },
  coupleSubtitle: { fontSize: 14, color: '#8b5cf6', marginTop: 4 },
  coupleStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  coupleStatsCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  coupleStatValueLarge: { 
    fontSize: 42, 
    fontWeight: '800', 
    color: '#7c3aed',
    lineHeight: 48,
  },
  coupleStatLabelLarge: { 
    fontSize: 14, 
    color: '#8b5cf6', 
    marginTop: 4, 
    textAlign: 'center',
    fontWeight: '600',
  },
  coupleStat: { alignItems: 'center' },
  coupleStatValue: { fontSize: 28, fontWeight: '800', color: '#7c3aed' },
  coupleStatLabel: { fontSize: 11, color: '#8b5cf6', marginTop: 4, textAlign: 'center' },
  coupleStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#c4b5fd',
  },
  achievementsSection: { marginBottom: 24 },
  achievementsScroll: { gap: 12, paddingRight: 16 },
  achievementCard: {
    width: 130,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    marginRight: 12,
  },
  achievementBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  achievementEmoji: { fontSize: 26 },
  coupleAchievementImage: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  achievementTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
  achievementDesc: { fontSize: 10, color: '#64748b', marginTop: 4, textAlign: 'center' },
  
  // New styles for locked achievements and loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  emptyChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyChartText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 12,
  },
  emptyChartSubtext: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  lockedAchievementCard: {
    opacity: 0.85,
  },
  lockedImage: {
    opacity: 0.4,
  },
  lockedEmoji: {
    opacity: 0.4,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedText: {
    color: '#94a3b8',
  },
  unlockedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
});
