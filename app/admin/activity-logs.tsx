import { activityLogService } from '@/services/firestore.service';
import { ActivityCategory, ActivityLog, ActivityType } from '@/types/firebase.types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
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

// Activity type colors and icons
const ACTIVITY_CONFIG: Record<ActivityType, { color: string; icon: string; bgColor: string }> = {
  auth: { color: '#8b5cf6', icon: 'key-outline', bgColor: '#f3e8ff' },
  navigation: { color: '#3b82f6', icon: 'navigate-outline', bgColor: '#dbeafe' },
  data_create: { color: '#22c55e', icon: 'add-circle-outline', bgColor: '#dcfce7' },
  data_update: { color: '#f59e0b', icon: 'create-outline', bgColor: '#fef3c7' },
  data_delete: { color: '#ef4444', icon: 'trash-outline', bgColor: '#fee2e2' },
  settings: { color: '#6366f1', icon: 'settings-outline', bgColor: '#e0e7ff' },
  interaction: { color: '#06b6d4', icon: 'finger-print-outline', bgColor: '#cffafe' },
  appointment: { color: '#ec4899', icon: 'calendar-outline', bgColor: '#fce7f3' },
  questionnaire: { color: '#14b8a6', icon: 'clipboard-outline', bgColor: '#ccfbf1' },
  chat: { color: '#84cc16', icon: 'chatbubble-outline', bgColor: '#ecfccb' },
  notification: { color: '#f97316', icon: 'notifications-outline', bgColor: '#ffedd5' },
  admin: { color: '#7c3aed', icon: 'shield-outline', bgColor: '#ede9fe' },
  device: { color: '#0ea5e9', icon: 'phone-portrait-outline', bgColor: '#e0f2fe' },
  feedback: { color: '#10b981', icon: 'star-outline', bgColor: '#d1fae5' },
  support: { color: '#f472b6', icon: 'help-circle-outline', bgColor: '#fce7f3' },
  error: { color: '#dc2626', icon: 'warning-outline', bgColor: '#fecaca' },
};

// Action-specific colors and icons (for the ACTION column)
const ACTION_CONFIG: Record<string, { color: string; icon: string; bgColor: string }> = {
  create: { color: '#22c55e', icon: 'add-circle-outline', bgColor: '#dcfce7' },
  update: { color: '#f59e0b', icon: 'create-outline', bgColor: '#fef3c7' },
  delete: { color: '#ef4444', icon: 'trash-outline', bgColor: '#fee2e2' },
  login: { color: '#8b5cf6', icon: 'log-in-outline', bgColor: '#f3e8ff' },
  logout: { color: '#6366f1', icon: 'log-out-outline', bgColor: '#e0e7ff' },
  view: { color: '#3b82f6', icon: 'eye-outline', bgColor: '#dbeafe' },
  navigate: { color: '#3b82f6', icon: 'navigate-outline', bgColor: '#dbeafe' },
  submit: { color: '#22c55e', icon: 'checkmark-circle-outline', bgColor: '#dcfce7' },
  cancel: { color: '#ef4444', icon: 'close-circle-outline', bgColor: '#fee2e2' },
  complete: { color: '#10b981', icon: 'checkmark-done-outline', bgColor: '#d1fae5' },
  send: { color: '#06b6d4', icon: 'send-outline', bgColor: '#cffafe' },
  receive: { color: '#14b8a6', icon: 'download-outline', bgColor: '#ccfbf1' },
  enable: { color: '#22c55e', icon: 'toggle-outline', bgColor: '#dcfce7' },
  disable: { color: '#ef4444', icon: 'toggle-outline', bgColor: '#fee2e2' },
  register: { color: '#8b5cf6', icon: 'person-add-outline', bgColor: '#f3e8ff' },
  enroll: { color: '#22c55e', icon: 'person-add-outline', bgColor: '#dcfce7' },
  reset: { color: '#f59e0b', icon: 'refresh-outline', bgColor: '#fef3c7' },
  error: { color: '#dc2626', icon: 'warning-outline', bgColor: '#fecaca' },
};

// Category tabs configuration
const CATEGORY_TABS: { value: ActivityCategory | 'all'; label: string; icon: string; color: string }[] = [
  { value: 'all', label: 'All Logs', icon: 'list-outline', color: COLORS.primary },
  { value: 'user', label: 'User Activity', icon: 'person-outline', color: '#22c55e' },
  { value: 'general', label: 'General / Anonymous', icon: 'globe-outline', color: '#f59e0b' },
];

// Format timestamp
const formatTime = (timestamp: any): string => {
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

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatFullTime = (timestamp: any): string => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// Skeleton loader
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
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <Animated.View style={[{ width, height, backgroundColor: COLORS.border, borderRadius, opacity }, style]} />
  );
};

// Filter options
const TYPE_FILTERS: { value: ActivityType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'auth', label: 'Auth' },
  { value: 'navigation', label: 'Navigation' },
  { value: 'data_create', label: 'Data Create' },
  { value: 'data_update', label: 'Data Update' },
  { value: 'data_delete', label: 'Data Delete' },
  { value: 'settings', label: 'Settings' },
  { value: 'interaction', label: 'Interaction' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'questionnaire', label: 'Questionnaire' },
  { value: 'chat', label: 'Chat' },
  { value: 'notification', label: 'Notification' },
  { value: 'admin', label: 'Admin' },
  { value: 'device', label: 'Device' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'support', label: 'Support' },
  { value: 'error', label: 'Error' },
];

const PLATFORM_FILTERS = [
  { value: 'all', label: 'All Platforms' },
  { value: 'web', label: 'Web' },
  { value: 'ios', label: 'iOS' },
  { value: 'android', label: 'Android' },
];

// Time/Date filters
const DATE_FILTERS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'thisWeek', label: 'This Week' },
  { value: 'thisMonth', label: 'This Month' },
];

