import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Modal,
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

// Status types for log entries
type LogStatus = 'complete' | 'partial' | 'missed' | 'pending';

interface DailyLog {
  coupleId: string;
  maleStatus: string;
  femaleStatus: string;
  date: string;
  steps: { male: LogStatus; female: LogStatus };
  exercise: { male: LogStatus; female: LogStatus };
  diet: { male: LogStatus; female: LogStatus };
  weight: { male: LogStatus; female: LogStatus };
  coupleWalking: LogStatus;
  feedback: { male: LogStatus; female: LogStatus };
}

interface CoupleDetails {
  coupleId: string;
  maleName: string;
  femaleName: string;
  maleEmail: string;
  femaleEmail: string;
  malePhone: string;
  femalePhone: string;
  enrollmentDate: string;
  maleStatus: string;
  femaleStatus: string;
}

interface DetailedLogEntry {
  metric: string;
  icon: string;
  iconFamily: 'Ionicons' | 'MaterialCommunityIcons';
  maleValue: string;
  femaleValue: string;
  maleStatus: LogStatus;
  femaleStatus: LogStatus;
  unit: string;
}

// Mock couple details data
const mockCoupleDetails: Record<string, CoupleDetails> = {
  'C_001': {
    coupleId: 'C_001',
    maleName: 'John Doe',
    femaleName: 'Sarah Doe',
    maleEmail: 'john@example.com',
    femaleEmail: 'sarah@example.com',
    malePhone: '+91 98765 43210',
    femalePhone: '+91 98765 43211',
    enrollmentDate: '2024-10-01',
    maleStatus: 'Active',
    femaleStatus: 'Active',
  },
  'C_002': {
    coupleId: 'C_002',
    maleName: 'Raj Kumar',
    femaleName: 'Priya Kumar',
    maleEmail: 'raj@example.com',
    femaleEmail: 'priya@example.com',
    malePhone: '+91 98765 43212',
    femalePhone: '+91 98765 43213',
    enrollmentDate: '2024-10-15',
    maleStatus: 'Active',
    femaleStatus: 'Active',
  },
  'C_003': {
    coupleId: 'C_003',
    maleName: 'Anand M',
    femaleName: 'Meena S',
    maleEmail: 'anand@example.com',
    femaleEmail: 'meena@example.com',
    malePhone: '+91 98765 43214',
    femalePhone: '+91 98765 43215',
    enrollmentDate: '2024-11-01',
    maleStatus: 'Active',
    femaleStatus: 'Active',
  },
  'C_004': {
    coupleId: 'C_004',
    maleName: 'Vikram S',
    femaleName: 'Lakshmi V',
    maleEmail: 'vikram@example.com',
    femaleEmail: 'lakshmi@example.com',
    malePhone: '+91 98765 43216',
    femalePhone: '+91 98765 43217',
    enrollmentDate: '2024-11-10',
    maleStatus: 'Active',
    femaleStatus: 'Inactive',
  },
  'C_005': {
    coupleId: 'C_005',
    maleName: 'Suresh R',
    femaleName: 'Geetha R',
    maleEmail: 'suresh@example.com',
    femaleEmail: 'geetha@example.com',
    malePhone: '+91 98765 43218',
    femalePhone: '+91 98765 43219',
    enrollmentDate: '2024-11-15',
    maleStatus: 'Active',
    femaleStatus: 'Active',
  },
};

// Mock detailed log values
const mockDetailedLogs: Record<string, DetailedLogEntry[]> = {
  'C_001': [
    { metric: 'Steps', icon: 'walk', iconFamily: 'MaterialCommunityIcons', maleValue: '8,542', femaleValue: '7,231', maleStatus: 'complete', femaleStatus: 'complete', unit: 'steps' },
    { metric: 'Exercise', icon: 'fitness', iconFamily: 'Ionicons', maleValue: '45 min', femaleValue: '30 min', maleStatus: 'complete', femaleStatus: 'partial', unit: '' },
    { metric: 'Diet Log', icon: 'nutrition', iconFamily: 'Ionicons', maleValue: 'Not logged', femaleValue: '3 meals', maleStatus: 'missed', femaleStatus: 'complete', unit: '' },
    { metric: 'Weight', icon: 'scale-bathroom', iconFamily: 'MaterialCommunityIcons', maleValue: 'Pending', femaleValue: '62.5 kg', maleStatus: 'pending', femaleStatus: 'complete', unit: '' },
    { metric: 'Couple Walking', icon: 'people', iconFamily: 'Ionicons', maleValue: '30 min', femaleValue: '30 min', maleStatus: 'complete', femaleStatus: 'complete', unit: '' },
    { metric: 'Feedback', icon: 'chatbubble', iconFamily: 'Ionicons', maleValue: 'Submitted', femaleValue: 'Pending', maleStatus: 'complete', femaleStatus: 'pending', unit: '' },
  ],
  'C_002': [
    { metric: 'Steps', icon: 'walk', iconFamily: 'MaterialCommunityIcons', maleValue: '6,120', femaleValue: '2,100', maleStatus: 'complete', femaleStatus: 'missed', unit: 'steps' },
    { metric: 'Exercise', icon: 'fitness', iconFamily: 'Ionicons', maleValue: '20 min', femaleValue: 'Not logged', maleStatus: 'partial', femaleStatus: 'missed', unit: '' },
    { metric: 'Diet Log', icon: 'nutrition', iconFamily: 'Ionicons', maleValue: '3 meals', femaleValue: '1 meal', maleStatus: 'complete', femaleStatus: 'partial', unit: '' },
    { metric: 'Weight', icon: 'scale-bathroom', iconFamily: 'MaterialCommunityIcons', maleValue: '75.2 kg', femaleValue: 'Not logged', maleStatus: 'complete', femaleStatus: 'missed', unit: '' },
    { metric: 'Couple Walking', icon: 'people', iconFamily: 'Ionicons', maleValue: 'Not done', femaleValue: 'Not done', maleStatus: 'missed', femaleStatus: 'missed', unit: '' },
    { metric: 'Feedback', icon: 'chatbubble', iconFamily: 'Ionicons', maleValue: 'Pending', femaleValue: 'Not logged', maleStatus: 'pending', femaleStatus: 'missed', unit: '' },
  ],
};

