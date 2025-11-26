import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
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

const isWeb = Platform.OS === 'web';

interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
}

interface Counsellor {
  id: string;
  name: string;
  specialization: string;
  avatar: string;
  rating: number;
  languages: string[];
}

interface Appointment {
  id: string;
  date: string;
  time: string;
  counsellor: Counsellor;
  type: 'video' | 'audio' | 'chat';
  status: 'upcoming' | 'completed' | 'cancelled';
  notes?: string;
}

const counsellors: Counsellor[] = [
  {
    id: '1',
    name: 'Dr. Priya Sharma',
    specialization: 'Fertility & Nutrition',
    avatar: '👩‍⚕️',
    rating: 4.9,
    languages: ['English', 'Tamil', 'Hindi'],
  },
  {
    id: '2',
    name: 'Dr. Rajesh Kumar',
    specialization: 'Lifestyle & Exercise',
    avatar: '👨‍⚕️',
    rating: 4.8,
    languages: ['English', 'Tamil'],
  },
  {
    id: '3',
    name: 'Mrs. Lakshmi Devi',
    specialization: 'Diet & Wellness',
    avatar: '👩‍💼',
    rating: 4.7,
    languages: ['Tamil', 'English'],
  },
];

const timeSlots: TimeSlot[] = [
  { id: '1', time: '09:00 AM', available: true },
  { id: '2', time: '10:00 AM', available: false },
  { id: '3', time: '11:00 AM', available: true },
  { id: '4', time: '02:00 PM', available: true },
  { id: '5', time: '03:00 PM', available: false },
  { id: '6', time: '04:00 PM', available: true },
  { id: '7', time: '05:00 PM', available: true },
];

const mockAppointments: Appointment[] = [
  {
    id: '1',
    date: '2024-11-28',
    time: '10:00 AM',
    counsellor: counsellors[0],
    type: 'video',
    status: 'upcoming',
    notes: 'Monthly check-in on diet progress',
  },
  {
    id: '2',
    date: '2024-11-15',
    time: '02:00 PM',
    counsellor: counsellors[1],
    type: 'audio',
    status: 'completed',
    notes: 'Discussed exercise routine modifications',
  },
  {
    id: '3',
    date: '2024-11-01',
    time: '11:00 AM',
    counsellor: counsellors[2],
    type: 'video',
    status: 'completed',
  },
];

const appointmentTypes = [
  { id: 'video', icon: 'videocam', label: 'Video Call', color: '#006dab' },
  { id: 'audio', icon: 'call', label: 'Audio Call', color: '#22c55e' },
  { id: 'chat', icon: 'chatbubbles', label: 'Chat', color: '#f59e0b' },
];

