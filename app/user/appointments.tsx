import { useApp } from '@/context/AppContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

const isWeb = Platform.OS === 'web';

interface DoctorAppointment {
  id: string;
  date: Date;
  time: string;
  period: 'AM' | 'PM';
  doctorName?: string;
  purpose?: string;
  createdAt: Date;
}

interface NurseRequest {
  id: string;
  type: 'call' | 'video';
  phone: string;
  reason: string;
  status: 'pending' | 'completed';
  createdAt: Date;
}

interface NurseVisit {
  id: string;
  date: string;
  time: string;
  nurseName: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  visitNumber: number;
}

// Generate nurse visits every 28 days
const generateNurseVisits = (): NurseVisit[] => {
  const visits: NurseVisit[] = [];
  const startDate = new Date('2025-10-02'); // First visit date
  const today = new Date();
  const nurses = ['Nurse Priya', 'Nurse Lakshmi', 'Nurse Anitha'];
  
  for (let i = 0; i < 12; i++) { // Generate 12 visits (about 1 year)
    const visitDate = new Date(startDate);
    visitDate.setDate(startDate.getDate() + (i * 28));
    
    const status = visitDate < today ? 'completed' : 'scheduled';
    
    visits.push({
      id: `NV${String(i + 1).padStart(3, '0')}`,
      date: visitDate.toISOString().split('T')[0],
      time: '10:00 AM',
      nurseName: nurses[i % nurses.length],
      status,
      visitNumber: i + 1,
    });
  }
  
  return visits;
};

const mockNurseVisits: NurseVisit[] = generateNurseVisits();

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const HOURS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MINUTES = ['00', '15', '30', '45'];