// Mock data for daily logs
const mockDailyLogs: DailyLog[] = [
  {
    coupleId: 'C_001',
    maleStatus: 'Active',
    femaleStatus: 'Active',
    date: '2024-11-28',
    steps: { male: 'complete', female: 'complete' },
    exercise: { male: 'complete', female: 'partial' },
    diet: { male: 'missed', female: 'complete' },
    weight: { male: 'pending', female: 'complete' },
    coupleWalking: 'complete',
    feedback: { male: 'complete', female: 'pending' },
  },
  {
    coupleId: 'C_002',
    maleStatus: 'Active',
    femaleStatus: 'Active',
    date: '2024-11-28',
    steps: { male: 'complete', female: 'missed' },
    exercise: { male: 'partial', female: 'missed' },
    diet: { male: 'complete', female: 'partial' },
    weight: { male: 'complete', female: 'missed' },
    coupleWalking: 'missed',
    feedback: { male: 'pending', female: 'missed' },
  },
  {
    coupleId: 'C_003',
    maleStatus: 'Active',
    femaleStatus: 'Active',
    date: '2024-11-28',
    steps: { male: 'complete', female: 'complete' },
    exercise: { male: 'complete', female: 'complete' },
    diet: { male: 'complete', female: 'complete' },
    weight: { male: 'complete', female: 'complete' },
    coupleWalking: 'complete',
    feedback: { male: 'complete', female: 'complete' },
  },
  {
    coupleId: 'C_004',
    maleStatus: 'Active',
    femaleStatus: 'Inactive',
    date: '2024-11-28',
    steps: { male: 'partial', female: 'pending' },
    exercise: { male: 'missed', female: 'pending' },
    diet: { male: 'partial', female: 'pending' },
    weight: { male: 'missed', female: 'pending' },
    coupleWalking: 'pending',
    feedback: { male: 'missed', female: 'pending' },
  },
  {
    coupleId: 'C_005',
    maleStatus: 'Active',
    femaleStatus: 'Active',
    date: '2024-11-28',
    steps: { male: 'complete', female: 'partial' },
    exercise: { male: 'complete', female: 'complete' },
    diet: { male: 'missed', female: 'missed' },
    weight: { male: 'complete', female: 'partial' },
    coupleWalking: 'partial',
    feedback: { male: 'complete', female: 'complete' },
  },
];

// Metric columns for the grid
const metrics = [
  { id: 'steps', label: 'Steps', icon: 'walk', iconFamily: 'MaterialCommunityIcons' },
  { id: 'exercise', label: 'Exercise', icon: 'fitness', iconFamily: 'Ionicons' },
  { id: 'diet', label: 'Diet', icon: 'nutrition', iconFamily: 'Ionicons' },
  { id: 'weight', label: 'Weight', icon: 'scale-bathroom', iconFamily: 'MaterialCommunityIcons' },
  { id: 'coupleWalking', label: 'Couple Walk', icon: 'people', iconFamily: 'Ionicons' },
  { id: 'feedback', label: 'Feedback', icon: 'chatbubble', iconFamily: 'Ionicons' },
];

