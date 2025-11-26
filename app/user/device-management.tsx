import BottomNavBar from '@/components/navigation/BottomNavBar';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    Alert,
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

interface DeviceSession {
  id: string;
  deviceName: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'web';
  browser?: string;
  os: string;
  location: string;
  lastActive: string;
  isCurrentDevice: boolean;
  ipAddress: string;
}

// Mock data - In production this would come from Firebase
const mockSessions: DeviceSession[] = [
  {
    id: '1',
    deviceName: 'iPhone 14 Pro',
    deviceType: 'mobile',
    os: 'iOS 17.1',
    location: 'Chennai, Tamil Nadu',
    lastActive: 'Active now',
    isCurrentDevice: true,
    ipAddress: '192.168.1.***',
  },
  {
    id: '2',
    deviceName: 'MacBook Pro',
    deviceType: 'desktop',
    browser: 'Safari',
    os: 'macOS Sonoma',
    location: 'Chennai, Tamil Nadu',
    lastActive: '2 hours ago',
    isCurrentDevice: false,
    ipAddress: '192.168.1.***',
  },
  {
    id: '3',
    deviceName: 'Chrome Browser',
    deviceType: 'web',
    browser: 'Chrome 119',
    os: 'Windows 11',
    location: 'Bangalore, Karnataka',
    lastActive: '3 days ago',
    isCurrentDevice: false,
    ipAddress: '103.87.***',
  },
  {
    id: '4',
    deviceName: 'Samsung Galaxy Tab',
    deviceType: 'tablet',
    os: 'Android 14',
    location: 'Chennai, Tamil Nadu',
    lastActive: '1 week ago',
    isCurrentDevice: false,
    ipAddress: '192.168.1.***',
  },
];

