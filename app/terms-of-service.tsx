import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

const isWeb = Platform.OS === 'web';

export default function TermsOfServiceScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms Of Service</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={[styles.contentSection, isMobile && styles.contentSectionMobile]}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
            <Text style={styles.sectionText}>
              By accessing or using Fit for Baby ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Description of Service</Text>
            <Text style={styles.sectionText}>
              Fit for Baby is a pregnancy health tracking and management platform that allows users to:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Track health metrics and pregnancy progress</Text>
              <Text style={styles.bulletItem}>• Log nutrition, exercise, and daily activities</Text>
              <Text style={styles.bulletItem}>• Communicate with healthcare providers</Text>
              <Text style={styles.bulletItem}>• Schedule and manage appointments</Text>
              <Text style={styles.bulletItem}>• Access personalized health recommendations</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. User Accounts</Text>
            <Text style={styles.sectionText}>
              Accounts are created by authorized healthcare providers. By using the Service, you agree to:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Provide accurate and complete information</Text>
              <Text style={styles.bulletItem}>• Maintain the security of your login credentials and PIN</Text>
              <Text style={styles.bulletItem}>• Notify us immediately of any unauthorized access</Text>
              <Text style={styles.bulletItem}>• Accept responsibility for all activities under your account</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Medical Disclaimer</Text>
            <Text style={styles.sectionText}>
              The Service is intended for informational and tracking purposes only. It is NOT a substitute for professional medical advice, diagnosis, or treatment.
            </Text>
            <View style={styles.warningBox}>
              <Ionicons name="warning" size={20} color="#D97706" />
              <Text style={styles.warningText}>
                Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition. Never disregard professional medical advice or delay seeking it because of information provided through this Service.
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. User Conduct</Text>
            <Text style={styles.sectionText}>
              You agree not to:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Use the Service for any unlawful purpose</Text>
              <Text style={styles.bulletItem}>• Share your account credentials with others</Text>
              <Text style={styles.bulletItem}>• Upload false or misleading health information</Text>
              <Text style={styles.bulletItem}>• Attempt to gain unauthorized access to any part of the Service</Text>
              <Text style={styles.bulletItem}>• Interfere with the proper functioning of the Service</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Intellectual Property</Text>
            <Text style={styles.sectionText}>
              All content, features, and functionality of the Service are owned by Fit for Baby and are protected by international copyright, trademark, and other intellectual property laws.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Data and Privacy</Text>
            <Text style={styles.sectionText}>
              Your use of the Service is also governed by our Privacy Policy. By using the Service, you consent to the collection and use of information as described in the Privacy Policy.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Service Modifications</Text>
            <Text style={styles.sectionText}>
              We reserve the right to modify, suspend, or discontinue the Service at any time without notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuation of the Service.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. Limitation of Liability</Text>
            <Text style={styles.sectionText}>
              To the maximum extent permitted by law, Fit for Baby shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the Service.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>10. Indemnification</Text>
            <Text style={styles.sectionText}>
              You agree to indemnify and hold harmless Fit for Baby and its officers, directors, employees, and agents from any claims, damages, or expenses arising from your use of the Service or violation of these Terms.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>11. Governing Law</Text>
            <Text style={styles.sectionText}>
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Fit for Baby operates, without regard to its conflict of law provisions.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>12. Changes to Terms</Text>
            <Text style={styles.sectionText}>
              We reserve the right to update these Terms at any time. We will notify users of any material changes. Your continued use of the Service after changes constitutes acceptance of the new Terms.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>13. Contact Information</Text>
            <Text style={styles.sectionText}>
              For questions about these Terms of Service, please contact us at:
            </Text>
            <Text style={styles.contactInfo}>
              Email: fitforbaby.sriher@gmail.com{'\n'}
              Address: No 1, Ramachandra Nagar, Porur-600116, Chennai
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginLeft: 8,
    textAlignVertical: 'center',
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
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
    gap: 12,
    alignItems: 'flex-start',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
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
