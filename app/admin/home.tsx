import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';

const isWeb = Platform.OS === 'web';

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

// Mock data for dashboard
const dashboardData = {
  totalCouples: 62,
  totalUsers: 124,
  studyGroup: 35,
  controlGroup: 27,
  todayCompliance: 78,
  logsNotCompletedCount: 8,
};

// Mock logs not completed couples data
const logsNotCompletedCouples = [
  { id: 'C_012', maleName: 'Raj Kumar', femaleName: 'Priya Kumar', lastLog: '3 days ago', reason: 'No diet log' },
  { id: 'C_008', maleName: 'Vikram S', femaleName: 'Lakshmi V', lastLog: '4 days ago', reason: 'Missing steps' },
  { id: 'C_023', maleName: 'Anand M', femaleName: 'Meena S', lastLog: '2 days ago', reason: 'Incomplete exercise' },
  { id: 'C_015', maleName: 'Suresh R', femaleName: 'Geetha R', lastLog: '5 days ago', reason: 'No weight update' },
];

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
    title: 'Upload Daily Task',
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

  useEffect(() => {
    checkSuperAdminStatus();
    loadAdminName();
  }, []);

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

  // Stats Overview Section
  const renderStatsOverview = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Study Overview</Text>
      <View style={[styles.statsGrid, isMobile && styles.statsGridMobile]}>
        <View style={[styles.statCard, isMobile && styles.statCardMobile]}>
          <View style={[styles.statIconBg, { backgroundColor: COLORS.primary + '15' }, isMobile && styles.statIconBgMobile]}>
            <MaterialCommunityIcons name="account-group" size={isMobile ? 20 : 24} color={COLORS.primary} />
          </View>
          <Text style={[styles.statValue, isMobile && styles.statValueMobile]}>{dashboardData.totalCouples}</Text>
          <Text style={[styles.statLabel, isMobile && styles.statLabelMobile]}>Total Couples</Text>
          <Text style={[styles.statSubLabel, isMobile && styles.statSubLabelMobile]}>{dashboardData.totalUsers} Users</Text>
        </View>
        
        <View style={[styles.statCard, isMobile && styles.statCardMobile]}>
          <View style={[styles.statIconBg, { backgroundColor: COLORS.accent + '25' }, isMobile && styles.statIconBgMobile]}>
            <MaterialCommunityIcons name="flask" size={isMobile ? 20 : 24} color={COLORS.accentDark} />
          </View>
          <Text style={[styles.statValue, isMobile && styles.statValueMobile]}>{dashboardData.studyGroup}</Text>
          <Text style={[styles.statLabel, isMobile && styles.statLabelMobile]}>Study Group</Text>
          <Text style={[styles.statSubLabel, isMobile && styles.statSubLabelMobile]}>{dashboardData.controlGroup} Control</Text>
        </View>
        
        <View style={[styles.statCard, isMobile && styles.statCardMobile]}>
          <View style={[styles.statIconBg, { backgroundColor: COLORS.success + '15' }, isMobile && styles.statIconBgMobile]}>
            <Ionicons name="checkmark-circle" size={isMobile ? 20 : 24} color={COLORS.success} />
          </View>
          <Text style={[styles.statValue, isMobile && styles.statValueMobile]}>{dashboardData.todayCompliance}%</Text>
          <Text style={[styles.statLabel, isMobile && styles.statLabelMobile]}>Today's Compliance</Text>
          <Text style={[styles.statSubLabel, isMobile && styles.statSubLabelMobile]}>Logs completed</Text>
        </View>
        
        <View style={[styles.statCard, isMobile && styles.statCardMobile]}>
          <View style={[styles.statIconBg, { backgroundColor: COLORS.error + '15' }, isMobile && styles.statIconBgMobile]}>
            <Ionicons name="alert-circle" size={isMobile ? 20 : 24} color={COLORS.error} />
          </View>
          <Text style={[styles.statValue, isMobile && styles.statValueMobile]}>{dashboardData.logsNotCompletedCount}</Text>
          <Text style={[styles.statLabel, isMobile && styles.statLabelMobile]}>Logs Pending</Text>
          <Text style={[styles.statSubLabel, isMobile && styles.statSubLabelMobile]}>Need attention</Text>
        </View>
      </View>
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
                  borderBottomColor: dashboardData.todayCompliance > 75 ? COLORS.success : COLORS.borderLight,
                  borderLeftColor: dashboardData.todayCompliance > 50 ? COLORS.success : COLORS.borderLight,
                  transform: [{ rotate: '45deg' }],
                }
              ]} />
              <View style={[styles.donutInner, isMobile && styles.donutInnerMobile]}>
                <Text style={[styles.donutValue, isMobile && styles.donutValueMobile]}>{dashboardData.todayCompliance}%</Text>
                <Text style={styles.donutLabel}>Complete</Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.complianceBreakdown}>
          <View style={styles.complianceItem}>
            <View style={[styles.complianceIndicator, { backgroundColor: COLORS.success }]} />
            <Text style={styles.complianceItemLabel}>Steps Logged</Text>
            <Text style={styles.complianceItemValue}>85%</Text>
          </View>
          <View style={styles.complianceItem}>
            <View style={[styles.complianceIndicator, { backgroundColor: COLORS.info }]} />
            <Text style={styles.complianceItemLabel}>Diet Logged</Text>
            <Text style={styles.complianceItemValue}>72%</Text>
          </View>
          <View style={styles.complianceItem}>
            <View style={[styles.complianceIndicator, { backgroundColor: COLORS.warning }]} />
            <Text style={styles.complianceItemLabel}>Exercise Done</Text>
            <Text style={styles.complianceItemValue}>68%</Text>
          </View>
          <View style={styles.complianceItem}>
            <View style={[styles.complianceIndicator, { backgroundColor: COLORS.accent }]} />
            <Text style={styles.complianceItemLabel}>Weight Updated</Text>
            <Text style={styles.complianceItemValue}>45%</Text>
          </View>
        </View>
      </View>
    </View>
  );

  // Logs Not Completed Section
  const renderLogsNotCompleted = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Image 
            source={require('../../assets/images/favicon.png')} 
            style={{ width: 24, height: 24 }} 
          />
          <Text style={styles.sectionTitle}>Logs Not Completed</Text>
          <View style={styles.alertBadge}>
            <Text style={styles.alertBadgeText}>{logsNotCompletedCouples.length}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => router.push('/admin/users?filter=logs-pending' as any)}>
          <Text style={styles.viewAllLink}>View All</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.alertsContainer}>
        {logsNotCompletedCouples.map((couple, index) => (
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
                <Text style={styles.alertCoupleId}>{couple.id}</Text>
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
        ))}
      </View>
      
      <TouchableOpacity style={styles.sendReminderButton}>
        <Ionicons name="notifications" size={18} color="#fff" />
        <Text style={styles.sendReminderText}>{isMobile ? 'Send Reminder' : 'Send Reminder to All Pending'}</Text>
      </TouchableOpacity>
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
          {renderQuickActions()}
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
    flex: 1,
    minWidth: 280,
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
    flex: 1,
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
