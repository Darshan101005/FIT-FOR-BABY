import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

const isWeb = Platform.OS === 'web';

const LandingScreen: React.FC = () => {
  const router = useRouter();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const scrollViewRef = useRef<ScrollView>(null);
  const [isLoginHovered, setIsLoginHovered] = useState(false);
  const [isCtaHeartHovered, setIsCtaHeartHovered] = useState(false);

  const primaryButtonGradientColors = ['#0EA5E9', '#06B6D4', '#10B981', '#98be4e'] as const;

  const scrollToSection = (sectionName: 'mobile' | 'features' | 'howitworks' | 'cta') => {
    let yOffset = 0;
    switch (sectionName) {
      case 'mobile':
        yOffset = screenHeight;
        break;
      case 'features':
        yOffset = screenHeight + 400;
        break;
      case 'howitworks':
        yOffset = screenHeight + 1100;
        break;
      case 'cta':
        yOffset = screenHeight + 2000;
        break;
      default:
        yOffset = 0;
    }
    scrollViewRef.current?.scrollTo({ y: yOffset, animated: true });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, isWeb && styles.headerGlassy]}>
        <Image
          source={require('../assets/logos/fit_for_baby_horizontal.png')}
          style={styles.headerLogo}
          contentFit="cover"
        />
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={() => scrollToSection('features')} activeOpacity={0.8}>
            <Text style={styles.navLink}>Features</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollToSection('mobile')} activeOpacity={0.8}>
            <Text style={styles.navLink}>Mobile Access</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollToSection('howitworks')} activeOpacity={0.8}>
            <Text style={styles.navLink}>How It Works</Text>
          </TouchableOpacity>
          <Pressable
            style={({ pressed, hovered }) => [
              styles.loginBtn,
              (hovered || pressed) && styles.loginBtnHovered
            ]}
            onPress={() => router.push('/login')}
            onHoverIn={() => setIsLoginHovered(true)}
            onHoverOut={() => setIsLoginHovered(false)}
          >
            {isLoginHovered && isWeb ? (
              <LinearGradient
                colors={primaryButtonGradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.loginBtnGradient}
              >
                <Text style={styles.loginBtnText}>Login</Text>
              </LinearGradient>
            ) : (
              <Text style={styles.loginBtnText}>Login</Text>
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroSection, { height: screenHeight }]}>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>
              Your Pregnancy Journey,{'\n'}
              <Text style={styles.heroTitleAccent}>Simplified</Text>
            </Text>
            <Text style={styles.heroSubtitle}>
              Track your baby's health, connect with healthcare support, and access personalized care.
              {'\n'}
              Receive personalized tips, reminders, and expert resources directly at your fingertips.
            </Text>
            <View style={styles.heroButtons}>
              <TouchableOpacity
                onPress={() => router.push('/login')}
                activeOpacity={0.85}
                style={styles.getStartedButton}
              >
                <View style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>Get Started</Text>
                  <Ionicons name="arrow-forward" size={20} color="#ffffff" style={{ marginLeft: 8 }} />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.heroImage}>
            <Image
              source={require('../assets/images/couple.jpg')}
              style={styles.coupleImage}
              contentFit="contain"
            />
          </View>
        </View>

        <View style={styles.mobileAccessSection}>
          <Text style={styles.mobileAccessTitle}>Access on Mobile</Text>
          <Text style={styles.mobileAccessSubtitle}>
            Scan the QR code to access Fit for Baby on your phone instantly.
          </Text>
          <View style={styles.qrCodeContainer}>
            <Image
              source={require('../assets/images/qr_code.png')}
              style={styles.qrCodeImage}
              contentFit="contain"
            />
            <Text style={styles.qrText}>Scan with your camera app</Text>
          </View>
          <View style={styles.qrFeatures}>
            <View style={styles.qrFeatureItem}>
              <MaterialCommunityIcons name="apple-ios" size={20} color="#10B981" />
              <Text style={styles.qrFeatureText}>Works on iOS & Android</Text>
            </View>
            <View style={styles.qrFeatureItem}>
              <MaterialCommunityIcons name="cloud-download-outline" size={20} color="#10B981" />
              <Text style={styles.qrFeatureText}>No app download required</Text>
            </View>
            <View style={styles.qrFeatureItem}>
              <MaterialCommunityIcons name="speedometer" size={20} color="#10B981" />
              <Text style={styles.qrFeatureText}>Instant access</Text>
            </View>
          </View>
        </View>

        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Everything You Need for a Healthy Pregnancy</Text>
          <View style={styles.featuresGrid}>
            <View style={styles.featureCard}>
              <LinearGradient colors={['#EFF6FF', '#DBEAFE']} style={styles.featureIconContainer}>
                <MaterialCommunityIcons name="shoe-print" size={36} color="#006dab" />
              </LinearGradient>
              <Text style={styles.featureTitle}>Health Tracking</Text>
              <Text style={styles.featureDescription}>
