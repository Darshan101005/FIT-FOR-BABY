import { coupleExerciseService, coupleFoodLogService, coupleService, coupleStepsService, coupleWeightLogService } from '@/services/firestore.service';
import { Couple } from '@/types/firebase.types';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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

// Shimmer/Skeleton Component
const SkeletonBox = ({ width, height, style, borderRadius = 8 }: { 
  width: number | string; 
  height: number; 
  style?: any;
  borderRadius?: number;
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: COLORS.border,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

// Fit for Baby Color Palette
const COLORS = {
  primary: '#006dab',
  primaryDark: '#005a8f',
  primaryLight: '#0088d4',
  accent: '#98be4e',
  accentDark: '#7da33e',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  background: '#f8fafc',
  surface: '#ffffff',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
};

// Interface for dashboard statistics
interface DashboardStats {
  totalCouples: number;
  totalUsers: number;
  activeCouples: number;
  inactiveCouples: number;
  todayCompliance: number;
  logsNotCompletedCount: number;
  stepsCompliance: number;
  dietCompliance: number;
  exerciseCompliance: number;
  weightCompliance: number;
}

// Interface for couples with missing logs
interface CoupleWithMissingLogs {
  id: string;
  coupleId: string;
  maleName: string;
  femaleName: string;
  lastLog: string;
  reason: string;
}

// Quick Action Cards Data
const quickActions = [
  {
    id: 'add-users',
    title: 'Add New Users',
    subtitle: 'Enroll new couple',
    icon: 'person-add',
    iconFamily: 'Ionicons',
    colors: ['#006dab', '#0088d4'] as [string, string],
    route: '/admin/users?action=enroll',
  },
  {
    id: 'view-users',
    title: 'View Existing Users',
    subtitle: 'Manage user profiles',
    icon: 'people',
    iconFamily: 'Ionicons',
    colors: ['#98be4e', '#7da33e'] as [string, string],
    route: '/admin/users',
  },
  {
    id: 'upload-task',
    title: 'Task and Goals',
    subtitle: 'Set goals & content',
    icon: 'cloud-upload',
    iconFamily: 'Ionicons',
    colors: ['#f59e0b', '#d97706'] as [string, string],
    route: '/admin/tasks',
  },
  {
    id: 'task-status',
    title: 'Task Completion',
    subtitle: 'View compliance status',
    icon: 'checkmark-done-circle',
    iconFamily: 'Ionicons',
    colors: ['#8b5cf6', '#7c3aed'] as [string, string],
    route: '/admin/monitoring',
  },
];

export default function AdminHomeScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1024;
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [adminName, setAdminName] = useState('Admin');
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalCouples: 0,
    totalUsers: 0,
    activeCouples: 0,
    inactiveCouples: 0,
    todayCompliance: 0,
    logsNotCompletedCount: 0,
    stepsCompliance: 0,
    dietCompliance: 0,
    exerciseCompliance: 0,
    weightCompliance: 0,
  });
  const [logsNotCompletedCouples, setLogsNotCompletedCouples] = useState<CoupleWithMissingLogs[]>([]);

  // Format date as YYYY-MM-DD
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const today = formatDate(new Date());
      
      // Fetch all couples
      const couples = await coupleService.getAll() as Couple[];
      const totalCouples = couples.length;
      const totalUsers = totalCouples * 2; // Each couple has 2 users
      const activeCouples = couples.filter(c => c.status === 'active').length;
      const inactiveCouples = couples.filter(c => c.status === 'inactive').length;

      // Calculate compliance for today
      let stepsLogged = 0;
      let dietLogged = 0;
      let exerciseLogged = 0;
      let weightLogged = 0;
      const totalChecks = activeCouples * 2; // Check both male and female for each active couple

      const couplesWithMissingLogs: CoupleWithMissingLogs[] = [];

      // Check logs for each active couple
      for (const couple of couples.filter(c => c.status === 'active')) {
        let coupleMissingLogs: string[] = [];
        
        // Check both male and female
        for (const gender of ['male', 'female'] as const) {
          try {
            // Check steps
            const steps = await coupleStepsService.getByDate(couple.coupleId, gender, today);
            if (steps && steps.length > 0) {
              stepsLogged++;
            } else {
              if (!coupleMissingLogs.includes('steps')) coupleMissingLogs.push('steps');
            }

            // Check diet/food logs
            const foodLogs = await coupleFoodLogService.getByDate(couple.coupleId, gender, today);
            if (foodLogs && foodLogs.length > 0) {
              dietLogged++;
            } else {
              if (!coupleMissingLogs.includes('diet')) coupleMissingLogs.push('diet');
            }

            // Check exercise
            const exerciseLogs = await coupleExerciseService.getByDate(couple.coupleId, gender, today);
            if (exerciseLogs && exerciseLogs.length > 0) {
              exerciseLogged++;
            } else {
              if (!coupleMissingLogs.includes('exercise')) coupleMissingLogs.push('exercise');
            }

            // Check weight (weekly, so check if logged in last 7 days)
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const weightLogs = await coupleWeightLogService.getByDateRange(
              couple.coupleId, 
              gender, 
              formatDate(weekAgo), 
              today
            );
            if (weightLogs && weightLogs.length > 0) {
              weightLogged++;
            } else {
              if (!coupleMissingLogs.includes('weight')) coupleMissingLogs.push('weight');
            }
          } catch (error) {
            console.error(`Error checking logs for ${couple.coupleId} ${gender}:`, error);
          }
        }

        // Add to missing logs list if any logs are missing
        if (coupleMissingLogs.length > 0) {
          const reasonMap: Record<string, string> = {
            'steps': 'Missing steps',
            'diet': 'No diet log',
            'exercise': 'No exercise',
            'weight': 'No weight update',
          };
          couplesWithMissingLogs.push({
            id: couple.coupleId,
            coupleId: couple.coupleId,
            maleName: couple.male?.name || 'N/A',
            femaleName: couple.female?.name || 'N/A',
            lastLog: 'Today',
            reason: reasonMap[coupleMissingLogs[0]] || 'Missing logs',
          });
        }
      }

      // Calculate percentages
      const stepsCompliance = totalChecks > 0 ? Math.round((stepsLogged / totalChecks) * 100) : 0;
      const dietCompliance = totalChecks > 0 ? Math.round((dietLogged / totalChecks) * 100) : 0;
      const exerciseCompliance = totalChecks > 0 ? Math.round((exerciseLogged / totalChecks) * 100) : 0;
      const weightCompliance = totalChecks > 0 ? Math.round((weightLogged / totalChecks) * 100) : 0;
      
      // Overall compliance (average of all)
      const todayCompliance = Math.round((stepsCompliance + dietCompliance + exerciseCompliance + weightCompliance) / 4);

      setDashboardStats({
        totalCouples,
        totalUsers,
        activeCouples,
        inactiveCouples,
        todayCompliance,
        logsNotCompletedCount: couplesWithMissingLogs.length,
        stepsCompliance,
        dietCompliance,
        exerciseCompliance,
        weightCompliance,
      });

      // Sort by most missing logs and take top 4
      setLogsNotCompletedCouples(couplesWithMissingLogs.slice(0, 4));

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSuperAdminStatus();
    loadAdminName();
  }, []);

  // Load dashboard data when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const checkSuperAdminStatus = async () => {
    try {
      const superAdminFlag = await AsyncStorage.getItem('isSuperAdmin');
      setIsSuperAdmin(superAdminFlag === 'true');
    } catch (error) {
      console.error('Error checking super admin status:', error);
    }
  };

  const loadAdminName = async () => {
    try {
      const name = await AsyncStorage.getItem('adminName');
      if (name) {
        setAdminName(name);
      }
    } catch (error) {
      console.error('Error loading admin name:', error);
    }
  };

  const handleQuickAction = (route: string) => {
    router.push(route as any);
  };

  // Header Section
  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.userName}>{adminName}</Text>
      </View>
      <View style={styles.headerRight}>
        {isSuperAdmin && (
          <TouchableOpacity 
            style={styles.superAdminButton}
            onPress={() => router.push('/admin/manage-admins' as any)}
          >
            <Ionicons name="shield-checkmark" size={18} color="#fff" />
            {!isMobile && <Text style={styles.superAdminButtonText}>Manage Admins</Text>}
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="search" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="notifications-outline" size={22} color={COLORS.textSecondary} />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Quick Actions Section (4 prominent cards)
  const renderQuickActions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={[styles.quickActionsGrid, isMobile && styles.quickActionsGridMobile]}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[styles.quickActionCard, isMobile && styles.quickActionCardMobile]}
            onPress={() => handleQuickAction(action.route)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={action.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.quickActionGradient}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name={action.icon as any} size={28} color="#fff" />
              </View>
              <View style={styles.quickActionContent}>
                <Text style={styles.quickActionTitle}>{action.title}</Text>
                <Text style={styles.quickActionSubtitle}>{action.subtitle}</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.8)" />
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Skeleton Stat Card
  const renderSkeletonStatCard = () => (
    <View style={[styles.statCard, isMobile && styles.statCardMobile]}>
      <SkeletonBox width={isMobile ? 36 : 44} height={isMobile ? 36 : 44} borderRadius={12} />
      <SkeletonBox width={60} height={isMobile ? 24 : 32} style={{ marginTop: 12 }} />
      <SkeletonBox width={80} height={14} style={{ marginTop: 6 }} />
      <SkeletonBox width={50} height={12} style={{ marginTop: 4 }} />
    </View>
  );

  // Skeleton Compliance Card
  const renderSkeletonComplianceCard = () => (
    <View style={[styles.complianceCard, isMobile && styles.complianceCardMobile]}>
      <View style={styles.complianceChart}>
        <View style={styles.donutContainer}>
          <SkeletonBox width={isMobile ? 120 : 140} height={isMobile ? 120 : 140} borderRadius={70} />
        </View>
      </View>
      <View style={styles.complianceBreakdown}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.complianceItem}>
            <SkeletonBox width={10} height={10} borderRadius={5} />
            <SkeletonBox width={100} height={14} style={{ marginLeft: 10, flex: 1 }} />
            <SkeletonBox width={40} height={14} />
          </View>
        ))}
      </View>
    </View>
  );

  // Skeleton Alert Card
  const renderSkeletonAlertCard = (index: number) => (
    <View key={index} style={[styles.alertCard, isMobile && styles.alertCardMobile, index === 3 && styles.alertCardLast]}>
      <View style={[styles.alertLeft, isMobile && styles.alertLeftMobile]}>
        <View style={styles.coupleAvatars}>
          <SkeletonBox width={28} height={28} borderRadius={8} />
          <SkeletonBox width={28} height={28} borderRadius={8} style={{ marginLeft: -8 }} />
        </View>
        <View style={[styles.alertInfo, { flex: 1, minWidth: 0 }]}>
          <SkeletonBox width={50} height={14} />
          <SkeletonBox width={120} height={12} style={{ marginTop: 4 }} />
        </View>
      </View>
      <View style={[styles.alertRight, isMobile && styles.alertRightMobile]}>
        <SkeletonBox width={70} height={20} borderRadius={6} />
        <SkeletonBox width={50} height={11} style={{ marginTop: 4 }} />
      </View>
    </View>
  );

  // Stats Overview Section
  const renderStatsOverview = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Study Overview</Text>
      </View>
      {isLoading ? (
        <View style={[styles.statsGrid, isMobile && styles.statsGridMobile]}>
          {[1, 2, 3, 4].map((i) => (
            <React.Fragment key={i}>{renderSkeletonStatCard()}</React.Fragment>
          ))}
        </View>
      ) : (
        <View style={[styles.statsGrid, isMobile && styles.statsGridMobile]}>
          <View style={[styles.statCard, isMobile && styles.statCardMobile]}>
            <View style={[styles.statIconBg, { backgroundColor: COLORS.primary + '15' }, isMobile && styles.statIconBgMobile]}>
              <MaterialCommunityIcons name="account-group" size={isMobile ? 20 : 24} color={COLORS.primary} />
            </View>
            <Text style={[styles.statValue, isMobile && styles.statValueMobile]}>{dashboardStats.totalCouples}</Text>
            <Text style={[styles.statLabel, isMobile && styles.statLabelMobile]}>Total Couples</Text>
            <Text style={[styles.statSubLabel, isMobile && styles.statSubLabelMobile]}>{dashboardStats.totalUsers} Users</Text>
          </View>
          
          <View style={[styles.statCard, isMobile && styles.statCardMobile]}>
            <View style={[styles.statIconBg, { backgroundColor: COLORS.accent + '25' }, isMobile && styles.statIconBgMobile]}>
              <MaterialCommunityIcons name="flask" size={isMobile ? 20 : 24} color={COLORS.accentDark} />
            </View>
            <Text style={[styles.statValue, isMobile && styles.statValueMobile]}>{dashboardStats.activeCouples}</Text>
            <Text style={[styles.statLabel, isMobile && styles.statLabelMobile]}>Active Couples</Text>
            <Text style={[styles.statSubLabel, isMobile && styles.statSubLabelMobile]}>{dashboardStats.inactiveCouples} Inactive</Text>
          </View>
          
          <View style={[styles.statCard, isMobile && styles.statCardMobile]}>
            <View style={[styles.statIconBg, { backgroundColor: COLORS.success + '15' }, isMobile && styles.statIconBgMobile]}>
              <Ionicons name="checkmark-circle" size={isMobile ? 20 : 24} color={COLORS.success} />
            </View>
            <Text style={[styles.statValue, isMobile && styles.statValueMobile]}>{dashboardStats.todayCompliance}%</Text>
            <Text style={[styles.statLabel, isMobile && styles.statLabelMobile]}>Today's Compliance</Text>
            <Text style={[styles.statSubLabel, isMobile && styles.statSubLabelMobile]}>Logs completed</Text>
          </View>
          
          <View style={[styles.statCard, isMobile && styles.statCardMobile]}>
            <View style={[styles.statIconBg, { backgroundColor: COLORS.error + '15' }, isMobile && styles.statIconBgMobile]}>
              <Ionicons name="alert-circle" size={isMobile ? 20 : 24} color={COLORS.error} />
            </View>
            <Text style={[styles.statValue, isMobile && styles.statValueMobile]}>{dashboardStats.logsNotCompletedCount}</Text>
            <Text style={[styles.statLabel, isMobile && styles.statLabelMobile]}>Logs Pending</Text>
            <Text style={[styles.statSubLabel, isMobile && styles.statSubLabelMobile]}>Need attention</Text>
          </View>
        </View>
      )}
    </View>
  );

  // Today's Compliance Snapshot
  const renderComplianceSnapshot = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today's Compliance Snapshot</Text>
        <TouchableOpacity onPress={() => router.push('/admin/monitoring' as any)}>
          <Text style={styles.viewAllLink}>View All</Text>
        </TouchableOpacity>
      </View>
      
      {isLoading ? (
        renderSkeletonComplianceCard()
      ) : (
        <View style={[styles.complianceCard, isMobile && styles.complianceCardMobile]}>
          <View style={styles.complianceChart}>
            {/* Simple Donut Chart Representation */}
            <View style={styles.donutContainer}>
              <View style={[styles.donutOuter, isMobile && styles.donutOuterMobile]}>
                <View style={[
                  styles.donutProgress,
                  isMobile && styles.donutProgressMobile,
                  { 
                    borderTopColor: COLORS.success,
                    borderRightColor: COLORS.success,
                    borderBottomColor: dashboardStats.todayCompliance > 75 ? COLORS.success : COLORS.borderLight,
                    borderLeftColor: dashboardStats.todayCompliance > 50 ? COLORS.success : COLORS.borderLight,
                    transform: [{ rotate: '45deg' }],
                  }
                ]} />
                <View style={[styles.donutInner, isMobile && styles.donutInnerMobile]}>
                  <Text style={[styles.donutValue, isMobile && styles.donutValueMobile]}>{dashboardStats.todayCompliance}%</Text>
                  <Text style={styles.donutLabel}>Complete</Text>
                </View>
              </View>
            </View>
          </View>
          
          <View style={styles.complianceBreakdown}>
            <View style={styles.complianceItem}>
              <View style={[styles.complianceIndicator, { backgroundColor: COLORS.success }]} />
              <Text style={styles.complianceItemLabel}>Steps Logged</Text>
              <Text style={styles.complianceItemValue}>{dashboardStats.stepsCompliance}%</Text>
            </View>
            <View style={styles.complianceItem}>
              <View style={[styles.complianceIndicator, { backgroundColor: COLORS.info }]} />
              <Text style={styles.complianceItemLabel}>Diet Logged</Text>
              <Text style={styles.complianceItemValue}>{dashboardStats.dietCompliance}%</Text>
            </View>
            <View style={styles.complianceItem}>
              <View style={[styles.complianceIndicator, { backgroundColor: COLORS.warning }]} />
              <Text style={styles.complianceItemLabel}>Exercise Done</Text>
              <Text style={styles.complianceItemValue}>{dashboardStats.exerciseCompliance}%</Text>
            </View>
            <View style={styles.complianceItem}>
              <View style={[styles.complianceIndicator, { backgroundColor: COLORS.accent }]} />
              <Text style={styles.complianceItemLabel}>Weight Updated</Text>
              <Text style={styles.complianceItemValue}>{dashboardStats.weightCompliance}%</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  // Logs Not Completed Section
  const renderLogsNotCompleted = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Logs Not Completed</Text>
          {!isLoading && (
            <View style={styles.alertBadge}>
              <Text style={styles.alertBadgeText}>{logsNotCompletedCouples.length}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => router.push('/admin/users?filter=logs-pending' as any)}>
          <Text style={styles.viewAllLink}>View All</Text>
        </TouchableOpacity>
      </View>
      
      {isLoading ? (
        <View style={styles.alertsContainer}>
          {[0, 1, 2, 3].map((i) => renderSkeletonAlertCard(i))}
        </View>
      ) : (
        <>
          <View style={styles.alertsContainer}>
            {logsNotCompletedCouples.length === 0 ? (
              <View style={styles.emptyAlertContainer}>
                <Ionicons name="checkmark-circle" size={32} color={COLORS.success} />
                <Text style={styles.emptyAlertText}>All couples have completed their logs today!</Text>
              </View>
            ) : (
              logsNotCompletedCouples.map((couple, index) => (
                <TouchableOpacity
                  key={couple.id}
                  style={[
                    styles.alertCard,
                    isMobile && styles.alertCardMobile,
                    index === logsNotCompletedCouples.length - 1 && styles.alertCardLast,
                  ]}
                  onPress={() => router.push(`/admin/users?couple=${couple.id}` as any)}
                >
                  <View style={[styles.alertLeft, isMobile && styles.alertLeftMobile]}>
                    <View style={styles.coupleAvatars}>
                      <View style={[styles.avatarSmall, { backgroundColor: COLORS.primary }]}>
                        <Ionicons name="male" size={isMobile ? 12 : 14} color="#fff" />
                      </View>
                      <View style={[styles.avatarSmall, { backgroundColor: COLORS.accent, marginLeft: -8 }]}>
                        <Ionicons name="female" size={isMobile ? 12 : 14} color="#fff" />
                      </View>
                    </View>
                    <View style={[styles.alertInfo, { flex: 1, minWidth: 0 }]}>
                      <Text style={styles.alertCoupleId}>{couple.coupleId}</Text>
                      <Text style={styles.alertNames} numberOfLines={1}>
                        {couple.maleName} & {couple.femaleName}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.alertRight, isMobile && styles.alertRightMobile]}>
                    <View style={[styles.alertReasonBadge, isMobile && styles.alertReasonBadgeMobile]}>
                      <Text style={[styles.alertReasonText, isMobile && styles.alertReasonTextMobile]}>{couple.reason}</Text>
                    </View>
                    <Text style={styles.alertTime}>{couple.lastLog}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={isMobile ? 16 : 18} color={COLORS.textMuted} />
                </TouchableOpacity>
              ))
            )}
          </View>
          
          {logsNotCompletedCouples.length > 0 && (
            <TouchableOpacity style={styles.sendReminderButton}>
              <Ionicons name="notifications" size={18} color="#fff" />
              <Text style={styles.sendReminderText}>{isMobile ? 'Send Reminder' : 'Send Reminder to All Pending'}</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          !isMobile && styles.scrollContentDesktop,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.content, !isMobile && styles.contentDesktop]}>
          {renderHeader()}
          {!isLoading && renderQuickActions()}
          {renderStatsOverview()}
          
          <View style={[styles.twoColumnSection, isMobile && styles.twoColumnSectionMobile]}>
            <View style={[styles.columnLeft, isMobile && styles.columnFullWidth]}>
              {renderComplianceSnapshot()}
            </View>
            <View style={[styles.columnRight, isMobile && styles.columnFullWidth]}>
              {renderLogsNotCompleted()}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  scrollContentDesktop: {
    paddingBottom: 40,
  },
  content: {
    padding: 16,
  },
  contentDesktop: {
    padding: 32,
    maxWidth: 1400,
    alignSelf: 'center',
    width: '100%',
  },

  // Header Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  superAdminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  superAdminButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
  },

  // Section Styles
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  viewAllLink: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Quick Actions Styles
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 16,
  },
  quickActionsGridMobile: {
    gap: 12,
  },
  quickActionCard: {
    flex: 0,
    flexBasis: 280,
    minWidth: 220,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    backgroundColor: 'transparent',
  },
  quickActionCardMobile: {
    minWidth: '100%',
    flex: 0,
    width: '100%',
  },
  quickActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    width: '100%',
    minHeight: 80,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  quickActionSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },

  // Stats Styles
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  statsGridMobile: {
    gap: 10,
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  statCardMobile: {
    flex: 0,
    width: '48%',
    minWidth: 0,
    padding: 12,
  },
  statIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statIconBgMobile: {
    width: 36,
    height: 36,
    borderRadius: 10,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statValueMobile: {
    fontSize: 22,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statLabelMobile: {
    fontSize: 12,
    marginTop: 2,
  },
  statSubLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statSubLabelMobile: {
    fontSize: 10,
  },

  // Two Column Layout
  twoColumnSection: {
    flexDirection: 'row',
    gap: 24,
  },
  twoColumnSectionMobile: {
    flexDirection: 'column',
  },
  columnLeft: {
    flex: 1,
  },
  columnRight: {
    flex: 1,
  },
  columnFullWidth: {
    flex: 'none' as any,
    width: '100%',
  },

  // Compliance Snapshot Styles
  complianceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  complianceCardMobile: {
    padding: 16,
  },
  complianceChart: {
    alignItems: 'center',
    marginBottom: 20,
  },
  donutContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  donutOuterMobile: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  donutProgress: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 12,
    borderColor: COLORS.borderLight,
  },
  donutProgressMobile: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 10,
  },
  donutInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  donutInnerMobile: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  donutValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.success,
  },
  donutValueMobile: {
    fontSize: 22,
  },
  donutLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  complianceBreakdown: {
    gap: 12,
  },
  complianceItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  complianceIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  complianceItemLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  complianceItemValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // At Risk Alerts Styles
  alertBadge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  alertBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  alertsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    minHeight: 80,
  },
  emptyAlertContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    gap: 8,
  },
  emptyAlertText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  alertCardMobile: {
    padding: 12,
    flexWrap: 'wrap',
  },
  alertCardLast: {
    borderBottomWidth: 0,
  },
  alertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  alertLeftMobile: {
    gap: 8,
    minWidth: 0,
    flex: 1,
  },
  coupleAvatars: {
    flexDirection: 'row',
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  alertInfo: {
    flex: 1,
  },
  alertCoupleId: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  alertNames: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  alertRight: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  alertRightMobile: {
    marginRight: 4,
  },
  alertReasonBadge: {
    backgroundColor: COLORS.error + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  alertReasonBadgeMobile: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  alertReasonText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.error,
  },
  alertReasonTextMobile: {
    fontSize: 10,
  },
  alertTime: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  sendReminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    gap: 8,
  },
  sendReminderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