export default function AppointmentsScreen() {
  const router = useRouter();
  const { user } = useApp();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const [selectedHour, setSelectedHour] = useState('10');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');
  
  const [doctorName, setDoctorName] = useState('');
  const [appointmentPurpose, setAppointmentPurpose] = useState('');
  
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  
  const [supportPhone, setSupportPhone] = useState(user?.phone || '9876543210');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [nurseRequests, setNurseRequests] = useState<NurseRequest[]>([]);
  
  const [activeSection, setActiveSection] = useState<'appointments' | 'nurseVisit' | 'support'>('appointments');
  const [showTimePicker, setShowTimePicker] = useState(false);
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

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const isDateSelected = (day: number) => {
    if (!selectedDate || !day) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth.getMonth() &&
      selectedDate.getFullYear() === currentMonth.getFullYear()
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === currentMonth.getMonth() &&
      today.getFullYear() === currentMonth.getFullYear()
    );
  };

  const isPastDate = (day: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return checkDate < today;
  };

  const hasAppointment = (day: number) => {
    return appointments.some(apt => {
      const aptDate = new Date(apt.date);
      return (
        aptDate.getDate() === day &&
        aptDate.getMonth() === currentMonth.getMonth() &&
        aptDate.getFullYear() === currentMonth.getFullYear()
      );
    });
  };

  const handleDateSelect = (day: number) => {
    if (!day) return;
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(newDate);
  };

  const formatTime = () => {
    return selectedHour + ':' + selectedMinute + ' ' + selectedPeriod;
  };

  const handleLogAppointment = () => {
    if (!selectedDate) {
      showToast('Please select a date', 'error');
      return;
    }

    const newAppointment: DoctorAppointment = {
      id: Date.now().toString(),
      date: selectedDate,
      time: selectedHour + ':' + selectedMinute,
      period: selectedPeriod,
      doctorName: doctorName.trim() || undefined,
      purpose: appointmentPurpose.trim() || undefined,
      createdAt: new Date(),
    };

    setAppointments([newAppointment, ...appointments]);
    showToast('Appointment logged successfully!', 'success');
    
    setDoctorName('');
    setAppointmentPurpose('');
  };

  const handleDeleteAppointment = (id: string) => {
    setAppointments(appointments.filter(apt => apt.id !== id));
    showToast('Appointment removed', 'success');
  };

  const handleRequestSupport = (type: 'call' | 'video') => {
    if (!supportPhone.trim()) {
      showToast('Please enter your phone number', 'error');
      return;
    }

    const newRequest: NurseRequest = {
      id: Date.now().toString(),
      type,
      phone: supportPhone,
      reason: '',
      status: 'pending',
      createdAt: new Date(),
    };

    setNurseRequests([newRequest, ...nurseRequests]);
    const msg = type === 'call' ? 'Call' : 'Video call';
    showToast(msg + ' request sent!', 'success');
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#0f172a" />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>Appointments</Text>
      </View>
    </View>
  );

  const renderSectionTabs = () => (
    <View style={styles.sectionTabs}>
      <TouchableOpacity
        style={[styles.sectionTab, activeSection === 'appointments' && styles.sectionTabActive]}
        onPress={() => setActiveSection('appointments')}
      >
        <Ionicons 
          name="calendar-outline" 
          size={18} 
          color={activeSection === 'appointments' ? '#006dab' : '#64748b'} 
        />
        <Text style={[styles.sectionTabText, activeSection === 'appointments' && styles.sectionTabTextActive]}>
          Doctor Visit
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.sectionTab, activeSection === 'nurseVisit' && styles.sectionTabActive]}
        onPress={() => setActiveSection('nurseVisit')}
      >
        <Ionicons 
          name="medkit-outline" 
          size={18} 
          color={activeSection === 'nurseVisit' ? '#006dab' : '#64748b'} 
        />
        <Text style={[styles.sectionTabText, activeSection === 'nurseVisit' && styles.sectionTabTextActive]}>
          Nurse Visit
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.sectionTab, activeSection === 'support' && styles.sectionTabActive]}
        onPress={() => setActiveSection('support')}
      >
        <Ionicons 
          name="chatbubbles-outline" 
          size={18} 
          color={activeSection === 'support' ? '#006dab' : '#64748b'} 
        />
        <Text style={[styles.sectionTabText, activeSection === 'support' && styles.sectionTabTextActive]}>
          Support
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCalendar = () => {
    const days = getDaysInMonth(currentMonth);
    
    return (
      <View style={styles.calendarCard}>
        <View style={styles.monthNavigation}>
          <TouchableOpacity onPress={goToPreviousMonth} style={styles.monthNavButton}>
            <Ionicons name="chevron-back" size={20} color="#006dab" />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {MONTH_FULL[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </Text>
          <TouchableOpacity onPress={goToNextMonth} style={styles.monthNavButton}>
            <Ionicons name="chevron-forward" size={20} color="#006dab" />
          </TouchableOpacity>
        </View>

        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((day, idx) => (
            <Text key={idx} style={styles.weekdayText}>{day}</Text>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {days.map((day, index) => {
            const isPast = day !== null && isPastDate(day);
            const isSelected = day !== null && isDateSelected(day);
            return (
              <View key={index} style={[styles.dayCell, isMobile && styles.dayCellMobile]}>
                <TouchableOpacity
                  style={[
                    styles.dayCellInner,
                    isMobile && styles.dayCellInnerMobile,
                    isSelected ? styles.dayCellSelected : null,
                  ]}
                  onPress={() => day !== null && !isPast && handleDateSelect(day)}
                  disabled={day === null || isPast}
                >
                  {day !== null && (
                    <View style={styles.dayCellContent}>
                      <Text style={[
                        styles.dayText,
                        isSelected ? styles.dayTextSelected : null,
                        isToday(day) && !isSelected ? styles.dayTextToday : null,
                        isPast ? styles.dayTextPast : null,
                      ]}>
                        {day}
                      </Text>
                      {isToday(day) && !isSelected && (
                        <View style={styles.todayDot} />
                      )}
                      {hasAppointment(day) && !isToday(day) && !isPast && (
                        <View style={styles.appointmentDot} />
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderTimePicker = () => (
    <View style={styles.timeSection}>
      <Text style={styles.inputLabel}>Time</Text>
      <TouchableOpacity 
        style={styles.timeButton}
        onPress={() => setShowTimePicker(true)}
      >
        <Ionicons name="time-outline" size={18} color="#006dab" />
        <Text style={styles.timeButtonText}>{formatTime()}</Text>
        <Ionicons name="chevron-down" size={16} color="#94a3b8" />
      </TouchableOpacity>

      <Modal
        visible={showTimePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.timePickerModal}>
            <View style={styles.timePickerHeader}>
              <Text style={styles.timePickerTitle}>Select Time</Text>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.timePickerContent}>
              <View style={styles.timeColumn}>
                <Text style={styles.timeColumnLabel}>Hour</Text>
                <ScrollView style={styles.timeScrollView} showsVerticalScrollIndicator={false}>
                  {HOURS.map((hour) => (
                    <TouchableOpacity
                      key={hour}
                      style={[styles.timeOption, selectedHour === hour && styles.timeOptionActive]}
                      onPress={() => setSelectedHour(hour)}
                    >
                      <Text style={[styles.timeOptionText, selectedHour === hour && styles.timeOptionTextActive]}>
                        {hour}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.timeColumn}>
                <Text style={styles.timeColumnLabel}>Min</Text>
                <ScrollView style={styles.timeScrollView} showsVerticalScrollIndicator={false}>
                  {MINUTES.map((minute) => (
                    <TouchableOpacity
                      key={minute}
                      style={[styles.timeOption, selectedMinute === minute && styles.timeOptionActive]}
                      onPress={() => setSelectedMinute(minute)}
                    >
                      <Text style={[styles.timeOptionText, selectedMinute === minute && styles.timeOptionTextActive]}>
                        {minute}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.timeColumn}>
                <Text style={styles.timeColumnLabel}>AM/PM</Text>
                <View style={styles.periodOptions}>
                  {(['AM', 'PM'] as const).map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.periodOption, selectedPeriod === p && styles.periodOptionActive]}
                      onPress={() => setSelectedPeriod(p)}
                    >
                      <Text style={[styles.periodText, selectedPeriod === p && styles.periodTextActive]}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.timePickerDone}
              onPress={() => setShowTimePicker(false)}
            >
              <Text style={styles.timePickerDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );

  const renderAppointmentForm = () => (
    <View style={styles.formSection}>
      {selectedDate && (
        <View style={styles.selectedDateBadge}>
          <Text style={styles.selectedDateText}>
            {selectedDate.getDate()} {MONTH_FULL[selectedDate.getMonth()]}, {selectedDate.getFullYear()}
          </Text>
        </View>
      )}

      <View style={styles.formRow}>
        {renderTimePicker()}
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Doctor (Optional)</Text>
          <TextInput
            style={styles.textInput}
            value={doctorName}
            onChangeText={setDoctorName}
            placeholder="Dr. Name"
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>

      <View style={styles.inputGroupFull}>
        <Text style={styles.inputLabel}>Purpose (Optional)</Text>
        <TextInput
          style={styles.textInput}
          value={appointmentPurpose}
          onChangeText={setAppointmentPurpose}
          placeholder="e.g., Regular checkup"
          placeholderTextColor="#94a3b8"
        />
      </View>

      <TouchableOpacity 
        style={styles.logButton}
        onPress={handleLogAppointment}
        activeOpacity={0.85}
      >
        <View style={styles.logButtonInner}>
          <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
          <Text style={styles.logButtonText}>Log Appointment</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderLoggedAppointments = () => (
    <View style={styles.loggedSection}>
      {appointments.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Logged</Text>
          {appointments.map((apt) => (
            <View key={apt.id} style={styles.appointmentCard}>
              <View style={styles.appointmentDateBox}>
                <Text style={styles.appointmentDayNum}>{new Date(apt.date).getDate()}</Text>
                <Text style={styles.appointmentMonth}>
                  {MONTHS[new Date(apt.date).getMonth()]}
                </Text>
              </View>
              <View style={styles.appointmentCardContent}>
                <Text style={styles.appointmentTime}>{apt.time} {apt.period}</Text>
                {apt.doctorName && (
                  <Text style={styles.appointmentDoctor}>{apt.doctorName}</Text>
                )}
                {apt.purpose && (
                  <Text style={styles.appointmentPurpose}>{apt.purpose}</Text>
                )}
              </View>
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => handleDeleteAppointment(apt.id)}
              >
                <Ionicons name="close" size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}
    </View>
  );

  const [nurseVisitMonth, setNurseVisitMonth] = useState(new Date());

  // Get visit dates for the nurse visit calendar
  const getVisitDatesForMonth = (month: Date) => {
    const visitDates: { [key: string]: NurseVisit } = {};
    mockNurseVisits.forEach(visit => {
      const visitDate = new Date(visit.date);
      if (visitDate.getMonth() === month.getMonth() && visitDate.getFullYear() === month.getFullYear()) {
        visitDates[visitDate.getDate()] = visit;
      }
    });
    return visitDates;
  };

  const renderNurseVisitCalendar = () => {
    const year = nurseVisitMonth.getFullYear();
    const month = nurseVisitMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const visitDates = getVisitDatesForMonth(nurseVisitMonth);
    const today = new Date();

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.nvCalendarDay} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const hasVisit = visitDates[day];
      const visit = visitDates[day];
      const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
      const isPast = visit && visit.status === 'completed';

      days.push(
        <View
          key={day}
          style={[
            styles.nvCalendarDay,
            hasVisit && styles.nvCalendarDayWithVisit,
            isPast && styles.nvCalendarDayPast,
            isToday && styles.nvCalendarDayToday,
          ]}
        >
          <Text
            style={[
              styles.nvCalendarDayText,
              hasVisit && styles.nvCalendarDayTextVisit,
              isPast && styles.nvCalendarDayTextPast,
              isToday && styles.nvCalendarDayTextToday,
            ]}
          >
            {day}
          </Text>
          {hasVisit && (
            <View style={[styles.nvVisitDot, isPast && styles.nvVisitDotPast]} />
          )}
        </View>
      );
    }

    return (
      <View style={styles.nvCalendarCard}>
        <View style={styles.nvMonthNavigation}>
          <TouchableOpacity
            style={styles.nvMonthNavButton}
            onPress={() => setNurseVisitMonth(new Date(year, month - 1, 1))}
          >
            <Ionicons name="chevron-back" size={18} color="#64748b" />
          </TouchableOpacity>
          <Text style={styles.nvMonthTitle}>
            {MONTH_FULL[month]} {year}
          </Text>
          <TouchableOpacity
            style={styles.nvMonthNavButton}
            onPress={() => setNurseVisitMonth(new Date(year, month + 1, 1))}
          >
            <Ionicons name="chevron-forward" size={18} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View style={styles.nvWeekdaysRow}>
          {WEEKDAYS.map((day, index) => (
            <Text key={index} style={styles.nvWeekdayText}>{day}</Text>
          ))}
        </View>

        <View style={styles.nvDaysGrid}>{days}</View>

        <View style={styles.nvCalendarLegend}>
          <View style={styles.nvLegendItem}>
            <View style={[styles.nvLegendDot, { backgroundColor: '#006dab' }]} />
            <Text style={styles.nvLegendText}>Scheduled Visit</Text>
          </View>
          <View style={styles.nvLegendItem}>
            <View style={[styles.nvLegendDot, { backgroundColor: '#94a3b8' }]} />
            <Text style={styles.nvLegendText}>Completed</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderNurseVisits = () => {
    const upcomingVisits = mockNurseVisits.filter(v => v.status === 'scheduled');
    const pastVisits = mockNurseVisits.filter(v => v.status === 'completed').slice(-3); // Show last 3 completed
    const nextVisit = upcomingVisits[0];

    return (
      <View style={styles.nurseVisitSection}>
        <View style={styles.nurseVisitHeader}>
          <View style={styles.nurseVisitHeaderIcon}>
            <Ionicons name="medkit" size={24} color="#006dab" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.nurseVisitTitle}>Nurse Visits</Text>
            <Text style={styles.nurseVisitSubtitle}>Every 28 days checkup</Text>
          </View>
        </View>

        {/* Calendar */}
        {renderNurseVisitCalendar()}

        {/* Next Visit Highlight */}
        {nextVisit && (
          <View style={styles.nextVisitCard}>
            <View style={styles.nextVisitBadge}>
              <Text style={styles.nextVisitBadgeText}>Next Visit</Text>
            </View>
            <View style={styles.nextVisitContent}>
              <View style={[styles.visitDateBox, styles.nextVisitDateBox]}>
                <Text style={[styles.visitDayNum, styles.nextVisitDayNum]}>
                  {new Date(nextVisit.date).getDate()}
                </Text>
                <Text style={[styles.visitMonth, styles.nextVisitMonth]}>
                  {MONTHS[new Date(nextVisit.date).getMonth()]}
                </Text>
              </View>
              <View style={styles.visitContent}>
                <View style={styles.visitTimeRow}>
                  <Ionicons name="time-outline" size={14} color="#ffffff" />
                  <Text style={[styles.visitTime, styles.nextVisitText]}>{nextVisit.time}</Text>
                </View>
                <Text style={[styles.visitNurseName, styles.nextVisitText]}>{nextVisit.nurseName}</Text>
                <Text style={[styles.visitNumberText, styles.nextVisitTextLight]}>Visit #{nextVisit.visitNumber}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Upcoming Visits */}
        {upcomingVisits.length > 1 && (
          <View style={styles.visitCategory}>
            <Text style={styles.visitCategoryTitle}>Upcoming Visits</Text>
            {upcomingVisits.slice(1, 4).map((visit) => (
              <View key={visit.id} style={styles.nurseVisitCard}>
                <View style={styles.visitDateBox}>
                  <Text style={styles.visitDayNum}>
                    {new Date(visit.date).getDate()}
                  </Text>
                  <Text style={styles.visitMonth}>
                    {MONTHS[new Date(visit.date).getMonth()]}
                  </Text>
                </View>
                <View style={styles.visitContent}>
                  <View style={styles.visitTimeRow}>
                    <Ionicons name="time-outline" size={14} color="#006dab" />
                    <Text style={styles.visitTime}>{visit.time}</Text>
                  </View>
                  <Text style={styles.visitNurseName}>{visit.nurseName}</Text>
                  <Text style={styles.visitNumberText}>Visit #{visit.visitNumber}</Text>
                </View>
                <View style={[styles.visitStatusBadge, styles.visitStatusScheduled]}>
                  <Text style={styles.visitStatusText}>Scheduled</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Past Visits */}
        {pastVisits.length > 0 && (
          <View style={styles.visitCategory}>
            <Text style={styles.visitCategoryTitle}>Recent Completed</Text>
            {pastVisits.reverse().map((visit) => (
              <View key={visit.id} style={[styles.nurseVisitCard, styles.nurseVisitCardPast]}>
                <View style={[styles.visitDateBox, styles.visitDateBoxPast]}>
                  <Text style={[styles.visitDayNum, styles.visitDayNumPast]}>
                    {new Date(visit.date).getDate()}
                  </Text>
                  <Text style={[styles.visitMonth, styles.visitMonthPast]}>
                    {MONTHS[new Date(visit.date).getMonth()]}
                  </Text>
                </View>
                <View style={styles.visitContent}>
                  <View style={styles.visitTimeRow}>
                    <Ionicons name="time-outline" size={14} color="#94a3b8" />
                    <Text style={[styles.visitTime, styles.visitTimePast]}>{visit.time}</Text>
                  </View>
                  <Text style={[styles.visitNurseName, styles.visitNurseNamePast]}>{visit.nurseName}</Text>
                  <Text style={styles.visitNumberText}>Visit #{visit.visitNumber}</Text>
                </View>
                <View style={[styles.visitStatusBadge, styles.visitStatusCompleted]}>
                  <Text style={[styles.visitStatusText, styles.visitStatusTextCompleted]}>Completed</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderNursingSupport = () => (
    <View style={styles.supportSection}>
      <View style={styles.supportHeader}>
        <Text style={styles.supportTitle}>Nursing Department Support</Text>
        <Text style={styles.supportSubtitle}>Our team is here to help</Text>
      </View>

      <View style={styles.phoneSection}>
        <Text style={styles.inputLabel}>Contact Number</Text>
        <View style={styles.phoneRow}>
          <View style={styles.phoneDisplay}>
            <Text style={styles.countryCode}>+91</Text>
            {isEditingPhone ? (
              <TextInput
                style={styles.phoneEditInput}
                value={supportPhone}
                onChangeText={setSupportPhone}
                keyboardType="phone-pad"
                maxLength={10}
                autoFocus
                onBlur={() => setIsEditingPhone(false)}
              />
            ) : (
              <Text style={styles.phoneNumber}>{supportPhone}</Text>
            )}
          </View>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => setIsEditingPhone(true)}
          >
            <Ionicons name="pencil-outline" size={16} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.supportButtons}>
        <TouchableOpacity 
          style={styles.callButton}
          onPress={() => handleRequestSupport('call')}
          activeOpacity={0.85}
        >
          <View style={styles.callButtonInner}>
            <Ionicons name="call-outline" size={20} color="#ffffff" />
            <Text style={styles.callButtonText}>Request Call</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.videoButton}
          onPress={() => handleRequestSupport('video')}
          activeOpacity={0.85}
        >
          <View style={styles.videoButtonInner}>
            <Ionicons name="videocam-outline" size={20} color="#ffffff" />
            <Text style={styles.videoButtonText}>Request Video Call</Text>
          </View>
        </TouchableOpacity>
      </View>

      {nurseRequests.length > 0 && (
        <View style={styles.requestsSection}>
          <Text style={styles.sectionTitle}>Requests</Text>
          {nurseRequests.map((req) => (
            <View key={req.id} style={styles.requestCard}>
              <View style={[
                styles.requestIcon,
                { backgroundColor: req.type === 'call' ? '#dcfce7' : '#e0f2fe' }
              ]}>
                <Ionicons 
                  name={req.type === 'call' ? 'call-outline' : 'videocam-outline'} 
                  size={16} 
                  color={req.type === 'call' ? '#22c55e' : '#006dab'} 
                />
              </View>
              <View style={styles.requestContent}>
                <Text style={styles.requestType}>
                  {req.type === 'call' ? 'Call Request' : 'Video Call'}
                </Text>
                <Text style={styles.requestTime}>
                  {new Date(req.createdAt).toLocaleString('en-IN', { 
                    day: 'numeric', 
                    month: 'short', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Text>
              </View>
              <View style={styles.requestStatusBadge}>
                <Text style={styles.requestStatusText}>Pending</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

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
      {renderSectionTabs()}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentContainer}>
          {activeSection === 'appointments' ? (
            <>
              {renderCalendar()}
              {renderAppointmentForm()}
              {renderLoggedAppointments()}
            </>
          ) : activeSection === 'nurseVisit' ? (
            renderNurseVisits()
          ) : (
            renderNursingSupport()
          )}
        </View>
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
    left: 16,
    right: 16,
    zIndex: 1000,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
  },
  toastError: { borderLeftColor: '#ef4444' },
  toastSuccess: { borderLeftColor: '#98be4e' },
  toastContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toastIcon: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  toastText: { color: '#1e293b', fontSize: 14, fontWeight: '500', flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingTop: isWeb ? 16 : 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  sectionTabs: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  sectionTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    gap: 6,
  },
  sectionTabActive: {
    backgroundColor: '#e0f2fe',
  },
  sectionTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  sectionTabTextActive: {
    color: '#006dab',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  // Calendar
  calendarCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthNavButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellMobile: {
    aspectRatio: undefined,
    paddingVertical: 8,
  },
  dayCellInner: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  dayCellInnerMobile: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  dayCellContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellSelected: {
    backgroundColor: '#006dab',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },
  dayTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  dayTextToday: {
    color: '#006dab',
    fontWeight: '700',
  },
  dayTextPast: {
    color: '#cbd5e1',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#98be4e',
    marginTop: 2,
  },
  appointmentDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#006dab',
    marginTop: 2,
  },
  // Form
  formSection: {
    marginTop: 16,
    gap: 12,
  },
  selectedDateBadge: {
    backgroundColor: '#e0f2fe',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  selectedDateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#006dab',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeSection: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  timeButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  inputGroup: {
    flex: 1,
  },
  inputGroupFull: {
    width: '100%',
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    fontSize: 14,
    color: '#0f172a',
  },
  logButton: {
    marginTop: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  logButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    backgroundColor: '#006dab',
  },
  logButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  timePickerModal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 320,
  },
  timePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timePickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  timePickerContent: {
    flexDirection: 'row',
    gap: 10,
  },
  timeColumn: {
    flex: 1,
  },
  timeColumnLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 6,
  },
  timeScrollView: {
    maxHeight: 150,
  },
  timeOption: {
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 4,
    alignItems: 'center',
  },
  timeOptionActive: {
    backgroundColor: '#006dab',
  },
  timeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  timeOptionTextActive: {
    color: '#ffffff',
  },
  periodOptions: {
    gap: 6,
  },
  periodOption: {
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  periodOptionActive: {
    backgroundColor: '#006dab',
  },
  periodText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  periodTextActive: {
    color: '#ffffff',
  },
  timePickerDone: {
    marginTop: 16,
    backgroundColor: '#006dab',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  timePickerDoneText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  // Logged appointments
  loggedSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 10,
  },
  appointmentCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  appointmentDateBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  appointmentDayNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#006dab',
  },
  appointmentMonth: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0284c7',
    textTransform: 'uppercase',
  },
  appointmentCardContent: {
    flex: 1,
  },
  appointmentTime: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  appointmentDoctor: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  appointmentPurpose: {
    fontSize: 12,
    color: '#94a3b8',
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Nursing support
  supportSection: {
    gap: 16,
  },
  supportHeader: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  supportTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  supportSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  phoneSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  phoneDisplay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countryCode: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  phoneNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  phoneEditInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    padding: 0,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  callButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  callButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    backgroundColor: '#006dab',
  },
  callButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  videoButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  videoButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    backgroundColor: '#006dab',
  },
  videoButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  requestsSection: {
    marginTop: 4,
  },
  requestCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  requestIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  requestContent: {
    flex: 1,
  },
  requestType: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  requestTime: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  requestStatusBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  requestStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400e',
  },
  // Nurse Visit Styles
  nurseVisitSection: {
    flex: 1,
  },
  nurseVisitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  nurseVisitHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nurseVisitTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  nurseVisitSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  visitCategory: {
    marginBottom: 20,
  },
  visitCategoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  nurseVisitCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#006dab',
  },
  nurseVisitCardPast: {
    borderLeftColor: '#94a3b8',
    backgroundColor: '#f8fafc',
  },
  visitDateBox: {
    width: 50,
    height: 56,
    backgroundColor: '#e0f2fe',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  visitDateBoxPast: {
    backgroundColor: '#f1f5f9',
  },
  visitDayNum: {
    fontSize: 20,
    fontWeight: '700',
    color: '#006dab',
  },
  visitDayNumPast: {
    color: '#94a3b8',
  },
  visitMonth: {
    fontSize: 11,
    fontWeight: '600',
    color: '#006dab',
    textTransform: 'uppercase',
  },
  visitMonthPast: {
    color: '#94a3b8',
  },
  visitContent: {
    flex: 1,
  },
  visitTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  visitTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#006dab',
  },
  visitTimePast: {
    color: '#94a3b8',
  },
  visitNurseName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  visitNurseNamePast: {
    color: '#64748b',
  },
  visitStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  visitStatusScheduled: {
    backgroundColor: '#dcfce7',
  },
  visitStatusCompleted: {
    backgroundColor: '#f1f5f9',
  },
  visitStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16a34a',
  },
  visitStatusTextCompleted: {
    color: '#64748b',
  },
  emptyVisits: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyVisitsText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 12,
  },
  visitNumberText: {
    fontSize: 12,
    color: '#64748b',
  },
  // Nurse Visit Calendar Styles
  nvCalendarCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  nvMonthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  nvMonthNavButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nvMonthTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  nvWeekdaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  nvWeekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  nvDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  nvCalendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  nvCalendarDayWithVisit: {
    backgroundColor: '#e0f2fe',
    borderRadius: 20,
  },
  nvCalendarDayPast: {
    backgroundColor: '#f1f5f9',
  },
  nvCalendarDayToday: {
    borderWidth: 2,
    borderColor: '#006dab',
    borderRadius: 20,
  },
  nvCalendarDayText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  nvCalendarDayTextVisit: {
    color: '#006dab',
    fontWeight: '700',
  },
  nvCalendarDayTextPast: {
    color: '#94a3b8',
  },
  nvCalendarDayTextToday: {
    color: '#006dab',
    fontWeight: '700',
  },
  nvVisitDot: {
    position: 'absolute',
    bottom: 4,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#006dab',
  },
  nvVisitDotPast: {
    backgroundColor: '#94a3b8',
  },
  nvCalendarLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  nvLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nvLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nvLegendText: {
    fontSize: 11,
    color: '#64748b',
  },
  nextVisitCard: {
    backgroundColor: '#006dab',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  nextVisitBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#98be4e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomLeftRadius: 12,
  },
  nextVisitBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  nextVisitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  nextVisitDateBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  nextVisitDayNum: {
    color: '#ffffff',
  },
  nextVisitMonth: {
    color: '#ffffff',
  },
  nextVisitText: {
    color: '#ffffff',
  },
  nextVisitTextLight: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
