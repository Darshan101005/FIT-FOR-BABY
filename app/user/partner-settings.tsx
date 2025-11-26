import BottomNavBar from '@/components/navigation/BottomNavBar';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';

const isWeb = Platform.OS === 'web';

interface PartnerInfo {
  name: string;
  gender: 'male' | 'female';
  odisId: string
  email: string;
  phone: string;
  userId: string;
  profileImage: string | null;
  connectionDate: string;
  lastActive: string;
}

interface PartnerSettings {
  shareProgress: boolean;
  shareWeight: boolean;
  shareExercise: boolean;
  shareMeals: boolean;
  shareAppointments: boolean;
  receiveMotivation: boolean;
  coupleGoalsEnabled: boolean;
  dailySummarySharing: boolean;
}

// Mock data
const mockPartner: PartnerInfo = {
  name: 'Sarah Doe',
  gender: 'female',
  odisId: 'C_001',
  userId: 'C_001_F',
  email: 'sarah.doe@example.com',
  phone: '+91 98765 43211',
  profileImage: null,
  connectionDate: '2024-10-01',
  lastActive: '2 hours ago',
};

const mockUser = {
  name: 'John Doe',
  odisId: 'C_001',
  userId: 'C_001_M',
};

export default function PartnerSettingsScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const { colors, isDarkMode } = useTheme();
  
  const toastAnim = useRef(new Animated.Value(-100)).current;
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  
  // Partner settings state
  const [settings, setSettings] = useState<PartnerSettings>({
    shareProgress: true,
    shareWeight: true,
    shareExercise: true,
    shareMeals: false,
    shareAppointments: true,
    receiveMotivation: true,
    coupleGoalsEnabled: true,
    dailySummarySharing: true,
  });

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

  const handleSettingChange = (key: keyof PartnerSettings) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: !prev[key] };
      showToast('Setting updated', 'success');
      return newSettings;
    });
  };

  const getGenderIcon = (gender: 'male' | 'female') => {
    return gender === 'male' ? 'male' : 'female';
  };

  const getGenderColor = (gender: 'male' | 'female') => {
    return gender === 'male' ? '#3b82f6' : '#ec4899';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleSendMessage = () => {
    router.push('/user/messages' as any);
  };

  const renderHeader = () => (
    <LinearGradient colors={colors.headerBackground as [string, string]} style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Partner Settings</Text>
        <View style={{ width: 40 }} />
      </View>
      
      {/* Partner Profile Card */}
      <View style={styles.partnerCard}>
        <View style={styles.coupleAvatars}>
          {/* Your Avatar */}
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.9)' }]}>
              <Text style={[styles.avatarText, { color: '#3b82f6' }]}>
                {mockUser.name.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
            <Text style={styles.avatarLabel}>You</Text>
          </View>
          
          {/* Heart Connection */}
          <View style={styles.connectionHeart}>
            <Ionicons name="heart" size={28} color="#ef4444" />
          </View>
          
          {/* Partner Avatar */}
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.9)' }]}>
              <Text style={[styles.avatarText, { color: getGenderColor(mockPartner.gender) }]}>
                {mockPartner.name.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
            <Text style={styles.avatarLabel}>{mockPartner.name.split(' ')[0]}</Text>
          </View>
        </View>
        
        <View style={styles.coupleIdContainer}>
          <MaterialCommunityIcons name="identifier" size={16} color="rgba(255,255,255,0.8)" />
          <Text style={styles.coupleIdText}>Couple ID: {mockPartner.odisId}</Text>
        </View>
      </View>
    </LinearGradient>
  );

  const renderPartnerInfo = () => (
    <View style={[styles.infoCard, { backgroundColor: colors.cardBackground }]}>
      <View style={styles.infoHeader}>
        <View style={[styles.partnerAvatarLarge, { backgroundColor: getGenderColor(mockPartner.gender) + '20' }]}>
          <Text style={[styles.partnerAvatarText, { color: getGenderColor(mockPartner.gender) }]}>
            {mockPartner.name.split(' ').map(n => n[0]).join('')}
          </Text>
          <View style={[styles.genderBadge, { backgroundColor: getGenderColor(mockPartner.gender) }]}>
            <Ionicons name={getGenderIcon(mockPartner.gender)} size={12} color="#fff" />
          </View>
        </View>
        <View style={styles.partnerDetails}>
          <Text style={[styles.partnerName, { color: colors.text }]}>{mockPartner.name}</Text>
          <Text style={[styles.partnerUserId, { color: colors.textSecondary }]}>
            User ID: {mockPartner.userId}
          </Text>
          <View style={styles.lastActiveContainer}>
            <View style={styles.activeIndicator} />
            <Text style={[styles.lastActiveText, { color: '#22c55e' }]}>
              {mockPartner.lastActive}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={[styles.infoDivider, { backgroundColor: colors.borderLight }]} />
      
      <View style={styles.infoDetails}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>{mockPartner.email}</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="call-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>{mockPartner.phone}</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Connected since {formatDate(mockPartner.connectionDate)}
            </Text>
          </View>
        </View>
      </View>
      
      <TouchableOpacity 
        style={[styles.messageButton, { backgroundColor: colors.primary }]}
        onPress={handleSendMessage}
      >
        <Ionicons name="chatbubble-outline" size={18} color="#fff" />
        <Text style={styles.messageButtonText}>Send Message</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSettingItem = (
    key: keyof PartnerSettings,
    icon: string,
    label: string,
    description: string,
    color: string
  ) => (
    <View style={styles.settingItem}>
      <View style={[styles.settingIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.settingDescription, { color: colors.textMuted }]}>{description}</Text>
      </View>
      <Switch
        value={settings[key]}
        onValueChange={() => handleSettingChange(key)}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor="#ffffff"
      />
    </View>
  );

  const renderSettingsSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
      <View style={[styles.settingsCard, { backgroundColor: colors.cardBackground }]}>
        {children}
      </View>
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
          {/* Partner Info Card */}
          {renderPartnerInfo()}

          {/* Data Sharing Settings */}
          {renderSettingsSection('Data Sharing', (
            <>
              {renderSettingItem(
                'shareProgress',
                'trending-up',
                'Share Overall Progress',
                'Let your partner see your weekly progress summary',
                '#22c55e'
              )}
              <View style={[styles.settingDivider, { backgroundColor: colors.borderLight }]} />
              {renderSettingItem(
                'shareWeight',
                'scale-outline',
                'Share Weight Updates',
                'Share your weight log entries with your partner',
                '#8b5cf6'
              )}
              <View style={[styles.settingDivider, { backgroundColor: colors.borderLight }]} />
              {renderSettingItem(
                'shareExercise',
                'fitness-outline',
                'Share Exercise Data',
                'Share your workout and step count data',
                '#3b82f6'
              )}
              <View style={[styles.settingDivider, { backgroundColor: colors.borderLight }]} />
              {renderSettingItem(
                'shareMeals',
                'restaurant-outline',
                'Share Meal Logs',
                'Share your food diary with your partner',
                '#f59e0b'
              )}
              <View style={[styles.settingDivider, { backgroundColor: colors.borderLight }]} />
              {renderSettingItem(
                'shareAppointments',
                'calendar-outline',
                'Share Appointments',
                'Share upcoming appointment reminders',
                '#ef4444'
              )}
            </>
          ))}

          {/* Couple Features */}
          {renderSettingsSection('Couple Features', (
            <>
              {renderSettingItem(
                'coupleGoalsEnabled',
                'flag-outline',
                'Couple Goals',
                'Enable shared goals tracking with your partner',
                '#22c55e'
              )}
              <View style={[styles.settingDivider, { backgroundColor: colors.borderLight }]} />
              {renderSettingItem(
                'receiveMotivation',
                'heart-outline',
                'Motivation Messages',
                'Receive encouraging messages from your partner',
                '#ef4444'
              )}
              <View style={[styles.settingDivider, { backgroundColor: colors.borderLight }]} />
              {renderSettingItem(
                'dailySummarySharing',
                'today-outline',
                'Daily Summary',
                'Share daily activity summary each evening',
                '#3b82f6'
              )}
            </>
          ))}

          {/* Couple Journey Stats */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Your Journey Together</Text>
            <View style={[styles.statsCard, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <View style={[styles.statIcon, { backgroundColor: '#22c55e20' }]}>
                    <Ionicons name="calendar" size={20} color="#22c55e" />
                  </View>
                  <Text style={[styles.statValue, { color: colors.text }]}>57</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Days Together</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />
                <View style={styles.statItem}>
                  <View style={[styles.statIcon, { backgroundColor: '#3b82f620' }]}>
                    <MaterialCommunityIcons name="shoe-print" size={20} color="#3b82f6" />
                  </View>
                  <Text style={[styles.statValue, { color: colors.text }]}>24</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Couple Walks</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />
                <View style={styles.statItem}>
                  <View style={[styles.statIcon, { backgroundColor: '#f59e0b20' }]}>
                    <Ionicons name="trophy" size={20} color="#f59e0b" />
                  </View>
                  <Text style={[styles.statValue, { color: colors.text }]}>12</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Goals Achieved</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Info Note */}
          <View style={[styles.infoNote, { backgroundColor: isDarkMode ? colors.primaryLight : '#eff6ff' }]}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={[styles.infoNoteText, { color: colors.textSecondary }]}>
              Your partner connection is managed by the study administrator. Contact support if you need to update partner details.
            </Text>
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
  partnerCard: {
    alignItems: 'center',
  },
  coupleAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
  },
  avatarLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  connectionHeart: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  coupleIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  coupleIdText: {
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
  infoCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  partnerAvatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    position: 'relative',
  },
  partnerAvatarText: {
    fontSize: 22,
    fontWeight: '800',
  },
  genderBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  partnerDetails: {
    flex: 1,
  },
  partnerName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  partnerUserId: {
    fontSize: 13,
    marginBottom: 4,
  },
  lastActiveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  lastActiveText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoDivider: {
    height: 1,
    marginBottom: 12,
  },
  infoDetails: {
    marginBottom: 16,
  },
  infoRow: {
    marginBottom: 10,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    fontSize: 14,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  messageButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
    paddingLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
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
    padding: 14,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  settingDivider: {
    height: 1,
    marginLeft: 66,
  },
  statsCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 60,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
});
