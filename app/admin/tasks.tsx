import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { foodDatabase, FoodItemData } from '../../data/foodDatabase';
import { coupleService, DietPlanFood, dietPlanService, globalSettingsService } from '../../services/firestore.service';

// Extended food type with quantity for diet recommendations
interface DietFoodItem extends FoodItemData {
  servingIndex: number;  // Index in commonServings array
  servingCount: number;  // Number of servings (e.g., 2 pieces)
}

// Fit for Baby Color Palette
const COLORS = {
  primary: '#006dab',
  primaryDark: '#005a8f',
  primaryLight: '#0088d4',
  accent: '#98be4e',
  accentDark: '#7da33e',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  background: '#f8fafc',
  surface: '#ffffff',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
};

interface Goal {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconFamily: 'Ionicons' | 'MaterialCommunityIcons';
  value: number;
  unit: string;
  min: number;
  max: number;
  color: string;
}

// Default global goals
const defaultGoals: Goal[] = [
  {
    id: 'daily-steps',
    title: 'Daily Step Target',
    description: 'Target number of steps per day',
    icon: 'walk',
    iconFamily: 'MaterialCommunityIcons',
    value: 7000,
    unit: 'steps',
    min: 3000,
    max: 15000,
    color: COLORS.success,
  },
  {
    id: 'couple-walking',
    title: 'Daily Couple Walking',
    description: 'Minutes of walking together daily',
    icon: 'people',
    iconFamily: 'Ionicons',
    value: 60,
    unit: 'mins/day',
    min: 15,
    max: 120,
    color: COLORS.primary,
  },
  {
    id: 'high-knees',
    title: 'Daily High Knees',
    description: 'High knees exercise duration daily',
    icon: 'run-fast',
    iconFamily: 'MaterialCommunityIcons',
    value: 30,
    unit: 'mins/day',
    min: 10,
    max: 60,
    color: COLORS.error,
  },
  {
    id: 'daily-calories',
    title: 'Daily Calories Burnt',
    description: 'Target calories to burn per day',
    icon: 'flame',
    iconFamily: 'Ionicons',
    value: 200,
    unit: 'kcal/day',
    min: 100,
    max: 1000,
    color: COLORS.warning,
  },
];

