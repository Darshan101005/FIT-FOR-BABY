import { Ionicons } from '@expo/vector-icons';
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

interface Appointment {
  id: string;
  coupleId: string;
  maleName: string;
  femaleName: string;
  type: 'checkup' | 'consultation' | 'follow-up' | 'counseling';
  date: string;
  time: string;
  status: 'upcoming' | 'completed' | 'cancelled' | 'rescheduled';
  notes: string;
  doctor?: string;
  location?: string;
}

// Mock appointments data
const mockAppointments: Appointment[] = [
  {
    id: 'APT001',
    coupleId: 'C_001',
    maleName: 'John Doe',
    femaleName: 'Sarah Doe',
    type: 'checkup',
    date: '2024-11-29',
    time: '10:00 AM',
    status: 'upcoming',
    notes: 'Monthly health checkup',
    doctor: 'Dr. Priya Sharma',
    location: 'Room 101',
  },
  {
    id: 'APT002',
    coupleId: 'C_002',
    maleName: 'Raj Kumar',
    femaleName: 'Priya Kumar',
    type: 'consultation',
    date: '2024-11-29',
    time: '11:30 AM',
    status: 'upcoming',
    notes: 'Nutrition consultation',
    doctor: 'Dr. Anita Reddy',
    location: 'Room 203',
  },
  {
    id: 'APT003',
    coupleId: 'C_003',
    maleName: 'Amit Patel',
    femaleName: 'Neha Patel',
    type: 'follow-up',
    date: '2024-11-30',
    time: '09:00 AM',
    status: 'upcoming',
    notes: 'Follow-up on exercise plan',
    doctor: 'Dr. Vikram Singh',
    location: 'Room 105',
  },
  {
    id: 'APT004',
    coupleId: 'C_004',
    maleName: 'Sanjay M',
    femaleName: 'Kavitha S',
    type: 'counseling',
    date: '2024-11-30',
    time: '02:00 PM',
    status: 'upcoming',
    notes: 'Couples counseling session',
    doctor: 'Dr. Meera Nair',
    location: 'Room 302',
  },
  {
    id: 'APT005',
    coupleId: 'C_005',
    maleName: 'Arjun R',
    femaleName: 'Deepa V',
    type: 'checkup',
    date: '2024-12-01',
    time: '10:30 AM',
    status: 'upcoming',
    notes: 'Quarterly assessment',
    doctor: 'Dr. Priya Sharma',
    location: 'Room 101',
  },
  {
    id: 'APT006',
    coupleId: 'C_001',
    maleName: 'John Doe',
    femaleName: 'Sarah Doe',
    type: 'consultation',
    date: '2024-12-02',
    time: '03:00 PM',
    status: 'upcoming',
    notes: 'Diet plan review',
    doctor: 'Dr. Anita Reddy',
    location: 'Room 203',
  },
  {
    id: 'APT007',
    coupleId: 'C_006',
    maleName: 'Venkat K',
    femaleName: 'Sudha P',
    type: 'follow-up',
    date: '2024-12-03',
    time: '11:00 AM',
    status: 'rescheduled',
    notes: 'Weight management follow-up',
    doctor: 'Dr. Vikram Singh',
    location: 'Room 105',
  },
  {
    id: 'APT008',
    coupleId: 'C_007',
    maleName: 'Prakash S',
    femaleName: 'Lakshmi R',
    type: 'checkup',
    date: '2024-11-25',
    time: '09:30 AM',
    status: 'completed',
    notes: 'Routine checkup completed',
    doctor: 'Dr. Priya Sharma',
    location: 'Room 101',
  },
];

const appointmentTypes = [
  { id: 'all', label: 'All Types' },
  { id: 'checkup', label: 'Checkup' },
  { id: 'consultation', label: 'Consultation' },
  { id: 'follow-up', label: 'Follow-up' },
  { id: 'counseling', label: 'Counseling' },
];

// Calendar constants
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const HOURS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MINUTES = ['00', '15', '30', '45'];

