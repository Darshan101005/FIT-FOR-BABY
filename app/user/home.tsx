import BottomNavBar from '@/components/navigation/BottomNavBar';
import { HomePageSkeleton } from '@/components/ui/SkeletonLoader';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useUserData } from '@/context/UserDataContext';
import { formatDateString } from '@/services/firestore.service';
import {
  addNotificationReceivedListener,
  addNotificationResponseListener,
  registerForPushNotificationsAsync,
  savePushTokenForUser
} from '@/services/notification.service';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

const isWeb = Platform.OS === 'web';
const STEPS_STORAGE_KEY = '@fitforbaby_steps_today';

// Day index keys for translation
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_KEYS_FULL = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_KEYS_FULL = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

// Generate dates for selector (3 days before, today, 3 days after)
const generateDates = (isMobile: boolean = false) => {
  const dates = [];
  const today = new Date();
  
  // For mobile: show 3 past days + today (4 boxes total)
  // For laptop: show 3 past + today + 3 future (7 boxes)
  const startOffset = -3;
  const endOffset = isMobile ? 0 : 3;
  
  for (let i = startOffset; i <= endOffset; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push({
      date: date,
      day: date.getDate(),
      dayKey: DAY_KEYS[date.getDay()],
      dayKeyFull: DAY_KEYS_FULL[date.getDay()],
      monthKey: MONTH_KEYS[date.getMonth()],
      monthKeyFull: MONTH_KEYS_FULL[date.getMonth()],
      isToday: i === 0,
      isFuture: i > 0,
      isPast: i < 0,
    });
  }
  return dates;
};

