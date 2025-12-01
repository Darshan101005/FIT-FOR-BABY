import { useApp } from '@/context/AppContext';
import { coupleService, doctorVisitService, formatDateString, nursingVisitService } from '@/services/firestore.service';
import { Couple, DoctorVisit, NursingDepartmentVisit } from '@/types/firebase.types';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
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

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const HOURS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MINUTES = ['00', '15', '30', '45'];
const SCHEDULE_DAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export default function AdminAppointmentsScreen() {
  const router = useRouter();
  const { user } = useApp();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;

  // Tab state
  const [activeTab, setActiveTab] = useState<'doctorVisit' | 'nursingVisit'>('doctorVisit');
  
  // Data states
  const [couples, setCouples] = useState<Couple[]>([]);
  const [doctorVisits, setDoctorVisits] = useState<DoctorVisit[]>([]);
  const [nursingVisits, setNursingVisits] = useState<NursingDepartmentVisit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Schedule modal states
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<'manual' | 'automatic'>('manual');
  const [selectedCouple, setSelectedCouple] = useState<Couple | null>(null);
  const [showCoupleDropdown, setShowCoupleDropdown] = useState(false);
  const [coupleSearchQuery, setCoupleSearchQuery] = useState('');
  
  // Manual scheduling
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedHour, setSelectedHour] = useState('10');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [visitPurpose, setVisitPurpose] = useState('');
  const [visitNotes, setVisitNotes] = useState('');
  
  // Automatic scheduling
  const [autoScheduleDay, setAutoScheduleDay] = useState<number>(1); // Monday default
  const [showDayDropdown, setShowDayDropdown] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);

  // Load data
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load all couples
      const allCouples = await coupleService.getAll();
      setCouples(allCouples);

      // Load all doctor visits from all couples
      const allDoctorVisits: DoctorVisit[] = [];
      const allNursingVisits: NursingDepartmentVisit[] = [];
      
      for (const couple of allCouples) {
        const dv = await doctorVisitService.getAllForCouple(couple.coupleId);
        allDoctorVisits.push(...dv);
        
        const nv = await nursingVisitService.getAll(couple.coupleId);
        allNursingVisits.push(...nv);
      }

      setDoctorVisits(allDoctorVisits);
      setNursingVisits(allNursingVisits);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get couple name by ID
  const getCoupleName = (coupleId: string) => {
    const couple = couples.find(c => c.coupleId === coupleId);
    if (couple) {
      const maleName = couple.male?.name || 'Male';
      const femaleName = couple.female?.name || 'Female';
      return `${maleName} & ${femaleName}`;
    }
    return coupleId;
  };

  // Filter doctor visits
  const filteredDoctorVisits = doctorVisits.filter(visit => {
    const coupleName = getCoupleName(visit.coupleId).toLowerCase();
    const matchesSearch = 
      visit.coupleId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coupleName.includes(searchQuery.toLowerCase()) ||
      (visit.doctorName?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || visit.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  // Filter nursing visits
  const filteredNursingVisits = nursingVisits.filter(visit => {
    const matchesSearch = 
      visit.coupleId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (visit.coupleName?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || visit.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  // Filter couples for dropdown
  const filteredCouples = couples.filter(couple => {
    const maleName = couple.male?.name || '';
    const femaleName = couple.female?.name || '';
    const fullName = `${maleName} ${femaleName}`.toLowerCase();
    return fullName.includes(coupleSearchQuery.toLowerCase()) || 
           couple.coupleId.toLowerCase().includes(coupleSearchQuery.toLowerCase());
  });

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days: (number | null)[] = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const isPastDate = (day: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
    return checkDate < today;
  };

  const isDateSelected = (day: number) => {
    if (!selectedDate || !day) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === calendarMonth.getMonth() &&
      selectedDate.getFullYear() === calendarMonth.getFullYear()
    );
  };

  // Generate automatic schedule dates (every 4 weeks for 3 months, starting from next week)
  const generateAutoScheduleDates = (startDate: Date, dayOfWeek: number): Date[] => {
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate end date (3 months from today)
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 3);

    // Start from next week - add 7 days to today first
    let currentDate = new Date(today);
    currentDate.setDate(currentDate.getDate() + 7); // Move to next week
    
    // Find the first occurrence of the selected day in next week or after
    while (currentDate.getDay() !== dayOfWeek) {
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Add dates every 4 weeks (limit to 4 visits)
    let visitCount = 0;
    while (currentDate <= endDate && visitCount < 4) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 28); // 4 weeks
      visitCount++;
    }

    return dates;
  };

  // Handle schedule appointment
  const handleScheduleAppointment = async () => {
    if (!selectedCouple) {
      alert('Please select a couple');
      return;
    }

    setIsSaving(true);
    try {
      const timeStr = `${selectedHour}:${selectedMinute} ${selectedPeriod}`;
      const adminName = user?.name || user?.email || 'Admin';

      if (scheduleMode === 'manual') {
        if (!selectedDate) {
          alert('Please select a date');
          setIsSaving(false);
          return;
        }

        await nursingVisitService.schedule(selectedCouple.coupleId, {
          coupleName: `${selectedCouple.male?.name || 'Male'} & ${selectedCouple.female?.name || 'Female'}`,
          date: formatDateString(selectedDate),
          time: timeStr,
          purpose: visitPurpose || 'Nursing Department Visit',
          notes: visitNotes,
          scheduledBy: user?.id || 'admin',
          scheduledByName: adminName,
        });

        alert('Appointment scheduled successfully!');
      } else {
        // Automatic scheduling
        const scheduleDates = generateAutoScheduleDates(new Date(), autoScheduleDay);
        
        let visitNum = 1;
        for (const date of scheduleDates) {
          await nursingVisitService.schedule(selectedCouple.coupleId, {
            coupleName: `${selectedCouple.male?.name || 'Male'} & ${selectedCouple.female?.name || 'Female'}`,
            date: formatDateString(date),
            time: timeStr,
            visitNumber: visitNum,
            purpose: visitPurpose || 'Nursing Department Visit',
            notes: visitNotes,
            scheduledBy: user?.id || 'admin',
            scheduledByName: adminName,
          });
          visitNum++;
        }

        alert(`${scheduleDates.length} appointments scheduled successfully!`);
      }

      // Reset form and reload
      resetScheduleForm();
      setShowScheduleModal(false);
      loadData();
    } catch (error) {
      console.error('Error scheduling appointment:', error);
      alert('Failed to schedule appointment');
    } finally {
      setIsSaving(false);
    }
  };

  const resetScheduleForm = () => {
    setSelectedCouple(null);
    setCoupleSearchQuery('');
    setSelectedDate(null);
    setScheduleMode('manual');
    setVisitPurpose('');
    setVisitNotes('');
    setAutoScheduleDay(1);
    setSelectedHour('10');
    setSelectedMinute('00');
    setSelectedPeriod('AM');
  };

  // Status color helper
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return COLORS.info;
      case 'scheduled': return COLORS.info;
      case 'confirmed': return COLORS.success;
      case 'completed': return COLORS.success;
      case 'cancelled': return COLORS.error;
      case 'missed': return COLORS.warning;
      default: return COLORS.textMuted;
    }
  };

  // Render Header with Tabs
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.headerTitle}>Appointments</Text>
          <Text style={styles.headerSubtitle}>
            {activeTab === 'doctorVisit' ? 'View doctor visits logged by users' : 'Schedule nursing department visits'}
          </Text>
        </View>
        {activeTab === 'nursingVisit' && (
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowScheduleModal(true)}
          >
            <Ionicons name="add" size={20} color="#fff" />
            {!isMobile && <Text style={styles.addButtonText}>Schedule Visit</Text>}
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'doctorVisit' && styles.tabActive]}
          onPress={() => setActiveTab('doctorVisit')}
        >
          <Ionicons 
            name="medical-outline" 
            size={18} 
            color={activeTab === 'doctorVisit' ? COLORS.primary : COLORS.textMuted} 
          />
          <Text style={[styles.tabText, activeTab === 'doctorVisit' && styles.tabTextActive]}>
            Doctor Visit
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'nursingVisit' && styles.tabActive]}
          onPress={() => setActiveTab('nursingVisit')}
        >
          <Ionicons 
            name="medkit-outline" 
            size={18} 
            color={activeTab === 'nursingVisit' ? COLORS.primary : COLORS.textMuted} 
          />
          <Text style={[styles.tabText, activeTab === 'nursingVisit' && styles.tabTextActive]}>
            Nursing Dept Visit
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by couple ID or name..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipsScroll}>
          <View style={styles.filterChips}>
            {['all', 'scheduled', 'completed', 'cancelled'].map(status => (
              <TouchableOpacity
                key={status}
                style={[styles.filterChip, selectedStatus === status && styles.filterChipActive]}
                onPress={() => setSelectedStatus(status)}
              >
                <Text style={[styles.filterChipText, selectedStatus === status && styles.filterChipTextActive]}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );

  // Render Doctor Visit Card
  const renderDoctorVisitCard = (visit: DoctorVisit) => (
    <View key={visit.id} style={styles.visitCard}>
      <View style={styles.visitDateBadge}>
        <Text style={styles.visitDateDay}>{new Date(visit.date).getDate()}</Text>
        <Text style={styles.visitDateMonth}>{MONTHS_SHORT[new Date(visit.date).getMonth()]}</Text>
      </View>
      
      <View style={styles.visitContent}>
        <View style={styles.visitHeader}>
          <Text style={styles.visitTime}>{visit.time}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(visit.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(visit.status) }]}>
              {visit.status}
            </Text>
          </View>
        </View>
        
        <Text style={styles.coupleName}>{getCoupleName(visit.coupleId)}</Text>
        <View style={styles.visitMeta}>
          <Ionicons name={visit.gender === 'male' ? 'male' : 'female'} size={14} color={COLORS.textMuted} />
          <Text style={styles.visitMetaText}>Logged by {visit.loggedBy}</Text>
        </View>
        
        {visit.doctorName && (
          <View style={styles.visitMeta}>
            <Ionicons name="person" size={14} color={COLORS.textMuted} />
            <Text style={styles.visitMetaText}>{visit.doctorName}</Text>
          </View>
        )}
        
        {visit.purpose && (
          <Text style={styles.visitPurpose}>{visit.purpose}</Text>
        )}
      </View>
    </View>
  );

  // Render Nursing Visit Card
  const renderNursingVisitCard = (visit: NursingDepartmentVisit) => (
    <View key={visit.id} style={styles.visitCard}>
      <View style={[styles.visitDateBadge, { backgroundColor: COLORS.accent + '20' }]}>
        <Text style={[styles.visitDateDay, { color: COLORS.accentDark }]}>{new Date(visit.date).getDate()}</Text>
        <Text style={[styles.visitDateMonth, { color: COLORS.accentDark }]}>{MONTHS_SHORT[new Date(visit.date).getMonth()]}</Text>
      </View>
      
      <View style={styles.visitContent}>
        <View style={styles.visitHeader}>
          <Text style={styles.visitTime}>{visit.time}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(visit.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(visit.status) }]}>
              {visit.status}
            </Text>
          </View>
        </View>
        
        <Text style={styles.coupleName}>{visit.coupleName || getCoupleName(visit.coupleId)}</Text>
        
        {visit.visitNumber && (
          <View style={styles.visitMeta}>
            <Ionicons name="calendar-number" size={14} color={COLORS.textMuted} />
            <Text style={styles.visitMetaText}>Visit #{visit.visitNumber}</Text>
          </View>
        )}
        
        {visit.scheduledByName && (
          <View style={styles.visitMeta}>
            <Ionicons name="person" size={14} color={COLORS.textMuted} />
            <Text style={styles.visitMetaText}>Scheduled by {visit.scheduledByName}</Text>
          </View>
        )}
        
        {visit.purpose && (
          <Text style={styles.visitPurpose}>{visit.purpose}</Text>
        )}
      </View>
      
      <TouchableOpacity style={styles.visitAction}>
        <Ionicons name="ellipsis-vertical" size={18} color={COLORS.textMuted} />
      </TouchableOpacity>
    </View>
  );

  // Close all dropdowns
  const closeAllDropdowns = () => {
    setShowCoupleDropdown(false);
    setShowDayDropdown(false);
    setShowCalendar(false);
    setShowTimePicker(false);
  };

  // Render Schedule Modal
  const renderScheduleModal = () => (
    <Modal
      visible={showScheduleModal}
      animationType="slide"
      transparent
      onRequestClose={() => {
        closeAllDropdowns();
        setShowScheduleModal(false);
      }}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={closeAllDropdowns}
      >
        <TouchableOpacity 
          style={[styles.modalContent, isMobile && styles.modalContentMobile]} 
          activeOpacity={1}
          onPress={closeAllDropdowns}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Schedule Nursing Visit</Text>
              <Text style={styles.modalSubtitle}>Schedule appointments for couples</Text>
            </View>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => {
                closeAllDropdowns();
                resetScheduleForm();
                setShowScheduleModal(false);
              }}
            >
              <Ionicons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.modalBody} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Step 1: Select Couple */}
            <View style={styles.formSection}>
              <View style={styles.formSectionHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>1</Text>
                </View>
                <Text style={styles.formSectionTitle}>Select Couple</Text>
              </View>
              
              <TouchableOpacity 
                style={[
                  styles.dropdownButton,
                  selectedCouple && styles.dropdownButtonSelected,
                  showCoupleDropdown && styles.dropdownButtonActive
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  setShowDayDropdown(false);
                  setShowCalendar(false);
                  setShowTimePicker(false);
                  setShowCoupleDropdown(!showCoupleDropdown);
                }}
              >
                <View style={styles.dropdownButtonContent}>
                  {selectedCouple ? (
                    <>
                      <Ionicons name="people" size={18} color={COLORS.primary} />
                      <View style={styles.dropdownSelectedInfo}>
                        <Text style={styles.dropdownText}>
                          {selectedCouple.male?.name || 'Male'} & {selectedCouple.female?.name || 'Female'}
                        </Text>
                        <Text style={styles.dropdownSubtext}>{selectedCouple.coupleId}</Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <Ionicons name="people-outline" size={18} color={COLORS.textMuted} />
                      <Text style={styles.dropdownPlaceholder}>Select a couple...</Text>
                    </>
                  )}
                </View>
                <Ionicons 
                  name={showCoupleDropdown ? "chevron-up" : "chevron-down"} 
                  size={18} 
                  color={COLORS.textMuted} 
                />
              </TouchableOpacity>
              
              {showCoupleDropdown && (
                <View style={styles.dropdownList}>
                  <View style={styles.dropdownSearchContainer}>
                    <Ionicons name="search" size={16} color={COLORS.textMuted} />
                    <TextInput
                      style={styles.dropdownSearch}
                      placeholder="Search by name or ID..."
                      placeholderTextColor={COLORS.textMuted}
                      value={coupleSearchQuery}
                      onChangeText={setCoupleSearchQuery}
                    />
                  </View>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                    {filteredCouples.length > 0 ? (
                      filteredCouples.map(couple => (
                        <TouchableOpacity
                          key={couple.coupleId}
                          style={[
                            styles.dropdownItem,
                            selectedCouple?.coupleId === couple.coupleId && styles.dropdownItemSelected
                          ]}
                          onPress={() => {
                            setSelectedCouple(couple);
                            setShowCoupleDropdown(false);
                            setCoupleSearchQuery('');
                          }}
                        >
                          <View style={styles.dropdownItemIcon}>
                            <Ionicons name="people" size={16} color={COLORS.primary} />
                          </View>
                          <View style={styles.dropdownItemContent}>
                            <Text style={styles.dropdownItemText}>
                              {couple.male?.name || 'Male'} & {couple.female?.name || 'Female'}
                            </Text>
                            <Text style={styles.dropdownItemSubtext}>{couple.coupleId}</Text>
                          </View>
                          {selectedCouple?.coupleId === couple.coupleId && (
                            <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                          )}
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={styles.dropdownEmpty}>
                        <Text style={styles.dropdownEmptyText}>No couples found</Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Step 2: Schedule Mode */}
            <View style={styles.formSection}>
              <View style={styles.formSectionHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>2</Text>
                </View>
                <Text style={styles.formSectionTitle}>Schedule Mode</Text>
              </View>
              
              <View style={styles.modeToggle}>
                <TouchableOpacity
                  style={[styles.modeButton, scheduleMode === 'manual' && styles.modeButtonActive]}
                  onPress={() => {
                    closeAllDropdowns();
                    setScheduleMode('manual');
                  }}
                >
                  <Ionicons 
                    name="calendar-outline" 
                    size={20} 
                    color={scheduleMode === 'manual' ? '#fff' : COLORS.textSecondary} 
                  />
                  <Text style={[styles.modeButtonText, scheduleMode === 'manual' && styles.modeButtonTextActive]}>
                    Manual
                  </Text>
                  <Text style={[styles.modeButtonHint, scheduleMode === 'manual' && styles.modeButtonHintActive]}>
                    Single date
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modeButton, scheduleMode === 'automatic' && styles.modeButtonActive]}
                  onPress={() => {
                    closeAllDropdowns();
                    setScheduleMode('automatic');
                  }}
                >
                  <Ionicons 
                    name="repeat-outline" 
                    size={20} 
                    color={scheduleMode === 'automatic' ? '#fff' : COLORS.textSecondary} 
                  />
                  <Text style={[styles.modeButtonText, scheduleMode === 'automatic' && styles.modeButtonTextActive]}>
                    Automatic
                  </Text>
                  <Text style={[styles.modeButtonHint, scheduleMode === 'automatic' && styles.modeButtonHintActive]}>
                    4 visits
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Step 3: Date/Day Selection */}
            <View style={styles.formSection}>
              <View style={styles.formSectionHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>3</Text>
                </View>
                <Text style={styles.formSectionTitle}>
                  {scheduleMode === 'manual' ? 'Select Date' : 'Select Day of Week'}
                </Text>
              </View>

              {scheduleMode === 'manual' ? (
                <>
                  <TouchableOpacity 
                    style={[
                      styles.dateButton,
                      selectedDate && styles.dateButtonSelected,
                      showCalendar && styles.dateButtonActive
                    ]}
                    onPress={(e) => {
                      e.stopPropagation();
                      setShowCoupleDropdown(false);
                      setShowDayDropdown(false);
                      setShowTimePicker(false);
                      setShowCalendar(!showCalendar);
                    }}
                  >
                    <Ionicons name="calendar" size={18} color={selectedDate ? COLORS.primary : COLORS.textMuted} />
                    <Text style={selectedDate ? styles.dateButtonText : styles.dateButtonPlaceholder}>
                      {selectedDate 
                        ? `${selectedDate.getDate()} ${MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
                        : 'Tap to select date...'}
                    </Text>
                    <Ionicons name={showCalendar ? "chevron-up" : "chevron-down"} size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>

                  {showCalendar && (
                    <View style={styles.calendarContainer}>
                      <View style={styles.calendarHeader}>
                        <TouchableOpacity 
                          style={styles.calendarNavButton}
                          onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                        >
                          <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
                        </TouchableOpacity>
                        <Text style={styles.calendarMonthText}>
                          {MONTHS[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                        </Text>
                        <TouchableOpacity 
                          style={styles.calendarNavButton}
                          onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                        >
                          <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.calendarWeekdays}>
                        {WEEKDAYS.map(day => (
                          <Text key={day} style={styles.calendarWeekday}>{day}</Text>
                        ))}
                      </View>

                      <View style={styles.calendarDays}>
                        {getDaysInMonth(calendarMonth).map((day, index) => (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.calendarDay,
                              day !== null && isDateSelected(day) && styles.calendarDaySelected,
                              day !== null && isPastDate(day) && styles.calendarDayDisabled,
                            ]}
                            onPress={() => {
                              if (day && !isPastDate(day)) {
                                setSelectedDate(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day));
                                setShowCalendar(false);
                              }
                            }}
                            disabled={!day || isPastDate(day)}
                          >
                            {day && (
                              <Text style={[
                                styles.calendarDayText,
                                isDateSelected(day) && styles.calendarDayTextSelected,
                                isPastDate(day) && styles.calendarDayTextDisabled,
                              ]}>
                                {day}
                              </Text>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </>
              ) : (
                <>
                  <TouchableOpacity 
                    style={[styles.dropdownButton, showDayDropdown && styles.dropdownButtonActive]}
                    onPress={(e) => {
                      e.stopPropagation();
                      setShowCoupleDropdown(false);
                      setShowCalendar(false);
                      setShowTimePicker(false);
                      setShowDayDropdown(!showDayDropdown);
                    }}
                  >
                    <View style={styles.dropdownButtonContent}>
                      <Ionicons name="today" size={18} color={COLORS.primary} />
                      <Text style={styles.dropdownText}>
                        {SCHEDULE_DAYS.find(d => d.value === autoScheduleDay)?.label || 'Monday'}
                      </Text>
                    </View>
                    <Ionicons name={showDayDropdown ? "chevron-up" : "chevron-down"} size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>

                  {showDayDropdown && (
                    <View style={styles.dropdownListCompact}>
                      {SCHEDULE_DAYS.map(day => (
                        <TouchableOpacity
                          key={day.value}
                          style={[styles.dropdownItemCompact, autoScheduleDay === day.value && styles.dropdownItemSelected]}
                          onPress={() => {
                            setAutoScheduleDay(day.value);
                            setShowDayDropdown(false);
                          }}
                        >
                          <Text style={[styles.dropdownItemText, autoScheduleDay === day.value && styles.dropdownItemTextSelected]}>
                            {day.label}
                          </Text>
                          {autoScheduleDay === day.value && (
                            <Ionicons name="checkmark" size={18} color={COLORS.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Preview auto-scheduled dates */}
                  <View style={styles.autoSchedulePreview}>
                    <View style={styles.autoSchedulePreviewHeader}>
                      <Ionicons name="eye-outline" size={16} color={COLORS.accent} />
                      <Text style={styles.autoSchedulePreviewTitle}>Preview: 4 visits scheduled</Text>
                    </View>
                    {generateAutoScheduleDates(new Date(), autoScheduleDay).map((date, index) => (
                      <View key={index} style={styles.autoScheduleDate}>
                        <View style={styles.autoScheduleDateBadge}>
                          <Text style={styles.autoScheduleDateBadgeText}>#{index + 1}</Text>
                        </View>
                        <Text style={styles.autoScheduleDateText}>
                          {SCHEDULE_DAYS.find(d => d.value === date.getDay())?.label}, {date.getDate()} {MONTHS[date.getMonth()]} {date.getFullYear()}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>

            {/* Step 4: Time Selection */}
            <View style={styles.formSection}>
              <View style={styles.formSectionHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>4</Text>
                </View>
                <Text style={styles.formSectionTitle}>Select Time</Text>
              </View>

              <TouchableOpacity 
                style={[styles.dateButton, showTimePicker && styles.dateButtonActive]}
                onPress={(e) => {
                  e.stopPropagation();
                  setShowCoupleDropdown(false);
                  setShowDayDropdown(false);
                  setShowCalendar(false);
                  setShowTimePicker(!showTimePicker);
                }}
              >
                <Ionicons name="time" size={18} color={COLORS.primary} />
                <Text style={styles.dateButtonText}>
                  {selectedHour}:{selectedMinute} {selectedPeriod}
                </Text>
                <Ionicons name={showTimePicker ? "chevron-up" : "chevron-down"} size={18} color={COLORS.textMuted} />
              </TouchableOpacity>

              {showTimePicker && (
                <View style={styles.timePickerContainer}>
                  <View style={styles.timePickerRow}>
                    <View style={styles.timePickerColumn}>
                      <Text style={styles.timePickerLabel}>Hour</Text>
                      <ScrollView style={styles.timePickerScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                        {HOURS.map(hour => (
                          <TouchableOpacity
                            key={hour}
                            style={[styles.timePickerOption, selectedHour === hour && styles.timePickerOptionSelected]}
                            onPress={() => setSelectedHour(hour)}
                          >
                            <Text style={[styles.timePickerOptionText, selectedHour === hour && styles.timePickerOptionTextSelected]}>
                              {hour}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    <View style={styles.timePickerColumn}>
                      <Text style={styles.timePickerLabel}>Min</Text>
                      <ScrollView style={styles.timePickerScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                        {MINUTES.map(minute => (
                          <TouchableOpacity
                            key={minute}
                            style={[styles.timePickerOption, selectedMinute === minute && styles.timePickerOptionSelected]}
                            onPress={() => setSelectedMinute(minute)}
                          >
                            <Text style={[styles.timePickerOptionText, selectedMinute === minute && styles.timePickerOptionTextSelected]}>
                              {minute}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    <View style={styles.timePickerColumn}>
                      <Text style={styles.timePickerLabel}>AM/PM</Text>
                      <View style={styles.periodOptionsContainer}>
                        {(['AM', 'PM'] as const).map(period => (
                          <TouchableOpacity
                            key={period}
                            style={[styles.timePickerOption, selectedPeriod === period && styles.timePickerOptionSelected]}
                            onPress={() => setSelectedPeriod(period)}
                          >
                            <Text style={[styles.timePickerOptionText, selectedPeriod === period && styles.timePickerOptionTextSelected]}>
                              {period}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Optional: Purpose & Notes */}
            <View style={styles.formSection}>
              <View style={styles.formSectionHeader}>
                <View style={[styles.stepBadge, styles.stepBadgeOptional]}>
                  <Ionicons name="create-outline" size={12} color={COLORS.textMuted} />
                </View>
                <Text style={styles.formSectionTitle}>Additional Info</Text>
                <Text style={styles.formSectionOptional}>(Optional)</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Purpose</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., Regular checkup, Follow-up..."
                  placeholderTextColor={COLORS.textMuted}
                  value={visitPurpose}
                  onChangeText={setVisitPurpose}
                  onFocus={closeAllDropdowns}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notes</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Any additional notes..."
                  placeholderTextColor={COLORS.textMuted}
                  value={visitNotes}
                  onChangeText={setVisitNotes}
                  multiline
                  numberOfLines={3}
                  onFocus={closeAllDropdowns}
                />
              </View>
            </View>
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => {
                closeAllDropdowns();
                resetScheduleForm();
                setShowScheduleModal(false);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.submitButton, 
                isSaving && styles.submitButtonDisabled,
                !selectedCouple && styles.submitButtonDisabled
              ]}
              onPress={handleScheduleAppointment}
              disabled={isSaving || !selectedCouple}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={styles.submitButtonText}>
                    {scheduleMode === 'automatic' 
                      ? 'Schedule 4 Visits'
                      : 'Schedule Visit'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );

  // Main Content
  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading appointments...</Text>
        </View>
      );
    }

    const visits = activeTab === 'doctorVisit' ? filteredDoctorVisits : filteredNursingVisits;

    if (visits.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyStateText}>No appointments found</Text>
          <Text style={styles.emptyStateSubtext}>
            {activeTab === 'doctorVisit' 
              ? 'Doctor visits logged by users will appear here'
              : 'Click "Schedule Visit" to create nursing department appointments'}
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        {activeTab === 'doctorVisit' 
          ? filteredDoctorVisits.map(renderDoctorVisitCard)
          : filteredNursingVisits.map(renderNursingVisitCard)
        }
        <View style={{ height: 20 }} />
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderContent()}
      {renderScheduleModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.borderLight,
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
  filtersContainer: {
    gap: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.borderLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  filterChipsScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  visitCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  visitDateBadge: {
    width: 50,
    height: 56,
    backgroundColor: COLORS.primary + '15',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  visitDateDay: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  visitDateMonth: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  visitContent: {
    flex: 1,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  visitTime: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  coupleName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  visitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  visitMetaText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  visitPurpose: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 6,
    fontStyle: 'italic',
  },
  visitAction: {
    justifyContent: 'center',
    paddingLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 280,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalContentMobile: {
    width: '100%',
    maxWidth: '100%',
    height: '100%',
    maxHeight: '100%',
    borderRadius: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 20,
  },
  formSection: {
    marginBottom: 24,
    backgroundColor: COLORS.borderLight,
    borderRadius: 12,
    padding: 16,
  },
  formSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBadgeOptional: {
    backgroundColor: COLORS.textMuted,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  formSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  formSectionOptional: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: 4,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  formHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 6,
    fontStyle: 'italic',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dropdownButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  dropdownButtonActive: {
    borderColor: COLORS.primary,
  },
  dropdownButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dropdownSelectedInfo: {
    flex: 1,
  },
  dropdownSubtext: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  dropdownText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  dropdownPlaceholder: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  dropdownList: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 200,
  },
  dropdownListCompact: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dropdownSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  dropdownSearch: {
    flex: 1,
    padding: 0,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  dropdownScroll: {
    maxHeight: 150,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: 10,
  },
  dropdownItemCompact: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  dropdownItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownItemContent: {
    flex: 1,
  },
  dropdownItemSelected: {
    backgroundColor: COLORS.primary + '10',
  },
  dropdownItemText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  dropdownItemTextSelected: {
    color: COLORS.primary,
  },
  dropdownItemSubtext: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  dropdownEmpty: {
    padding: 20,
    alignItems: 'center',
  },
  dropdownEmptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  modeToggle: {
    flexDirection: 'row',
    gap: 10,
  },
  modeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  modeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  modeButtonHint: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  modeButtonHintActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateButtonSelected: {
    borderColor: COLORS.primary,
  },
  dateButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  dateButtonText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  dateButtonPlaceholder: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  calendarContainer: {
    marginTop: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarNavButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarMonthText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  calendarWeekdays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarWeekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  calendarDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDaySelected: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
  },
  calendarDayDisabled: {
    opacity: 0.3,
  },
  calendarDayText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  calendarDayTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  calendarDayTextDisabled: {
    color: COLORS.textMuted,
  },
  autoSchedulePreview: {
    marginTop: 16,
    padding: 14,
    backgroundColor: COLORS.accent + '10',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.accent + '30',
  },
  autoSchedulePreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  autoSchedulePreviewTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accentDark,
  },
  autoScheduleDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  autoScheduleDateBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  autoScheduleDateBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  autoScheduleDateText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  timePickerContainer: {
    marginTop: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timePickerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timePickerColumn: {
    flex: 1,
  },
  timePickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 8,
  },
  timePickerScroll: {
    maxHeight: 120,
  },
  timePickerOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 4,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
  },
  timePickerOptionSelected: {
    backgroundColor: COLORS.primary,
  },
  timePickerOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  timePickerOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  periodOptionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  timePickerDone: {
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignItems: 'center',
  },
  timePickerDoneText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  textInput: {
    backgroundColor: COLORS.borderLight,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
