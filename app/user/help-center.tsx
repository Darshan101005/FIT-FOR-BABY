import BottomNavBar from '@/components/navigation/BottomNavBar';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';

const isWeb = Platform.OS === 'web';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  {
    id: '1',
    question: 'How do I track my daily meals?',
    answer: 'Go to the Home screen and tap "Log Food". You can search for foods, scan barcodes, or manually enter nutritional information. Your meals will be saved and tracked automatically.',
    category: 'Tracking',
  },
  {
    id: '2',
    question: 'How does partner sync work?',
    answer: 'Partner sync allows couples to share their health journey. Both partners need to have the app installed and connected. Go to Profile > Partner Settings to link accounts using a unique code.',
    category: 'Account',
  },
  {
    id: '3',
    question: 'How do I switch between profiles?',
    answer: 'If you share a device with your partner, go to Profile > Switch Profile. Enter your 4-digit PIN to access your personal profile. Each partner has their own PIN for privacy.',
    category: 'Account',
  },
  {
    id: '4',
    question: 'How do I set up my session PIN?',
    answer: 'Go to Profile > Manage Session PIN. You\'ll need to verify your email with an OTP, then create a 4-digit PIN. This PIN is used for profile switching on shared devices.',
    category: 'Security',
  },
  {
    id: '5',
    question: 'Can I export my health data?',
    answer: 'Yes! Go to Profile > Data & Privacy > Export My Data. You can download your data in PDF or CSV format for your records or to share with healthcare providers.',
    category: 'Data',
  },
  {
    id: '6',
    question: 'How do I log my weight?',
    answer: 'From the Home screen, tap "Log Weight". Enter your current weight and any notes. Your weight history will be displayed in charts under the Progress section.',
    category: 'Tracking',
  },
  {
    id: '7',
    question: 'What exercises are recommended during pregnancy?',
    answer: 'The app provides personalized exercise recommendations based on your trimester and health profile. Always consult your healthcare provider before starting any exercise routine.',
    category: 'Health',
  },
  {
    id: '8',
    question: 'How do I change the app language?',
    answer: 'Go to Profile and find the Language section at the top. Tap on your preferred language (English or Tamil) to switch. The app will update immediately.',
    category: 'Settings',
  },
  {
    id: '9',
    question: 'How do I contact my healthcare provider through the app?',
    answer: 'Go to Messages from the bottom navigation. You can send messages to your assigned healthcare provider and receive responses within the app.',
    category: 'Communication',
  },
  {
    id: '10',
    question: 'How do I schedule an appointment?',
    answer: 'Navigate to Appointments from your Home screen. Select a date and time slot, choose the type of appointment, and confirm your booking.',
    category: 'Appointments',
  },
];

const categories = ['All', 'Tracking', 'Account', 'Security', 'Data', 'Health', 'Settings', 'Communication', 'Appointments'];

const contactOptions = [
  {
    id: 'email',
    icon: 'mail',
    title: 'Email Support',
    subtitle: 'support@fitforbaby.com',
    action: 'mailto:support@fitforbaby.com',
    color: '#3b82f6',
  },
  {
    id: 'phone',
    icon: 'call',
    title: 'Phone Support',
    subtitle: '+91 1800-XXX-XXXX',
    action: 'tel:+911800XXXXXXX',
    color: '#22c55e',
  },
  {
    id: 'chat',
    icon: 'chatbubbles',
    title: 'Live Chat',
    subtitle: 'Available 9 AM - 6 PM',
    action: 'chat',
    color: '#8b5cf6',
  },
  {
    id: 'whatsapp',
    icon: 'logo-whatsapp',
    title: 'WhatsApp',
    subtitle: 'Quick responses',
    action: 'https://wa.me/911800XXXXXXX',
    color: '#25d366',
  },
];

