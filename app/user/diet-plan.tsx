import BottomNavBar from '@/components/navigation/BottomNavBar';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';

const isWeb = Platform.OS === 'web';

export default function DietPlanScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const { colors, isDarkMode } = useTheme();

  // Mock diet recommendations from admin
  const dietRecommendations = {
    breakfast: [
      { id: '1', name: 'Idli', nameTamil: 'இட்லி', calories: 39, quantity: '2 pieces' },
      { id: '2', name: 'Sambar', nameTamil: 'சாம்பார்', calories: 65, quantity: '1 cup' },
      { id: '3', name: 'Coconut Chutney', nameTamil: 'தேங்காய் சட்னி', calories: 45, quantity: '2 tbsp' },
    ],
    lunch: [
      { id: '4', name: 'Rice', nameTamil: 'சாதம்', calories: 130, quantity: '1 cup' },
      { id: '5', name: 'Dal Curry', nameTamil: 'பருப்பு குழம்பு', calories: 104, quantity: '1 cup' },
      { id: '6', name: 'Mixed Vegetable Curry', nameTamil: 'காய்கறி கூட்டு', calories: 85, quantity: '1 cup' },
      { id: '7', name: 'Buttermilk', nameTamil: 'மோர்', calories: 40, quantity: '1 glass' },
    ],
    dinner: [
      { id: '8', name: 'Chapati', nameTamil: 'சப்பாத்தி', calories: 71, quantity: '2 pieces' },
      { id: '9', name: 'Paneer Curry', nameTamil: 'பனீர் கறி', calories: 145, quantity: '1 cup' },
      { id: '10', name: 'Salad', nameTamil: 'சாலட்', calories: 35, quantity: '1 bowl' },
    ],
  };

  const totalCalories = 
    dietRecommendations.breakfast.reduce((sum, item) => sum + item.calories, 0) +
    dietRecommendations.lunch.reduce((sum, item) => sum + item.calories, 0) +
    dietRecommendations.dinner.reduce((sum, item) => sum + item.calories, 0);

  const renderMealSection = (
    title: string, 
    items: typeof dietRecommendations.breakfast, 
    icon: string, 
    iconColor: string,
    bgColor: string
  ) => (
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
              <Text style={[styles.foodName, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.foodNameTamil, { color: colors.textSecondary }]}>{item.nameTamil}</Text>
            </View>
            <View style={styles.foodItemRight}>
              <Text style={[styles.foodQuantity, { color: colors.textSecondary }]}>{item.quantity}</Text>
              <Text style={styles.foodCalories}>{item.calories} cal</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

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
            <Text style={[styles.headerTitle, { color: colors.text }]}>Today's Diet Plan</Text>
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
          
          {/* Total Calories Card */}
          <View style={[styles.totalCard, { backgroundColor: isDarkMode ? '#1a2d3d' : '#e0f2fe' }]}>
            <View style={styles.totalCardLeft}>
              <Ionicons name="flame" size={28} color="#006dab" />
              <View style={styles.totalCardInfo}>
                <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total Daily Calories</Text>
                <Text style={styles.totalValue}>{totalCalories} cal</Text>
              </View>
            </View>
            <View style={[styles.totalBadge, { backgroundColor: '#006dab15' }]}>
              <Text style={styles.totalBadgeText}>Balanced</Text>
            </View>
          </View>

          {/* Breakfast */}
          {renderMealSection('Breakfast', dietRecommendations.breakfast, 'sunny', '#f59e0b', '#fef3c7')}

          {/* Lunch */}
          {renderMealSection('Lunch', dietRecommendations.lunch, 'partly-sunny', '#98be4e', '#e8f5d6')}

          {/* Dinner */}
          {renderMealSection('Dinner', dietRecommendations.dinner, 'moon', '#006dab', '#e0f2fe')}

          {/* Tips Section */}
          <View style={[styles.tipsCard, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.tipsHeader}>
              <Ionicons name="bulb" size={20} color="#f59e0b" />
              <Text style={[styles.tipsTitle, { color: colors.text }]}>Nutrition Tips</Text>
            </View>
            <View style={styles.tipsList}>
              <View style={styles.tipItem}>
                <View style={[styles.tipDot, { backgroundColor: '#98be4e' }]} />
                <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                  Drink plenty of water between meals
                </Text>
              </View>
              <View style={styles.tipItem}>
                <View style={[styles.tipDot, { backgroundColor: '#006dab' }]} />
                <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                  Eat slowly and chew your food thoroughly
                </Text>
              </View>
              <View style={styles.tipItem}>
                <View style={[styles.tipDot, { backgroundColor: '#f59e0b' }]} />
                <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                  Avoid heavy meals close to bedtime
                </Text>
              </View>
            </View>
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
