import BottomNavBar from '@/components/navigation/BottomNavBar';
import { Skeleton } from '@/components/ui/SkeletonLoader';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { useUserData } from '@/context/UserDataContext';
import { doctorVisitService, formatDateString, nursingVisitService } from '@/services/firestore.service';
import { DoctorVisit, NursingDepartmentVisit } from '@/types/firebase.types';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
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

const HOURS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MINUTES = ['00', '15', '30', '45'];

export default function AppointmentsScreen() {
  const router = useRouter();
  const { user } = useApp();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const { t, language } = useLanguage();

  // Translated weekdays and months
  const WEEKDAYS = [
    t('days.sun').charAt(0), t('days.mon').charAt(0), t('days.tue').charAt(0), t('days.wed').charAt(0), 
    t('days.thu').charAt(0), t('days.fri').charAt(0), t('days.sat').charAt(0)
  ];
  
  const MONTHS = [
    t('months.jan'), t('months.feb'), t('months.mar'), t('months.apr'),
    t('months.may'), t('months.jun'), t('months.jul'), t('months.aug'),
    t('months.sep'), t('months.oct'), t('months.nov'), t('months.dec')
  ];
  
  const MONTH_FULL = [
    t('appointments.monthFull.jan'), t('appointments.monthFull.feb'), t('appointments.monthFull.mar'),
    t('appointments.monthFull.apr'), t('appointments.monthFull.may'), t('appointments.monthFull.jun'),
    t('appointments.monthFull.jul'), t('appointments.monthFull.aug'), t('appointments.monthFull.sep'),
    t('appointments.monthFull.oct'), t('appointments.monthFull.nov'), t('appointments.monthFull.dec')
  ];

  // Get cached data from context
  const { 
    userInfo,
    doctorVisits: cachedDoctorVisits, 
    nursingVisits: cachedNursingVisits,
    isInitialized,
    refreshDoctorVisits,
    refreshNursingVisits
  } = useUserData();

  // User data from context/AsyncStorage
  const [coupleId, setCoupleId] = useState<string>('');
  const [userGender, setUserGender] = useState<'male' | 'female'>('male');
  const [userName, setUserName] = useState<string>('');

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const [selectedHour, setSelectedHour] = useState('10');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');
  
  const [doctorName, setDoctorName] = useState('');
  const [appointmentPurpose, setAppointmentPurpose] = useState('');
  
  // Local state synced with context
  const [doctorVisits, setDoctorVisits] = useState<DoctorVisit[]>([]);
  const [nursingVisits, setNursingVisits] = useState<NursingDepartmentVisit[]>([]);
  const [isLoading, setIsLoading] = useState(!isInitialized);
  
  const [activeSection, setActiveSection] = useState<'appointments' | 'nurseVisit'>('appointments');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const toastAnim = useRef(new Animated.Value(-100)).current;

  // Sync with context data
  useEffect(() => {
    if (userInfo) {
      setCoupleId(userInfo.coupleId || '');
      setUserGender(userInfo.gender || 'male');
      setUserName(userInfo.name || '');
    }
  }, [userInfo]);

  useEffect(() => {
    if (cachedDoctorVisits) {
      setDoctorVisits(cachedDoctorVisits);
    }
  }, [cachedDoctorVisits]);

  useEffect(() => {
    if (cachedNursingVisits) {
      setNursingVisits(cachedNursingVisits);
    }
  }, [cachedNursingVisits]);

  useEffect(() => {
    if (isInitialized) {
      setIsLoading(false);
    }
  }, [isInitialized]);

  // Fallback load if context not ready (only on first load)
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        // Only load if context data is not available
        if (isInitialized && cachedDoctorVisits && cachedNursingVisits) {
          return;
        }

        setIsLoading(true);
        try {
          const storedCoupleId = await AsyncStorage.getItem('coupleId');
          const storedGender = await AsyncStorage.getItem('userGender');
          const storedName = await AsyncStorage.getItem('userName');

          if (storedCoupleId && storedGender) {
            setCoupleId(storedCoupleId);
            setUserGender(storedGender as 'male' | 'female');
            setUserName(storedName || '');

            // Load doctor visits from Firestore
            const visits = await doctorVisitService.getAll(storedCoupleId, storedGender as 'male' | 'female');
            setDoctorVisits(visits);

            // Load nursing department visits from Firestore
            const nursing = await nursingVisitService.getAll(storedCoupleId);
            setNursingVisits(nursing);
          }
        } catch (error) {
          console.error('Error loading appointments:', error);
        } finally {
          setIsLoading(false);
        }
      };

      loadData();
    }, [isInitialized, cachedDoctorVisits, cachedNursingVisits])
  );

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
    return doctorVisits.some(apt => {
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

  const handleLogAppointment = async () => {
    if (!selectedDate) {
      showToast('Please select a date', 'error');
      return;
    }

    if (!coupleId) {
      showToast('Unable to save. Please try again.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const visitData = {
        date: formatDateString(selectedDate),
        time: selectedHour + ':' + selectedMinute + ' ' + selectedPeriod,
        doctorName: doctorName.trim() || undefined,
        purpose: appointmentPurpose.trim() || undefined,
        loggedBy: userName || 'User',
      };

      const docId = await doctorVisitService.add(coupleId, userGender, visitData);
      
      // Create local object for state (approximate, Firestore timestamps differ)
      const savedVisit: DoctorVisit = {
        id: docId,
        coupleId,
        gender: userGender,
        date: visitData.date,
        time: visitData.time,
        doctorName: visitData.doctorName,
        purpose: visitData.purpose,
        loggedBy: visitData.loggedBy,
        status: 'upcoming',
        loggedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
        createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
        updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
      };
      
      setDoctorVisits([savedVisit, ...doctorVisits]);
      showToast('Appointment logged successfully!', 'success');
      
      // Refresh context cache
      refreshDoctorVisits();
      
      setDoctorName('');
      setAppointmentPurpose('');
      setSelectedDate(null);
    } catch (error) {
      console.error('Error saving appointment:', error);
      showToast('Failed to save appointment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    if (!coupleId) return;
    
    try {
      await doctorVisitService.delete(coupleId, id);
      setDoctorVisits(doctorVisits.filter(apt => apt.id !== id));
      showToast(t('appointments.appointmentRemoved'), 'success');
      
      // Refresh context cache
      refreshDoctorVisits();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      showToast(t('appointments.failedToRemove'), 'error');
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#0f172a" />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>{t('appointments.title')}</Text>
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
          Nursing Dept Visit
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
      <Text style={styles.inputLabel}>{t('appointments.time')}</Text>
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
              <Text style={styles.timePickerTitle}>{t('appointments.selectTime')}</Text>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.timePickerContent}>
              <View style={styles.timeColumn}>
                <Text style={styles.timeColumnLabel}>{t('appointments.hour')}</Text>
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
                <Text style={styles.timeColumnLabel}>{t('appointments.min')}</Text>
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
                <Text style={styles.timeColumnLabel}>{t('appointments.ampm')}</Text>
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
              <Text style={styles.timePickerDoneText}>{t('common.done')}</Text>
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
          <Text style={styles.inputLabel}>{t('appointments.doctorOptional')}</Text>
          <TextInput
            style={styles.textInput}
            value={doctorName}
            onChangeText={setDoctorName}
            placeholder={t('appointments.doctorPlaceholder')}
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>

      <View style={styles.inputGroupFull}>
        <Text style={styles.inputLabel}>{t('appointments.purposeOptional')}</Text>
        <TextInput
          style={styles.textInput}
          value={appointmentPurpose}
          onChangeText={setAppointmentPurpose}
          placeholder={t('appointments.purposePlaceholder')}
          placeholderTextColor="#94a3b8"
        />
      </View>

      <TouchableOpacity 
        style={[styles.logButton, isSubmitting && styles.logButtonDisabled]}
        onPress={handleLogAppointment}
        activeOpacity={0.85}
        disabled={isSubmitting}
      >
        <View style={styles.logButtonInner}>
          {isSubmitting ? (
            <>
              <ActivityIndicator size="small" color="#ffffff" />
              <Text style={styles.logButtonText}>{t('appointments.saving')}</Text>
            </>
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
              <Text style={styles.logButtonText}>{t('appointments.logAppointment')}</Text>
            </>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderLoggedAppointments = () => {
    const sortedDoctorVisits = [...doctorVisits].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return (
      <View style={styles.loggedSection}>
        {sortedDoctorVisits.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t('appointments.logged')}</Text>
            {sortedDoctorVisits.map((apt) => (
              <View key={apt.id} style={styles.appointmentCard}>
                <View style={styles.appointmentDateBox}>
                  <Text style={styles.appointmentDayNum}>{new Date(apt.date).getDate()}</Text>
                  <Text style={styles.appointmentMonth}>
                    {MONTHS[new Date(apt.date).getMonth()]}
                  </Text>
                </View>
                <View style={styles.appointmentCardContent}>
                  <Text style={styles.appointmentTime}>{apt.time}</Text>
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
  };

  const [nurseVisitMonth, setNurseVisitMonth] = useState(new Date());

  // Get visit dates for the nursing department visit calendar
  const getVisitDatesForMonth = (month: Date) => {
    const visitDates: { [key: string]: NursingDepartmentVisit } = {};
    nursingVisits.forEach(visit => {
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
        <View key={day} style={[styles.nvCalendarDay, isMobile && styles.nvCalendarDayMobile]}>
          <View
            style={[
              styles.nvCalendarDayInner,
              isMobile && styles.nvCalendarDayInnerMobile,
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
          </View>
          {hasVisit && (
            <View style={[styles.nvVisitDot, isPast && styles.nvVisitDotPast, isMobile && styles.nvVisitDotMobile]} />
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
            <Text style={styles.nvLegendText}>{t('appointments.scheduledVisit')}</Text>
          </View>
          <View style={styles.nvLegendItem}>
            <View style={[styles.nvLegendDot, { backgroundColor: '#94a3b8' }]} />
            <Text style={styles.nvLegendText}>{t('appointments.completed')}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderNurseVisits = () => {
    const upcomingVisits = nursingVisits
      .filter((v: NursingDepartmentVisit) => v.status === 'scheduled' || v.status === 'confirmed')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const cancelledVisits = nursingVisits
      .filter((v: NursingDepartmentVisit) => v.status === 'cancelled')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);
    const pastVisits = nursingVisits.filter((v: NursingDepartmentVisit) => v.status === 'completed').slice(-3);
    const nextVisit = upcomingVisits[0];

    return (
      <View style={styles.nurseVisitSection}>
        <View style={styles.nurseVisitHeader}>
          <View style={styles.nurseVisitHeaderIcon}>
            <Ionicons name="medkit" size={24} color="#006dab" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.nurseVisitTitle}>{t('appointments.nursingDeptVisits')}</Text>
            <Text style={styles.nurseVisitSubtitle}>{t('appointments.scheduledByAdmin')}</Text>
          </View>
        </View>

        {/* Calendar */}
        {renderNurseVisitCalendar()}

        {nursingVisits.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyStateText}>{t('appointments.noVisitsScheduled')}</Text>
            <Text style={styles.emptyStateSubtext}>{t('appointments.visitsAppearHere')}</Text>
          </View>
        )}

        {/* Next Visit Highlight */}
        {nextVisit && (
          <View style={styles.nextVisitCard}>
            <View style={styles.nextVisitBadge}>
              <Text style={styles.nextVisitBadgeText}>{t('appointments.nextVisit')}</Text>
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
                {nextVisit.departmentName && (
                  <Text style={[styles.visitNurseName, styles.nextVisitText]}>{nextVisit.departmentName}</Text>
                )}
                {nextVisit.visitNumber && (
                  <Text style={[styles.visitNumberText, styles.nextVisitTextLight]}>{t('appointments.visitNumber')} #{nextVisit.visitNumber}</Text>
                )}
                {nextVisit.linkedDoctorVisitId && (
                  <View style={styles.linkedDoctorVisitBadge}>
                    <Ionicons name="medical" size={12} color="#98be4e" />
                    <Text style={styles.linkedDoctorVisitText}>{t('appointments.sameDayDoctor')}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Upcoming Visits */}
        {upcomingVisits.length > 1 && (
          <View style={styles.visitCategory}>
            <Text style={styles.visitCategoryTitle}>{t('appointments.upcomingVisits')}</Text>
            {upcomingVisits.slice(1, 4).map((visit: NursingDepartmentVisit) => (
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
                  {visit.departmentName && (
                    <Text style={styles.visitNurseName}>{visit.departmentName}</Text>
                  )}
                  {visit.visitNumber && (
                    <Text style={styles.visitNumberText}>{t('appointments.visitNumber')} #{visit.visitNumber}</Text>
                  )}
                  {visit.linkedDoctorVisitId && (
                    <View style={styles.linkedDoctorVisitBadgeSmall}>
                      <Ionicons name="medical" size={10} color="#98be4e" />
                      <Text style={styles.linkedDoctorVisitTextSmall}>{t('appointments.doctorVisitDay')}</Text>
                    </View>
                  )}
                </View>
                <View style={[styles.visitStatusBadge, styles.visitStatusScheduled]}>
                  <Text style={styles.visitStatusText}>{visit.status === 'confirmed' ? t('appointments.statusConfirmed') : t('appointments.statusScheduled')}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Past Visits */}
        {pastVisits.length > 0 && (
          <View style={styles.visitCategory}>
            <Text style={styles.visitCategoryTitle}>{t('appointments.recentCompleted')}</Text>
            {[...pastVisits].reverse().map((visit: NursingDepartmentVisit) => (
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
                  {visit.departmentName && (
                    <Text style={[styles.visitNurseName, styles.visitNurseNamePast]}>{visit.departmentName}</Text>
                  )}
                  {visit.visitNumber && (
                    <Text style={styles.visitNumberText}>{t('appointments.visitNumber')} #{visit.visitNumber}</Text>
                  )}
                </View>
                <View style={[styles.visitStatusBadge, styles.visitStatusCompleted]}>
                  <Text style={[styles.visitStatusText, styles.visitStatusTextCompleted]}>{t('appointments.completed')}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Cancelled Visits */}
        {cancelledVisits.length > 0 && (
          <View style={styles.visitCategory}>
            <Text style={styles.visitCategoryTitle}>{t('appointments.cancelledVisits')}</Text>
            {cancelledVisits.map((visit: NursingDepartmentVisit) => (
              <View key={visit.id} style={[styles.nurseVisitCard, styles.nurseVisitCardCancelled]}>
                <View style={[styles.visitDateBox, styles.visitDateBoxCancelled]}>
                  <Text style={[styles.visitDayNum, styles.visitDayNumCancelled]}>
                    {new Date(visit.date).getDate()}
                  </Text>
                  <Text style={[styles.visitMonth, styles.visitMonthCancelled]}>
                    {MONTHS[new Date(visit.date).getMonth()]}
                  </Text>
                </View>
                <View style={styles.visitContent}>
                  <View style={styles.visitTimeRow}>
                    <Ionicons name="time-outline" size={14} color="#ef4444" />
                    <Text style={[styles.visitTime, styles.visitTimeCancelled]}>{visit.time}</Text>
                  </View>
                  {visit.departmentName && (
                    <Text style={[styles.visitNurseName, styles.visitNurseNameCancelled]}>{visit.departmentName}</Text>
                  )}
                  {visit.visitNumber && (
                    <Text style={[styles.visitNumberText, styles.visitNumberTextCancelled]}>{t('appointments.visitNumber')} #{visit.visitNumber}</Text>
                  )}
                </View>
                <View style={[styles.visitStatusBadge, styles.visitStatusCancelled]}>
                  <Text style={[styles.visitStatusText, styles.visitStatusTextCancelled]}>{t('appointments.cancelled')}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Inline skeleton for loading state
  const renderLoadingSkeleton = () => (
    <View style={styles.contentContainer}>
      {activeSection === 'appointments' ? (
        <>
          {/* Calendar Skeleton */}
          <View style={styles.skeletonCalendarCard}>
            <View style={styles.skeletonCalendarHeader}>
              <Skeleton width={24} height={24} borderRadius={6} />
              <Skeleton width={120} height={18} borderRadius={4} />
              <Skeleton width={24} height={24} borderRadius={6} />
            </View>
            <View style={styles.skeletonWeekdays}>
              {[1, 2, 3, 4, 5, 6, 7].map((_, i) => (
                <Skeleton key={i} width={28} height={14} borderRadius={4} />
              ))}
            </View>
            <View style={styles.skeletonDaysGrid}>
              {Array.from({ length: 35 }).map((_, i) => (
                <View key={i} style={styles.skeletonDayCell}>
                  <Skeleton width={32} height={32} borderRadius={16} />
                </View>
              ))}
            </View>
          </View>
          
          {/* Form Skeleton */}
          <View style={styles.skeletonFormCard}>
            <View style={styles.skeletonFormHeader}>
              <Skeleton width={40} height={40} borderRadius={20} />
              <Skeleton width={180} height={18} borderRadius={4} />
            </View>
            <Skeleton width="100%" height={48} borderRadius={12} style={{ marginTop: 16 }} />
            <Skeleton width="100%" height={48} borderRadius={12} style={{ marginTop: 12 }} />
            <Skeleton width="100%" height={50} borderRadius={12} style={{ marginTop: 16 }} />
          </View>
          
          {/* Logged Cards Skeleton */}
          <View style={styles.skeletonLoggedSection}>
            <Skeleton width={80} height={16} borderRadius={4} style={{ marginBottom: 12 }} />
            {[1, 2].map((_, i) => (
              <View key={i} style={styles.skeletonAppointmentCard}>
                <View style={styles.skeletonDateBox}>
                  <Skeleton width={32} height={24} borderRadius={4} />
                  <Skeleton width={28} height={12} borderRadius={4} style={{ marginTop: 4 }} />
                </View>
                <View style={{ flex: 1 }}>
                  <Skeleton width={80} height={14} borderRadius={4} />
                  <Skeleton width={120} height={12} borderRadius={4} style={{ marginTop: 6 }} />
                </View>
                <Skeleton width={24} height={24} borderRadius={12} />
              </View>
            ))}
          </View>
        </>
      ) : (
        /* Nurse Visits Skeleton */
        <View style={styles.skeletonNurseSection}>
          <View style={styles.skeletonNurseHeader}>
            <Skeleton width={48} height={48} borderRadius={24} />
            <View style={{ flex: 1 }}>
              <Skeleton width={160} height={18} borderRadius={4} />
              <Skeleton width={120} height={12} borderRadius={4} style={{ marginTop: 4 }} />
            </View>
          </View>
          
          {/* Calendar Skeleton */}
          <View style={styles.skeletonCalendarCard}>
            <View style={styles.skeletonCalendarHeader}>
              <Skeleton width={24} height={24} borderRadius={6} />
              <Skeleton width={120} height={18} borderRadius={4} />
              <Skeleton width={24} height={24} borderRadius={6} />
            </View>
            <View style={styles.skeletonWeekdays}>
              {[1, 2, 3, 4, 5, 6, 7].map((_, i) => (
                <Skeleton key={i} width={28} height={14} borderRadius={4} />
              ))}
            </View>
            <View style={styles.skeletonDaysGrid}>
              {Array.from({ length: 35 }).map((_, i) => (
                <View key={i} style={styles.skeletonDayCell}>
                  <Skeleton width={32} height={32} borderRadius={16} />
                </View>
              ))}
            </View>
          </View>
          
          {/* Visit Cards Skeleton */}
          {[1, 2, 3].map((_, i) => (
            <View key={i} style={styles.skeletonVisitCard}>
              <View style={styles.skeletonDateBox}>
                <Skeleton width={32} height={24} borderRadius={4} />
                <Skeleton width={28} height={12} borderRadius={4} style={{ marginTop: 4 }} />
              </View>
              <View style={{ flex: 1 }}>
                <Skeleton width={80} height={14} borderRadius={4} />
                <Skeleton width={100} height={12} borderRadius={4} style={{ marginTop: 6 }} />
              </View>
              <Skeleton width={70} height={24} borderRadius={12} />
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
        {isLoading ? renderLoadingSkeleton() : (
          <View style={styles.contentContainer}>
            {activeSection === 'appointments' ? (
              <>
                {renderCalendar()}
                {renderAppointmentForm()}
                {renderLoggedAppointments()}
              </>
            ) : (
              renderNurseVisits()
            )}
          </View>
        )}
      </ScrollView>
      
      <BottomNavBar />
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
    paddingBottom: 100,
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
  logButtonDisabled: {
    opacity: 0.7,
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
    justifyContent: 'flex-start',
  },
  nvCalendarDay: {
    width: '14.28%',
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  nvCalendarDayMobile: {
    paddingVertical: 6,
  },
  nvCalendarDayInner: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  nvCalendarDayInnerMobile: {
    width: 30,
    height: 30,
    borderRadius: 8,
  },
  nvCalendarDayWithVisit: {
    backgroundColor: '#e0f2fe',
  },
  nvCalendarDayPast: {
    backgroundColor: '#f1f5f9',
  },
  nvCalendarDayToday: {
    borderWidth: 2,
    borderColor: '#006dab',
  },
  nvCalendarDayText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'center',
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
  nvVisitDotMobile: {
    bottom: 6,
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginTop: 16,
    marginHorizontal: 4,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  linkedDoctorVisitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(152, 190, 78, 0.2)',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  linkedDoctorVisitText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#98be4e',
  },
  linkedDoctorVisitBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  linkedDoctorVisitTextSmall: {
    fontSize: 10,
    fontWeight: '500',
    color: '#98be4e',
  },
  // Cancelled visit styles
  nurseVisitCardCancelled: {
    opacity: 0.8,
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  visitDateBoxCancelled: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  visitDayNumCancelled: {
    color: '#ef4444',
  },
  visitMonthCancelled: {
    color: '#ef4444',
  },
  visitTimeCancelled: {
    color: '#ef4444',
    textDecorationLine: 'line-through',
  },
  visitNurseNameCancelled: {
    color: '#94a3b8',
  },
  visitNumberTextCancelled: {
    color: '#94a3b8',
  },
  visitStatusCancelled: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  visitStatusTextCancelled: {
    color: '#ef4444',
  },
  // Skeleton styles
  skeletonCalendarCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 4,
  },
  skeletonCalendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  skeletonWeekdays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  skeletonDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  skeletonDayCell: {
    width: '14.28%',
    alignItems: 'center',
    paddingVertical: 6,
  },
  skeletonFormCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 4,
  },
  skeletonFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skeletonLoggedSection: {
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  skeletonAppointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    gap: 12,
  },
  skeletonDateBox: {
    alignItems: 'center',
    padding: 8,
  },
  skeletonNurseSection: {
    paddingHorizontal: 4,
  },
  skeletonNurseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  skeletonVisitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    gap: 12,
  },
});
