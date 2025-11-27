import BottomNavBar from '@/components/navigation/BottomNavBar';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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

interface WeeklyData {
  day: string;
  steps: number;
  calories: number;
  exercise: number;
}

interface WeightData {
  date: string;
  weight: number;
}

interface GoalProgress {
  id: string;
  title: string;
  current: number;
  target: number;
  unit: string;
  icon: string;
  color: string;
}

// Weekly data
const weeklyStepsData: WeeklyData[] = [
  { day: 'Mon', steps: 8500, calories: 320, exercise: 45 },
  { day: 'Tue', steps: 6200, calories: 250, exercise: 30 },
  { day: 'Wed', steps: 10200, calories: 420, exercise: 60 },
  { day: 'Thu', steps: 7800, calories: 300, exercise: 40 },
  { day: 'Fri', steps: 9100, calories: 380, exercise: 55 },
  { day: 'Sat', steps: 11500, calories: 480, exercise: 75 },
  { day: 'Sun', steps: 5600, calories: 210, exercise: 25 },
];

// Monthly data
const monthlyStepsData: WeeklyData[] = [
  { day: 'W1', steps: 52000, calories: 2100, exercise: 280 },
  { day: 'W2', steps: 58000, calories: 2400, exercise: 320 },
  { day: 'W3', steps: 61000, calories: 2550, exercise: 350 },
  { day: 'W4', steps: 55000, calories: 2200, exercise: 300 },
];

// 3 Month data
const threeMonthData: WeeklyData[] = [
  { day: 'Sep', steps: 180000, calories: 7500, exercise: 980 },
  { day: 'Oct', steps: 210000, calories: 8800, exercise: 1150 },
  { day: 'Nov', steps: 226000, calories: 9250, exercise: 1250 },
];

// All time data
const allTimeData: WeeklyData[] = [
  { day: 'Jun', steps: 120000, calories: 5000, exercise: 650 },
  { day: 'Jul', steps: 155000, calories: 6500, exercise: 820 },
  { day: 'Aug', steps: 170000, calories: 7100, exercise: 900 },
  { day: 'Sep', steps: 180000, calories: 7500, exercise: 980 },
  { day: 'Oct', steps: 210000, calories: 8800, exercise: 1150 },
  { day: 'Nov', steps: 226000, calories: 9250, exercise: 1250 },
];

const weightHistory: WeightData[] = [
  { date: 'Week 1', weight: 92 },
  { date: 'Week 2', weight: 91.2 },
  { date: 'Week 3', weight: 90.5 },
  { date: 'Week 4', weight: 89.8 },
  { date: 'Week 5', weight: 88.9 },
  { date: 'Week 6', weight: 88.2 },
  { date: 'Week 7', weight: 87.5 },
  { date: 'Week 8', weight: 86.8 },
];

const goalProgress: GoalProgress[] = [
  { id: '1', title: 'Weekly Steps', current: 58900, target: 70000, unit: 'steps', icon: 'walk', color: '#98be4e' },
  { id: '2', title: 'Weekly Exercise', current: 210, target: 270, unit: 'min', icon: 'run-fast', color: '#f59e0b' },
  { id: '3', title: 'Couple Walks', current: 2, target: 3, unit: 'days', icon: 'account-group', color: '#8b5cf6' },
];

const timeRanges = [
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: '3months', label: '3 Months' },
  { id: 'all', label: 'All Time' },
];

