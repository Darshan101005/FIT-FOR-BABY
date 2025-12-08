import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

const isWeb = Platform.OS === 'web';

export default function PrivacyPolicyScreen() {
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
          <Text style={[styles.pageTitle, isMobile && styles.pageTitleMobile]}>Privacy Policy</Text>
          <Text style={styles.lastUpdated}>Last updated: December 7, 2025</Text>
        </View>

        <View style={[styles.contentSection, isMobile && styles.contentSectionMobile]}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Introduction</Text>
            <Text style={styles.sectionText}>
              Welcome to Fit for Baby ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application and services.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Information We Collect</Text>
            <Text style={styles.sectionText}>
              We collect information that you provide directly to us, including:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Personal identification information (name, email address, phone number)</Text>
              <Text style={styles.bulletItem}>• Health and medical information (weight, pregnancy stage, health metrics)</Text>
              <Text style={styles.bulletItem}>• Activity data (steps, exercise logs, food intake)</Text>
              <Text style={styles.bulletItem}>• Device information and usage data</Text>
              <Text style={styles.bulletItem}>• Photos you upload for verification purposes</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
            <Text style={styles.sectionText}>
              We use the information we collect to:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Provide and maintain our services</Text>
              <Text style={styles.bulletItem}>• Personalize your experience and health recommendations</Text>
              <Text style={styles.bulletItem}>• Connect you with healthcare providers</Text>
              <Text style={styles.bulletItem}>• Send you notifications and reminders</Text>
              <Text style={styles.bulletItem}>• Improve our services and develop new features</Text>
              <Text style={styles.bulletItem}>• Ensure the security of your account</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Information Sharing</Text>
            <Text style={styles.sectionText}>
              We may share your information with:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Your designated healthcare providers</Text>
              <Text style={styles.bulletItem}>• Your partner (if you choose to share)</Text>
              <Text style={styles.bulletItem}>• Service providers who assist in operating our platform</Text>
              <Text style={styles.bulletItem}>• Legal authorities when required by law</Text>
            </View>
            <Text style={styles.sectionText}>
              We never sell your personal health information to third parties.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Data Security</Text>
            <Text style={styles.sectionText}>
              We implement industry-standard security measures to protect your data, including:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Encryption of data in transit and at rest</Text>
              <Text style={styles.bulletItem}>• Secure authentication methods including PIN protection</Text>
              <Text style={styles.bulletItem}>• Regular security audits and updates</Text>
              <Text style={styles.bulletItem}>• Access controls and monitoring</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Your Rights</Text>
            <Text style={styles.sectionText}>
              You have the right to:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Access your personal information</Text>
              <Text style={styles.bulletItem}>• Correct inaccurate data</Text>
              <Text style={styles.bulletItem}>• Request deletion of your data</Text>
              <Text style={styles.bulletItem}>• Export your data</Text>
              <Text style={styles.bulletItem}>• Opt out of certain data processing</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Data Retention</Text>
            <Text style={styles.sectionText}>
              We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this policy. You may request deletion of your account and data at any time.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Children's Privacy</Text>
            <Text style={styles.sectionText}>
              Our services are not intended for individuals under 18 years of age. We do not knowingly collect personal information from children.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. Changes to This Policy</Text>
            <Text style={styles.sectionText}>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>10. Contact Us</Text>
            <Text style={styles.sectionText}>
              If you have questions about this Privacy Policy, please contact us at:
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