// Mock couples data for search
const mockCouplesData = [
  { coupleId: 'C_001', maleName: 'John Doe', femaleName: 'Sarah Doe' },
  { coupleId: 'C_002', maleName: 'Raj Kumar', femaleName: 'Priya Kumar' },
  { coupleId: 'C_003', maleName: 'Amit Patel', femaleName: 'Neha Patel' },
  { coupleId: 'C_004', maleName: 'Sanjay M', femaleName: 'Kavitha S' },
  { coupleId: 'C_005', maleName: 'Arjun R', femaleName: 'Deepa V' },
  { coupleId: 'C_006', maleName: 'Venkat K', femaleName: 'Sudha P' },
  { coupleId: 'C_007', maleName: 'Prakash S', femaleName: 'Lakshmi R' },
  { coupleId: 'C_008', maleName: 'Karthik N', femaleName: 'Divya M' },
];

export default function AdminAppointmentsScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1024;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('upcoming');
  const [appointments] = useState<Appointment[]>(mockAppointments);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  
  // New appointment form state
  const [newAppointmentCoupleSearch, setNewAppointmentCoupleSearch] = useState('');
  const [selectedCouple, setSelectedCouple] = useState<{coupleId: string; maleName: string; femaleName: string} | null>(null);
  const [newAppointmentDate, setNewAppointmentDate] = useState('');
  const [newAppointmentTime, setNewAppointmentTime] = useState('');
  const [newAppointmentType, setNewAppointmentType] = useState<'checkup' | 'consultation' | 'follow-up' | 'counseling'>('checkup');
  const [newAppointmentNotes, setNewAppointmentNotes] = useState('');
  const [showCoupleDropdown, setShowCoupleDropdown] = useState(false);
  
  // Calendar and time picker state
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedHour, setSelectedHour] = useState('10');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');

  // Filter appointments
  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch = 
      apt.coupleId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.maleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.femaleName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = selectedType === 'all' || apt.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || apt.status === selectedStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Group appointments by date
  const groupedAppointments = filteredAppointments.reduce((groups, apt) => {
    const date = apt.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(apt);
    return groups;
  }, {} as Record<string, Appointment[]>);

  // Sort dates
  const sortedDates = Object.keys(groupedAppointments).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );

  const getTypeIcon = (type: Appointment['type']) => {
    switch (type) {
      case 'checkup': return 'medical';
      case 'consultation': return 'chatbubbles';
      case 'follow-up': return 'refresh-circle';
      case 'counseling': return 'heart';
    }
  };

  const getTypeColor = (type: Appointment['type']) => {
    switch (type) {
      case 'checkup': return COLORS.primary;
      case 'consultation': return COLORS.accent;
      case 'follow-up': return COLORS.info;
      case 'counseling': return COLORS.warning;
    }
  };

  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'upcoming': return COLORS.info;
      case 'completed': return COLORS.success;
      case 'cancelled': return COLORS.error;
      case 'rescheduled': return COLORS.warning;
    }
  };

  const getStatusIcon = (status: Appointment['status']) => {
    switch (status) {
      case 'upcoming': return 'time-outline';
      case 'completed': return 'checkmark-circle';
      case 'cancelled': return 'close-circle';
      case 'rescheduled': return 'calendar';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (dateString === today.toISOString().split('T')[0]) {
      return 'Today';
    } else if (dateString === tomorrow.toISOString().split('T')[0]) {
      return 'Tomorrow';
    }
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Summary stats
  const stats = {
    total: appointments.filter(a => a.status === 'upcoming').length,
    today: appointments.filter(a => a.date === '2024-11-29' && a.status === 'upcoming').length,
    thisWeek: appointments.filter(a => a.status === 'upcoming').length,
  };

  // Header
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.headerTitle}>Appointments</Text>
          <Text style={styles.headerSubtitle}>Manage upcoming appointments</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowNewAppointmentModal(true)}
        >
          <Ionicons name="add" size={20} color="#fff" />
          {!isMobile && <Text style={styles.addButtonText}>Schedule Appointment</Text>}
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={[styles.filtersContainer, isMobile && styles.filtersContainerMobile]}>
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

        <View style={styles.filterChips}>
          {['upcoming', 'completed', 'cancelled', 'all'].map(status => (
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
      </View>
    </View>
  );

  // Stats Cards
  const renderStats = () => (
    <View style={[styles.statsContainer, isMobile && styles.statsContainerMobile]}>
      <View style={[styles.statCard, { borderLeftColor: COLORS.info }]}>
        <View style={[styles.statIcon, { backgroundColor: COLORS.info + '15' }]}>
          <Ionicons name="calendar" size={22} color={COLORS.info} />
        </View>
        <View>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Upcoming</Text>
        </View>
      </View>

      <View style={[styles.statCard, { borderLeftColor: COLORS.success }]}>
        <View style={[styles.statIcon, { backgroundColor: COLORS.success + '15' }]}>
          <Ionicons name="today" size={22} color={COLORS.success} />
        </View>
        <View>
          <Text style={styles.statValue}>{stats.today}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
      </View>

      <View style={[styles.statCard, { borderLeftColor: COLORS.primary }]}>
        <View style={[styles.statIcon, { backgroundColor: COLORS.primary + '15' }]}>
          <Ionicons name="calendar-outline" size={22} color={COLORS.primary} />
        </View>
        <View>
          <Text style={styles.statValue}>{stats.thisWeek}</Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>
      </View>

      <View style={[styles.statCard, { borderLeftColor: COLORS.error }]}>
        <View style={[styles.statIcon, { backgroundColor: COLORS.error + '15' }]}>
          <Ionicons name="close-circle" size={22} color={COLORS.error} />
        </View>
        <View>
          <Text style={styles.statValue}>{appointments.filter(a => a.status === 'cancelled').length}</Text>
          <Text style={styles.statLabel}>Cancelled</Text>
        </View>
      </View>
    </View>
  );

  // Appointment Card
  const renderAppointmentCard = (appointment: Appointment) => (
    <TouchableOpacity
      key={appointment.id}
      style={styles.appointmentCard}
      onPress={() => {
        setSelectedAppointment(appointment);
        setShowDetailModal(true);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.appointmentLeft}>
        <View style={[styles.typeIcon, { backgroundColor: getTypeColor(appointment.type) + '15' }]}>
          <Ionicons name={getTypeIcon(appointment.type) as any} size={20} color={getTypeColor(appointment.type)} />
        </View>
        <View style={styles.appointmentInfo}>
          <Text style={styles.appointmentTime}>{appointment.time}</Text>
          <View style={styles.coupleInfo}>
            <View style={styles.coupleAvatars}>
              <View style={[styles.avatarSmall, { backgroundColor: COLORS.primary }]}>
                <Ionicons name="male" size={12} color="#fff" />
              </View>
              <View style={[styles.avatarSmall, { backgroundColor: COLORS.accent, marginLeft: -6 }]}>
                <Ionicons name="female" size={12} color="#fff" />
              </View>
            </View>
            <View>
              <Text style={styles.coupleId}>{appointment.coupleId}</Text>
              <Text style={styles.coupleNames} numberOfLines={1}>
                {appointment.maleName} & {appointment.femaleName}
              </Text>
            </View>
          </View>
          <Text style={styles.appointmentType}>
            {appointment.type.charAt(0).toUpperCase() + appointment.type.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.appointmentRight}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) + '15' }]}>
          <Ionicons name={getStatusIcon(appointment.status) as any} size={14} color={getStatusColor(appointment.status)} />
          <Text style={[styles.statusText, { color: getStatusColor(appointment.status) }]}>
            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
      </View>
    </TouchableOpacity>
  );

  // Appointments List grouped by date
  const renderAppointmentsList = () => (
    <View style={styles.listContainer}>
      {sortedDates.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyStateText}>No appointments found</Text>
          <Text style={styles.emptyStateSubtext}>Try adjusting your filters</Text>
        </View>
      ) : (
        sortedDates.map(date => (
          <View key={date} style={styles.dateGroup}>
            <View style={styles.dateHeader}>
              <View style={styles.dateBadge}>
                <Ionicons name="calendar" size={14} color={COLORS.primary} />
                <Text style={styles.dateText}>{formatDate(date)}</Text>
              </View>
              <Text style={styles.appointmentCount}>
                {groupedAppointments[date].length} appointment{groupedAppointments[date].length > 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.appointmentsGroup}>
              {groupedAppointments[date].map(renderAppointmentCard)}
            </View>
          </View>
        ))
      )}
    </View>
  );

  // Appointment Detail Modal
  const renderDetailModal = () => {
    if (!selectedAppointment) return null;

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
                <View style={[styles.modalTypeIcon, { backgroundColor: getTypeColor(selectedAppointment.type) + '15' }]}>
                  <Ionicons name={getTypeIcon(selectedAppointment.type) as any} size={24} color={getTypeColor(selectedAppointment.type)} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Appointment Details</Text>
                  <Text style={styles.modalSubtitle}>{selectedAppointment.id}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Couple Info */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionLabel}>Couple</Text>
                <View style={styles.detailCard}>
                  <View style={styles.coupleAvatars}>
                    <View style={[styles.avatarMedium, { backgroundColor: COLORS.primary }]}>
                      <Ionicons name="male" size={16} color="#fff" />
                    </View>
                    <View style={[styles.avatarMedium, { backgroundColor: COLORS.accent, marginLeft: -8 }]}>
                      <Ionicons name="female" size={16} color="#fff" />
                    </View>
                  </View>
                  <View style={styles.detailCardContent}>
                    <Text style={styles.detailCardTitle}>{selectedAppointment.coupleId}</Text>
                    <Text style={styles.detailCardSubtitle}>
                      {selectedAppointment.maleName} & {selectedAppointment.femaleName}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Date & Time */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionLabel}>Date & Time</Text>
                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Ionicons name="calendar" size={18} color={COLORS.textSecondary} />
                    <Text style={styles.detailItemText}>{formatDate(selectedAppointment.date)}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="time" size={18} color={COLORS.textSecondary} />
                    <Text style={styles.detailItemText}>{selectedAppointment.time}</Text>
                  </View>
                </View>
              </View>

              {/* Type & Status */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionLabel}>Type & Status</Text>
                <View style={styles.detailRow}>
                  <View style={[styles.typeBadge, { backgroundColor: getTypeColor(selectedAppointment.type) + '15' }]}>
                    <Ionicons name={getTypeIcon(selectedAppointment.type) as any} size={16} color={getTypeColor(selectedAppointment.type)} />
                    <Text style={[styles.typeBadgeText, { color: getTypeColor(selectedAppointment.type) }]}>
                      {selectedAppointment.type.charAt(0).toUpperCase() + selectedAppointment.type.slice(1)}
                    </Text>
                  </View>
                  <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(selectedAppointment.status) + '15' }]}>
                    <Ionicons name={getStatusIcon(selectedAppointment.status) as any} size={16} color={getStatusColor(selectedAppointment.status)} />
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(selectedAppointment.status) }]}>
                      {selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Doctor & Location */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionLabel}>Doctor & Location</Text>
                <View style={styles.detailCard}>
                  <View style={styles.detailCardRow}>
                    <Ionicons name="person" size={18} color={COLORS.primary} />
                    <Text style={styles.detailCardText}>{selectedAppointment.doctor || 'Not assigned'}</Text>
                  </View>
                  <View style={styles.detailCardRow}>
                    <Ionicons name="location" size={18} color={COLORS.accent} />
                    <Text style={styles.detailCardText}>{selectedAppointment.location || 'TBD'}</Text>
                  </View>
                </View>
              </View>

              {/* Notes */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionLabel}>Notes</Text>
                <View style={styles.notesCard}>
                  <Text style={styles.notesText}>{selectedAppointment.notes || 'No notes available'}</Text>
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalPrimaryButton}
                onPress={() => {
                  setShowDetailModal(false);
                  router.push(`/admin/users?couple=${selectedAppointment.coupleId}` as any);
                }}
              >
                <Ionicons name="person" size={18} color="#fff" />
                <Text style={styles.modalPrimaryButtonText}>View Couple</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Filter couples for search
  const filteredCouples = mockCouplesData.filter(couple => 
    couple.coupleId.toLowerCase().includes(newAppointmentCoupleSearch.toLowerCase()) ||
    couple.maleName.toLowerCase().includes(newAppointmentCoupleSearch.toLowerCase()) ||
    couple.femaleName.toLowerCase().includes(newAppointmentCoupleSearch.toLowerCase())
  );

  // Handle couple selection
  const handleCoupleSelect = (couple: {coupleId: string; maleName: string; femaleName: string}) => {
    setSelectedCouple(couple);
    setNewAppointmentCoupleSearch(couple.coupleId);
    setShowCoupleDropdown(false);
  };

  // Handle schedule appointment
  const handleScheduleAppointment = () => {
    if (!selectedCouple || !newAppointmentDate || !newAppointmentTime) {
      return;
    }
    
    // Here you would add the new appointment to the database
    console.log('Scheduling appointment:', {
      coupleId: selectedCouple.coupleId,
      maleName: selectedCouple.maleName,
      femaleName: selectedCouple.femaleName,
      date: newAppointmentDate,
      time: newAppointmentTime,
      type: newAppointmentType,
      notes: newAppointmentNotes,
    });
    
    // Reset form and close modal
    setSelectedCouple(null);
    setNewAppointmentCoupleSearch('');
    setNewAppointmentDate('');
    setNewAppointmentTime('');
    setNewAppointmentType('checkup');
    setNewAppointmentNotes('');
    setShowNewAppointmentModal(false);
  };

  // New Appointment Modal
  const renderNewAppointmentModal = () => (
    <Modal
      visible={showNewAppointmentModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowNewAppointmentModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, isMobile && styles.modalContentMobile]}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={[styles.modalTypeIcon, { backgroundColor: COLORS.primary + '15' }]}>
                <Ionicons name="calendar-outline" size={24} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.modalTitle}>Schedule Appointment</Text>
                <Text style={styles.modalSubtitle}>Create a new appointment for a couple</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setShowNewAppointmentModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Couple Search */}
            <View style={[styles.formSection, { zIndex: 100 }]}>
              <Text style={styles.formLabel}>Select Couple *</Text>
              <View style={styles.coupleSearchContainer}>
                <View style={styles.coupleSearchInputWrapper}>
                  <Ionicons name="search" size={18} color={COLORS.textMuted} />
                  <TextInput
                    style={styles.coupleSearchInput}
                    placeholder="Search by Couple ID or name..."
                    placeholderTextColor={COLORS.textMuted}
                    value={newAppointmentCoupleSearch}
                    onChangeText={(text) => {
                      setNewAppointmentCoupleSearch(text);
                      setShowCoupleDropdown(true);
                      if (!text) setSelectedCouple(null);
                    }}
                    onFocus={() => setShowCoupleDropdown(true)}
                  />
                  {selectedCouple && (
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedCouple(null);
                        setNewAppointmentCoupleSearch('');
                      }}
                    >
                      <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
                
                {/* Dropdown */}
                {showCoupleDropdown && newAppointmentCoupleSearch.length > 0 && !selectedCouple && (
                  <View style={styles.coupleDropdown}>
                    {filteredCouples.length === 0 ? (
                      <View style={styles.coupleDropdownEmpty}>
                        <Text style={styles.coupleDropdownEmptyText}>No couples found</Text>
                      </View>
                    ) : (
                      filteredCouples.slice(0, 5).map((couple) => (
                        <TouchableOpacity
                          key={couple.coupleId}
                          style={styles.coupleDropdownItem}
                          onPress={() => handleCoupleSelect(couple)}
                        >
                          <View style={styles.coupleDropdownAvatars}>
                            <View style={[styles.dropdownAvatar, { backgroundColor: COLORS.primary }]}>
                              <Ionicons name="male" size={10} color="#fff" />
                            </View>
                            <View style={[styles.dropdownAvatar, { backgroundColor: COLORS.accent, marginLeft: -4 }]}>
                              <Ionicons name="female" size={10} color="#fff" />
                            </View>
                          </View>
                          <View style={styles.coupleDropdownInfo}>
                            <Text style={styles.coupleDropdownId}>{couple.coupleId}</Text>
                            <Text style={styles.coupleDropdownNames}>{couple.maleName} & {couple.femaleName}</Text>
                          </View>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                )}
              </View>
              
              {/* Selected Couple Card */}
              {selectedCouple && (
                <View style={styles.selectedCoupleCard}>
                  <View style={styles.coupleAvatars}>
                    <View style={[styles.avatarMedium, { backgroundColor: COLORS.primary }]}>
                      <Ionicons name="male" size={14} color="#fff" />
                    </View>
                    <View style={[styles.avatarMedium, { backgroundColor: COLORS.accent, marginLeft: -6 }]}>
                      <Ionicons name="female" size={14} color="#fff" />
                    </View>
                  </View>
                  <View style={styles.selectedCoupleInfo}>
                    <Text style={styles.selectedCoupleId}>{selectedCouple.coupleId}</Text>
                    <Text style={styles.selectedCoupleNames}>{selectedCouple.maleName} & {selectedCouple.femaleName}</Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
                </View>
              )}
            </View>

            {/* Date & Time */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Date & Time *</Text>
              <View style={styles.dateTimeRow}>
                <TouchableOpacity 
                  style={styles.dateInputWrapper}
                  onPress={() => {
                    setShowCalendar(!showCalendar);
                    setShowTimePicker(false);
                  }}
                >
                  <Ionicons name="calendar" size={18} color={COLORS.primary} />
                  <Text style={[styles.dateTimeText, !newAppointmentDate && styles.dateTimePlaceholder]}>
                    {newAppointmentDate || 'Select Date'}
                  </Text>
                  <Ionicons name={showCalendar ? "chevron-up" : "chevron-down"} size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.timeInputWrapper}
                  onPress={() => {
                    setShowTimePicker(!showTimePicker);
                    setShowCalendar(false);
                  }}
                >
                  <Ionicons name="time" size={18} color={COLORS.primary} />
                  <Text style={[styles.dateTimeText, !newAppointmentTime && styles.dateTimePlaceholder]}>
                    {newAppointmentTime || 'Select Time'}
                  </Text>
                  <Ionicons name={showTimePicker ? "chevron-up" : "chevron-down"} size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
              
              {/* Calendar Picker */}
              {showCalendar && (
                <View style={styles.calendarContainer}>
                  <View style={styles.calendarHeader}>
                    <TouchableOpacity
                      style={styles.calendarNavButton}
                      onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                    >
                      <Ionicons name="chevron-back" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                    <Text style={styles.calendarMonthTitle}>
                      {MONTHS[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                    </Text>
                    <TouchableOpacity
                      style={styles.calendarNavButton}
                      onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                    >
                      <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.calendarWeekdays}>
                    {WEEKDAYS.map((day) => (
                      <Text key={day} style={styles.calendarWeekdayText}>{day}</Text>
                    ))}
                  </View>
                  
                  <View style={styles.calendarDays}>
                    {(() => {
                      const year = calendarMonth.getFullYear();
                      const month = calendarMonth.getMonth();
                      const daysInMonth = new Date(year, month + 1, 0).getDate();
                      const firstDay = new Date(year, month, 1).getDay();
                      const today = new Date();
                      const days = [];
                      
                      // Empty cells for days before the first day
                      for (let i = 0; i < firstDay; i++) {
                        days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
                      }
                      
                      // Days of the month
                      for (let day = 1; day <= daysInMonth; day++) {
                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const isSelected = newAppointmentDate === dateStr;
                        const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
                        const isPast = new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                        
                        days.push(
                          <TouchableOpacity
                            key={day}
                            style={[
                              styles.calendarDay,
                              isSelected && styles.calendarDaySelected,
                              isToday && !isSelected && styles.calendarDayToday,
                            ]}
                            onPress={() => {
                              if (!isPast) {
                                setNewAppointmentDate(dateStr);
                                setShowCalendar(false);
                              }
                            }}
                            disabled={isPast}
                          >
                            <Text style={[
                              styles.calendarDayText,
                              isSelected && styles.calendarDayTextSelected,
                              isToday && !isSelected && styles.calendarDayTextToday,
                              isPast && styles.calendarDayTextPast,
                            ]}>
                              {day}
                            </Text>
                          </TouchableOpacity>
                        );
                      }
                      
                      return days;
                    })()}
                  </View>
                </View>
              )}
              
              {/* Time Picker */}
              {showTimePicker && (
                <View style={styles.timePickerContainer}>
                  <Text style={styles.timePickerTitle}>Select Time</Text>
                  <View style={styles.timePickerContent}>
                    {/* Hours */}
                    <View style={styles.timePickerColumn}>
                      <Text style={styles.timePickerLabel}>Hour</Text>
                      <ScrollView style={styles.timePickerScroll} showsVerticalScrollIndicator={false}>
                        {HOURS.map((hour) => (
                          <TouchableOpacity
                            key={hour}
                            style={[
                              styles.timePickerOption,
                              selectedHour === hour && styles.timePickerOptionSelected,
                            ]}
                            onPress={() => setSelectedHour(hour)}
                          >
                            <Text style={[
                              styles.timePickerOptionText,
                              selectedHour === hour && styles.timePickerOptionTextSelected,
                            ]}>
                              {hour}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                    
                    {/* Minutes */}
                    <View style={styles.timePickerColumn}>
                      <Text style={styles.timePickerLabel}>Min</Text>
                      <ScrollView style={styles.timePickerScroll} showsVerticalScrollIndicator={false}>
                        {MINUTES.map((minute) => (
                          <TouchableOpacity
                            key={minute}
                            style={[
                              styles.timePickerOption,
                              selectedMinute === minute && styles.timePickerOptionSelected,
                            ]}
                            onPress={() => setSelectedMinute(minute)}
                          >
                            <Text style={[
                              styles.timePickerOptionText,
                              selectedMinute === minute && styles.timePickerOptionTextSelected,
                            ]}>
                              {minute}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                    
                    {/* AM/PM */}
                    <View style={styles.timePickerColumn}>
                      <Text style={styles.timePickerLabel}>Period</Text>
                      <View style={styles.timePickerPeriod}>
                        <TouchableOpacity
                          style={[
                            styles.timePickerPeriodOption,
                            selectedPeriod === 'AM' && styles.timePickerPeriodOptionSelected,
                          ]}
                          onPress={() => setSelectedPeriod('AM')}
                        >
                          <Text style={[
                            styles.timePickerPeriodText,
                            selectedPeriod === 'AM' && styles.timePickerPeriodTextSelected,
                          ]}>
                            AM
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.timePickerPeriodOption,
                            selectedPeriod === 'PM' && styles.timePickerPeriodOptionSelected,
                          ]}
                          onPress={() => setSelectedPeriod('PM')}
                        >
                          <Text style={[
                            styles.timePickerPeriodText,
                            selectedPeriod === 'PM' && styles.timePickerPeriodTextSelected,
                          ]}>
                            PM
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.timePickerConfirm}
                    onPress={() => {
                      setNewAppointmentTime(`${selectedHour}:${selectedMinute} ${selectedPeriod}`);
                      setShowTimePicker(false);
                    }}
                  >
                    <Text style={styles.timePickerConfirmText}>Confirm Time</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Appointment Type */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Appointment Type</Text>
              <View style={styles.typeSelector}>
                {appointmentTypes.filter(t => t.id !== 'all').map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeOption,
                      newAppointmentType === type.id && styles.typeOptionActive,
                    ]}
                    onPress={() => setNewAppointmentType(type.id as any)}
                  >
                    <Ionicons
                      name={type.id === 'checkup' ? 'medical' : type.id === 'consultation' ? 'chatbubbles' : type.id === 'follow-up' ? 'refresh-circle' : 'heart'}
                      size={16}
                      color={newAppointmentType === type.id ? '#fff' : COLORS.textSecondary}
                    />
                    <Text style={[
                      styles.typeOptionText,
                      newAppointmentType === type.id && styles.typeOptionTextActive,
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Notes */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Notes (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Add any notes for this appointment..."
                placeholderTextColor={COLORS.textMuted}
                value={newAppointmentNotes}
                onChangeText={setNewAppointmentNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalSecondaryButton}
              onPress={() => setShowNewAppointmentModal(false)}
            >
              <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalPrimaryButton,
                (!selectedCouple || !newAppointmentDate || !newAppointmentTime) && styles.modalButtonDisabled,
              ]}
              onPress={handleScheduleAppointment}
              disabled={!selectedCouple || !newAppointmentDate || !newAppointmentTime}
            >
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.modalPrimaryButtonText}>Schedule</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}

      <ScrollView
        contentContainerStyle={[styles.scrollContent, !isMobile && styles.scrollContentDesktop]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.content, !isMobile && styles.contentDesktop]}>
          {renderStats()}
          {renderAppointmentsList()}
        </View>
      </ScrollView>

      {renderDetailModal()}
      {renderNewAppointmentModal()}
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

  // Header
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  addButtonText: {
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
    flexWrap: 'wrap',
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
    minWidth: 140,
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

  // Appointments List
  listContainer: {
    flex: 1,
  },
  dateGroup: {
    marginBottom: 20,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  appointmentCount: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  appointmentsGroup: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },

  // Appointment Card
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  appointmentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentTime: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  coupleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  coupleAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  avatarMedium: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  coupleId: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  coupleNames: {
    fontSize: 12,
    color: COLORS.textSecondary,
    maxWidth: 150,
  },
  appointmentType: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  appointmentRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },

  // Modal
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
    maxWidth: 500,
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
  modalTypeIcon: {
    width: 44,
    height: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
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

  // Detail Sections
  detailSection: {
    marginBottom: 20,
  },
  detailSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  detailCard: {
    backgroundColor: COLORS.borderLight,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailCardContent: {
    flex: 1,
  },
  detailCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  detailCardSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  detailCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  detailCardText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.borderLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  detailItemText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  typeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  notesCard: {
    backgroundColor: COLORS.borderLight,
    borderRadius: 12,
    padding: 14,
  },
  notesText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },

  // Modal Footer
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
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
    color: COLORS.primary,
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
  modalButtonDisabled: {
    backgroundColor: COLORS.textMuted,
    opacity: 0.6,
  },

  // Form Styles
  formSection: {
    marginBottom: 20,
    zIndex: 1,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  coupleSearchContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  coupleSearchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  coupleSearchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  coupleDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 200,
    zIndex: 1001,
  },
  coupleDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  coupleDropdownAvatars: {
    flexDirection: 'row',
    marginRight: 10,
  },
  dropdownAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coupleDropdownInfo: {
    flex: 1,
  },
  coupleDropdownId: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  coupleDropdownNames: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  coupleDropdownEmpty: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  coupleDropdownEmptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  selectedCoupleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '10',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.success + '30',
  },
  selectedCoupleInfo: {
    flex: 1,
    marginLeft: 8,
  },
  selectedCoupleId: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  selectedCoupleNames: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  timeInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  dateTimeInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.borderLight,
    gap: 6,
  },
  typeOptionActive: {
    backgroundColor: COLORS.primary,
  },
  typeOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  typeOptionTextActive: {
    color: '#fff',
  },
  notesInput: {
    backgroundColor: COLORS.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    minHeight: 80,
  },
  dateTimeText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  dateTimePlaceholder: {
    color: COLORS.textMuted,
  },
  
  // Calendar Styles
  calendarContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginTop: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  calendarNavButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  calendarWeekdays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarWeekdayText: {
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDaySelected: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 20,
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  calendarDayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  calendarDayTextToday: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  calendarDayTextPast: {
    color: COLORS.textMuted,
    opacity: 0.5,
  },
  
  // Time Picker Styles
  timePickerContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginTop: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  timePickerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  timePickerContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  timePickerColumn: {
    alignItems: 'center',
    width: 70,
  },
  timePickerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  timePickerScroll: {
    maxHeight: 140,
  },
  timePickerOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
  },
  timePickerOptionSelected: {
    backgroundColor: COLORS.primary,
  },
  timePickerOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  timePickerOptionTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  timePickerPeriod: {
    gap: 8,
  },
  timePickerPeriodOption: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: COLORS.borderLight,
    marginBottom: 4,
  },
  timePickerPeriodOptionSelected: {
    backgroundColor: COLORS.primary,
  },
  timePickerPeriodText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  timePickerPeriodTextSelected: {
    color: '#fff',
  },
  timePickerConfirm: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  timePickerConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
