import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  Animated,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const PRIMARY = '#006dab';
const ACCENT = '#98be4e';
const SUCCESS = '#22c55e';
const WARNING = '#f59e0b';
const ERROR = '#ef4444';
const INFO = '#3b82f6';

interface ReportType {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconFamily: 'Ionicons' | 'MaterialCommunityIcons';
  color: string;
  lastGenerated?: string;
  frequency: string;
}

interface ReportHistory {
  id: string;
  reportType: string;
  generatedAt: string;
  status: 'completed' | 'processing' | 'failed';
  fileSize?: string;
  downloadUrl?: string;
}

// Mock data
const reportTypes: ReportType[] = [
  {
    id: '1',
    title: 'User Progress Summary',
    description: 'Overview of all users\' health metrics, goals achieved, and engagement levels',
    icon: 'analytics',
    iconFamily: 'Ionicons',
    color: PRIMARY,
    lastGenerated: '2024-01-18',
    frequency: 'Weekly',
  },
  {
    id: '2',
    title: 'Pregnancy Outcomes',
    description: 'Track pregnancy success rates and health improvements of couples',
    icon: 'heart-pulse',
    iconFamily: 'MaterialCommunityIcons',
    color: ACCENT,
    lastGenerated: '2024-01-15',
    frequency: 'Monthly',
  },
  {
    id: '3',
    title: 'Weight Management',
    description: 'Detailed analysis of weight loss/gain trends across all users',
    icon: 'scale-bathroom',
    iconFamily: 'MaterialCommunityIcons',
    color: SUCCESS,
    lastGenerated: '2024-01-17',
    frequency: 'Weekly',
  },
  {
    id: '4',
    title: 'Exercise Compliance',
    description: 'User adherence to exercise goals and step count achievements',
    icon: 'fitness',
    iconFamily: 'Ionicons',
    color: WARNING,
    lastGenerated: '2024-01-18',
    frequency: 'Daily',
  },
  {
    id: '5',
    title: 'Diet & Nutrition',
    description: 'Analysis of dietary habits, meal logging, and nutritional intake',
    icon: 'nutrition',
    iconFamily: 'Ionicons',
    color: ERROR,
    lastGenerated: '2024-01-16',
    frequency: 'Weekly',
  },
  {
    id: '6',
    title: 'Appointment Analytics',
    description: 'Counselling session attendance, no-shows, and scheduling patterns',
    icon: 'calendar-clock',
    iconFamily: 'MaterialCommunityIcons',
    color: INFO,
    lastGenerated: '2024-01-18',
    frequency: 'Weekly',
  },
];

const reportHistory: ReportHistory[] = [
  {
    id: '1',
    reportType: 'User Progress Summary',
    generatedAt: '2024-01-18 14:30',
    status: 'completed',
    fileSize: '2.4 MB',
  },
  {
    id: '2',
    reportType: 'Exercise Compliance',
    generatedAt: '2024-01-18 09:00',
    status: 'completed',
    fileSize: '1.8 MB',
  },
  {
    id: '3',
    reportType: 'Weight Management',
    generatedAt: '2024-01-17 16:45',
    status: 'completed',
    fileSize: '3.1 MB',
  },
  {
    id: '4',
    reportType: 'Appointment Analytics',
    generatedAt: '2024-01-18 10:15',
    status: 'processing',
  },
  {
    id: '5',
    reportType: 'Diet & Nutrition',
    generatedAt: '2024-01-16 11:30',
    status: 'failed',
  },
];