export default function ProgressScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const { colors } = useTheme();

  const [selectedRange, setSelectedRange] = useState('week');
  const [selectedMetric, setSelectedMetric] = useState<'steps' | 'calories' | 'exercise'>('steps');

  // Get data based on selected range
  const getCurrentData = () => {
    switch (selectedRange) {
      case 'week':
        return weeklyStepsData;
      case 'month':
        return monthlyStepsData;
      case '3months':
        return threeMonthData;
      case 'all':
        return allTimeData;
      default:
        return weeklyStepsData;
    }
  };

  const currentData = getCurrentData();

  const totalSteps = currentData.reduce((acc, day) => acc + day.steps, 0);
  const avgSteps = Math.round(totalSteps / currentData.length);
  const totalCalories = currentData.reduce((acc, day) => acc + day.calories, 0);
  const totalExercise = currentData.reduce((acc, day) => acc + day.exercise, 0);

  const startWeight = weightHistory[0].weight;
  const currentWeight = weightHistory[weightHistory.length - 1].weight;
  const weightLost = startWeight - currentWeight;

  const getMaxValue = () => {
    switch (selectedMetric) {
      case 'steps':
        return Math.max(...currentData.map(d => d.steps));
      case 'calories':
        return Math.max(...currentData.map(d => d.calories));
      case 'exercise':
        return Math.max(...currentData.map(d => d.exercise));
    }
  };

  const getValue = (data: WeeklyData) => {
    switch (selectedMetric) {
      case 'steps':
        return data.steps;
      case 'calories':
        return data.calories;
      case 'exercise':
        return data.exercise;
    }
  };

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'k';
    }
    return value.toString();
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#0f172a" />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>Progress</Text>
        <Text style={styles.headerSubtitle}>Track your health journey</Text>
      </View>
      <TouchableOpacity style={styles.shareButton}>
        <Ionicons name="share-outline" size={24} color="#006dab" />
      </TouchableOpacity>
    </View>
  );

  const renderTimeRangeSelector = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.timeRangeScroll}
      contentContainerStyle={styles.timeRangeContent}
    >
      {timeRanges.map((range) => (
        <TouchableOpacity
          key={range.id}
          style={[
            styles.timeRangeButton,
            selectedRange === range.id && styles.timeRangeButtonActive,
          ]}
          onPress={() => setSelectedRange(range.id)}
        >
          <Text
            style={[
              styles.timeRangeText,
              selectedRange === range.id && styles.timeRangeTextActive,
            ]}
          >
            {range.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderSummaryCards = () => (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryRow}>
        <TouchableOpacity 
          style={[
            styles.summaryCard,
            selectedMetric === 'steps' && styles.summaryCardActive,
            selectedMetric === 'steps' && { backgroundColor: '#e8f5d6' },
          ]}
          activeOpacity={0.8}
          onPress={() => setSelectedMetric('steps')}
        >
          <View style={styles.summaryGradientWrapper}>
            <MaterialCommunityIcons 
              name="walk" 
              size={28} 
              color={selectedMetric === 'steps' ? '#98be4e' : '#94a3b8'} 
            />
            <Text style={[
              styles.summaryValue,
              selectedMetric === 'steps' && { color: '#98be4e' },
            ]}>
              {formatValue(avgSteps)}
            </Text>
            <Text style={[
              styles.summaryLabel,
              selectedMetric === 'steps' && { color: '#7ba83c' },
            ]}>
              Avg Steps
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.summaryCard,
            selectedMetric === 'calories' && styles.summaryCardActive,
            selectedMetric === 'calories' && { backgroundColor: '#fee2e2' },
          ]}
          activeOpacity={0.8}
          onPress={() => setSelectedMetric('calories')}
        >
          <View style={styles.summaryGradientWrapper}>
            <MaterialCommunityIcons 
              name="fire" 
              size={28} 
              color={selectedMetric === 'calories' ? '#ef4444' : '#94a3b8'} 
            />
            <Text style={[
              styles.summaryValue,
              selectedMetric === 'calories' && { color: '#ef4444' },
            ]}>
              {formatValue(totalCalories)}
            </Text>
            <Text style={[
              styles.summaryLabel,
              selectedMetric === 'calories' && { color: '#dc2626' },
            ]}>
              Total Calories
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.summaryCard,
            selectedMetric === 'exercise' && styles.summaryCardActive,
            selectedMetric === 'exercise' && { backgroundColor: '#fef3c7' },
          ]}
          activeOpacity={0.8}
          onPress={() => setSelectedMetric('exercise')}
        >
          <View style={styles.summaryGradientWrapper}>
            <MaterialCommunityIcons 
              name="run-fast" 
              size={28} 
              color={selectedMetric === 'exercise' ? '#f59e0b' : '#94a3b8'} 
            />
            <Text style={[
              styles.summaryValue,
              selectedMetric === 'exercise' && { color: '#f59e0b' },
            ]}>
              {formatValue(totalExercise)}
            </Text>
            <Text style={[
              styles.summaryLabel,
              selectedMetric === 'exercise' && { color: '#d97706' },
            ]}>
              Exercise (min)
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getChartTitle = () => {
    const metricName = selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1);
    switch (selectedRange) {
      case 'week': return `Weekly ${metricName}`;
      case 'month': return `Monthly ${metricName}`;
      case '3months': return `3-Month ${metricName}`;
      case 'all': return `All Time ${metricName}`;
      default: return `Weekly ${metricName}`;
    }
  };

  const renderWeeklyChart = () => {
    const maxVal = getMaxValue();

    return (
      <View style={styles.chartCard}>
        <View style={[styles.chartHeader, isMobile && styles.chartHeaderMobile]}>
          <Text style={styles.chartTitle}>{getChartTitle()}</Text>
          <View style={styles.chartLegend}>
            <View style={[styles.legendDot, { backgroundColor: '#006dab' }]} />
            <Text style={styles.legendText}>
              {selectedMetric === 'steps' ? 'Steps' : 
               selectedMetric === 'calories' ? 'Calories' : 'Minutes'}
            </Text>
          </View>
        </View>

        <View style={styles.chartContainer}>
          {currentData.map((data, index) => {
            const value = getValue(data);
            const barHeight = (value / maxVal) * 100; // Max height is 100px
            const isToday = selectedRange === 'week' && index === new Date().getDay() - 1;

            return (
              <View key={data.day} style={styles.chartBar}>
                <Text style={[styles.chartValue, isMobile && styles.chartValueMobile]}>
                  {formatValue(value)}
                </Text>
                <View style={styles.chartBarContainer}>
                  <View style={{ flex: 1 }} />
                  <LinearGradient
                    colors={isToday ? ['#98be4e', '#7ba83c'] : ['#006dab', '#005a8f']}
                    style={[styles.chartBarFill, { height: barHeight }]}
                  />
                </View>
                <Text style={[styles.chartDay, isToday && styles.chartDayActive]}>
                  {data.day}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderWeightChart = () => {
    const maxWeight = Math.max(...weightHistory.map(w => w.weight));
    const minWeight = Math.min(...weightHistory.map(w => w.weight));

    return (
      <View style={styles.chartCard}>
        <View style={[styles.chartHeader, isMobile && styles.chartHeaderMobile]}>
          <Text style={styles.chartTitle}>Weight Progress</Text>
          <View style={styles.weightSummary}>
            <Text style={styles.weightLostText}>
              {weightLost.toFixed(1)} kg lost
            </Text>
          </View>
        </View>

        <View style={styles.weightStats}>
          <View style={styles.weightStat}>
            <Text style={styles.weightStatLabel}>Start</Text>
            <Text style={styles.weightStatValue}>{startWeight} kg</Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color="#64748b" />
          <View style={styles.weightStat}>
            <Text style={styles.weightStatLabel}>Current</Text>
            <Text style={[styles.weightStatValue, { color: '#98be4e' }]}>
              {currentWeight} kg
            </Text>
          </View>
        </View>

        <View style={styles.weightBarChart}>
          {weightHistory.map((point, index) => {
            // Higher weight = taller bar (actual weight visualization)
            const range = maxWeight - minWeight || 1;
            const barHeight = ((point.weight - minWeight) / range) * 60 + 20; // Min 20px, max 80px
            const isLast = index === weightHistory.length - 1;
            
            return (
              <View key={point.date} style={styles.weightBarItem}>
                <View style={styles.weightBarContainer}>
                  <View style={{ flex: 1 }} />
                  <LinearGradient
                    colors={isLast ? ['#98be4e', '#7ba83c'] : ['#006dab', '#005a8f']}
                    style={[styles.weightBarFill, { height: barHeight }]}
                  />
                </View>
                <Text style={styles.weightBarLabel}>{point.weight}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderGoalProgress = () => (
    <View style={styles.goalsSection}>
      <Text style={styles.sectionTitle}>Goal Progress</Text>
      
      {goalProgress.map((goal) => {
        const percent = Math.min((goal.current / goal.target) * 100, 100);
        
        return (
          <View key={goal.id} style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <View style={[styles.goalIcon, { backgroundColor: goal.color + '20' }]}>
                <MaterialCommunityIcons 
                  name={goal.icon as any} 
                  size={24} 
                  color={goal.color} 
                />
              </View>
              <View style={styles.goalInfo}>
                <Text style={styles.goalTitle}>{goal.title}</Text>
                <Text style={styles.goalStats}>
                  <Text style={{ color: goal.color, fontWeight: '800' }}>
                    {goal.current}
                  </Text>
                  {' / '}{goal.target} {goal.unit}
                </Text>
              </View>
              <Text style={[styles.goalPercent, { color: goal.color }]}>
                {Math.round(percent)}%
              </Text>
            </View>
            <View style={styles.goalProgressBar}>
              <View 
                style={[
                  styles.goalProgressFill,
                  { width: `${percent}%`, backgroundColor: goal.color }
                ]} 
              />
            </View>
          </View>
        );
      })}
    </View>
  );

  const renderAchievements = () => (
    <View style={styles.achievementsSection}>
      <Text style={styles.sectionTitle}>Recent Achievements</Text>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.achievementsScroll}
      >
        <View style={styles.achievementCard}>
          <View style={[styles.achievementBadge, { backgroundColor: '#fef3c7' }]}>
            <Text style={styles.achievementEmoji}>🔥</Text>
          </View>
          <Text style={styles.achievementTitle}>7-Day Streak</Text>
          <Text style={styles.achievementDesc}>Logged activity daily</Text>
        </View>

        <View style={styles.achievementCard}>
          <View style={[styles.achievementBadge, { backgroundColor: '#e8f5d6', overflow: 'hidden' }]}>
            <Image 
              source={require('../../assets/images/run_male.jpg')} 
              style={styles.coupleAchievementImage}
              contentFit="cover"
            />
          </View>
          <Text style={styles.achievementTitle}>10K Steps</Text>
          <Text style={styles.achievementDesc}>Reached goal 3 times</Text>
        </View>

        <View style={styles.achievementCard}>
          <View style={[styles.achievementBadge, { backgroundColor: '#ede9fe', overflow: 'hidden' }]}>
            <Image 
              source={require('../../assets/images/couple.jpg')} 
              style={styles.coupleAchievementImage}
              contentFit="cover"
            />
          </View>
          <Text style={styles.achievementTitle}>Partner Goals</Text>
          <Text style={styles.achievementDesc}>4 couple walks done</Text>
        </View>

        <View style={styles.achievementCard}>
          <View style={[styles.achievementBadge, { backgroundColor: '#dbeafe' }]}>
            <Text style={styles.achievementEmoji}>⚖️</Text>
          </View>
          <Text style={styles.achievementTitle}>5kg Lost</Text>
          <Text style={styles.achievementDesc}>Milestone reached!</Text>
        </View>
      </ScrollView>
    </View>
  );

  const renderCoupleProgress = () => (
    <View style={styles.coupleSection}>
      <View style={styles.coupleCard}>
        <View style={styles.coupleHeader}>
          <View style={styles.coupleTitleRow}>
            <Image 
              source={require('../../assets/images/couple.jpg')} 
              style={styles.coupleJourneyImage}
              contentFit="cover"
            />
            <Text style={styles.coupleTitle}>Couple Journey</Text>
          </View>
          <Text style={styles.coupleSubtitle}>8 weeks together</Text>
        </View>
        
        <View style={styles.coupleStats}>
          <View style={styles.coupleStat}>
            <Text style={styles.coupleStatValue}>24</Text>
            <Text style={styles.coupleStatLabel}>Walks Together</Text>
          </View>
          <View style={styles.coupleStatDivider} />
          <View style={styles.coupleStat}>
            <Text style={styles.coupleStatValue}>10.5</Text>
            <Text style={styles.coupleStatLabel}>kg Lost (Combined)</Text>
          </View>
          <View style={styles.coupleStatDivider} />
          <View style={styles.coupleStat}>
            <Text style={styles.coupleStatValue}>95%</Text>
            <Text style={styles.coupleStatLabel}>Goal Sync</Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderHeader()}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {renderTimeRangeSelector()}
          {renderSummaryCards()}
          {renderWeeklyChart()}
          {renderWeightChart()}
          {renderGoalProgress()}
          {renderCoupleProgress()}
          {renderAchievements()}
        </View>
      </ScrollView>
      
      {/* Bottom Navigation */}
      <BottomNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
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
  headerCenter: { flex: 1, marginLeft: 16 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  headerSubtitle: { fontSize: 14, color: '#64748b', marginTop: 2 },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { flexGrow: 1, paddingBottom: isWeb ? 40 : 100 },
  content: {
    padding: isWeb ? 40 : 16,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  timeRangeScroll: { marginBottom: 20, marginHorizontal: -16 },
  timeRangeContent: { paddingHorizontal: 16, gap: 8 },
  timeRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  timeRangeButtonActive: {
    backgroundColor: '#006dab',
    borderColor: '#006dab',
  },
  timeRangeText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  timeRangeTextActive: { color: '#ffffff' },
  summaryContainer: { gap: 12, marginBottom: 20 },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
  },
  summaryCardActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryGradientWrapper: {
    padding: 16,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 16,
  },
  summaryGradient: {
    padding: 16,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
  },
  summaryValue: { fontSize: 22, fontWeight: '800', color: '#94a3b8', marginTop: 8 },
  summaryLabel: { fontSize: 11, color: '#94a3b8', marginTop: 4, textAlign: 'center' },
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 8,
  },
  chartHeaderMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  chartTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  chartLegend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: '#64748b' },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    paddingTop: 20,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    height: 120,
  },
  chartValue: { fontSize: 9, fontWeight: '600', color: '#64748b', marginBottom: 4 },
  chartValueMobile: { fontSize: 8 },
  chartBarContainer: {
    width: 24,
    height: 100,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    overflow: 'hidden',
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 6,
  },
  chartDay: { fontSize: 12, fontWeight: '600', color: '#64748b', marginTop: 8 },
  chartDayActive: { color: '#98be4e', fontWeight: '800' },
  weightSummary: {
    backgroundColor: '#e8f5d6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  weightLostText: { fontSize: 13, fontWeight: '700', color: '#98be4e' },
  weightStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
  },
  weightStat: { alignItems: 'center' },
  weightStatLabel: { fontSize: 11, color: '#64748b' },
  weightStatValue: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  weightBarChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 100,
    paddingHorizontal: 10,
  },
  weightBarItem: {
    flex: 1,
    alignItems: 'center',
    height: 100,
  },
  weightBarContainer: {
    width: 20,
    height: 80,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  weightBarFill: {
    width: '100%',
    borderRadius: 4,
  },
  weightBarLabel: { fontSize: 9, color: '#64748b', marginTop: 6 },
  weightChartContainer: {
    flexDirection: 'row',
    height: 120,
    marginBottom: 8,
  },
  weightYAxis: {
    width: 40,
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  yAxisLabel: { fontSize: 10, color: '#94a3b8', textAlign: 'right' },
  weightChartArea: {
    flex: 1,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  lineChartContainer: {
    flex: 1,
    position: 'relative',
  },
  dataPoint: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -6,
    marginBottom: -6,
  },
  dataPointDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#006dab',
  },
  dataPointDotActive: {
    backgroundColor: '#98be4e',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#98be4e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  weightXAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 40,
    marginTop: 4,
  },
  xAxisLabel: { fontSize: 10, color: '#94a3b8' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  goalsSection: { marginBottom: 24 },
  goalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalInfo: { flex: 1, marginLeft: 12 },
  goalTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  goalStats: { fontSize: 13, color: '#64748b', marginTop: 2 },
  goalPercent: { fontSize: 18, fontWeight: '800' },
  goalProgressBar: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  coupleSection: { marginBottom: 24 },
  coupleCard: {
    borderRadius: 20,
    padding: 24,
    backgroundColor: '#ede9fe',
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  coupleHeader: { marginBottom: 20 },
  coupleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  coupleJourneyImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  coupleTitle: { fontSize: 20, fontWeight: '800', color: '#7c3aed' },
  coupleSubtitle: { fontSize: 14, color: '#8b5cf6', marginTop: 4 },
  coupleStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  coupleStat: { alignItems: 'center' },
  coupleStatValue: { fontSize: 28, fontWeight: '800', color: '#7c3aed' },
  coupleStatLabel: { fontSize: 11, color: '#8b5cf6', marginTop: 4, textAlign: 'center' },
  coupleStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#c4b5fd',
  },
  achievementsSection: { marginBottom: 24 },
  achievementsScroll: { gap: 12, paddingRight: 16 },
  achievementCard: {
    width: 130,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    marginRight: 12,
  },
  achievementBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  achievementEmoji: { fontSize: 26 },
  coupleAchievementImage: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  achievementTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
  achievementDesc: { fontSize: 10, color: '#64748b', marginTop: 4, textAlign: 'center' },
});
