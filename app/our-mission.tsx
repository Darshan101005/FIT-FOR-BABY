import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

const isWeb = Platform.OS === 'web';

export default function OurMissionScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Our Mission</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Content Section containing Cards */}
        <View style={[styles.contentSection, isMobile && styles.contentSectionMobile]}>
          
          {/* Card 1 */}
          <View style={[styles.missionCard, isMobile && styles.missionCardMobile]}>
            <View style={styles.iconContainer}>
              <Ionicons name="heart" size={40} color="#006dab" />
            </View>
            <Text style={styles.cardTitle}>Why We Exist</Text>
            <Text style={styles.cardText}>
              Fit for Baby was founded with a simple yet powerful vision: to make pregnancy care accessible, 
              personalized, and stress-free for every expecting family. We believe that every parent deserves 
              the best support during this transformative journey.
            </Text>
          </View>

          {/* Card 2 */}
          <View style={[styles.missionCard, isMobile && styles.missionCardMobile]}>
            <View style={[styles.iconContainer, styles.iconGreen]}>
              <Ionicons name="people" size={40} color="#10B981" />
            </View>
            <Text style={styles.cardTitle}>Who We Serve</Text>
            <Text style={styles.cardText}>
              We serve expecting mothers, fathers, and their families by providing comprehensive health tracking, 
              expert guidance, and a supportive community. Our platform is designed to be inclusive and accessible 
              to all, regardless of background or experience.
            </Text>
          </View>

          {/* Card 3 */}
          <View style={[styles.missionCard, isMobile && styles.missionCardMobile]}>
            <View style={[styles.iconContainer, styles.iconYellow]}>
              <Ionicons name="star" size={40} color="#D97706" />
            </View>
            <Text style={styles.cardTitle}>Our Values</Text>
            <Text style={styles.cardText}>
              We are guided by compassion, innovation, and integrity. Every feature we build, every resource 
              we provide, and every interaction we have is rooted in our commitment to improving maternal and 
              infant health outcomes.
            </Text>
          </View>

          {/* Card 4 */}
          <View style={[styles.missionCard, isMobile && styles.missionCardMobile]}>
            <View style={[styles.iconContainer, styles.iconPurple]}>
              <Ionicons name="rocket" size={40} color="#7C3AED" />
            </View>
            <Text style={styles.cardTitle}>Our Vision</Text>
            <Text style={styles.cardText}>
              We envision a world where every pregnancy is supported by the best possible care and information. 
              Through technology and human connection, we aim to reduce pregnancy-related complications and 
              empower parents to make informed decisions about their health.
            </Text>
          </View>

        </View>

        {/* Footer */}
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
  contentSection: {
    paddingHorizontal: 60,
    paddingVertical: 60,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
  },
  contentSectionMobile: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    flexDirection: 'column',
  },
  missionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    width: isWeb ? '48%' : '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  missionCardMobile: {
    width: '100%',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconGreen: {
    backgroundColor: '#F0FDF4',
  },
  iconYellow: {
    backgroundColor: '#FEF3C7',
  },
  iconPurple: {
    backgroundColor: '#F5F3FF',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 26,
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