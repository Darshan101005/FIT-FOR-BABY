import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

const isWeb = Platform.OS === 'web';

const teamMembers = [
  {
    name: 'Dr. Sarah Mitchell',
    role: 'Medical Director',
    bio: 'Board-certified OB-GYN with 15+ years of experience in maternal health.',
    icon: 'medical',
    color: '#006dab',
    bgColor: '#EFF6FF',
  },
  {
    name: 'Michael Chen',
    role: 'Lead Developer',
    bio: 'Full-stack developer passionate about healthcare technology innovation.',
    icon: 'code-slash',
    color: '#10B981',
    bgColor: '#F0FDF4',
  },
  {
    name: 'Emily Rodriguez',
    role: 'UX Designer',
    bio: 'Creating intuitive experiences for expecting parents with empathy and care.',
    icon: 'color-palette',
    color: '#7C3AED',
    bgColor: '#F5F3FF',
  },
  {
    name: 'Dr. James Wilson',
    role: 'Nutrition Specialist',
    bio: 'Expert in prenatal nutrition and dietary planning for healthy pregnancies.',
    icon: 'nutrition',
    color: '#D97706',
    bgColor: '#FEF3C7',
  },
  {
    name: 'Lisa Thompson',
    role: 'Customer Success',
    bio: 'Dedicated to ensuring every user gets the most out of their journey with us.',
    icon: 'people',
    color: '#EC4899',
    bgColor: '#FCE7F3',
  },
  {
    name: 'David Park',
    role: 'Data Security',
    bio: 'Ensuring your health data is protected with the highest security standards.',
    icon: 'shield-checkmark',
    color: '#059669',
    bgColor: '#ECFDF5',
  },
];

export default function TeamScreen() {
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
          <Text style={[styles.pageTitle, isMobile && styles.pageTitleMobile]}>Our Team</Text>
          <Text style={[styles.pageSubtitle, isMobile && styles.pageSubtitleMobile]}>
            Meet the passionate individuals dedicated to supporting your pregnancy journey
          </Text>
        </View>

        <View style={[styles.teamGrid, isMobile && styles.teamGridMobile]}>
          {teamMembers.map((member, index) => (
            <View key={index} style={[styles.teamCard, isMobile && styles.teamCardMobile]}>
              <View style={[styles.avatarContainer, { backgroundColor: member.bgColor }]}>
                <Ionicons name={member.icon as any} size={40} color={member.color} />
              </View>
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.memberRole}>{member.role}</Text>
              <Text style={styles.memberBio}>{member.bio}</Text>
            </View>
          ))}
        </View>

        <View style={styles.joinSection}>
          <Text style={styles.joinTitle}>Join Our Team</Text>
          <Text style={styles.joinText}>
            We're always looking for passionate individuals who want to make a difference in maternal health.
          </Text>
          <TouchableOpacity style={styles.joinButton}>
            <Text style={styles.joinButtonText}>View Open Positions</Text>
            <Ionicons name="arrow-forward" size={18} color="#ffffff" />
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
    paddingVertical: 80,
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
  teamGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 60,
    paddingVertical: 60,
    gap: 24,
  },
  teamGridMobile: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    flexDirection: 'column',
  },
  teamCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: isWeb ? '30%' : '100%',
    minWidth: 280,
    maxWidth: 350,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  teamCardMobile: {
    width: '100%',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  memberName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
    textAlign: 'center',
  },
  memberRole: {
    fontSize: 14,
    fontWeight: '600',
    color: '#006dab',
    marginBottom: 12,
    textAlign: 'center',
  },
  memberBio: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
  joinSection: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 60,
    paddingVertical: 60,
    alignItems: 'center',
  },
  joinTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  joinText: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: 500,
    marginBottom: 24,
    lineHeight: 28,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#006dab',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  joinButtonText: {
    color: '#ffffff',
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
