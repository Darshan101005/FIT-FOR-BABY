import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

const isWeb = Platform.OS === 'web';

const faqData = [
  {
    category: 'Getting Started',
    questions: [
      {
        q: 'How do I create an account?',
        a: 'Your account is created by your healthcare provider. They will provide you with login credentials. Once you receive your credentials, use the Login page to access your account.',
      },
      {
        q: 'What is Quick Access mode?',
        a: 'Quick Access allows couples to share a device. Enter your Couple ID, select your profile, and use your 4-digit PIN to log in quickly.',
      },
      {
        q: 'How do I reset my password?',
        a: 'Click "Forgot Password" on the login page, enter your Couple ID or email, verify with your PIN, and create a new password.',
      },
    ],
  },
  {
    category: 'Health Tracking',
    questions: [
      {
        q: 'How do I log my daily steps?',
        a: 'Go to Progress > Log Steps, enter your step count, and upload a photo from your fitness tracker or phone pedometer as verification.',
      },
      {
        q: 'Can I track my weight over time?',
        a: 'Yes! Navigate to Progress > Log Weight to record your weight. You can view your weight history and trends on the Progress dashboard.',
      },
      {
        q: 'How does meal logging work?',
        a: 'Go to Progress > Log Food, search for foods or scan barcodes, and add items to your daily log. Your diet plan will show personalized recommendations.',
      },
    ],
  },
  {
    category: 'Appointments',
    questions: [
      {
        q: 'How do I schedule an appointment?',
        a: 'Go to Appointments, tap "Request New Appointment", choose an available slot, and submit your request. Your healthcare provider will confirm the appointment.',
      },
      {
        q: 'Can I reschedule my appointment?',
        a: 'Yes, you can reschedule by going to your upcoming appointments and selecting "Reschedule". Please do this at least 24 hours in advance.',
      },
      {
        q: 'How will I be reminded about appointments?',
        a: 'You\'ll receive push notifications and in-app reminders before your scheduled appointments. Make sure notifications are enabled.',
      },
    ],
  },
  {
    category: 'Privacy & Security',
    questions: [
      {
        q: 'Is my health data secure?',
        a: 'Yes, we use industry-standard encryption to protect your data. All communications are encrypted, and your data is stored securely in compliance with healthcare regulations.',
      },
      {
        q: 'Who can see my health information?',
        a: 'Only you, your partner (if shared), and authorized healthcare providers can access your health information. You control sharing settings in your profile.',
      },
      {
        q: 'What is the PIN used for?',
        a: 'Your 4-digit PIN provides quick access to your account on shared devices and is used for sensitive operations like password reset verification.',
      },
    ],
  },
  {
    category: 'Technical Support',
    questions: [
      {
        q: 'The app isn\'t loading properly. What should I do?',
        a: 'Try refreshing the page (web) or closing and reopening the app (mobile). Clear your cache if issues persist. Contact support if the problem continues.',
      },
      {
        q: 'How do I enable notifications?',
        a: 'Go to Profile > Notification Settings and toggle on the notifications you want to receive. Make sure your device permissions allow notifications from our app.',
      },
      {
        q: 'Can I use the app on multiple devices?',
        a: 'Yes! Your account works across all devices. Use Individual Login with your email/password or Quick Access with your Couple ID and PIN.',
      },
    ],
  },
];

export default function FAQsScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({});

  const toggleItem = (key: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

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
          <Text style={[styles.pageTitle, isMobile && styles.pageTitleMobile]}>FAQs</Text>
          <Text style={[styles.pageSubtitle, isMobile && styles.pageSubtitleMobile]}>
            Find answers to frequently asked questions about Fit for Baby
          </Text>
        </View>

        <View style={[styles.faqSection, isMobile && styles.faqSectionMobile]}>
          {faqData.map((category, categoryIndex) => (
            <View key={categoryIndex} style={styles.categoryContainer}>
              <Text style={styles.categoryTitle}>{category.category}</Text>
              {category.questions.map((item, questionIndex) => {
                const key = `${categoryIndex}-${questionIndex}`;
                const isExpanded = expandedItems[key];
                return (
                  <TouchableOpacity
                    key={questionIndex}
                    style={styles.faqItem}
                    onPress={() => toggleItem(key)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.questionRow}>
                      <Text style={styles.questionText}>{item.q}</Text>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color="#64748b"
                      />
                    </View>
                    {isExpanded && (
                      <Text style={styles.answerText}>{item.a}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Can't find what you're looking for?</Text>
          <Text style={styles.contactText}>
            Our support team is here to help you with any questions.
          </Text>
          <TouchableOpacity style={styles.contactButton} onPress={() => router.push('/contact-us')}>
            <Text style={styles.contactButtonText}>Contact Support</Text>
          </TouchableOpacity>
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
    marginBottom: 16,
  },
  pageTitleMobile: {
    fontSize: 32,
  },
  pageSubtitle: {
    fontSize: 20,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: 600,
    lineHeight: 30,
  },
  pageSubtitleMobile: {
    fontSize: 16,
    lineHeight: 24,
  },
  faqSection: {
    paddingHorizontal: 60,
    paddingVertical: 40,
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  faqSectionMobile: {
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  categoryContainer: {
    marginBottom: 32,
  },
  categoryTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#006dab',
  },
  faqItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  questionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    paddingRight: 12,
  },
  answerText: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 24,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  contactSection: {
    backgroundColor: '#006dab',
    paddingHorizontal: 60,
    paddingVertical: 50,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  contactText: {
    fontSize: 16,
    color: '#e0f2fe',
    textAlign: 'center',
    maxWidth: 400,
    marginBottom: 20,
    lineHeight: 24,
  },
  contactButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  contactButtonText: {
    color: '#006dab',
    fontSize: 16,
    fontWeight: '600',
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