Easily record your daily steps, meals, exercise, and overall wellness
              </Text>
            </View>

            <View style={styles.featureCard}>
              <LinearGradient colors={['#F0FDF4', '#DCFCE7']} style={styles.featureIconContainer}>
                <MaterialCommunityIcons name="food-apple" size={36} color="#10B981" />
              </LinearGradient>
              <Text style={styles.featureTitle}>Guidance & Support</Text>
              <Text style={styles.featureDescription}>
                Access helpful tips and connect with health professionals whenever needed.
              </Text>
            </View>

            <View style={styles.featureCard}>
              <LinearGradient colors={['#FEF3C7', '#FDE68A']} style={styles.featureIconContainer}>
                <MaterialCommunityIcons name="calendar-clock" size={36} color="#D97706" />
              </LinearGradient>
              <Text style={styles.featureTitle}>Simple & Convenient</Text>
              <Text style={styles.featureDescription}>
                Log your information quickly and view your progress anytime.
              </Text>
            </View>

            <View style={styles.featureCard}>
              <LinearGradient colors={['#FCE7F3', '#FBCFE8']} style={styles.featureIconContainer}>
                <MaterialCommunityIcons name="account-heart" size={36} color="#EC4899" />
              </LinearGradient>
              <Text style={styles.featureTitle}>Secure & Private</Text>
              <Text style={styles.featureDescription}>
                Your data is safely stored and kept completely confidential.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.howItWorksSection}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.timelineContainer}>
            <View style={styles.timelineLine} />

            <View style={styles.timelineItem}>
              <View style={styles.timelineCardLeft}>
                <View style={styles.timelineCardHeader}>
                  <MaterialCommunityIcons name="login" size={28} color="#0EA5E9" />
                  <Text style={styles.timelineCardTitle}>Start Using Your Account
</Text>
                </View>
                <Text style={styles.timelineCardDescription}>Log in with the details provided to you and begin your wellness journey.