export default function HelpCenterScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const { colors, isDarkMode } = useTheme();
  const { language, t } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const filteredFAQs = faqData.filter((faq) => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleContactPress = (action: string) => {
    if (action === 'chat') {
      // Open in-app chat
      router.push('/user/messages' as any);
    } else {
      Linking.openURL(action);
    }
  };

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
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
            <Text style={styles.headerTitle}>{t('help.title')}</Text>
            <View style={{ width: 40 }} />
          </View>
          <Text style={styles.headerSubtitle}>{language === 'ta' ? 'இன்று உங்களுக்கு எவ்வாறு உதவ முடியும்?' : 'How can we help you today?'}</Text>
        </LinearGradient>

        <View style={[styles.content, isMobile && styles.contentMobile]}>
          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="search" size={20} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={t('help.searchPlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('help.contactUs')}</Text>
            <View style={styles.contactGrid}>
              {contactOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.contactCard, { backgroundColor: colors.cardBackground }]}
                  onPress={() => handleContactPress(option.action)}
                >
                  <View style={[styles.contactIcon, { backgroundColor: option.color + '20' }]}>
                    <Ionicons name={option.icon as any} size={24} color={option.color} />
                  </View>
                  <Text style={[styles.contactTitle, { color: colors.text }]}>{option.title}</Text>
                  <Text style={[styles.contactSubtitle, { color: colors.textSecondary }]}>
                    {option.subtitle}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Category Filter */}
          <View style={styles.categorySection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('help.faqCategories')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    { 
                      backgroundColor: selectedCategory === category 
                        ? colors.primary 
                        : colors.cardBackground,
                      borderColor: selectedCategory === category 
                        ? colors.primary 
                        : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      { 
                        color: selectedCategory === category 
                          ? '#ffffff' 
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* FAQs */}
          <View style={styles.faqSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('help.faq')}
            </Text>
            
            {filteredFAQs.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.cardBackground }]}>
                <Ionicons name="search-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('help.noResults')}</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Try adjusting your search or category filter
                </Text>
              </View>
            ) : (
              <View style={[styles.faqList, { backgroundColor: colors.cardBackground }]}>
                {filteredFAQs.map((faq, index) => (
                  <TouchableOpacity
                    key={faq.id}
                    style={[
                      styles.faqItem,
                      index < filteredFAQs.length - 1 && [
                        styles.faqItemBorder,
                        { borderBottomColor: colors.borderLight },
                      ],
                    ]}
                    onPress={() => toggleFAQ(faq.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.faqHeader}>
                      <View style={styles.faqQuestion}>
                        <View style={[styles.faqCategoryBadge, { backgroundColor: colors.primary + '15' }]}>
                          <Text style={[styles.faqCategoryText, { color: colors.primary }]}>
                            {faq.category}
                          </Text>
                        </View>
                        <Text style={[styles.faqQuestionText, { color: colors.text }]}>
                          {faq.question}
                        </Text>
                      </View>
                      <Ionicons
                        name={expandedFAQ === faq.id ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={colors.textMuted}
                      />
                    </View>
                    {expandedFAQ === faq.id && (
                      <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>
                        {faq.answer}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Still Need Help */}
          <View style={[styles.needHelpCard, { backgroundColor: isDarkMode ? colors.primaryLight : '#eff6ff' }]}>
            <Ionicons name="help-buoy" size={32} color={colors.primary} />
            <View style={styles.needHelpContent}>
              <Text style={[styles.needHelpTitle, { color: colors.text }]}>{t('help.stillNeedHelp')}</Text>
              <Text style={[styles.needHelpSubtitle, { color: colors.textSecondary }]}>
                {t('help.reachOut')}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.needHelpButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/user/messages' as any)}
            >
              <Text style={styles.needHelpButtonText}>{t('help.messageUs')}</Text>
            </TouchableOpacity>
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
    marginBottom: 8,
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
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 8,
  },
  content: {
    padding: isWeb ? 40 : 20,
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
  },
  contentMobile: {
    padding: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 24,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  quickActions: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  contactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  contactCard: {
    flex: 1,
    minWidth: 150,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  contactIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  contactSubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryScroll: {
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  faqSection: {
    marginBottom: 24,
  },
  faqList: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  faqItem: {
    padding: 16,
  },
  faqItemBorder: {
    borderBottomWidth: 1,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  faqQuestion: {
    flex: 1,
  },
  faqCategoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 8,
  },
  faqCategoryText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  faqQuestionText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  needHelpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    gap: 16,
  },
  needHelpContent: {
    flex: 1,
  },
  needHelpTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  needHelpSubtitle: {
    fontSize: 13,
  },
  needHelpButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  needHelpButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
