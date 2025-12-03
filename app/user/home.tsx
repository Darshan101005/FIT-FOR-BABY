import BottomNavBar from '@/components/navigation/BottomNavBar';
import { HomePageSkeleton } from '@/components/ui/SkeletonLoader';
import { useTheme } from '@/context/ThemeContext';
import { broadcastService, coupleExerciseService, coupleFoodLogService, coupleService, coupleStepsService, formatDateString, globalSettingsService, nursingVisitService } from '@/services/firestore.service';
import { Broadcast, GlobalSettings, NursingDepartmentVisit } from '@/types/firebase.types';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
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

// User data interface
interface UserData {
  name: string;
  coupleId: string;
  userId: string;
  userGender: 'male' | 'female';
  profileImage: string | null;
  unreadNotifications: number;
}

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
      weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
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
  
  const [selectedDateIndex, setSelectedDateIndex] = useState(3); // Today is at index 3
  const [notificationSidebarVisible, setNotificationSidebarVisible] = useState(false);
  const [userWeight, setUserWeight] = useState(60); // Default 60kg for calorie calculation
  const [isLoading, setIsLoading] = useState(true); // Loading state for skeleton
  const sidebarAnim = useRef(new Animated.Value(300)).current;
  
  // Preloaded data for all visible dates - keyed by date string
  const [allDatesData, setAllDatesData] = useState<{
    [dateString: string]: {
      steps: number;
      exerciseMinutes: number;
      exerciseCalories: number;
      foodLogCount: number;
    };
  }>({});
  
  // User data state - fetched from Firestore
  const [userData, setUserData] = useState<UserData | null>(null);
  
  // Global settings from Firestore
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  
  // Upcoming nursing visits
  const [upcomingNursingVisits, setUpcomingNursingVisits] = useState<NursingDepartmentVisit[]>([]);
  
  // Broadcasts/Reminders from admin
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  
  // Streak data
  const [streakData, setStreakData] = useState<{ currentStreak: number; longestStreak: number }>({ 
    currentStreak: 0, 
    longestStreak: 0 
  });
  
  const dates = generateDates(isMobile);
  const todayIndex = isMobile ? 3 : 3; // Today is always at index 3
  
  // Check if selected date is today (only allow logging for today)
  const isSelectedDateToday = dates[selectedDateIndex]?.isToday || false;

  // Calculate time from steps (100 steps per minute for normal walking)
  const calculateTimeFromSteps = (steps: number): number => {
    return Math.round(steps / 100);
  };

  // Calculate calories from steps (0.0004 × weight × steps)
  const calculateCaloriesFromSteps = (steps: number, weight: number): number => {
    return Math.round(0.0004 * weight * steps);
  };

  // Progress data for the selected date - uses preloaded data
  const getProgressDataForDate = () => {
    const stepTarget = globalSettings?.dailySteps || 7000;
    const exerciseGoal = globalSettings?.coupleWalkingMinutes || 60;
    const caloriesGoal = globalSettings?.dailyCaloriesBurnt || 200;
    
    // Get data for the selected date from preloaded data
    const selectedDate = dates[selectedDateIndex]?.date;
    const dateString = selectedDate ? formatDateString(selectedDate) : '';
    const dateData = allDatesData[dateString] || { steps: 0, exerciseMinutes: 0, exerciseCalories: 0, foodLogCount: 0 };
    
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

  // Load user data and steps when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const loadAllData = async () => {
        setIsLoading(true);
        try {
          // Load all data in parallel
          const [coupleId, userGender, userName, userId, settings] = await Promise.all([
            AsyncStorage.getItem('coupleId'),
            AsyncStorage.getItem('userGender'),
            AsyncStorage.getItem('userName'),
            AsyncStorage.getItem('userId'),
            globalSettingsService.get(),
          ]);

          // Set global settings
          setGlobalSettings(settings);

          // Get user weight and set user data first
          let userWeightValue = 60;
          if (coupleId && userGender) {
            const couple = await coupleService.get(coupleId);
            if (couple) {
              const user = couple[userGender as 'male' | 'female'];
              if (user.weight) {
                userWeightValue = user.weight;
                setUserWeight(userWeightValue);
              }
              
              // Set user data
              setUserData({
                name: user.name || userName || 'User',
                coupleId: coupleId,
                userId: userId || user.id,
                userGender: userGender as 'male' | 'female',
                profileImage: user.profileImage || null,
                unreadNotifications: 0,
              });
            } else {
              // Fallback if couple not found
              setUserData({
                name: userName || 'User',
                coupleId: coupleId || '',
                userId: userId || '',
                userGender: userGender as 'male' | 'female',
                profileImage: null,
                unreadNotifications: 0,
              });
            }
            
            // Preload data for ALL visible dates at once (only past dates and today)
            const visibleDates = dates.filter(d => !d.isFuture);
            const allDataPromises = visibleDates.map(async (dateItem) => {
              const dateString = formatDateString(dateItem.date);
              
              // Fetch all data for this date in parallel
              const [totalSteps, exerciseTotals, foodLogs] = await Promise.all([
                coupleStepsService.getTotalForDate(coupleId, userGender as 'male' | 'female', dateString),
                coupleExerciseService.getTotalsForDate(coupleId, userGender as 'male' | 'female', dateString),
                coupleFoodLogService.getByDate(coupleId, userGender as 'male' | 'female', dateString),
              ]);
              
              return {
                dateString,
                data: {
                  steps: totalSteps,
                  exerciseMinutes: exerciseTotals.duration,
                  exerciseCalories: exerciseTotals.calories,
                  foodLogCount: foodLogs.length,
                }
              };
            });
            
            // Wait for all dates data to be fetched
            const allDatesResults = await Promise.all(allDataPromises);
            
            // Convert to object keyed by date string
            const datesDataMap: { [key: string]: { steps: number; exerciseMinutes: number; exerciseCalories: number; foodLogCount: number } } = {};
            allDatesResults.forEach(result => {
              datesDataMap[result.dateString] = result.data;
            });
            setAllDatesData(datesDataMap);
            
            // Fetch upcoming nursing visits
            const nursingVisits = await nursingVisitService.getUpcoming(coupleId);
            setUpcomingNursingVisits(nursingVisits);
            
            // Fetch recent broadcasts (last 7 days)
            const recentBroadcasts = await broadcastService.getRecent(7);
            setBroadcasts(recentBroadcasts);
            
            // Initialize streak from historical logs
            const streak = await coupleService.initializeStreak(coupleId, userGender as 'male' | 'female');
            setStreakData(streak);
          } else {
            // Fallback to basic data
            setUserData({
              name: userName || 'User',
              coupleId: '',
              userId: userId || '',
              userGender: 'male',
              profileImage: null,
              unreadNotifications: 0,
            });
          }
        } catch (error) {
          console.error('Error loading data:', error);
          // Set fallback user data on error
          setUserData({
            name: 'User',
            coupleId: '',
            userId: '',
            userGender: 'male',
            profileImage: null,
            unreadNotifications: 0,
          });
        } finally {
          setIsLoading(false);
        }
      };
      
      loadAllData();
    }, [])
  );

  // Get progress data based on selected date
  const todayProgress = getProgressDataForDate();

  // Helper function to format time ago
  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return 'Recently';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
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

  // Today's Tips data
  const todaysTips = [
    { id: 1, icon: 'water', color: '#06b6d4', tip: 'Stay hydrated! Drink at least 8 glasses of water today.' },
    { id: 2, icon: 'walk', color: '#22c55e', tip: 'A 30-minute walk with your partner can boost your mood and health.' },
    { id: 3, icon: 'nutrition', color: '#f59e0b', tip: 'Include more leafy greens and fruits in your meals today.' },
    { id: 4, icon: 'bed', color: '#8b5cf6', tip: 'Aim for 7-8 hours of quality sleep for better fertility.' },
    { id: 5, icon: 'heart', color: '#ef4444', tip: 'Practice deep breathing exercises to reduce stress levels.' },
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
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    };
    // Use the selected date from the date selector
    const selectedDate = dates[selectedDateIndex]?.date || new Date();
    return selectedDate.toLocaleDateString('en-US', options);
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
          <Text style={[styles.stepsLabel, { color: colors.textSecondary }]}>Steps</Text>
        </View>
      </View>
    );
  };

  // Show skeleton while loading
  if (isLoading || !userData) {
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
                {userData.profileImage ? (
                  <Image source={{ uri: userData.profileImage }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: '#006dab' }]}>
                    <Text style={styles.avatarText}>
                      {userData.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <View>
                <Text style={[styles.greeting, { color: colors.text }]}>
                  Hello, {userData.name}! 👋
                </Text>
                <Text style={[styles.coupleId, { color: colors.textSecondary }]}>
                  Couple ID: {userData.coupleId}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.notificationButton, { backgroundColor: isDarkMode ? '#2d3748' : '#f1f5f9' }]}
              onPress={openNotificationSidebar}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications-outline" size={22} color={colors.text} />
              {userData.unreadNotifications > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{userData.unreadNotifications}</Text>
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
                  {item.weekday}
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
                  Goal: {todayProgress.steps.target.toLocaleString()} steps
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
                <Text style={styles.logStepsButtonText}>Log Step Count</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Actions - Only show for today */}
          {isSelectedDateToday && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
              <View style={styles.quickActionsRow}>
                <TouchableOpacity
                  style={[styles.quickActionCard, { backgroundColor: colors.cardBackground }]}
                  onPress={() => router.push('/user/log-food' as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: isDarkMode ? '#1a3329' : '#e8f5d6' }]}>
                    <Ionicons name="restaurant" size={22} color="#98be4e" />
                  </View>
                  <Text style={[styles.quickActionLabel, { color: colors.text }]}>Log Food</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickActionCard, { backgroundColor: colors.cardBackground }]}
                  onPress={() => router.push('/user/log-exercise' as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: isDarkMode ? '#1a2d3d' : '#e0f2fe' }]}>
                    <Ionicons name="fitness" size={22} color="#006dab" />
                  </View>
                  <Text style={[styles.quickActionLabel, { color: colors.text }]}>Log Exercise</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickActionCard, { backgroundColor: colors.cardBackground }]}
                  onPress={() => router.push('/user/log-weight' as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: isDarkMode ? '#2d2a1a' : '#fef3c7' }]}>
                    <Ionicons name="scale" size={22} color="#f59e0b" />
                  </View>
                  <Text style={[styles.quickActionLabel, { color: colors.text }]}>Log Weight</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Activity Section - Shows data for selected date */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {isSelectedDateToday ? "Today's Activity" : `${dates[selectedDateIndex]?.weekday} ${dates[selectedDateIndex]?.day} Activity`}
          </Text>
          <View style={styles.activityGrid}>
            {/* Exercise Minutes */}
            <View style={[styles.activityCard, { backgroundColor: colors.cardBackground }]}>
              <View style={[styles.activityIconContainer, { backgroundColor: isDarkMode ? '#1a2d3d' : '#e0f2fe' }]}>
                <Ionicons name="fitness" size={24} color="#006dab" />
              </View>
              <View style={styles.activityInfo}>
                <Text style={[styles.activityValue, { color: colors.text }]}>
                  {todayProgress.exerciseMinutes}
                  <Text style={[styles.activityUnit, { color: colors.textSecondary }]}> min</Text>
                </Text>
                <Text style={[styles.activityLabel, { color: colors.textSecondary }]}>
                  Exercise {!todayProgress.exerciseGoalMet && `/ ${todayProgress.exerciseGoal}m`}
                </Text>
              </View>
              {todayProgress.exerciseGoalMet && (
                <View style={styles.goalMetBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#98be4e" />
                </View>
              )}
            </View>

            {/* Food Logged */}
            <View style={[styles.activityCard, { backgroundColor: colors.cardBackground }]}>
              <View style={[styles.activityIconContainer, { backgroundColor: isDarkMode ? '#1a3329' : '#e8f5d6' }]}>
                <Ionicons name="restaurant" size={24} color="#98be4e" />
              </View>
              <View style={styles.activityInfo}>
                <Text style={[styles.activityValue, { color: colors.text }]}>
                  {todayProgress.foodLogged}
                  <Text style={[styles.activityUnit, { color: colors.textSecondary }]}> meals</Text>
                </Text>
                <Text style={[styles.activityLabel, { color: colors.textSecondary }]}>Food Logged</Text>
              </View>
            </View>

            {/* Calories Burnt */}
            <View style={[styles.activityCard, { backgroundColor: colors.cardBackground }]}>
              <View style={[styles.activityIconContainer, { backgroundColor: isDarkMode ? '#2d1f1f' : '#fee2e2' }]}>
                <Ionicons name="flame" size={24} color="#ef4444" />
              </View>
              <View style={styles.activityInfo}>
                <Text style={[styles.activityValue, { color: colors.text }]}>
                  {todayProgress.caloriesBurnt}
                  <Text style={[styles.activityUnit, { color: colors.textSecondary }]}> kcal</Text>
                </Text>
                <Text style={[styles.activityLabel, { color: colors.textSecondary }]}>
                  Calories Burnt {!todayProgress.caloriesGoalMet && `/ ${todayProgress.caloriesGoal}`}
                </Text>
              </View>
              {todayProgress.caloriesGoalMet && (
                <View style={styles.goalMetBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#98be4e" />
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
                <MaterialCommunityIcons name="food-variant" size={24} color="#f59e0b" />
              </View>
              <View style={styles.activityInfo}>
                <Text style={[styles.activityValue, { color: colors.text }]}>Diet Plan</Text>
                <Text style={[styles.activityLabel, { color: colors.textSecondary }]}>View</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} style={styles.activityArrow} />
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
                  Day Streak
                </Text>
                <Text style={[styles.streakMotivation, { color: colors.textSecondary }]}>
                  {streakData.currentStreak === 0 
                    ? "Log today to start your streak!" 
                    : streakData.currentStreak === 1 
                      ? "Great start! Keep it going!" 
                      : `${streakData.currentStreak} days of healthy logging!`}
                </Text>
              </View>
            </View>
            
            {streakData.longestStreak > 0 && streakData.longestStreak > streakData.currentStreak && (
              <View style={[styles.bestStreakRow, { borderTopColor: colors.borderLight }]}>
                <Text style={[styles.bestStreakLabel, { color: colors.textSecondary }]}>Best Streak:</Text>
                <Text style={[styles.bestStreakValue, { color: colors.primary }]}>{streakData.longestStreak} days 🏅</Text>
              </View>
            )}
          </View>

          {/* Today's Tip Card */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Tip</Text>
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

          {/* Upcoming Nursing Department Visits */}
          {upcomingNursingVisits.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming Nursing Visits</Text>
              <View style={styles.nursingVisitsContainer}>
                {upcomingNursingVisits.slice(0, 3).map((visit, index) => {
                  const visitDate = new Date(visit.date);
                  const dayName = visitDate.toLocaleDateString('en-US', { weekday: 'short' });
                  const monthName = visitDate.toLocaleDateString('en-US', { month: 'short' });
                  const dayNum = visitDate.getDate();
                  
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
                          {visit.purpose || 'Nursing Department Visit'}
                        </Text>
                        <View style={styles.nursingVisitMeta}>
                          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                          <Text style={[styles.nursingVisitTime, { color: colors.textSecondary }]}>
                            {visit.time} • {dayName}
                          </Text>
                        </View>
                        {visit.visitNumber && (
                          <View style={styles.nursingVisitBadge}>
                            <Text style={styles.nursingVisitBadgeText}>Visit #{visit.visitNumber}</Text>
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
                    <Text style={styles.viewAllText}>View all {upcomingNursingVisits.length} visits</Text>
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
            <Text style={[styles.sidebarTitle, { color: colors.text }]}>Reminders</Text>
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
                No new reminders
              </Text>
              <Text style={[styles.emptyNotificationsSubtext, { color: colors.textSecondary }]}>
                Announcements from admins will appear here
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
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
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
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: {
    flex: 1,
  },
  activityValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  activityUnit: {
    fontSize: 14,
    fontWeight: '500',
  },
  activityLabel: {
    fontSize: 12,
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 100,
  },
  notificationSidebar: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 300,
    zIndex: 101,
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
});
