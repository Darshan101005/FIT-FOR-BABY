import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';

const isWeb = Platform.OS === 'web';

const helpCategories = [
  {
    icon: 'person-circle',
    title: 'Account & Profile',
    description: 'Manage your account settings, profile information, and preferences.',
    articles: ['How to update your profile', 'Changing your password', 'Managing notifications'],
  },
  {
    icon: 'fitness',
    title: 'Health Tracking',
    description: 'Learn how to track your health metrics and monitor progress.',
    articles: ['Logging daily steps', 'Tracking weight changes', 'Recording exercise'],
  },
  {
    icon: 'nutrition',
    title: 'Nutrition & Diet',
    description: 'Get help with meal logging and diet plan features.',
    articles: ['Logging food intake', 'Understanding your diet plan', 'Meal recommendations'],
  },
  {
    icon: 'calendar',
    title: 'Appointments',
    description: 'Schedule and manage your prenatal appointments.',
    articles: ['Booking appointments', 'Rescheduling visits', 'Setting reminders'],
  },
  {
    icon: 'shield-checkmark',
    title: 'Privacy & Security',
    description: 'Understand how we protect your data and manage privacy.',
    articles: ['Data protection policies', 'Managing PIN security', 'Device management'],
  },
  {
    icon: 'help-circle',
    title: 'Getting Started',
    description: 'New to Fit for Baby? Start here for the basics.',
    articles: ['Creating your account', 'First-time setup', 'Quick start guide'],
  },
];

export default function HelpCenterScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const [searchQuery, setSearchQuery] = useState('');

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
          <Text style={[styles.pageTitle, isMobile && styles.pageTitleMobile]}>Help Center</Text>
          <Text style={[styles.pageSubtitle, isMobile && styles.pageSubtitleMobile]}>
            Find answers to your questions and get the support you need
          </Text>
          
          <View style={[styles.searchContainer, isMobile && styles.searchContainerMobile]}>
            <Ionicons name="search" size={20} color="#64748b" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for help..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <View style={[styles.categoriesGrid, isMobile && styles.categoriesGridMobile]}>
          {helpCategories.map((category, index) => (
            <TouchableOpacity key={index} style={[styles.categoryCard, isMobile && styles.categoryCardMobile]}>
              <View style={styles.categoryHeader}>
                <View style={styles.iconContainer}>
                  <Ionicons name={category.icon as any} size={28} color="#006dab" />
                </View>
                <View style={styles.categoryTitleContainer}>
                  <Text style={styles.categoryTitle}>{category.title}</Text>
                  <Text style={styles.categoryDescription}>{category.description}</Text>
                </View>
              </View>
              <View style={styles.articlesList}>
                {category.articles.map((article, articleIndex) => (
                  <View key={articleIndex} style={styles.articleItem}>
                    <Ionicons name="document-text-outline" size={16} color="#64748b" />
                    <Text style={styles.articleText}>{article}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Still need help?</Text>
          <Text style={styles.contactText}>
            Our support team is available 24/7 to assist you with any questions.
          </Text>
          <TouchableOpacity style={styles.contactButton} onPress={() => router.push('/contact-us')}>
            <Ionicons name="mail" size={18} color="#ffffff" />
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
    backgroundColor: '#006dab',
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
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  pageTitleMobile: {
    fontSize: 32,
  },
  pageSubtitle: {
    fontSize: 20,
    color: '#e0f2fe',
    textAlign: 'center',
    maxWidth: 600,
    lineHeight: 30,
    marginBottom: 32,
  },
  pageSubtitleMobile: {
    fontSize: 16,
    lineHeight: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: '100%',
    maxWidth: 500,
    gap: 12,
  },
  searchContainerMobile: {
    maxWidth: '100%',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 60,
    paddingVertical: 60,
    gap: 24,
  },
  categoriesGridMobile: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    flexDirection: 'column',
  },
  categoryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: isWeb ? '30%' : '100%',
    minWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  categoryCardMobile: {
    width: '100%',
  },
  categoryHeader: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitleContainer: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  articlesList: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
    gap: 12,
  },
  articleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  articleText: {
    fontSize: 14,
    color: '#006dab',
  },
  contactSection: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 60,
    paddingVertical: 60,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  contactText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: 400,
    marginBottom: 24,
    lineHeight: 24,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#006dab',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  contactButtonText: {
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
