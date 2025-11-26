import BottomNavBar from '@/components/navigation/BottomNavBar';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
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

const isWeb = Platform.OS === 'web';

export default function UserHomeScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const { colors } = useTheme();
  
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const toastAnim = useRef(new Animated.Value(-100)).current;

  // Mock user data
  const userData = {
    name: 'Priya',
    coupleId: 'C_001',
    gender: 'female',
    profileImage: null,
    unreadNotifications: 3,
  };

  // Mock daily progress data
  const dailyProgress = {
    steps: { current: 4520, target: 7000 },
    exercisesLogged: 2,
    mealsLogged: 4,
    waterIntake: 5,
    lastWeightEntry: '2 days ago',
  };

  // Mock weekly progress
  const weeklyProgress = {
    stepsProgress: 65,
    exerciseProgress: 72,
    nutritionProgress: 80,
    weightProgress: 45,
  };

  const showToast = (message: string, type: 'error' | 'success' | 'info') => {
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

  const quickActions = [
    { 
      id: 'food', 
      icon: 'restaurant-outline', 
      label: 'Log Food', 
      colors: ['#22c55e', '#16a34a'],
      route: '/user/log-food'
    },
    { 
      id: 'exercise', 
      icon: 'fitness-outline', 
      label: 'Log Exercise', 
      colors: ['#3b82f6', '#2563eb'],
      route: '/user/log-exercise'
    },
    { 
      id: 'weight', 
      icon: 'scale-outline', 
      label: 'Log Weight', 
      colors: ['#f59e0b', '#d97706'],
      route: '/user/log-weight'
    },
    { 
      id: 'appointment', 
      icon: 'calendar-outline', 
      label: 'Appointment', 
      colors: ['#8b5cf6', '#7c3aed'],
      route: '/user/appointments'
    },
  ];

  const formatDate = () => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date().toLocaleDateString('en-US', options);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {toast.visible && (
        <Animated.View
          style={[
            styles.toast,
            { backgroundColor: colors.cardBackground },
            toast.type === 'error' ? styles.toastError : 
            toast.type === 'success' ? styles.toastSuccess : styles.toastInfo,
            { transform: [{ translateY: toastAnim }] }
          ]}
        >
          <View style={styles.toastContent}>
            <Text style={[styles.toastIcon, { color: colors.text }]}>
              {toast.type === 'error' ? '✗' : toast.type === 'success' ? '✓' : 'ℹ'}
            </Text>
            <Text style={[styles.toastText, { color: colors.text }]}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarContainer}>
                {userData.profileImage ? (
                  <Image source={{ uri: userData.profileImage }} style={styles.avatar} />
                ) : (
                  <LinearGradient
                    colors={['#006dab', '#005a8f']}
                    style={styles.avatarPlaceholder}
                  >
                    <Text style={styles.avatarText}>
                      {userData.name.charAt(0).toUpperCase()}
                    </Text>
                  </LinearGradient>
                )}
              </View>
              <View>
                <Text style={styles.greeting}>Hello, {userData.name}! 👋</Text>
                <Text style={styles.coupleId}>Couple ID: {userData.coupleId}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => router.push('/user/notifications' as any)}
            >
              <Ionicons name="notifications-outline" size={24} color="#0f172a" />
              {userData.unreadNotifications > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {userData.unreadNotifications}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.dateText}>{formatDate()}</Text>
        </View>

        <View style={[styles.content, isMobile && styles.contentMobile]}>
          {/* Today's Progress Overview */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Progress</Text>
            <View style={styles.progressOverview}>
              {/* Steps Card */}
              <View style={styles.progressCard}>
                <View style={styles.progressCardHeader}>
                  <MaterialCommunityIcons name="shoe-print" size={24} color="#22c55e" />
                  <Text style={styles.progressCardTitle}>Steps</Text>
                </View>
                <View style={styles.circularProgressContainer}>
                  <View style={styles.circularProgressBg}>
                    <View 
                      style={[
                        styles.circularProgressFill, 
                        { 
                          transform: [{ rotate: `${(dailyProgress.steps.current / dailyProgress.steps.target) * 180}deg` }]
                        }
                      ]} 
                    />
                  </View>
                  <View style={styles.circularProgressText}>
                    <Text style={styles.progressValue}>{dailyProgress.steps.current.toLocaleString()}</Text>
                    <Text style={styles.progressTarget}>/ {dailyProgress.steps.target.toLocaleString()}</Text>
                  </View>
                </View>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { width: `${Math.min(100, (dailyProgress.steps.current / dailyProgress.steps.target) * 100)}%` }
                    ]} 
                  />
                </View>
              </View>

              {/* Other Progress Items */}
              <View style={styles.miniProgressGrid}>
                <View style={styles.miniProgressCard}>
                  <MaterialCommunityIcons name="dumbbell" size={20} color="#3b82f6" />
                  <Text style={styles.miniProgressValue}>{dailyProgress.exercisesLogged}</Text>
                  <Text style={styles.miniProgressLabel}>Exercises</Text>
                </View>
                <View style={styles.miniProgressCard}>
                  <MaterialCommunityIcons name="food-apple-outline" size={20} color="#f59e0b" />
                  <Text style={styles.miniProgressValue}>{dailyProgress.mealsLogged}</Text>
                  <Text style={styles.miniProgressLabel}>Meals</Text>
                </View>
                <View style={styles.miniProgressCard}>
                  <MaterialCommunityIcons name="cup-water" size={20} color="#06b6d4" />
                  <Text style={styles.miniProgressValue}>{dailyProgress.waterIntake}</Text>
                  <Text style={styles.miniProgressLabel}>Glasses</Text>
                </View>
                <View style={styles.miniProgressCard}>
                  <MaterialCommunityIcons name="scale-bathroom" size={20} color="#8b5cf6" />
                  <Text style={styles.miniProgressValue}>✓</Text>
                  <Text style={styles.miniProgressLabel}>{dailyProgress.lastWeightEntry}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              {quickActions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={styles.quickActionCard}
                  onPress={() => router.push(action.route as any)}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={action.colors as [string, string]}
                    style={styles.quickActionGradient}
                  >
                    <Ionicons name={action.icon as any} size={32} color="#ffffff" />
                  </LinearGradient>
                  <Text style={styles.quickActionLabel}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Goal Tracking Cards */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Weekly Goals</Text>
              <TouchableOpacity onPress={() => router.push('/user/progress' as any)}>
                <Text style={styles.seeAllText}>See All →</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.goalsGrid}>
              {/* Step Goal Card */}
              <View style={styles.goalCard}>
                <View style={[styles.goalCardAccent, { backgroundColor: '#22c55e' }]} />
                <View style={styles.goalCardContent}>
                  <View style={styles.goalCardHeader}>
                    <Text style={styles.goalCardTitle}>Step Goal</Text>
                    <View style={[styles.goalBadge, { backgroundColor: '#dcfce7' }]}>
                      <Text style={[styles.goalBadgeText, { color: '#22c55e' }]}>
                        {weeklyProgress.stepsProgress}%
                      </Text>
                    </View>
                  </View>
                  <View style={styles.goalProgressBar}>
                    <View 
                      style={[
                        styles.goalProgressFill, 
                        { width: `${weeklyProgress.stepsProgress}%`, backgroundColor: '#22c55e' }
                      ]} 
                    />
                  </View>
                  <Text style={styles.goalCardSubtext}>7,000 steps/day target</Text>
                </View>
              </View>

              {/* Exercise Goal Card */}
              <View style={styles.goalCard}>
                <View style={[styles.goalCardAccent, { backgroundColor: '#3b82f6' }]} />
                <View style={styles.goalCardContent}>
                  <View style={styles.goalCardHeader}>
                    <Text style={styles.goalCardTitle}>Exercise</Text>
                    <View style={[styles.goalBadge, { backgroundColor: '#dbeafe' }]}>
                      <Text style={[styles.goalBadgeText, { color: '#3b82f6' }]}>
                        {weeklyProgress.exerciseProgress}%
                      </Text>
                    </View>
                  </View>
                  <View style={styles.goalProgressBar}>
                    <View 
                      style={[
                        styles.goalProgressFill, 
                        { width: `${weeklyProgress.exerciseProgress}%`, backgroundColor: '#3b82f6' }
                      ]} 
                    />
                  </View>
                  <Text style={styles.goalCardSubtext}>270 mins/week target</Text>
                </View>
              </View>

              {/* Nutrition Goal Card */}
              <View style={styles.goalCard}>
                <View style={[styles.goalCardAccent, { backgroundColor: '#f59e0b' }]} />
                <View style={styles.goalCardContent}>
                  <View style={styles.goalCardHeader}>
                    <Text style={styles.goalCardTitle}>Nutrition</Text>
                    <View style={[styles.goalBadge, { backgroundColor: '#fef3c7' }]}>
                      <Text style={[styles.goalBadgeText, { color: '#f59e0b' }]}>
                        {weeklyProgress.nutritionProgress}%
                      </Text>
                    </View>
                  </View>
                  <View style={styles.goalProgressBar}>
                    <View 
                      style={[
                        styles.goalProgressFill, 
                        { width: `${weeklyProgress.nutritionProgress}%`, backgroundColor: '#f59e0b' }
                      ]} 
                    />
                  </View>
                  <Text style={styles.goalCardSubtext}>Daily logging goal</Text>
                </View>
              </View>

              {/* Weight Goal Card */}
              <View style={styles.goalCard}>
                <View style={[styles.goalCardAccent, { backgroundColor: '#8b5cf6' }]} />
                <View style={styles.goalCardContent}>
                  <View style={styles.goalCardHeader}>
                    <Text style={styles.goalCardTitle}>Weight Loss</Text>
                    <View style={[styles.goalBadge, { backgroundColor: '#f3e8ff' }]}>
                      <Text style={[styles.goalBadgeText, { color: '#8b5cf6' }]}>
                        {weeklyProgress.weightProgress}%
                      </Text>
                    </View>
                  </View>
                  <View style={styles.goalProgressBar}>
                    <View 
                      style={[
                        styles.goalProgressFill, 
                        { width: `${weeklyProgress.weightProgress}%`, backgroundColor: '#8b5cf6' }
                      ]} 
                    />
                  </View>
                  <Text style={styles.goalCardSubtext}>5% weight loss goal</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Recent Notifications */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Notifications</Text>
              <TouchableOpacity onPress={() => router.push('/user/notifications' as any)}>
                <Text style={styles.seeAllText}>See All →</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.notificationsCard}>
              <View style={styles.notificationItem}>
                <View style={[styles.notificationDot, { backgroundColor: '#22c55e' }]} />
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle}>🎉 Great job!</Text>
                  <Text style={styles.notificationMessage}>
                    You achieved your step goal yesterday!
                  </Text>
                  <Text style={styles.notificationTime}>2 hours ago</Text>
                </View>
              </View>
              <View style={styles.notificationDivider} />
              <View style={styles.notificationItem}>
                <View style={[styles.notificationDot, { backgroundColor: '#3b82f6' }]} />
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle}>📋 Reminder</Text>
                  <Text style={styles.notificationMessage}>
                    Don't forget to log your lunch today
                  </Text>
                  <Text style={styles.notificationTime}>5 hours ago</Text>
                </View>
              </View>
              <View style={styles.notificationDivider} />
              <View style={styles.notificationItem}>
                <View style={[styles.notificationDot, { backgroundColor: '#f59e0b' }]} />
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle}>📅 Upcoming</Text>
                  <Text style={styles.notificationMessage}>
                    Nursing counselling session tomorrow at 10 AM
                  </Text>
                  <Text style={styles.notificationTime}>1 day ago</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Couple Progress Widget */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Couple Journey</Text>
            <TouchableOpacity 
              style={styles.coupleCard}
              onPress={() => showToast('Partner view coming soon!', 'info')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#006dab', '#005a8f']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.coupleCardGradient}
              >
                <View style={styles.coupleCardContent}>
                  <View style={styles.coupleAvatars}>
                    <View style={styles.coupleAvatar}>
                      <Text style={styles.coupleAvatarText}>P</Text>
                    </View>
                    <View style={[styles.coupleAvatar, styles.coupleAvatarSecond]}>
                      <Text style={styles.coupleAvatarText}>R</Text>
                    </View>
                  </View>
                  <View style={styles.coupleInfo}>
                    <Text style={styles.coupleTitle}>Track Together</Text>
                    <Text style={styles.coupleSubtext}>
                      You and your partner are making progress!
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#ffffff" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      
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
  toastError: { borderLeftColor: '#ef4444' },
  toastSuccess: { borderLeftColor: '#98be4e' },
  toastInfo: { borderLeftColor: '#3b82f6' },
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
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: isWeb ? 24 : 50,
    paddingBottom: 20,
    paddingHorizontal: isWeb ? 40 : 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  greeting: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  coupleId: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
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
    fontSize: 14,
    color: '#94a3b8',
  },
  content: {
    padding: isWeb ? 40 : 20,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  contentMobile: {
    padding: 16,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#006dab',
  },
  progressOverview: {
    gap: 16,
  },
  progressCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  progressCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  progressCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  circularProgressContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  circularProgressBg: {
    width: 120,
    height: 60,
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  circularProgressFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 120,
    height: 60,
    backgroundColor: '#22c55e',
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    transformOrigin: 'center bottom',
  },
  circularProgressText: {
    position: 'absolute',
    bottom: 10,
    alignItems: 'center',
  },
  progressValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
  },
  progressTarget: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 4,
  },
  miniProgressGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  miniProgressCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  miniProgressValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 8,
  },
  miniProgressLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 4,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  quickActionCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  quickActionGradient: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  goalsGrid: {
    gap: 12,
  },
  goalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  goalCardAccent: {
    width: 4,
  },
  goalCardContent: {
    flex: 1,
    padding: 16,
  },
  goalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  goalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  goalBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  goalProgressBar: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  goalCardSubtext: {
    fontSize: 13,
    color: '#64748b',
  },
  notificationsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
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
  notificationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  notificationDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  coupleCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#006dab',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  coupleCardGradient: {
    padding: 20,
  },
  coupleCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  coupleAvatars: {
    flexDirection: 'row',
  },
  coupleAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  coupleAvatarSecond: {
    marginLeft: -16,
  },
  coupleAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  coupleInfo: {
    flex: 1,
  },
  coupleTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  coupleSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
});
