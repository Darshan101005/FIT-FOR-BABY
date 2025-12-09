import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

const isWeb = Platform.OS === 'web';

const features = [
  {
    icon: 'chart-line-variant',
    title: 'Health Tracking',
    description: 'Monitor your health metrics and baby\'s development week by week with intuitive tracking tools.',
    color: '#006dab',
    bgColors: ['#EFF6FF', '#DBEAFE'],
  },
  {
    icon: 'doctor',
    title: 'Expert Support',
    description: 'Connect with healthcare professionals whenever you need guidance and support.',
    color: '#10B981',
    bgColors: ['#F0FDF4', '#DCFCE7'],
  },
  {
    icon: 'responsive',
    title: 'Easy Access',
    description: 'Access your health information anytime, anywhere on any device - web, iOS, or Android.',
    color: '#D97706',
    bgColors: ['#FEF3C7', '#FDE68A'],
  },
  {
    icon: 'security',
    title: 'Secure & Private',
    description: 'Your health data is protected with industry-standard security and encryption.',
    color: '#7C3AED',
    bgColors: ['#F5F3FF', '#EDE9FE'],
  },
  {
    icon: 'food-apple',
    title: 'Nutrition Tracking',
    description: 'Log your meals and get personalized nutrition insights for a healthy pregnancy.',
    color: '#EF4444',
    bgColors: ['#FEF2F2', '#FECACA'],
  },
  {
    icon: 'walk',
    title: 'Activity Monitoring',
    description: 'Track your daily steps, exercise, and physical activity with photo verification.',
    color: '#0EA5E9',
    bgColors: ['#F0F9FF', '#E0F2FE'],
  },
  {
    icon: 'calendar-check',
    title: 'Appointment Management',
    description: 'Schedule and manage your prenatal appointments with reminders and notifications.',
    color: '#EC4899',
    bgColors: ['#FCE7F3', '#FBCFE8'],
  },
  {
    icon: 'message-text',
    title: 'Secure Messaging',
    description: 'Communicate directly with your healthcare team through encrypted messaging.',
    color: '#14B8A6',
    bgColors: ['#F0FDFA', '#CCFBF1'],
  },
];

export default function FeaturesScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Features</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        

        <View style={[styles.featuresGrid, isMobile && styles.featuresGridMobile]}>
          {features.map((feature, index) => (
            <View key={index} style={[styles.featureCard, isMobile && styles.featureCardMobile]}>
              <LinearGradient colors={feature.bgColors as any} style={styles.featureIconContainer}>
                <MaterialCommunityIcons name={feature.icon as any} size={36} color={feature.color} />
              </LinearGradient>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
          ))}
        </View>

        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Ready to Get Started?</Text>
          <Text style={styles.ctaSubtitle}>
            Join thousands of parents who trust Fit for Baby for their pregnancy journey.
          </Text>
          
          {/* Arrow is now inside the button and visible */}
          <TouchableOpacity style={styles.ctaButton} onPress={() => router.push('/login')}>
            <Text style={styles.ctaButtonText}>Start Free Today</Text>
            <Ionicons name="arrow-forward" size={20} color="#006dab" />
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
    paddingVertical: 80,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 60,
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
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 60,
    paddingVertical: 60,
    gap: 24,
  },
  featuresGridMobile: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    flexDirection: 'column',
  },
  featureCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: isWeb ? '23%' : '100%',
    minWidth: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  featureCardMobile: {
    width: '100%',
  },
  featureIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 22,
  },
  ctaSection: {
    backgroundColor: '#006dab',
    paddingHorizontal: 60,
    paddingVertical: 60,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  ctaSubtitle: {
    fontSize: 18,
    color: '#e0f2fe',
    textAlign: 'center',
    maxWidth: 500,
    marginBottom: 24,
    lineHeight: 28,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    marginTop: 16,
  },
  ctaButtonText: {
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