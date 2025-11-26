import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { 
  calculateNutrition, 
  foodCategories, 
  foodDatabase, 
  FoodItemData, 
  getFoodsByCategory, 
  mealTimes, 
  searchFoods 
} from '../../data/foodDatabase';

const isWeb = Platform.OS === 'web';

interface SelectedFood {
  food: FoodItemData;
  servingIndex: number;
  quantity: number;
}

export default function LogFoodScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;

  const [step, setStep] = useState<'meal' | 'category' | 'food' | 'quantity' | 'summary'>('meal');
  const [selectedMealTime, setSelectedMealTime] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedFoods, setSelectedFoods] = useState<SelectedFood[]>([]);
  const [currentFood, setCurrentFood] = useState<FoodItemData | null>(null);
  const [currentServingIndex, setCurrentServingIndex] = useState(0);
  const [currentQuantity, setCurrentQuantity] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const toastAnim = useRef(new Animated.Value(-100)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const showToast = (message: string, type: 'error' | 'success') => {
    setToast({ visible: true, message, type });
    Animated.spring(toastAnim, {
      toValue: 20,
      useNativeDriver: true,
    }).start();
    setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setToast({ visible: false, message: '', type: '' }));
    }, 3000);
  };

  const filteredFoods = useMemo(() => {
    if (searchQuery.trim()) {
      return searchFoods(searchQuery);
    }
    if (selectedCategory) {
      return getFoodsByCategory(selectedCategory);
    }
    return foodDatabase;
  }, [searchQuery, selectedCategory]);

  const currentMealLabel = mealTimes.find(m => m.id === selectedMealTime)?.label || '';

  const totalNutrition = useMemo(() => {
    return selectedFoods.reduce(
      (acc, item) => {
        const grams = item.food.commonServings[item.servingIndex].grams * item.quantity;
        const nutrition = calculateNutrition(item.food, grams);
        return {
          calories: acc.calories + nutrition.calories,
          protein: acc.protein + nutrition.protein,
          carbs: acc.carbs + nutrition.carbs,
          fat: acc.fat + nutrition.fat,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [selectedFoods]);

  const handleSelectMealTime = (id: string) => {
    setSelectedMealTime(id);
    setStep('category');
  };

  const handleSelectCategory = (id: string) => {
    setSelectedCategory(id);
    setStep('food');
  };

  const handleSelectFood = (food: FoodItemData) => {
    setCurrentFood(food);
    setCurrentServingIndex(0);
    setCurrentQuantity(1);
    setStep('quantity');
  };

  const handleAddFood = () => {
    if (!currentFood) return;
    
    setSelectedFoods(prev => [
      ...prev,
      {
        food: currentFood,
        servingIndex: currentServingIndex,
        quantity: currentQuantity,
      },
    ]);
    
    setCurrentFood(null);
    setStep('food');
    showToast(`${currentFood.name} added!`, 'success');
  };

  const handleRemoveFood = (index: number) => {
    setSelectedFoods(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveLog = () => {
    if (selectedFoods.length === 0) {
      showToast('Please add at least one food item', 'error');
      return;
    }
    
    // Here you would save to backend/storage
    showToast('Meal logged successfully!', 'success');
    setTimeout(() => {
      router.back();
    }, 1500);
  };

  const handleBack = () => {
    if (step === 'summary') {
      setStep('food');
    } else if (step === 'quantity') {
      setCurrentFood(null);
      setStep('food');
    } else if (step === 'food') {
      setSelectedCategory(null);
      setSearchQuery('');
      setStep('category');
    } else if (step === 'category') {
      setSelectedMealTime(null);
      setStep('meal');
    } else {
      router.back();
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={handleBack} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#0f172a" />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>Log Food</Text>
        {selectedMealTime && (
          <Text style={styles.headerSubtitle}>{currentMealLabel}</Text>
        )}
      </View>
      {selectedFoods.length > 0 && step !== 'summary' && (
        <TouchableOpacity 
          style={styles.cartButton}
          onPress={() => setStep('summary')}
        >
          <Ionicons name="cart" size={22} color="#006dab" />
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{selectedFoods.length}</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderMealTimeSelection = () => (
    <View style={styles.content}>
      <Text style={styles.stepTitle}>Select Meal Time</Text>
      <Text style={styles.stepDescription}>
        When did you have this meal?
      </Text>
      <View style={styles.mealTimeGrid}>
        {mealTimes.map((meal) => (
          <TouchableOpacity
            key={meal.id}
            style={[
              styles.mealTimeCard,
              selectedMealTime === meal.id && styles.mealTimeCardSelected,
            ]}
            onPress={() => handleSelectMealTime(meal.id)}
            activeOpacity={0.7}
          >
            <View style={styles.mealTimeIcon}>
              <Ionicons name={meal.icon as any} size={28} color="#006dab" />
            </View>
            <Text style={styles.mealTimeLabel}>{meal.label}</Text>
            <Text style={styles.mealTimeRange}>{meal.time}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderCategorySelection = () => (
    <View style={styles.content}>
      <Text style={styles.stepTitle}>Select Category</Text>
      <Text style={styles.stepDescription}>
        What type of food did you have?
      </Text>
      <View style={styles.categoryGrid}>
        {foodCategories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={styles.categoryCard}
            onPress={() => handleSelectCategory(category.id)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#006dab', '#005a8f']}
              style={styles.categoryIconContainer}
            >
              <MaterialCommunityIcons name={category.icon as any} size={28} color="#fff" />
            </LinearGradient>
            <Text style={styles.categoryLabel}>{category.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderFoodSelection = () => (
    <View style={styles.content}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search foods..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        style={styles.foodList}
        showsVerticalScrollIndicator={false}
      >
        {filteredFoods.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color="#94a3b8" />
            <Text style={styles.emptyStateText}>No foods found</Text>
            <Text style={styles.emptyStateSubtext}>
              Try searching with a different term
            </Text>
          </View>
        ) : (
          filteredFoods.map((food) => (
            <TouchableOpacity
              key={food.id}
              style={styles.foodCard}
              onPress={() => handleSelectFood(food)}
              activeOpacity={0.7}
            >
              <View style={styles.foodInfo}>
                <Text style={styles.foodName}>{food.name}</Text>
                <Text style={styles.foodNameTamil}>{food.nameTamil}</Text>
                <Text style={styles.foodCalories}>
                  {food.caloriesPer100g} cal/100g • {food.subCategory}
                </Text>
              </View>
              <Ionicons name="add-circle" size={28} color="#006dab" />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );

  const renderQuantitySelection = () => {
    if (!currentFood) return null;

    const selectedServing = currentFood.commonServings[currentServingIndex];
    const totalGrams = selectedServing.grams * currentQuantity;
    const nutrition = calculateNutrition(currentFood, totalGrams);

    return (
      <View style={styles.content}>
        <View style={styles.selectedFoodHeader}>
          <Text style={styles.selectedFoodName}>{currentFood.name}</Text>
          <Text style={styles.selectedFoodTamil}>{currentFood.nameTamil}</Text>
        </View>

        <View style={styles.servingSection}>
          <Text style={styles.sectionLabel}>Serving Size</Text>
          <View style={styles.servingOptions}>
            {currentFood.commonServings.map((serving, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.servingOption,
                  currentServingIndex === index && styles.servingOptionSelected,
                ]}
                onPress={() => setCurrentServingIndex(index)}
              >
                <Text
                  style={[
                    styles.servingOptionText,
                    currentServingIndex === index && styles.servingOptionTextSelected,
                  ]}
                >
                  {serving.label}
                </Text>
                <Text
                  style={[
                    styles.servingOptionGrams,
                    currentServingIndex === index && styles.servingOptionTextSelected,
                  ]}
                >
                  ({serving.grams}g)
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.quantitySection}>
          <Text style={styles.sectionLabel}>Quantity</Text>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setCurrentQuantity(Math.max(1, currentQuantity - 1))}
            >
              <Ionicons name="remove" size={24} color="#006dab" />
            </TouchableOpacity>
            <Text style={styles.quantityValue}>{currentQuantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setCurrentQuantity(currentQuantity + 1)}
            >
              <Ionicons name="add" size={24} color="#006dab" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.nutritionCard}>
          <Text style={styles.nutritionTitle}>Nutrition Info</Text>
          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{nutrition.calories}</Text>
              <Text style={styles.nutritionLabel}>Calories</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{nutrition.protein}g</Text>
              <Text style={styles.nutritionLabel}>Protein</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{nutrition.carbs}g</Text>
              <Text style={styles.nutritionLabel}>Carbs</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{nutrition.fat}g</Text>
              <Text style={styles.nutritionLabel}>Fat</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddFood}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#22c55e', '#16a34a']}
            style={styles.addButtonGradient}
          >
            <Ionicons name="add" size={24} color="#fff" />
            <Text style={styles.addButtonText}>Add to Meal</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSummary = () => (
    <View style={styles.content}>
      <Text style={styles.stepTitle}>Meal Summary</Text>
      <Text style={styles.stepDescription}>
        {currentMealLabel} • {new Date().toLocaleDateString()}
      </Text>

      <ScrollView style={styles.summaryList}>
        {selectedFoods.map((item, index) => {
          const grams = item.food.commonServings[item.servingIndex].grams * item.quantity;
          const nutrition = calculateNutrition(item.food, grams);
          return (
            <View key={index} style={styles.summaryItem}>
              <View style={styles.summaryItemInfo}>
                <Text style={styles.summaryItemName}>{item.food.name}</Text>
                <Text style={styles.summaryItemServing}>
                  {item.quantity} × {item.food.commonServings[item.servingIndex].label}
                </Text>
                <Text style={styles.summaryItemCalories}>
                  {nutrition.calories} cal
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveFood(index)}
                style={styles.removeButton}
              >
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.totalCard}>
        <Text style={styles.totalTitle}>Total Nutrition</Text>
        <View style={styles.totalGrid}>
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>{totalNutrition.calories}</Text>
            <Text style={styles.totalLabel}>Calories</Text>
          </View>
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>{totalNutrition.protein.toFixed(1)}g</Text>
            <Text style={styles.totalLabel}>Protein</Text>
          </View>
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>{totalNutrition.carbs.toFixed(1)}g</Text>
            <Text style={styles.totalLabel}>Carbs</Text>
          </View>
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>{totalNutrition.fat.toFixed(1)}g</Text>
            <Text style={styles.totalLabel}>Fat</Text>
          </View>
        </View>
      </View>

      <View style={styles.summaryActions}>
        <TouchableOpacity
          style={styles.addMoreButton}
          onPress={() => setStep('food')}
        >
          <Ionicons name="add" size={20} color="#006dab" />
          <Text style={styles.addMoreButtonText}>Add More</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveLog}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#006dab', '#005a8f']}
            style={styles.saveButtonGradient}
          >
            <Text style={styles.saveButtonText}>Save Meal</Text>
            <Ionicons name="checkmark" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {toast.visible && (
        <Animated.View
          style={[
            styles.toast,
            toast.type === 'error' ? styles.toastError : styles.toastSuccess,
            { transform: [{ translateY: toastAnim }] },
          ]}
        >
          <View style={styles.toastContent}>
            <Text style={styles.toastIcon}>{toast.type === 'error' ? '✗' : '✓'}</Text>
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}

      {renderHeader()}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {step === 'meal' && renderMealTimeSelection()}
        {step === 'category' && renderCategorySelection()}
        {step === 'food' && renderFoodSelection()}
        {step === 'quantity' && renderQuantitySelection()}
        {step === 'summary' && renderSummary()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  toast: {
    position: 'absolute',
    top: 0,
    left: isWeb ? undefined : 16,
    right: isWeb ? 20 : 16,
    zIndex: 1000,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxWidth: isWeb ? 320 : undefined,
    borderLeftWidth: 4,
  },
  toastError: { borderLeftColor: '#ef4444' },
  toastSuccess: { borderLeftColor: '#98be4e' },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toastIcon: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  toastText: { color: '#1e293b', fontSize: 14, fontWeight: '600', flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingTop: isWeb ? 20 : 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  cartButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  content: {
    padding: isWeb ? 40 : 20,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 24,
  },
  mealTimeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mealTimeCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  mealTimeCardSelected: {
    borderColor: '#006dab',
    backgroundColor: '#eff6ff',
  },
  mealTimeIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  mealTimeLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  mealTimeRange: {
    fontSize: 12,
    color: '#64748b',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#0f172a',
  },
  foodList: {
    flex: 1,
  },
  foodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  foodNameTamil: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  foodCalories: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  selectedFoodHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  selectedFoodName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  selectedFoodTamil: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4,
  },
  servingSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  servingOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  servingOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  servingOptionSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#006dab',
  },
  servingOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  servingOptionGrams: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  servingOptionTextSelected: {
    color: '#006dab',
  },
  quantitySection: {
    marginBottom: 24,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  quantityButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#006dab',
  },
  quantityValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0f172a',
    minWidth: 60,
    textAlign: 'center',
  },
  nutritionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  nutritionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
    textAlign: 'center',
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#006dab',
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  addButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  summaryList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryItemInfo: {
    flex: 1,
  },
  summaryItemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  summaryItemServing: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  summaryItemCalories: {
    fontSize: 14,
    fontWeight: '600',
    color: '#006dab',
    marginTop: 4,
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalCard: {
    backgroundColor: '#006dab',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  totalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  totalGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  totalItem: {
    alignItems: 'center',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  totalLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  summaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  addMoreButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#006dab',
    gap: 8,
  },
  addMoreButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#006dab',
  },
  saveButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#006dab',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
