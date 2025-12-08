import BottomNavBar from '@/components/navigation/BottomNavBar';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { deviceService } from '@/services/firestore.service';
import { UserDevice } from '@/types/firebase.types';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';

const isWeb = Platform.OS === 'web';

interface LocalDeviceInfo {
  deviceName: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'web';
  deviceModel?: string;
  os: string;
  osVersion: string;
  browser?: string;
  appVersion: string;
  buildNumber: string;
  expoGoVersion?: string;
}

export default function DeviceManagementScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const { colors, isDarkMode } = useTheme();
  const { logout } = useAuth();
  const { t } = useLanguage();
  
  const toastAnim = useRef(new Animated.Value(-100)).current;
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [userGender, setUserGender] = useState<'male' | 'female' | null>(null);

  // Load user session and devices
  useEffect(() => {
    loadUserSession();
  }, []);

  // Real-time subscription to devices
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    if (coupleId && userGender) {
      // Subscribe to real-time device updates
      unsubscribe = deviceService.subscribeToDevices(
        coupleId,
        userGender,
        (updatedDevices) => {
          console.log('Devices updated in real-time:', updatedDevices.length);
          setDevices(updatedDevices);
        }
      );
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [coupleId, userGender]);

  const loadUserSession = async () => {
    try {
      const storedCoupleId = await AsyncStorage.getItem('coupleId');
      const storedGender = await AsyncStorage.getItem('userGender');
      const storedDeviceId = await AsyncStorage.getItem('currentDeviceId');
      
      console.log('Session data loaded:', { storedCoupleId, storedGender, storedDeviceId });
      
      if (storedCoupleId && storedGender) {
        setCoupleId(storedCoupleId);
        setUserGender(storedGender as 'male' | 'female');
        setCurrentDeviceId(storedDeviceId);
        
        // Register/update current device and load all devices
        await registerCurrentDevice(storedCoupleId, storedGender as 'male' | 'female');
        await loadDevices(storedCoupleId, storedGender as 'male' | 'female');
      } else {
        console.warn('Missing coupleId or userGender in AsyncStorage');
        showToast('Error loading devices', 'error');
      }
    } catch (error) {
      console.error('Error loading user session:', error);
      showToast('Error loading devices', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const detectCurrentDevice = async (): Promise<LocalDeviceInfo> => {
    if (isWeb) {
      const userAgent = navigator.userAgent;
      let browser = 'Unknown Browser';
      let os = 'Unknown OS';
      
      // Detect browser
      if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) browser = 'Chrome';
      else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
      else if (userAgent.includes('Firefox')) browser = 'Firefox';
      else if (userAgent.includes('Edg')) browser = 'Microsoft Edge';
      else if (userAgent.includes('Opera') || userAgent.includes('OPR')) browser = 'Opera';

      // Detect OS
      if (userAgent.includes('Windows NT 10')) os = 'Windows 10/11';
      else if (userAgent.includes('Windows')) os = 'Windows';
      else if (userAgent.includes('Mac OS X')) os = 'macOS';
      else if (userAgent.includes('Linux')) os = 'Linux';
      else if (userAgent.includes('Android')) os = 'Android';
      else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

      const isMobileWeb = /iPhone|iPad|iPod|Android/i.test(userAgent);
      const isTablet = /iPad|Android/i.test(userAgent) && !/Mobile/i.test(userAgent);

      return {
        deviceName: `${browser} on ${os}`,
        deviceType: isTablet ? 'tablet' : isMobileWeb ? 'mobile' : 'web',
        os,
        osVersion: '',
        browser,
        appVersion: Constants.expoConfig?.version || '1.0.0',
        buildNumber: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode?.toString() || '1',
      };
    } else {
      const deviceType = Device.deviceType;
      let deviceTypeString: 'mobile' | 'tablet' | 'desktop' | 'web' = 'mobile';
      
      if (deviceType === Device.DeviceType.TABLET) deviceTypeString = 'tablet';
      else if (deviceType === Device.DeviceType.DESKTOP) deviceTypeString = 'desktop';

      // Include unique identifier for Expo Go
      const deviceModel = Device.modelId || Device.modelName || 'Unknown';
      const osVersion = Device.osVersion || Platform.Version.toString();

      return {
        deviceName: Device.modelName || Device.deviceName || 'Mobile Device',
        deviceType: deviceTypeString,
        deviceModel: `${deviceModel}-${osVersion}`,
        os: Platform.OS === 'ios' ? 'iOS' : 'Android',
        osVersion,
        appVersion: Constants.expoConfig?.version || '1.0.0',
        buildNumber: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode?.toString() || '1',
        expoGoVersion: Constants.expoConfig?.sdkVersion || undefined,
      };
    }
  };

  const registerCurrentDevice = async (cId: string, gender: 'male' | 'female') => {
    try {
      const deviceInfo = await detectCurrentDevice();
      console.log('Registering device with info:', deviceInfo);
      const result = await deviceService.registerDevice(cId, gender, deviceInfo);
      console.log('Device registered successfully:', result);
      setCurrentDeviceId(result.deviceId);
      await AsyncStorage.setItem('currentDeviceId', result.deviceId);
      await AsyncStorage.setItem('sessionToken', result.sessionToken);
      return result.deviceId;
    } catch (error) {
      console.error('Error registering device:', error);
      return null;
    }
  };

  const loadDevices = async (cId: string, gender: 'male' | 'female') => {
    try {
      console.log('Loading devices for coupleId:', cId, 'gender:', gender);
      const allDevices = await deviceService.getDevices(cId, gender);
      console.log('Devices loaded:', allDevices.length, allDevices);
      setDevices(allDevices);
    } catch (error) {
      console.error('Error loading devices:', error);
      showToast('Error loading devices', 'error');
    }
  };

  const onRefresh = useCallback(async () => {
    if (!coupleId || !userGender) return;
    setIsRefreshing(true);
    await loadDevices(coupleId, userGender);
    setIsRefreshing(false);
  }, [coupleId, userGender]);

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
      case 'mobile': return 'phone-portrait';
      case 'tablet': return 'tablet-portrait';
      case 'desktop': return 'desktop';
      case 'web': return 'globe';
      default: return 'hardware-chip';
    }
  };

  const getDeviceColor = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile': return '#22c55e';
      case 'tablet': return '#8b5cf6';
      case 'desktop': return '#3b82f6';
      case 'web': return '#f59e0b';
      default: return '#64748b';
    }
  };

  const formatLastActive = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 2) return 'Active now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const handleLogoutDevice = (device: UserDevice) => {
    console.log('handleLogoutDevice called for device:', device.id, device.deviceName);
    console.log('currentDeviceId:', currentDeviceId);
    console.log('Platform.OS:', Platform.OS);
    
    if (device.id === currentDeviceId) {
      // Logging out current device
      if (Platform.OS === 'web') {
        console.log('Showing web confirm dialog for current device');
        const confirmed = window.confirm('Are you sure you want to logout from this device?');
        console.log('User confirmed:', confirmed);
        if (confirmed) {
          (async () => {
            showToast('Logging out...', 'info');
            if (coupleId && userGender) {
              await deviceService.logoutDevice(coupleId, userGender, device.id);
            }
            await logout();
            router.replace('/login');
          })();
        }
      } else {
        Alert.alert(
          'Logout',
          'Are you sure you want to logout from this device?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Logout', 
              style: 'destructive',
              onPress: async () => {
                showToast('Logging out...', 'info');
                if (coupleId && userGender) {
                  await deviceService.logoutDevice(coupleId, userGender, device.id);
                }
                await logout();
                router.replace('/login');
              }
            },
          ]
        );
      }
    } else {
      // Remote logout - logout the other device (don't redirect current device)
      if (Platform.OS === 'web') {
        console.log('Showing web confirm dialog for remote device');
        const confirmed = window.confirm(`Are you sure you want to logout ${device.deviceName}?`);
        console.log('User confirmed:', confirmed);
        if (confirmed) {
          (async () => {
            if (coupleId && userGender) {
              console.log('Calling deviceService.logoutDevice...');
              await deviceService.logoutDevice(coupleId, userGender, device.id);
              showToast('Device logged out successfully', 'success');
            }
          })();
        }
      } else {
        Alert.alert(
          'Logout Device',
          `Are you sure you want to logout ${device.deviceName}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Logout', 
              style: 'destructive',
              onPress: async () => {
                if (coupleId && userGender) {
                  await deviceService.logoutDevice(coupleId, userGender, device.id);
                  showToast('Device logged out successfully', 'success');
                }
              }
            },
          ]
        );
      }
    }
  };

  const handleLogoutAllOthers = () => {
    const otherActiveDevices = devices.filter(d => d.id !== currentDeviceId && d.status === 'active');
    if (otherActiveDevices.length === 0) {
      showToast('No other active devices', 'info');
      return;
    }

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Are you sure you want to logout ${otherActiveDevices.length} device(s)?`);
      if (confirmed) {
        (async () => {
          if (coupleId && userGender && currentDeviceId) {
            const count = await deviceService.logoutAllOtherDevices(coupleId, userGender, currentDeviceId);
            showToast(`${count} device(s) logged out`, 'success');
          }
        })();
      }
    } else {
      Alert.alert(
        'Logout All Other Devices',
        `Are you sure you want to logout ${otherActiveDevices.length} device(s)?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Logout All', 
            style: 'destructive',
            onPress: async () => {
              if (coupleId && userGender && currentDeviceId) {
                const count = await deviceService.logoutAllOtherDevices(coupleId, userGender, currentDeviceId);
                showToast(`${count} device(s) logged out`, 'success');
              }
            }
          },
        ]
      );
    }
  };

  const renderHeader = () => {
    const activeCount = devices.filter(d => d.status === 'active').length;
    
    return (
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
            Manage your logged-in devices
          </Text>
          <View style={styles.sessionCount}>
            <Text style={styles.sessionCountText}>
              {activeCount} Active Session{activeCount !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </LinearGradient>
    );
  };

  const renderDeviceCard = (device: UserDevice) => {
    const isCurrentDevice = device.id === currentDeviceId;
    const isActive = device.status === 'active';

    return (
      <View 
        key={device.id}
        style={[
          styles.deviceCard, 
          { backgroundColor: colors.cardBackground },
          isCurrentDevice && { borderColor: colors.accent, borderWidth: 2 },
          !isActive && { opacity: 0.6 }
        ]}
      >
        {isCurrentDevice && (
          <View style={[styles.currentBadge, { backgroundColor: colors.accent }]}>
            <Text style={styles.currentBadgeText}>This Device</Text>
          </View>
        )}
        
        {!isActive && (
          <View style={[styles.currentBadge, { backgroundColor: '#94a3b8' }]}>
            <Text style={styles.currentBadgeText}>Logged Out</Text>
          </View>
        )}
        
        <View style={styles.deviceHeader}>
          <View style={[styles.deviceIconContainer, { backgroundColor: getDeviceColor(device.deviceType) + '20' }]}>
            <Ionicons name={getDeviceIcon(device.deviceType) as any} size={24} color={getDeviceColor(device.deviceType)} />
          </View>
          <View style={styles.deviceInfo}>
            <Text style={[styles.deviceName, { color: colors.text }]}>{device.deviceName}</Text>
            <Text style={[styles.deviceOs, { color: colors.textSecondary }]}>
              {device.os}{device.osVersion ? ` ${device.osVersion}` : ''}{device.browser ? ` • ${device.browser}` : ''}
            </Text>
          </View>
          {isActive && (
            <View style={[styles.statusIndicator, { backgroundColor: isCurrentDevice ? '#22c55e' : '#f59e0b' }]} />
          )}
        </View>
        
        <View style={[styles.deviceDetails, { borderTopColor: colors.borderLight }]}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="apps-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                App v{device.appVersion} {device.expoGoVersion && `(Expo ${device.expoGoVersion})`}
              </Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: isCurrentDevice && isActive ? '#22c55e' : colors.textSecondary }]}>
                {isCurrentDevice && isActive ? 'Active now' : formatLastActive(device.lastActiveAt)}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Only show logout button for OTHER devices (not current device/browser) */}
        {isActive && !isCurrentDevice && (
          <Pressable 
            style={[
              styles.logoutButton, 
              { 
                backgroundColor: isDarkMode ? '#450a0a' : '#fef2f2',
                cursor: 'pointer' as any,
              }
            ]}
            onPress={() => {
              console.log('Logout button pressed for device:', device.deviceName);
              handleLogoutDevice(device);
            }}
          >
            <Ionicons name="log-out-outline" size={18} color="#ef4444" />
            <Text style={[styles.logoutButtonText, { color: '#ef4444' }]}>
              Logout
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
        </View>
        <BottomNavBar />
      </View>
    );
  }

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
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {renderHeader()}

        <View style={[styles.content, isMobile && styles.contentMobile]}>
          {/* Security Tip */}
          <View style={[styles.securityTip, { backgroundColor: isDarkMode ? colors.primaryLight : '#eff6ff' }]}>
            <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
            <Text style={[styles.securityTipText, { color: colors.textSecondary }]}>
              Keep your account secure by logging out of devices you no longer use.
            </Text>
          </View>

          {/* Active Devices */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Devices</Text>
            {devices.filter(d => d.status === 'active').length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.cardBackground }]}>
                <Ionicons name="phone-portrait-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No active devices</Text>
              </View>
            ) : (
              devices.filter(d => d.status === 'active').map(device => renderDeviceCard(device))
            )}
          </View>

          {/* Logged Out Devices */}
          {devices.filter(d => d.status !== 'active').length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Previous Devices</Text>
              {devices.filter(d => d.status !== 'active').slice(0, 3).map(device => renderDeviceCard(device))}
            </View>
          )}

          {/* Device Info */}
          <View style={[styles.infoCard, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>About Device Management</Text>
            <View style={styles.infoItem}>
              <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Your account can be active on multiple devices at once.
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                If you see an unfamiliar device, log it out immediately.
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="notifications-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                You'll receive a notification when a new device logs in.
              </Text>
            </View>
          </View>

          {/* Logout All Others Button - placed below About Device Management */}
          {devices.filter(d => d.id !== currentDeviceId && d.status === 'active').length > 0 && (
            <TouchableOpacity
              style={[styles.logoutAllButton, { backgroundColor: isDarkMode ? '#450a0a' : '#fef2f2' }]}
              onPress={handleLogoutAllOthers}
            >
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={styles.logoutAllText}>Logout All Other Devices</Text>
            </TouchableOpacity>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
});