export default function AdminTasksScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const toastAnim = useRef(new Animated.Value(-100)).current;

  const [goals, setGoals] = useState(defaultGoals);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingGoals, setIsSavingGoals] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });

  // Diet Recommendations state
  const [dietUserSearch, setDietUserSearch] = useState('');
  const [selectedDietUser, setSelectedDietUser] = useState<{ id: string; name: string } | null>(null);
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [activeMealType, setActiveMealType] = useState<'breakfast' | 'lunch' | 'dinner'>('breakfast');
  const [foodSearch, setFoodSearch] = useState('');
  const [isSavingDiet, setIsSavingDiet] = useState(false);
  const [isLoadingDietPlan, setIsLoadingDietPlan] = useState(false);
  const [dietRecommendations, setDietRecommendations] = useState<{
    breakfast: DietFoodItem[];
    lunch: DietFoodItem[];
    dinner: DietFoodItem[];
  }>({
    breakfast: [],
    lunch: [],
    dinner: [],
  });

  // Couples list for diet recommendation
  const [couplesList, setCouplesList] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingCouples, setIsLoadingCouples] = useState(true);

  // Load couples from Firestore
  useEffect(() => {
    const loadCouples = async () => {
      try {
        setIsLoadingCouples(true);
        const couples = await coupleService.getAll();
        const formattedCouples = couples.map((couple: any) => ({
          id: couple.coupleId || couple.id,
          name: `${couple.male?.name || 'Male'} & ${couple.female?.name || 'Female'}`,
        }));
        setCouplesList(formattedCouples);
      } catch (error) {
        console.error('Error loading couples:', error);
      } finally {
        setIsLoadingCouples(false);
      }
    };
    loadCouples();
  }, []);

  // Load global settings from Firestore on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoadingSettings(true);
        const settings = await globalSettingsService.get();
        
        // Update goals with Firestore values
        setGoals(prev => prev.map(goal => {
          switch (goal.id) {
            case 'daily-steps':
              return { ...goal, value: settings.dailySteps || goal.value };
            case 'couple-walking':
              return { ...goal, value: settings.coupleWalkingMinutes || goal.value };
            case 'high-knees':
              return { ...goal, value: settings.highKneesMinutes || goal.value };
            case 'daily-calories':
              return { ...goal, value: settings.dailyCaloriesBurnt || goal.value };
            default:
              return goal;
          }
        }));
      } catch (error) {
        console.error('Error loading global settings:', error);
        showToast('Failed to load settings', 'error');
      } finally {
        setIsLoadingSettings(false);
      }
    };

    loadSettings();
  }, []);

  // Load existing diet plan when user is selected
  useEffect(() => {
    const loadDietPlan = async () => {
      if (!selectedDietUser) return;
      
      try {
        setIsLoadingDietPlan(true);
        const existingPlan = await dietPlanService.get(selectedDietUser.id);
        
        if (existingPlan) {
          // Convert DietPlanFood[] to DietFoodItem[] by finding matching foods
          const mapToDietFoodItem = (foods: DietPlanFood[]): DietFoodItem[] => {
            return foods.map(f => {
              const fullFood = foodDatabase.find(fd => fd.id === f.id);
              if (fullFood) {
                // Validate servingIndex - make sure it points to a valid (non-Custom) serving
                let servingIndex = f.servingIndex ?? 0;
                const serving = fullFood.commonServings[servingIndex];
                if (!serving || serving.label === 'Custom' || serving.grams === 0) {
                  // Find first valid serving
                  servingIndex = fullFood.commonServings.findIndex(s => s.label !== 'Custom' && s.grams > 0);
                  if (servingIndex < 0) servingIndex = 0;
                }
                
                return {
                  ...fullFood,
                  servingIndex,
                  servingCount: f.servingCount ?? 1,
                };
              }
              // Fallback if food not found in database
              return {
                id: f.id,
                name: f.name,
                nameTamil: f.nameTamil,
                caloriesPer100g: f.caloriesPer100g,
                proteinPer100g: f.proteinPer100g,
                carbsPer100g: f.carbsPer100g,
                fatPer100g: f.fatPer100g,
                category: f.category as any,
                subCategory: '',
                isCustom: false,
                mealTimes: [],
                commonServings: [{ label: 'serving', grams: 100 }],
                defaultServingSize: 100,
                servingUnit: 'g',
                servingIndex: 0,
                servingCount: f.servingCount ?? 1,
              } as DietFoodItem;
            });
          };
          
          setDietRecommendations({
            breakfast: mapToDietFoodItem(existingPlan.breakfast || []),
            lunch: mapToDietFoodItem(existingPlan.lunch || []),
            dinner: mapToDietFoodItem(existingPlan.dinner || []),
          });
        } else {
          // No existing plan, clear
          setDietRecommendations({ breakfast: [], lunch: [], dinner: [] });
        }
      } catch (error) {
        console.error('Error loading diet plan:', error);
      } finally {
        setIsLoadingDietPlan(false);
      }
    };
    
    loadDietPlan();
  }, [selectedDietUser]);

  const filteredUsers = couplesList.filter(user =>
    user.name.toLowerCase().includes(dietUserSearch.toLowerCase()) ||
    user.id.toLowerCase().includes(dietUserSearch.toLowerCase())
  );

  const filteredFoods = foodDatabase.filter(food =>
    food.name.toLowerCase().includes(foodSearch.toLowerCase()) ||
    food.nameTamil.toLowerCase().includes(foodSearch.toLowerCase())
  );

  // Helper to get valid servings (exclude Custom which has 0 grams)
  const getValidServings = (food: FoodItemData) => {
    return food.commonServings.filter(s => s.label !== 'Custom' && s.grams > 0);
  };

  const handleAddFood = (food: FoodItemData) => {
    // Find first valid serving (not Custom)
    const validServings = getValidServings(food);
    const firstValidIndex = food.commonServings.findIndex(s => s.label !== 'Custom' && s.grams > 0);
    
    const foodWithServing: DietFoodItem = {
      ...food,
      servingIndex: firstValidIndex >= 0 ? firstValidIndex : 0,
      servingCount: 1,
    };
    setDietRecommendations(prev => ({
      ...prev,
      [activeMealType]: [...prev[activeMealType], foodWithServing],
    }));
    setShowFoodModal(false);
    setFoodSearch('');
  };

  const handleUpdateServingCount = (mealType: 'breakfast' | 'lunch' | 'dinner', foodId: string, delta: number) => {
    setDietRecommendations(prev => ({
      ...prev,
      [mealType]: prev[mealType].map(f => {
        if (f.id === foodId) {
          const newCount = Math.max(1, f.servingCount + delta);
          const maxCount = f.maxServingCount || 10;
          return { ...f, servingCount: Math.min(newCount, maxCount) };
        }
        return f;
      }),
    }));
  };

  const handleUpdateServingIndex = (mealType: 'breakfast' | 'lunch' | 'dinner', foodId: string, servingIndex: number) => {
    setDietRecommendations(prev => ({
      ...prev,
      [mealType]: prev[mealType].map(f => f.id === foodId ? { ...f, servingIndex } : f),
    }));
  };

  const handleRemoveFood = (mealType: 'breakfast' | 'lunch' | 'dinner', foodId: string) => {
    setDietRecommendations(prev => ({
      ...prev,
      [mealType]: prev[mealType].filter(f => f.id !== foodId),
    }));
  };

  // Helper to get serving label for display
  const getServingLabel = (food: DietFoodItem): string => {
    const serving = food.commonServings[food.servingIndex];
    if (!serving) return `${food.servingCount} serving`;
    return `${food.servingCount} × ${serving.label} (${serving.grams * food.servingCount}g)`;
  };

  const handleSaveDietRecommendation = async () => {
    if (!selectedDietUser) {
      showToast('Please select a user first', 'error');
      return;
    }
    if (dietRecommendations.breakfast.length === 0 && dietRecommendations.lunch.length === 0 && dietRecommendations.dinner.length === 0) {
      showToast('Please add at least one food item', 'error');
      return;
    }
    
    setIsSavingDiet(true);
    try {
      // Get admin info from AsyncStorage
      const adminId = await AsyncStorage.getItem('adminId') || 'unknown';
      const adminName = await AsyncStorage.getItem('adminName') || 'Admin';
      
      // Convert DietFoodItem to DietPlanFood with proper quantity string
      const toDietPlanFood = (foods: DietFoodItem[]): DietPlanFood[] => {
        return foods.map(f => {
          const serving = f.commonServings[f.servingIndex];
          // Ensure we have valid serving info (not Custom)
          const isValidServing = serving && serving.label !== 'Custom' && serving.grams > 0;
          const servingLabel = isValidServing ? serving.label : `${f.defaultServingSize}g`;
          const gramsPerServing = isValidServing ? serving.grams : f.defaultServingSize;
          const totalGrams = gramsPerServing * f.servingCount;
          
          const quantity = `${f.servingCount} ${servingLabel} (${totalGrams}g)`;
          
          return {
            id: f.id,
            name: f.name,
            nameTamil: f.nameTamil,
            caloriesPer100g: f.caloriesPer100g,
            proteinPer100g: f.proteinPer100g,
            carbsPer100g: f.carbsPer100g,
            fatPer100g: f.fatPer100g,
            category: f.category,
            quantity,
            servingIndex: f.servingIndex,
            servingCount: f.servingCount,
          };
        });
      };
      
      await dietPlanService.save(selectedDietUser.id, {
        breakfast: toDietPlanFood(dietRecommendations.breakfast),
        lunch: toDietPlanFood(dietRecommendations.lunch),
        dinner: toDietPlanFood(dietRecommendations.dinner),
        createdBy: adminId,
        createdByName: adminName,
      });
      
      showToast(`Diet plan saved for ${selectedDietUser.name}!`, 'success');
      // Reset after save
      setDietRecommendations({ breakfast: [], lunch: [], dinner: [] });
      setSelectedDietUser(null);
      setDietUserSearch('');
    } catch (error) {
      console.error('Error saving diet plan:', error);
      showToast('Failed to save diet plan', 'error');
    } finally {
      setIsSavingDiet(false);
    }
  };

  // Data collection periods
  const [collectionPeriods, setCollectionPeriods] = useState({
    dietLogging: { active: true, startDate: '2024-11-01', endDate: '2024-11-05' },
    exerciseFrequency: 'continuous' as 'continuous' | 'period',
    weightTracking: 'weekly' as 'weekly' | 'monthly',
  });

  const showToast = (message: string, type: 'error' | 'success') => {
    setToast({ visible: true, message, type });
    Animated.spring(toastAnim, { toValue: 20, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(toastAnim, { toValue: -100, duration: 300, useNativeDriver: true })
        .start(() => setToast({ visible: false, message: '', type: '' }));
    }, 2500);
  };

  const handleGoalChange = (goalId: string, newValue: number) => {
    setGoals(prev =>
      prev.map(goal =>
        goal.id === goalId
          ? { ...goal, value: Math.max(goal.min, Math.min(goal.max, newValue)) }
          : goal
      )
    );
  };

  const handleSaveGoals = async () => {
    try {
      setIsSavingGoals(true);
      
      // Get current goal values
      const dailySteps = goals.find(g => g.id === 'daily-steps')?.value || 7000;
      const coupleWalkingMinutes = goals.find(g => g.id === 'couple-walking')?.value || 60;
      const highKneesMinutes = goals.find(g => g.id === 'high-knees')?.value || 30;
      const dailyCaloriesBurnt = goals.find(g => g.id === 'daily-calories')?.value || 200;
      
      // Save to Firestore
      await globalSettingsService.saveGoals({
        dailySteps,
        coupleWalkingMinutes,
        highKneesMinutes,
        dailyCaloriesBurnt,
      });
      
      showToast('Goals updated successfully!', 'success');
    } catch (error) {
      console.error('Error saving goals:', error);
      showToast('Failed to save goals', 'error');
    } finally {
      setIsSavingGoals(false);
    }
  };

  const handleSaveCollectionPeriods = () => {
    showToast('Collection settings saved!', 'success');
  };

  // Header without tabs
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.headerTitle}>Tasks & Goals</Text>
          <Text style={styles.headerSubtitle}>Manage tasks and configure parameters</Text>
        </View>
      </View>
    </View>
  );

  // Study Configuration Section
  const renderConfigSection = () => (
    <View style={styles.section}>
      {/* Global Goals */}
      <View style={styles.configCard}>
        <View style={styles.configHeader}>
          <View style={styles.configHeaderLeft}>
            <Ionicons name="flag" size={22} color={COLORS.primary} />
            <Text style={styles.configTitle}>Global Goal Settings</Text>
          </View>
          <TouchableOpacity 
            style={[styles.saveButton, isSavingGoals && styles.saveButtonDisabled]} 
            onPress={handleSaveGoals}
            disabled={isSavingGoals}
          >
            {isSavingGoals ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.saveButtonText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {isLoadingSettings ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading settings...</Text>
          </View>
        ) : (
        <View style={styles.goalsContainer}>
          {goals.map(goal => (
            <View key={goal.id} style={styles.goalItem}>
              <View style={styles.goalHeader}>
                <View style={[styles.goalIcon, { backgroundColor: goal.color + '15' }]}>
                  {goal.iconFamily === 'Ionicons' ? (
                    <Ionicons name={goal.icon as any} size={20} color={goal.color} />
                  ) : (
                    <MaterialCommunityIcons name={goal.icon as any} size={20} color={goal.color} />
                  )}
                </View>
                <View style={styles.goalInfo}>
                  <Text style={styles.goalTitle}>{goal.title}</Text>
                  <Text style={styles.goalDescription}>{goal.description}</Text>
                </View>
              </View>

              <View style={styles.goalInputContainer}>
                <TouchableOpacity
                  style={styles.goalButton}
                  onPress={() => handleGoalChange(goal.id, goal.value - (goal.id.includes('steps') ? 500 : 5))}
                >
                  <Ionicons name="remove" size={20} color={COLORS.primary} />
                </TouchableOpacity>
                <View style={styles.goalValueContainer}>
                  <Text style={styles.goalValue}>{goal.value}</Text>
                  <Text style={styles.goalUnit}>{goal.unit}</Text>
                </View>
                <TouchableOpacity
                  style={styles.goalButton}
                  onPress={() => handleGoalChange(goal.id, goal.value + (goal.id.includes('steps') ? 500 : 5))}
                >
                  <Ionicons name="add" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              {/* Preset Values */}
              {goal.id === 'daily-steps' && (
                <View style={styles.presetContainer}>
                  {[3000, 5000, 7000, 10000].map(preset => (
                    <TouchableOpacity
                      key={preset}
                      style={[styles.presetChip, goal.value === preset && styles.presetChipActive]}
                      onPress={() => handleGoalChange(goal.id, preset)}
                    >
                      <Text style={[styles.presetText, goal.value === preset && styles.presetTextActive]}>
                        {preset / 1000}k
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
        )}
      </View>

      {/* Diet Recommendations - Individual User */}
      <View style={styles.configCard}>
        <View style={styles.configHeader}>
          <View style={styles.configHeaderLeft}>
            <MaterialCommunityIcons name="food-variant" size={22} color={COLORS.accent} />
            <Text style={styles.configTitle}>Diet Recommendations</Text>
          </View>
          <TouchableOpacity 
            style={[styles.saveButton, isSavingDiet && styles.saveButtonDisabled]} 
            onPress={handleSaveDietRecommendation}
            disabled={isSavingDiet}
          >
            {isSavingDiet ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.saveButtonText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* User Search */}
        <View style={styles.dietUserSection}>
          <Text style={styles.dietSectionLabel}>Select Couple (by Name or ID)</Text>
          {isLoadingCouples ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading couples...</Text>
            </View>
          ) : (
          <View style={styles.userSearchContainer}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.userSearchInput}
              placeholder="Search couple by name or ID..."
              placeholderTextColor={COLORS.textMuted}
              value={dietUserSearch}
              onChangeText={setDietUserSearch}
            />
            {dietUserSearch.length > 0 && (
              <TouchableOpacity onPress={() => { setDietUserSearch(''); setSelectedDietUser(null); }}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          )}

          {/* User Suggestions */}
          {dietUserSearch.length > 0 && !selectedDietUser && (
            <View style={styles.userSuggestions}>
              {filteredUsers.map(user => (
                <TouchableOpacity
                  key={user.id}
                  style={styles.userSuggestionItem}
                  onPress={() => {
                    setSelectedDietUser(user);
                    setDietUserSearch(user.name);
                  }}
                >
                  <View style={styles.userAvatar}>
                    <Ionicons name="people" size={16} color={COLORS.primary} />
                  </View>
                  <View style={styles.userSuggestionInfo}>
                    <Text style={styles.userSuggestionName}>{user.name}</Text>
                    <Text style={styles.userSuggestionId}>{user.id}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {filteredUsers.length === 0 && (
                <Text style={styles.noUsersText}>No users found</Text>
              )}
            </View>
          )}

          {/* Selected User Badge */}
          {selectedDietUser && (
            <View style={styles.selectedUserBadge}>
              <Ionicons name="people" size={16} color={COLORS.primary} />
              <Text style={styles.selectedUserText}>{selectedDietUser.name} ({selectedDietUser.id})</Text>
              <TouchableOpacity onPress={() => { setSelectedDietUser(null); setDietUserSearch(''); setDietRecommendations({ breakfast: [], lunch: [], dinner: [] }); }}>
                <Ionicons name="close" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Meal Sections */}
        {selectedDietUser && (
          isLoadingDietPlan ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading existing diet plan...</Text>
            </View>
          ) : (
          <View style={styles.mealSections}>
            {(['breakfast', 'lunch', 'dinner'] as const).map(mealType => (
              <View key={mealType} style={styles.mealSection}>
                <View style={styles.mealHeader}>
                  <View style={styles.mealHeaderLeft}>
                    <MaterialCommunityIcons
                      name={mealType === 'breakfast' ? 'weather-sunny' : mealType === 'lunch' ? 'weather-partly-cloudy' : 'weather-night'}
                      size={20}
                      color={mealType === 'breakfast' ? COLORS.warning : mealType === 'lunch' ? COLORS.accent : COLORS.info}
                    />
                    <Text style={styles.mealTitle}>
                      {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                    </Text>
                    <Text style={styles.mealCount}>
                      ({dietRecommendations[mealType].length} items)
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addFoodButton}
                    onPress={() => {
                      setActiveMealType(mealType);
                      setShowFoodModal(true);
                    }}
                  >
                    <Ionicons name="add" size={18} color={COLORS.primary} />
                    <Text style={styles.addFoodText}>Add Food</Text>
                  </TouchableOpacity>
                </View>

                {/* Food Items for this meal */}
                <View style={styles.mealFoodList}>
                  {dietRecommendations[mealType].length === 0 ? (
                    <Text style={styles.noFoodText}>No food items added</Text>
                  ) : (
                    dietRecommendations[mealType].map(food => {
                      const serving = food.commonServings[food.servingIndex];
                      // If Custom or invalid serving, use first valid serving's grams
                      const isValidServing = serving && serving.label !== 'Custom' && serving.grams > 0;
                      const totalGrams = isValidServing 
                        ? serving.grams * food.servingCount 
                        : food.defaultServingSize * food.servingCount;
                      
                      // Get valid servings (exclude Custom)
                      const validServings = food.commonServings
                        .map((s, idx) => ({ ...s, originalIndex: idx }))
                        .filter(s => s.label !== 'Custom' && s.grams > 0);
                      
                      return (
                        <View key={food.id} style={styles.foodItemCard}>
                          {/* Food Name and Delete */}
                          <View style={styles.foodItemHeader}>
                            <View style={styles.foodItemInfo}>
                              <Text style={styles.foodItemName}>{food.name}</Text>
                              <Text style={styles.foodItemNameTamil}>{food.nameTamil}</Text>
                            </View>
                            <TouchableOpacity
                              style={styles.removeFoodButton}
                              onPress={() => handleRemoveFood(mealType, food.id)}
                            >
                              <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                            </TouchableOpacity>
                          </View>
                          
                          {/* Serving Size Selection - Only valid servings */}
                          <View style={styles.servingSelector}>
                            <Text style={styles.servingSelectorLabel}>Serving:</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.servingChipsContainer}>
                              {validServings.map((s) => (
                                <TouchableOpacity
                                  key={s.originalIndex}
                                  style={[
                                    styles.servingChip,
                                    food.servingIndex === s.originalIndex && styles.servingChipActive,
                                  ]}
                                  onPress={() => handleUpdateServingIndex(mealType, food.id, s.originalIndex)}
                                >
                                  <Text style={[
                                    styles.servingChipText,
                                    food.servingIndex === s.originalIndex && styles.servingChipTextActive,
                                  ]}>
                                    {s.label} ({s.grams}g)
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </View>
                          
                          {/* Quantity with +/- buttons */}
                          <View style={styles.quantityRow}>
                            <Text style={styles.quantityLabel}>Quantity:</Text>
                            <View style={styles.quantityControls}>
                              <TouchableOpacity
                                style={styles.quantityButton}
                                onPress={() => handleUpdateServingCount(mealType, food.id, -1)}
                              >
                                <Ionicons name="remove" size={18} color={COLORS.primary} />
                              </TouchableOpacity>
                              <Text style={styles.quantityValue}>{food.servingCount}</Text>
                              <TouchableOpacity
                                style={styles.quantityButton}
                                onPress={() => handleUpdateServingCount(mealType, food.id, 1)}
                              >
                                <Ionicons name="add" size={18} color={COLORS.primary} />
                              </TouchableOpacity>
                            </View>
                            <Text style={styles.totalGrams}>{totalGrams}g total</Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            ))}
          </View>
          )
        )}
      </View>
    </View>
  );

  // Food Selection Modal
  const renderFoodModal = () => (
    <Modal
      visible={showFoodModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFoodModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.foodModalContent, isMobile && styles.foodModalContentMobile]}>
          <View style={styles.foodModalHeader}>
            <View>
              <Text style={styles.foodModalTitle}>
                Add Food to {activeMealType.charAt(0).toUpperCase() + activeMealType.slice(1)}
              </Text>
              <Text style={styles.foodModalSubtitle}>Search and select food items</Text>
            </View>
            <TouchableOpacity onPress={() => { setShowFoodModal(false); setFoodSearch(''); }}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.foodSearchContainer}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.foodSearchInput}
              placeholder="Search food by name..."
              placeholderTextColor={COLORS.textMuted}
              value={foodSearch}
              onChangeText={setFoodSearch}
            />
          </View>

          <ScrollView style={styles.foodList} showsVerticalScrollIndicator={false}>
            {filteredFoods.slice(0, 30).map(food => (
              <TouchableOpacity
                key={food.id}
                style={styles.foodListItem}
                onPress={() => handleAddFood(food)}
              >
                <View style={styles.foodListItemLeft}>
                  <View style={[styles.foodCategoryBadge, { backgroundColor: COLORS.primary + '15' }]}>
                    <MaterialCommunityIcons name="food" size={18} color={COLORS.primary} />
                  </View>
                  <View style={styles.foodListItemInfo}>
                    <Text style={styles.foodListItemName}>{food.name}</Text>
                    <Text style={styles.foodListItemTamil}>{food.nameTamil}</Text>
                    <View style={styles.foodListItemStats}>
                      <Text style={styles.foodListItemStat}>{food.caloriesPer100g} cal</Text>
                      <Text style={styles.foodListItemStat}>P: {food.proteinPer100g}g</Text>
                      <Text style={styles.foodListItemStat}>C: {food.carbsPer100g}g</Text>
                      <Text style={styles.foodListItemStat}>F: {food.fatPer100g}g</Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="add-circle" size={24} color={COLORS.accent} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Toast
  const renderToast = () => (
    <Animated.View
      style={[
        styles.toast,
        { transform: [{ translateY: toastAnim }] },
        toast.type === 'error' ? styles.toastError : styles.toastSuccess,
      ]}
    >
      <Ionicons
        name={toast.type === 'error' ? 'alert-circle' : 'checkmark-circle'}
        size={20}
        color="#fff"
      />
      <Text style={styles.toastText}>{toast.message}</Text>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}

      <ScrollView
        contentContainerStyle={[styles.scrollContent, !isMobile && styles.scrollContentDesktop]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.content, !isMobile && styles.contentDesktop]}>
          {renderConfigSection()}
        </View>
      </ScrollView>

      {renderFoodModal()}
      {toast.visible && renderToast()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  scrollContentDesktop: {
    paddingBottom: 40,
  },
  content: {
    padding: 16,
  },
  contentDesktop: {
    padding: 24,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },

  // Header Styles
  header: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTop: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.primary,
  },

  // Section Styles
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  // Category Grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 8,
  },
  categoryGridMobile: {
    gap: 12,
  },
  categoryCard: {
    flex: 1,
    minWidth: 250,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  categoryDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  categoryArrow: {
    position: 'absolute',
    top: 20,
    right: 20,
  },

  // Config Card
  configCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  configHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  configHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  configTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    minWidth: 80,
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.textMuted,
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },

  // Loading Styles
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  // Goals Styles
  goalsContainer: {
    gap: 20,
  },
  goalItem: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    paddingBottom: 20,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  goalIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalInfo: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  goalDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  goalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  goalButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalValueContainer: {
    alignItems: 'center',
    minWidth: 80,
  },
  goalValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary,
  },
  goalUnit: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  presetContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.borderLight,
  },
  presetChipActive: {
    backgroundColor: COLORS.primary,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  presetTextActive: {
    color: '#fff',
  },

  // Period Styles
  periodItem: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  periodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  periodTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  periodStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: COLORS.borderLight,
  },
  periodStatusActive: {
    backgroundColor: COLORS.success + '20',
  },
  periodStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  periodStatusTextActive: {
    color: COLORS.success,
  },
  dateInputsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInputGroup: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  dateInput: {
    backgroundColor: COLORS.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  toggleGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
  },
  toggleOptionActive: {
    backgroundColor: COLORS.primary + '15',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  toggleTextActive: {
    color: COLORS.primary,
  },
  savePeriodButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  savePeriodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalContentMobile: {
    maxHeight: '95%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  modalBody: {
    padding: 20,
  },
  formSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  audienceOptions: {
    gap: 8,
  },
  audienceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    backgroundColor: COLORS.borderLight,
    gap: 12,
  },
  audienceOptionActive: {
    backgroundColor: COLORS.primary + '10',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: COLORS.textMuted,
  },
  radioCircleActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  audienceText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  audienceTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: COLORS.borderLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginTop: 12,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  timingOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  timingOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    backgroundColor: COLORS.borderLight,
    gap: 8,
  },
  timingOptionActive: {
    backgroundColor: COLORS.primary + '10',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  timingText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  timingTextActive: {
    color: COLORS.primary,
  },
  uploadArea: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  uploadHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  goalSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    backgroundColor: COLORS.borderLight,
    marginBottom: 8,
    gap: 12,
  },
  goalSelectItemActive: {
    backgroundColor: COLORS.primary + '10',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  goalSelectIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalSelectInfo: {
    flex: 1,
  },
  goalSelectTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  goalSelectValue: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.borderLight,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Toast
  toast: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  toastSuccess: {
    backgroundColor: COLORS.success,
  },
  toastError: {
    backgroundColor: COLORS.error,
  },
  toastText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },

  // Diet Recommendations Styles
  dietUserSection: {
    marginBottom: 20,
  },
  dietSectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  userSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchIcon: {
    marginRight: 4,
  },
  userSearchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  userSuggestions: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 200,
  },
  userSuggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: 10,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userSuggestionInfo: {
    flex: 1,
  },
  userSuggestionName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  userSuggestionId: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  noUsersText: {
    padding: 12,
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  selectedUserBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
    gap: 8,
  },
  selectedUserText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  mealSections: {
    gap: 16,
  },
  mealSection: {
    backgroundColor: COLORS.borderLight,
    borderRadius: 12,
    padding: 14,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  mealHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  mealCount: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  addFoodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  addFoodText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  mealFoodList: {
    gap: 12,
  },
  noFoodText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },
  foodItemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  foodItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  foodItemInfo: {
    flex: 1,
  },
  foodItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  foodItemNameTamil: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  foodItemDetails: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  servingSelector: {
    marginBottom: 12,
  },
  servingSelectorLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  servingChipsContainer: {
    flexDirection: 'row',
  },
  servingChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  servingChipActive: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  servingChipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  servingChipTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quantityButton: {
    padding: 8,
    borderRadius: 6,
  },
  quantityValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    minWidth: 30,
    textAlign: 'center',
  },
  totalGrams: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
    marginLeft: 'auto',
  },
  removeFoodButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.error + '10',
  },

  // Food Modal Styles
  foodModalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  foodModalContentMobile: {
    width: '95%',
    maxHeight: '90%',
  },
  foodModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  foodModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  foodModalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  foodSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.borderLight,
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  foodSearchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  foodList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  foodListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    backgroundColor: COLORS.borderLight,
    marginBottom: 8,
  },
  foodListItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  foodCategoryBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodListItemInfo: {
    flex: 1,
  },
  foodListItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  foodListItemTamil: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  foodListItemStats: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  foodListItemStat: {
    fontSize: 11,
    color: COLORS.textMuted,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
