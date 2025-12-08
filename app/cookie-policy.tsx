import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

const isWeb = Platform.OS === 'web';

export default function CookiePolicyScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Image
          source={require('../assets/logos/fit_for_baby_horizontal.png')}
          style={styles.headerLogo}
          contentFit="contain"
        />
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroSection, isMobile && styles.heroSectionMobile]}>
          <Text style={[styles.pageTitle, isMobile && styles.pageTitleMobile]}>Cookie Policy</Text>
          <Text style={styles.lastUpdated}>Last updated: December 7, 2025</Text>
        </View>

        <View style={[styles.contentSection, isMobile && styles.contentSectionMobile]}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. What Are Cookies?</Text>
            <Text style={styles.sectionText}>
              Cookies are small text files that are stored on your device when you visit a website or use an application. They help us provide you with a better experience by remembering your preferences and understanding how you use our service.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. How We Use Cookies</Text>
            <Text style={styles.sectionText}>
              Fit for Baby uses cookies and similar technologies for the following purposes:
            </Text>
            
            <View style={styles.cookieType}>
              <Text style={styles.cookieTitle}>Essential Cookies</Text>
              <Text style={styles.cookieDescription}>
                These cookies are necessary for the Service to function properly. They enable core features like user authentication, session management, and security. Without these cookies, the Service cannot operate.
              </Text>
            </View>

            <View style={styles.cookieType}>
              <Text style={styles.cookieTitle}>Performance Cookies</Text>
              <Text style={styles.cookieDescription}>
                These cookies help us understand how visitors interact with our Service by collecting anonymous information. This helps us improve our Service and fix issues.
              </Text>
            </View>

            <View style={styles.cookieType}>
              <Text style={styles.cookieTitle}>Functionality Cookies</Text>
              <Text style={styles.cookieDescription}>
                These cookies remember your preferences and choices (such as your login status and display preferences) to provide a more personalized experience.
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Local Storage</Text>
            <Text style={styles.sectionText}>
              In addition to cookies, we use local storage technologies to store information on your device. This includes:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Authentication tokens for secure login</Text>
              <Text style={styles.bulletItem}>• User preferences and settings</Text>
              <Text style={styles.bulletItem}>• Session data for quick access features</Text>
              <Text style={styles.bulletItem}>• Cached data for improved performance</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Third-Party Cookies</Text>
            <Text style={styles.sectionText}>
              We may use third-party services that set their own cookies for:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Analytics and performance monitoring</Text>
              <Text style={styles.bulletItem}>• Cloud storage services</Text>
              <Text style={styles.bulletItem}>• Authentication services</Text>
            </View>
            <Text style={styles.sectionText}>
              These third parties have their own privacy policies and we recommend reviewing them.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Cookie Duration</Text>
            <Text style={styles.sectionText}>
              Cookies can be either session cookies or persistent cookies:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Session cookies: Deleted when you close your browser</Text>
              <Text style={styles.bulletItem}>• Persistent cookies: Remain on your device for a set period or until you delete them</Text>
            </View>
            <Text style={styles.sectionText}>
              Our "Remember Me" feature uses persistent cookies to keep you logged in for up to 30 days.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Managing Cookies</Text>
            <Text style={styles.sectionText}>
              You can control and manage cookies in several ways:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Browser Settings: Most browsers allow you to refuse or delete cookies through their settings</Text>
              <Text style={styles.bulletItem}>• Mobile Device Settings: You can manage storage permissions in your device settings</Text>
              <Text style={styles.bulletItem}>• Logging Out: Logging out will clear session-related cookies</Text>
            </View>
            <View style={styles.noteBox}>
              <Ionicons name="information-circle" size={20} color="#006dab" />
              <Text style={styles.noteText}>
                Please note that disabling certain cookies may affect the functionality of the Service. Essential cookies cannot be disabled as they are required for the Service to work.
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Updates to This Policy</Text>
            <Text style={styles.sectionText}>
              We may update this Cookie Policy from time to time to reflect changes in our practices or for legal, operational, or regulatory reasons. We will notify you of any significant changes.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Contact Us</Text>
            <Text style={styles.sectionText}>
              If you have questions about our use of cookies, please contact us at:
            </Text>
            <Text style={styles.contactInfo}>
              Email: privacy@fitforbaby.com{'\n'}
              Address: 123 Health Street, Medical City, MC 12345
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 Fit for Baby. All rights reserved.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: isWeb ? 60 : 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerLogo: {
    width: isWeb ? 200 : 150,
    height: isWeb ? 52 : 40,
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroSection: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 60,
    paddingVertical: 60,
    alignItems: 'center',
  },
  heroSectionMobile: {
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  pageTitle: {
    fontSize: 48,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 12,
  },
  pageTitleMobile: {
    fontSize: 32,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#64748b',
  },
  contentSection: {
    paddingHorizontal: 60,
    paddingVertical: 40,
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  contentSectionMobile: {
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 26,
    marginBottom: 12,
  },
  cookieType: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  cookieTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  cookieDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 22,
  },
  bulletList: {
    marginLeft: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  bulletItem: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 28,
  },
  noteBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
    gap: 12,
    alignItems: 'flex-start',
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 22,
  },
  contactInfo: {
    fontSize: 16,
    color: '#006dab',
    lineHeight: 26,
    marginTop: 8,
  },
  footer: {
    backgroundColor: '#1e293b',
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    color: '#94a3b8',
    fontSize: 14,
  },
});
