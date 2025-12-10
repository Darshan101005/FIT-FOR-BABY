import { adminService, chatService, coupleExerciseService, coupleFoodLogService, coupleService, coupleStepsService, coupleWeightLogService } from '@/services/firestore.service';
import { sendMissingLogsReminder } from '@/services/notification.service';
import { Admin, Chat, Couple } from '@/types/firebase.types';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
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
  missingLogs: string[]; // Array of missing log types: 'steps', 'diet', 'exercise'
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

  // Search state
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ couples: Couple[]; admins: Admin[] }>({ couples: [], admins: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [allCouples, setAllCouples] = useState<Couple[]>([]);
  const [allAdmins, setAllAdmins] = useState<Admin[]>([]);

  // Notification state
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [recentChats, setRecentChats] = useState<Chat[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  // Reminder sending state
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderStatus, setReminderStatus] = useState<'confirm' | 'sending' | 'success' | 'error'>('confirm');
  const [reminderMessage, setReminderMessage] = useState('');

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

        // Add to missing logs list if any logs are missing (only track steps, diet, exercise)
        const trackableLogs = coupleMissingLogs.filter(log => ['steps', 'diet', 'exercise'].includes(log));
        if (trackableLogs.length > 0) {
          const reasonMap: Record<string, string> = {
            'steps': 'Steps',
            'diet': 'Food',
            'exercise': 'Exercise',
          };
          // Create a combined reason showing all missing items
          const missingReasons = trackableLogs.map(log => reasonMap[log]).filter(Boolean);
          const reason = missingReasons.length === 1 
            ? `Missing ${missingReasons[0].toLowerCase()}` 
            : `Missing ${missingReasons.length} logs`;
          
          couplesWithMissingLogs.push({
            id: couple.coupleId,
            coupleId: couple.coupleId,
            maleName: couple.male?.name || 'N/A',
            femaleName: couple.female?.name || 'N/A',
            lastLog: 'Today',
            reason: reason,
            missingLogs: trackableLogs,
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

  // Load search data (couples and admins)
  const loadSearchData = async () => {
    try {
      const [couples, admins] = await Promise.all([
        coupleService.getAll() as Promise<Couple[]>,
        adminService.getAll() as Promise<Admin[]>,
      ]);
      setAllCouples(couples);
      setAllAdmins(admins);
    } catch (error) {
      console.error('Error loading search data:', error);
    }
  };

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults({ couples: [], admins: [] });
      return;
    }

    const lowerQuery = query.toLowerCase().trim();

    // Search couples
    const matchedCouples = allCouples.filter((couple) => {
      const maleName = couple.male?.name?.toLowerCase() || '';
      const femaleName = couple.female?.name?.toLowerCase() || '';
      const coupleId = couple.coupleId?.toLowerCase() || '';
      const malePhone = couple.male?.phone?.toLowerCase() || '';
      const femalePhone = couple.female?.phone?.toLowerCase() || '';
      return (
        maleName.includes(lowerQuery) ||
        femaleName.includes(lowerQuery) ||
        coupleId.includes(lowerQuery) ||
        malePhone.includes(lowerQuery) ||
        femalePhone.includes(lowerQuery)
      );
    });

    // Search admins
    const matchedAdmins = allAdmins.filter((admin) => {
      const displayName = admin.displayName?.toLowerCase() || '';
      const firstName = admin.firstName?.toLowerCase() || '';
      const lastName = admin.lastName?.toLowerCase() || '';
      const email = admin.email?.toLowerCase() || '';
      const phone = admin.phone?.toLowerCase() || '';
      return (
        displayName.includes(lowerQuery) ||
        firstName.includes(lowerQuery) ||
        lastName.includes(lowerQuery) ||
        email.includes(lowerQuery) ||
        phone.includes(lowerQuery)
      );
    });

    setSearchResults({ couples: matchedCouples.slice(0, 10), admins: matchedAdmins.slice(0, 10) });
  };

  // Handle search result click
  const handleSearchResultClick = (type: 'couple' | 'admin', id: string) => {
    setShowSearchModal(false);
    setSearchQuery('');
    setSearchResults({ couples: [], admins: [] });
    if (type === 'couple') {
      router.push(`/admin/user-dashboard?odlcouple=${id}` as any);
    } else {
      router.push('/admin/manage-admins' as any);
    }
  };

  // Open search modal
  const openSearchModal = async () => {
    setShowSearchModal(true);
    if (allCouples.length === 0 || allAdmins.length === 0) {
      setIsSearching(true);
      await loadSearchData();
      setIsSearching(false);
    }
  };

  // Load notifications (recent chats with unread messages)
  const loadNotifications = async () => {
    setIsLoadingNotifications(true);
    try {
      const chats = await chatService.getAll();
      // Sort by last message time and filter to show recent ones with activity
      const recentWithMessages = chats
        .filter(chat => chat.lastMessage && chat.lastMessage.trim() !== '')
        .slice(0, 10); // Show top 10 recent
      setRecentChats(recentWithMessages);
      
      // Calculate total unread count
      const unread = chats.reduce((sum, chat) => sum + (chat.unreadByAdmin || 0), 0);
      setTotalUnreadCount(unread);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  // Open notification modal
  const openNotificationModal = async () => {
    setShowNotificationModal(true);
    await loadNotifications();
  };

  // Handle notification click - mark as read and navigate to communication page
  const handleNotificationClick = async (chat: Chat) => {
    // Mark messages as read by admin
    if (chat.unreadByAdmin > 0) {
      try {
        await chatService.markAsRead(chat.id, 'admin');
        // Update local state to remove unread count
        setRecentChats(prev => 
          prev.map(c => c.id === chat.id ? { ...c, unreadByAdmin: 0 } : c)
        );
        setTotalUnreadCount(prev => Math.max(0, prev - chat.unreadByAdmin));
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    }
    setShowNotificationModal(false);
    router.push(`/admin/communication?chatId=${chat.id}` as any);
  };

  // Format time ago
  const formatTimeAgo = (timestamp: any): string => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  // Open reminder confirmation modal
  const handleSendReminder = () => {
    if (logsNotCompletedCouples.length === 0) {
      setReminderStatus('error');
      setReminderMessage('All couples have completed their logs today!');
      setShowReminderModal(true);
      return;
    }
    setReminderStatus('confirm');
    setReminderMessage(`Send reminder to ${logsNotCompletedCouples.length} couple(s) with pending logs?`);
    setShowReminderModal(true);
  };

  // Execute sending reminder
  const executeSendReminder = async () => {
    setReminderStatus('sending');
    setIsSendingReminder(true);
    try {
      const coupleIds = logsNotCompletedCouples.map(c => c.coupleId);
      const result = await sendMissingLogsReminder(coupleIds, adminName);
      
      if (result.success) {
        setReminderStatus('success');
        // Show appropriate message based on whether push was sent
        let message = `Reminder saved for ${result.sentCount} couple(s).`;
        if (result.pushSent && result.pushSent > 0) {
          message += ` Push notification sent to ${result.pushSent} device(s).`;
        } else {
          message += ' Users will see it when they open the app.';
        }
        if (result.error) {
          message = result.error;
        }
        setReminderMessage(message);
      } else {
        setReminderStatus('error');
        setReminderMessage(result.error || 'Could not send reminders. Please try again.');
      }
    } catch (error: any) {
      console.error('Error sending reminder:', error);
      setReminderStatus('error');
      setReminderMessage('Failed to send reminders. Please try again.');
    } finally {
      setIsSendingReminder(false);
    }
  };

  // Close reminder modal
  const closeReminderModal = () => {
    setShowReminderModal(false);
    setReminderStatus('confirm');
    setReminderMessage('');
  };

  // Load notifications on mount
  useEffect(() => {
    loadNotifications();
  }, []);

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
        <TouchableOpacity style={styles.headerButton} onPress={openSearchModal}>
          <Ionicons name="search" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerButton} onPress={openNotificationModal}>
          <Ionicons name="notifications-outline" size={22} color={COLORS.textSecondary} />
          {totalUnreadCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
              </Text>
            </View>
          )}
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

  // Skeleton Quick Action Card
  const renderSkeletonQuickAction = () => (
    <View style={[styles.skeletonQuickActionCard, isMobile && styles.skeletonQuickActionCardMobile]}>
      <View style={styles.skeletonQuickActionInner}>
        <SkeletonBox width={isMobile ? 44 : 52} height={isMobile ? 44 : 52} borderRadius={14} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <SkeletonBox width="80%" height={16} />
          <SkeletonBox width="60%" height={12} style={{ marginTop: 6 }} />
        </View>
        <SkeletonBox width={20} height={20} borderRadius={10} />
      </View>
    </View>
  );

  // Skeleton Quick Actions Section
  const renderSkeletonQuickActions = () => (
    <View style={styles.section}>
      <SkeletonBox width={120} height={20} style={{ marginBottom: 16 }} />
      <View style={[styles.quickActionsGrid, isMobile && styles.quickActionsGridMobile]}>
        {[1, 2, 3, 4].map((i) => (
          <React.Fragment key={i}>{renderSkeletonQuickAction()}</React.Fragment>
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
  const renderComplianceSnapshot = () => {
    // Calculate the progress for each quadrant (0-100%)
    const progress = dashboardStats.todayCompliance;
    
    // Get color based on percentage range
    // 0-25: Red, 25-50: Orange, 50-75: Yellow, 75-100: Green
    const getProgressColor = (percent: number) => {
      if (percent <= 0) return COLORS.error; // Red for 0%
      if (percent < 25) return COLORS.error; // Red
      if (percent < 50) return '#f97316'; // Orange
      if (percent < 75) return '#eab308'; // Yellow
      return COLORS.success; // Green
    };
    
    const progressColor = getProgressColor(progress);
    const baseColor = COLORS.borderLight;
    
    // Determine which borders should be colored based on percentage
    // Progress fills clockwise from top: top -> right -> bottom -> left
    const getProgressColors = () => {
      if (progress >= 100) {
        return {
          top: progressColor,
          right: progressColor,
          bottom: progressColor,
          left: progressColor,
        };
      } else if (progress >= 75) {
        return {
          top: progressColor,
          right: progressColor,
          bottom: progressColor,
          left: progress >= 87.5 ? progressColor : baseColor,
        };
      } else if (progress >= 50) {
        return {
          top: progressColor,
          right: progressColor,
          bottom: progress >= 62.5 ? progressColor : baseColor,
          left: baseColor,
        };
      } else if (progress >= 25) {
        return {
          top: progressColor,
          right: progress >= 37.5 ? progressColor : baseColor,
          bottom: baseColor,
          left: baseColor,
        };
      } else if (progress > 0) {
        return {
          top: progress >= 12.5 ? progressColor : baseColor,
          right: baseColor,
          bottom: baseColor,
          left: baseColor,
        };
      } else {
        // 0% - show all red as indicator
        return {
          top: baseColor,
          right: baseColor,
          bottom: baseColor,
          left: baseColor,
        };
      }
    };
    
    const colors = getProgressColors();
    
    return (
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
            {/* Donut Chart with full circle */}
            <View style={styles.donutContainer}>
              <View style={[styles.donutOuter, isMobile && styles.donutOuterMobile]}>
                {/* Background circle (always full) */}
                <View style={[
                  styles.donutBackground,
                  isMobile && styles.donutBackgroundMobile,
                ]} />
                {/* Progress overlay */}
                <View style={[
                  styles.donutProgress,
                  isMobile && styles.donutProgressMobile,
                  { 
                    borderTopColor: colors.top,
                    borderRightColor: colors.right,
                    borderBottomColor: colors.bottom,
                    borderLeftColor: colors.left,
                    transform: [{ rotate: '-45deg' }],
                  }
                ]} />
                <View style={[styles.donutInner, isMobile && styles.donutInnerMobile]}>
                  <Text style={[styles.donutValue, isMobile && styles.donutValueMobile, { color: progressColor }]}>{dashboardStats.todayCompliance}%</Text>
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
            {/* Weight Updated removed per request */}
          </View>
        </View>
      )}
    </View>
  );
  };

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
              logsNotCompletedCouples.map((couple, index) => {
                // Map log types to icons and colors
                const logTypeConfig: Record<string, { icon: string; color: string; label: string }> = {
                  'steps': { icon: 'footsteps', color: COLORS.warning, label: 'Steps' },
                  'diet': { icon: 'restaurant', color: COLORS.info, label: 'Food' },
                  'exercise': { icon: 'fitness', color: COLORS.success, label: 'Exercise' },
                };
                
                return (
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
                    {/* Show individual missing log badges */}
                    <View style={styles.missingLogsBadges}>
                      {(couple.missingLogs || []).map((logType) => {
                        const config = logTypeConfig[logType];
                        if (!config) return null;
                        return (
                          <View 
                            key={logType} 
                            style={[styles.missingLogBadge, { backgroundColor: config.color + '18', borderColor: config.color + '40' }]}
                          >
                            <Ionicons name={config.icon as any} size={isMobile ? 10 : 12} color={config.color} />
                            {!isMobile && <Text style={[styles.missingLogText, { color: config.color }]}>{config.label}</Text>}
                          </View>
                        );
                      })}
                    </View>
                    <Text style={styles.alertTime}>{couple.lastLog}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={isMobile ? 16 : 18} color={COLORS.textMuted} />
                </TouchableOpacity>
              );
              })
            )}
          </View>
          
          {logsNotCompletedCouples.length > 0 && (
            <TouchableOpacity 
              style={[styles.sendReminderButton, isSendingReminder && styles.sendReminderButtonDisabled]}
              onPress={handleSendReminder}
              disabled={isSendingReminder}
              activeOpacity={0.8}
            >
              {isSendingReminder ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="notifications" size={18} color="#fff" />
              )}
              <Text style={styles.sendReminderText}>
                {isSendingReminder 
                  ? 'Sending...' 
                  : isMobile 
                    ? 'Send Reminder' 
                    : 'Send Reminder to All Pending'}
              </Text>
              {!isSendingReminder && (
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );

  // Search Modal
  const renderSearchModal = () => (
    <Modal
      visible={showSearchModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowSearchModal(false)}
    >
      <View style={styles.searchModalOverlay}>
        <View style={[styles.searchModalContent, isMobile && styles.searchModalContentMobile]}>
          {/* Header */}
          <View style={styles.searchModalHeader}>
            <Text style={styles.searchModalTitle}>Search</Text>
            <TouchableOpacity
              style={styles.searchModalClose}
              onPress={() => {
                setShowSearchModal(false);
                setSearchQuery('');
                setSearchResults({ couples: [], admins: [] });
              }}
            >
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search couples or admins..."
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={handleSearch}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults({ couples: [], admins: [] }); }}>
                <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Results */}
          <ScrollView style={styles.searchResultsContainer} showsVerticalScrollIndicator={false}>
            {isSearching ? (
              <View style={styles.searchLoadingContainer}>
                <Text style={styles.searchLoadingText}>Loading...</Text>
              </View>
            ) : searchQuery.length === 0 ? (
              <View style={styles.searchEmptyContainer}>
                <Ionicons name="search-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.searchEmptyText}>Search for couples by name, ID, or phone</Text>
                <Text style={styles.searchEmptyText}>Search for admins by name or email</Text>
              </View>
            ) : (
              <>
                {/* Couples Results */}
                {searchResults.couples.length > 0 && (
                  <View style={styles.searchResultSection}>
                    <Text style={styles.searchResultSectionTitle}>Couples</Text>
                    {searchResults.couples.map((couple) => (
                      <TouchableOpacity
                        key={couple.coupleId}
                        style={styles.searchResultItem}
                        onPress={() => handleSearchResultClick('couple', couple.coupleId)}
                      >
                        <View style={styles.searchResultAvatars}>
                          <View style={[styles.searchResultAvatar, { backgroundColor: COLORS.primary }]}>
                            <Ionicons name="male" size={14} color="#fff" />
                          </View>
                          <View style={[styles.searchResultAvatar, { backgroundColor: '#e91e8c', marginLeft: -8 }]}>
                            <Ionicons name="female" size={14} color="#fff" />
                          </View>
                        </View>
                        <View style={styles.searchResultInfo}>
                          <Text style={styles.searchResultName}>
                            {couple.male?.name || 'N/A'} & {couple.female?.name || 'N/A'}
                          </Text>
                          <Text style={styles.searchResultSubtext}>{couple.coupleId}</Text>
                        </View>
                        <View style={[styles.searchResultBadge, { backgroundColor: couple.status === 'active' ? COLORS.success + '20' : COLORS.textMuted + '20' }]}>
                          <Text style={[styles.searchResultBadgeText, { color: couple.status === 'active' ? COLORS.success : COLORS.textMuted }]}>
                            {couple.status || 'N/A'}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Admins Results */}
                {searchResults.admins.length > 0 && (
                  <View style={styles.searchResultSection}>
                    <Text style={styles.searchResultSectionTitle}>Admins</Text>
                    {searchResults.admins.map((admin) => (
                      <TouchableOpacity
                        key={admin.uid}
                        style={styles.searchResultItem}
                        onPress={() => handleSearchResultClick('admin', admin.uid)}
                      >
                        <View style={[styles.searchResultAvatar, { backgroundColor: COLORS.accent }]}>
                          <Ionicons name="shield-checkmark" size={16} color="#fff" />
                        </View>
                        <View style={styles.searchResultInfo}>
                          <Text style={styles.searchResultName}>{admin.displayName || `${admin.firstName} ${admin.lastName}`}</Text>
                          <Text style={styles.searchResultSubtext}>{admin.email}</Text>
                        </View>
                        <View style={[styles.searchResultBadge, { backgroundColor: admin.role === 'owner' ? COLORS.warning + '20' : COLORS.primary + '20' }]}>
                          <Text style={[styles.searchResultBadgeText, { color: admin.role === 'owner' ? COLORS.warning : COLORS.primary }]}>
                            {admin.role}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* No Results */}
                {searchResults.couples.length === 0 && searchResults.admins.length === 0 && (
                  <View style={styles.searchEmptyContainer}>
                    <Ionicons name="search-outline" size={48} color={COLORS.textMuted} />
                    <Text style={styles.searchEmptyText}>No results found for "{searchQuery}"</Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
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
          {isLoading ? renderSkeletonQuickActions() : renderQuickActions()}
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
      {renderSearchModal()}
      {renderNotificationModal()}
      {renderReminderModal()}
    </View>
  );

  // Reminder Modal - Styled confirmation and status
  function renderReminderModal() {
    return (
      <Modal
        visible={showReminderModal}
        transparent
        animationType="fade"
        onRequestClose={closeReminderModal}
      >
        <View style={styles.reminderModalOverlay}>
          <View style={[styles.reminderModalContent, isMobile && styles.reminderModalContentMobile]}>
            {/* Icon based on status */}
            <View style={[
              styles.reminderModalIconContainer,
              reminderStatus === 'success' && { backgroundColor: COLORS.accent + '15' },
              reminderStatus === 'error' && { backgroundColor: COLORS.error + '15' },
              reminderStatus === 'sending' && { backgroundColor: COLORS.primary + '15' },
              reminderStatus === 'confirm' && { backgroundColor: COLORS.warning + '15' },
            ]}>
              {reminderStatus === 'sending' ? (
                <ActivityIndicator size="large" color={COLORS.primary} />
              ) : reminderStatus === 'success' ? (
                <Ionicons name="checkmark-circle" size={48} color={COLORS.accent} />
              ) : reminderStatus === 'error' ? (
                <Ionicons name="alert-circle" size={48} color={COLORS.error} />
              ) : (
                <Ionicons name="notifications" size={48} color={COLORS.warning} />
              )}
            </View>

            {/* Title */}
            <Text style={styles.reminderModalTitle}>
              {reminderStatus === 'sending' ? 'Sending Reminder...' :
               reminderStatus === 'success' ? 'Reminder Sent! 🔔' :
               reminderStatus === 'error' ? 'Oops!' :
               'Send Reminder'}
            </Text>

            {/* Message */}
            <Text style={styles.reminderModalMessage}>
              {reminderStatus === 'sending' 
                ? 'Please wait while we send reminders to all pending couples...'
                : reminderMessage}
            </Text>

            {/* Buttons */}
            <View style={styles.reminderModalButtons}>
              {reminderStatus === 'confirm' ? (
                <>
                  <TouchableOpacity
                    style={styles.reminderModalCancelButton}
                    onPress={closeReminderModal}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.reminderModalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.reminderModalSendButton}
                    onPress={executeSendReminder}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.reminderModalSendText}>Send Now</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </TouchableOpacity>
                </>
              ) : reminderStatus === 'sending' ? null : (
                <TouchableOpacity
                  style={[
                    styles.reminderModalDoneButton,
                    reminderStatus === 'success' && { backgroundColor: COLORS.accent },
                    reminderStatus === 'error' && { backgroundColor: COLORS.error },
                  ]}
                  onPress={closeReminderModal}
                  activeOpacity={0.7}
                >
                  <Text style={styles.reminderModalDoneText}>
                    {reminderStatus === 'success' ? 'Great!' : 'Close'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Notification Modal
  function renderNotificationModal() {
    return (
      <Modal
        visible={showNotificationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotificationModal(false)}
      >
        <View style={styles.notificationModalOverlay}>
          <View style={[styles.notificationModalContent, isMobile && styles.notificationModalContentMobile]}>
            {/* Header */}
            <View style={styles.notificationModalHeader}>
              <View style={styles.notificationModalTitleRow}>
                <Ionicons name="notifications" size={22} color={COLORS.primary} />
                <Text style={styles.notificationModalTitle}>Notifications</Text>
                {totalUnreadCount > 0 && (
                  <View style={styles.notificationHeaderBadge}>
                    <Text style={styles.notificationHeaderBadgeText}>{totalUnreadCount} new</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.notificationModalClose}
                onPress={() => setShowNotificationModal(false)}
              >
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={styles.notificationList} showsVerticalScrollIndicator={false}>
              {isLoadingNotifications ? (
                <View style={styles.notificationLoadingContainer}>
                  <Text style={styles.notificationLoadingText}>Loading...</Text>
                </View>
              ) : recentChats.length === 0 ? (
                <View style={styles.notificationEmptyContainer}>
                  <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textMuted} />
                  <Text style={styles.notificationEmptyText}>No recent messages</Text>
                  <Text style={styles.notificationEmptySubtext}>User messages will appear here</Text>
                </View>
              ) : (
                recentChats.map((chat) => (
                  <TouchableOpacity
                    key={chat.id}
                    style={[
                      styles.notificationItem,
                      chat.unreadByAdmin > 0 && styles.notificationItemUnread
                    ]}
                    onPress={() => handleNotificationClick(chat)}
                  >
                    <View style={[
                      styles.notificationAvatar,
                      { backgroundColor: chat.gender === 'male' ? COLORS.primary : '#e91e8c' }
                    ]}>
                      <Ionicons
                        name={chat.gender === 'male' ? 'male' : 'female'}
                        size={16}
                        color="#fff"
                      />
                    </View>
                    <View style={styles.notificationContent}>
                      <View style={styles.notificationTopRow}>
                        <Text style={styles.notificationName} numberOfLines={1}>
                          {chat.odAaByuserName || chat.coupleId}
                        </Text>
                        <Text style={styles.notificationTime}>
                          {formatTimeAgo(chat.lastMessageAt)}
                        </Text>
                      </View>
                      <Text style={styles.notificationMessage} numberOfLines={2}>
                        {chat.lastMessage}
                      </Text>
                      {chat.unreadByAdmin > 0 && (
                        <View style={styles.notificationUnreadBadge}>
                          <Text style={styles.notificationUnreadText}>
                            {chat.unreadByAdmin} unread
                          </Text>
                        </View>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            {/* View All Button */}
            {recentChats.length > 0 && (
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => {
                  setShowNotificationModal(false);
                  router.push('/admin/communication' as any);
                }}
              >
                <Text style={styles.viewAllButtonText}>View All Messages</Text>
                <Ionicons name="arrow-forward" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    );
  }
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
  donutBackground: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 12,
    borderColor: COLORS.borderLight,
  },
  donutBackgroundMobile: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 10,
  },
  donutProgress: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 12,
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
  // Missing Logs Badges
  missingLogsBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'flex-end',
  },
  missingLogBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  missingLogText: {
    fontSize: 10,
    fontWeight: '600',
  },
  // Skeleton Quick Actions
  skeletonQuickActionCard: {
    flex: 0,
    flexBasis: 280,
    minWidth: 220,
    maxWidth: 320,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  skeletonQuickActionCardMobile: {
    minWidth: '100%',
    maxWidth: '100%',
    flex: 0,
    width: '100%',
  },
  skeletonQuickActionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    minHeight: 80,
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
  sendReminderButtonDisabled: {
    opacity: 0.7,
  },
  sendReminderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Reminder Modal Styles
  reminderModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  reminderModalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  reminderModalContentMobile: {
    maxWidth: '100%',
    padding: 24,
  },
  reminderModalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  reminderModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  reminderModalMessage: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  reminderModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  reminderModalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderModalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  reminderModalSendButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  reminderModalSendText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  reminderModalDoneButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderModalDoneText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },

  // Search Modal Styles
  searchModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: isWeb ? 60 : 100,
    paddingHorizontal: 16,
  },
  searchModalContent: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  searchModalContentMobile: {
    maxWidth: '100%',
    maxHeight: '85%',
  },
  searchModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  searchModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  searchModalClose: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
    ...(isWeb && { outlineStyle: 'none' as any }),
  },
  searchResultsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  searchLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  searchLoadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  searchEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  searchEmptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  searchResultSection: {
    marginBottom: 20,
  },
  searchResultSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  searchResultAvatars: {
    flexDirection: 'row',
  },
  searchResultAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  searchResultSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  searchResultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  searchResultBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // Notification Badge (on bell icon)
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },

  // Notification Modal Styles
  notificationModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: isWeb ? 60 : 100,
    paddingRight: 16,
  },
  notificationModalContent: {
    width: 380,
    maxWidth: '95%',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  notificationModalContentMobile: {
    width: '100%',
    maxWidth: '100%',
    marginRight: -16,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  notificationModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  notificationModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notificationModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  notificationHeaderBadge: {
    backgroundColor: COLORS.error + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  notificationHeaderBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.error,
  },
  notificationModalClose: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationList: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  notificationLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  notificationLoadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  notificationEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  notificationEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  notificationEmptySubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
    gap: 12,
  },
  notificationItemUnread: {
    backgroundColor: COLORS.primary + '08',
  },
  notificationAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
  notificationTime: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  notificationUnreadBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  notificationUnreadText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    gap: 8,
  },
  viewAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