export default function UserHomeScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  
  // Get cached data from context - NO MORE LOADING ON EVERY PAGE SWITCH!
  const { 
    isInitialLoading, 
    hasLoadedOnce,
    userInfo, 
    globalSettings, 
    dailyDataCache, 
    getDailyData,
    nursingVisits: upcomingNursingVisits,
    reminders: broadcasts,
    streakData,
    refreshDailyData,
    refreshUserInfo,
    refreshMessages,
    dismissReminder,
    clearAllReminders,
  } = useUserData();
  
  const [selectedDateIndex, setSelectedDateIndex] = useState(3); // Today is at index 3
  const [notificationSidebarVisible, setNotificationSidebarVisible] = useState(false);
  const sidebarAnim = useRef(new Animated.Value(300)).current;

  // Push notification token
  const [pushToken, setPushToken] = useState<string | null>(null);
  
  const dates = generateDates(isMobile);
  const todayIndex = isMobile ? 3 : 3; // Today is always at index 3
  
  // Check if selected date is today (only allow logging for today)
  const isSelectedDateToday = dates[selectedDateIndex]?.isToday || false;
  
  // Use cached data - show skeleton only on FIRST load
  const isLoading = isInitialLoading && !hasLoadedOnce;
  const userWeight = userInfo?.weight || 60;

  // Register for push notifications on mount
  useEffect(() => {
    const setupPushNotifications = async () => {
      try {
        // Register for push notifications
        const token = await registerForPushNotificationsAsync();
        if (token) {
          setPushToken(token);
          
          // Save token to Firestore for this user
          if (userInfo?.coupleId && userInfo?.userGender) {
            await savePushTokenForUser(userInfo.coupleId, userInfo.userGender, token);
            console.log('Push token saved successfully');
          }
        }
      } catch (error) {
        console.log('Error setting up push notifications:', error);
      }
    };

    setupPushNotifications();

    // Set up notification listeners
    const notificationReceivedListener = addNotificationReceivedListener(async notification => {
      console.log('Notification received:', notification);
      // Refresh reminders when a push notification arrives
      // This ensures new reminders show up in the bell icon immediately
      refreshMessages();
      refreshDailyData();
    });

    const notificationResponseListener = addNotificationResponseListener(response => {
      console.log('Notification response:', response);
      // Refresh reminders when user taps notification
      refreshMessages();
      // Handle notification tap - navigate to appropriate screen
      const data = response.notification.request.content.data;
      if (data?.screen) {
        router.push(data.screen as any);
      }
    });

    // Cleanup listeners on unmount
    return () => {
      notificationReceivedListener.remove();
      notificationResponseListener.remove();
    };
  }, [userInfo, refreshDailyData, refreshMessages]);

  // Refresh daily data and user info when home page comes into focus (e.g., after logging steps/food/exercise or updating profile)
  useFocusEffect(
    useCallback(() => {
      // Only refresh if we've already loaded once (not initial load)
      if (hasLoadedOnce) {
        refreshDailyData();
        // Only refresh user info on mobile (for profile photo sync)
        // On web, the context already handles real-time updates
        if (!isWeb) {
          refreshUserInfo();
        }
      }
    }, [hasLoadedOnce, refreshDailyData, refreshUserInfo])
  );

  // Calculate time from steps (100 steps per minute for normal walking)
  const calculateTimeFromSteps = (steps: number): number => {
    return Math.round(steps / 100);
  };

  // Calculate calories from steps (0.0004 × weight × steps)
  const calculateCaloriesFromSteps = (steps: number, weight: number): number => {
    return Math.round(0.0004 * weight * steps);
  };

  // Progress data for the selected date - uses CACHED data from context
  const getProgressDataForDate = () => {
    const stepTarget = globalSettings?.dailySteps || 7000;
    const exerciseGoal = globalSettings?.coupleWalkingMinutes || 60;
    const caloriesGoal = globalSettings?.dailyCaloriesBurnt || 200;
    
    // Get data for the selected date from CACHED context data
    const selectedDate = dates[selectedDateIndex]?.date;
    const dateString = selectedDate ? formatDateString(selectedDate) : '';
    const dateData = getDailyData(dateString);
    
    const currentSteps = dateData.steps;
    const stepCalories = calculateCaloriesFromSteps(currentSteps, userWeight);
    const stepMinutes = calculateTimeFromSteps(currentSteps);
    const totalExerciseMinutes = stepMinutes + dateData.exerciseMinutes;
    const totalCaloriesBurnt = stepCalories + dateData.exerciseCalories;
    
    return {
      steps: { current: currentSteps, target: stepTarget },
      exerciseMinutes: totalExerciseMinutes,
      exerciseGoal: exerciseGoal,
      exerciseGoalMet: totalExerciseMinutes >= exerciseGoal,
      foodLogged: dateData.foodLogCount,
      caloriesBurnt: totalCaloriesBurnt,
      caloriesGoal: caloriesGoal,
      caloriesGoalMet: totalCaloriesBurnt >= caloriesGoal,
    };
  };

  // Get progress data based on selected date
  const todayProgress = getProgressDataForDate();

  // Helper function to format time ago
  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return t('home.recently');
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}${t('home.daysAgo')}`;
    if (hours > 0) return `${hours}${t('home.hoursAgo')}`;
    return t('home.justNow');
  };

  // Convert broadcasts to notification format
  const notifications = broadcasts.map(broadcast => ({
    id: broadcast.id,
    title: broadcast.title,
    message: broadcast.message,
    time: formatTimeAgo(broadcast.sentAt),
    type: broadcast.priority === 'urgent' ? 'urgent' : 
          broadcast.priority === 'important' ? 'important' : 'broadcast',
  }));

  // Today's Tips data - uses translations
  const todaysTips = [
    { id: 1, icon: 'water', color: '#06b6d4', tip: t('home.stayHydrated') },
    { id: 2, icon: 'walk', color: '#22c55e', tip: t('home.walkWithPartner') },
    { id: 3, icon: 'nutrition', color: '#f59e0b', tip: t('home.leafyGreens') },
    { id: 4, icon: 'bed', color: '#8b5cf6', tip: t('home.qualitySleep') },
    { id: 5, icon: 'heart', color: '#ef4444', tip: t('home.deepBreathing') },
    { id: 6, icon: 'sunny', color: '#fbbf24', tip: t('home.getSunlight') },
    { id: 7, icon: 'leaf', color: '#22c55e', tip: t('home.tryHealthyRecipe') },
    { id: 8, icon: 'happy', color: '#f472b6', tip: t('home.expressGratitude') },
    { id: 9, icon: 'book', color: '#6366f1', tip: t('home.readSomethingInspiring') },
    { id: 10, icon: 'medkit', color: '#10b981', tip: t('home.scheduleCheckup') },
    { id: 11, icon: 'chatbubble', color: '#0ea5e9', tip: t('home.shareFeelings') },
    { id: 12, icon: 'flower', color: '#e879f9', tip: t('home.spendTimeInNature') },
    { id: 13, icon: 'musical-notes', color: '#f43f5e', tip: t('home.listenToMusic') },
    { id: 14, icon: 'bicycle', color: '#38bdf8', tip: t('home.tryCycling') },
    { id: 15, icon: 'nutrition', color: '#f59e0b', tip: t('home.limitProcessedFoods') },
  ];

  // Get a random tip based on the day
  const dailyTip = todaysTips[new Date().getDate() % todaysTips.length];

  const stepsPercentage = Math.min((todayProgress.steps.current / todayProgress.steps.target) * 100, 100);

  // Notification sidebar handlers
  const openNotificationSidebar = () => {
    setNotificationSidebarVisible(true);
    Animated.spring(sidebarAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const closeNotificationSidebar = () => {
    Animated.timing(sidebarAnim, {
      toValue: 300,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setNotificationSidebarVisible(false);
    });
  };

  const handleDateSelect = (index: number) => {
    // Only allow past dates and today - data is already preloaded
    if (!dates[index].isFuture) {
      setSelectedDateIndex(index);
    }
  };

  const formatCurrentDate = () => {
    // Use the selected date from the date selector
    const selectedItem = dates[selectedDateIndex];
    if (!selectedItem) {
      const now = new Date();
      return `${t(`daysFull.${DAY_KEYS_FULL[now.getDay()]}`)}, ${t(`appointments.monthFull.${MONTH_KEYS[now.getMonth()]}`)} ${now.getDate()}, ${now.getFullYear()}`;
    }
    return `${t(`daysFull.${selectedItem.dayKeyFull}`)}, ${t(`appointments.monthFull.${selectedItem.monthKey}`)} ${selectedItem.day}, ${selectedItem.date.getFullYear()}`;
  };

  // Circular progress component
  const CircularProgress = ({ percentage, size = 200, strokeWidth = 12 }: { percentage: number; size?: number; strokeWidth?: number }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <View style={styles.circularProgressWrapper}>
        <Svg width={size} height={size} style={styles.circularSvg}>
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            {/* Background circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={isDarkMode ? '#2d3748' : '#e8f0e8'}
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Progress circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#006dab"
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </G>
        </Svg>
        {/* Center content */}
        <View style={styles.circularCenter}>
          <MaterialCommunityIcons name="shoe-print" size={28} color="#006dab" />
          <Text style={[styles.stepsValue, { color: colors.text }]}>
            {todayProgress.steps.current.toLocaleString()}
          </Text>
          <Text style={[styles.stepsLabel, { color: colors.textSecondary }]}>{t('home.steps')}</Text>
        </View>
      </View>
    );
  };

  // Show skeleton ONLY on first load - subsequent visits show cached data instantly
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <HomePageSkeleton isMobile={isMobile} />
        <BottomNavBar />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header - Keep as is */}
        <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <TouchableOpacity 
                style={styles.avatarContainer}
                onPress={() => router.push('/user/profile')}
                activeOpacity={0.8}
              >
                {userInfo?.profilePhoto ? (
                  <Image 
                    source={{ uri: `${userInfo.profilePhoto}?t=${Date.now()}` }} 
                    style={styles.avatar}
                    {...(!isWeb && { cachePolicy: "none" })}
                  />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: '#006dab' }]}>
                    <Text style={styles.avatarText}>
                      {(userInfo?.name || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <View>
                <Text style={[styles.greeting, { color: colors.text }]}>
                  {t('home.hello')}, {userInfo?.name || 'User'}! 👋
                </Text>
                <Text style={[styles.coupleId, { color: colors.textSecondary }]}>
                  {t('home.coupleId')}: {userInfo?.coupleId || ''}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.notificationButton, { backgroundColor: isDarkMode ? '#2d3748' : '#f1f5f9' }]}
              onPress={openNotificationSidebar}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications-outline" size={22} color={colors.text} />
              {broadcasts.length > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{broadcasts.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>{formatCurrentDate()}</Text>
        </View>

        <View style={[styles.content, isMobile && styles.contentMobile]}>
          
          {/* Date Selector */}
          <View style={styles.dateSelector}>
            {dates.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dateItem,
                  { backgroundColor: colors.cardBackground },
                  item.isToday && styles.dateItemToday,
                  item.isToday && { backgroundColor: '#006dab' },
                  selectedDateIndex === index && !item.isToday && styles.dateItemSelected,
                  selectedDateIndex === index && !item.isToday && { borderColor: '#006dab' },
                  item.isFuture && styles.dateItemFuture,
                ]}
                onPress={() => handleDateSelect(index)}
                activeOpacity={item.isFuture ? 1 : 0.7}
                disabled={item.isFuture}
              >
                <Text style={[
                  styles.dateWeekday,
                  { color: colors.textSecondary },
                  item.isToday && { color: 'rgba(255,255,255,0.8)' },
                  item.isFuture && { color: colors.textSecondary, opacity: 0.4 },
                ]}>
                  {t(`days.${item.dayKey}`)}
                </Text>
                <Text style={[
                  styles.dateDay,
                  { color: colors.text },
                  item.isToday && { color: '#ffffff' },
                  item.isFuture && { color: colors.textSecondary, opacity: 0.4 },
                ]}>
                  {item.day}
                </Text>
                {item.isToday && (
                  <View style={styles.todayDot} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Pedometer Card */}
          <View style={[styles.pedometerCard, { backgroundColor: colors.cardBackground }]}>
            <CircularProgress percentage={stepsPercentage} size={isMobile ? 180 : 200} strokeWidth={14} />
            
            {/* Target info */}
            <View style={styles.targetInfo}>
              <View style={[styles.targetBadge, { backgroundColor: isDarkMode ? '#1a3329' : '#e8f5d6' }]}>
                <Ionicons name="flag" size={14} color="#98be4e" />
                <Text style={[styles.targetText, { color: '#98be4e' }]}>
                  {t('home.goal')}: {todayProgress.steps.target.toLocaleString()} {t('home.steps')}
                </Text>
              </View>
            </View>

            {/* Log Steps Button - Only show for today */}
            {isSelectedDateToday && (
              <TouchableOpacity 
                style={styles.logStepsButton}
                onPress={() => router.push('/user/log-steps' as any)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="shoe-print" size={20} color="#ffffff" />
                <Text style={styles.logStepsButtonText}>{t('home.logStepCount')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Actions - Only show for today */}
          {isSelectedDateToday && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('home.quickActions')}</Text>
              <View style={styles.quickActionsRow}>
                <TouchableOpacity
                  style={[styles.quickActionCard, { backgroundColor: colors.cardBackground }]}
                  onPress={() => router.push('/user/log-food' as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: isDarkMode ? '#1a3329' : '#e8f5d6' }]}>
                    <Ionicons name="restaurant" size={22} color="#98be4e" />
                  </View>
                  <Text style={[styles.quickActionLabel, { color: colors.text }]}>{t('home.logFood')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickActionCard, { backgroundColor: colors.cardBackground }]}
                  onPress={() => router.push('/user/log-exercise' as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: isDarkMode ? '#1a2d3d' : '#e0f2fe' }]}>
                    <Ionicons name="fitness" size={22} color="#006dab" />
                  </View>
                  <Text style={[styles.quickActionLabel, { color: colors.text }]}>{t('home.logExercise')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickActionCard, { backgroundColor: colors.cardBackground }]}
                  onPress={() => router.push('/user/log-weight' as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: isDarkMode ? '#2d2a1a' : '#fef3c7' }]}>
                    <Ionicons name="scale" size={22} color="#f59e0b" />
                  </View>
                  <Text style={[styles.quickActionLabel, { color: colors.text }]}>{t('home.logWeight')}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Activity Section - Shows data for selected date */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {isSelectedDateToday ? t('home.todaysActivity') : `${t(`days.${dates[selectedDateIndex]?.dayKey}`)} ${dates[selectedDateIndex]?.day} ${t('home.activity')}`}
          </Text>
          <View style={styles.activityGrid}>
            {/* Exercise Minutes */}
            <View style={[styles.activityCard, { backgroundColor: colors.cardBackground }]}>
              <View style={[styles.activityIconContainer, { backgroundColor: isDarkMode ? '#1a2d3d' : '#e0f2fe' }]}>
                <Ionicons name="fitness" size={22} color="#006dab" />
              </View>
              <View style={styles.activityInfo}>
                <Text style={[styles.activityValue, { color: colors.text }]} numberOfLines={1}>
                  {todayProgress.exerciseMinutes}
                  <Text style={[styles.activityUnit, { color: colors.textSecondary }]}> {t('home.min')}</Text>
                </Text>
                <Text style={[styles.activityLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                  {t('home.exercise')} {!todayProgress.exerciseGoalMet && `/ ${todayProgress.exerciseGoal}m`}
                </Text>
              </View>
              {todayProgress.exerciseGoalMet && (
                <View style={styles.goalMetBadge}>
                  <Ionicons name="checkmark-circle" size={18} color="#98be4e" />
                </View>
              )}
            </View>

            {/* Food Logged */}
            <View style={[styles.activityCard, { backgroundColor: colors.cardBackground }]}>
              <View style={[styles.activityIconContainer, { backgroundColor: isDarkMode ? '#1a3329' : '#e8f5d6' }]}>
                <Ionicons name="restaurant" size={22} color="#98be4e" />
              </View>
              <View style={styles.activityInfo}>
                <Text style={[styles.activityValue, { color: colors.text }]} numberOfLines={1}>
                  {todayProgress.foodLogged}
                  <Text style={[styles.activityUnit, { color: colors.textSecondary }]}> {t('home.meals')}</Text>
                </Text>
                <Text style={[styles.activityLabel, { color: colors.textSecondary }]} numberOfLines={1}>{t('home.foodLogged')}</Text>
              </View>
            </View>

            {/* Calories Burnt */}
            <View style={[styles.activityCard, { backgroundColor: colors.cardBackground }]}>
              <View style={[styles.activityIconContainer, { backgroundColor: isDarkMode ? '#2d1f1f' : '#fee2e2' }]}>
                <Ionicons name="flame" size={22} color="#ef4444" />
              </View>
              <View style={styles.activityInfo}>
                <Text style={[styles.activityValue, { color: colors.text }]} numberOfLines={1}>
                  {todayProgress.caloriesBurnt}
                  <Text style={[styles.activityUnit, { color: colors.textSecondary }]}> {t('home.kcal')}</Text>
                </Text>
                <Text style={[styles.activityLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                  {t('home.caloriesBurnt')} {!todayProgress.caloriesGoalMet && `/ ${todayProgress.caloriesGoal}`}
                </Text>
              </View>
              {todayProgress.caloriesGoalMet && (
                <View style={styles.goalMetBadge}>
                  <Ionicons name="checkmark-circle" size={18} color="#98be4e" />
                </View>
              )}
            </View>

            {/* Diet Recommendations */}
            <TouchableOpacity 
              style={[styles.activityCard, { backgroundColor: colors.cardBackground }]}
              onPress={() => router.push('/user/diet-plan' as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.activityIconContainer, { backgroundColor: isDarkMode ? '#2d2a1a' : '#fef3c7' }]}>
                <MaterialCommunityIcons name="food-variant" size={22} color="#f59e0b" />
              </View>
              <View style={styles.activityInfo}>
                <Text style={[styles.activityValue, { color: colors.text }]} numberOfLines={1}>{t('home.dietPlan')}</Text>
                <Text style={[styles.activityLabel, { color: colors.textSecondary }]}>{t('home.view')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={styles.activityArrow} />
            </TouchableOpacity>
          </View>

          {/* Streak Card - Duolingo Style */}
          <View style={[styles.streakCard, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.streakMainContent}>
              <View style={styles.streakFireContainer}>
                <MaterialCommunityIcons 
                  name="fire" 
                  size={56} 
                  color={streakData.currentStreak > 0 ? '#ff5722' : colors.textMuted} 
                />
                <Text style={[
                  styles.streakNumber, 
                  { color: streakData.currentStreak > 0 ? '#ff5722' : colors.textMuted }
                ]}>
                  {streakData.currentStreak}
                </Text>
              </View>
              <View style={styles.streakTextContent}>
                <Text style={[styles.streakLabel, { color: colors.text }]}>
                  {t('home.dayStreak')}
                </Text>
                <Text style={[styles.streakMotivation, { color: colors.textSecondary }]}>
                  {streakData.currentStreak === 0 
                    ? t('home.startStreak')
                    : streakData.currentStreak === 1 
                      ? t('home.greatStart')
                      : `${streakData.currentStreak} days of healthy logging!`}
                </Text>
              </View>
            </View>
            
            {streakData.longestStreak > 0 && streakData.longestStreak > streakData.currentStreak && (
              <View style={[styles.bestStreakRow, { borderTopColor: colors.borderLight }]}>
                <Text style={[styles.bestStreakLabel, { color: colors.textSecondary }]}>{t('home.bestStreak')}:</Text>
                <Text style={[styles.bestStreakValue, { color: colors.primary }]}>{streakData.longestStreak} {t('home.days')} 🏅</Text>
              </View>
            )}
          </View>

          {/* Today's Tip Card */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('home.todaysTip')}</Text>
          <View style={[styles.tipCard, { backgroundColor: colors.cardBackground }]}>
            <View style={[styles.tipIconContainer, { backgroundColor: dailyTip.color + '20' }]}>
              <Ionicons name={dailyTip.icon as any} size={28} color={dailyTip.color} />
            </View>
            <View style={styles.tipContent}>
              <Text style={[styles.tipText, { color: colors.text }]}>{dailyTip.tip}</Text>
            </View>
            <View style={styles.tipBadge}>
              <Ionicons name="bulb" size={16} color="#f59e0b" />
            </View>
          </View>

          {/* Reminders are now shown only in notification sidebar (bell icon) */}

          {/* Upcoming Nursing Department Visits */}
          {upcomingNursingVisits.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('home.upcomingNursingVisits')}</Text>
              <View style={styles.nursingVisitsContainer}>
                {upcomingNursingVisits.slice(0, 3).map((visit, index) => {
                  const visitDate = new Date(visit.date);
                  const dayOfWeek = visitDate.getDay();
                  const monthIndex = visitDate.getMonth();
                  const dayNum = visitDate.getDate();
                  
                  // Get translated day and month names
                  const dayKeys = ['days.sun', 'days.mon', 'days.tue', 'days.wed', 'days.thu', 'days.fri', 'days.sat'];
                  const monthKeys = ['months.jan', 'months.feb', 'months.mar', 'months.apr', 'months.may', 'months.jun', 'months.jul', 'months.aug', 'months.sep', 'months.oct', 'months.nov', 'months.dec'];
                  const dayName = t(dayKeys[dayOfWeek]);
                  const monthName = t(monthKeys[monthIndex]);
                  
                  return (
                    <TouchableOpacity
                      key={visit.id || index}
                      style={[styles.nursingVisitCard, { backgroundColor: colors.cardBackground }]}
                      onPress={() => router.push('/user/appointments' as any)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.nursingVisitDateBadge}>
                        <Text style={styles.nursingVisitDay}>{dayNum}</Text>
                        <Text style={styles.nursingVisitMonth}>{monthName}</Text>
                      </View>
                      <View style={styles.nursingVisitInfo}>
                        <Text style={[styles.nursingVisitTitle, { color: colors.text }]}>
                          {visit.purpose || t('home.nursingDeptVisit')}
                        </Text>
                        <View style={styles.nursingVisitMeta}>
                          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                          <Text style={[styles.nursingVisitTime, { color: colors.textSecondary }]}>
                            {visit.time} • {dayName}
                          </Text>
                        </View>
                        {visit.visitNumber && (
                          <View style={styles.nursingVisitBadge}>
                            <Text style={styles.nursingVisitBadgeText}>{t('home.visit')} #{visit.visitNumber}</Text>
                          </View>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  );
                })}
                {upcomingNursingVisits.length > 3 && (
                  <TouchableOpacity
                    style={styles.viewAllButton}
                    onPress={() => router.push('/user/appointments' as any)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.viewAllText}>{t('home.viewAllVisits')} {upcomingNursingVisits.length} {t('home.visits')}</Text>
                    <Ionicons name="arrow-forward" size={16} color="#006dab" />
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

        </View>
      </ScrollView>

      {/* Notification Sidebar Overlay */}
      {notificationSidebarVisible && (
        <TouchableOpacity 
          style={styles.sidebarOverlay}
          activeOpacity={1}
          onPress={closeNotificationSidebar}
        />
      )}

      {/* Notification Sidebar */}
      <Animated.View 
        style={[
          styles.notificationSidebar,
          { 
            backgroundColor: colors.cardBackground,
            transform: [{ translateX: sidebarAnim }],
          }
        ]}
      >
        <View style={styles.sidebarHeader}>
          <View style={styles.sidebarHeaderLeft}>
            <Ionicons name="notifications" size={22} color="#006dab" />
            <Text style={[styles.sidebarTitle, { color: colors.text }]}>{t('home.reminders')}</Text>
          </View>
          <TouchableOpacity onPress={closeNotificationSidebar}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.notificationsList}>
          {notifications.length === 0 ? (
            <View style={styles.emptyNotifications}>
              <Ionicons name="notifications-off-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyNotificationsText, { color: colors.textSecondary }]}>
                {t('home.noNewReminders')}
              </Text>
              <Text style={[styles.emptyNotificationsSubtext, { color: colors.textSecondary }]}>
                {t('home.announcementsAppearHere')}
              </Text>
            </View>
          ) : (
            <>
              {notifications.map((notification) => (
                <View key={notification.id} style={[styles.notificationItem, { borderBottomColor: colors.border }]}>
                  <View style={[
                    styles.notificationDot,
                    { backgroundColor: notification.type === 'urgent' ? '#ef4444' : 
                      notification.type === 'important' ? '#f59e0b' : '#006dab' }
                  ]} />
                  <View style={styles.notificationContent}>
                    <View style={styles.notificationHeader}>
                      <Ionicons 
                        name="megaphone" 
                        size={14} 
                        color={notification.type === 'urgent' ? '#ef4444' : 
                              notification.type === 'important' ? '#f59e0b' : '#006dab'} 
                      />
                      <Text style={[styles.notificationTitle, { color: colors.text }]} numberOfLines={1}>
                        {notification.title}
                      </Text>
                      {/* Dismiss single notification */}
                      <TouchableOpacity
                        style={styles.dismissReminderButton}
                        onPress={() => dismissReminder?.(notification.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="close" size={16} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.notificationMessage, { color: colors.textSecondary }]} numberOfLines={3}>
                      {notification.message}
                    </Text>
                    <Text style={[styles.notificationTime, { color: colors.textSecondary }]}>
                      {notification.time}
                    </Text>
                  </View>
                </View>
              ))}
              {/* Clear All Button in sidebar */}
              <TouchableOpacity
                style={styles.clearAllButton}
                onPress={() => clearAllReminders?.()}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
                <Text style={styles.clearAllText}>{t('home.clearAllReminders')}</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </Animated.View>
      
      {/* Bottom Navigation */}
      <BottomNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // For mobile web browsers, use min-height with dvh (dynamic viewport height)
    // This accounts for mobile browser URL bar appearing/disappearing
    ...(isWeb && {
      minHeight: '100dvh' as any,
      height: '100dvh' as any,
    }),
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingTop: isWeb ? 24 : 50,
    paddingBottom: 16,
    paddingHorizontal: isWeb ? 40 : 20,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  greeting: {
    fontSize: 18,
    fontWeight: '700',
  },
  coupleId: {
    fontSize: 13,
    fontWeight: '500',
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  dateText: {
    fontSize: 13,
    marginTop: 2,
  },
  content: {
    padding: isWeb ? 40 : 20,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  contentMobile: {
    padding: 16,
  },
  
  // Date Selector
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  dateItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dateItemToday: {
    shadowColor: '#006dab',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  dateItemSelected: {
    borderWidth: 2,
  },
  dateItemFuture: {
    opacity: 0.5,
  },
  dateWeekday: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  dateDay: {
    fontSize: 18,
    fontWeight: '800',
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#98be4e',
    marginTop: 6,
  },

  // Pedometer Card
  pedometerCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  circularProgressWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularSvg: {
    transform: [{ rotate: '0deg' }],
  },
  circularCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepsValue: {
    fontSize: 36,
    fontWeight: '900',
    marginTop: 8,
  },
  stepsLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  targetInfo: {
    marginTop: 16,
    marginBottom: 20,
  },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  targetText: {
    fontSize: 13,
    fontWeight: '600',
  },
  logStepsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#006dab',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#006dab',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logStepsButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },

  // Section Title
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },

  // Quick Actions
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickActionCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Activity Cards
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  activityCard: {
    flex: 1,
    minWidth: isWeb ? '47%' : '100%',
    maxWidth: isWeb ? '49%' : '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  activityCardFull: {
    flexBasis: '100%',
  },
  activityIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  activityInfo: {
    flex: 1,
    minWidth: 0,
  },
  activityValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  activityUnit: {
    fontSize: 13,
    fontWeight: '500',
  },
  activityLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },

  // Streak Card - Duolingo Style
  streakCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  streakMainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  streakFireContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakNumber: {
    fontSize: 32,
    fontWeight: '800',
    marginTop: -10,
  },
  streakTextContent: {
    flex: 1,
  },
  streakLabel: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  streakMotivation: {
    fontSize: 14,
    lineHeight: 20,
  },
  bestStreakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  bestStreakLabel: {
    fontSize: 13,
  },
  bestStreakValue: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Notification Sidebar
  sidebarOverlay: {
    // Use fixed position for web to ensure overlay covers entire viewport
    ...(isWeb ? {
      position: 'fixed' as any,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 100,
    } : {
      position: 'absolute' as any,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 100,
    }),
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  notificationSidebar: {
    // Use fixed position for web to ensure sidebar stays in place
    ...(isWeb ? {
      position: 'fixed' as any,
      top: 0,
      right: 0,
      bottom: 0,
      width: 300,
      zIndex: 101,
    } : {
      position: 'absolute' as any,
      top: 0,
      right: 0,
      bottom: 0,
      width: 300,
      zIndex: 101,
    }),
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: isWeb ? 24 : 50,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  sidebarHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  notificationsList: {
    flex: 1,
    padding: 16,
  },
  emptyNotifications: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyNotificationsText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyNotificationsSubtext: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center' as const,
    paddingHorizontal: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  notificationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  notificationMessage: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 11,
    fontWeight: '500',
  },
  notificationAction: {
    padding: 4,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tipIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  tipContent: {
    flex: 1,
  },
  tipText: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
  },
  tipBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  activityArrow: {
    marginLeft: 'auto',
  },
  goalMetBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  
  // Nursing Visits Styles
  nursingVisitsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  nursingVisitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  nursingVisitDateBadge: {
    width: 50,
    height: 56,
    backgroundColor: '#98be4e20',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  nursingVisitDay: {
    fontSize: 20,
    fontWeight: '800',
    color: '#7da33e',
  },
  nursingVisitMonth: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7da33e',
    textTransform: 'uppercase',
  },
  nursingVisitInfo: {
    flex: 1,
  },
  nursingVisitTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  nursingVisitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nursingVisitTime: {
    fontSize: 13,
  },
  nursingVisitBadge: {
    backgroundColor: '#006dab15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  nursingVisitBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#006dab',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#006dab',
  },
  
  // Reminders Section Styles
  remindersSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  reminderBadgeCount: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  reminderBadgeCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  clearAllRemindersHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
  },
  clearAllRemindersHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
  remindersContainer: {
    gap: 12,
    marginBottom: 24,
  },
  reminderCard: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  reminderPriorityBar: {
    width: 4,
  },
  reminderContent: {
    flex: 1,
    padding: 14,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  priorityTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityTagText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dismissReminderButton: {
    padding: 4,
    marginLeft: 4,
  },
  reminderMessage: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  reminderTime: {
    fontSize: 11,
    fontWeight: '500',
  },
  viewAllRemindersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 4,
  },
  viewAllRemindersText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#006dab',
  },
});
