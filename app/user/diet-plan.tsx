import BottomNavBar from '@/components/navigation/BottomNavBar';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { DietPlan, DietPlanFood, dietPlanService } from '@/services/firestore.service';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';

const isWeb = Platform.OS === 'web';

interface DietItem {
  id: string;
  name: string;
  nameTamil: string;
  calories: number;
  quantity: string;
}

export default function DietPlanScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const { colors, isDarkMode } = useTheme();
  const { language, t } = useLanguage();

  const [isLoading, setIsLoading] = useState(true);
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null);

  // Load diet plan from Firestore
  useFocusEffect(
    useCallback(() => {
      const loadDietPlan = async () => {
        try {
          setIsLoading(true);
          const coupleId = await AsyncStorage.getItem('coupleId');
          console.log('Loading diet plan for coupleId:', coupleId);
          if (coupleId) {
            const plan = await dietPlanService.get(coupleId);
            console.log('Loaded diet plan:', plan);
            setDietPlan(plan);
          }
        } catch (error) {
          console.error('Error loading diet plan:', error);
        } finally {
          setIsLoading(false);
        }
      };
      loadDietPlan();
    }, [])
  );

  // Convert diet plan items to display format
  const formatDietItems = (items: DietPlanFood[]): DietItem[] => {
    return items.map((item, index) => ({
      id: item.id || `item-${index}`,
      name: item.name,
      nameTamil: item.nameTamil || '',
      calories: item.caloriesPer100g || 0,
      quantity: item.quantity || '100g',
    }));
  };

  const breakfast = dietPlan ? formatDietItems(dietPlan.breakfast) : [];
  const lunch = dietPlan ? formatDietItems(dietPlan.lunch) : [];
  const dinner = dietPlan ? formatDietItems(dietPlan.dinner) : [];

  const totalCalories = [...breakfast, ...lunch, ...dinner].reduce(
    (sum, item) => sum + (item.calories || 0),
    0
  );

  const renderMealSection = (
    title: string, 
    items: DietItem[], 
    icon: string, 
    iconColor: string,
    bgColor: string
  ) => {
    if (items.length === 0) return null;
    
    return (
      <View style={styles.mealSection}>
        <View style={styles.mealHeader}>
          <View style={[styles.mealIconBox, { backgroundColor: bgColor }]}>
            <Ionicons name={icon as any} size={22} color={iconColor} />
          </View>
          <View style={styles.mealHeaderInfo}>
            <Text style={[styles.mealTitle, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.mealCalories, { color: colors.textSecondary }]}>
              {items.reduce((sum, item) => sum + item.calories, 0)} calories
            </Text>
          </View>
        </View>
        
        <View style={styles.foodList}>
          {items.map((item, index) => (
            <View 
              key={item.id} 
              style={[
                styles.foodItem, 
                { backgroundColor: isDarkMode ? '#1a1a2e' : '#f8fafc' },
                index === items.length - 1 && styles.foodItemLast
              ]}
            >
              <View style={styles.foodItemLeft}>
                <Text style={[styles.foodName, { color: colors.text }]}>
                  {language === 'ta' && item.nameTamil ? item.nameTamil : item.name}
                </Text>
                {language === 'ta' && item.nameTamil && (
                  <Text style={[styles.foodNameTamil, { color: colors.textSecondary }]}>{item.name}</Text>
                )}
                {language === 'en' && item.nameTamil && (
                  <Text style={[styles.foodNameTamil, { color: colors.textSecondary }]}>{item.nameTamil}</Text>
                )}
              </View>
              <View style={styles.foodItemRight}>
                <Text style={[styles.foodQuantity, { color: colors.textSecondary }]}>{item.quantity}</Text>
                <Text style={styles.foodCalories}>{item.calories} {t('diet.calories').toLowerCase().slice(0, 3)}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('diet.title')}</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Recommended by your health coach
            </Text>
          </View>
          <View style={styles.headerRight}>
            <MaterialCommunityIcons name="food-variant" size={28} color="#f59e0b" />
          </View>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.content, isMobile && styles.contentMobile]}>
          
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#006dab" />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                {t('common.loading')}
              </Text>
            </View>
          ) : !dietPlan ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="food-off" size={64} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('diet.noPlan')}</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Your health coach hasn't assigned a diet plan for you yet. Check back later!
              </Text>
            </View>
          ) : (
            <>
              {/* Breakfast */}
              {renderMealSection(t('diet.breakfast'), breakfast, 'sunny', '#f59e0b', '#fef3c7')}

              {/* Lunch */}
              {renderMealSection(t('diet.lunch'), lunch, 'partly-sunny', '#98be4e', '#e8f5d6')}

              {/* Dinner */}
              {renderMealSection(t('diet.dinner'), dinner, 'moon', '#006dab', '#e0f2fe')}

              {/* Tips Section */}
              <View style={[styles.tipsCard, { backgroundColor: colors.cardBackground }]}>
                <View style={styles.tipsHeader}>
                  <Ionicons name="bulb" size={20} color="#f59e0b" />
                  <Text style={[styles.tipsTitle, { color: colors.text }]}>{t('diet.nutritionTips')}</Text>
                </View>
                <View style={styles.tipsList}>
                  <View style={styles.tipItem}>
                    <View style={[styles.tipDot, { backgroundColor: '#98be4e' }]} />
                    <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                      {t('diet.tip1')}
                    </Text>
                  </View>
                  <View style={styles.tipItem}>
                    <View style={[styles.tipDot, { backgroundColor: '#006dab' }]} />
                    <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                      {t('diet.tip2')}
                    </Text>
                  </View>
                  <View style={styles.tipItem}>
                    <View style={[styles.tipDot, { backgroundColor: '#f59e0b' }]} />
                    <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                      {t('diet.tip3')}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          )}

        </View>
      </ScrollView>

      <BottomNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // For mobile web browsers, use min-height with dvh (dynamic viewport height)
    ...(isWeb && {
      minHeight: '100dvh' as any,
      height: '100dvh' as any,
    }),
  },
  header: {
    paddingTop: isWeb ? 24 : 50,
    paddingBottom: 16,
    paddingHorizontal: isWeb ? 40 : 20,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  headerRight: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  content: {
    padding: isWeb ? 40 : 20,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  contentMobile: {
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    fontSize: 15,
    marginTop: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  totalCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  totalCardInfo: {
    gap: 2,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#006dab',
  },
  totalBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  totalBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#006dab',
  },
  mealSection: {
    marginBottom: 24,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  mealIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  mealHeaderInfo: {
    flex: 1,
  },
  mealTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  mealCalories: {
    fontSize: 13,
    marginTop: 2,
  },
  foodList: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  foodItemLast: {
    borderBottomWidth: 0,
  },
  foodItemLeft: {
    flex: 1,
  },
  foodName: {
    fontSize: 15,
    fontWeight: '600',
  },
  foodNameTamil: {
    fontSize: 12,
    marginTop: 3,
  },
  foodItemRight: {
    alignItems: 'flex-end',
  },
  foodQuantity: {
    fontSize: 12,
  },
  foodCalories: {
    fontSize: 14,
    fontWeight: '700',
    color: '#006dab',
    marginTop: 2,
  },
  tipsCard: {
    padding: 20,
    borderRadius: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  tipsList: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tipText: {
    fontSize: 14,
    flex: 1,
  },
});
