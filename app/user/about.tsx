import BottomNavBar from '@/components/navigation/BottomNavBar';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    Image,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';

const isWeb = Platform.OS === 'web';

const appInfo = {
  version: '1.0.0',
  build: '2025.12.07',
  releaseDate: 'December 2025',
};

const features = [
  { icon: 'footsteps', label: 'Step Tracking', color: '#22c55e' },
  { icon: 'fitness', label: 'Exercise Logging', color: '#3b82f6' },
  { icon: 'scale', label: 'Weight Monitoring', color: '#f59e0b' },
  { icon: 'nutrition', label: 'Diet Plans', color: '#ec4899' },
  { icon: 'calendar', label: 'Appointments', color: '#8b5cf6' },
  { icon: 'chatbubbles', label: 'Messaging', color: '#06b6d4' },
];

const socialLinks = [
  { id: 'website', icon: 'globe-outline', label: 'Website', url: 'https://fitforbaby.com', color: '#3b82f6' },
  { id: 'instagram', icon: 'logo-instagram', label: 'Instagram', url: '', color: '#e4405f' },
  { id: 'twitter', icon: 'logo-twitter', label: 'Twitter', url: '', color: '#1da1f2' },
  { id: 'facebook', icon: 'logo-facebook', label: 'Facebook', url: '', color: '#1877f2' },
];

export default function AboutScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();

  const handleLinkPress = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={colors.headerBackground as [string, string]} style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('about.title')}</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        <View style={[styles.content, isMobile && styles.contentMobile]}>
          {/* App Logo & Info */}
          <View style={[styles.appInfoCard, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.logoContainer}>
              <Image 
                source={require('@/assets/images/icon.png')} 
                style={styles.appLogo}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.appName, { color: colors.text }]}>Fit for Baby</Text>
            <Text style={[styles.appTagline, { color: colors.textSecondary }]}>
              {t('about.tagline')}
            </Text>
            <View style={styles.versionBadge}>
              <Text style={[styles.versionText, { color: colors.primary }]}>
                {t('about.version')} {appInfo.version}
              </Text>
            </View>
          </View>

          {/* Mission Statement */}
          <View style={[styles.missionCard, { backgroundColor: isDarkMode ? colors.primaryLight : '#eff6ff' }]}>
            <Ionicons name="heart" size={24} color={colors.primary} />
            <Text style={[styles.missionTitle, { color: colors.text }]}>{t('about.ourMission')}</Text>
            <Text style={[styles.missionText, { color: colors.textSecondary }]}>
              {t('about.missionText')}
            </Text>
          </View>

          {/* App Details */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('about.appInfo')}</Text>
            <View style={[styles.detailsCard, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('about.version')}</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{appInfo.version}</Text>
              </View>
              <View style={[styles.detailDivider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('about.build')}</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{appInfo.build}</Text>
              </View>
              <View style={[styles.detailDivider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('about.releaseDate')}</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{appInfo.releaseDate}</Text>
              </View>
              <View style={[styles.detailDivider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('about.platform')}</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Web'}
                </Text>
              </View>
            </View>
          </View>

          {/* Connect With Us */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('about.connectWithUs')}</Text>
            <View style={styles.socialGrid}>
              {socialLinks.map((link) => {
                const isDisabled = !link.url;
                return (
                  <TouchableOpacity
                    key={link.id}
                    style={[
                      styles.socialCard, 
                      { backgroundColor: colors.cardBackground },
                      isDisabled && { opacity: 0.5 }
                    ]}
                    onPress={() => link.url && handleLinkPress(link.url)}
                    disabled={isDisabled}
                  >
                    <View style={[styles.socialIcon, { backgroundColor: link.color + '20' }]}>
                      <Ionicons name={link.icon as any} size={24} color={link.color} />
                    </View>
                    <Text style={[styles.socialLabel, { color: colors.text }]}>{link.label}</Text>
                    {isDisabled && (
                      <Text style={[styles.comingSoonText, { color: colors.textMuted }]}>{t('about.comingSoon')}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Legal Links */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('about.legal')}</Text>
            <View style={[styles.legalCard, { backgroundColor: colors.cardBackground }]}>
              <TouchableOpacity
                style={styles.legalItem}
                onPress={() => router.push('/privacy-policy')}
              >
                <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
                <Text style={[styles.legalText, { color: colors.text }]}>{t('about.privacyPolicy')}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
              <View style={[styles.legalDivider, { backgroundColor: colors.borderLight }]} />
              <TouchableOpacity
                style={styles.legalItem}
                onPress={() => router.push('/terms-of-service')}
              >
                <Ionicons name="document-text" size={20} color={colors.primary} />
                <Text style={[styles.legalText, { color: colors.text }]}>{t('about.termsOfService')}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Acknowledgment */}
          <View style={[styles.acknowledgment, { backgroundColor: isDarkMode ? colors.cardBackground : '#f8fafc' }]}>
            <Text style={[styles.acknowledgmentText, { color: colors.textSecondary }]}>
              {t('about.madeWithLove')}
            </Text>
            <Text style={[styles.copyright, { color: colors.textMuted }]}>
              {t('about.copyright')}
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
  content: {
    padding: isWeb ? 40 : 20,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  contentMobile: {
    padding: 20,
  },
  appInfoCard: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  appLogo: {
    width: 100,
    height: 100,
    borderRadius: 20,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  appTagline: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  versionBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0,109,171,0.1)',
  },
  versionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  missionCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
  },
  missionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 12,
  },
  missionText: {
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureItem: {
    flexBasis: '30%',
    flexGrow: 1,
    minWidth: 100,
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featureLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  teamCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  teamMember: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  teamMemberBorder: {
    borderBottomWidth: 1,
  },
  teamIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  teamRole: {
    fontSize: 13,
  },
  detailsCard: {
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  socialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  socialCard: {
    flexBasis: '22%',
    flexGrow: 1,
    minWidth: 80,
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  socialIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  socialLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  comingSoonText: {
    fontSize: 10,
    marginTop: 4,
  },
  legalCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  legalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  legalText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  legalDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  acknowledgment: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    marginTop: 8,
  },
  acknowledgmentText: {
    fontSize: 14,
    marginBottom: 8,
  },
  copyright: {
    fontSize: 12,
  },
});
