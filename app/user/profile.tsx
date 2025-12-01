import BottomNavBar from '@/components/navigation/BottomNavBar';
import { MobileProfileCardSkeleton, WebProfileCardSkeleton } from '@/components/ui/SkeletonLoader';
import { useTheme } from '@/context/ThemeContext';
import { coupleService } from '@/services/firestore.service';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
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

const isWeb = Platform.OS === 'web';

// User profile data interface
interface ProfileData {
  name: string;
  email: string;
  coupleId: string;
  userId: string;
  partnerName: string;
  partnerUserId: string;
  initials: string;
  userGender: 'male' | 'female';
  partnerGender: 'male' | 'female';
}

// Custom Toggle Component for consistent styling across platforms
const CustomToggle = ({ 
  value, 
  onValueChange, 
  activeColor = '#98be4e' 
}: { 
  value: boolean; 
  onValueChange: () => void; 
  activeColor?: string;
}) => {
  const { colors } = useTheme();
  
  return (
    <TouchableOpacity 
      style={[
        toggleStyles.customToggle,
        { backgroundColor: value ? activeColor : colors.border },
      ]}
      onPress={onValueChange}
      activeOpacity={0.8}
    >
      <View 
        style={[
          toggleStyles.customToggleThumb,
          { 
            backgroundColor: '#ffffff',
            transform: [{ translateX: value ? 18 : 0 }],
          },
        ]} 
      />
    </TouchableOpacity>
  );
};

