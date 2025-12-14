import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
import { CoupleStepEntry, coupleExerciseService, coupleService, coupleStepsService, coupleWeightLogService } from '../../services/firestore.service';

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

// Export date range types
type ExportDateRange = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'allTime' | 'custom';

// Export format types
type ExportFormat = 'pdf' | 'csv' | 'excel';

interface DailyLog {
  coupleId: string;
  maleStatus: string;
  femaleStatus: string;
  date: string;
  steps: { male: LogStatus; female: LogStatus; maleCount: number; femaleCount: number };
  exercise: { male: LogStatus; female: LogStatus; maleDuration?: number; maleCalories?: number; femaleDuration?: number; femaleCalories?: number };
  diet: { male: LogStatus; female: LogStatus };
  weight: { male: LogStatus; female: LogStatus };
  coupleWalking: LogStatus;
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
  maleWeight?: number;
  femaleWeight?: number;
  maleLastWeightDate?: string;
  femaleLastWeightDate?: string;
  maleStepEntries?: CoupleStepEntry[];
  femaleStepEntries?: CoupleStepEntry[];
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

// Metric columns for the grid
const metrics = [
  { id: 'steps', label: 'Steps', icon: 'walk', iconFamily: 'MaterialCommunityIcons' },
  { id: 'exercise', label: 'Exercise', icon: 'fitness', iconFamily: 'Ionicons' },
  { id: 'diet', label: 'Diet', icon: 'nutrition', iconFamily: 'Ionicons' },
  { id: 'weight', label: 'Weight', icon: 'scale-bathroom', iconFamily: 'MaterialCommunityIcons' },
  { id: 'coupleWalking', label: 'Couple Walk', icon: 'people', iconFamily: 'Ionicons' },
];

export default function AdminMonitoringScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1024;

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'complete' | 'partial' | 'missed'>('all');
  const [selectedGroup, setSelectedGroup] = useState<'all' | 'study' | 'control'>('all');
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [couples, setCouples] = useState<any[]>([]);
  const [coupleDetails, setCoupleDetails] = useState<Record<string, CoupleDetails>>({});
  const [selectedCouple, setSelectedCouple] = useState<DailyLog | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPastLogs, setShowPastLogs] = useState(false);
  const [showStepHistory, setShowStepHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDateRange, setExportDateRange] = useState<ExportDateRange>('today');
  const [exportStartDate, setExportStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [exportEndDate, setExportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [showExportDatePicker, setShowExportDatePicker] = useState(false);
  const [exportDatePickerTarget, setExportDatePickerTarget] = useState<'start' | 'end'>('start');
  const [isExporting, setIsExporting] = useState(false);
  const [tempExportDate, setTempExportDate] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });

  // Load couples data from Firestore
  useEffect(() => {
    const unsubscribe = coupleService.subscribe((couplesData) => {
      setCouples(couplesData);
      
      // Create CoupleDetails from CoupleData
      const details: Record<string, CoupleDetails> = {};
      const dailyLogs: DailyLog[] = [];
      
      couplesData.forEach(couple => {
        const coupleId = couple.id || '';
        
        // Build couple details
        details[coupleId] = {
          coupleId,
          maleName: couple.male?.firstName && couple.male?.lastName 
            ? `${couple.male.firstName} ${couple.male.lastName}` 
            : couple.male?.displayName || 'Male Partner',
          femaleName: couple.female?.firstName && couple.female?.lastName 
            ? `${couple.female.firstName} ${couple.female.lastName}` 
            : couple.female?.displayName || 'Female Partner',
          maleEmail: couple.male?.email || '',
          femaleEmail: couple.female?.email || '',
          malePhone: couple.male?.phone || '',
          femalePhone: couple.female?.phone || '',
          enrollmentDate: couple.createdAt?.toDate?.()?.toISOString?.()?.split('T')[0] || new Date().toISOString().split('T')[0],
          maleStatus: couple.status === 'active' ? 'Active' : 'Inactive',
          femaleStatus: couple.status === 'active' ? 'Active' : 'Inactive',
        };
        
        // Create daily log entry - for now mark weight as pending/complete based on last log
        // This is a simplified version - in production you'd check actual daily logs
          dailyLogs.push({
          coupleId,
          maleStatus: couple.status === 'active' ? 'Active' : 'Inactive',
          femaleStatus: couple.status === 'active' ? 'Active' : 'Inactive',
          date: selectedDate,
          steps: { male: 'pending', female: 'pending', maleCount: 0, femaleCount: 0 },
          exercise: { male: 'pending', female: 'pending' },
          diet: { male: 'pending', female: 'pending' },
          weight: { male: 'pending', female: 'pending' },
          coupleWalking: 'pending',
          // feedback removed
        });
      });
      
      setCoupleDetails(details);
      setLogs(dailyLogs);
      setIsLoading(false);
      
      // Load weight and step data for each couple
      couplesData.forEach(async couple => {
        const coupleId = couple.id || '';
        try {
          // Load weight data
          const [maleWeight, femaleWeight] = await Promise.all([
            coupleWeightLogService.getLatest(coupleId, 'male'),
            coupleWeightLogService.getLatest(coupleId, 'female')
          ]);
          
          // Load step data for the selected date
          const [maleSteps, femaleSteps] = await Promise.all([
            coupleStepsService.getByDate(coupleId, 'male', selectedDate),
            coupleStepsService.getByDate(coupleId, 'female', selectedDate)
          ]);
          
          // Load exercise data for the selected date
          const [maleExercise, femaleExercise] = await Promise.all([
            coupleExerciseService.getTotalsForDate(coupleId, 'male', selectedDate),
            coupleExerciseService.getTotalsForDate(coupleId, 'female', selectedDate)
          ]);
          
          const maleStepCount = maleSteps.reduce((sum, entry) => sum + entry.stepCount, 0);
          const femaleStepCount = femaleSteps.reduce((sum, entry) => sum + entry.stepCount, 0);
          
          // Goal defaults
          const stepGoal = 7000;
          const exerciseGoal = 60; // 60 minutes default
          
          // Determine step status
          const getMaleStepStatus = (): LogStatus => {
            if (maleStepCount >= stepGoal) return 'complete';
            if (maleStepCount > 0) return 'partial';
            return 'pending';
          };
          
          const getFemaleStepStatus = (): LogStatus => {
            if (femaleStepCount >= stepGoal) return 'complete';
            if (femaleStepCount > 0) return 'partial';
            return 'pending';
          };
          
          // Determine exercise status
          const getMaleExerciseStatus = (): LogStatus => {
            if (maleExercise.duration >= exerciseGoal) return 'complete';
            if (maleExercise.duration > 0) return 'partial';
            return 'pending';
          };
          
          const getFemaleExerciseStatus = (): LogStatus => {
            if (femaleExercise.duration >= exerciseGoal) return 'complete';
            if (femaleExercise.duration > 0) return 'partial';
            return 'pending';
          };
          
          setCoupleDetails(prev => ({
            ...prev,
            [coupleId]: {
              ...prev[coupleId],
              maleWeight: maleWeight?.weight,
              maleLastWeightDate: maleWeight?.date,
              femaleWeight: femaleWeight?.weight,
              femaleLastWeightDate: femaleWeight?.date,
              maleStepEntries: maleSteps,
              femaleStepEntries: femaleSteps,
              maleExerciseDuration: maleExercise.duration,
              maleExerciseCalories: maleExercise.calories,
              femaleExerciseDuration: femaleExercise.duration,
              femaleExerciseCalories: femaleExercise.calories,
            }
          }));
          
          // Update log status based on weight, step, and exercise data
          const today = new Date().toISOString().split('T')[0];
          setLogs(prevLogs => prevLogs.map(log => {
            if (log.coupleId === coupleId) {
              return {
                ...log,
                steps: {
                  male: getMaleStepStatus(),
                  female: getFemaleStepStatus(),
                  maleCount: maleStepCount,
                  femaleCount: femaleStepCount,
                },
                exercise: {
                  male: getMaleExerciseStatus(),
                  female: getFemaleExerciseStatus(),
                  maleDuration: maleExercise.duration,
                  maleCalories: maleExercise.calories,
                  femaleDuration: femaleExercise.duration,
                  femaleCalories: femaleExercise.calories,
                },
                weight: {
                  male: maleWeight?.date === selectedDate ? 'complete' : (maleWeight ? 'partial' : 'pending'),
                  female: femaleWeight?.date === selectedDate ? 'complete' : (femaleWeight ? 'partial' : 'pending'),
                }
              };
            }
            return log;
          }));
        } catch (error) {
          console.error('Error loading data for', coupleId, error);
        }
      });
    });

    return () => unsubscribe();
  }, [selectedDate]);

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
        // feedback removed
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
      false;
    
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
        false
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
      ['steps', 'exercise', 'diet', 'weight'].forEach(metric => {
        const val = log[metric as keyof DailyLog] as { male: LogStatus; female: LogStatus };
        if (val.male === 'complete') complete++;
        else if (val.male === 'partial') partial++;
        else if (val.male === 'missed') missed++;
        if (val.female === 'complete') complete++;
        else if (val.female === 'partial') partial++;
        else if (val.female === 'missed') missed++;
      });
    });

    return { complete, partial, missed, total: total * 4 };
  };

  const stats = getSummaryStats();

  // Get date display label
  const getDateDisplayLabel = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';
    
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Handle export button click
  const handleExportClick = () => {
    setExportDateRange('today');
    setExportStartDate(new Date().toISOString().split('T')[0]);
    setExportEndDate(new Date().toISOString().split('T')[0]);
    setShowExportModal(true);
  };

  // Get export date range based on selection
  const getExportDateRange = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    switch (exportDateRange) {
      case 'today':
        return { start: todayStr, end: todayStr };
      case 'yesterday':
        const yesterday = new Date(today.getTime() - 86400000);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        return { start: yesterdayStr, end: yesterdayStr };
      case 'last7days':
        const last7 = new Date(today.getTime() - 7 * 86400000);
        return { start: last7.toISOString().split('T')[0], end: todayStr };
      case 'last30days':
        const last30 = new Date(today.getTime() - 30 * 86400000);
        return { start: last30.toISOString().split('T')[0], end: todayStr };
      case 'allTime':
        return { start: '2020-01-01', end: todayStr };
      case 'custom':
        return { start: exportStartDate, end: exportEndDate };
      default:
        return { start: todayStr, end: todayStr };
    }
  };

  // Helper to generate all dates between start and end
  const getDatesBetween = (startDate: string, endDate: string): string[] => {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  };

  // Generate export data - fetches data for the entire date range
  const generateExportData = async () => {
    const dateRange = getExportDateRange();
    const exportData: any[] = [];
    const dates = getDatesBetween(dateRange.start, dateRange.end);
    const stepGoal = 7000;
    const exerciseGoal = 60;
    
    // Get all couple IDs from the current logs
    const coupleIds = logs.map(log => log.coupleId);
    
    // Fetch data for each couple for each date in the range
    for (const coupleId of coupleIds) {
      const details = coupleDetails[coupleId];
      
      // Get actual names with proper fallback
      const maleName = details?.maleName && details.maleName !== 'Male Partner' 
        ? details.maleName 
        : (details?.maleEmail?.split('@')[0] || coupleId + '_M');
      const femaleName = details?.femaleName && details.femaleName !== 'Female Partner' 
        ? details.femaleName 
        : (details?.femaleEmail?.split('@')[0] || coupleId + '_F');
      
      for (const date of dates) {
        try {
          // Fetch step data for this date
          const [maleSteps, femaleSteps] = await Promise.all([
            coupleStepsService.getByDate(coupleId, 'male', date),
            coupleStepsService.getByDate(coupleId, 'female', date)
          ]);
          
          // Fetch exercise data for this date
          const [maleExercise, femaleExercise] = await Promise.all([
            coupleExerciseService.getTotalsForDate(coupleId, 'male', date),
            coupleExerciseService.getTotalsForDate(coupleId, 'female', date)
          ]);
          
          const maleStepCount = maleSteps.reduce((sum: number, entry: CoupleStepEntry) => sum + entry.stepCount, 0);
          const femaleStepCount = femaleSteps.reduce((sum: number, entry: CoupleStepEntry) => sum + entry.stepCount, 0);
          
          // Determine statuses
          const getMaleStepStatus = (): LogStatus => {
            if (maleStepCount >= stepGoal) return 'complete';
            if (maleStepCount > 0) return 'partial';
            return 'pending';
          };
          
          const getFemaleStepStatus = (): LogStatus => {
            if (femaleStepCount >= stepGoal) return 'complete';
            if (femaleStepCount > 0) return 'partial';
            return 'pending';
          };
          
          const getMaleExerciseStatus = (): LogStatus => {
            if (maleExercise.duration >= exerciseGoal) return 'complete';
            if (maleExercise.duration > 0) return 'partial';
            return 'pending';
          };
          
          const getFemaleExerciseStatus = (): LogStatus => {
            if (femaleExercise.duration >= exerciseGoal) return 'complete';
            if (femaleExercise.duration > 0) return 'partial';
            return 'pending';
          };
          
          exportData.push({
            coupleId: coupleId,
            maleName: maleName,
            femaleName: femaleName,
            maleEmail: details?.maleEmail || 'N/A',
            femaleEmail: details?.femaleEmail || 'N/A',
            malePhone: details?.malePhone || 'N/A',
            femalePhone: details?.femalePhone || 'N/A',
            enrollmentDate: details?.enrollmentDate || 'N/A',
            reportDate: date,
            maleSteps: maleStepCount,
            femaleSteps: femaleStepCount,
            maleStepsStatus: getMaleStepStatus(),
            femaleStepsStatus: getFemaleStepStatus(),
            maleExerciseDuration: maleExercise.duration || 0,
            maleExerciseCalories: maleExercise.calories || 0,
            femaleExerciseDuration: femaleExercise.duration || 0,
            femaleExerciseCalories: femaleExercise.calories || 0,
            maleExerciseStatus: getMaleExerciseStatus(),
            femaleExerciseStatus: getFemaleExerciseStatus(),
            maleDietStatus: 'pending',
            femaleDietStatus: 'pending',
            maleWeight: details?.maleWeight || 'N/A',
            femaleWeight: details?.femaleWeight || 'N/A',
            maleWeightStatus: 'pending',
            femaleWeightStatus: 'pending',
            coupleWalkingStatus: 'pending',
          });
        } catch (error) {
          console.error(`Error fetching data for couple ${coupleId} on ${date}:`, error);
        }
      }
    }
    
    // Sort by date then coupleId
    exportData.sort((a, b) => {
      if (a.reportDate !== b.reportDate) {
        return a.reportDate.localeCompare(b.reportDate);
      }
      return a.coupleId.localeCompare(b.coupleId);
    });
    
    return { data: exportData, dateRange };
  };

  // Export to CSV - Well organized columns
  const exportToCSV = async () => {
    setIsExporting(true);
    try {
      const { data, dateRange } = await generateExportData();
      
      // CSV Headers - Clean and organized
      const headers = [
        'Report Date',
        'Couple ID',
        'Male Name',
        'Female Name',
        'Male Steps',
        'Male Step Status',
        'Female Steps',
        'Female Step Status',
        'Male Exercise (mins)',
        'Male Exercise (cals)',
        'Male Exercise Status',
        'Female Exercise (mins)',
        'Female Exercise (cals)',
        'Female Exercise Status',
        'Male Diet Status',
        'Female Diet Status',
        'Male Weight (kg)',
        'Male Weight Status',
        'Female Weight (kg)',
        'Female Weight Status',
        'Couple Walk Status',
        'Male Email',
        'Female Email',
        'Male Phone',
        'Female Phone',
        'Enrollment Date'
      ];
      
      // Generate CSV content
      let csvContent = headers.join(',') + '\n';
      data.forEach(row => {
        const rowData = [
          row.reportDate,
          row.coupleId,
          `"${row.maleName}"`,
          `"${row.femaleName}"`,
          row.maleSteps,
          row.maleStepsStatus,
          row.femaleSteps,
          row.femaleStepsStatus,
          row.maleExerciseDuration,
          row.maleExerciseCalories,
          row.maleExerciseStatus,
          row.femaleExerciseDuration,
          row.femaleExerciseCalories,
          row.femaleExerciseStatus,
          row.maleDietStatus,
          row.femaleDietStatus,
          row.maleWeight,
          row.maleWeightStatus,
          row.femaleWeight,
          row.femaleWeightStatus,
          row.coupleWalkingStatus,
          row.maleEmail,
          row.femaleEmail,
          row.malePhone,
          row.femalePhone,
          row.enrollmentDate
        ];
        csvContent += rowData.join(',') + '\n';
      });
      
      if (isWeb) {
        // Web download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `fit_for_baby_report_${dateRange.start}_to_${dateRange.end}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Mobile - use FileSystem and Sharing
        const fileName = `fit_for_baby_report_${dateRange.start}_to_${dateRange.end}.csv`;
        const fileUri = FileSystem.documentDirectory + fileName;
        await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export Report' });
      }
      
      setShowExportModal(false);
      Alert.alert('Success', 'CSV report exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export CSV report');
    } finally {
      setIsExporting(false);
    }
  };

  // Export to PDF (generates HTML and opens in browser for printing/saving)
  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const { data, dateRange } = await generateExportData();
      
      // Generate HTML content for PDF with professional design
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Fit for Baby - Monitoring Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      padding: 30px; 
      color: #1e293b;
      background: #fff;
      line-height: 1.5;
    }
    .report-container {
      max-width: 1400px;
      margin: 0 auto;
    }
    .header { 
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #006dab;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .logo-placeholder {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #006dab 0%, #0088d4 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      font-weight: bold;
    }
    .header-text h1 { 
      font-size: 24px; 
      font-weight: 700;
      color: #006dab;
      margin-bottom: 2px;
    }
    .header-text p { 
      font-size: 13px; 
      color: #64748b;
    }
    .header-right {
      text-align: right;
    }
    .date-badge {
      background: #f1f5f9;
      padding: 12px 20px;
      border-radius: 8px;
      border-left: 4px solid #006dab;
    }
    .date-badge strong {
      color: #006dab;
      display: block;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .date-badge span {
      font-size: 14px;
      color: #334155;
    }
    
    /* Summary Cards */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 30px;
    }
    .summary-card {
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      border: 1px solid #e2e8f0;
    }
    .summary-card.complete { background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-color: #22c55e; }
    .summary-card.partial { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-color: #f59e0b; }
    .summary-card.missed { background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-color: #ef4444; }
    .summary-card.total { background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%); border-color: #3b82f6; }
    .summary-value { font-size: 36px; font-weight: 800; margin-bottom: 5px; }
    .summary-label { font-size: 13px; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
    
    /* Table Styles */
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #006dab;
      margin: 30px 0 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e2e8f0;
    }
    .data-table { 
      width: 100%; 
      border-collapse: collapse;
      font-size: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border-radius: 8px;
      overflow: hidden;
    }
    .data-table thead tr { 
      background: linear-gradient(135deg, #006dab 0%, #0088d4 100%);
    }
    .data-table th { 
      color: white; 
      padding: 14px 10px;
      text-align: center;
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border-right: 1px solid rgba(255,255,255,0.2);
    }
    .data-table th:last-child { border-right: none; }
    .data-table td { 
      padding: 12px 10px; 
      border-bottom: 1px solid #e2e8f0;
      text-align: center;
      vertical-align: middle;
    }
    .data-table tbody tr:nth-child(even) { background: #f8fafc; }
    .data-table tbody tr:hover { background: #e0f2fe; }
    
    /* Cell Types */
    .couple-cell {
      text-align: left !important;
      font-weight: 600;
      color: #1e293b;
    }
    .name-cell {
      text-align: left !important;
    }
    .name-cell .name { font-weight: 600; color: #1e293b; }
    .name-cell .email { font-size: 10px; color: #64748b; margin-top: 2px; }
    .metric-cell {
      font-weight: 500;
    }
    .metric-value { font-size: 13px; font-weight: 600; color: #1e293b; }
    .status-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      margin-top: 4px;
    }
    .status-complete { background: #dcfce7; color: #15803d; }
    .status-partial { background: #fef3c7; color: #b45309; }
    .status-missed { background: #fee2e2; color: #b91c1c; }
    .status-pending { background: #f1f5f9; color: #64748b; }
    
    /* Footer */
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
    }
    .footer p { font-size: 11px; color: #64748b; margin: 3px 0; }
    .footer .brand { font-weight: 600; color: #006dab; }
    
    /* Print Button */
    .print-btn {
      display: inline-block;
      background: linear-gradient(135deg, #006dab 0%, #0088d4 100%);
      color: white;
      padding: 14px 28px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      margin-top: 20px;
      box-shadow: 0 4px 6px rgba(0, 109, 171, 0.3);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .print-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(0, 109, 171, 0.4);
    }
    
    @media print {
      body { padding: 15px; }
      .no-print { display: none !important; }
      .data-table { font-size: 10px; }
      .summary-grid { grid-template-columns: repeat(4, 1fr); }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="header">
      <div class="header-left">
        <div class="logo-placeholder">FFB</div>
        <div class="header-text">
          <h1>Fit for Baby</h1>
          <p>Monitoring & Activity Report</p>
        </div>
      </div>
      <div class="header-right">
        <div class="date-badge">
          <strong>Report Period</strong>
          <span>${new Date(dateRange.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}${dateRange.start !== dateRange.end ? ' - ' + new Date(dateRange.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</span>
        </div>
      </div>
    </div>
    
    <div class="summary-grid">
      <div class="summary-card complete">
        <div class="summary-value" style="color: #15803d;">${stats.complete}</div>
        <div class="summary-label">Completed</div>
      </div>
      <div class="summary-card partial">
        <div class="summary-value" style="color: #b45309;">${stats.partial}</div>
        <div class="summary-label">Partial</div>
      </div>
      <div class="summary-card missed">
        <div class="summary-value" style="color: #b91c1c;">${stats.missed}</div>
        <div class="summary-label">Missed</div>
      </div>
      <div class="summary-card total">
        <div class="summary-value" style="color: #1d4ed8;">${stats.total > 0 ? Math.round((stats.complete / stats.total) * 100) : 0}%</div>
        <div class="summary-label">Compliance</div>
      </div>
    </div>

    <div class="section-title">📊 Detailed Activity Report (${data.length} Couples)</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 80px;">Date</th>
          <th style="width: 100px;">Couple ID</th>
          <th style="min-width: 140px;">Male Partner</th>
          <th style="min-width: 140px;">Female Partner</th>
          <th>M Steps</th>
          <th>F Steps</th>
          <th>M Exercise</th>
          <th>F Exercise</th>
          <th>M Diet</th>
          <th>F Diet</th>
          <th>M Weight</th>
          <th>F Weight</th>
          <th>Couple Walk</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(row => `
        <tr>
          <td>${new Date(row.reportDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
          <td class="couple-cell">${row.coupleId}</td>
          <td class="name-cell">
            <div class="name">${row.maleName}</div>
            <div class="email">${row.maleEmail}</div>
          </td>
          <td class="name-cell">
            <div class="name">${row.femaleName}</div>
            <div class="email">${row.femaleEmail}</div>
          </td>
          <td class="metric-cell">
            <div class="metric-value">${Number(row.maleSteps).toLocaleString()}</div>
            <span class="status-badge status-${row.maleStepsStatus}">${row.maleStepsStatus}</span>
          </td>
          <td class="metric-cell">
            <div class="metric-value">${Number(row.femaleSteps).toLocaleString()}</div>
            <span class="status-badge status-${row.femaleStepsStatus}">${row.femaleStepsStatus}</span>
          </td>
          <td class="metric-cell">
            <div class="metric-value">${row.maleExerciseDuration}m</div>
            <span class="status-badge status-${row.maleExerciseStatus}">${row.maleExerciseStatus}</span>
          </td>
          <td class="metric-cell">
            <div class="metric-value">${row.femaleExerciseDuration}m</div>
            <span class="status-badge status-${row.femaleExerciseStatus}">${row.femaleExerciseStatus}</span>
          </td>
          <td><span class="status-badge status-${row.maleDietStatus}">${row.maleDietStatus}</span></td>
          <td><span class="status-badge status-${row.femaleDietStatus}">${row.femaleDietStatus}</span></td>
          <td class="metric-cell">
            <div class="metric-value">${row.maleWeight !== 'N/A' ? row.maleWeight + ' kg' : '-'}</div>
            <span class="status-badge status-${row.maleWeightStatus}">${row.maleWeightStatus}</span>
          </td>
          <td class="metric-cell">
            <div class="metric-value">${row.femaleWeight !== 'N/A' ? row.femaleWeight + ' kg' : '-'}</div>
            <span class="status-badge status-${row.femaleWeightStatus}">${row.femaleWeightStatus}</span>
          </td>
          <td><span class="status-badge status-${row.coupleWalkingStatus}">${row.coupleWalkingStatus}</span></td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="footer">
      <p class="brand">Fit for Baby - Health Monitoring System</p>
      <p>Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
      <p>Total Records: ${data.length} couples</p>
    </div>
    
    <div class="no-print" style="text-align: center; margin-top: 30px;">
      <button onclick="window.print()" class="print-btn">
        🖨️ Print / Save as PDF
      </button>
    </div>
  </div>
</body>
</html>`;

      if (isWeb) {
        // Open in new tab for printing
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(htmlContent);
          newWindow.document.close();
        }
      } else {
        // Mobile - save HTML and share
        const fileName = `fit_for_baby_report_${dateRange.start}_to_${dateRange.end}.html`;
        const fileUri = FileSystem.documentDirectory + fileName;
        await FileSystem.writeAsStringAsync(fileUri, htmlContent, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(fileUri, { mimeType: 'text/html', dialogTitle: 'Export Report' });
      }
      
      setShowExportModal(false);
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export PDF report');
    } finally {
      setIsExporting(false);
    }
  };

  // Export to Excel - Professional SpreadsheetML with multiple sheets
  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const { data, dateRange } = await generateExportData();
      
      // Generate Excel-compatible XML (SpreadsheetML) with better structure
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
    <Title>Fit for Baby - Monitoring Report</Title>
    <Author>Fit for Baby Admin</Author>
    <Created>${new Date().toISOString()}</Created>
  </DocumentProperties>
  <Styles>
    <Style ss:ID="Default">
      <Alignment ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11"/>
    </Style>
    <Style ss:ID="Title">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#006dab"/>
    </Style>
    <Style ss:ID="Header">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#006dab" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#004d7a"/>
      </Borders>
    </Style>
    <Style ss:ID="SubHeader">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="9" ss:Bold="1" ss:Color="#334155"/>
      <Interior ss:Color="#e2e8f0" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="Cell">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="10"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
      </Borders>
    </Style>
    <Style ss:ID="CellLeft">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="10"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
      </Borders>
    </Style>
    <Style ss:ID="CellBold">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
      </Borders>
    </Style>
    <Style ss:ID="Complete">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#15803d"/>
      <Interior ss:Color="#dcfce7" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="Partial">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#b45309"/>
      <Interior ss:Color="#fef3c7" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="Missed">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#b91c1c"/>
      <Interior ss:Color="#fee2e2" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="Pending">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#64748b"/>
      <Interior ss:Color="#f1f5f9" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="Number">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1"/>
      <NumberFormat ss:Format="#,##0"/>
    </Style>
  </Styles>
  
  <!-- Main Activity Report Sheet -->
  <Worksheet ss:Name="Activity Report">
    <Table ss:DefaultColumnWidth="80" ss:DefaultRowHeight="24">
      <Column ss:Width="90"/>
      <Column ss:Width="100"/>
      <Column ss:Width="150"/>
      <Column ss:Width="150"/>
      <Column ss:Width="80"/>
      <Column ss:Width="80"/>
      <Column ss:Width="80"/>
      <Column ss:Width="80"/>
      <Column ss:Width="80"/>
      <Column ss:Width="80"/>
      <Column ss:Width="80"/>
      <Column ss:Width="80"/>
      <Column ss:Width="80"/>
      <Column ss:Width="80"/>
      <Column ss:Width="90"/>
      
      <!-- Title Row -->
      <Row ss:Height="30">
        <Cell ss:StyleID="Title" ss:MergeAcross="14"><Data ss:Type="String">FIT FOR BABY - MONITORING REPORT</Data></Cell>
      </Row>
      <Row ss:Height="20">
        <Cell ss:StyleID="SubHeader" ss:MergeAcross="14"><Data ss:Type="String">Report Period: ${dateRange.start} to ${dateRange.end} | Generated: ${new Date().toLocaleString()}</Data></Cell>
      </Row>
      <Row/>
      
      <!-- Header Row -->
      <Row ss:StyleID="Header" ss:Height="36">
        <Cell><Data ss:Type="String">Report Date</Data></Cell>
        <Cell><Data ss:Type="String">Couple ID</Data></Cell>
        <Cell><Data ss:Type="String">Male Partner Name</Data></Cell>
        <Cell><Data ss:Type="String">Female Partner Name</Data></Cell>
        <Cell><Data ss:Type="String">Male Steps</Data></Cell>
        <Cell><Data ss:Type="String">Male Step Status</Data></Cell>
        <Cell><Data ss:Type="String">Female Steps</Data></Cell>
        <Cell><Data ss:Type="String">Female Step Status</Data></Cell>
        <Cell><Data ss:Type="String">Male Exercise (mins)</Data></Cell>
        <Cell><Data ss:Type="String">Male Exercise Status</Data></Cell>
        <Cell><Data ss:Type="String">Female Exercise (mins)</Data></Cell>
        <Cell><Data ss:Type="String">Female Exercise Status</Data></Cell>
        <Cell><Data ss:Type="String">Male Diet</Data></Cell>
        <Cell><Data ss:Type="String">Female Diet</Data></Cell>
        <Cell><Data ss:Type="String">Couple Walk</Data></Cell>
      </Row>
      
      <!-- Data Rows -->
      ${data.map(row => `
      <Row>
        <Cell ss:StyleID="Cell"><Data ss:Type="String">${row.reportDate}</Data></Cell>
        <Cell ss:StyleID="CellBold"><Data ss:Type="String">${row.coupleId}</Data></Cell>
        <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${row.maleName}</Data></Cell>
        <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${row.femaleName}</Data></Cell>
        <Cell ss:StyleID="Number"><Data ss:Type="Number">${row.maleSteps}</Data></Cell>
        <Cell ss:StyleID="${row.maleStepsStatus === 'complete' ? 'Complete' : row.maleStepsStatus === 'partial' ? 'Partial' : row.maleStepsStatus === 'missed' ? 'Missed' : 'Pending'}"><Data ss:Type="String">${row.maleStepsStatus.toUpperCase()}</Data></Cell>
        <Cell ss:StyleID="Number"><Data ss:Type="Number">${row.femaleSteps}</Data></Cell>
        <Cell ss:StyleID="${row.femaleStepsStatus === 'complete' ? 'Complete' : row.femaleStepsStatus === 'partial' ? 'Partial' : row.femaleStepsStatus === 'missed' ? 'Missed' : 'Pending'}"><Data ss:Type="String">${row.femaleStepsStatus.toUpperCase()}</Data></Cell>
        <Cell ss:StyleID="Number"><Data ss:Type="Number">${row.maleExerciseDuration}</Data></Cell>
        <Cell ss:StyleID="${row.maleExerciseStatus === 'complete' ? 'Complete' : row.maleExerciseStatus === 'partial' ? 'Partial' : row.maleExerciseStatus === 'missed' ? 'Missed' : 'Pending'}"><Data ss:Type="String">${row.maleExerciseStatus.toUpperCase()}</Data></Cell>
        <Cell ss:StyleID="Number"><Data ss:Type="Number">${row.femaleExerciseDuration}</Data></Cell>
        <Cell ss:StyleID="${row.femaleExerciseStatus === 'complete' ? 'Complete' : row.femaleExerciseStatus === 'partial' ? 'Partial' : row.femaleExerciseStatus === 'missed' ? 'Missed' : 'Pending'}"><Data ss:Type="String">${row.femaleExerciseStatus.toUpperCase()}</Data></Cell>
        <Cell ss:StyleID="${row.maleDietStatus === 'complete' ? 'Complete' : row.maleDietStatus === 'partial' ? 'Partial' : row.maleDietStatus === 'missed' ? 'Missed' : 'Pending'}"><Data ss:Type="String">${row.maleDietStatus.toUpperCase()}</Data></Cell>
        <Cell ss:StyleID="${row.femaleDietStatus === 'complete' ? 'Complete' : row.femaleDietStatus === 'partial' ? 'Partial' : row.femaleDietStatus === 'missed' ? 'Missed' : 'Pending'}"><Data ss:Type="String">${row.femaleDietStatus.toUpperCase()}</Data></Cell>
        <Cell ss:StyleID="${row.coupleWalkingStatus === 'complete' ? 'Complete' : row.coupleWalkingStatus === 'partial' ? 'Partial' : row.coupleWalkingStatus === 'missed' ? 'Missed' : 'Pending'}"><Data ss:Type="String">${row.coupleWalkingStatus.toUpperCase()}</Data></Cell>
      </Row>`).join('')}
    </Table>
  </Worksheet>
  
  <!-- Contact Details Sheet -->
  <Worksheet ss:Name="Contact Details">
    <Table ss:DefaultColumnWidth="120" ss:DefaultRowHeight="24">
      <Column ss:Width="100"/>
      <Column ss:Width="150"/>
      <Column ss:Width="200"/>
      <Column ss:Width="130"/>
      <Column ss:Width="150"/>
      <Column ss:Width="200"/>
      <Column ss:Width="130"/>
      <Column ss:Width="100"/>
      
      <!-- Title Row -->
      <Row ss:Height="30">
        <Cell ss:StyleID="Title" ss:MergeAcross="7"><Data ss:Type="String">COUPLE CONTACT DETAILS</Data></Cell>
      </Row>
      <Row/>
      
      <!-- Header Row -->
      <Row ss:StyleID="Header" ss:Height="32">
        <Cell><Data ss:Type="String">Couple ID</Data></Cell>
        <Cell><Data ss:Type="String">Male Name</Data></Cell>
        <Cell><Data ss:Type="String">Male Email</Data></Cell>
        <Cell><Data ss:Type="String">Male Phone</Data></Cell>
        <Cell><Data ss:Type="String">Female Name</Data></Cell>
        <Cell><Data ss:Type="String">Female Email</Data></Cell>
        <Cell><Data ss:Type="String">Female Phone</Data></Cell>
        <Cell><Data ss:Type="String">Enrolled</Data></Cell>
      </Row>
      
      ${data.map(row => `
      <Row>
        <Cell ss:StyleID="CellBold"><Data ss:Type="String">${row.coupleId}</Data></Cell>
        <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${row.maleName}</Data></Cell>
        <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${row.maleEmail}</Data></Cell>
        <Cell ss:StyleID="Cell"><Data ss:Type="String">${row.malePhone}</Data></Cell>
        <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${row.femaleName}</Data></Cell>
        <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${row.femaleEmail}</Data></Cell>
        <Cell ss:StyleID="Cell"><Data ss:Type="String">${row.femalePhone}</Data></Cell>
        <Cell ss:StyleID="Cell"><Data ss:Type="String">${row.enrollmentDate}</Data></Cell>
      </Row>`).join('')}
    </Table>
  </Worksheet>
  
  <!-- Weight Tracking Sheet -->
  <Worksheet ss:Name="Weight Tracking">
    <Table ss:DefaultColumnWidth="100" ss:DefaultRowHeight="24">
      <Column ss:Width="100"/>
      <Column ss:Width="150"/>
      <Column ss:Width="150"/>
      <Column ss:Width="120"/>
      <Column ss:Width="120"/>
      <Column ss:Width="120"/>
      <Column ss:Width="120"/>
      
      <!-- Title Row -->
      <Row ss:Height="30">
        <Cell ss:StyleID="Title" ss:MergeAcross="6"><Data ss:Type="String">WEIGHT TRACKING DATA</Data></Cell>
      </Row>
      <Row/>
      
      <!-- Header Row -->
      <Row ss:StyleID="Header" ss:Height="32">
        <Cell><Data ss:Type="String">Couple ID</Data></Cell>
        <Cell><Data ss:Type="String">Male Name</Data></Cell>
        <Cell><Data ss:Type="String">Female Name</Data></Cell>
        <Cell><Data ss:Type="String">Male Weight (kg)</Data></Cell>
        <Cell><Data ss:Type="String">Male Status</Data></Cell>
        <Cell><Data ss:Type="String">Female Weight (kg)</Data></Cell>
        <Cell><Data ss:Type="String">Female Status</Data></Cell>
      </Row>
      
      ${data.map(row => `
      <Row>
        <Cell ss:StyleID="CellBold"><Data ss:Type="String">${row.coupleId}</Data></Cell>
        <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${row.maleName}</Data></Cell>
        <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${row.femaleName}</Data></Cell>
        <Cell ss:StyleID="Number"><Data ss:Type="${row.maleWeight !== 'N/A' ? 'Number' : 'String'}">${row.maleWeight !== 'N/A' ? row.maleWeight : '-'}</Data></Cell>
        <Cell ss:StyleID="${row.maleWeightStatus === 'complete' ? 'Complete' : row.maleWeightStatus === 'partial' ? 'Partial' : row.maleWeightStatus === 'missed' ? 'Missed' : 'Pending'}"><Data ss:Type="String">${row.maleWeightStatus.toUpperCase()}</Data></Cell>
        <Cell ss:StyleID="Number"><Data ss:Type="${row.femaleWeight !== 'N/A' ? 'Number' : 'String'}">${row.femaleWeight !== 'N/A' ? row.femaleWeight : '-'}</Data></Cell>
        <Cell ss:StyleID="${row.femaleWeightStatus === 'complete' ? 'Complete' : row.femaleWeightStatus === 'partial' ? 'Partial' : row.femaleWeightStatus === 'missed' ? 'Missed' : 'Pending'}"><Data ss:Type="String">${row.femaleWeightStatus.toUpperCase()}</Data></Cell>
      </Row>`).join('')}
    </Table>
  </Worksheet>
  
  <!-- Summary Sheet -->
  <Worksheet ss:Name="Summary">
    <Table ss:DefaultColumnWidth="150" ss:DefaultRowHeight="28">
      <Column ss:Width="200"/>
      <Column ss:Width="150"/>
      
      <!-- Title Row -->
      <Row ss:Height="35">
        <Cell ss:StyleID="Title" ss:MergeAcross="1"><Data ss:Type="String">REPORT SUMMARY</Data></Cell>
      </Row>
      <Row/>
      
      <Row>
        <Cell ss:StyleID="SubHeader"><Data ss:Type="String">Report Period</Data></Cell>
        <Cell ss:StyleID="Cell"><Data ss:Type="String">${dateRange.start} to ${dateRange.end}</Data></Cell>
      </Row>
      <Row>
        <Cell ss:StyleID="SubHeader"><Data ss:Type="String">Total Couples</Data></Cell>
        <Cell ss:StyleID="Number"><Data ss:Type="Number">${data.length}</Data></Cell>
      </Row>
      <Row>
        <Cell ss:StyleID="SubHeader"><Data ss:Type="String">Completed Activities</Data></Cell>
        <Cell ss:StyleID="Complete"><Data ss:Type="Number">${stats.complete}</Data></Cell>
      </Row>
      <Row>
        <Cell ss:StyleID="SubHeader"><Data ss:Type="String">Partial Activities</Data></Cell>
        <Cell ss:StyleID="Partial"><Data ss:Type="Number">${stats.partial}</Data></Cell>
      </Row>
      <Row>
        <Cell ss:StyleID="SubHeader"><Data ss:Type="String">Missed Activities</Data></Cell>
        <Cell ss:StyleID="Missed"><Data ss:Type="Number">${stats.missed}</Data></Cell>
      </Row>
      <Row>
        <Cell ss:StyleID="SubHeader"><Data ss:Type="String">Compliance Rate</Data></Cell>
        <Cell ss:StyleID="Cell"><Data ss:Type="String">${stats.total > 0 ? Math.round((stats.complete / stats.total) * 100) : 0}%</Data></Cell>
      </Row>
      <Row/>
      <Row>
        <Cell ss:StyleID="SubHeader"><Data ss:Type="String">Generated On</Data></Cell>
        <Cell ss:StyleID="Cell"><Data ss:Type="String">${new Date().toLocaleString()}</Data></Cell>
      </Row>
    </Table>
  </Worksheet>
</Workbook>`;

      if (isWeb) {
        const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `fit_for_baby_report_${dateRange.start}_to_${dateRange.end}.xls`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const fileName = `fit_for_baby_report_${dateRange.start}_to_${dateRange.end}.xls`;
        const fileUri = FileSystem.documentDirectory + fileName;
        await FileSystem.writeAsStringAsync(fileUri, xmlContent, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(fileUri, { mimeType: 'application/vnd.ms-excel', dialogTitle: 'Export Report' });
      }
      
      setShowExportModal(false);
      Alert.alert('Success', 'Excel report exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export Excel report');
    } finally {
      setIsExporting(false);
    }
  };

  // Header with date picker and filters
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.headerTitle}>Monitoring & Reports</Text>
          <Text style={styles.headerSubtitle}>Track daily logging activity</Text>
        </View>
        <TouchableOpacity style={styles.exportButton} onPress={handleExportClick}>
          <Ionicons name="download" size={18} color="#fff" />
          <Text style={styles.exportButtonText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Date and Filters */}
      <View style={[styles.filtersContainer, isMobile && styles.filtersContainerMobile]}>
        {/* Enhanced Date Picker with Quick Options */}
        <View style={styles.datePickerWrapper}>
          <TouchableOpacity
            style={styles.datePickerContainer}
            onPress={() => {
              setTempDate(selectedDate);
              setShowDatePicker(true);
            }}
          >
            <Ionicons name="calendar" size={18} color={COLORS.primary} />
            <Text style={styles.dateInput}>{getDateDisplayLabel(selectedDate)}</Text>
            <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
          
          {/* Quick Date Options */}
          <View style={styles.quickDateOptions}>
            <TouchableOpacity
              style={[
                styles.quickDateChip,
                selectedDate === new Date().toISOString().split('T')[0] && styles.quickDateChipActive
              ]}
              onPress={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            >
              <Text style={[
                styles.quickDateChipText,
                selectedDate === new Date().toISOString().split('T')[0] && styles.quickDateChipTextActive
              ]}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.quickDateChip,
                selectedDate === new Date(Date.now() - 86400000).toISOString().split('T')[0] && styles.quickDateChipActive
              ]}
              onPress={() => setSelectedDate(new Date(Date.now() - 86400000).toISOString().split('T')[0])}
            >
              <Text style={[
                styles.quickDateChipText,
                selectedDate === new Date(Date.now() - 86400000).toISOString().split('T')[0] && styles.quickDateChipTextActive
              ]}>Yesterday</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.searchContainer, isMobile && { flex: 0, width: '100%' }]}>
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

  // Calendar picker helper functions
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };
  
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  // Temp state for calendar navigation
  const [tempCalendarDate, setTempCalendarDate] = useState({ 
    year: new Date().getFullYear(), 
    month: new Date().getMonth() 
  });

  // Date picker modal / component with calendar
  const renderDatePicker = () => {
    if (!showDatePicker) return null;

    const daysInMonth = getDaysInMonth(tempCalendarDate.year, tempCalendarDate.month);
    const firstDay = getFirstDayOfMonth(tempCalendarDate.year, tempCalendarDate.month);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Generate calendar grid
    const calendarDays: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      calendarDays.push(day);
    }
    
    const handleDateSelect = (day: number) => {
      const dateStr = `${tempCalendarDate.year}-${String(tempCalendarDate.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const selectedDateObj = new Date(dateStr);
      if (selectedDateObj <= today) {
        setSelectedDate(dateStr);
        setShowDatePicker(false);
      }
    };
    
    const goToPreviousMonth = () => {
      if (tempCalendarDate.month === 0) {
        setTempCalendarDate({ year: tempCalendarDate.year - 1, month: 11 });
      } else {
        setTempCalendarDate({ ...tempCalendarDate, month: tempCalendarDate.month - 1 });
      }
    };
    
    const goToNextMonth = () => {
      const nextMonth = tempCalendarDate.month === 11 ? 0 : tempCalendarDate.month + 1;
      const nextYear = tempCalendarDate.month === 11 ? tempCalendarDate.year + 1 : tempCalendarDate.year;
      const maxDate = new Date(nextYear, nextMonth, 1);
      if (maxDate <= today) {
        setTempCalendarDate({ year: nextYear, month: nextMonth });
      }
    };

    if (isWeb) {
      return (
        <Modal
          visible={showDatePicker}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.calendarModalContent, { width: isMobile ? '90%' : 360 }]}>
              <View style={styles.calendarHeader}>
                <Text style={styles.calendarTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              
              {/* Month/Year Navigation */}
              <View style={styles.calendarNavigation}>
                <TouchableOpacity onPress={goToPreviousMonth} style={styles.calendarNavButton}>
                  <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <View style={styles.calendarMonthYear}>
                  <Text style={styles.calendarMonthText}>{months[tempCalendarDate.month]}</Text>
                  <Text style={styles.calendarYearText}>{tempCalendarDate.year}</Text>
                </View>
                <TouchableOpacity onPress={goToNextMonth} style={styles.calendarNavButton}>
                  <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
              
              {/* Day headers */}
              <View style={styles.calendarDayHeaders}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <Text key={day} style={styles.calendarDayHeader}>{day}</Text>
                ))}
              </View>
              
              {/* Calendar Grid */}
              <View style={styles.calendarGrid}>
                {calendarDays.map((day, index) => {
                  if (day === null) {
                    return <View key={`empty-${index}`} style={styles.calendarDayCell} />;
                  }
                  
                  const dateStr = `${tempCalendarDate.year}-${String(tempCalendarDate.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate;
                  const isFuture = new Date(dateStr) > today;
                  
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.calendarDayCell,
                        styles.calendarDayCellActive,
                        isToday && styles.calendarDayCellToday,
                        isSelected && styles.calendarDayCellSelected,
                        isFuture && styles.calendarDayCellDisabled,
                      ]}
                      onPress={() => !isFuture && handleDateSelect(day)}
                      disabled={isFuture}
                    >
                      <Text style={[
                        styles.calendarDayText,
                        isToday && styles.calendarDayTextToday,
                        isSelected && styles.calendarDayTextSelected,
                        isFuture && styles.calendarDayTextDisabled,
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              
              {/* Type in date option */}
              <View style={styles.manualDateInput}>
                <Text style={styles.manualDateLabel}>Or type date:</Text>
                <TextInput
                  style={styles.manualDateTextInput}
                  value={tempDate || selectedDate}
                  onChangeText={setTempDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={COLORS.textMuted}
                />
                <TouchableOpacity
                  style={styles.manualDateApply}
                  onPress={() => {
                    if (tempDate && /^\d{4}-\d{2}-\d{2}$/.test(tempDate)) {
                      const inputDate = new Date(tempDate);
                      if (inputDate <= today) {
                        setSelectedDate(tempDate);
                        setShowDatePicker(false);
                      }
                    }
                  }}
                >
                  <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      );
    }

    // Native platforms - show DateTimePicker inline (it will open native dialog on Android/iOS)
    return (
      <DateTimePicker
        value={new Date(selectedDate)}
        mode="date"
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        maximumDate={new Date()}
        onChange={(event: any, date?: Date | undefined) => {
          if (date) {
            setSelectedDate(date.toISOString().split('T')[0]);
          }
          setShowDatePicker(false);
        }}
      />
    );
  };

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
      <View style={styles.gridHeaderMetrics}>
        {metrics.map(metric => (
          <View key={metric.id} style={styles.gridHeaderCell}>
            <Text style={styles.gridHeaderCellText}>M</Text>
            <Text style={styles.gridHeaderCellText}>F</Text>
          </View>
        ))}
      </View>
    </View>
  );

  // Metric Headers Row
  const renderMetricHeaders = () => (
    <View style={styles.metricHeaderRow}>
      <View style={styles.gridHeaderLeft}>
        <Text style={styles.metricHeaderEmpty}></Text>
      </View>
      <View style={styles.gridHeaderMetrics}>
        {metrics.map(metric => (
          <View key={metric.id} style={styles.metricHeaderCell}>
            {metric.iconFamily === 'Ionicons' ? (
              <Ionicons name={metric.icon as any} size={16} color="#fff" />
            ) : (
              <MaterialCommunityIcons name={metric.icon as any} size={16} color="#fff" />
            )}
            <Text style={styles.metricHeaderText}>{metric.label}</Text>
          </View>
        ))}
      </View>
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
        <View style={styles.logRowMetrics}>
          {renderDualStatus(log.steps)}
          {renderDualStatus(log.exercise)}
          {renderDualStatus(log.diet)}
          {renderDualStatus(log.weight)}
          {renderSingleStatus(log.coupleWalking)}
        </View>
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
        <TouchableOpacity style={styles.exportOption} onPress={handleExportClick}>
          <View style={[styles.exportOptionIcon, { backgroundColor: COLORS.success + '15' }]}>
            <MaterialCommunityIcons name="file-excel" size={28} color={COLORS.success} />
          </View>
          <Text style={styles.exportOptionTitle}>Export to Excel</Text>
          <Text style={styles.exportOptionDesc}>Download as .xlsx file</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exportOption} onPress={handleExportClick}>
          <View style={[styles.exportOptionIcon, { backgroundColor: COLORS.info + '15' }]}>
            <MaterialCommunityIcons name="file-delimited" size={28} color={COLORS.info} />
          </View>
          <Text style={styles.exportOptionTitle}>Export to CSV</Text>
          <Text style={styles.exportOptionDesc}>Download as .csv file</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exportOption} onPress={handleExportClick}>
          <View style={[styles.exportOptionIcon, { backgroundColor: COLORS.error + '15' }]}>
            <MaterialCommunityIcons name="file-pdf-box" size={28} color={COLORS.error} />
          </View>
          <Text style={styles.exportOptionTitle}>Export to PDF</Text>
          <Text style={styles.exportOptionDesc}>Download as .pdf report</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Export Modal with Date Range Selection
  const renderExportModal = () => {
    const dateRangeOptions: { id: ExportDateRange; label: string; icon: string }[] = [
      { id: 'today', label: 'Today', icon: 'today' },
      { id: 'yesterday', label: 'Yesterday', icon: 'time' },
      { id: 'last7days', label: 'Last 7 Days', icon: 'calendar' },
      { id: 'last30days', label: 'Last 30 Days', icon: 'calendar-outline' },
      { id: 'allTime', label: 'All Time', icon: 'infinite' },
      { id: 'custom', label: 'Custom Range', icon: 'options' },
    ];

    // Calendar for custom date selection
    const renderExportCalendar = (target: 'start' | 'end') => {
      const currentDate = target === 'start' ? exportStartDate : exportEndDate;
      const daysInMonth = getDaysInMonth(tempExportDate.year, tempExportDate.month);
      const firstDay = getFirstDayOfMonth(tempExportDate.year, tempExportDate.month);
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      const calendarDays: (number | null)[] = [];
      for (let i = 0; i < firstDay; i++) {
        calendarDays.push(null);
      }
      for (let day = 1; day <= daysInMonth; day++) {
        calendarDays.push(day);
      }

      return (
        <View style={styles.exportCalendarContainer}>
          <View style={styles.calendarNavigation}>
            <TouchableOpacity
              onPress={() => {
                if (tempExportDate.month === 0) {
                  setTempExportDate({ year: tempExportDate.year - 1, month: 11 });
                } else {
                  setTempExportDate({ ...tempExportDate, month: tempExportDate.month - 1 });
                }
              }}
              style={styles.calendarNavButton}
            >
              <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.exportCalendarMonthYear}>
              {months[tempExportDate.month]} {tempExportDate.year}
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (tempExportDate.month === 11) {
                  setTempExportDate({ year: tempExportDate.year + 1, month: 0 });
                } else {
                  setTempExportDate({ ...tempExportDate, month: tempExportDate.month + 1 });
                }
              }}
              style={styles.calendarNavButton}
            >
              <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.calendarDayHeaders}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
              <Text key={idx} style={styles.exportCalendarDayHeader}>{day}</Text>
            ))}
          </View>
          
          <View style={styles.calendarGrid}>
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <View key={`empty-${index}`} style={styles.exportCalendarDayCell} />;
              }
              
              const dateStr = `${tempExportDate.year}-${String(tempExportDate.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = dateStr === currentDate;
              const isFuture = new Date(dateStr) > today;
              
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.exportCalendarDayCell,
                    isSelected && styles.exportCalendarDaySelected,
                    isFuture && styles.exportCalendarDayDisabled,
                  ]}
                  onPress={() => {
                    if (!isFuture) {
                      if (target === 'start') {
                        setExportStartDate(dateStr);
                      } else {
                        setExportEndDate(dateStr);
                      }
                      setShowExportDatePicker(false);
                    }
                  }}
                  disabled={isFuture}
                >
                  <Text style={[
                    styles.exportCalendarDayText,
                    isSelected && styles.exportCalendarDayTextSelected,
                    isFuture && styles.exportCalendarDayTextDisabled,
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    };

    return (
      <Modal
        visible={showExportModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.exportModalContent, { width: isMobile ? '95%' : 500 }]}>
            {/* Header */}
            <View style={styles.exportModalHeader}>
              <View style={styles.exportModalHeaderLeft}>
                <View style={styles.exportModalIcon}>
                  <Ionicons name="download" size={24} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.exportModalTitle}>Export Report</Text>
                  <Text style={styles.exportModalSubtitle}>Select date range and format</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowExportModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.exportModalBody} showsVerticalScrollIndicator={false}>
              {/* Date Range Options */}
              <Text style={styles.exportSectionLabel}>Select Date Range</Text>
              <View style={styles.exportDateRangeGrid}>
                {dateRangeOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.exportDateRangeOption,
                      exportDateRange === option.id && styles.exportDateRangeOptionActive,
                    ]}
                    onPress={() => setExportDateRange(option.id)}
                  >
                    <Ionicons
                      name={option.icon as any}
                      size={20}
                      color={exportDateRange === option.id ? COLORS.primary : COLORS.textMuted}
                    />
                    <Text style={[
                      styles.exportDateRangeText,
                      exportDateRange === option.id && styles.exportDateRangeTextActive,
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Custom Date Range Picker */}
              {exportDateRange === 'custom' && (
                <View style={styles.customDateRangeContainer}>
                  <View style={styles.customDateRow}>
                    <View style={styles.customDateField}>
                      <Text style={styles.customDateLabel}>Start Date</Text>
                      <TouchableOpacity
                        style={styles.customDateInput}
                        onPress={() => {
                          setExportDatePickerTarget('start');
                          setShowExportDatePicker(!showExportDatePicker || exportDatePickerTarget !== 'start');
                        }}
                      >
                        <Ionicons name="calendar" size={16} color={COLORS.primary} />
                        <Text style={styles.customDateText}>{exportStartDate}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.customDateDivider}>
                      <Ionicons name="arrow-forward" size={16} color={COLORS.textMuted} />
                    </View>
                    <View style={styles.customDateField}>
                      <Text style={styles.customDateLabel}>End Date</Text>
                      <TouchableOpacity
                        style={styles.customDateInput}
                        onPress={() => {
                          setExportDatePickerTarget('end');
                          setShowExportDatePicker(!showExportDatePicker || exportDatePickerTarget !== 'end');
                        }}
                      >
                        <Ionicons name="calendar" size={16} color={COLORS.primary} />
                        <Text style={styles.customDateText}>{exportEndDate}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  {showExportDatePicker && (
                    <View style={styles.exportDatePickerContainer}>
                      <Text style={styles.exportDatePickerLabel}>
                        Select {exportDatePickerTarget === 'start' ? 'Start' : 'End'} Date
                      </Text>
                      {renderExportCalendar(exportDatePickerTarget)}
                    </View>
                  )}
                </View>
              )}

              {/* Export Format Selection */}
              <Text style={[styles.exportSectionLabel, { marginTop: 20 }]}>Select Export Format</Text>
              <View style={styles.exportFormatOptions}>
                <TouchableOpacity
                  style={styles.exportFormatOption}
                  onPress={exportToPDF}
                  disabled={isExporting}
                >
                  <View style={[styles.exportFormatIcon, { backgroundColor: COLORS.error + '15' }]}>
                    <MaterialCommunityIcons name="file-pdf-box" size={32} color={COLORS.error} />
                  </View>
                  <Text style={styles.exportFormatTitle}>PDF Report</Text>
                  <Text style={styles.exportFormatDesc}>Detailed report with charts</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.exportFormatOption}
                  onPress={exportToCSV}
                  disabled={isExporting}
                >
                  <View style={[styles.exportFormatIcon, { backgroundColor: COLORS.info + '15' }]}>
                    <MaterialCommunityIcons name="file-delimited" size={32} color={COLORS.info} />
                  </View>
                  <Text style={styles.exportFormatTitle}>CSV File</Text>
                  <Text style={styles.exportFormatDesc}>Data in spreadsheet format</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.exportFormatOption}
                  onPress={exportToExcel}
                  disabled={isExporting}
                >
                  <View style={[styles.exportFormatIcon, { backgroundColor: COLORS.success + '15' }]}>
                    <MaterialCommunityIcons name="file-excel" size={32} color={COLORS.success} />
                  </View>
                  <Text style={styles.exportFormatTitle}>Excel File</Text>
                  <Text style={styles.exportFormatDesc}>Native Excel format</Text>
                </TouchableOpacity>
              </View>

              {/* Export Summary */}
              <View style={styles.exportSummary}>
                <Ionicons name="information-circle" size={18} color={COLORS.info} />
                <Text style={styles.exportSummaryText}>
                  Report will include data for {filteredLogs.length} couple(s) from the selected date range.
                </Text>
              </View>
            </ScrollView>

            {/* Loading Overlay */}
            {isExporting && (
              <View style={styles.exportLoadingOverlay}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.exportLoadingText}>Generating report...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  // Couple Detail Modal
  const renderCoupleDetailModal = () => {
    if (!selectedCouple) return null;
    
    const details = coupleDetails[selectedCouple.coupleId];
    
    // Close modal handler
    const handleCloseModal = () => {
      setShowDetailModal(false);
      setShowStepHistory(false);
      setShowPastLogs(false);
    };
    
    // Format step count for display
    const formatStepCount = (count: number, status: LogStatus): string => {
      if (status === 'pending' || count === 0) return 'Not logged';
      return count.toLocaleString() + ' steps';
    };
    
    // Format exercise duration
    const formatExercise = (duration: number | undefined, calories: number | undefined, status: LogStatus): string => {
      if (!duration || duration === 0) return status === 'pending' ? 'Not logged' : 'Not logged';
      return `${duration} min (${calories || 0} cal)`;
    };
    
    // Generate logs based on actual data
    const logsToShow: DetailedLogEntry[] = [
      { metric: 'Steps', icon: 'walk', iconFamily: 'MaterialCommunityIcons' as const, maleValue: formatStepCount(selectedCouple.steps.maleCount, selectedCouple.steps.male), femaleValue: formatStepCount(selectedCouple.steps.femaleCount, selectedCouple.steps.female), maleStatus: selectedCouple.steps.male, femaleStatus: selectedCouple.steps.female, unit: 'steps' },
      { metric: 'Exercise', icon: 'fitness', iconFamily: 'Ionicons' as const, maleValue: formatExercise(selectedCouple.exercise.maleDuration, selectedCouple.exercise.maleCalories, selectedCouple.exercise.male), femaleValue: formatExercise(selectedCouple.exercise.femaleDuration, selectedCouple.exercise.femaleCalories, selectedCouple.exercise.female), maleStatus: selectedCouple.exercise.male, femaleStatus: selectedCouple.exercise.female, unit: '' },
      { metric: 'Diet Log', icon: 'nutrition', iconFamily: 'Ionicons' as const, maleValue: selectedCouple.diet.male === 'complete' ? '3 meals' : selectedCouple.diet.male === 'partial' ? '1 meal' : 'Not logged', femaleValue: selectedCouple.diet.female === 'complete' ? '3 meals' : selectedCouple.diet.female === 'partial' ? '1 meal' : 'Not logged', maleStatus: selectedCouple.diet.male, femaleStatus: selectedCouple.diet.female, unit: '' },
      { metric: 'Weight', icon: 'scale-bathroom', iconFamily: 'MaterialCommunityIcons' as const, maleValue: details?.maleWeight ? `${details.maleWeight} kg` : (selectedCouple.weight.male === 'pending' ? 'Pending' : 'Not logged'), femaleValue: details?.femaleWeight ? `${details.femaleWeight} kg` : (selectedCouple.weight.female === 'pending' ? 'Pending' : 'Not logged'), maleStatus: selectedCouple.weight.male, femaleStatus: selectedCouple.weight.female, unit: '' },
      { metric: 'Couple Walking', icon: 'people', iconFamily: 'Ionicons' as const, maleValue: selectedCouple.coupleWalking === 'complete' ? '30 min' : selectedCouple.coupleWalking === 'partial' ? '15 min' : 'Not done', femaleValue: selectedCouple.coupleWalking === 'complete' ? '30 min' : selectedCouple.coupleWalking === 'partial' ? '15 min' : 'Not done', maleStatus: selectedCouple.coupleWalking, femaleStatus: selectedCouple.coupleWalking, unit: '' },
      // Feedback metric removed from monitoring
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
        onRequestClose={handleCloseModal}
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
                    {details ? `${details.maleName} & ${details.femaleName}` : 'Couple Details'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Couple Info Section */}
              {details && (
                <View style={styles.coupleInfoSection}>
                  <Text style={styles.sectionLabel}>Couple Information</Text>
                  <View style={styles.infoGrid}>
                    <View style={styles.infoCard}>
                      <View style={[styles.infoCardIcon, { backgroundColor: COLORS.primary + '15' }]}>
                        <Ionicons name="male" size={20} color={COLORS.primary} />
                      </View>
                      <View style={styles.infoCardContent}>
                        <Text style={styles.infoCardTitle}>{details.maleName}</Text>
                        <Text style={styles.infoCardSubtitle}>{details.maleEmail}</Text>
                        <Text style={styles.infoCardSubtitle}>{details.malePhone}</Text>
                        {details.maleWeight && (
                          <Text style={styles.infoCardSubtitle}>Last weight: {details.maleWeight} kg ({details.maleLastWeightDate})</Text>
                        )}
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
                        <Text style={styles.infoCardTitle}>{details.femaleName}</Text>
                        <Text style={styles.infoCardSubtitle}>{details.femaleEmail}</Text>
                        <Text style={styles.infoCardSubtitle}>{details.femalePhone}</Text>
                        {details.femaleWeight && (
                          <Text style={styles.infoCardSubtitle}>Last weight: {details.femaleWeight} kg ({details.femaleLastWeightDate})</Text>
                        )}
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
                      handleCloseModal();
                      router.push(`/admin/user-dashboard?coupleId=${selectedCouple.coupleId}` as any);
                    }}
                  >
                    <Ionicons name="analytics-outline" size={18} color="#fff" />
                    <Text style={styles.viewCoupleDashboardText}>View Couple Dashboard</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.enrollmentInfo}>
                    <Ionicons name="calendar" size={16} color={COLORS.textMuted} />
                    <Text style={styles.enrollmentText}>Enrolled: {details.enrollmentDate}</Text>
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
                  
                  {/* Step History Expandable Section */}
                  {((details?.maleStepEntries?.length ?? 0) > 0 || (details?.femaleStepEntries?.length ?? 0) > 0) && (
                    <View style={styles.stepHistorySection}>
                      <TouchableOpacity 
                        style={styles.stepHistoryToggle}
                        onPress={() => setShowStepHistory(!showStepHistory)}
                      >
                        <View style={styles.stepHistoryHeader}>
                          <MaterialCommunityIcons name="walk" size={20} color={COLORS.primary} />
                          <Text style={styles.stepHistoryTitle}>Step Log History</Text>
                        </View>
                        <Ionicons 
                          name={showStepHistory ? 'chevron-up' : 'chevron-down'} 
                          size={20} 
                          color={COLORS.textSecondary} 
                        />
                      </TouchableOpacity>
                      
                      {showStepHistory && (
                        <View style={styles.stepHistoryContent}>
                          {/* Male Step Entries */}
                          {details?.maleStepEntries && details.maleStepEntries.length > 0 && (
                            <View style={styles.stepEntryGroup}>
                              <View style={styles.stepEntryGroupHeader}>
                                <Ionicons name="male" size={16} color={COLORS.primary} />
                                <Text style={styles.stepEntryGroupTitle}>Male Partner</Text>
                              </View>
                              {details.maleStepEntries.map((entry, idx) => (
                                <View key={idx} style={styles.stepEntryRow}>
                                  <View style={styles.stepEntryInfo}>
                                    <Text style={styles.stepEntryCount}>
                                      {entry.stepCount.toLocaleString()} steps
                                    </Text>
                                    <Text style={styles.stepEntrySource}>
                                      via {entry.source || 'manual'}
                                    </Text>
                                  </View>
                                  <View style={styles.stepEntryTime}>
                                    <Text style={styles.stepEntryTimeText}>
                                      {entry.loggedAt?.toDate ? 
                                        new Date(entry.loggedAt.toDate()).toLocaleTimeString('en-US', { 
                                          hour: '2-digit', 
                                          minute: '2-digit' 
                                        }) : 
                                        '--:--'
                                      }
                                    </Text>
                                    {entry.proofImageUrl && (
                                      <Ionicons name="image" size={14} color={COLORS.success} />
                                    )}
                                  </View>
                                </View>
                              ))}
                            </View>
                          )}
                          
                          {/* Female Step Entries */}
                          {details?.femaleStepEntries && details.femaleStepEntries.length > 0 && (
                            <View style={styles.stepEntryGroup}>
                              <View style={styles.stepEntryGroupHeader}>
                                <Ionicons name="female" size={16} color={COLORS.accent} />
                                <Text style={styles.stepEntryGroupTitle}>Female Partner</Text>
                              </View>
                              {details.femaleStepEntries.map((entry, idx) => (
                                <View key={idx} style={styles.stepEntryRow}>
                                  <View style={styles.stepEntryInfo}>
                                    <Text style={styles.stepEntryCount}>
                                      {entry.stepCount.toLocaleString()} steps
                                    </Text>
                                    <Text style={styles.stepEntrySource}>
                                      via {entry.source || 'manual'}
                                    </Text>
                                  </View>
                                  <View style={styles.stepEntryTime}>
                                    <Text style={styles.stepEntryTimeText}>
                                      {entry.loggedAt?.toDate ? 
                                        new Date(entry.loggedAt.toDate()).toLocaleTimeString('en-US', { 
                                          hour: '2-digit', 
                                          minute: '2-digit' 
                                        }) : 
                                        '--:--'
                                      }
                                    </Text>
                                    {entry.proofImageUrl && (
                                      <Ionicons name="image" size={14} color={COLORS.success} />
                                    )}
                                  </View>
                                </View>
                              ))}
                            </View>
                          )}
                          
                          {/* Empty State */}
                          {(!details?.maleStepEntries || details.maleStepEntries.length === 0) && 
                           (!details?.femaleStepEntries || details.femaleStepEntries.length === 0) && (
                            <Text style={styles.noStepEntries}>No step entries logged today</Text>
                          )}
                        </View>
                      )}
                    </View>
                  )}
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
                onPress={handleCloseModal}
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
          {renderDatePicker()}

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ marginTop: 16, color: COLORS.textSecondary }}>Loading couples data...</Text>
        </View>
      ) : (
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

              {/* Grid - Wrapped in horizontal ScrollView for mobile */}
              <ScrollView horizontal showsHorizontalScrollIndicator={isMobile} style={{ flex: 1 }}>
                <View style={[styles.grid, isMobile && { minWidth: 500 }]}>
                  {renderMetricHeaders()}
                  {renderGridHeader()}
                  {filteredLogs.map(log => renderLogRow(log))}
                </View>
              </ScrollView>

              {filteredLogs.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="folder-open" size={48} color={COLORS.textMuted} />
                  <Text style={styles.emptyStateText}>
                    {logs.length === 0 ? 'No couples enrolled yet' : 'No logs found matching your filters'}
                  </Text>
                </View>
              )}
            </View>

            {/* Export Section */}
            {renderExportSection()}
          </View>
        </ScrollView>
      )}

      {/* Couple Detail Modal */}
      {renderCoupleDetailModal()}
      
      {/* Export Modal */}
      {renderExportModal()}
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
  // Step History Styles
  stepHistorySection: {
    marginTop: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    overflow: 'hidden',
  },
  stepHistoryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: COLORS.primary + '08',
  },
  stepHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepHistoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  stepHistoryContent: {
    padding: 14,
    gap: 16,
  },
  stepEntryGroup: {
    gap: 8,
  },
  stepEntryGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  stepEntryGroupTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  stepEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  stepEntryInfo: {
    flex: 1,
  },
  stepEntryCount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  stepEntrySource: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  stepEntryTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepEntryTimeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  noStepEntries: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 12,
    fontStyle: 'italic',
  },

  // Enhanced Date Picker Styles
  datePickerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  quickDateOptions: {
    flexDirection: 'row',
    gap: 6,
  },
  quickDateChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.borderLight,
  },
  quickDateChipActive: {
    backgroundColor: COLORS.primary,
  },
  quickDateChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  quickDateChipTextActive: {
    color: '#fff',
  },

  // Calendar Modal Styles
  calendarModalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  calendarQuickOptions: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    justifyContent: 'center',
  },
  calendarQuickChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.borderLight,
  },
  calendarQuickChipActive: {
    backgroundColor: COLORS.primary,
  },
  calendarQuickText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  calendarQuickTextActive: {
    color: '#fff',
  },
  calendarNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  calendarNavButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.borderLight,
  },
  calendarMonthYear: {
    alignItems: 'center',
  },
  calendarMonthText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  calendarYearText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  calendarDayHeaders: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  calendarDayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  calendarDayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayCellActive: {
    borderRadius: 20,
  },
  calendarDayCellToday: {
    backgroundColor: COLORS.primary + '15',
  },
  calendarDayCellSelected: {
    backgroundColor: COLORS.primary,
  },
  calendarDayCellDisabled: {
    opacity: 0.3,
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  calendarDayTextToday: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  calendarDayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  calendarDayTextDisabled: {
    color: COLORS.textMuted,
  },
  manualDateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: 12,
  },
  manualDateLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  manualDateTextInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  manualDateApply: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '15',
  },

  // Export Modal Styles
  exportModalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  exportModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    backgroundColor: COLORS.primary + '08',
  },
  exportModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exportModalIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  exportModalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  exportModalBody: {
    padding: 20,
  },
  exportSectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  exportDateRangeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  exportDateRangeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.borderLight,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  exportDateRangeOptionActive: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  exportDateRangeText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  exportDateRangeTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  customDateRangeContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: COLORS.borderLight,
    borderRadius: 12,
  },
  customDateRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  customDateField: {
    flex: 1,
  },
  customDateLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  customDateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  customDateText: {
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  customDateDivider: {
    paddingBottom: 10,
  },
  exportDatePickerContainer: {
    marginTop: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
  },
  exportDatePickerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  exportCalendarContainer: {},
  exportCalendarMonthYear: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  exportCalendarDayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  exportCalendarDayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  exportCalendarDaySelected: {
    backgroundColor: COLORS.primary,
  },
  exportCalendarDayDisabled: {
    opacity: 0.3,
  },
  exportCalendarDayText: {
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  exportCalendarDayTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  exportCalendarDayTextDisabled: {
    color: COLORS.textMuted,
  },
  exportFormatOptions: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  exportFormatOption: {
    flex: 1,
    minWidth: 130,
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.borderLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  exportFormatIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  exportFormatTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  exportFormatDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  exportSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    padding: 12,
    backgroundColor: COLORS.info + '10',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.info + '30',
  },
  exportSummaryText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.info,
    lineHeight: 18,
  },
  exportLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  exportLoadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
});