</Text>
              </View>
              <LinearGradient colors={['#0EA5E9', '#06B6D4']} style={styles.timelineDot}>
                <Text style={styles.timelineDotText}>1</Text>
              </LinearGradient>
              <View style={styles.timelineEmptyRight} />
            </View>

            <View style={styles.timelineItem}>
              <View style={styles.timelineEmptyLeft} />
              <LinearGradient colors={['#0EA5E9', '#06B6D4']} style={styles.timelineDot}>
                <Text style={styles.timelineDotText}>2</Text>
              </LinearGradient>
              <View style={styles.timelineCardRight}>
                <View style={styles.timelineCardHeader}>
                  <MaterialCommunityIcons name="shoe-print" size={28} color="#10B981" />
                  <Text style={styles.timelineCardTitle}>Track Your Daily Progress</Text>
                </View>
                <Text style={styles.timelineCardDescription}>Enter your activity, meals, exercise, and weight to follow your improvements.</Text>
              </View>
            </View>

            <View style={styles.timelineItem}>
              <View style={styles.timelineCardLeft}>
                <View style={styles.timelineCardHeader}>
                  <MaterialCommunityIcons name="calendar-check" size={28} color="#7C3AED" />
                  <Text style={styles.timelineCardTitle}>Receive Support When Needed</Text>
                </View>
                <Text style={styles.timelineCardDescription}>Reach out to health professionals for guidance at any time.</Text>
              </View>
              <LinearGradient colors={['#0EA5E9', '#06B6D4']} style={styles.timelineDot}>
                <Text style={styles.timelineDotText}>3</Text>
              </LinearGradient>
              <View style={styles.timelineEmptyRight} />
            </View>

            <View style={styles.timelineItem}>
              <View style={styles.timelineEmptyLeft} />
              <LinearGradient colors={['#0EA5E9', '#06B6D4']} style={styles.timelineDot}>
                <Text style={styles.timelineDotText}>4</Text>
              </LinearGradient>
              <View style={styles.timelineCardRight}>
                <View style={styles.timelineCardHeader}>
                  <MaterialCommunityIcons name="trophy" size={28} color="#F59E0B" />
                  <Text style={styles.timelineCardTitle}>Stay Updated</Text>
                </View>
                <Text style={styles.timelineCardDescription}>Get personalised reminders, tips, and notifications to keep you on track.</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.ctaSection}>
          <LinearGradient
            colors={primaryButtonGradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaTitle}>Ready to Simplify Your Pregnancy?</Text>
            <Text style={styles.ctaSubtitle}>
              Join thousands of parents and start your guided, confident journey today.
            </Text>
            <Pressable
              onPress={() => router.push('/login')}
              onHoverIn={() => setIsCtaHeartHovered(true)}
              onHoverOut={() => setIsCtaHeartHovered(false)}
              style={styles.ctaButton}
            >
              <Text style={styles.ctaButtonText}>Start Tracking Now</Text>
              <Ionicons
                name={isCtaHeartHovered ? "heart" : "heart-outline"}
                size={20}
                color={isCtaHeartHovered ? "#FF69B4" : "#006dab"}
              />
            </Pressable>
          </LinearGradient>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerContent}>
            <View style={styles.footerColumnLogo}>
              <Image
                source={require('../assets/logos/fit_for_baby_horizontal.png')}
                style={styles.footerLogo}
                contentFit="cover"
              />
              <Text style={styles.footerContact}>support@fitforbaby.com</Text>
              <View style={styles.socialIcons}>
                <TouchableOpacity style={styles.socialIcon}>
                  <MaterialCommunityIcons name="facebook" size={24} color="#94a3b8" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialIcon}>
                  <MaterialCommunityIcons name="twitter" size={24} color="#94a3b8" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialIcon}>
                  <MaterialCommunityIcons name="instagram" size={24} color="#94a3b8" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialIcon}>
                  <MaterialCommunityIcons name="linkedin" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.footerColumn}>
              <Text style={styles.footerHeading}>About</Text>
              <TouchableOpacity onPress={() => router.push('/our-mission')}>
                <Text style={styles.footerLink}>Our Mission</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/team')}>
                <Text style={styles.footerLink}>Team</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footerColumn}>
              <Text style={styles.footerHeading}>Product</Text>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={styles.footerLink}>Get Started</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={styles.footerLink}>Login</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/features')}>
                <Text style={styles.footerLink}>Features</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footerColumn}>
              <Text style={styles.footerHeading}>Support</Text>
              <TouchableOpacity onPress={() => router.push('/help-center')}>
                <Text style={styles.footerLink}>Help Center</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/contact-us')}>
                <Text style={styles.footerLink}>Contact Us</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/faqs')}>
                <Text style={styles.footerLink}>FAQs</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footerColumn}>
              <Text style={styles.footerHeading}>Legal</Text>
              <TouchableOpacity onPress={() => router.push('/privacy-policy')}>
                <Text style={styles.footerLink}>Privacy Policy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/terms-of-service')}>
                <Text style={styles.footerLink}>Terms of Service</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/cookie-policy')}>
                <Text style={styles.footerLink}>Cookie Policy</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.footerBottom}>
            <Text style={styles.copyright}>© 2025 Fit for Baby. All rights reserved.</Text>
          </View>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 60,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(229, 231, 235, 0.5)',
  },
  headerGlassy: {
    // @ts-ignore
    backdropFilter: 'blur(10px)',
  },
  headerLogo: {
    width: 293,
    height: 77,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  navLink: {
    color: '#1e293b',
    fontSize: 16,
    fontWeight: '600',
  },
  loginBtn: {
    backgroundColor: '#006dab',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#006dab',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  loginBtnHovered: {
    backgroundColor: 'transparent',
  },
  loginBtnGradient: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    margin: -12,
    marginHorizontal: -32,
    borderRadius: 8,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 60,
    paddingTop: 80,
    paddingBottom: 60,
    gap: 40,
    backgroundColor: '#ffffff',
  },
  heroContent: {
    flex: 1,
    paddingLeft: 40,
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 64,
    fontWeight: '800',
    color: '#006dab',
    marginBottom: 24,
    lineHeight: 72,
  },
  heroTitleAccent: {
    color: '#98be4e',
  },
  heroSubtitle: {
    fontSize: 22,
    color: '#64748b',
    lineHeight: 34,
    marginBottom: 48,
  },
  heroButtons: {
    flexDirection: 'row',
    gap: 20,
  },
  primaryButton: {
    backgroundColor: '#006dab',
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#006dab',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  getStartedButton: {},
  heroImage: {
    width: 450,
  },
  coupleImage: {
    width: '100%',
    height: 450,
  },
  mobileAccessSection: {
    paddingHorizontal: 60,
    paddingVertical: 80,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
  },
  mobileAccessTitle: {
    fontSize: 40,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 16,
  },
  mobileAccessSubtitle: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 40,
    maxWidth: 650,
  },
  qrCodeContainer: {
    backgroundColor: '#ffffff',
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
    marginBottom: 32,
  },
  qrCodeImage: {
    width: 200,
    height: 200,
    marginBottom: 16,
  },
  qrText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
  },
  qrFeatures: {
    flexDirection: 'row',
    gap: 50,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  qrFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  qrFeatureText: {
    fontSize: 17,
    color: '#1e293b',
    fontWeight: '600',
  },
  featuresSection: {
    paddingHorizontal: 60,
    paddingVertical: 100,
    backgroundColor: '#ffffff',
  },
  sectionTitle: {
    fontSize: 44,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 80,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 40,
  },
  featureCard: {
    width: 280,
    padding: 36,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 8,
  },
  featureIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  featureTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  featureDescription: {
    fontSize: 17,
    color: '#64748b',
    lineHeight: 26,
  },
  howItWorksSection: {
    paddingHorizontal: 60,
    paddingVertical: 100,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  timelineContainer: {
    width: '100%',
    maxWidth: 900,
    position: 'relative',
    paddingVertical: 20,
  },
  timelineLine: {
    position: 'absolute',
    left: '50%',
    width: 4,
    height: '100%',
    backgroundColor: '#e2e8f0',
    transform: [{ translateX: -2 }],
    borderRadius: 2,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 60,
    position: 'relative',
  },
  timelineCardLeft: {
    width: '45%',
    padding: 25,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    marginRight: '2.5%',
  },
  timelineCardRight: {
    width: '45%',
    padding: 25,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    marginLeft: '2.5%',
  },
  timelineCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  timelineEmptyLeft: {
    width: '45%',
    marginRight: '2.5%',
  },
  timelineEmptyRight: {
    width: '45%',
    marginLeft: '2.5%',
  },
  timelineDot: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -25 }],
    backgroundColor: '#0EA5E9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  timelineDotText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },
  timelineCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  timelineCardDescription: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
  },
  ctaSection: {
    paddingHorizontal: 60,
    paddingVertical: 60,
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  ctaGradient: {
    paddingHorizontal: 60,
    paddingVertical: 50,
    borderRadius: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 800,
  },
  ctaTitle: {
    fontSize: 44,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
  },
  ctaSubtitle: {
    fontSize: 20,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 40,
    opacity: 0.95,
  },
  ctaButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  ctaButtonText: {
    color: '#006dab',
    fontSize: 18,
    fontWeight: '700',
  },
  footer: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 60,
    paddingVertical: 60,
  },
  footerContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 40,
    gap: 40,
  },
  footerColumn: {
    minWidth: 150,
  },
  footerColumnLogo: {
    minWidth: 250,
    maxWidth: 350,
  },
  footerLogo: {
    width: 293,
    height: 78,
    marginBottom: 16,
  },
  footerHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  footerLink: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 12,
  },
  socialIcons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  socialIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerContact: {
    fontSize: 14,
    color: '#94a3b8',
  },
  footerBottom: {
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    alignItems: 'center',
  },
  copyright: {
    fontSize: 14,
    color: '#64748b',
  },
});

export default LandingScreen;