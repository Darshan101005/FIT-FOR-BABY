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
import BottomNavBar from '@/components/navigation/BottomNavBar';

const isWeb = Platform.OS === 'web';

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

  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const [language, setLanguage] = useState('English');
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [dailyReminders, setDailyReminders] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(true);
  const [dataSync, setDataSync] = useState(true);
  const [stepTracking, setStepTracking] = useState(true);
  const [partnerSync, setPartnerSync] = useState(true);

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

  const handleLogout = () => {
    showToast('Logged out successfully', 'success');
    setTimeout(() => {
      router.replace('/login');
    }, 1500);
  };

  const renderHeader = () => (
    <LinearGradient colors={['#006dab', '#005a8f']} style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.editButton}>
          <Ionicons name="pencil" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>JD</Text>
          </View>
          <TouchableOpacity style={styles.cameraButton}>
            <Ionicons name="camera" size={16} color="#006dab" />
          </TouchableOpacity>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>John Doe</Text>
          <Text style={styles.profileEmail}>john.doe@example.com</Text>
          <View style={styles.partnerBadge}>
            <Ionicons name="heart" size={14} color="#ef4444" />
            <Text style={styles.partnerText}>Connected with Sarah Doe</Text>
          </View>
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
    </LinearGradient>
  );

  const renderQuestionnaireStatus = () => (
    <View style={styles.questionnaireCard}>
      <View style={styles.questionnaireHeader}>
        <MaterialCommunityIcons name="clipboard-check" size={24} color="#22c55e" />
        <View style={styles.questionnaireInfo}>
          <Text style={styles.questionnaireTitle}>Health Questionnaire</Text>
          <Text style={styles.questionnaireStatus}>Completed on Nov 1, 2024</Text>
        </View>
        <TouchableOpacity style={styles.viewButton}>
          <Text style={styles.viewButtonText}>View</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.questionnaireProgress}>
        <View style={styles.progressBarFull} />
      </View>
    </View>
  );

  const renderSettingsSection = (
    title: string, 
    items: { id: string; icon: string; label: string; type: string; value?: any; onPress?: () => void; color?: string }[]
  ) => (
    <View style={styles.settingsSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.settingsCard}>
        {items.map((item, index) => (
          <TouchableOpacity 
            key={item.id} 
            style={[
              styles.settingItem,
              index < items.length - 1 && styles.settingItemBorder,
            ]}
            onPress={item.onPress}
            disabled={item.type === 'toggle'}
          >
            <View style={[styles.settingIcon, { backgroundColor: (item.color || '#006dab') + '20' }]}>
              <Ionicons name={item.icon as any} size={20} color={item.color || '#006dab'} />
            </View>
            <Text style={styles.settingLabel}>{item.label}</Text>
            {item.type === 'toggle' && (
              <Switch
                value={item.value}
                onValueChange={item.onPress}
                trackColor={{ false: '#e2e8f0', true: '#98be4e' }}
                thumbColor="#ffffff"
              />
            )}
            {item.type === 'link' && (
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            )}
            {item.type === 'select' && (
              <View style={styles.selectValue}>
                <Text style={styles.selectText}>{item.value}</Text>
                <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderLanguageSelector = () => (
    <View style={styles.languageSection}>
      <Text style={styles.sectionTitle}>Language / மொழி</Text>
      <View style={styles.languageOptions}>
        <TouchableOpacity 
          style={[
            styles.languageOption,
            language === 'English' && styles.languageOptionActive,
          ]}
          onPress={() => {
            setLanguage('English');
            showToast('Language changed to English', 'success');
          }}
        >
          <Text style={styles.languageFlag}>🇬🇧</Text>
          <Text style={[
            styles.languageText,
            language === 'English' && styles.languageTextActive,
          ]}>English</Text>
          {language === 'English' && (
            <Ionicons name="checkmark-circle" size={20} color="#006dab" />
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.languageOption,
            language === 'Tamil' && styles.languageOptionActive,
          ]}
          onPress={() => {
            setLanguage('Tamil');
            showToast('மொழி தமிழுக்கு மாற்றப்பட்டது', 'success');
          }}
        >
          <Text style={styles.languageFlag}>🇮🇳</Text>
          <Text style={[
            styles.languageText,
            language === 'Tamil' && styles.languageTextActive,
          ]}>தமிழ் (Tamil)</Text>
          {language === 'Tamil' && (
            <Ionicons name="checkmark-circle" size={20} color="#006dab" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {toast.visible && (
        <Animated.View
          style={[
            styles.toast,
            toast.type === 'error' ? styles.toastError : styles.toastSuccess,
            { transform: [{ translateY: toastAnim }] },
          ]}
        >
          <View style={styles.toastContent}>
            <Text style={styles.toastIcon}>{toast.type === 'error' ? '✗' : '✓'}</Text>
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}

        <View style={styles.content}>
          {renderQuestionnaireStatus()}
          {renderLanguageSelector()}

          {renderSettingsSection('Appearance', [
            {
              id: 'dark-mode',
              icon: 'moon',
              label: 'Dark Mode',
              type: 'toggle',
              value: darkMode,
              onPress: () => setDarkMode(!darkMode),
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
              id: 'personal-info',
              icon: 'person',
              label: 'Personal Information',
              type: 'link',
              onPress: () => {},
            },
            {
              id: 'goals',
              icon: 'flag',
              label: 'My Goals',
              type: 'link',
              onPress: () => {},
              color: '#22c55e',
            },
            {
              id: 'partner-settings',
              icon: 'heart',
              label: 'Partner Settings',
              type: 'link',
              onPress: () => {},
              color: '#ef4444',
            },
            {
              id: 'connected-devices',
              icon: 'watch',
              label: 'Connected Devices',
              type: 'link',
              onPress: () => {},
              color: '#8b5cf6',
            },
          ])}

          {renderSettingsSection('Support', [
            {
              id: 'help',
              icon: 'help-circle',
              label: 'Help Center',
              type: 'link',
              onPress: () => {},
            },
            {
              id: 'feedback',
              icon: 'chatbubble-ellipses',
              label: 'Send Feedback',
              type: 'link',
              onPress: () => {},
              color: '#f59e0b',
            },
            {
              id: 'about',
              icon: 'information-circle',
              label: 'About Fit for Baby',
              type: 'link',
              onPress: () => {},
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
            {
              id: 'privacy',
              icon: 'shield-checkmark',
              label: 'Privacy Policy',
              type: 'link',
              onPress: () => {},
              color: '#22c55e',
            },
            {
              id: 'terms',
              icon: 'document-text',
              label: 'Terms of Service',
              type: 'link',
              onPress: () => {},
            },
          ])}

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>

          {/* Delete Account */}
          <TouchableOpacity style={styles.deleteButton}>
            <Text style={styles.deleteText}>Delete Account</Text>
          </TouchableOpacity>

          {/* App Version */}
          <Text style={styles.version}>Fit for Baby v1.0.0</Text>
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
  toastContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toastIcon: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  toastText: { color: '#1e293b', fontSize: 14, fontWeight: '600', flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
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
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#006dab',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#ffffff',
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
    padding: isWeb ? 40 : 20,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    marginTop: -20,
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
  questionnaireTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  questionnaireStatus: { fontSize: 13, color: '#22c55e', marginTop: 2 },
  viewButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  viewButtonText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  questionnaireProgress: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFull: {
    height: '100%',
    width: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 2,
  },
  languageSection: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
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
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  languageOptionActive: {
    borderColor: '#006dab',
    backgroundColor: '#eff6ff',
  },
  languageFlag: { fontSize: 24 },
  languageText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#64748b' },
  languageTextActive: { color: '#006dab' },
  settingsSection: { marginBottom: 24 },
  settingsCard: {
    backgroundColor: '#ffffff',
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
    borderBottomColor: '#f1f5f9',
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
    color: '#0f172a',
  },
  selectValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectText: { fontSize: 14, color: '#64748b' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
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
    color: '#94a3b8',
    textDecorationLine: 'underline',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94a3b8',
  },
});