export default function AppointmentsScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;

  const [activeTab, setActiveTab] = useState<'book' | 'upcoming' | 'history'>('book');
  const [step, setStep] = useState<'counsellor' | 'datetime' | 'confirm'>('counsellor');
  const [selectedCounsellor, setSelectedCounsellor] = useState<Counsellor | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'video' | 'audio' | 'chat'>('video');
  const [notes, setNotes] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const toastAnim = useRef(new Animated.Value(-100)).current;

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

  const getNext7Days = () => {
    const days = [];
    for (let i = 1; i <= 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleSelectCounsellor = (counsellor: Counsellor) => {
    setSelectedCounsellor(counsellor);
    setStep('datetime');
  };

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('datetime');
    } else if (step === 'datetime') {
      setStep('counsellor');
    } else {
      router.back();
    }
  };

  const handleContinue = () => {
    if (!selectedDate || !selectedTime) {
      showToast('Please select date and time', 'error');
      return;
    }
    setStep('confirm');
  };

  const handleBookAppointment = () => {
    showToast('Appointment booked successfully!', 'success');
    setTimeout(() => {
      setActiveTab('upcoming');
      setStep('counsellor');
      setSelectedCounsellor(null);
      setSelectedDate(null);
      setSelectedTime(null);
      setNotes('');
    }, 1500);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={handleBack} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#0f172a" />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>Appointments</Text>
        <Text style={styles.headerSubtitle}>
          {activeTab === 'book' ? 'Book a counselling session' : 
           activeTab === 'upcoming' ? 'Your upcoming sessions' : 'Past sessions'}
        </Text>
      </View>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabs}>
      {[
        { id: 'book', label: 'Book New', icon: 'add-circle' },
        { id: 'upcoming', label: 'Upcoming', icon: 'calendar' },
        { id: 'history', label: 'History', icon: 'time' },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[styles.tab, activeTab === tab.id && styles.tabActive]}
          onPress={() => {
            setActiveTab(tab.id as any);
            setStep('counsellor');
          }}
        >
          <Ionicons
            name={tab.icon as any}
            size={18}
            color={activeTab === tab.id ? '#006dab' : '#64748b'}
          />
          <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderCounsellorSelection = () => (
    <View style={styles.content}>
      <Text style={styles.stepTitle}>Choose a Counsellor</Text>
      <Text style={styles.stepDescription}>
        Select a health professional for your consultation
      </Text>
      
      {counsellors.map((counsellor) => (
        <TouchableOpacity
          key={counsellor.id}
          style={styles.counsellorCard}
          onPress={() => handleSelectCounsellor(counsellor)}
          activeOpacity={0.85}
        >
          <View style={styles.counsellorAvatar}>
            <Text style={styles.avatarEmoji}>{counsellor.avatar}</Text>
          </View>
          <View style={styles.counsellorInfo}>
            <Text style={styles.counsellorName}>{counsellor.name}</Text>
            <Text style={styles.counsellorSpec}>{counsellor.specialization}</Text>
            <View style={styles.counsellorMeta}>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color="#f59e0b" />
                <Text style={styles.ratingText}>{counsellor.rating}</Text>
              </View>
              <Text style={styles.languageText}>
                {counsellor.languages.join(' • ')}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#94a3b8" />
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderDateTimeSelection = () => {
    const next7Days = getNext7Days();

    return (
      <View style={styles.content}>
        <View style={styles.selectedCounsellorBadge}>
          <Text style={styles.selectedLabel}>Selected Counsellor:</Text>
          <Text style={styles.selectedValue}>{selectedCounsellor?.name}</Text>
        </View>

        {/* Date Selection */}
        <Text style={styles.sectionTitle}>Select Date</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.dateScroll}
          contentContainerStyle={styles.dateScrollContent}
        >
          {next7Days.map((date) => {
            const isSelected = selectedDate?.toDateString() === date.toDateString();
            return (
              <TouchableOpacity
                key={date.toISOString()}
                style={[styles.dateCard, isSelected && styles.dateCardActive]}
                onPress={() => setSelectedDate(date)}
              >
                <Text style={[styles.dateDay, isSelected && styles.dateDayActive]}>
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </Text>
                <Text style={[styles.dateNum, isSelected && styles.dateNumActive]}>
                  {date.getDate()}
                </Text>
                <Text style={[styles.dateMonth, isSelected && styles.dateMonthActive]}>
                  {date.toLocaleDateString('en-US', { month: 'short' })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Time Selection */}
        <Text style={styles.sectionTitle}>Select Time</Text>
        <View style={styles.timeGrid}>
          {timeSlots.map((slot) => (
            <TouchableOpacity
              key={slot.id}
              style={[
                styles.timeSlot,
                !slot.available && styles.timeSlotDisabled,
                selectedTime === slot.time && styles.timeSlotActive,
              ]}
              onPress={() => slot.available && setSelectedTime(slot.time)}
              disabled={!slot.available}
            >
              <Text
                style={[
                  styles.timeText,
                  !slot.available && styles.timeTextDisabled,
                  selectedTime === slot.time && styles.timeTextActive,
                ]}
              >
                {slot.time}
              </Text>
              {!slot.available && (
                <Text style={styles.unavailableText}>Booked</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Appointment Type */}
        <Text style={styles.sectionTitle}>Consultation Type</Text>
        <View style={styles.typeOptions}>
          {appointmentTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeOption,
                selectedType === type.id && { 
                  backgroundColor: type.color + '20',
                  borderColor: type.color 
                },
              ]}
              onPress={() => setSelectedType(type.id as any)}
            >
              <Ionicons
                name={type.icon as any}
                size={24}
                color={selectedType === type.id ? type.color : '#64748b'}
              />
              <Text
                style={[
                  styles.typeLabel,
                  selectedType === type.id && { color: type.color },
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#006dab', '#005a8f']}
            style={styles.continueButtonGradient}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  const renderConfirmation = () => {
    const typeInfo = appointmentTypes.find(t => t.id === selectedType);

    return (
      <View style={styles.content}>
        <Text style={styles.stepTitle}>Confirm Appointment</Text>
        <Text style={styles.stepDescription}>
          Review your booking details
        </Text>

        <View style={styles.confirmCard}>
          <View style={styles.confirmSection}>
            <View style={styles.counsellorConfirm}>
              <Text style={styles.avatarEmoji}>{selectedCounsellor?.avatar}</Text>
              <View>
                <Text style={styles.confirmCounsellorName}>{selectedCounsellor?.name}</Text>
                <Text style={styles.confirmCounsellorSpec}>{selectedCounsellor?.specialization}</Text>
              </View>
            </View>
          </View>

          <View style={styles.confirmDivider} />

          <View style={styles.confirmDetails}>
            <View style={styles.confirmRow}>
              <Ionicons name="calendar-outline" size={20} color="#64748b" />
              <Text style={styles.confirmLabel}>Date</Text>
              <Text style={styles.confirmValue}>
                {selectedDate?.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
            <View style={styles.confirmRow}>
              <Ionicons name="time-outline" size={20} color="#64748b" />
              <Text style={styles.confirmLabel}>Time</Text>
              <Text style={styles.confirmValue}>{selectedTime}</Text>
            </View>
            <View style={styles.confirmRow}>
              <Ionicons name={typeInfo?.icon as any} size={20} color={typeInfo?.color} />
              <Text style={styles.confirmLabel}>Type</Text>
              <Text style={[styles.confirmValue, { color: typeInfo?.color }]}>
                {typeInfo?.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>Notes for Counsellor (optional)</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any specific topics you'd like to discuss..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color="#006dab" />
          <Text style={styles.infoText}>
            You'll receive a reminder notification 30 minutes before your appointment.
            {selectedType === 'video' && ' Make sure you have a stable internet connection.'}
          </Text>
        </View>

        <View style={styles.confirmActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setStep('datetime')}
          >
            <Ionicons name="pencil" size={20} color="#006dab" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bookButton}
            onPress={handleBookAppointment}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#22c55e', '#16a34a']}
              style={styles.bookButtonGradient}
            >
              <Text style={styles.bookButtonText}>Book Appointment</Text>
              <Ionicons name="checkmark" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAppointmentsList = (filter: 'upcoming' | 'completed') => {
    const appointments = mockAppointments.filter(a => 
      filter === 'upcoming' ? a.status === 'upcoming' : a.status === 'completed'
    );

    if (appointments.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons 
            name={filter === 'upcoming' ? 'calendar-blank' : 'calendar-check'} 
            size={64} 
            color="#cbd5e1" 
          />
          <Text style={styles.emptyTitle}>
            {filter === 'upcoming' ? 'No Upcoming Appointments' : 'No Past Appointments'}
          </Text>
          <Text style={styles.emptyText}>
            {filter === 'upcoming' 
              ? "You don't have any scheduled appointments. Book a session now!" 
              : "Your appointment history will appear here."}
          </Text>
          {filter === 'upcoming' && (
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => setActiveTab('book')}
            >
              <Text style={styles.emptyButtonText}>Book Appointment</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <View style={styles.content}>
        {appointments.map((appointment) => {
          const typeInfo = appointmentTypes.find(t => t.id === appointment.type);
          const isUpcoming = appointment.status === 'upcoming';

          return (
            <View 
              key={appointment.id} 
              style={[
                styles.appointmentCard,
                isUpcoming && styles.appointmentCardUpcoming,
              ]}
            >
              <View style={styles.appointmentHeader}>
                <View style={styles.appointmentDate}>
                  <Text style={styles.appointmentDateNum}>
                    {new Date(appointment.date).getDate()}
                  </Text>
                  <Text style={styles.appointmentDateMonth}>
                    {new Date(appointment.date).toLocaleDateString('en-US', { month: 'short' })}
                  </Text>
                </View>
                <View style={styles.appointmentInfo}>
                  <Text style={styles.appointmentCounsellor}>
                    {appointment.counsellor.avatar} {appointment.counsellor.name}
                  </Text>
                  <Text style={styles.appointmentSpec}>
                    {appointment.counsellor.specialization}
                  </Text>
                  <View style={styles.appointmentMeta}>
                    <View style={styles.appointmentTime}>
                      <Ionicons name="time-outline" size={14} color="#64748b" />
                      <Text style={styles.appointmentTimeText}>{appointment.time}</Text>
                    </View>
                    <View style={[styles.typeBadge, { backgroundColor: typeInfo?.color + '20' }]}>
                      <Ionicons name={typeInfo?.icon as any} size={14} color={typeInfo?.color} />
                      <Text style={[styles.typeBadgeText, { color: typeInfo?.color }]}>
                        {typeInfo?.label}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {appointment.notes && (
                <View style={styles.appointmentNotes}>
                  <Text style={styles.appointmentNotesLabel}>Notes:</Text>
                  <Text style={styles.appointmentNotesText}>{appointment.notes}</Text>
                </View>
              )}

              {isUpcoming && (
                <View style={styles.appointmentActions}>
                  <TouchableOpacity style={styles.rescheduleButton}>
                    <Ionicons name="calendar-outline" size={18} color="#006dab" />
                    <Text style={styles.rescheduleText}>Reschedule</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.joinButton}>
                    <LinearGradient
                      colors={[typeInfo?.color || '#006dab', '#005a8f']}
                      style={styles.joinButtonGradient}
                    >
                      <Ionicons name={typeInfo?.icon as any} size={18} color="#fff" />
                      <Text style={styles.joinButtonText}>Join</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

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
      {renderTabs()}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'book' && step === 'counsellor' && renderCounsellorSelection()}
        {activeTab === 'book' && step === 'datetime' && renderDateTimeSelection()}
        {activeTab === 'book' && step === 'confirm' && renderConfirmation()}
        {activeTab === 'upcoming' && renderAppointmentsList('upcoming')}
        {activeTab === 'history' && renderAppointmentsList('completed')}
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
  toastContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
  headerCenter: { flex: 1, marginLeft: 16 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  headerSubtitle: { fontSize: 14, color: '#64748b', marginTop: 2 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#eff6ff',
    borderWidth: 2,
    borderColor: '#006dab',
  },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#006dab' },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  content: {
    padding: isWeb ? 40 : 20,
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
  },
  stepTitle: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  stepDescription: { fontSize: 16, color: '#64748b', marginBottom: 24 },
  counsellorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  counsellorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarEmoji: { fontSize: 32 },
  counsellorInfo: { flex: 1 },
  counsellorName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  counsellorSpec: { fontSize: 14, color: '#64748b', marginTop: 2 },
  counsellorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: { fontSize: 12, fontWeight: '700', color: '#92400e' },
  languageText: { fontSize: 12, color: '#64748b' },
  selectedCounsellorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 24,
    gap: 8,
  },
  selectedLabel: { fontSize: 13, color: '#64748b' },
  selectedValue: { fontSize: 14, fontWeight: '700', color: '#006dab' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 12, marginTop: 8 },
  dateScroll: { marginHorizontal: -20, marginBottom: 24 },
  dateScrollContent: { paddingHorizontal: 20, gap: 10 },
  dateCard: {
    width: 70,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  dateCardActive: {
    backgroundColor: '#006dab',
    borderColor: '#006dab',
  },
  dateDay: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  dateDayActive: { color: 'rgba(255,255,255,0.8)' },
  dateNum: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginVertical: 4 },
  dateNumActive: { color: '#ffffff' },
  dateMonth: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  dateMonthActive: { color: 'rgba(255,255,255,0.8)' },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  timeSlot: {
    flex: 1,
    minWidth: 90,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  timeSlotDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#f1f5f9',
  },
  timeSlotActive: {
    backgroundColor: '#006dab',
    borderColor: '#006dab',
  },
  timeText: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  timeTextDisabled: { color: '#94a3b8' },
  timeTextActive: { color: '#ffffff' },
  unavailableText: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  typeOptions: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  typeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  typeLabel: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  continueButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#006dab',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  continueButtonText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  confirmCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  confirmSection: { padding: 20 },
  counsellorConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  confirmCounsellorName: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  confirmCounsellorSpec: { fontSize: 14, color: '#64748b', marginTop: 2 },
  confirmDivider: { height: 1, backgroundColor: '#e2e8f0' },
  confirmDetails: { padding: 20, gap: 16 },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  confirmLabel: { flex: 1, fontSize: 14, color: '#64748b' },
  confirmValue: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  notesSection: { marginBottom: 16 },
  notesInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    fontSize: 16,
    color: '#0f172a',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 24,
  },
  infoText: { flex: 1, fontSize: 13, color: '#1e40af', lineHeight: 20 },
  confirmActions: { flexDirection: 'row', gap: 12 },
  editButton: {
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
  editButtonText: { fontSize: 16, fontWeight: '700', color: '#006dab' },
  bookButton: {
    flex: 2,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  bookButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  bookButtonText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    paddingTop: 80,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginTop: 24 },
  emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8 },
  emptyButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#006dab',
    borderRadius: 10,
  },
  emptyButtonText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  appointmentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  appointmentCardUpcoming: {
    borderLeftWidth: 4,
    borderLeftColor: '#006dab',
  },
  appointmentHeader: {
    flexDirection: 'row',
    gap: 16,
  },
  appointmentDate: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 8,
  },
  appointmentDateNum: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  appointmentDateMonth: { fontSize: 12, color: '#64748b', textTransform: 'uppercase' },
  appointmentInfo: { flex: 1 },
  appointmentCounsellor: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  appointmentSpec: { fontSize: 13, color: '#64748b', marginTop: 2 },
  appointmentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  appointmentTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  appointmentTimeText: { fontSize: 13, color: '#64748b' },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  typeBadgeText: { fontSize: 12, fontWeight: '600' },
  appointmentNotes: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  appointmentNotesLabel: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  appointmentNotesText: { fontSize: 14, color: '#0f172a' },
  appointmentActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  rescheduleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    gap: 6,
  },
  rescheduleText: { fontSize: 14, fontWeight: '600', color: '#006dab' },
  joinButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  joinButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  joinButtonText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
});