// Toggle styles defined separately to avoid circular reference
const toggleStyles = StyleSheet.create({
  customToggle: {
    width: 42,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  customToggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});

interface SettingItem {
  id: string;
  icon: string;
  label: string;
  labelTamil?: string;
  type: 'toggle' | 'link' | 'select';
  value?: boolean | string;
  options?: string[];
  color?: string;
}

const profileStats = {
  daysActive: 42,
  goalsAchieved: 18,
  currentStreak: 7,
  totalSteps: 325000,
};

export default function ProfileScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const toastAnim = useRef(new Animated.Value(-100)).current;
  const { isDarkMode, toggleDarkMode, colors } = useTheme();

  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const [language, setLanguage] = useState('English');
  const [notifications, setNotifications] = useState(true);
  const [dailyReminders, setDailyReminders] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(true);
  const [dataSync, setDataSync] = useState(true);
  const [stepTracking, setStepTracking] = useState(true);
  const [partnerSync, setPartnerSync] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  // Profile data from Firestore
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  
  // Profile stats
  const [profileStats, setProfileStats] = useState({
    daysActive: 0,
    goalsAchieved: 0,
    currentStreak: 0,
  });

  // Fetch profile data when screen loads
  useFocusEffect(
    useCallback(() => {
      const loadProfileData = async () => {
        setIsLoading(true);
        try {
          const coupleId = await AsyncStorage.getItem('coupleId');
          const userGender = await AsyncStorage.getItem('userGender');
          
          if (coupleId && userGender) {
            const couple = await coupleService.get(coupleId);
            if (couple) {
              const user = couple[userGender as 'male' | 'female'];
              const partner = couple[userGender === 'male' ? 'female' : 'male'];
              
              // Get initials from name
              const nameParts = (user.name || 'User').split(' ');
              const initials = nameParts.length > 1 
                ? `${nameParts[0][0]}${nameParts[nameParts.length-1][0]}`.toUpperCase()
                : (user.name || 'U')[0].toUpperCase();
              
              setProfileData({
                name: user.name || 'User',
                email: user.email || '',
                coupleId: coupleId,
                userId: user.id || '',
                partnerName: partner.name || '',
                partnerUserId: partner.id || '',
                initials,
                userGender: userGender as 'male' | 'female',
                partnerGender: userGender === 'male' ? 'female' : 'male',
              });
              
              // Calculate days active (from enrollment date)
              if (couple.enrollmentDate) {
                const enrollDate = new Date(couple.enrollmentDate);
                const today = new Date();
                const diffTime = Math.abs(today.getTime() - enrollDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                setProfileStats(prev => ({ ...prev, daysActive: diffDays }));
              }
            } else {
              // Fallback if no couple data
              setProfileData({
                name: 'User',
                email: '',
                coupleId: coupleId || '',
                userId: '',
                partnerName: '',
                partnerUserId: '',
                initials: 'U',
                userGender: (userGender as 'male' | 'female') || 'male',
                partnerGender: userGender === 'male' ? 'female' : 'male',
              });
            }
          } else {
            // Fallback if no storage data
            setProfileData({
              name: 'User',
              email: '',
              coupleId: '',
              userId: '',
              partnerName: '',
              partnerUserId: '',
              initials: 'U',
              userGender: 'male',
              partnerGender: 'female',
            });
          }
        } catch (error) {
          console.error('Error loading profile data:', error);
          // Set fallback on error
          setProfileData({
            name: 'User',
            email: '',
            coupleId: '',
            userId: '',
            partnerName: '',
            partnerUserId: '',
            initials: 'U',
            userGender: 'male',
            partnerGender: 'female',
          });
        } finally {
          setIsLoading(false);
        }
      };
      
      loadProfileData();
    }, [])
  );

  const showToast = (message: string, type: 'error' | 'success') => {
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

  const handleLogout = async () => {
    try {
      // Clear all user-related storage
      await AsyncStorage.multiRemove([
        'userRole', 'coupleId', 'userGender', 'userId', 'userName',
        'quickAccessMode', 'pendingProfileSelection',
        'isSuperAdmin', 'adminUid', 'adminEmail', 'adminName'
      ]);
      showToast('Logged out successfully', 'success');
      setTimeout(() => {
        router.replace('/login');
      }, 1500);
    } catch (error) {
      console.error('Logout error:', error);
      router.replace('/login');
    }
  };

  const handleDarkModeToggle = () => {
    toggleDarkMode();
    showToast(isDarkMode ? 'Light mode enabled' : 'Dark mode enabled', 'success');
  };

  // Mobile Header with gradient
  const renderMobileHeader = () => (
    <LinearGradient colors={colors.headerBackground as [string, string]} style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading || !profileData ? (
        <MobileProfileCardSkeleton />
      ) : (
        <>
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <View style={[styles.avatar, { backgroundColor: colors.cardBackground }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>{profileData.initials}</Text>
              </View>
              <TouchableOpacity style={[styles.cameraButton, { backgroundColor: colors.cardBackground }]}>
                <Ionicons name="camera" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profileData.name}</Text>
              <Text style={styles.profileEmail}>{profileData.email || profileData.userId}</Text>
              {profileData.partnerName && (
                <View style={styles.partnerBadge}>
                  <Ionicons name="heart" size={14} color="#ef4444" />
                  <Text style={styles.partnerText}>Connected with {profileData.partnerName}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profileStats.daysActive}</Text>
              <Text style={styles.statLabel}>Days Active</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profileStats.goalsAchieved}</Text>
              <Text style={styles.statLabel}>Goals Done</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profileStats.currentStreak}🔥</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
          </View>
        </>
      )}
    </LinearGradient>
  );

  // Web/Laptop Header - simple header with profile card as settings item
  const renderWebHeader = () => (
    <>
      <View style={[styles.webHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.webBackButton, { backgroundColor: colors.cardBackground }]}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.webHeaderTitle, { color: colors.text }]}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>
    </>
  );

  // Profile card for web view (inline with settings)
  const renderWebProfileCard = () => {
    if (isLoading || !profileData) {
      return <WebProfileCardSkeleton />;
    }
    
    return (
      <View style={[styles.webProfileCard, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.webProfileRow}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>{profileData.initials}</Text>
            </View>
            <TouchableOpacity style={[styles.cameraButton, { backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.border }]}>
              <Ionicons name="camera" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.webProfileInfo}>
            <Text style={[styles.webProfileName, { color: colors.text }]}>{profileData.name}</Text>
            <Text style={[styles.webProfileEmail, { color: colors.textSecondary }]}>{profileData.email || profileData.userId}</Text>
            {profileData.partnerName && (
              <View style={[styles.webPartnerBadge, { backgroundColor: '#ef444415' }]}>
                <Ionicons name="heart" size={12} color="#ef4444" />
                <Text style={styles.webPartnerText}>Connected with {profileData.partnerName}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={[styles.webStatsRow, { borderTopColor: colors.borderLight }]}>
          <View style={styles.webStatItem}>
            <Text style={[styles.webStatValue, { color: colors.primary }]}>{profileStats.daysActive}</Text>
            <Text style={[styles.webStatLabel, { color: colors.textSecondary }]}>Days Active</Text>
          </View>
          <View style={[styles.webStatDivider, { backgroundColor: colors.borderLight }]} />
          <View style={styles.webStatItem}>
            <Text style={[styles.webStatValue, { color: colors.primary }]}>{profileStats.goalsAchieved}</Text>
            <Text style={[styles.webStatLabel, { color: colors.textSecondary }]}>Goals Done</Text>
          </View>
          <View style={[styles.webStatDivider, { backgroundColor: colors.borderLight }]} />
          <View style={styles.webStatItem}>
            <Text style={[styles.webStatValue, { color: colors.primary }]}>{profileStats.currentStreak}🔥</Text>
            <Text style={[styles.webStatLabel, { color: colors.textSecondary }]}>Day Streak</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderQuestionnaireStatus = () => (
    <View style={[styles.questionnaireCard, { backgroundColor: colors.cardBackground }]}>
      <View style={styles.questionnaireHeader}>
        <MaterialCommunityIcons name="clipboard-check" size={24} color={colors.success} />
        <View style={styles.questionnaireInfo}>
          <Text style={[styles.questionnaireTitle, { color: colors.text }]}>Health Questionnaire</Text>
          <Text style={[styles.questionnaireStatus, { color: colors.success }]}>Completed on Nov 1, 2024</Text>
        </View>
        <TouchableOpacity style={[styles.viewButton, { backgroundColor: colors.inputBackground }]}>
          <Text style={[styles.viewButtonText, { color: colors.textSecondary }]}>View</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.questionnaireProgress, { backgroundColor: colors.border }]}>
        <View style={[styles.progressBarFull, { backgroundColor: colors.success }]} />
      </View>
    </View>
  );

  const renderSettingsSection = (
    title: string, 
    items: { id: string; icon: string; label: string; type: string; value?: any; onPress?: () => void; color?: string }[]
  ) => (
    <View style={styles.settingsSection}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
      <View style={[styles.settingsCard, { backgroundColor: colors.cardBackground }]}>
        {items.map((item, index) => (
          <TouchableOpacity 
            key={item.id} 
            style={[
              styles.settingItem,
              index < items.length - 1 && [styles.settingItemBorder, { borderBottomColor: colors.borderLight }],
            ]}
            onPress={item.onPress}
            disabled={item.type === 'toggle'}
          >
            <View style={[styles.settingIcon, { backgroundColor: (item.color || colors.primary) + '20' }]}>
              <Ionicons name={item.icon as any} size={20} color={item.color || colors.primary} />
            </View>
            <Text style={[styles.settingLabel, { color: colors.text }]}>{item.label}</Text>
            {item.type === 'toggle' && (
              <CustomToggle
                value={item.value}
                onValueChange={item.onPress!}
                activeColor={colors.accent}
              />
            )}
            {item.type === 'link' && (
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            )}
            {item.type === 'select' && (
              <View style={styles.selectValue}>
                <Text style={[styles.selectText, { color: colors.textSecondary }]}>{item.value}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderLanguageSelector = () => (
    <View style={styles.languageSection}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Language / மொழி</Text>
      <View style={styles.languageOptions}>
        <TouchableOpacity 
          style={[
            styles.languageOption,
            { backgroundColor: colors.cardBackground, borderColor: colors.border },
            language === 'English' && { borderColor: colors.primary, backgroundColor: isDarkMode ? colors.primaryLight : '#eff6ff' },
          ]}
          onPress={() => {
            setLanguage('English');
            showToast('Language changed to English', 'success');
          }}
        >
          <Text style={styles.languageFlag}>🇬🇧</Text>
          <Text style={[
            styles.languageText,
            { color: colors.textSecondary },
            language === 'English' && { color: colors.primary },
          ]}>English</Text>
          {language === 'English' && (
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.languageOption,
            { backgroundColor: colors.cardBackground, borderColor: colors.border },
            language === 'Tamil' && { borderColor: colors.primary, backgroundColor: isDarkMode ? colors.primaryLight : '#eff6ff' },
          ]}
          onPress={() => {
            setLanguage('Tamil');
            showToast('மொழி தமிழுக்கு மாற்றப்பட்டது', 'success');
          }}
        >
          <Text style={styles.languageFlag}>🇮🇳</Text>
          <Text style={[
            styles.languageText,
            { color: colors.textSecondary },
            language === 'Tamil' && { color: colors.primary },
          ]}>தமிழ் (Tamil)</Text>
          {language === 'Tamil' && (
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {toast.visible && (
        <Animated.View
          style={[
            styles.toast,
            { backgroundColor: colors.cardBackground },
            toast.type === 'error' ? styles.toastError : styles.toastSuccess,
            { transform: [{ translateY: toastAnim }] },
          ]}
        >
          <View style={styles.toastContent}>
            <Text style={[styles.toastIcon, { color: colors.text }]}>{toast.type === 'error' ? '✗' : '✓'}</Text>
            <Text style={[styles.toastText, { color: colors.text }]}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isMobile ? renderMobileHeader() : renderWebHeader()}

        <View style={[styles.content, !isMobile && styles.contentWeb]}>
          {!isMobile && renderWebProfileCard()}
          {renderQuestionnaireStatus()}
          {renderLanguageSelector()}

          {renderSettingsSection('Appearance', [
            {
              id: 'dark-mode',
              icon: isDarkMode ? 'sunny' : 'moon',
              label: 'Dark Mode',
              type: 'toggle',
              value: isDarkMode,
              onPress: handleDarkModeToggle,
              color: '#8b5cf6',
            },
          ])}

          {renderSettingsSection('Notifications', [
            {
              id: 'notifications',
              icon: 'notifications',
              label: 'Push Notifications',
              type: 'toggle',
              value: notifications,
              onPress: () => setNotifications(!notifications),
              color: '#f59e0b',
            },
            {
              id: 'daily-reminders',
              icon: 'alarm',
              label: 'Daily Reminders',
              type: 'toggle',
              value: dailyReminders,
              onPress: () => setDailyReminders(!dailyReminders),
              color: '#22c55e',
            },
            {
              id: 'weekly-reports',
              icon: 'bar-chart',
              label: 'Weekly Reports',
              type: 'toggle',
              value: weeklyReports,
              onPress: () => setWeeklyReports(!weeklyReports),
              color: '#3b82f6',
            },
          ])}

          {renderSettingsSection('Health Tracking', [
            {
              id: 'step-tracking',
              icon: 'walk',
              label: 'Auto Step Tracking',
              type: 'toggle',
              value: stepTracking,
              onPress: () => setStepTracking(!stepTracking),
              color: '#22c55e',
            },
            {
              id: 'partner-sync',
              icon: 'people',
              label: 'Partner Sync',
              type: 'toggle',
              value: partnerSync,
              onPress: () => setPartnerSync(!partnerSync),
              color: '#ef4444',
            },
            {
              id: 'data-sync',
              icon: 'cloud-upload',
              label: 'Cloud Sync',
              type: 'toggle',
              value: dataSync,
              onPress: () => setDataSync(!dataSync),
              color: '#006dab',
            },
          ])}

          {renderSettingsSection('Account', [
            {
              id: 'switch-profile',
              icon: 'swap-horizontal',
              label: 'Switch Profile',
              labelTamil: 'சுயவிவரத்தை மாற்று',
              type: 'link',
              onPress: () => {
                if (profileData) {
                  router.push({
                    pathname: '/user/enter-pin',
                    params: {
                      coupleId: profileData.coupleId,
                      gender: profileData.partnerGender,
                    }
                  } as any);
                }
              },
              color: profileData?.partnerGender === 'female' ? '#ec4899' : '#3b82f6',
            },
            {
              id: 'manage-pin',
              icon: 'keypad',
              label: 'Manage Session PIN',
              type: 'link',
              onPress: () => router.push('/user/manage-pin' as any),
              color: '#f59e0b',
            },
            {
              id: 'personal-info',
              icon: 'person',
              label: 'Personal Information',
              type: 'link',
              onPress: () => router.push('/user/personal-info' as any),
            },
            {
              id: 'device-management',
              icon: 'phone-portrait-outline',
              label: 'Device Management',
              type: 'link',
              onPress: () => router.push('/user/device-management' as any),
              color: '#8b5cf6',
            },
          ])}

          {renderSettingsSection('Support', [
            {
              id: 'help',
              icon: 'help-circle',
              label: 'Help Center',
              type: 'link',
              onPress: () => router.push('/user/help-center' as any),
            },
            {
              id: 'feedback',
              icon: 'chatbubble-ellipses',
              label: 'Send Feedback',
              type: 'link',
              onPress: () => router.push('/user/feedback' as any),
              color: '#f59e0b',
            },
            {
              id: 'about',
              icon: 'information-circle',
              label: 'About Fit for Baby',
              type: 'link',
              onPress: () => router.push('/user/about' as any),
              color: '#64748b',
            },
          ])}

          {renderSettingsSection('Data & Privacy', [
            {
              id: 'export-data',
              icon: 'download',
              label: 'Export My Data',
              type: 'link',
              onPress: () => {},
            },
          ])}

          {/* Logout Button */}
          <TouchableOpacity 
            style={[styles.logoutButton, { backgroundColor: isDarkMode ? '#450a0a' : '#fef2f2' }]} 
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>

          {/* Delete Account */}
          <TouchableOpacity style={styles.deleteButton}>
            <Text style={[styles.deleteText, { color: colors.textMuted }]}>Delete Account</Text>
          </TouchableOpacity>

          {/* App Version */}
          <Text style={[styles.version, { color: colors.textMuted }]}>Fit for Baby v1.0.0</Text>
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
  toastContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toastIcon: { fontSize: 18, fontWeight: 'bold' },
  toastText: { fontSize: 14, fontWeight: '600', flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: isWeb ? 40 : 100 },
  // Mobile Header
  header: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
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
  // Web Header
  webHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 40,
    borderBottomWidth: 1,
  },
  webBackButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  // Web Profile Card
  webProfileCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  webProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  webProfileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  webProfileName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  webProfileEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  webPartnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
  },
  webPartnerText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
  },
  webStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  webStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  webStatValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  webStatLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  webStatDivider: {
    width: 1,
    height: 30,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 8,
    gap: 6,
  },
  partnerText: {
    fontSize: 12,
    color: '#ffffff',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingVertical: 16,
  },
  statItem: { alignItems: 'center' },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  content: {
    padding: 20,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    marginTop: -20,
  },
  contentWeb: {
    padding: 40,
    marginTop: 0,
  },
  questionnaireCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  questionnaireHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionnaireInfo: { flex: 1, marginLeft: 12 },
  questionnaireTitle: { fontSize: 15, fontWeight: '700' },
  questionnaireStatus: { fontSize: 13, marginTop: 2 },
  viewButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewButtonText: { fontSize: 13, fontWeight: '600' },
  questionnaireProgress: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFull: {
    height: '100%',
    width: '100%',
    borderRadius: 2,
  },
  languageSection: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    paddingLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  languageOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  languageOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 2,
  },
  languageFlag: { fontSize: 24 },
  languageText: { flex: 1, fontSize: 14, fontWeight: '600' },
  settingsSection: { marginBottom: 24 },
  settingsCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  settingLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  selectValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectText: { fontSize: 14 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 8,
    marginBottom: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
  },
  deleteButton: {
    alignItems: 'center',
    padding: 12,
    marginBottom: 24,
  },
  deleteText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94a3b8',
  },
});