export default function AdminReportsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isMobileWeb =
    Platform.OS === 'web' &&
    typeof navigator !== 'undefined' &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const [selectedTab, setSelectedTab] = useState<'generate' | 'history' | 'schedule'>('generate');
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [showSuccess, setShowSuccess] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const showSuccessToast = () => {
    setShowSuccess(true);
    Animated.sequence([
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(successAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setShowSuccess(false));
  };

  const handleGenerateReport = (report: ReportType) => {
    setSelectedReport(report);
    setShowExportModal(true);
  };

  const handleExport = () => {
    if (!selectedReport) return;
    
    setShowExportModal(false);
    setGeneratingReport(selectedReport.id);
    
    // Simulate report generation
    setTimeout(() => {
      setGeneratingReport(null);
      showSuccessToast();
    }, 2500);
  };

  const renderReportCard = (report: ReportType) => {
    const isGenerating = generatingReport === report.id;
    const IconComponent = report.iconFamily === 'Ionicons' ? Ionicons : MaterialCommunityIcons;

    return (
      <TouchableOpacity
        key={report.id}
        style={[
          styles.reportCard,
          isMobile && styles.reportCardMobile,
        ]}
        onPress={() => handleGenerateReport(report)}
        disabled={isGenerating}
        activeOpacity={0.7}
      >
        <View style={[styles.reportIconContainer, { backgroundColor: `${report.color}15` }]}>
          <IconComponent name={report.icon as any} size={28} color={report.color} />
        </View>
        
        <View style={styles.reportInfo}>
          <Text style={styles.reportTitle}>{report.title}</Text>
          <Text style={styles.reportDescription} numberOfLines={2}>
            {report.description}
          </Text>
          <View style={styles.reportMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color="#6b7280" />
              <Text style={styles.metaText}>{report.frequency}</Text>
            </View>
            {report.lastGenerated && (
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                <Text style={styles.metaText}>Last: {report.lastGenerated}</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.reportAction}>
          {isGenerating ? (
            <ActivityIndicator size="small" color={PRIMARY} />
          ) : (
            <View style={[styles.generateBadge, { backgroundColor: `${report.color}15` }]}>
              <Ionicons name="download-outline" size={18} color={report.color} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderHistoryItem = (item: ReportHistory) => {
    const getStatusColor = () => {
      switch (item.status) {
        case 'completed': return SUCCESS;
        case 'processing': return WARNING;
        case 'failed': return ERROR;
        default: return '#6b7280';
      }
    };

    const getStatusIcon = () => {
      switch (item.status) {
        case 'completed': return 'checkmark-circle';
        case 'processing': return 'time';
        case 'failed': return 'alert-circle';
        default: return 'help-circle';
      }
    };

    return (
      <View key={item.id} style={styles.historyItem}>
        <View style={styles.historyLeft}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <View style={styles.historyInfo}>
            <Text style={styles.historyTitle}>{item.reportType}</Text>
            <Text style={styles.historyTime}>{item.generatedAt}</Text>
          </View>
        </View>
        
        <View style={styles.historyRight}>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}15` }]}>
            <Ionicons name={getStatusIcon()} size={14} color={getStatusColor()} />
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
          
          {item.status === 'completed' && (
            <TouchableOpacity style={styles.downloadButton}>
              <Ionicons name="download-outline" size={18} color={PRIMARY} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderScheduledReports = () => {
    const scheduledReports = [
      { id: '1', name: 'User Progress Summary', schedule: 'Every Monday at 9:00 AM', enabled: true },
      { id: '2', name: 'Exercise Compliance', schedule: 'Daily at 8:00 AM', enabled: true },
      { id: '3', name: 'Weight Management', schedule: 'Every Friday at 5:00 PM', enabled: false },
      { id: '4', name: 'Pregnancy Outcomes', schedule: '1st of every month', enabled: true },
    ];

    return (
      <View style={styles.scheduleSection}>
        <Text style={styles.sectionSubtitle}>Automated Report Scheduling</Text>
        
        {scheduledReports.map((report) => (
          <View key={report.id} style={styles.scheduleItem}>
            <View style={styles.scheduleLeft}>
              <Text style={styles.scheduleName}>{report.name}</Text>
              <Text style={styles.scheduleTime}>{report.schedule}</Text>
            </View>
            <TouchableOpacity 
              style={[
                styles.toggleButton,
                report.enabled && styles.toggleButtonEnabled,
              ]}
            >
              <View 
                style={[
                  styles.toggleKnob,
                  report.enabled && styles.toggleKnobEnabled,
                ]} 
              />
            </TouchableOpacity>
          </View>
        ))}
        
        <TouchableOpacity style={styles.addScheduleButton}>
          <LinearGradient
            colors={[PRIMARY, '#0088d4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.addScheduleGradient}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addScheduleText}>Add New Schedule</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[PRIMARY, '#0088d4']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, isMobile && styles.headerMobile]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Reports & Export</Text>
            <Text style={styles.headerSubtitle}>Generate and download data reports</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          isMobile && styles.contentContainerMobile,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Stats */}
        <View style={[styles.statsRow, isMobile && styles.statsRowMobile]}>
          <View style={[styles.statCard, { backgroundColor: `${PRIMARY}10` }]}>
            <Text style={[styles.statNumber, { color: PRIMARY }]}>156</Text>
            <Text style={styles.statLabel}>Reports Generated</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: `${SUCCESS}10` }]}>
            <Text style={[styles.statNumber, { color: SUCCESS }]}>42</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: `${ACCENT}10` }]}>
            <Text style={[styles.statNumber, { color: ACCENT }]}>8</Text>
            <Text style={styles.statLabel}>Scheduled</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          {(['generate', 'history', 'schedule'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, selectedTab === tab && styles.tabActive]}
              onPress={() => setSelectedTab(tab)}
            >
              <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content based on tab */}
        <Animated.View style={{ opacity: fadeAnim }}>
          {selectedTab === 'generate' && (
            <View style={styles.reportsSection}>
              <Text style={styles.sectionTitle}>Available Reports</Text>
              <View style={[styles.reportsGrid, isMobile && styles.reportsGridMobile]}>
                {reportTypes.map(renderReportCard)}
              </View>
            </View>
          )}

          {selectedTab === 'history' && (
            <View style={styles.historySection}>
              <Text style={styles.sectionTitle}>Recent Reports</Text>
              <View style={styles.historyList}>
                {reportHistory.map(renderHistoryItem)}
              </View>
              
              <TouchableOpacity style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>View All History</Text>
                <Ionicons name="chevron-forward" size={16} color={PRIMARY} />
              </TouchableOpacity>
            </View>
          )}

          {selectedTab === 'schedule' && renderScheduledReports()}
        </Animated.View>

        {/* Data Export Section */}
        <View style={styles.exportSection}>
          <Text style={styles.sectionTitle}>Bulk Data Export</Text>
          <Text style={styles.exportDescription}>
            Export all user data for backup or analysis purposes
          </Text>
          
          <View style={[styles.exportOptions, isMobile && styles.exportOptionsMobile]}>
            <TouchableOpacity style={styles.exportOption}>
              <View style={[styles.exportIcon, { backgroundColor: `${ERROR}15` }]}>
                <MaterialCommunityIcons name="file-pdf-box" size={28} color={ERROR} />
              </View>
              <Text style={styles.exportOptionText}>PDF</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.exportOption}>
              <View style={[styles.exportIcon, { backgroundColor: `${SUCCESS}15` }]}>
                <MaterialCommunityIcons name="microsoft-excel" size={28} color={SUCCESS} />
              </View>
              <Text style={styles.exportOptionText}>Excel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.exportOption}>
              <View style={[styles.exportIcon, { backgroundColor: `${PRIMARY}15` }]}>
                <MaterialCommunityIcons name="file-delimited" size={28} color={PRIMARY} />
              </View>
              <Text style={styles.exportOptionText}>CSV</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.exportOption}>
              <View style={[styles.exportIcon, { backgroundColor: `${WARNING}15` }]}>
                <MaterialCommunityIcons name="code-json" size={28} color={WARNING} />
              </View>
              <Text style={styles.exportOptionText}>JSON</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.fullExportButton}>
            <LinearGradient
              colors={[ACCENT, '#7da33e']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.fullExportGradient}
            >
              <Ionicons name="cloud-download-outline" size={20} color="#fff" />
              <Text style={styles.fullExportText}>Export All Data</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Export Modal */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isMobile && styles.modalContentMobile]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Generate Report</Text>
              <TouchableOpacity onPress={() => setShowExportModal(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            
            {selectedReport && (
              <>
                <Text style={styles.modalReportName}>{selectedReport.title}</Text>
                
                <Text style={styles.modalLabel}>Date Range</Text>
                <View style={styles.optionRow}>
                  {(['week', 'month', 'quarter', 'year'] as const).map((range) => (
                    <TouchableOpacity
                      key={range}
                      style={[
                        styles.optionButton,
                        dateRange === range && styles.optionButtonActive,
                      ]}
                      onPress={() => setDateRange(range)}
                    >
                      <Text
                        style={[
                          styles.optionButtonText,
                          dateRange === range && styles.optionButtonTextActive,
                        ]}
                      >
                        {range.charAt(0).toUpperCase() + range.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <Text style={styles.modalLabel}>Export Format</Text>
                <View style={styles.optionRow}>
                  {(['pdf', 'excel', 'csv'] as const).map((format) => (
                    <TouchableOpacity
                      key={format}
                      style={[
                        styles.optionButton,
                        exportFormat === format && styles.optionButtonActive,
                      ]}
                      onPress={() => setExportFormat(format)}
                    >
                      <Text
                        style={[
                          styles.optionButtonText,
                          exportFormat === format && styles.optionButtonTextActive,
                        ]}
                      >
                        {format.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowExportModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.generateButton} onPress={handleExport}>
                    <LinearGradient
                      colors={[PRIMARY, '#0088d4']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.generateButtonGradient}
                    >
                      <Ionicons name="document-text-outline" size={18} color="#fff" />
                      <Text style={styles.generateButtonText}>Generate</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Success Toast */}
      {showSuccess && (
        <Animated.View
          style={[
            styles.successToast,
            {
              opacity: successAnim,
              transform: [
                {
                  translateY: successAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={24} color="#fff" />
          <Text style={styles.successToastText}>Report generated successfully!</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: Platform.OS === 'web' ? 20 : 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerMobile: {
    paddingTop: 50,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  contentContainerMobile: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statsRowMobile: {
    flexDirection: 'column',
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: PRIMARY,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#fff',
  },
  reportsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  reportsGrid: {
    gap: 12,
  },
  reportsGridMobile: {
    gap: 10,
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reportCardMobile: {
    padding: 14,
  },
  reportIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  reportDescription: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  reportMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#6b7280',
  },
  reportAction: {
    paddingLeft: 8,
  },
  generateBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historySection: {
    marginBottom: 24,
  },
  historyList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  historyTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  downloadButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${PRIMARY}10`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 16,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY,
  },
  scheduleSection: {
    marginBottom: 24,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  scheduleLeft: {
    flex: 1,
  },
  scheduleName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  scheduleTime: {
    fontSize: 13,
    color: '#6b7280',
  },
  toggleButton: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
    padding: 3,
    justifyContent: 'center',
  },
  toggleButtonEnabled: {
    backgroundColor: ACCENT,
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
  },
  toggleKnobEnabled: {
    alignSelf: 'flex-end',
  },
  addScheduleButton: {
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addScheduleGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  addScheduleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  exportSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  exportDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    marginTop: -8,
  },
  exportOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  exportOptionsMobile: {
    justifyContent: 'space-between',
  },
  exportOption: {
    alignItems: 'center',
    gap: 8,
  },
  exportIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  fullExportButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  fullExportGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  fullExportText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 420,
  },
  modalContentMobile: {
    maxWidth: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  modalReportName: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIMARY,
    marginBottom: 20,
    padding: 12,
    backgroundColor: `${PRIMARY}10`,
    borderRadius: 10,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  optionButtonActive: {
    borderColor: PRIMARY,
    backgroundColor: `${PRIMARY}10`,
  },
  optionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  optionButtonTextActive: {
    color: PRIMARY,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  generateButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  generateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  generateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  successToast: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: SUCCESS,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  successToastText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
