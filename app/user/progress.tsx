import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
import BottomNavBar from '@/components/navigation/BottomNavBar';

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

const weeklyStepsData: WeeklyData[] = [
  { day: 'Mon', steps: 8500, calories: 320, exercise: 45 },
  { day: 'Tue', steps: 6200, calories: 250, exercise: 30 },
  { day: 'Wed', steps: 10200, calories: 420, exercise: 60 },
  { day: 'Thu', steps: 7800, calories: 300, exercise: 40 },
  { day: 'Fri', steps: 9100, calories: 380, exercise: 55 },
  { day: 'Sat', steps: 11500, calories: 480, exercise: 75 },
  { day: 'Sun', steps: 5600, calories: 210, exercise: 25 },
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
  { id: '1', title: 'Daily Steps', current: 8400, target: 10000, unit: 'steps', icon: 'walk', color: '#22c55e' },
  { id: '2', title: 'Weekly Exercise', current: 210, target: 270, unit: 'min', icon: 'run-fast', color: '#f59e0b' },
  { id: '3', title: 'Weight Loss', current: 5.2, target: 10, unit: 'kg', icon: 'scale-bathroom', color: '#006dab' },
  { id: '4', title: 'Couple Walks', current: 2, target: 3, unit: 'days', icon: 'account-group', color: '#8b5cf6' },
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

  const [selectedRange, setSelectedRange] = useState('week');
  const [selectedMetric, setSelectedMetric] = useState<'steps' | 'calories' | 'exercise'>('steps');

  const totalWeeklySteps = weeklyStepsData.reduce((acc, day) => acc + day.steps, 0);
  const avgDailySteps = Math.round(totalWeeklySteps / 7);
  const totalWeeklyCalories = weeklyStepsData.reduce((acc, day) => acc + day.calories, 0);
  const totalWeeklyExercise = weeklyStepsData.reduce((acc, day) => acc + day.exercise, 0);

  const startWeight = weightHistory[0].weight;
  const currentWeight = weightHistory[weightHistory.length - 1].weight;
  const weightLost = startWeight - currentWeight;

  const getMaxValue = () => {
    switch (selectedMetric) {
      case 'steps':
        return Math.max(...weeklyStepsData.map(d => d.steps));
      case 'calories':
        return Math.max(...weeklyStepsData.map(d => d.calories));
      case 'exercise':
        return Math.max(...weeklyStepsData.map(d => d.exercise));
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
          ]}
          onPress={() => setSelectedMetric('steps')}
        >
          <LinearGradient
            colors={selectedMetric === 'steps' ? ['#22c55e', '#16a34a'] : ['#f1f5f9', '#f1f5f9']}
            style={styles.summaryGradient}
          >
            <MaterialCommunityIcons 
              name="walk" 
              size={28} 
              color={selectedMetric === 'steps' ? '#fff' : '#22c55e'} 
            />
            <Text style={[
              styles.summaryValue,
              selectedMetric === 'steps' && styles.summaryValueActive,
            ]}>
              {avgDailySteps.toLocaleString()}
            </Text>
            <Text style={[
              styles.summaryLabel,
              selectedMetric === 'steps' && styles.summaryLabelActive,
            ]}>
              Avg Daily Steps
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.summaryCard,
            selectedMetric === 'calories' && styles.summaryCardActive,
          ]}
          onPress={() => setSelectedMetric('calories')}
        >
          <LinearGradient
            colors={selectedMetric === 'calories' ? ['#ef4444', '#dc2626'] : ['#f1f5f9', '#f1f5f9']}
            style={styles.summaryGradient}
          >
            <MaterialCommunityIcons 
              name="fire" 
              size={28} 
              color={selectedMetric === 'calories' ? '#fff' : '#ef4444'} 
            />
            <Text style={[
              styles.summaryValue,
              selectedMetric === 'calories' && styles.summaryValueActive,
            ]}>
              {totalWeeklyCalories.toLocaleString()}
            </Text>
            <Text style={[
              styles.summaryLabel,
              selectedMetric === 'calories' && styles.summaryLabelActive,
            ]}>
              Weekly Calories
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryRow}>
        <TouchableOpacity 
          style={[
            styles.summaryCard,
            selectedMetric === 'exercise' && styles.summaryCardActive,
          ]}
          onPress={() => setSelectedMetric('exercise')}
        >
          <LinearGradient
            colors={selectedMetric === 'exercise' ? ['#f59e0b', '#d97706'] : ['#f1f5f9', '#f1f5f9']}
            style={styles.summaryGradient}
          >
            <MaterialCommunityIcons 
              name="run-fast" 
              size={28} 
              color={selectedMetric === 'exercise' ? '#fff' : '#f59e0b'} 
            />
            <Text style={[
              styles.summaryValue,
              selectedMetric === 'exercise' && styles.summaryValueActive,
            ]}>
              {totalWeeklyExercise}
            </Text>
            <Text style={[
              styles.summaryLabel,
              selectedMetric === 'exercise' && styles.summaryLabelActive,
            ]}>
              Exercise (min)
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.summaryCard}>
          <LinearGradient
            colors={['#006dab', '#005a8f']}
            style={styles.summaryGradient}
          >
            <MaterialCommunityIcons name="scale-bathroom" size={28} color="#fff" />
            <Text style={[styles.summaryValue, styles.summaryValueActive]}>
              -{weightLost.toFixed(1)}
            </Text>
            <Text style={[styles.summaryLabel, styles.summaryLabelActive]}>
              kg Lost
            </Text>
          </LinearGradient>
        </View>
      </View>
    </View>
  );

  const renderWeeklyChart = () => {
    const maxVal = getMaxValue();

    return (
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>
            Weekly {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}
          </Text>
          <View style={styles.chartLegend}>
            <View style={[styles.legendDot, { backgroundColor: '#006dab' }]} />
            <Text style={styles.legendText}>
              {selectedMetric === 'steps' ? 'Steps' : 
               selectedMetric === 'calories' ? 'Calories' : 'Minutes'}
            </Text>
          </View>
        </View>

        <View style={styles.chartContainer}>
          {weeklyStepsData.map((data, index) => {
            const value = getValue(data);
            const heightPercent = (value / maxVal) * 100;
            const isToday = index === new Date().getDay() - 1;

            return (
              <View key={data.day} style={styles.chartBar}>
                <Text style={styles.chartValue}>
                  {selectedMetric === 'steps' 
                    ? (value / 1000).toFixed(1) + 'k' 
                    : value}
                </Text>
                <View style={styles.chartBarContainer}>
                  <LinearGradient
                    colors={isToday ? ['#98be4e', '#7ba83c'] : ['#006dab', '#005a8f']}
                    style={[styles.chartBarFill, { height: `${heightPercent}%` }]}
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
    const range = maxWeight - minWeight || 1;

    return (
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Weight Progress</Text>
          <View style={styles.weightStats}>
            <View style={styles.weightStat}>
              <Text style={styles.weightStatLabel}>Start</Text>
              <Text style={styles.weightStatValue}>{startWeight} kg</Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color="#64748b" />
            <View style={styles.weightStat}>
              <Text style={styles.weightStatLabel}>Current</Text>
              <Text style={[styles.weightStatValue, { color: '#22c55e' }]}>
                {currentWeight} kg
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.weightChartContainer}>
          <View style={styles.weightYAxis}>
            <Text style={styles.yAxisLabel}>{maxWeight}</Text>
            <Text style={styles.yAxisLabel}>{((maxWeight + minWeight) / 2).toFixed(1)}</Text>
            <Text style={styles.yAxisLabel}>{minWeight}</Text>
          </View>
          <View style={styles.weightChartArea}>
            {/* Grid lines */}
            <View style={styles.gridLine} />
            <View style={[styles.gridLine, { top: '50%' }]} />
            <View style={[styles.gridLine, { top: '100%' }]} />
            
            {/* Line chart */}
            <View style={styles.lineChartContainer}>
              {weightHistory.map((point, index) => {
                const yPosition = ((maxWeight - point.weight) / range) * 100;
                const isLast = index === weightHistory.length - 1;
                
                return (
                  <View 
                    key={point.date} 
                    style={[
                      styles.dataPoint,
                      { 
                        bottom: `${100 - yPosition}%`,
                        left: `${(index / (weightHistory.length - 1)) * 100}%` 
                      }
                    ]}
                  >
                    <View 
                      style={[
                        styles.dataPointDot,
                        isLast && styles.dataPointDotActive,
                      ]} 
                    />
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.weightXAxis}>
          {weightHistory.map((point, index) => (
            index % 2 === 0 && (
              <Text key={point.date} style={styles.xAxisLabel}>{point.date}</Text>
            )
          ))}
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
          <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.achievementBadge}>
            <Text style={styles.achievementEmoji}>🔥</Text>
          </LinearGradient>
          <Text style={styles.achievementTitle}>7-Day Streak</Text>
          <Text style={styles.achievementDesc}>Logged activity daily</Text>
        </View>

        <View style={styles.achievementCard}>
          <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.achievementBadge}>
            <Text style={styles.achievementEmoji}>🏃</Text>
          </LinearGradient>
          <Text style={styles.achievementTitle}>10K Steps</Text>
          <Text style={styles.achievementDesc}>Reached goal 3 times</Text>
        </View>

        <View style={styles.achievementCard}>
          <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.achievementBadge}>
            <Text style={styles.achievementEmoji}>👫</Text>
          </LinearGradient>
          <Text style={styles.achievementTitle}>Partner Goals</Text>
          <Text style={styles.achievementDesc}>4 couple walks done</Text>
        </View>

        <View style={styles.achievementCard}>
          <LinearGradient colors={['#006dab', '#005a8f']} style={styles.achievementBadge}>
            <Text style={styles.achievementEmoji}>⚖️</Text>
          </LinearGradient>
          <Text style={styles.achievementTitle}>5kg Lost</Text>
          <Text style={styles.achievementDesc}>Milestone reached!</Text>
        </View>
      </ScrollView>
    </View>
  );

  const renderCoupleProgress = () => (
    <View style={styles.coupleSection}>
      <LinearGradient
        colors={['#8b5cf6', '#7c3aed']}
        style={styles.coupleCard}
      >
        <View style={styles.coupleHeader}>
          <Text style={styles.coupleTitle}>👫 Couple Journey</Text>
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
      </LinearGradient>
    </View>
  );

  return (
    <View style={styles.container}>
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
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
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
  },
  summaryCardActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryGradient: {
    padding: 16,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
  },
  summaryValue: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginTop: 8 },
  summaryValueActive: { color: '#ffffff' },
  summaryLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },
  summaryLabelActive: { color: 'rgba(255,255,255,0.9)' },
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
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
  },
  chartValue: { fontSize: 10, fontWeight: '600', color: '#64748b', marginBottom: 4 },
  chartBarContainer: {
    width: '60%',
    height: '100%',
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 6,
  },
  chartDay: { fontSize: 12, fontWeight: '600', color: '#64748b', marginTop: 8 },
  chartDayActive: { color: '#98be4e', fontWeight: '800' },
  weightStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weightStat: { alignItems: 'center' },
  weightStatLabel: { fontSize: 10, color: '#64748b' },
  weightStatValue: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
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
    backgroundColor: '#22c55e',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#22c55e',
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
  },
  coupleHeader: { marginBottom: 20 },
  coupleTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff' },
  coupleSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  coupleStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  coupleStat: { alignItems: 'center' },
  coupleStatValue: { fontSize: 28, fontWeight: '800', color: '#ffffff' },
  coupleStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 4, textAlign: 'center' },
  coupleStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  achievementsSection: { marginBottom: 24 },
  achievementsScroll: { gap: 12 },
  achievementCard: {
    width: 140,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  achievementBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  achievementEmoji: { fontSize: 28 },
  achievementTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
  achievementDesc: { fontSize: 11, color: '#64748b', marginTop: 4, textAlign: 'center' },
});
