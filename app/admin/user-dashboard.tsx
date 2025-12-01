import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { CoupleWeightLog, coupleService, coupleWeightLogService } from '../../services/firestore.service';

const isWeb = Platform.OS === 'web';

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

// Exercise types matching log-exercise.tsx
interface ExerciseLog {
  id: string;
  date: string;
  exerciseType: string;
  exerciseName: string;
  nameTamil: string;
  duration: number; // in minutes
  intensity: 'light' | 'moderate' | 'vigorous';
  hardnessRank: number; // 1-10
  caloriesBurned: number;
  steps?: number;
  partnerParticipated: boolean;
  notes?: string;
}

interface MealLog {
  id: string;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foods: {
    name: string;
    nameTamil: string;
    quantity: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

interface UserData {
  id: string;
  name: string;
  gender: 'male' | 'female';
  age: number;
  weight: number;
  height: number;
  bmi: number;
  phone: string;
  email: string;
  status: 'Active' | 'Inactive';
  dateOfBirth?: string;
  lastWeightDate?: string;
}

// Mock exercise logs - keep for now until exercise logging is implemented
const mockExerciseLogs: Record<string, ExerciseLog[]> = {
  'C_001_M': [
    { id: 'ex1', date: '2024-11-28', exerciseType: 'couple-walking', exerciseName: 'Couple Walking', nameTamil: 'தம்பதிகள் நடைப்பயிற்சி', duration: 30, intensity: 'moderate', hardnessRank: 4, caloriesBurned: 120, steps: 3500, partnerParticipated: true, notes: 'Morning walk in the park' },
    { id: 'ex2', date: '2024-11-28', exerciseType: 'high-knees', exerciseName: 'High Knees', nameTamil: 'ஹை நீஸ்', duration: 15, intensity: 'vigorous', hardnessRank: 7, caloriesBurned: 156, partnerParticipated: false },
    { id: 'ex3', date: '2024-11-27', exerciseType: 'yoga', exerciseName: 'Yoga/Pranayama', nameTamil: 'யோகா/பிராணாயாமா', duration: 45, intensity: 'light', hardnessRank: 3, caloriesBurned: 108, partnerParticipated: true },
    { id: 'ex4', date: '2024-11-27', exerciseType: 'strength', exerciseName: 'Strength Training', nameTamil: 'பலப்பயிற்சி', duration: 30, intensity: 'vigorous', hardnessRank: 8, caloriesBurned: 195, partnerParticipated: false },
  ],
  'C_001_F': [
    { id: 'ex1', date: '2024-11-28', exerciseType: 'couple-walking', exerciseName: 'Couple Walking', nameTamil: 'தம்பதிகள் நடைப்பயிற்சி', duration: 30, intensity: 'moderate', hardnessRank: 5, caloriesBurned: 120, steps: 3500, partnerParticipated: true, notes: 'Morning walk in the park' },
    { id: 'ex2', date: '2024-11-28', exerciseType: 'yoga', exerciseName: 'Yoga/Pranayama', nameTamil: 'யோகா/பிராணாயாமா', duration: 30, intensity: 'light', hardnessRank: 2, caloriesBurned: 72, partnerParticipated: false },
    { id: 'ex3', date: '2024-11-27', exerciseType: 'swimming', exerciseName: 'Swimming', nameTamil: 'நீச்சல்', duration: 45, intensity: 'moderate', hardnessRank: 6, caloriesBurned: 315, partnerParticipated: false },
  ],
  'C_002_M': [
    { id: 'ex1', date: '2024-11-28', exerciseType: 'cycling', exerciseName: 'Cycling', nameTamil: 'சைக்கிள் ஓட்டுதல்', duration: 45, intensity: 'moderate', hardnessRank: 5, caloriesBurned: 270, partnerParticipated: false },
    { id: 'ex2', date: '2024-11-27', exerciseType: 'high-knees', exerciseName: 'High Knees', nameTamil: 'ஹை நீஸ்', duration: 20, intensity: 'vigorous', hardnessRank: 8, caloriesBurned: 208, partnerParticipated: false },
  ],
  'C_002_F': [
    { id: 'ex1', date: '2024-11-28', exerciseType: 'yoga', exerciseName: 'Yoga/Pranayama', nameTamil: 'யோகா/பிராணாயாமா', duration: 60, intensity: 'light', hardnessRank: 3, caloriesBurned: 144, partnerParticipated: false },
  ],
};

// Mock meal logs
const mockMealLogs: Record<string, MealLog[]> = {
  'C_001_M': [
    {
      id: 'meal1', date: '2024-11-28', mealType: 'breakfast',
      foods: [
        { name: 'Idli', nameTamil: 'இட்லி', quantity: '4 pieces', calories: 160, protein: 4, carbs: 32, fat: 1 },
        { name: 'Sambar', nameTamil: 'சாம்பார்', quantity: '1 cup', calories: 120, protein: 6, carbs: 18, fat: 3 },
      ],
      totalCalories: 280, totalProtein: 10, totalCarbs: 50, totalFat: 4,
    },
    {
      id: 'meal2', date: '2024-11-28', mealType: 'lunch',
      foods: [
        { name: 'Rice', nameTamil: 'அரிசி சாதம்', quantity: '2 cups', calories: 400, protein: 8, carbs: 90, fat: 1 },
        { name: 'Chicken Curry', nameTamil: 'சிக்கன் கறி', quantity: '1 serving', calories: 300, protein: 30, carbs: 8, fat: 16 },
        { name: 'Raita', nameTamil: 'ரய்தா', quantity: '1 cup', calories: 80, protein: 4, carbs: 8, fat: 3 },
      ],
      totalCalories: 780, totalProtein: 42, totalCarbs: 106, totalFat: 20,
    },
    {
      id: 'meal3', date: '2024-11-28', mealType: 'dinner',
      foods: [
        { name: 'Chapati', nameTamil: 'சப்பாத்தி', quantity: '3 pieces', calories: 240, protein: 9, carbs: 45, fat: 3 },
        { name: 'Dal', nameTamil: 'பருப்பு', quantity: '1 cup', calories: 180, protein: 12, carbs: 30, fat: 2 },
      ],
      totalCalories: 420, totalProtein: 21, totalCarbs: 75, totalFat: 5,
    },
  ],
  'C_001_F': [
    {
      id: 'meal1', date: '2024-11-28', mealType: 'breakfast',
      foods: [
        { name: 'Dosa', nameTamil: 'தோசை', quantity: '2 pieces', calories: 200, protein: 4, carbs: 40, fat: 4 },
        { name: 'Coconut Chutney', nameTamil: 'தேங்காய் சட்னி', quantity: '2 tbsp', calories: 60, protein: 1, carbs: 4, fat: 5 },
      ],
      totalCalories: 260, totalProtein: 5, totalCarbs: 44, totalFat: 9,
    },
    {
      id: 'meal2', date: '2024-11-28', mealType: 'lunch',
      foods: [
        { name: 'Rice', nameTamil: 'அரிசி சாதம்', quantity: '1.5 cups', calories: 300, protein: 6, carbs: 68, fat: 1 },
        { name: 'Fish Curry', nameTamil: 'மீன் குழம்பு', quantity: '1 serving', calories: 250, protein: 28, carbs: 5, fat: 12 },
        { name: 'Vegetables', nameTamil: 'காய்கறிகள்', quantity: '1 cup', calories: 80, protein: 3, carbs: 15, fat: 1 },
      ],
      totalCalories: 630, totalProtein: 37, totalCarbs: 88, totalFat: 14,
    },
  ],
  'C_002_M': [
    {
      id: 'meal1', date: '2024-11-28', mealType: 'breakfast',
      foods: [
        { name: 'Poha', nameTamil: 'அவல்', quantity: '1 plate', calories: 250, protein: 5, carbs: 45, fat: 6 },
        { name: 'Tea', nameTamil: 'டீ', quantity: '1 cup', calories: 40, protein: 1, carbs: 6, fat: 1 },
      ],
      totalCalories: 290, totalProtein: 6, totalCarbs: 51, totalFat: 7,
    },
  ],
  'C_002_F': [
    {
      id: 'meal1', date: '2024-11-28', mealType: 'breakfast',
      foods: [
        { name: 'Oats', nameTamil: 'ஓட்ஸ்', quantity: '1 bowl', calories: 180, protein: 6, carbs: 32, fat: 3 },
        { name: 'Banana', nameTamil: 'வாழைப்பழம்', quantity: '1 medium', calories: 105, protein: 1, carbs: 27, fat: 0 },
      ],
      totalCalories: 285, totalProtein: 7, totalCarbs: 59, totalFat: 3,
    },
  ],
};

export default function UserDashboardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1024;

  const coupleId = params.coupleId as string || 'C_001';

  const [selectedTab, setSelectedTab] = useState<'overview' | 'exercise' | 'meals'>('overview');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [coupleData, setCoupleData] = useState<any>(null);
  const [maleUser, setMaleUser] = useState<UserData | null>(null);
  const [femaleUser, setFemaleUser] = useState<UserData | null>(null);
  const [maleWeightLogs, setMaleWeightLogs] = useState<CoupleWeightLog[]>([]);
  const [femaleWeightLogs, setFemaleWeightLogs] = useState<CoupleWeightLog[]>([]);
  const [showWeightHistoryModal, setShowWeightHistoryModal] = useState(false);
  const [showHeightHistoryModal, setShowHeightHistoryModal] = useState(false);
  const [selectedGenderForHistory, setSelectedGenderForHistory] = useState<'male' | 'female'>('male');

  // Format timestamp to 12-hour AM/PM format in IST (Indian Standard Time)
  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
      });
    } catch (e) {
      return '';
    }
  };

  // Get unique height entries from weight logs
  const getHeightHistory = (gender: 'male' | 'female') => {
    const logs = gender === 'male' ? maleWeightLogs : femaleWeightLogs;
    const heightMap = new Map<number, { height: number; date: string; loggedAt: any }>();
    
    logs.forEach(log => {
      if (log.height && !heightMap.has(log.height)) {
        heightMap.set(log.height, {
          height: log.height,
          date: log.date,
          loggedAt: log.loggedAt || log.createdAt
        });
      }
    });
    
    return Array.from(heightMap.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  };

  // Load couple data from Firestore
  useEffect(() => {
    const loadCoupleData = async () => {
      try {
        const couple = await coupleService.get(coupleId);
        if (couple) {
          setCoupleData(couple);
          
          // Calculate age from date of birth
          const calculateAge = (dob: string | undefined) => {
            if (!dob) return 0;
            const birthDate = new Date(dob);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
            return age;
          };
          
          // Build user data from couple data
          if (couple.male) {
            setMaleUser({
              id: `${coupleId}_M`,
              name: couple.male.name || couple.male.displayName || 'Male Partner',
              gender: 'male',
              age: couple.male.age || calculateAge(couple.male.dateOfBirth),
              weight: couple.male.weight || 0,
              height: couple.male.height || 0,
              bmi: couple.male.bmi || 0,
              phone: couple.male.phone || '',
              email: couple.male.email || '',
              status: couple.status === 'active' ? 'Active' : 'Inactive',
              dateOfBirth: couple.male.dateOfBirth,
            });
          }
          
          if (couple.female) {
            setFemaleUser({
              id: `${coupleId}_F`,
              name: couple.female.name || couple.female.displayName || 'Female Partner',
              gender: 'female',
              age: couple.female.age || calculateAge(couple.female.dateOfBirth),
              weight: couple.female.weight || 0,
              height: couple.female.height || 0,
              bmi: couple.female.bmi || 0,
              phone: couple.female.phone || '',
              email: couple.female.email || '',
              status: couple.status === 'active' ? 'Active' : 'Inactive',
              dateOfBirth: couple.female.dateOfBirth,
            });
          }
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading couple data:', error);
        setIsLoading(false);
      }
    };

    loadCoupleData();
  }, [coupleId]);

  // Subscribe to weight logs
  useEffect(() => {
    if (!coupleId) return;

    const loadWeightLogs = async () => {
      try {
        const [maleLogs, femaleLogs] = await Promise.all([
          coupleWeightLogService.getAll(coupleId, 'male', 30),
          coupleWeightLogService.getAll(coupleId, 'female', 30)
        ]);
        setMaleWeightLogs(maleLogs);
        setFemaleWeightLogs(femaleLogs);
        
        // Update user data with latest weight
        if (maleLogs.length > 0) {
          const latestMale = maleLogs[0];
          setMaleUser(prev => prev ? {
            ...prev,
            weight: latestMale.weight,
            height: latestMale.height || prev.height,
            bmi: latestMale.bmi || prev.bmi,
            lastWeightDate: latestMale.date
          } : null);
        }
        if (femaleLogs.length > 0) {
          const latestFemale = femaleLogs[0];
          setFemaleUser(prev => prev ? {
            ...prev,
            weight: latestFemale.weight,
            height: latestFemale.height || prev.height,
            bmi: latestFemale.bmi || prev.bmi,
            lastWeightDate: latestFemale.date
          } : null);
        }
      } catch (error) {
        console.error('Error loading weight logs:', error);
      }
    };

    loadWeightLogs();
  }, [coupleId]);
  
  // Get exercise and meal logs for both users (keep using mock for now)
  const maleExerciseLogs = mockExerciseLogs[`${coupleId}_M`] || [];
  const femaleExerciseLogs = mockExerciseLogs[`${coupleId}_F`] || [];
  const maleMealLogs = mockMealLogs[`${coupleId}_M`] || [];
  const femaleMealLogs = mockMealLogs[`${coupleId}_F`] || [];

  // Calculate totals for today - Male
  const todayMaleExerciseLogs = maleExerciseLogs.filter(log => log.date === selectedDate);
  const todayMaleMealLogs = maleMealLogs.filter(log => log.date === selectedDate);
  const maleTotalExerciseDuration = todayMaleExerciseLogs.reduce((sum, log) => sum + log.duration, 0);
  const maleTotalExerciseCalories = todayMaleExerciseLogs.reduce((sum, log) => sum + log.caloriesBurned, 0);
  const maleTotalMealCalories = todayMaleMealLogs.reduce((sum, log) => sum + log.totalCalories, 0);

  // Calculate totals for today - Female
  const todayFemaleExerciseLogs = femaleExerciseLogs.filter(log => log.date === selectedDate);
  const todayFemaleMealLogs = femaleMealLogs.filter(log => log.date === selectedDate);
  const femaleTotalExerciseDuration = todayFemaleExerciseLogs.reduce((sum, log) => sum + log.duration, 0);
  const femaleTotalExerciseCalories = todayFemaleExerciseLogs.reduce((sum, log) => sum + log.caloriesBurned, 0);
  const femaleTotalMealCalories = todayFemaleMealLogs.reduce((sum, log) => sum + log.totalCalories, 0);

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'light': return COLORS.success;
      case 'moderate': return COLORS.warning;
      case 'vigorous': return COLORS.error;
      default: return COLORS.textMuted;
    }
  };

  const getHardnessColor = (rank: number) => {
    if (rank <= 3) return COLORS.success;
    if (rank <= 6) return COLORS.warning;
    return COLORS.error;
  };

  const getExerciseIcon = (exerciseType: string) => {
    switch (exerciseType) {
      case 'couple-walking': return { icon: 'walk', family: 'MaterialCommunityIcons' };
      case 'high-knees': return { icon: 'run-fast', family: 'MaterialCommunityIcons' };
      case 'yoga': return { icon: 'meditation', family: 'MaterialCommunityIcons' };
      case 'strength': return { icon: 'dumbbell', family: 'MaterialCommunityIcons' };
      case 'swimming': return { icon: 'swim', family: 'MaterialCommunityIcons' };
      case 'cycling': return { icon: 'bike', family: 'MaterialCommunityIcons' };
      default: return { icon: 'fitness', family: 'Ionicons' };
    }
  };

  const getMealIcon = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return 'sunny-outline';
      case 'lunch': return 'restaurant-outline';
      case 'dinner': return 'moon-outline';
      case 'snack': return 'cafe-outline';
      default: return 'nutrition-outline';
    }
  };

  // Header
  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>Couple Dashboard</Text>
        <Text style={styles.headerSubtitle}>{coupleId} • {maleUser?.name} & {femaleUser?.name}</Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: COLORS.success + '20' }]}>
        <Text style={[styles.statusText, { color: COLORS.success }]}>
          Active
        </Text>
      </View>
    </View>
  );

  // Open weight history modal
  const openWeightHistory = (gender: 'male' | 'female') => {
    setSelectedGenderForHistory(gender);
    setShowWeightHistoryModal(true);
  };

  // Open height history modal
  const openHeightHistory = (gender: 'male' | 'female') => {
    setSelectedGenderForHistory(gender);
    setShowHeightHistoryModal(true);
  };

  // Get weight logs for selected gender
  const getSelectedWeightLogs = () => {
    return selectedGenderForHistory === 'male' ? maleWeightLogs : femaleWeightLogs;
  };

  // Render single user card
  const renderSingleUserCard = (user: UserData | null | undefined, isMale: boolean) => {
    if (!user) {
      return (
        <View style={[styles.userInfoCard, { flex: 1, borderLeftWidth: 4, borderLeftColor: isMale ? COLORS.primary : '#e91e8c' }]}>
          <View style={{ padding: 20, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={{ marginTop: 10, color: COLORS.textSecondary }}>Loading...</Text>
          </View>
        </View>
      );
    }
    
    return (
    <View style={[styles.userInfoCard, { flex: 1, borderLeftWidth: 4, borderLeftColor: isMale ? COLORS.primary : '#e91e8c' }]}>
      <View style={styles.userInfoHeader}>
        <View style={[styles.userAvatar, { backgroundColor: isMale ? COLORS.primary : '#e91e8c' }]}>
          <Ionicons name={isMale ? 'male' : 'female'} size={28} color="#fff" />
        </View>
        <View style={styles.userInfoDetails}>
          <View style={styles.userNameRow}>
            <Text style={styles.userName}>{user?.name || 'N/A'}</Text>
            <View style={[styles.genderBadge, { backgroundColor: isMale ? COLORS.primary + '15' : '#e91e8c15' }]}>
              <Text style={[styles.genderBadgeText, { color: isMale ? COLORS.primary : '#e91e8c' }]}>
                {isMale ? 'Husband' : 'Wife'}
              </Text>
            </View>
          </View>
          <Text style={styles.userContact}>{user?.phone || '-'}</Text>
          <Text style={styles.userContact}>{user?.email || '-'}</Text>
          {user?.dateOfBirth && (
            <Text style={styles.userContact}>DOB: {user.dateOfBirth}</Text>
          )}
        </View>
      </View>
      <View style={styles.userStatsRow}>
        <View style={styles.userStatItem}>
          <Text style={styles.userStatValue}>{user?.age || '-'}</Text>
          <Text style={styles.userStatLabel}>Age</Text>
        </View>
        <View style={styles.userStatDivider} />
        <TouchableOpacity 
          style={styles.userStatItem}
          onPress={() => openWeightHistory(isMale ? 'male' : 'female')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.userStatValue, { color: COLORS.primary }]}>{user?.weight || '-'} kg</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.primary} style={{ marginLeft: 2 }} />
          </View>
          <Text style={styles.userStatLabel}>Weight</Text>
          {user?.lastWeightDate && (
            <Text style={{ fontSize: 10, color: COLORS.textMuted }}>{user.lastWeightDate}</Text>
          )}
        </TouchableOpacity>
        <View style={styles.userStatDivider} />
        <TouchableOpacity 
          style={styles.userStatItem}
          onPress={() => openHeightHistory(isMale ? 'male' : 'female')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.userStatValue, { color: COLORS.accent }]}>{user?.height || '-'} cm</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.accent} style={{ marginLeft: 2 }} />
          </View>
          <Text style={styles.userStatLabel}>Height</Text>
        </TouchableOpacity>
        <View style={styles.userStatDivider} />
        <TouchableOpacity 
          style={styles.userStatItem}
          onPress={() => openWeightHistory(isMale ? 'male' : 'female')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.userStatValue, { color: COLORS.primary }]}>{user?.bmi?.toFixed(1) || '-'}</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.primary} style={{ marginLeft: 2 }} />
          </View>
          <Text style={styles.userStatLabel}>BMI</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  };

  // User Info Cards - Both Partners
  const renderUserInfo = () => (
    <View style={[styles.coupleCardsContainer, isMobile && styles.coupleCardsContainerMobile]}>
      {renderSingleUserCard(maleUser, true)}
      {renderSingleUserCard(femaleUser, false)}
    </View>
  );

  // Tab Selector
  const renderTabs = () => (
    <View style={styles.tabContainer}>
      {['overview', 'exercise', 'meals'].map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, selectedTab === tab && styles.tabActive]}
          onPress={() => setSelectedTab(tab as any)}
        >
          <Ionicons
            name={tab === 'overview' ? 'grid' : tab === 'exercise' ? 'fitness' : 'nutrition'}
            size={18}
            color={selectedTab === tab ? COLORS.primary : COLORS.textMuted}
          />
          <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Render exercise item with user indicator
  const renderExerciseItem = (log: ExerciseLog, isMale: boolean) => {
    const iconInfo = getExerciseIcon(log.exerciseType);
    return (
      <View key={`${isMale ? 'M' : 'F'}_${log.id}`} style={styles.recentItem}>
        <View style={[styles.recentIcon, { backgroundColor: getIntensityColor(log.intensity) + '15' }]}>
          {iconInfo.family === 'MaterialCommunityIcons' ? (
            <MaterialCommunityIcons name={iconInfo.icon as any} size={20} color={getIntensityColor(log.intensity)} />
          ) : (
            <Ionicons name={iconInfo.icon as any} size={20} color={getIntensityColor(log.intensity)} />
          )}
        </View>
        <View style={styles.recentInfo}>
          <View style={styles.exerciseNameWithBadge}>
            <Text style={styles.recentTitle}>{log.exerciseName}</Text>
            <View style={[styles.userIndicator, { backgroundColor: isMale ? COLORS.primary + '15' : '#e91e8c15' }]}>
              <Ionicons name={isMale ? 'male' : 'female'} size={12} color={isMale ? COLORS.primary : '#e91e8c'} />
            </View>
          </View>
          <Text style={styles.recentSubtitle}>{log.duration} min • {log.caloriesBurned} cal</Text>
        </View>
        <View style={[styles.hardnessBadge, { backgroundColor: getHardnessColor(log.hardnessRank) + '15' }]}>
          <Text style={[styles.hardnessText, { color: getHardnessColor(log.hardnessRank) }]}>
            {log.hardnessRank}/10
          </Text>
        </View>
      </View>
    );
  };

  // Render meal item with user indicator
  const renderMealItem = (meal: MealLog, isMale: boolean) => (
    <View key={`${isMale ? 'M' : 'F'}_${meal.id}`} style={styles.recentItem}>
      <View style={[styles.recentIcon, { backgroundColor: COLORS.accent + '15' }]}>
        <Ionicons name={getMealIcon(meal.mealType) as any} size={20} color={COLORS.accent} />
      </View>
      <View style={styles.recentInfo}>
        <View style={styles.exerciseNameWithBadge}>
          <Text style={styles.recentTitle}>{meal.mealType.charAt(0).toUpperCase() + meal.mealType.slice(1)}</Text>
          <View style={[styles.userIndicator, { backgroundColor: isMale ? COLORS.primary + '15' : '#e91e8c15' }]}>
            <Ionicons name={isMale ? 'male' : 'female'} size={12} color={isMale ? COLORS.primary : '#e91e8c'} />
          </View>
        </View>
        <Text style={styles.recentSubtitle}>{meal.foods.length} items • {meal.totalCalories} cal</Text>
      </View>
    </View>
  );

  // Overview Tab
  const renderOverview = () => (
    <View style={styles.overviewContainer}>
      {/* Today's Summary - Both Users */}
      <Text style={styles.sectionTitle}>Today's Summary - {selectedDate}</Text>
      
      {/* Male User Summary */}
      <View style={styles.userSummarySection}>
        <View style={styles.userSummaryHeader}>
          <Ionicons name="male" size={18} color={COLORS.primary} />
          <Text style={[styles.userSummaryTitle, { color: COLORS.primary }]}>{maleUser?.name}</Text>
        </View>
        <View style={[styles.summaryCards, isMobile && styles.summaryCardsMobile]}>
          <View style={[styles.summaryCard, { borderLeftColor: COLORS.primary }]}>
            <View style={[styles.summaryIcon, { backgroundColor: COLORS.success + '15' }]}>
              <Ionicons name="fitness" size={20} color={COLORS.success} />
            </View>
            <View>
              <Text style={styles.summaryValue}>{maleTotalExerciseDuration} min</Text>
              <Text style={styles.summaryLabel}>Exercise</Text>
            </View>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: COLORS.primary }]}>
            <View style={[styles.summaryIcon, { backgroundColor: COLORS.warning + '15' }]}>
              <Ionicons name="flame" size={20} color={COLORS.warning} />
            </View>
            <View>
              <Text style={styles.summaryValue}>{maleTotalExerciseCalories}</Text>
              <Text style={styles.summaryLabel}>Burned</Text>
            </View>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: COLORS.primary }]}>
            <View style={[styles.summaryIcon, { backgroundColor: COLORS.info + '15' }]}>
              <Ionicons name="nutrition" size={20} color={COLORS.info} />
            </View>
            <View>
              <Text style={styles.summaryValue}>{maleTotalMealCalories}</Text>
              <Text style={styles.summaryLabel}>Intake</Text>
            </View>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: COLORS.primary }]}>
            <View style={[styles.summaryIcon, { backgroundColor: COLORS.primary + '15' }]}>
              <MaterialCommunityIcons name="chart-bar" size={20} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.summaryValue}>{todayMaleExerciseLogs.length}</Text>
              <Text style={styles.summaryLabel}>Workouts</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Female User Summary */}
      <View style={styles.userSummarySection}>
        <View style={styles.userSummaryHeader}>
          <Ionicons name="female" size={18} color="#e91e8c" />
          <Text style={[styles.userSummaryTitle, { color: '#e91e8c' }]}>{femaleUser?.name}</Text>
        </View>
        <View style={[styles.summaryCards, isMobile && styles.summaryCardsMobile]}>
          <View style={[styles.summaryCard, { borderLeftColor: '#e91e8c' }]}>
            <View style={[styles.summaryIcon, { backgroundColor: COLORS.success + '15' }]}>
              <Ionicons name="fitness" size={20} color={COLORS.success} />
            </View>
            <View>
              <Text style={styles.summaryValue}>{femaleTotalExerciseDuration} min</Text>
              <Text style={styles.summaryLabel}>Exercise</Text>
            </View>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: '#e91e8c' }]}>
            <View style={[styles.summaryIcon, { backgroundColor: COLORS.warning + '15' }]}>
              <Ionicons name="flame" size={20} color={COLORS.warning} />
            </View>
            <View>
              <Text style={styles.summaryValue}>{femaleTotalExerciseCalories}</Text>
              <Text style={styles.summaryLabel}>Burned</Text>
            </View>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: '#e91e8c' }]}>
            <View style={[styles.summaryIcon, { backgroundColor: COLORS.info + '15' }]}>
              <Ionicons name="nutrition" size={20} color={COLORS.info} />
            </View>
            <View>
              <Text style={styles.summaryValue}>{femaleTotalMealCalories}</Text>
              <Text style={styles.summaryLabel}>Intake</Text>
            </View>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: '#e91e8c' }]}>
            <View style={[styles.summaryIcon, { backgroundColor: '#e91e8c15' }]}>
              <MaterialCommunityIcons name="chart-bar" size={20} color="#e91e8c" />
            </View>
            <View>
              <Text style={styles.summaryValue}>{todayFemaleExerciseLogs.length}</Text>
              <Text style={styles.summaryLabel}>Workouts</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Recent Exercises - Both Users */}
      <View style={styles.recentSection}>
        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>Recent Exercises</Text>
          <TouchableOpacity onPress={() => setSelectedTab('exercise')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        {todayMaleExerciseLogs.slice(0, 2).map((log) => renderExerciseItem(log, true))}
        {todayFemaleExerciseLogs.slice(0, 2).map((log) => renderExerciseItem(log, false))}
        {todayMaleExerciseLogs.length === 0 && todayFemaleExerciseLogs.length === 0 && (
          <Text style={styles.noDataText}>No exercises logged today</Text>
        )}
      </View>

      {/* Recent Meals - Both Users */}
      <View style={styles.recentSection}>
        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>Today's Meals</Text>
          <TouchableOpacity onPress={() => setSelectedTab('meals')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        {todayMaleMealLogs.slice(0, 2).map((meal) => renderMealItem(meal, true))}
        {todayFemaleMealLogs.slice(0, 2).map((meal) => renderMealItem(meal, false))}
        {todayMaleMealLogs.length === 0 && todayFemaleMealLogs.length === 0 && (
          <Text style={styles.noDataText}>No meals logged today</Text>
        )}
      </View>
    </View>
  );

  // Render single exercise card with user indicator
  const renderExerciseCard = (log: ExerciseLog, isMale: boolean) => {
    const iconInfo = getExerciseIcon(log.exerciseType);
    return (
      <View key={`${isMale ? 'M' : 'F'}_${log.id}`} style={[styles.exerciseCard, { borderLeftWidth: 4, borderLeftColor: isMale ? COLORS.primary : '#e91e8c' }]}>
        <View style={styles.exerciseCardHeader}>
          <View style={[styles.exerciseIcon, { backgroundColor: getIntensityColor(log.intensity) + '15' }]}>
            {iconInfo.family === 'MaterialCommunityIcons' ? (
              <MaterialCommunityIcons name={iconInfo.icon as any} size={28} color={getIntensityColor(log.intensity)} />
            ) : (
              <Ionicons name={iconInfo.icon as any} size={28} color={getIntensityColor(log.intensity)} />
            )}
          </View>
          <View style={styles.exerciseInfo}>
            <View style={styles.exerciseNameWithBadge}>
              <Text style={styles.exerciseName}>{log.exerciseName}</Text>
              <View style={[styles.userIndicatorLarge, { backgroundColor: isMale ? COLORS.primary + '15' : '#e91e8c15' }]}>
                <Ionicons name={isMale ? 'male' : 'female'} size={14} color={isMale ? COLORS.primary : '#e91e8c'} />
                <Text style={[styles.userIndicatorText, { color: isMale ? COLORS.primary : '#e91e8c' }]}>
                  {isMale ? maleUser?.name.split(' ')[0] : femaleUser?.name.split(' ')[0]}
                </Text>
              </View>
            </View>
            <Text style={styles.exerciseNameTamil}>{log.nameTamil}</Text>
            <Text style={styles.exerciseDate}>{log.date}</Text>
          </View>
          {log.partnerParticipated && (
            <View style={styles.partnerBadge}>
              <Ionicons name="people" size={14} color={COLORS.accent} />
              <Text style={styles.partnerText}>With Partner</Text>
            </View>
          )}
        </View>

        <View style={styles.exerciseMetrics}>
          {/* Duration */}
          <View style={styles.metricItem}>
            <Ionicons name="time-outline" size={18} color={COLORS.primary} />
            <View>
              <Text style={styles.metricValue}>{log.duration} min</Text>
              <Text style={styles.metricLabel}>Duration</Text>
            </View>
          </View>

          {/* Intensity */}
          <View style={styles.metricItem}>
            <Ionicons name="speedometer-outline" size={18} color={getIntensityColor(log.intensity)} />
            <View>
              <Text style={[styles.metricValue, { color: getIntensityColor(log.intensity) }]}>
                {log.intensity.charAt(0).toUpperCase() + log.intensity.slice(1)}
              </Text>
              <Text style={styles.metricLabel}>Intensity</Text>
            </View>
          </View>

          {/* Hardness Rank */}
          <View style={styles.metricItem}>
            <MaterialCommunityIcons name="gauge" size={18} color={getHardnessColor(log.hardnessRank)} />
            <View>
              <Text style={[styles.metricValue, { color: getHardnessColor(log.hardnessRank) }]}>
                {log.hardnessRank}/10
              </Text>
              <Text style={styles.metricLabel}>Hardness</Text>
            </View>
          </View>

          {/* Calories */}
          <View style={styles.metricItem}>
            <Ionicons name="flame-outline" size={18} color={COLORS.warning} />
            <View>
              <Text style={styles.metricValue}>{log.caloriesBurned}</Text>
              <Text style={styles.metricLabel}>Calories</Text>
            </View>
          </View>
        </View>

        {/* Steps if applicable */}
        {log.steps && (
          <View style={styles.stepsRow}>
            <MaterialCommunityIcons name="shoe-print" size={16} color={COLORS.success} />
            <Text style={styles.stepsText}>{log.steps.toLocaleString()} steps</Text>
          </View>
        )}

        {/* Notes */}
        {log.notes && (
          <View style={styles.notesRow}>
            <Ionicons name="document-text-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.notesText}>{log.notes}</Text>
          </View>
        )}
      </View>
    );
  };

  // Exercise Tab
  const renderExerciseTab = () => (
    <View style={styles.exerciseContainer}>
      <Text style={styles.sectionTitle}>Exercise Log</Text>
      <Text style={styles.sectionSubtitle}>All recorded exercises for both partners</Text>

      {maleExerciseLogs.length === 0 && femaleExerciseLogs.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="fitness-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No exercises logged yet</Text>
        </View>
      ) : (
        <>
          {/* Male User Exercises */}
          {maleExerciseLogs.length > 0 && (
            <View style={styles.userExerciseSection}>
              <View style={styles.userSummaryHeader}>
                <Ionicons name="male" size={18} color={COLORS.primary} />
                <Text style={[styles.userSummaryTitle, { color: COLORS.primary }]}>{maleUser?.name}'s Exercises</Text>
              </View>
              {maleExerciseLogs.map((log) => renderExerciseCard(log, true))}
            </View>
          )}
          
          {/* Female User Exercises */}
          {femaleExerciseLogs.length > 0 && (
            <View style={styles.userExerciseSection}>
              <View style={styles.userSummaryHeader}>
                <Ionicons name="female" size={18} color="#e91e8c" />
                <Text style={[styles.userSummaryTitle, { color: '#e91e8c' }]}>{femaleUser?.name}'s Exercises</Text>
              </View>
              {femaleExerciseLogs.map((log) => renderExerciseCard(log, false))}
            </View>
          )}
        </>
      )}
    </View>
  );

  // Render single meal card with user indicator
  const renderMealCard = (meal: MealLog, isMale: boolean) => (
    <View key={`${isMale ? 'M' : 'F'}_${meal.id}`} style={[styles.mealCard, { borderLeftWidth: 4, borderLeftColor: isMale ? COLORS.primary : '#e91e8c' }]}>
      <View style={styles.mealCardHeader}>
        <View style={[styles.mealIcon, { backgroundColor: COLORS.accent + '15' }]}>
          <Ionicons name={getMealIcon(meal.mealType) as any} size={24} color={COLORS.accent} />
        </View>
        <View style={styles.mealInfo}>
          <View style={styles.exerciseNameWithBadge}>
            <Text style={styles.mealType}>
              {meal.mealType.charAt(0).toUpperCase() + meal.mealType.slice(1)}
            </Text>
            <View style={[styles.userIndicatorLarge, { backgroundColor: isMale ? COLORS.primary + '15' : '#e91e8c15' }]}>
              <Ionicons name={isMale ? 'male' : 'female'} size={14} color={isMale ? COLORS.primary : '#e91e8c'} />
              <Text style={[styles.userIndicatorText, { color: isMale ? COLORS.primary : '#e91e8c' }]}>
                {isMale ? maleUser?.name.split(' ')[0] : femaleUser?.name.split(' ')[0]}
              </Text>
            </View>
          </View>
          <Text style={styles.mealDate}>{meal.date}</Text>
        </View>
        <View style={styles.mealCalories}>
          <Text style={styles.mealCaloriesValue}>{meal.totalCalories}</Text>
          <Text style={styles.mealCaloriesLabel}>cal</Text>
        </View>
      </View>

      <View style={styles.foodsList}>
        {meal.foods.map((food, index) => (
          <View key={index} style={styles.foodItem}>
            <View style={styles.foodInfo}>
              <Text style={styles.foodName}>{food.name}</Text>
              <Text style={styles.foodNameTamil}>{food.nameTamil}</Text>
              <Text style={styles.foodQuantity}>{food.quantity}</Text>
            </View>
            <View style={styles.foodNutrition}>
              <Text style={styles.foodCalories}>{food.calories} cal</Text>
              <Text style={styles.foodMacros}>
                P: {food.protein}g | C: {food.carbs}g | F: {food.fat}g
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.mealTotals}>
        <View style={styles.mealTotalItem}>
          <Text style={styles.mealTotalLabel}>Protein</Text>
          <Text style={styles.mealTotalValue}>{meal.totalProtein}g</Text>
        </View>
        <View style={styles.mealTotalItem}>
          <Text style={styles.mealTotalLabel}>Carbs</Text>
          <Text style={styles.mealTotalValue}>{meal.totalCarbs}g</Text>
        </View>
        <View style={styles.mealTotalItem}>
          <Text style={styles.mealTotalLabel}>Fat</Text>
          <Text style={styles.mealTotalValue}>{meal.totalFat}g</Text>
        </View>
      </View>
    </View>
  );

  // Meals Tab
  const renderMealsTab = () => (
    <View style={styles.mealsContainer}>
      <Text style={styles.sectionTitle}>Meal Log</Text>
      <Text style={styles.sectionSubtitle}>Logged meals for both partners with nutritional breakdown</Text>

      {/* Daily Nutrition Summary - Both Users */}
      <View style={[styles.nutritionSummaryContainer, isMobile && styles.nutritionSummaryContainerMobile]}>
        {/* Male Nutrition Summary */}
        <View style={[styles.nutritionSummary, { flex: 1, borderLeftWidth: 4, borderLeftColor: COLORS.primary }]}>
          <View style={styles.nutritionTitleRow}>
            <Ionicons name="male" size={16} color={COLORS.primary} />
            <Text style={[styles.nutritionTitle, { color: COLORS.primary }]}>{maleUser?.name.split(' ')[0]}</Text>
          </View>
          <View style={styles.nutritionGrid}>
            <View style={[styles.nutritionItem, { backgroundColor: COLORS.warning + '15' }]}>
              <Ionicons name="flame" size={18} color={COLORS.warning} />
              <Text style={styles.nutritionValue}>{maleTotalMealCalories}</Text>
              <Text style={styles.nutritionLabel}>Calories</Text>
            </View>
            <View style={[styles.nutritionItem, { backgroundColor: COLORS.error + '15' }]}>
              <MaterialCommunityIcons name="food-steak" size={18} color={COLORS.error} />
              <Text style={styles.nutritionValue}>
                {todayMaleMealLogs.reduce((sum, log) => sum + log.totalProtein, 0)}g
              </Text>
              <Text style={styles.nutritionLabel}>Protein</Text>
            </View>
            <View style={[styles.nutritionItem, { backgroundColor: COLORS.info + '15' }]}>
              <MaterialCommunityIcons name="bread-slice" size={18} color={COLORS.info} />
              <Text style={styles.nutritionValue}>
                {todayMaleMealLogs.reduce((sum, log) => sum + log.totalCarbs, 0)}g
              </Text>
              <Text style={styles.nutritionLabel}>Carbs</Text>
            </View>
            <View style={[styles.nutritionItem, { backgroundColor: COLORS.accent + '15' }]}>
              <MaterialCommunityIcons name="oil" size={18} color={COLORS.accent} />
              <Text style={styles.nutritionValue}>
                {todayMaleMealLogs.reduce((sum, log) => sum + log.totalFat, 0)}g
              </Text>
              <Text style={styles.nutritionLabel}>Fat</Text>
            </View>
          </View>
        </View>

        {/* Female Nutrition Summary */}
        <View style={[styles.nutritionSummary, { flex: 1, borderLeftWidth: 4, borderLeftColor: '#e91e8c' }]}>
          <View style={styles.nutritionTitleRow}>
            <Ionicons name="female" size={16} color="#e91e8c" />
            <Text style={[styles.nutritionTitle, { color: '#e91e8c' }]}>{femaleUser?.name.split(' ')[0]}</Text>
          </View>
          <View style={styles.nutritionGrid}>
            <View style={[styles.nutritionItem, { backgroundColor: COLORS.warning + '15' }]}>
              <Ionicons name="flame" size={18} color={COLORS.warning} />
              <Text style={styles.nutritionValue}>{femaleTotalMealCalories}</Text>
              <Text style={styles.nutritionLabel}>Calories</Text>
            </View>
            <View style={[styles.nutritionItem, { backgroundColor: COLORS.error + '15' }]}>
              <MaterialCommunityIcons name="food-steak" size={18} color={COLORS.error} />
              <Text style={styles.nutritionValue}>
                {todayFemaleMealLogs.reduce((sum, log) => sum + log.totalProtein, 0)}g
              </Text>
              <Text style={styles.nutritionLabel}>Protein</Text>
            </View>
            <View style={[styles.nutritionItem, { backgroundColor: COLORS.info + '15' }]}>
              <MaterialCommunityIcons name="bread-slice" size={18} color={COLORS.info} />
              <Text style={styles.nutritionValue}>
                {todayFemaleMealLogs.reduce((sum, log) => sum + log.totalCarbs, 0)}g
              </Text>
              <Text style={styles.nutritionLabel}>Carbs</Text>
            </View>
            <View style={[styles.nutritionItem, { backgroundColor: COLORS.accent + '15' }]}>
              <MaterialCommunityIcons name="oil" size={18} color={COLORS.accent} />
              <Text style={styles.nutritionValue}>
                {todayFemaleMealLogs.reduce((sum, log) => sum + log.totalFat, 0)}g
              </Text>
              <Text style={styles.nutritionLabel}>Fat</Text>
            </View>
          </View>
        </View>
      </View>

      {maleMealLogs.length === 0 && femaleMealLogs.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="nutrition-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No meals logged yet</Text>
        </View>
      ) : (
        <>
          {/* Male User Meals */}
          {maleMealLogs.length > 0 && (
            <View style={styles.userMealSection}>
              <View style={styles.userSummaryHeader}>
                <Ionicons name="male" size={18} color={COLORS.primary} />
                <Text style={[styles.userSummaryTitle, { color: COLORS.primary }]}>{maleUser?.name}'s Meals</Text>
              </View>
              {maleMealLogs.map((meal) => renderMealCard(meal, true))}
            </View>
          )}
          
          {/* Female User Meals */}
          {femaleMealLogs.length > 0 && (
            <View style={styles.userMealSection}>
              <View style={styles.userSummaryHeader}>
                <Ionicons name="female" size={18} color="#e91e8c" />
                <Text style={[styles.userSummaryTitle, { color: '#e91e8c' }]}>{femaleUser?.name}'s Meals</Text>
              </View>
              {femaleMealLogs.map((meal) => renderMealCard(meal, false))}
            </View>
          )}
        </>
      )}
    </View>
  );

  // Render weight history modal
  const renderWeightHistoryModal = () => {
    const weightLogs = getSelectedWeightLogs();
    const selectedUser = selectedGenderForHistory === 'male' ? maleUser : femaleUser;
    
    return (
      <Modal
        visible={showWeightHistoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowWeightHistoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%', width: isMobile ? '95%' : 600 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.userAvatar, { 
                  backgroundColor: selectedGenderForHistory === 'male' ? COLORS.primary : '#e91e8c',
                  width: 36,
                  height: 36,
                }]}>
                  <Ionicons 
                    name={selectedGenderForHistory === 'male' ? 'male' : 'female'} 
                    size={20} 
                    color="#fff" 
                  />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Weight History</Text>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>
                    {selectedUser?.name}
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowWeightHistoryModal(false)}
              >
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ flex: 1 }}>
              {weightLogs.length === 0 ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Ionicons name="scale-outline" size={48} color={COLORS.textMuted} />
                  <Text style={{ marginTop: 12, color: COLORS.textSecondary, fontSize: 15 }}>
                    No weight logs recorded yet
                  </Text>
                </View>
              ) : (
                <View style={{ padding: 16 }}>
                  {/* Summary card */}
                  {weightLogs.length > 0 && (
                    <View style={[styles.summaryCard, { marginBottom: 16 }]}>
                      <View style={styles.summaryRow}>
                        <View style={styles.summaryItem}>
                          <Text style={styles.summaryLabel}>Latest Weight</Text>
                          <Text style={styles.summaryValue}>{weightLogs[0].weight} kg</Text>
                        </View>
                        <View style={styles.summaryItem}>
                          <Text style={styles.summaryLabel}>Latest BMI</Text>
                          <Text style={styles.summaryValue}>{weightLogs[0].bmi?.toFixed(1) || '-'}</Text>
                        </View>
                        <View style={styles.summaryItem}>
                          <Text style={styles.summaryLabel}>Total Logs</Text>
                          <Text style={styles.summaryValue}>{weightLogs.length}</Text>
                        </View>
                      </View>
                    </View>
                  )}
                  
                  {/* History list */}
                  {weightLogs.map((log, index) => (
                    <View key={log.id} style={[styles.historyItem, index === 0 && { borderColor: COLORS.primary }]}>
                      <View style={styles.historyDate}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={styles.historyDateText}>{log.date}</Text>
                          {index === 0 && (
                            <View style={[styles.latestBadge]}>
                              <Text style={styles.latestBadgeText}>Latest</Text>
                            </View>
                          )}
                        </View>
                        {(log.loggedAt || log.createdAt) && (
                          <Text style={styles.historyTimeText}>
                            {formatTimestamp(log.loggedAt || log.createdAt)}
                          </Text>
                        )}
                      </View>
                      <View style={styles.historyStats}>
                        <View style={styles.historyStatItem}>
                          <Ionicons name="fitness" size={16} color={COLORS.primary} />
                          <Text style={styles.historyStatValue}>{log.weight} kg</Text>
                        </View>
                        {log.height && (
                          <View style={styles.historyStatItem}>
                            <Ionicons name="resize-outline" size={16} color={COLORS.accent} />
                            <Text style={styles.historyStatValue}>{log.height} cm</Text>
                          </View>
                        )}
                        {log.bmi && (
                          <View style={styles.historyStatItem}>
                            <MaterialCommunityIcons name="scale-balance" size={16} color={COLORS.info} />
                            <Text style={styles.historyStatValue}>BMI: {log.bmi.toFixed(1)}</Text>
                          </View>
                        )}
                        {log.waist && (
                          <View style={styles.historyStatItem}>
                            <Ionicons name="body" size={16} color={COLORS.warning} />
                            <Text style={styles.historyStatValue}>Waist: {log.waist} cm</Text>
                          </View>
                        )}
                        {log.whtr && (
                          <View style={styles.historyStatItem}>
                            <MaterialCommunityIcons name="human-male-height" size={16} color={COLORS.error} />
                            <Text style={styles.historyStatValue}>WHtR: {log.whtr.toFixed(2)}</Text>
                          </View>
                        )}
                      </View>
                      {log.notes && (
                        <Text style={styles.historyNotes}>{log.notes}</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // Render height history modal
  const renderHeightHistoryModal = () => {
    const heightHistory = getHeightHistory(selectedGenderForHistory);
    const selectedUser = selectedGenderForHistory === 'male' ? maleUser : femaleUser;
    
    return (
      <Modal
        visible={showHeightHistoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHeightHistoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%', width: isMobile ? '95%' : 500 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.userAvatar, { 
                  backgroundColor: selectedGenderForHistory === 'male' ? COLORS.primary : '#e91e8c',
                  width: 36,
                  height: 36,
                }]}>
                  <Ionicons 
                    name={selectedGenderForHistory === 'male' ? 'male' : 'female'} 
                    size={20} 
                    color="#fff" 
                  />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Height History</Text>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>
                    {selectedUser?.name}
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowHeightHistoryModal(false)}
              >
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ flex: 1 }}>
              {heightHistory.length === 0 ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Ionicons name="resize-outline" size={48} color={COLORS.textMuted} />
                  <Text style={{ marginTop: 12, color: COLORS.textSecondary, fontSize: 15 }}>
                    No height recorded yet
                  </Text>
                </View>
              ) : (
                <View style={{ padding: 16 }}>
                  {/* Current height card */}
                  <View style={[styles.summaryCard, { marginBottom: 16 }]}>
                    <View style={styles.summaryRow}>
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Current Height</Text>
                        <Text style={styles.summaryValue}>{selectedUser?.height || heightHistory[0]?.height || '-'} cm</Text>
                      </View>
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Total Records</Text>
                        <Text style={styles.summaryValue}>{heightHistory.length}</Text>
                      </View>
                    </View>
                  </View>
                  
                  {/* Height history list */}
                  {heightHistory.map((entry, index) => (
                    <View key={`height-${index}`} style={[styles.historyItem, index === 0 && { borderColor: COLORS.accent }]}>
                      <View style={styles.historyDate}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={styles.historyDateText}>{entry.date}</Text>
                          {index === 0 && (
                            <View style={[styles.latestBadge, { backgroundColor: COLORS.accent + '20' }]}>
                              <Text style={[styles.latestBadgeText, { color: COLORS.accent }]}>Current</Text>
                            </View>
                          )}
                        </View>
                        {entry.loggedAt && (
                          <Text style={styles.historyTimeText}>
                            {formatTimestamp(entry.loggedAt)}
                          </Text>
                        )}
                      </View>
                      <View style={styles.historyStats}>
                        <View style={styles.historyStatItem}>
                          <Ionicons name="resize-outline" size={18} color={COLORS.accent} />
                          <Text style={[styles.historyStatValue, { fontSize: 16, fontWeight: '700' }]}>{entry.height} cm</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 16, color: COLORS.textSecondary }}>Loading couple data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderWeightHistoryModal()}
      {renderHeightHistoryModal()}
      
      <ScrollView
        contentContainerStyle={[styles.scrollContent, !isMobile && styles.scrollContentDesktop]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.content, !isMobile && styles.contentDesktop]}>
          {renderUserInfo()}
          {renderTabs()}
          
          {selectedTab === 'overview' && renderOverview()}
          {selectedTab === 'exercise' && renderExerciseTab()}
          {selectedTab === 'meals' && renderMealsTab()}
        </View>
      </ScrollView>
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingTop: isWeb ? 16 : 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // User Info Card
  userInfoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  coupleCardsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  coupleCardsContainerMobile: {
    flexDirection: 'column',
  },
  userInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  userAvatar: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfoDetails: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  genderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  genderBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  userContact: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  userStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: COLORS.borderLight,
    borderRadius: 12,
    paddingVertical: 16,
  },
  userStatItem: {
    alignItems: 'center',
  },
  userStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  userStatLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  userStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: COLORS.primary + '15',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Section Titles
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },

  // User Summary Section
  userSummarySection: {
    marginBottom: 16,
  },
  userSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  userSummaryTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  noDataText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 12,
  },

  // Overview
  overviewContainer: {
    gap: 20,
  },
  summaryCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryCardsMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  summaryCard: {
    flex: 1,
    minWidth: 70,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  summaryLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },

  // Recent Section
  recentSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: 12,
  },
  recentIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentInfo: {
    flex: 1,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  recentSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  exerciseNameWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  userIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userIndicatorLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  userIndicatorText: {
    fontSize: 11,
    fontWeight: '600',
  },
  userExerciseSection: {
    marginBottom: 16,
  },
  userMealSection: {
    marginBottom: 16,
  },
  hardnessBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  hardnessText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Exercise Tab
  exerciseContainer: {
    gap: 16,
  },
  exerciseCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  exerciseIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  exerciseNameTamil: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  exerciseDate: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  partnerText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.accent,
  },
  exerciseMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  metricLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  stepsText: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: '600',
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: COLORS.borderLight,
    borderRadius: 10,
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },

  // Meals Tab
  mealsContainer: {
    gap: 16,
  },
  nutritionSummaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  nutritionSummaryContainerMobile: {
    flexDirection: 'column',
  },
  nutritionSummary: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 12,
  },
  nutritionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  nutritionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 6,
  },
  nutritionItem: {
    flex: 1,
    minWidth: 60,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 3,
  },
  nutritionValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  nutritionLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
  mealCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  mealCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  mealIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealInfo: {
    flex: 1,
  },
  mealType: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  mealDate: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  mealCalories: {
    alignItems: 'flex-end',
  },
  mealCaloriesValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.warning,
  },
  mealCaloriesLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  foodsList: {
    gap: 12,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  foodNameTamil: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  foodQuantity: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  foodNutrition: {
    alignItems: 'flex-end',
  },
  foodCalories: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  foodMacros: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  mealTotals: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  mealTotalItem: {
    alignItems: 'center',
  },
  mealTotalLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  mealTotalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 12,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    maxWidth: 600,
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalCloseButton: {
    padding: 8,
  },
  
  // History modal specific styles
  historyItem: {
    backgroundColor: COLORS.borderLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  historyDate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  historyDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  historyTimeText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  latestBadge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  latestBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  historyStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  historyStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyStatValue: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  historyNotes: {
    marginTop: 10,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
});