// Hour filters
const HOUR_FILTERS = [
  { value: 'all', label: 'All Hours' },
  { value: 'morning', label: '6AM - 12PM' },
  { value: 'afternoon', label: '12PM - 6PM' },
  { value: 'evening', label: '6PM - 12AM' },
  { value: 'night', label: '12AM - 6AM' },
  { value: 'businessHours', label: '9AM - 5PM' },
  { value: 'lastHour', label: 'Last Hour' },
  { value: 'last3Hours', label: 'Last 3 Hours' },
  { value: 'last6Hours', label: 'Last 6 Hours' },
  { value: 'last12Hours', label: 'Last 12 Hours' },
];

// Helper to get date range based on filter
const getDateRange = (filter: string): { start: Date | null; end: Date | null } => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (filter) {
    case 'today':
      return { start: today, end: now };
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: yesterday, end: today };
    }
    case 'last7days': {
      const last7 = new Date(today);
      last7.setDate(last7.getDate() - 7);
      return { start: last7, end: now };
    }
    case 'last30days': {
      const last30 = new Date(today);
      last30.setDate(last30.getDate() - 30);
      return { start: last30, end: now };
    }
    case 'thisWeek': {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return { start: startOfWeek, end: now };
    }
    case 'thisMonth': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: startOfMonth, end: now };
    }
    default:
      return { start: null, end: null };
  }
};

// Helper to check if timestamp matches hour filter
const matchesHourFilter = (timestamp: any, filter: string): boolean => {
  if (filter === 'all') return true;
  
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  const hour = date.getHours();
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  
  switch (filter) {
    case 'morning':
      return hour >= 6 && hour < 12;
    case 'afternoon':
      return hour >= 12 && hour < 18;
    case 'evening':
      return hour >= 18 && hour < 24;
    case 'night':
      return hour >= 0 && hour < 6;
    case 'businessHours':
      return hour >= 9 && hour < 17;
    case 'lastHour':
      return diffHours <= 1;
    case 'last3Hours':
      return diffHours <= 3;
    case 'last6Hours':
      return diffHours <= 6;
    case 'last12Hours':
      return diffHours <= 12;
    default:
      return true;
  }
};