export default function AdminMonitoringScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1024;

  const [selectedDate, setSelectedDate] = useState('2024-11-28');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'complete' | 'partial' | 'missed'>('all');
  const [selectedGroup, setSelectedGroup] = useState<'all' | 'study' | 'control'>('all');
  const [logs] = useState<DailyLog[]>(mockDailyLogs);
  const [selectedCouple, setSelectedCouple] = useState<DailyLog | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPastLogs, setShowPastLogs] = useState(false);

  // Mock past logs data
  const getPastLogsForCouple = (coupleId: string) => {
    const baseDate = new Date('2024-11-28');
    const pastLogs = [];
    for (let i = 1; i <= 14; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      pastLogs.push({
        date: dateStr,
        steps: { male: ['complete', 'partial', 'missed'][Math.floor(Math.random() * 3)] as LogStatus, female: ['complete', 'partial', 'missed'][Math.floor(Math.random() * 3)] as LogStatus },
        exercise: { male: ['complete', 'partial', 'missed'][Math.floor(Math.random() * 3)] as LogStatus, female: ['complete', 'partial', 'missed'][Math.floor(Math.random() * 3)] as LogStatus },
        diet: { male: ['complete', 'partial', 'missed'][Math.floor(Math.random() * 3)] as LogStatus, female: ['complete', 'partial', 'missed'][Math.floor(Math.random() * 3)] as LogStatus },
        weight: { male: ['complete', 'partial', 'missed', 'pending'][Math.floor(Math.random() * 4)] as LogStatus, female: ['complete', 'partial', 'missed', 'pending'][Math.floor(Math.random() * 4)] as LogStatus },
        coupleWalking: ['complete', 'partial', 'missed'][Math.floor(Math.random() * 3)] as LogStatus,
        feedback: { male: ['complete', 'partial', 'missed'][Math.floor(Math.random() * 3)] as LogStatus, female: ['complete', 'partial', 'missed'][Math.floor(Math.random() * 3)] as LogStatus },
      });
    }
    return pastLogs;
  };

  const handleCoupleClick = (log: DailyLog) => {
    // Navigate to couple dashboard showing both husband and wife details
    router.push(`/admin/user-dashboard?coupleId=${log.coupleId}` as any);
  };

  // Filter logs based on search and filters
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.coupleId.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedStatus === 'all') return matchesSearch;
    
    // Check if any metric has the selected status (check all metrics)
    const hasStatus = 
      log.steps.male === selectedStatus ||
      log.steps.female === selectedStatus ||
      log.exercise.male === selectedStatus ||
      log.exercise.female === selectedStatus ||
      log.diet.male === selectedStatus ||
      log.diet.female === selectedStatus ||
      log.weight.male === selectedStatus ||
      log.weight.female === selectedStatus ||
      log.coupleWalking === selectedStatus ||
      log.feedback.male === selectedStatus ||
      log.feedback.female === selectedStatus;
    
    return matchesSearch && hasStatus;
  });

  // Get count of couples with specific status
  const getCoupleCountByStatus = (status: LogStatus) => {
    return logs.filter(log => {
      return (
        log.steps.male === status ||
        log.steps.female === status ||
        log.exercise.male === status ||
        log.exercise.female === status ||
        log.diet.male === status ||
        log.diet.female === status ||
        log.weight.male === status ||
        log.weight.female === status ||
        log.coupleWalking === status ||
        log.feedback.male === status ||
        log.feedback.female === status
      );
    }).length;
  };

  // Get status indicator
  const getStatusIcon = (status: LogStatus) => {
    switch (status) {
      case 'complete':
        return { icon: 'checkmark-circle', color: COLORS.success };
      case 'partial':
        return { icon: 'alert-circle', color: COLORS.warning };
      case 'missed':
        return { icon: 'close-circle', color: COLORS.error };
      case 'pending':
        return { icon: 'ellipse-outline', color: COLORS.textMuted };
    }
  };

  // Calculate summary stats
  const getSummaryStats = () => {
    const total = logs.length * 2; // Male and female per couple
    let complete = 0;
    let partial = 0;
    let missed = 0;

    logs.forEach(log => {
      ['steps', 'exercise', 'diet', 'weight', 'feedback'].forEach(metric => {
        const val = log[metric as keyof DailyLog] as { male: LogStatus; female: LogStatus };
        if (val.male === 'complete') complete++;
        else if (val.male === 'partial') partial++;
        else if (val.male === 'missed') missed++;
        if (val.female === 'complete') complete++;
        else if (val.female === 'partial') partial++;
        else if (val.female === 'missed') missed++;
      });
    });

    return { complete, partial, missed, total: total * 5 };
  };

  const stats = getSummaryStats();

  // Header with date picker and filters
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.headerTitle}>Monitoring & Reports</Text>
          <Text style={styles.headerSubtitle}>Track daily logging activity</Text>
        </View>
        <TouchableOpacity style={styles.exportButton}>
          <Ionicons name="download" size={18} color="#fff" />
          <Text style={styles.exportButtonText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Date and Filters */}
      <View style={[styles.filtersContainer, isMobile && styles.filtersContainerMobile]}>
        <View style={styles.datePickerContainer}>
          <Ionicons name="calendar" size={18} color={COLORS.primary} />
          <TextInput
            style={styles.dateInput}
            value={selectedDate}
            onChangeText={setSelectedDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search couple ID..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.filterChips}>
          {['all', 'complete', 'partial', 'missed'].map(status => (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, selectedStatus === status && styles.filterChipActive]}
              onPress={() => setSelectedStatus(status as any)}
            >
              <Text style={[styles.filterChipText, selectedStatus === status && styles.filterChipTextActive]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  // Summary Stats Cards
  const renderSummaryStats = () => (
    <View style={[styles.statsContainer, isMobile && styles.statsContainerMobile]}>
      <TouchableOpacity 
        style={[styles.statCard, { borderLeftColor: COLORS.success }, selectedStatus === 'complete' && styles.statCardActive]}
        onPress={() => setSelectedStatus(selectedStatus === 'complete' ? 'all' : 'complete')}
        activeOpacity={0.7}
      >
        <View style={[styles.statIcon, { backgroundColor: COLORS.success + '15' }]}>
          <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
        </View>
        <View>
          <Text style={styles.statValue}>{stats.complete}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        {selectedStatus === 'complete' && (
          <View style={styles.activeIndicator}>
            <Ionicons name="filter" size={14} color={COLORS.success} />
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.statCard, { borderLeftColor: COLORS.warning }, selectedStatus === 'partial' && styles.statCardActive]}
        onPress={() => setSelectedStatus(selectedStatus === 'partial' ? 'all' : 'partial')}
        activeOpacity={0.7}
      >
        <View style={[styles.statIcon, { backgroundColor: COLORS.warning + '15' }]}>
          <Ionicons name="alert-circle" size={24} color={COLORS.warning} />
        </View>
        <View>
          <Text style={styles.statValue}>{stats.partial}</Text>
          <Text style={styles.statLabel}>Partial</Text>
        </View>
        {selectedStatus === 'partial' && (
          <View style={styles.activeIndicator}>
            <Ionicons name="filter" size={14} color={COLORS.warning} />
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.statCard, { borderLeftColor: COLORS.error }, selectedStatus === 'missed' && styles.statCardActive]}
        onPress={() => setSelectedStatus(selectedStatus === 'missed' ? 'all' : 'missed')}
        activeOpacity={0.7}
      >
        <View style={[styles.statIcon, { backgroundColor: COLORS.error + '15' }]}>
          <Ionicons name="close-circle" size={24} color={COLORS.error} />
        </View>
        <View>
          <Text style={styles.statValue}>{stats.missed}</Text>
          <Text style={styles.statLabel}>Missed</Text>
        </View>
        {selectedStatus === 'missed' && (
          <View style={styles.activeIndicator}>
            <Ionicons name="filter" size={14} color={COLORS.error} />
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.statCard, { borderLeftColor: COLORS.info }, selectedStatus === 'all' && styles.statCardActive]}
        onPress={() => setSelectedStatus('all')}
        activeOpacity={0.7}
      >
        <View style={[styles.statIcon, { backgroundColor: COLORS.info + '15' }]}>
          <Ionicons name="pie-chart" size={24} color={COLORS.info} />
        </View>
        <View>
          <Text style={styles.statValue}>{Math.round((stats.complete / stats.total) * 100)}%</Text>
          <Text style={styles.statLabel}>Compliance</Text>
        </View>
        {selectedStatus === 'all' && (
          <View style={styles.activeIndicator}>
            <Ionicons name="apps" size={14} color={COLORS.info} />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  // Grid Header
  const renderGridHeader = () => (
    <View style={styles.gridHeader}>
      <View style={styles.gridHeaderLeft}>
        <Text style={styles.gridHeaderLabel}>Couple</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.gridHeaderMetrics}>
          {metrics.map(metric => (
            <View key={metric.id} style={styles.gridHeaderCell}>
              <Text style={styles.gridHeaderCellText}>M</Text>
              <Text style={styles.gridHeaderCellText}>F</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  // Metric Headers Row
  const renderMetricHeaders = () => (
    <View style={styles.metricHeaderRow}>
      <View style={styles.gridHeaderLeft}>
        <Text style={styles.metricHeaderEmpty}></Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.gridHeaderMetrics}>
          {metrics.map(metric => (
            <View key={metric.id} style={styles.metricHeaderCell}>
              {metric.iconFamily === 'Ionicons' ? (
                <Ionicons name={metric.icon as any} size={16} color={COLORS.textSecondary} />
              ) : (
                <MaterialCommunityIcons name={metric.icon as any} size={16} color={COLORS.textSecondary} />
              )}
              <Text style={styles.metricHeaderText}>{metric.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  // Log Row
  const renderLogRow = (log: DailyLog) => {
    const renderStatusCell = (status: LogStatus) => {
      const { icon, color } = getStatusIcon(status);
      return (
        <View style={styles.statusCell}>
          <Ionicons name={icon as any} size={18} color={color} />
        </View>
      );
    };

    const renderDualStatus = (metric: { male: LogStatus; female: LogStatus }) => (
      <View style={styles.dualStatusCell}>
        {renderStatusCell(metric.male)}
        {renderStatusCell(metric.female)}
      </View>
    );

    const renderSingleStatus = (status: LogStatus) => (
      <View style={styles.singleStatusCell}>
        {renderStatusCell(status)}
      </View>
    );

    return (
      <TouchableOpacity key={log.coupleId} style={styles.logRow} onPress={() => handleCoupleClick(log)}>
        <View style={styles.logRowLeft}>
          <View style={styles.coupleIdContainer}>
            <Text style={styles.coupleId}>{log.coupleId}</Text>
            <View style={styles.statusBadges}>
              <View style={[styles.statusBadge, log.maleStatus === 'Active' ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
                <Text style={[styles.statusBadgeText, log.maleStatus === 'Active' && styles.statusBadgeTextActive]}>M</Text>
              </View>
              <View style={[styles.statusBadge, log.femaleStatus === 'Active' ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
                <Text style={[styles.statusBadgeText, log.femaleStatus === 'Active' && styles.statusBadgeTextActive]}>F</Text>
              </View>
            </View>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.logRowMetrics}>
            {renderDualStatus(log.steps)}
            {renderDualStatus(log.exercise)}
            {renderDualStatus(log.diet)}
            {renderDualStatus(log.weight)}
            {renderSingleStatus(log.coupleWalking)}
            {renderDualStatus(log.feedback)}
          </View>
        </ScrollView>
      </TouchableOpacity>
    );
  };

  // Legend
  const renderLegend = () => (
    <View style={styles.legendContainer}>
      <Text style={styles.legendTitle}>Legend:</Text>
      <View style={styles.legendItems}>
        <View style={styles.legendItem}>
          <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
          <Text style={styles.legendText}>Complete</Text>
        </View>
        <View style={styles.legendItem}>
          <Ionicons name="alert-circle" size={16} color={COLORS.warning} />
          <Text style={styles.legendText}>Partial</Text>
        </View>
        <View style={styles.legendItem}>
          <Ionicons name="close-circle" size={16} color={COLORS.error} />
          <Text style={styles.legendText}>Missed</Text>
        </View>
        <View style={styles.legendItem}>
          <Ionicons name="ellipse-outline" size={16} color={COLORS.textMuted} />
          <Text style={styles.legendText}>Pending</Text>
        </View>
      </View>
    </View>
  );

  // Export Options
  const renderExportSection = () => (
    <View style={styles.exportSection}>
      <Text style={styles.sectionTitle}>Export Data</Text>
      <View style={[styles.exportOptionsContainer, isMobile && styles.exportOptionsContainerMobile]}>
        <TouchableOpacity style={styles.exportOption}>
          <View style={[styles.exportOptionIcon, { backgroundColor: COLORS.success + '15' }]}>
            <MaterialCommunityIcons name="file-excel" size={28} color={COLORS.success} />
          </View>
          <Text style={styles.exportOptionTitle}>Export to Excel</Text>
          <Text style={styles.exportOptionDesc}>Download as .xlsx file</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exportOption}>
          <View style={[styles.exportOptionIcon, { backgroundColor: COLORS.info + '15' }]}>
            <MaterialCommunityIcons name="file-delimited" size={28} color={COLORS.info} />
          </View>
          <Text style={styles.exportOptionTitle}>Export to CSV</Text>
          <Text style={styles.exportOptionDesc}>Download as .csv file</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exportOption}>
          <View style={[styles.exportOptionIcon, { backgroundColor: COLORS.error + '15' }]}>
            <MaterialCommunityIcons name="file-pdf-box" size={28} color={COLORS.error} />
          </View>
          <Text style={styles.exportOptionTitle}>Export to PDF</Text>
          <Text style={styles.exportOptionDesc}>Download as .pdf report</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Couple Detail Modal
  const renderCoupleDetailModal = () => {
    if (!selectedCouple) return null;
    
    const coupleDetails = mockCoupleDetails[selectedCouple.coupleId];
    const detailedLogs = mockDetailedLogs[selectedCouple.coupleId] || [];
    
    // Generate default logs if not in mock data
    const logsToShow = detailedLogs.length > 0 ? detailedLogs : [
      { metric: 'Steps', icon: 'walk', iconFamily: 'MaterialCommunityIcons' as const, maleValue: selectedCouple.steps.male === 'complete' ? '7,000+' : selectedCouple.steps.male === 'partial' ? '3,500' : 'Not logged', femaleValue: selectedCouple.steps.female === 'complete' ? '7,000+' : selectedCouple.steps.female === 'partial' ? '3,500' : 'Not logged', maleStatus: selectedCouple.steps.male, femaleStatus: selectedCouple.steps.female, unit: 'steps' },
      { metric: 'Exercise', icon: 'fitness', iconFamily: 'Ionicons' as const, maleValue: selectedCouple.exercise.male === 'complete' ? '45 min' : selectedCouple.exercise.male === 'partial' ? '20 min' : 'Not logged', femaleValue: selectedCouple.exercise.female === 'complete' ? '45 min' : selectedCouple.exercise.female === 'partial' ? '20 min' : 'Not logged', maleStatus: selectedCouple.exercise.male, femaleStatus: selectedCouple.exercise.female, unit: '' },
      { metric: 'Diet Log', icon: 'nutrition', iconFamily: 'Ionicons' as const, maleValue: selectedCouple.diet.male === 'complete' ? '3 meals' : selectedCouple.diet.male === 'partial' ? '1 meal' : 'Not logged', femaleValue: selectedCouple.diet.female === 'complete' ? '3 meals' : selectedCouple.diet.female === 'partial' ? '1 meal' : 'Not logged', maleStatus: selectedCouple.diet.male, femaleStatus: selectedCouple.diet.female, unit: '' },
      { metric: 'Weight', icon: 'scale-bathroom', iconFamily: 'MaterialCommunityIcons' as const, maleValue: selectedCouple.weight.male === 'complete' ? 'Logged' : selectedCouple.weight.male === 'pending' ? 'Pending' : 'Not logged', femaleValue: selectedCouple.weight.female === 'complete' ? 'Logged' : selectedCouple.weight.female === 'pending' ? 'Pending' : 'Not logged', maleStatus: selectedCouple.weight.male, femaleStatus: selectedCouple.weight.female, unit: '' },
      { metric: 'Couple Walking', icon: 'people', iconFamily: 'Ionicons' as const, maleValue: selectedCouple.coupleWalking === 'complete' ? '30 min' : selectedCouple.coupleWalking === 'partial' ? '15 min' : 'Not done', femaleValue: selectedCouple.coupleWalking === 'complete' ? '30 min' : selectedCouple.coupleWalking === 'partial' ? '15 min' : 'Not done', maleStatus: selectedCouple.coupleWalking, femaleStatus: selectedCouple.coupleWalking, unit: '' },
      { metric: 'Feedback', icon: 'chatbubble', iconFamily: 'Ionicons' as const, maleValue: selectedCouple.feedback.male === 'complete' ? 'Submitted' : selectedCouple.feedback.male === 'pending' ? 'Pending' : 'Not submitted', femaleValue: selectedCouple.feedback.female === 'complete' ? 'Submitted' : selectedCouple.feedback.female === 'pending' ? 'Pending' : 'Not submitted', maleStatus: selectedCouple.feedback.male, femaleStatus: selectedCouple.feedback.female, unit: '' },
    ];

    const getStatusColor = (status: LogStatus) => {
      switch (status) {
        case 'complete': return COLORS.success;
        case 'partial': return COLORS.warning;
        case 'missed': return COLORS.error;
        case 'pending': return COLORS.textMuted;
      }
    };

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isMobile && styles.modalContentMobile]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalAvatars}>
                  <View style={[styles.modalAvatar, { backgroundColor: COLORS.primary }]}>
                    <Ionicons name="male" size={18} color="#fff" />
                  </View>
                  <View style={[styles.modalAvatar, { backgroundColor: COLORS.accent, marginLeft: -10 }]}>
                    <Ionicons name="female" size={18} color="#fff" />
                  </View>
                </View>
                <View>
                  <Text style={styles.modalTitle}>{selectedCouple.coupleId}</Text>
                  <Text style={styles.modalSubtitle}>
                    {coupleDetails ? `${coupleDetails.maleName} & ${coupleDetails.femaleName}` : 'Couple Details'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Couple Info Section */}
              {coupleDetails && (
                <View style={styles.coupleInfoSection}>
                  <Text style={styles.sectionLabel}>Couple Information</Text>
                  <View style={styles.infoGrid}>
                    <View style={styles.infoCard}>
                      <View style={[styles.infoCardIcon, { backgroundColor: COLORS.primary + '15' }]}>
                        <Ionicons name="male" size={20} color={COLORS.primary} />
                      </View>
                      <View style={styles.infoCardContent}>
                        <Text style={styles.infoCardTitle}>{coupleDetails.maleName}</Text>
                        <Text style={styles.infoCardSubtitle}>{coupleDetails.maleEmail}</Text>
                        <Text style={styles.infoCardSubtitle}>{coupleDetails.malePhone}</Text>
                        <View style={[styles.infoStatusBadge, { backgroundColor: selectedCouple.maleStatus === 'Active' ? COLORS.success + '20' : COLORS.error + '20' }]}>
                          <Text style={[styles.infoStatusText, { color: selectedCouple.maleStatus === 'Active' ? COLORS.success : COLORS.error }]}>
                            {selectedCouple.maleStatus}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.infoCard}>
                      <View style={[styles.infoCardIcon, { backgroundColor: COLORS.accent + '20' }]}>
                        <Ionicons name="female" size={20} color={COLORS.accentDark} />
                      </View>
                      <View style={styles.infoCardContent}>
                        <Text style={styles.infoCardTitle}>{coupleDetails.femaleName}</Text>
                        <Text style={styles.infoCardSubtitle}>{coupleDetails.femaleEmail}</Text>
                        <Text style={styles.infoCardSubtitle}>{coupleDetails.femalePhone}</Text>
                        <View style={[styles.infoStatusBadge, { backgroundColor: selectedCouple.femaleStatus === 'Active' ? COLORS.success + '20' : COLORS.error + '20' }]}>
                          <Text style={[styles.infoStatusText, { color: selectedCouple.femaleStatus === 'Active' ? COLORS.success : COLORS.error }]}>
                            {selectedCouple.femaleStatus}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  
                  {/* View Couple Dashboard Button */}
                  <TouchableOpacity 
                    style={styles.viewCoupleDashboardButton}
                    onPress={() => {
                      setShowDetailModal(false);
                      router.push(`/admin/user-dashboard?coupleId=${selectedCouple.coupleId}` as any);
                    }}
                  >
                    <Ionicons name="analytics-outline" size={18} color="#fff" />
                    <Text style={styles.viewCoupleDashboardText}>View Couple Dashboard</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.enrollmentInfo}>
                    <Ionicons name="calendar" size={16} color={COLORS.textMuted} />
                    <Text style={styles.enrollmentText}>Enrolled: {coupleDetails.enrollmentDate}</Text>
                  </View>
                </View>
              )}

              {/* Tab Toggle for Current/Past Logs */}
              <View style={styles.logTabContainer}>
                <TouchableOpacity
                  style={[styles.logTab, !showPastLogs && styles.logTabActive]}
                  onPress={() => setShowPastLogs(false)}
                >
                  <Ionicons name="today" size={16} color={!showPastLogs ? COLORS.primary : COLORS.textMuted} />
                  <Text style={[styles.logTabText, !showPastLogs && styles.logTabTextActive]}>Today's Log</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.logTab, showPastLogs && styles.logTabActive]}
                  onPress={() => setShowPastLogs(true)}
                >
                  <Ionicons name="time" size={16} color={showPastLogs ? COLORS.primary : COLORS.textMuted} />
                  <Text style={[styles.logTabText, showPastLogs && styles.logTabTextActive]}>Past Logs</Text>
                </TouchableOpacity>
              </View>

              {/* Daily Log Details or Past Logs */}
              {!showPastLogs ? (
                <View style={styles.logDetailsSection}>
                  <Text style={styles.sectionLabel}>Daily Log - {selectedDate}</Text>
                  
                  {/* Log Table Header */}
                  <View style={styles.logTableHeader}>
                    <Text style={[styles.logTableHeaderText, { flex: 2 }]}>Metric</Text>
                    <Text style={[styles.logTableHeaderText, { flex: 1, textAlign: 'center' }]}>Male</Text>
                    <Text style={[styles.logTableHeaderText, { flex: 1, textAlign: 'center' }]}>Female</Text>
                  </View>

                  {/* Log Entries */}
                  {logsToShow.map((entry, index) => (
                    <View key={index} style={styles.logTableRow}>
                      <View style={[styles.logTableCell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                        {entry.iconFamily === 'Ionicons' ? (
                          <Ionicons name={entry.icon as any} size={18} color={COLORS.textSecondary} />
                        ) : (
                          <MaterialCommunityIcons name={entry.icon as any} size={18} color={COLORS.textSecondary} />
                        )}
                        <Text style={styles.logMetricName}>{entry.metric}</Text>
                      </View>
                      <View style={[styles.logTableCell, { flex: 1, alignItems: 'center' }]}>
                        <View style={[styles.logValueBadge, { backgroundColor: getStatusColor(entry.maleStatus) + '15' }]}>
                          <Ionicons name={getStatusIcon(entry.maleStatus).icon as any} size={14} color={getStatusColor(entry.maleStatus)} />
                          <Text style={[styles.logValueText, { color: getStatusColor(entry.maleStatus) }]} numberOfLines={1}>
                            {entry.maleValue}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.logTableCell, { flex: 1, alignItems: 'center' }]}>
                        <View style={[styles.logValueBadge, { backgroundColor: getStatusColor(entry.femaleStatus) + '15' }]}>
                          <Ionicons name={getStatusIcon(entry.femaleStatus).icon as any} size={14} color={getStatusColor(entry.femaleStatus)} />
                          <Text style={[styles.logValueText, { color: getStatusColor(entry.femaleStatus) }]} numberOfLines={1}>
                            {entry.femaleValue}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.pastLogsSection}>
                  <Text style={styles.sectionLabel}>Past 14 Days Log History</Text>
                  
                  {/* Past Logs Header */}
                  <View style={styles.pastLogsHeader}>
                    <Text style={[styles.pastLogsHeaderText, { width: 90 }]}>Date</Text>
                    <Text style={[styles.pastLogsHeaderText, { flex: 1, textAlign: 'center' }]}>Steps</Text>
                    <Text style={[styles.pastLogsHeaderText, { flex: 1, textAlign: 'center' }]}>Exercise</Text>
                    <Text style={[styles.pastLogsHeaderText, { flex: 1, textAlign: 'center' }]}>Diet</Text>
                    <Text style={[styles.pastLogsHeaderText, { flex: 1, textAlign: 'center' }]}>Weight</Text>
                  </View>

                  {/* Past Log Entries */}
                  {getPastLogsForCouple(selectedCouple.coupleId).map((log, index) => (
                    <View key={index} style={styles.pastLogRow}>
                      <View style={{ width: 90 }}>
                        <Text style={styles.pastLogDate}>
                          {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                      <View style={[styles.pastLogCell, { flex: 1 }]}>
                        <View style={styles.pastLogIcons}>
                          <Ionicons name={getStatusIcon(log.steps.male).icon as any} size={14} color={getStatusIcon(log.steps.male).color} />
                          <Ionicons name={getStatusIcon(log.steps.female).icon as any} size={14} color={getStatusIcon(log.steps.female).color} />
                        </View>
                      </View>
                      <View style={[styles.pastLogCell, { flex: 1 }]}>
                        <View style={styles.pastLogIcons}>
                          <Ionicons name={getStatusIcon(log.exercise.male).icon as any} size={14} color={getStatusIcon(log.exercise.male).color} />
                          <Ionicons name={getStatusIcon(log.exercise.female).icon as any} size={14} color={getStatusIcon(log.exercise.female).color} />
                        </View>
                      </View>
                      <View style={[styles.pastLogCell, { flex: 1 }]}>
                        <View style={styles.pastLogIcons}>
                          <Ionicons name={getStatusIcon(log.diet.male).icon as any} size={14} color={getStatusIcon(log.diet.male).color} />
                          <Ionicons name={getStatusIcon(log.diet.female).icon as any} size={14} color={getStatusIcon(log.diet.female).color} />
                        </View>
                      </View>
                      <View style={[styles.pastLogCell, { flex: 1 }]}>
                        <View style={styles.pastLogIcons}>
                          <Ionicons name={getStatusIcon(log.weight.male).icon as any} size={14} color={getStatusIcon(log.weight.male).color} />
                          <Ionicons name={getStatusIcon(log.weight.female).icon as any} size={14} color={getStatusIcon(log.weight.female).color} />
                        </View>
                      </View>
                    </View>
                  ))}

                  {/* Legend */}
                  <View style={styles.pastLogsLegend}>
                    <View style={styles.legendRow}>
                      <View style={styles.legendItem}>
                        <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                        <Text style={styles.legendText}>Complete</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <Ionicons name="alert-circle" size={14} color={COLORS.warning} />
                        <Text style={styles.legendText}>Partial</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <Ionicons name="close-circle" size={14} color={COLORS.error} />
                        <Text style={styles.legendText}>Missed</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <Ionicons name="ellipse-outline" size={14} color={COLORS.textMuted} />
                        <Text style={styles.legendText}>Pending</Text>
                      </View>
                    </View>
                    <Text style={styles.legendNote}>Each cell shows: Male | Female status</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={() => router.push(`/admin/users?couple=${selectedCouple.coupleId}` as any)}
              >
                <Ionicons name="person" size={18} color={COLORS.primary} />
                <Text style={styles.modalSecondaryButtonText}>View Full Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimaryButton}
                onPress={() => setShowDetailModal(false)}
              >
                <Text style={styles.modalPrimaryButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}

      <ScrollView
        contentContainerStyle={[styles.scrollContent, !isMobile && styles.scrollContentDesktop]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.content, !isMobile && styles.contentDesktop]}>
          {/* Summary Stats */}
          {renderSummaryStats()}

          {/* Daily Log Grid */}
          <View style={styles.gridContainer}>
            <View style={styles.gridTitleRow}>
              <Text style={styles.sectionTitle}>Daily Log Status</Text>
              <Text style={styles.gridDate}>{selectedDate}</Text>
            </View>

            {renderLegend()}

            {/* Grid */}
            <View style={styles.grid}>
              {renderMetricHeaders()}
              {renderGridHeader()}
              {filteredLogs.map(log => renderLogRow(log))}
            </View>

            {filteredLogs.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="folder-open" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyStateText}>No logs found matching your filters</Text>
              </View>
            )}
          </View>

          {/* Export Section */}
          {renderExportSection()}
        </View>
      </ScrollView>

      {/* Couple Detail Modal */}
      {renderCoupleDetailModal()}
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
    maxWidth: 1400,
    alignSelf: 'center',
    width: '100%',
  },

  // Header Styles
  header: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Filters
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  filtersContainerMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    minWidth: 140,
  },
  dateInput: {
    fontSize: 14,
    color: COLORS.textPrimary,
    flex: 1,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    minWidth: 200,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.borderLight,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: '#fff',
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statsContainerMobile: {
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statCardActive: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  activeIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },

  // Grid
  gridContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  gridTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  gridDate: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Legend
  legendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: 12,
  },
  legendTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  // Grid structure
  grid: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  metricHeaderRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
  },
  metricHeaderEmpty: {
    width: 100,
  },
  metricHeaderCell: {
    width: 80,
    alignItems: 'center',
    gap: 4,
  },
  metricHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  gridHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.borderLight,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  gridHeaderLeft: {
    width: 100,
    paddingLeft: 12,
    justifyContent: 'center',
  },
  gridHeaderLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  gridHeaderMetrics: {
    flexDirection: 'row',
  },
  gridHeaderCell: {
    width: 80,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  gridHeaderCellText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },

  // Log Row
  logRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    paddingVertical: 10,
  },
  logRowLeft: {
    width: 100,
    paddingLeft: 12,
    justifyContent: 'center',
  },
  coupleIdContainer: {
    gap: 6,
  },
  coupleId: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statusBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  statusBadge: {
    width: 20,
    height: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.borderLight,
  },
  statusBadgeActive: {
    backgroundColor: COLORS.success + '20',
  },
  statusBadgeInactive: {
    backgroundColor: COLORS.error + '20',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  statusBadgeTextActive: {
    color: COLORS.success,
  },
  logRowMetrics: {
    flexDirection: 'row',
  },
  dualStatusCell: {
    width: 80,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  singleStatusCell: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 12,
  },

  // Export Section
  exportSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  exportOptionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  exportOptionsContainerMobile: {
    flexDirection: 'column',
  },
  exportOption: {
    flex: 1,
    backgroundColor: COLORS.borderLight,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  exportOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  exportOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  exportOptionDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalContentMobile: {
    maxWidth: '100%',
    maxHeight: '95%',
    borderRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.surface,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  coupleInfoSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoCard: {
    flex: 1,
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.borderLight,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  infoCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  infoCardSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  infoStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  infoStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  viewDashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  viewDashboardText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  viewCoupleDashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  viewCoupleDashboardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  logStatusSection: {
    marginBottom: 20,
  },
  logMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  logMetricLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logMetricIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logMetricLabel: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  logMetricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  logHistorySection: {
    marginBottom: 20,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  historyDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  historyStatus: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.borderLight,
    gap: 8,
  },
  modalButtonPrimary: {
    backgroundColor: COLORS.primary,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalButtonTextPrimary: {
    color: '#fff',
  },
  enrollmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  enrollmentText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  logDetailsSection: {
    marginBottom: 16,
  },
  logTableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  logTableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  logTableRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    alignItems: 'center',
  },
  logTableCell: {
    justifyContent: 'center',
  },
  logMetricName: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  logValueBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logValueText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalSecondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.borderLight,
    gap: 8,
  },
  modalSecondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalPrimaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    gap: 8,
  },
  modalPrimaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Log Tab Styles
  logTabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.borderLight,
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  logTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  logTabActive: {
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  logTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  logTabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Past Logs Styles
  pastLogsSection: {
    marginBottom: 16,
  },
  pastLogsHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  pastLogsHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  pastLogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  pastLogDate: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  pastLogCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pastLogIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pastLogsLegend: {
    marginTop: 16,
    padding: 12,
    backgroundColor: COLORS.borderLight,
    borderRadius: 8,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  legendNote: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
});