export default function DeviceManagementScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const { colors, isDarkMode } = useTheme();
  
  const toastAnim = useRef(new Animated.Value(-100)).current;
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const [sessions, setSessions] = useState<DeviceSession[]>(mockSessions);

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
      }).start(() => setToast({ visible: false, message: '', type: '' }));
    }, 2500);
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return 'phone-portrait';
      case 'tablet':
        return 'tablet-portrait';
      case 'desktop':
        return 'desktop';
      case 'web':
        return 'globe';
      default:
        return 'hardware-chip';
    }
  };

  const getDeviceColor = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return '#22c55e';
      case 'tablet':
        return '#8b5cf6';
      case 'desktop':
        return '#3b82f6';
      case 'web':
        return '#f59e0b';
      default:
        return '#64748b';
    }
  };

  const handleLogoutDevice = (device: DeviceSession) => {
    if (device.isCurrentDevice) {
      Alert.alert(
        'Logout from this device?',
        'You will be signed out and redirected to the login screen.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Logout', 
            style: 'destructive',
            onPress: () => {
              showToast('Logging out...', 'info');
              setTimeout(() => {
                router.replace('/login');
              }, 1500);
            }
          },
        ]
      );
    } else {
      Alert.alert(
        'End this session?',
        `This will sign out "${device.deviceName}" from your account.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'End Session', 
            style: 'destructive',
            onPress: () => {
              setSessions(prev => prev.filter(s => s.id !== device.id));
              showToast(`${device.deviceName} has been logged out`, 'success');
            }
          },
        ]
      );
    }
  };

  const handleLogoutAllDevices = () => {
    Alert.alert(
      'Logout from all devices?',
      'This will sign you out from all devices including this one. You will need to login again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout All', 
          style: 'destructive',
          onPress: () => {
            showToast('Logging out from all devices...', 'info');
            setTimeout(() => {
              router.replace('/login');
            }, 1500);
          }
        },
      ]
    );
  };

  const renderHeader = () => (
    <LinearGradient colors={colors.headerBackground as [string, string]} style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Device Management</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <View style={styles.headerInfo}>
        <View style={styles.headerIconContainer}>
          <MaterialCommunityIcons name="devices" size={32} color="#fff" />
        </View>
        <Text style={styles.headerSubtitle}>
          Manage your active sessions and devices
        </Text>
        <View style={styles.sessionCount}>
          <Text style={styles.sessionCountText}>
            {sessions.length} Active {sessions.length === 1 ? 'Session' : 'Sessions'}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );

  const renderDeviceCard = (device: DeviceSession) => (
    <View 
      key={device.id} 
      style={[
        styles.deviceCard, 
        { backgroundColor: colors.cardBackground },
        device.isCurrentDevice && styles.currentDeviceCard,
        device.isCurrentDevice && { borderColor: colors.accent }
      ]}
    >
      {device.isCurrentDevice && (
        <View style={[styles.currentBadge, { backgroundColor: colors.accent }]}>
          <Text style={styles.currentBadgeText}>This Device</Text>
        </View>
      )}
      
      <View style={styles.deviceHeader}>
        <View style={[styles.deviceIconContainer, { backgroundColor: getDeviceColor(device.deviceType) + '20' }]}>
          <Ionicons name={getDeviceIcon(device.deviceType) as any} size={24} color={getDeviceColor(device.deviceType)} />
        </View>
        <View style={styles.deviceInfo}>
          <Text style={[styles.deviceName, { color: colors.text }]}>{device.deviceName}</Text>
          <Text style={[styles.deviceOs, { color: colors.textSecondary }]}>
            {device.os}{device.browser ? ` • ${device.browser}` : ''}
          </Text>
        </View>
        <View style={[
          styles.statusIndicator, 
          { backgroundColor: device.isCurrentDevice ? '#22c55e' : colors.textMuted }
        ]} />
      </View>
      
      <View style={[styles.deviceDetails, { borderTopColor: colors.borderLight }]}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>{device.location}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: device.isCurrentDevice ? '#22c55e' : colors.textSecondary }]}>
              {device.lastActive}
            </Text>
          </View>
        </View>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Ionicons name="wifi-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>IP: {device.ipAddress}</Text>
          </View>
        </View>
      </View>
      
      <TouchableOpacity 
        style={[
          styles.logoutButton, 
          { backgroundColor: device.isCurrentDevice ? '#fef2f2' : colors.inputBackground },
          isDarkMode && { backgroundColor: device.isCurrentDevice ? '#450a0a' : colors.inputBackground }
        ]}
        onPress={() => handleLogoutDevice(device)}
      >
        <Ionicons 
          name={device.isCurrentDevice ? "log-out-outline" : "close-circle-outline"} 
          size={18} 
          color={device.isCurrentDevice ? '#ef4444' : colors.textSecondary} 
        />
        <Text style={[
          styles.logoutButtonText, 
          { color: device.isCurrentDevice ? '#ef4444' : colors.textSecondary }
        ]}>
          {device.isCurrentDevice ? 'Logout' : 'End Session'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Toast Notification */}
      {toast.visible && (
        <Animated.View
          style={[
            styles.toast,
            { backgroundColor: colors.cardBackground },
            toast.type === 'error' ? styles.toastError : 
            toast.type === 'success' ? styles.toastSuccess : styles.toastInfo,
            { transform: [{ translateY: toastAnim }] },
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
        {renderHeader()}

        <View style={[styles.content, isMobile && styles.contentMobile]}>
          {/* Security Tip */}
          <View style={[styles.securityTip, { backgroundColor: isDarkMode ? colors.primaryLight : '#eff6ff' }]}>
            <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
            <Text style={[styles.securityTipText, { color: colors.textSecondary }]}>
              Review your active sessions regularly. If you see any unfamiliar device, end that session immediately.
            </Text>
          </View>

          {/* Active Sessions */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Sessions</Text>
            {sessions.map(device => renderDeviceCard(device))}
          </View>

          {/* Logout All Button */}
          {sessions.length > 1 && (
            <TouchableOpacity 
              style={[styles.logoutAllButton, { backgroundColor: isDarkMode ? '#450a0a' : '#fef2f2' }]}
              onPress={handleLogoutAllDevices}
            >
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={styles.logoutAllText}>Logout from All Devices</Text>
            </TouchableOpacity>
          )}

          {/* Session Info */}
          <View style={[styles.infoCard, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>About Sessions</Text>
            <View style={styles.infoItem}>
              <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Sessions are automatically created when you log in on a new device or browser.
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Inactive sessions are automatically removed after 30 days.
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                For security, change your password if you notice suspicious activity.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
      
      <BottomNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toast: {
    position: 'absolute',
    top: 0,
    left: isWeb ? undefined : 16,
    right: isWeb ? 20 : 16,
    zIndex: 1000,
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
  toastContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toastIcon: { fontSize: 18, fontWeight: 'bold' },
  toastText: { fontSize: 14, fontWeight: '600', flex: 1 },
  scrollContent: { 
    flexGrow: 1, 
    paddingBottom: isWeb ? 40 : 100,
  },
  header: {
    paddingTop: isWeb ? 20 : 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerInfo: {
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 12,
  },
  sessionCount: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  sessionCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
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
  securityTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 24,
  },
  securityTipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  deviceCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  currentDeviceCard: {
    borderWidth: 2,
  },
  currentBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  deviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  deviceOs: {
    fontSize: 13,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  deviceDetails: {
    paddingTop: 12,
    borderTopWidth: 1,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  logoutAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 8,
    marginBottom: 24,
  },
  logoutAllText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
  },
  infoCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
});