export default function ActivityLogsScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1024;

  // State
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userIdSearch, setUserIdSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ActivityCategory | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [hourFilter, setHourFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  
  // Stats for category counts
  const [categoryCounts, setCategoryCounts] = useState<{ user: number; general: number }>({ user: 0, general: 0 });

  // Refs
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Live mode pulse animation
  useEffect(() => {
    if (liveMode) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [liveMode]);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const fetchedLogs = await activityLogService.getAll(500);
      setLogs(fetchedLogs);
      setTotalCount(fetchedLogs.length);
      
      // Calculate category counts
      const userCount = fetchedLogs.filter(log => log.category === 'user').length;
      const generalCount = fetchedLogs.filter(log => log.category === 'general').length;
      setCategoryCounts({ user: userCount, general: generalCount });
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Subscribe to real-time updates
  const subscribeToLogs = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }
    unsubscribeRef.current = activityLogService.subscribeToAllActivities((newLogs) => {
      setLogs(newLogs);
      setTotalCount(newLogs.length);
      
      // Calculate category counts
      const userCount = newLogs.filter(log => log.category === 'user').length;
      const generalCount = newLogs.filter(log => log.category === 'general').length;
      setCategoryCounts({ user: userCount, general: generalCount });
    }, 500);
  }, []);

  // Initial load
  useEffect(() => {
    fetchLogs();
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Handle live mode toggle
  useEffect(() => {
    if (liveMode) {
      subscribeToLogs();
    } else {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    }
  }, [liveMode, subscribeToLogs]);

  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setCategoryFilter('all');
    setTypeFilter('all');
    setPlatformFilter('all');
    setDateFilter('all');
    setHourFilter('all');
    setSearchQuery('');
    setUserIdSearch('');
  };

  // Check if any filters are active
  const hasActiveFilters = categoryFilter !== 'all' || typeFilter !== 'all' || platformFilter !== 'all' || dateFilter !== 'all' || hourFilter !== 'all' || searchQuery.length > 0 || userIdSearch.length > 0;

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    // Category filter
    if (categoryFilter !== 'all' && log.category !== categoryFilter) return false;
    // Type filter
    if (typeFilter !== 'all' && log.type !== typeFilter) return false;
    // Platform filter
    if (platformFilter !== 'all' && log.platform !== platformFilter) return false;
    
    // Date filter
    if (dateFilter !== 'all') {
      const { start, end } = getDateRange(dateFilter);
      if (start && end && log.timestamp) {
        const logDate = (log.timestamp as any).toDate ? (log.timestamp as any).toDate() : new Date(log.timestamp as any);
        if (logDate < start || logDate > end) return false;
      }
    }
    
    // Hour filter
    if (hourFilter !== 'all' && log.timestamp) {
      if (!matchesHourFilter(log.timestamp, hourFilter)) return false;
    }

    // User ID search filter
    if (userIdSearch) {
      const userIdQuery = userIdSearch.toLowerCase();
      if (!log.userId?.toLowerCase().includes(userIdQuery) && 
          !log.coupleId?.toLowerCase().includes(userIdQuery)) {
        return false;
      }
    }
    
    // General search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        log.description?.toLowerCase().includes(query) ||
        log.action?.toLowerCase().includes(query) ||
        log.userId?.toLowerCase().includes(query) ||
        log.attemptedEmail?.toLowerCase().includes(query) ||
        log.attemptedPhone?.toLowerCase().includes(query) ||
        log.collection?.toLowerCase().includes(query) ||
        log.type?.toLowerCase().includes(query) ||
        log.coupleId?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Render activity type badge
  const renderTypeBadge = (type: ActivityType) => {
    const config = ACTIVITY_CONFIG[type] || ACTIVITY_CONFIG.interaction;
    return (
      <View style={[styles.typeBadge, { backgroundColor: config.bgColor }]}>
        <Ionicons name={config.icon as any} size={12} color={config.color} />
        <Text style={[styles.typeBadgeText, { color: config.color }]}>
          {type.replace('_', ' ').toUpperCase()}
        </Text>
      </View>
    );
  };

  // Render platform badge
  const renderPlatformBadge = (platform: string) => {
    const icons: Record<string, string> = {
      web: 'globe-outline',
      ios: 'logo-apple',
      android: 'logo-android',
    };
    const colors: Record<string, string> = {
      web: COLORS.info,
      ios: '#000',
      android: '#3ddc84',
    };
    return (
      <View style={[styles.platformBadge, { borderColor: colors[platform] || COLORS.textMuted }]}>
        <Ionicons name={(icons[platform] || 'help-outline') as any} size={12} color={colors[platform] || COLORS.textMuted} />
        <Text style={[styles.platformBadgeText, { color: colors[platform] || COLORS.textMuted }]}>
          {platform.toUpperCase()}
        </Text>
      </View>
    );
  };

  // Render log row
  const renderLogRow = (log: ActivityLog, index: number) => {
    const config = ACTIVITY_CONFIG[log.type] || ACTIVITY_CONFIG.interaction;
    const isError = log.type === 'error';

    // Mobile Card Layout
    if (isMobile) {
      return (
        <Pressable
          key={log.id}
          style={[
            styles.logCardMobile,
            isError && styles.logCardMobileError,
          ]}
          onPress={() => setSelectedLog(log)}
        >
          {/* Card Header */}
          <View style={styles.logCardHeaderMobile}>
            <View style={styles.logCardHeaderLeftMobile}>
              <View style={[
                styles.categoryIndicatorMobile,
                { backgroundColor: log.category === 'user' ? '#22c55e' : '#f59e0b' }
              ]}>
                <Ionicons 
                  name={log.category === 'user' ? 'person' : 'globe'} 
                  size={10} 
                  color="#fff" 
                />
              </View>
              <Text style={styles.logCardTimeMobile}>{formatTime(log.timestamp)}</Text>
            </View>
            <View style={styles.logCardHeaderRightMobile}>
              {renderPlatformBadge(log.platform)}
            </View>
          </View>

          {/* Type and Action Row */}
          <View style={styles.logCardBadgeRowMobile}>
            {renderTypeBadge(log.type)}
            {(() => {
              const actionKey = log.action.toLowerCase();
              const actionConfig = ACTION_CONFIG[actionKey] || { color: '#64748b', icon: 'ellipse-outline', bgColor: '#f1f5f9' };
              return (
                <View style={[styles.actionBadgeMobile, { backgroundColor: actionConfig.bgColor }]}>
                  <Ionicons name={actionConfig.icon as any} size={12} color={actionConfig.color} />
                  <Text style={[styles.actionTextMobile, { color: actionConfig.color }]} numberOfLines={1}>
                    {log.action.replace(/_/g, ' ').charAt(0).toUpperCase() + log.action.replace(/_/g, ' ').slice(1)}
                  </Text>
                </View>
              );
            })()}
          </View>

          {/* Description */}
          <Text style={styles.logCardDescriptionMobile} numberOfLines={2}>
            {log.description}
          </Text>

          {/* Additional Info */}
          {(log.attemptedEmail || log.attemptedPhone || log.userId) && (
            <View style={styles.logCardMetaMobile}>
              {log.attemptedEmail && (
                <Text style={[styles.logCardMetaTextMobile, { color: COLORS.error }]} numberOfLines={1}>
                  Email: {log.attemptedEmail}
                </Text>
              )}
              {log.attemptedPhone && (
                <Text style={[styles.logCardMetaTextMobile, { color: COLORS.error }]} numberOfLines={1}>
                  Phone: {log.attemptedPhone}
                </Text>
              )}
              {log.userId && (
                <Text style={styles.logCardMetaTextMobile} numberOfLines={1}>
                  User: {log.userId}
                </Text>
              )}
            </View>
          )}
        </Pressable>
      );
    }

    // Desktop Table Row Layout
    return (
      <Pressable
        key={log.id}
        style={({ hovered }: any) => [
          styles.logRow,
          isError && styles.logRowError,
          hovered && styles.logRowHovered,
        ]}
        onPress={() => setSelectedLog(log)}
      >
        {/* Category indicator */}
        <View style={[styles.logColumn, styles.categoryColumn]}>
          <View style={[
            styles.categoryIndicator,
            { backgroundColor: log.category === 'user' ? '#22c55e' : '#f59e0b' }
          ]}>
            <Ionicons 
              name={log.category === 'user' ? 'person' : 'globe'} 
              size={10} 
              color="#fff" 
            />
          </View>
        </View>

        {/* Time column */}
        <View style={[styles.logColumn, styles.timeColumn]}>
          <Text style={styles.timeText}>{formatFullTime(log.timestamp)}</Text>
        </View>

        {/* Type column */}
        <View style={[styles.logColumn, styles.typeColumn]}>
          {renderTypeBadge(log.type)}
        </View>

        {/* Action column */}
        <View style={[styles.logColumn, styles.actionColumn]}>
          {(() => {
            const actionKey = log.action.toLowerCase();
            const actionConfig = ACTION_CONFIG[actionKey] || { color: '#64748b', icon: 'ellipse-outline', bgColor: '#f1f5f9' };
            return (
              <View style={[styles.actionBadge, { backgroundColor: actionConfig.bgColor }]}>
                <Ionicons name={actionConfig.icon as any} size={14} color={actionConfig.color} />
                <Text style={[styles.actionText, { color: actionConfig.color }]} numberOfLines={1}>
                  {log.action.replace(/_/g, ' ').charAt(0).toUpperCase() + log.action.replace(/_/g, ' ').slice(1)}
                </Text>
              </View>
            );
          })()}
        </View>

        {/* Description column */}
        <View style={[styles.logColumn, styles.descriptionColumn]}>
          <Text style={styles.descriptionText} numberOfLines={1}>
            {log.description}
          </Text>
          {/* Show attempted credentials for failed logins */}
          {log.attemptedEmail && (
            <Text style={[styles.metadataText, { color: COLORS.error }]} numberOfLines={1}>
              Email: {log.attemptedEmail}
            </Text>
          )}
          {log.attemptedPhone && (
            <Text style={[styles.metadataText, { color: COLORS.error }]} numberOfLines={1}>
              Phone: {log.attemptedPhone}
            </Text>
          )}
          {log.collection && (
            <Text style={styles.metadataText} numberOfLines={1}>
              Collection: {log.collection}
            </Text>
          )}
          {log.metadata?.screenName && (
            <Text style={styles.metadataText} numberOfLines={1}>
              Screen: {log.metadata.screenName}
            </Text>
          )}
        </View>

        {/* Platform column */}
        <View style={[styles.logColumn, styles.platformColumn]}>
          {renderPlatformBadge(log.platform)}
        </View>

        {/* User column */}
        <View style={[styles.logColumn, styles.userColumn]}>
          <Text style={styles.userIdText} numberOfLines={1}>
            {log.userId ? `${log.userId.slice(0, 8)}...` : log.category === 'general' ? 'Anonymous' : '-'}
          </Text>
        </View>
      </Pressable>
    );
  };

  // Render log detail modal
  const renderLogDetailModal = () => {
    if (!selectedLog) return null;

    return (
      <Pressable style={styles.modalOverlay} onPress={() => setSelectedLog(null)}>
        <Pressable style={[styles.modalContent, isMobile && styles.modalContentMobile]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, isMobile && styles.modalTitleMobile]}>Activity Log Details</Text>
            <TouchableOpacity onPress={() => setSelectedLog(null)} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={[styles.detailRow, isMobile && styles.detailRowMobile]}>
              <Text style={[styles.detailLabel, isMobile && styles.detailLabelMobile]}>ID</Text>
              <Text style={[styles.detailValue, isMobile && styles.detailValueMobile]} numberOfLines={1}>{selectedLog.id}</Text>
            </View>
            <View style={[styles.detailRow, isMobile && styles.detailRowMobile]}>
              <Text style={[styles.detailLabel, isMobile && styles.detailLabelMobile]}>Category</Text>
              <View style={[styles.categoryBadge, { backgroundColor: selectedLog.category === 'user' ? '#dcfce7' : '#fef3c7' }]}>
                <Ionicons 
                  name={selectedLog.category === 'user' ? 'person-outline' : 'globe-outline'} 
                  size={14} 
                  color={selectedLog.category === 'user' ? '#22c55e' : '#f59e0b'} 
                />
                <Text style={[styles.categoryBadgeText, { color: selectedLog.category === 'user' ? '#22c55e' : '#f59e0b' }]}>
                  {selectedLog.category === 'user' ? 'User Activity' : 'General / Anonymous'}
                </Text>
              </View>
            </View>
            {selectedLog.userId && (
              <View style={[styles.detailRow, isMobile && styles.detailRowMobile]}>
                <Text style={[styles.detailLabel, isMobile && styles.detailLabelMobile]}>User ID</Text>
                <Text style={[styles.detailValue, isMobile && styles.detailValueMobile]}>{selectedLog.userId}</Text>
              </View>
            )}
            {selectedLog.attemptedEmail && (
              <View style={[styles.detailRow, isMobile && styles.detailRowMobile]}>
                <Text style={styles.detailLabel}>Attempted Email</Text>
                <Text style={[styles.detailValue, { color: COLORS.error }]}>{selectedLog.attemptedEmail}</Text>
              </View>
            )}
            {selectedLog.attemptedPhone && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Attempted Phone</Text>
                <Text style={[styles.detailValue, { color: COLORS.error }]}>{selectedLog.attemptedPhone}</Text>
              </View>
            )}
            {selectedLog.coupleId && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Couple ID</Text>
                <Text style={styles.detailValue}>{selectedLog.coupleId}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Type</Text>
              {renderTypeBadge(selectedLog.type)}
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Action</Text>
              <Text style={styles.detailValue}>{selectedLog.action}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Description</Text>
              <Text style={styles.detailValue}>{selectedLog.description}</Text>
            </View>
            {selectedLog.collection && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Collection</Text>
                <Text style={styles.detailValue}>{selectedLog.collection}</Text>
              </View>
            )}
            {selectedLog.documentId && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Document ID</Text>
                <Text style={styles.detailValue}>{selectedLog.documentId}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Platform</Text>
              {renderPlatformBadge(selectedLog.platform)}
            </View>
            {selectedLog.appVersion && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>App Version</Text>
                <Text style={styles.detailValue}>{selectedLog.appVersion}</Text>
              </View>
            )}
            {selectedLog.deviceInfo && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Device Info</Text>
                <Text style={styles.detailValue}>{selectedLog.deviceInfo}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Timestamp</Text>
              <Text style={styles.detailValue}>{formatFullTime(selectedLog.timestamp)}</Text>
            </View>
            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Metadata</Text>
                <View style={styles.metadataContainer}>
                  {Object.entries(selectedLog.metadata).map(([key, value]) => (
                    <View key={key} style={styles.metadataItem}>
                      <Text style={styles.metadataKey}>{key}:</Text>
                      <Text style={styles.metadataValue}>{String(value)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    );
  };

  // Render skeleton loader
  const renderSkeleton = () => {
    if (isMobile) {
      return (
        <View style={styles.skeletonContainerMobile}>
          {Array.from({ length: 6 }).map((_, index) => (
            <View key={index} style={styles.skeletonCardMobile}>
              <View style={styles.skeletonCardHeaderMobile}>
                <SkeletonBox width={80} height={14} />
                <SkeletonBox width={60} height={20} borderRadius={10} />
              </View>
              <View style={styles.skeletonCardBadgesMobile}>
                <SkeletonBox width={70} height={22} borderRadius={11} />
                <SkeletonBox width={90} height={22} borderRadius={8} />
              </View>
              <SkeletonBox width="100%" height={16} style={{ marginTop: 8 }} />
              <SkeletonBox width="70%" height={14} style={{ marginTop: 6 }} />
            </View>
          ))}
        </View>
      );
    }
    
    return (
      <View style={styles.skeletonContainer}>
        {Array.from({ length: 10 }).map((_, index) => (
          <View key={index} style={styles.skeletonRow}>
            <SkeletonBox width={120} height={16} />
            <SkeletonBox width={80} height={24} borderRadius={12} />
            <SkeletonBox width={100} height={24} borderRadius={12} />
            <SkeletonBox width="40%" height={16} />
            <SkeletonBox width={60} height={24} borderRadius={12} />
            <SkeletonBox width={80} height={16} />
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={[styles.header, isMobile && styles.headerMobile]}>
        <View style={[styles.headerContent, isMobile && styles.headerContentMobile]}>
          <View style={[styles.headerLeft, isMobile && styles.headerLeftMobile]}>
            <Ionicons name="pulse" size={isMobile ? 24 : 28} color="#fff" />
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.headerTitle, isMobile && styles.headerTitleMobile]}>Activity Logs</Text>
              {!isMobile && <Text style={styles.headerSubtitle}>Monitor user activities in real-time</Text>}
            </View>
          </View>

          <View style={[styles.headerRight, isMobile && styles.headerRightMobile]}>
            {/* Mobile Search Toggle */}
            {isMobile && (
              <TouchableOpacity
                style={[styles.mobileSearchButton, showMobileSearch && styles.mobileSearchButtonActive]}
                onPress={() => setShowMobileSearch(!showMobileSearch)}
              >
                <Ionicons name="search" size={20} color={showMobileSearch ? COLORS.primary : '#fff'} />
              </TouchableOpacity>
            )}

            {/* Live Mode Toggle */}
            <TouchableOpacity
              style={[styles.liveButton, isMobile && styles.liveButtonMobile, liveMode && styles.liveButtonActive]}
              onPress={() => setLiveMode(!liveMode)}
            >
              <Animated.View style={{ transform: [{ scale: liveMode ? pulseAnim : 1 }] }}>
                <View style={[styles.liveDot, liveMode && styles.liveDotActive]} />
              </Animated.View>
              {!isMobile && (
                <Text style={[styles.liveButtonText, liveMode && styles.liveButtonTextActive]}>
                  Live
                </Text>
              )}
            </TouchableOpacity>

            {/* Refresh Button */}
            <TouchableOpacity
              style={[styles.refreshButton, isMobile && styles.refreshButtonMobile]}
              onPress={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="refresh" size={isMobile ? 18 : 20} color="#fff" />
              )}
            </TouchableOpacity>

            {/* Filter Toggle */}
            <TouchableOpacity
              style={[styles.filterButton, isMobile && styles.filterButtonMobile, showFilters && styles.filterButtonActive]}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Ionicons name="options-outline" size={isMobile ? 18 : 20} color={showFilters ? COLORS.primary : '#fff'} />
              {hasActiveFilters && <View style={styles.filterBadgeDot} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Desktop Search Bar */}
        {!isMobile && (
          <View style={styles.searchBar}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={18} color={COLORS.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search logs by description, action, or user ID..."
                placeholderTextColor={COLORS.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statBadge}>
                <Text style={styles.statValue}>{filteredLogs.length.toLocaleString()}</Text>
                <Text style={styles.statLabel}>logs found</Text>
              </View>
            </View>
          </View>
        )}
      </LinearGradient>

      {/* Mobile Search Panel */}
      {isMobile && showMobileSearch && (
        <View style={styles.mobileSearchPanel}>
          {/* Unified Search Input */}
          <View style={styles.mobileSearchInputWrapper}>
            <View style={styles.mobileSearchInputContainer}>
              <Ionicons name="search" size={20} color={COLORS.primary} style={styles.mobileSearchIcon} />
              <TextInput
                style={styles.mobileSearchInput}
                placeholder="Search by user, action, description, ID..."
                placeholderTextColor={COLORS.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.mobileSearchClearButton}>
                  <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Quick Type Filters */}
          <View style={styles.mobileQuickFiltersContainer}>
            <Text style={styles.mobileQuickFiltersLabel}>Quick Filters:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mobileQuickFiltersScroll}>
              <View style={styles.mobileQuickFilters}>
                <TouchableOpacity
                  style={[styles.mobileQuickFilterChip, typeFilter === 'all' && styles.mobileQuickFilterChipActive]}
                  onPress={() => setTypeFilter('all')}
                >
                  <Text style={[styles.mobileQuickFilterText, typeFilter === 'all' && styles.mobileQuickFilterTextActive]}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.mobileQuickFilterChip, typeFilter === 'auth' && styles.mobileQuickFilterChipActive, { borderColor: '#8b5cf6' }]}
                  onPress={() => setTypeFilter('auth')}
                >
                  <Ionicons name="key-outline" size={12} color={typeFilter === 'auth' ? '#fff' : '#8b5cf6'} />
                  <Text style={[styles.mobileQuickFilterText, typeFilter === 'auth' && styles.mobileQuickFilterTextActive]}>Auth</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.mobileQuickFilterChip, typeFilter === 'data_create' && styles.mobileQuickFilterChipActive, { borderColor: '#22c55e' }]}
                  onPress={() => setTypeFilter('data_create')}
                >
                  <Ionicons name="add-circle-outline" size={12} color={typeFilter === 'data_create' ? '#fff' : '#22c55e'} />
                  <Text style={[styles.mobileQuickFilterText, typeFilter === 'data_create' && styles.mobileQuickFilterTextActive]}>Create</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.mobileQuickFilterChip, typeFilter === 'data_update' && styles.mobileQuickFilterChipActive, { borderColor: '#f59e0b' }]}
                  onPress={() => setTypeFilter('data_update')}
                >
                  <Ionicons name="create-outline" size={12} color={typeFilter === 'data_update' ? '#fff' : '#f59e0b'} />
                  <Text style={[styles.mobileQuickFilterText, typeFilter === 'data_update' && styles.mobileQuickFilterTextActive]}>Update</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.mobileQuickFilterChip, typeFilter === 'data_delete' && styles.mobileQuickFilterChipActive, { borderColor: '#ef4444' }]}
                  onPress={() => setTypeFilter('data_delete')}
                >
                  <Ionicons name="trash-outline" size={12} color={typeFilter === 'data_delete' ? '#fff' : '#ef4444'} />
                  <Text style={[styles.mobileQuickFilterText, typeFilter === 'data_delete' && styles.mobileQuickFilterTextActive]}>Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.mobileQuickFilterChip, typeFilter === 'error' && styles.mobileQuickFilterChipActive, { borderColor: '#dc2626' }]}
                  onPress={() => setTypeFilter('error')}
                >
                  <Ionicons name="warning-outline" size={12} color={typeFilter === 'error' ? '#fff' : '#dc2626'} />
                  <Text style={[styles.mobileQuickFilterText, typeFilter === 'error' && styles.mobileQuickFilterTextActive]}>Error</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>

          {/* Search Results Summary */}
          <View style={styles.mobileSearchSummary}>
            <Text style={styles.mobileSearchSummaryText}>
              {filteredLogs.length.toLocaleString()} logs found
            </Text>
            {hasActiveFilters && (
              <TouchableOpacity style={styles.mobileSearchClearAll} onPress={clearAllFilters}>
                <Ionicons name="close-circle" size={14} color={COLORS.error} />
                <Text style={styles.mobileSearchClearAllText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Category Tabs */}
      <ScrollView 
        horizontal={isMobile} 
        showsHorizontalScrollIndicator={false}
        style={[styles.categoryTabsScroll, isMobile && styles.categoryTabsScrollMobile]}
      >
        <View style={[styles.categoryTabsContainer, isMobile && styles.categoryTabsContainerMobile]}>
          {CATEGORY_TABS.map((tab) => {
            const isActive = categoryFilter === tab.value;
            const count = tab.value === 'all' 
              ? totalCount 
              : tab.value === 'user' 
                ? categoryCounts.user 
                : categoryCounts.general;
            
            return (
              <TouchableOpacity
                key={tab.value}
                style={[styles.categoryTab, isMobile && styles.categoryTabMobile, isActive && styles.categoryTabActive]}
                onPress={() => setCategoryFilter(tab.value)}
              >
                <Ionicons 
                  name={tab.icon as any} 
                  size={isMobile ? 16 : 18} 
                  color={isActive ? tab.color : COLORS.textSecondary} 
                />
                {!isMobile && (
                  <Text style={[styles.categoryTabText, isActive && { color: tab.color }]}>
                    {tab.label}
                  </Text>
                )}
                <View style={[styles.categoryTabCount, isMobile && styles.categoryTabCountMobile, isActive && { backgroundColor: tab.color }]}>
                  <Text style={[styles.categoryTabCountText, isActive && { color: '#fff' }]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Filters Panel */}
      {showFilters && (
        <View style={[styles.filtersPanel, isMobile && styles.filtersPanelMobile]}>
          {/* Header with Clear All */}
          <View style={styles.filtersPanelHeader}>
            <Text style={styles.filtersPanelTitle}>Filters</Text>
            {hasActiveFilters && (
              <TouchableOpacity style={styles.clearFiltersButton} onPress={clearAllFilters}>
                <Ionicons name="close-circle-outline" size={16} color={COLORS.error} />
                <Text style={styles.clearFiltersText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* User ID Search - Desktop only */}
          {!isMobile && (
            <View style={styles.filterGroup}>
              <View style={styles.filterLabelRow}>
                <Ionicons name="person-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.filterLabel}>User / Couple ID</Text>
              </View>
              <View style={styles.userIdSearchContainer}>
                <Ionicons name="search" size={16} color={COLORS.textMuted} />
                <TextInput
                  style={styles.userIdSearchInput}
                  placeholder="Enter User ID or Couple ID (e.g., C_001_M)..."
                  placeholderTextColor={COLORS.textMuted}
                  value={userIdSearch}
                  onChangeText={setUserIdSearch}
                />
                {userIdSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setUserIdSearch('')}>
                    <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Date Filter */}
          <View style={styles.filterGroup}>
            <View style={styles.filterLabelRow}>
              <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.filterLabel}>Date Range</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterChips}>
                {DATE_FILTERS.map((filter) => (
                  <TouchableOpacity
                    key={filter.value}
                    style={[
                      styles.filterChip,
                      dateFilter === filter.value && styles.filterChipActive,
                    ]}
                    onPress={() => setDateFilter(filter.value)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        dateFilter === filter.value && styles.filterChipTextActive,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Hour Filter */}
          <View style={styles.filterGroup}>
            <View style={styles.filterLabelRow}>
              <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.filterLabel}>Time of Day</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterChips}>
                {HOUR_FILTERS.map((filter) => (
                  <TouchableOpacity
                    key={filter.value}
                    style={[
                      styles.filterChip,
                      hourFilter === filter.value && styles.filterChipActive,
                    ]}
                    onPress={() => setHourFilter(filter.value)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        hourFilter === filter.value && styles.filterChipTextActive,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Type Filter */}
          <View style={styles.filterGroup}>
            <View style={styles.filterLabelRow}>
              <Ionicons name="pricetag-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.filterLabel}>Activity Type</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterChips}>
                {TYPE_FILTERS.map((filter) => (
                  <TouchableOpacity
                    key={filter.value}
                    style={[
                      styles.filterChip,
                      typeFilter === filter.value && styles.filterChipActive,
                    ]}
                    onPress={() => setTypeFilter(filter.value)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        typeFilter === filter.value && styles.filterChipTextActive,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Platform Filter */}
          <View style={styles.filterGroup}>
            <View style={styles.filterLabelRow}>
              <Ionicons name="phone-portrait-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.filterLabel}>Platform</Text>
            </View>
            <View style={styles.filterChips}>
              {PLATFORM_FILTERS.map((filter) => (
                <TouchableOpacity
                  key={filter.value}
                  style={[
                    styles.filterChip,
                    platformFilter === filter.value && styles.filterChipActive,
                  ]}
                  onPress={() => setPlatformFilter(filter.value)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      platformFilter === filter.value && styles.filterChipTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <View style={styles.activeFiltersSummary}>
              <Text style={styles.activeFiltersText}>
                Active filters: 
                {dateFilter !== 'all' && ` ${DATE_FILTERS.find(f => f.value === dateFilter)?.label}`}
                {hourFilter !== 'all' && ` • ${HOUR_FILTERS.find(f => f.value === hourFilter)?.label}`}
                {typeFilter !== 'all' && ` • ${typeFilter}`}
                {platformFilter !== 'all' && ` • ${platformFilter}`}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Activity Timeline Bar */}
      {!isMobile && (
        <View style={styles.timelineBar}>
          <View style={styles.timelineInner}>
            {Array.from({ length: 60 }).map((_, i) => {
              const height = Math.random() * 20 + 5;
              const hasError = Math.random() > 0.95;
              return (
                <View
                  key={i}
                  style={[
                    styles.timelineBar2,
                    { height, backgroundColor: hasError ? COLORS.error : COLORS.primary + '60' },
                  ]}
                />
              );
            })}
          </View>
        </View>
      )}

      {/* Mobile Stats Bar */}
      {isMobile && (
        <View style={styles.mobileStatsBar}>
          <Text style={styles.mobileStatsText}>{filteredLogs.length.toLocaleString()} logs found</Text>
          {hasActiveFilters && (
            <TouchableOpacity style={styles.mobileClearFilters} onPress={clearAllFilters}>
              <Ionicons name="close-circle" size={14} color={COLORS.error} />
              <Text style={styles.mobileClearFiltersText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Table Header - Desktop only */}
      {!isMobile && (
        <View style={styles.tableHeader}>
          <View style={[styles.headerColumn, styles.timeColumn]}>
            <Text style={styles.headerColumnText}>Time</Text>
          </View>
          <View style={[styles.headerColumn, styles.typeColumn]}>
            <Text style={styles.headerColumnText}>Type</Text>
          </View>
          <View style={[styles.headerColumn, styles.actionColumn]}>
            <Text style={styles.headerColumnText}>Action</Text>
          </View>
          <View style={[styles.headerColumn, styles.descriptionColumn]}>
            <Text style={styles.headerColumnText}>Description</Text>
          </View>
          <View style={[styles.headerColumn, styles.platformColumn]}>
            <Text style={styles.headerColumnText}>Platform</Text>
          </View>
          <View style={[styles.headerColumn, styles.userColumn]}>
            <Text style={styles.headerColumnText}>User</Text>
          </View>
        </View>
      )}

      {/* Logs List */}
      <ScrollView 
        style={styles.logsContainer} 
        contentContainerStyle={[styles.logsContent, isMobile && styles.logsContentMobile]}
      >
        {loading ? (
          renderSkeleton()
        ) : filteredLogs.length === 0 ? (
          <View style={[styles.emptyState, isMobile && styles.emptyStateMobile]}>
            <Ionicons name="document-text-outline" size={isMobile ? 48 : 64} color={COLORS.textMuted} />
            <Text style={[styles.emptyStateTitle, isMobile && styles.emptyStateTitleMobile]}>No Activity Logs Found</Text>
            <Text style={[styles.emptyStateSubtitle, isMobile && styles.emptyStateSubtitleMobile]}>
              {searchQuery || typeFilter !== 'all' || platformFilter !== 'all'
                ? 'Try adjusting your filters or search query'
                : 'Activity logs will appear here as users interact with the app'}
            </Text>
          </View>
        ) : (
          filteredLogs.map((log, index) => renderLogRow(log, index))
        )}
      </ScrollView>

      {/* Log Detail Modal */}
      {selectedLog && renderLogDetailModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitleContainer: {
    gap: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  liveButtonActive: {
    backgroundColor: '#fff',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  liveDotActive: {
    backgroundColor: COLORS.success,
  },
  liveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  liveButtonTextActive: {
    color: COLORS.textPrimary,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    ...(isWeb && { outlineStyle: 'none' as any }),
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  filtersPanel: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 16,
  },
  filtersPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  filtersPanelTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
  },
  clearFiltersText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.error,
  },
  filterGroup: {
    gap: 8,
  },
  filterLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userIdSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  userIdSearchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
    ...(isWeb && { outlineStyle: 'none' as any }),
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.borderLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  activeFiltersSummary: {
    backgroundColor: COLORS.primaryLight + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primaryLight + '30',
    marginTop: 4,
  },
  activeFiltersText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  timelineBar: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginTop: 0,
  },
  timelineInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 20,
    gap: 2,
  },
  timelineBar2: {
    flex: 1,
    borderRadius: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.borderLight,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerColumn: {
    justifyContent: 'center',
  },
  headerColumnText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logsContainer: {
    flex: 1,
  },
  logsContent: {
    paddingBottom: 16,
  },
  logsContentMobile: {
    paddingBottom: 12,
  },
  logRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
  },
  logRowError: {
    backgroundColor: '#fef2f2',
  },
  logRowHovered: {
    backgroundColor: COLORS.borderLight,
  },
  logColumn: {
    justifyContent: 'center',
  },
  timeColumn: {
    width: 140,
  },
  typeColumn: {
    width: 120,
  },
  actionColumn: {
    width: 170,
    overflow: 'hidden',
  },
  descriptionColumn: {
    flex: 1,
    minWidth: 200,
    gap: 2,
    paddingLeft: 8,
  },
  platformColumn: {
    width: 90,
  },
  userColumn: {
    width: 100,
  },
  timeText: {
    fontSize: 12,
    fontFamily: isWeb ? 'monospace' : undefined,
    color: COLORS.textSecondary,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: '100%',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
    flexShrink: 1,
  },
  descriptionText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  metadataText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
    lineHeight: 14,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  platformBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  userIdText: {
    fontSize: 11,
    fontFamily: isWeb ? 'monospace' : undefined,
    color: COLORS.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyStateMobile: {
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  emptyStateTitleMobile: {
    fontSize: 16,
    marginTop: 12,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 300,
  },
  emptyStateSubtitleMobile: {
    fontSize: 13,
    maxWidth: '90%',
  },
  skeletonContainer: {
    padding: 24,
    gap: 16,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    width: '90%',
    maxWidth: 600,
    maxHeight: '80%',
    ...(isWeb && {
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalBody: {
    padding: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  detailLabel: {
    width: 120,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  metadataContainer: {
    flex: 1,
    gap: 4,
  },
  metadataItem: {
    flexDirection: 'row',
    gap: 8,
  },
  metadataKey: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  metadataValue: {
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  // Category tabs styles
  categoryTabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 0,
    gap: 10,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    gap: 6,
  },
  categoryTabActive: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  categoryTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  categoryTabCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: COLORS.border,
  },
  categoryTabCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  // Category indicator in log row
  categoryColumn: {
    width: 30,
  },
  categoryIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Category badge in modal
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ============================================
  // MOBILE RESPONSIVE STYLES
  // ============================================

  // Header Mobile Styles
  headerMobile: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerContentMobile: {
    marginBottom: 12,
  },
  headerLeftMobile: {
    gap: 8,
  },
  headerTitleMobile: {
    fontSize: 20,
  },
  headerRightMobile: {
    gap: 6,
  },

  // Search Bar Mobile Styles
  searchBarMobile: {
    flexDirection: 'column',
    gap: 0,
  },
  searchInputContainerMobile: {
    paddingVertical: 8,
    borderRadius: 10,
  },

  // Category Tabs Scroll Style (Desktop)
  categoryTabsScroll: {
    flexGrow: 0,
    backgroundColor: COLORS.surface,
  },

  // Category Tabs Mobile Styles
  categoryTabsScrollMobile: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  categoryTabsContainerMobile: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  categoryTabMobile: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  categoryTabCountMobile: {
    paddingHorizontal: 6,
    paddingVertical: 1,
  },

  // Filters Panel Mobile Styles
  filtersPanelMobile: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },

  // Mobile Stats Bar
  mobileStatsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.borderLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  mobileStatsText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  mobileClearFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
  },
  mobileClearFiltersText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.error,
  },

  // Mobile Log Card Styles
  logCardMobile: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
    ...(isWeb && {
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    }),
  },
  logCardMobileError: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  logCardHeaderMobile: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logCardHeaderLeftMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logCardHeaderRightMobile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIndicatorMobile: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logCardTimeMobile: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  logCardBadgeRowMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBadgeMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  actionTextMobile: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  logCardDescriptionMobile: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  logCardMetaMobile: {
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    gap: 4,
  },
  logCardMetaTextMobile: {
    fontSize: 11,
    color: COLORS.textMuted,
  },

  // Mobile Skeleton Styles
  skeletonContainerMobile: {
    padding: 12,
    gap: 10,
  },
  skeletonCardMobile: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  skeletonCardHeaderMobile: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  skeletonCardBadgesMobile: {
    flexDirection: 'row',
    gap: 8,
  },

  // Modal Mobile Styles
  modalContentMobile: {
    width: '95%',
    maxWidth: '95%',
    maxHeight: '90%',
    borderRadius: 16,
    marginHorizontal: 10,
  },
  modalTitleMobile: {
    fontSize: 16,
  },
  modalCloseButton: {
    padding: 4,
  },
  detailRowMobile: {
    flexDirection: 'column',
    gap: 4,
    paddingVertical: 10,
  },
  detailLabelMobile: {
    width: 'auto',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValueMobile: {
    fontSize: 14,
  },

  // ============================================
  // MOBILE SEARCH PANEL STYLES
  // ============================================

  mobileSearchButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileSearchButtonActive: {
    backgroundColor: '#fff',
  },
  liveButtonMobile: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  refreshButtonMobile: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  filterButtonMobile: {
    width: 36,
    height: 36,
    borderRadius: 18,
    position: 'relative',
  },
  filterBadgeDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
    borderWidth: 1,
    borderColor: '#fff',
  },
  mobileSearchPanel: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
    ...(isWeb && {
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    }),
  },
  mobileSearchInputWrapper: {
    gap: 8,
  },
  mobileSearchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  mobileSearchIcon: {
    marginRight: 4,
  },
  mobileSearchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingVertical: 0,
    ...(isWeb && { outlineStyle: 'none' as any }),
  },
  mobileSearchClearButton: {
    padding: 4,
  },
  mobileQuickFiltersContainer: {
    gap: 8,
  },
  mobileQuickFiltersLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mobileQuickFiltersScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  mobileQuickFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  mobileQuickFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mobileQuickFilterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  mobileQuickFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  mobileQuickFilterTextActive: {
    color: '#fff',
  },
  mobileSearchSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  mobileSearchSummaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  mobileSearchClearAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#fee2e2',
  },
  mobileSearchClearAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.error,
  },
});
