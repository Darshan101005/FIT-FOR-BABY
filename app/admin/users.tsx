import { coupleService } from '@/services/firestore.service';
import { Couple as FirestoreCouple } from '@/types/firebase.types';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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

// Extended Couple type for UI
interface Couple extends FirestoreCouple {
  id: string;
}

// Mock appointments data for users (will be replaced with real data later)
interface UserAppointment {
  id: string;
  date: string;
  time: string;
  doctor: string;
  purpose: string;
  type: 'checkup' | 'consultation' | 'follow-up' | 'counseling';
}

const mockUserAppointments: Record<string, UserAppointment | null> = {};

const getAppointmentTypeColor = (type: string) => {
  switch (type) {
    case 'checkup': return COLORS.success;
    case 'consultation': return COLORS.info;
    case 'follow-up': return COLORS.warning;
    case 'counseling': return COLORS.accent;
    default: return COLORS.textMuted;
  }
};

export default function AdminUsersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const toastAnim = useRef(new Animated.Value(-100)).current;

  // State
  const [couples, setCouples] = useState<Couple[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const [expandedCouples, setExpandedCouples] = useState<string[]>([]);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollStep, setEnrollStep] = useState<1 | 2>(1);
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const [nextCoupleId, setNextCoupleId] = useState('C_001');
  const [showTempPasswordModal, setShowTempPasswordModal] = useState(false);
  const [tempPasswordInfo, setTempPasswordInfo] = useState({ 
    coupleId: '', 
    maleName: '',
    maleTempPassword: '', 
    femaleName: '',
    femaleTempPassword: '' 
  });
  const [currentAdminUid, setCurrentAdminUid] = useState('');

  // Enrollment form state
  const [enrollForm, setEnrollForm] = useState({
    coupleId: 'C_001',
    enrollmentDate: new Date().toISOString().split('T')[0],
    maleName: '',
    maleEmail: '',
    malePhone: '',
    maleAge: '',
    femaleName: '',
    femaleEmail: '',
    femalePhone: '',
    femaleAge: '',
  });

  // Load couples from Firestore
  useEffect(() => {
    let isMounted = true;
    
    const loadInitialData = async () => {
      try {
        // Get current admin UID
        const adminUid = await AsyncStorage.getItem('adminUid');
        if (adminUid && isMounted) setCurrentAdminUid(adminUid);
        
        // Get next couple ID
        const nextId = await coupleService.getNextCoupleId();
        if (isMounted) {
          setNextCoupleId(nextId);
          setEnrollForm(prev => ({ ...prev, coupleId: nextId }));
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
        // Don't show error toast for initial data load - not critical
      }
    };
    
    loadInitialData();
    
    // Subscribe to real-time updates
    const unsubscribe = coupleService.subscribe(
      (coupleList) => {
        if (isMounted) {
          setCouples(coupleList as Couple[]);
          setLoading(false);
        }
      },
      (error) => {
        // Only log error, don't show toast - empty collection is not an error
        console.error('Subscription error:', error);
        if (isMounted) {
          // Still set loading to false and show empty state
          setCouples([]);
          setLoading(false);
          
          // Only show error if it's a permission/auth error (not empty collection)
          const errorMessage = error?.message?.toLowerCase() || '';
          if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
            showToast('Permission denied. Please check your access.', 'error');
          }
          // For network errors, users can try refreshing
          // For empty collection, just show empty state - no error needed
        }
      }
    );
    
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Check for action param to open enrollment modal
  useEffect(() => {
    if (params.action === 'enroll') {
      setShowEnrollModal(true);
    }
  }, [params.action]);

  const showToast = (message: string, type: 'error' | 'success') => {
    setToast({ visible: true, message, type });
    Animated.spring(toastAnim, { toValue: 20, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(toastAnim, { toValue: -100, duration: 300, useNativeDriver: true })
        .start(() => setToast({ visible: false, message: '', type: '' }));
    }, 2500);
  };

  const toggleCoupleExpand = (coupleId: string) => {
    setExpandedCouples(prev =>
      prev.includes(coupleId)
        ? prev.filter(id => id !== coupleId)
        : [...prev, coupleId]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return COLORS.success;
      case 'inactive': return COLORS.warning;
      case 'pending': return COLORS.textMuted;
      default: return COLORS.textMuted;
    }
  };

  const filteredCouples = couples.filter(couple => {
    const matchesSearch = 
      couple.coupleId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      couple.male.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      couple.female.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (couple.male.phone || '').includes(searchQuery) ||
      (couple.female.phone || '').includes(searchQuery);
    
    const matchesStatus = filterStatus === 'all' || 
      couple.status === filterStatus ||
      couple.male.status === filterStatus || 
      couple.female.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Validate contact info - at least 1 mobile AND 1 email between the couple
  const validateContactInfo = (): boolean => {
    const hasMobile = (enrollForm.malePhone.trim() !== '' || enrollForm.femalePhone.trim() !== '');
    const hasEmail = (enrollForm.maleEmail.trim() !== '' || enrollForm.femaleEmail.trim() !== '');
    return hasMobile && hasEmail;
  };

  const handleEnrollSubmit = async () => {
    if (enrollStep === 1) {
      setEnrollStep(2);
    } else {
      // Validate required fields
      if (!enrollForm.maleName.trim() || !enrollForm.femaleName.trim()) {
        showToast('Please enter names for both male and female', 'error');
        return;
      }
      
      // Validate contact info - at least 1 mobile AND 1 email between the couple
      if (!validateContactInfo()) {
        showToast('Couple must have at least 1 mobile number AND 1 email between them', 'error');
        return;
      }
      
      setActionLoading(true);
      
      try {
        // Create couple in Firestore
        const result = await coupleService.create({
          coupleId: enrollForm.coupleId,
          enrollmentDate: enrollForm.enrollmentDate,
          enrolledBy: currentAdminUid,
          male: {
            name: enrollForm.maleName.trim(),
            email: enrollForm.maleEmail.trim() || undefined,
            phone: enrollForm.malePhone.trim() || undefined,
            age: enrollForm.maleAge ? parseInt(enrollForm.maleAge) : undefined,
          },
          female: {
            name: enrollForm.femaleName.trim(),
            email: enrollForm.femaleEmail.trim() || undefined,
            phone: enrollForm.femalePhone.trim() || undefined,
            age: enrollForm.femaleAge ? parseInt(enrollForm.femaleAge) : undefined,
          },
        });
        
        // Show temp password modal with individual passwords
        setTempPasswordInfo({
          coupleId: result.coupleId,
          maleName: enrollForm.maleName.trim(),
          maleTempPassword: result.maleTempPassword,
          femaleName: enrollForm.femaleName.trim(),
          femaleTempPassword: result.femaleTempPassword,
        });
        setShowEnrollModal(false);
        setShowTempPasswordModal(true);
        
        // Reset form
        setEnrollStep(1);
        const newNextId = await coupleService.getNextCoupleId();
        setNextCoupleId(newNextId);
        setEnrollForm({
          coupleId: newNextId,
          enrollmentDate: new Date().toISOString().split('T')[0],
          maleName: '',
          maleEmail: '',
          malePhone: '',
          maleAge: '',
          femaleName: '',
          femaleEmail: '',
          femalePhone: '',
          femaleAge: '',
        });
        
        showToast(`Couple ${result.coupleId} enrolled successfully!`, 'success');
      } catch (error: any) {
        console.error('Error enrolling couple:', error);
        showToast(error.message || 'Failed to enroll couple', 'error');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleUserAction = async (action: 'edit' | 'reset' | 'toggle', coupleId: string, gender: 'male' | 'female') => {
    try {
      const couple = couples.find(c => c.coupleId === coupleId);
      const userName = couple ? couple[gender].name : '';
      const userId = `${coupleId}_${gender.charAt(0).toUpperCase()}`;
      
      switch (action) {
        case 'edit':
          showToast(`Edit profile for ${userId}`, 'success');
          break;
        case 'reset':
          setActionLoading(true);
          const newPassword = await coupleService.forcePasswordReset(coupleId, gender);
          // Show single user password reset modal
          setTempPasswordInfo({ 
            coupleId: coupleId,
            maleName: gender === 'male' ? userName : '',
            maleTempPassword: gender === 'male' ? newPassword : '',
            femaleName: gender === 'female' ? userName : '',
            femaleTempPassword: gender === 'female' ? newPassword : '',
          });
          setShowTempPasswordModal(true);
          showToast(`Password reset for ${userId}`, 'success');
          setActionLoading(false);
          break;
        case 'toggle':
          setActionLoading(true);
          if (couple) {
            const currentStatus = couple[gender].status;
            const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
            await coupleService.updateUserStatus(coupleId, gender, newStatus);
            showToast(`${userId} is now ${newStatus}`, 'success');
          }
          setActionLoading(false);
          break;
      }
    } catch (error: any) {
      console.error('Error with user action:', error);
      showToast(error.message || 'Action failed', 'error');
      setActionLoading(false);
    }
  };

  // Header with search
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.headerTitle}>User Management</Text>
          <Text style={styles.headerSubtitle}>{couples.length} couples enrolled</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowEnrollModal(true)}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add New Couple</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Name, Couple ID, or Phone..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Status:</Text>
            {(['all', 'active', 'inactive', 'pending'] as const).map(status => (
              <TouchableOpacity
                key={status}
                style={[styles.filterChip, filterStatus === status && styles.filterChipActive]}
                onPress={() => setFilterStatus(status)}
              >
                <Text style={[styles.filterChipText, filterStatus === status && styles.filterChipTextActive]}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

        </ScrollView>
      </View>
    </View>
  );

  // Couple Row (Expandable)
  const renderCoupleRow = (couple: Couple) => {
    const isExpanded = expandedCouples.includes(couple.id);

    return (
      <View key={couple.id} style={styles.coupleContainer}>
        {/* Couple Header Row */}
        <TouchableOpacity
          style={styles.coupleRow}
          onPress={() => toggleCoupleExpand(couple.id)}
          activeOpacity={0.7}
        >
          <View style={styles.coupleAvatars}>
            <View style={[styles.avatar, { backgroundColor: COLORS.primary }]}>
              <Ionicons name="male" size={16} color="#fff" />
            </View>
            <View style={[styles.avatar, { backgroundColor: COLORS.accent, marginLeft: -12 }]}>
              <Ionicons name="female" size={16} color="#fff" />
            </View>
          </View>

          <View style={styles.coupleInfo}>
            <View style={styles.coupleIdRow}>
              <Text style={styles.coupleId}>{couple.coupleId}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(couple.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(couple.status) }]}>
                  {couple.status}
                </Text>
              </View>

            </View>
            <Text style={styles.coupleNames}>
              {couple.male.name} & {couple.female.name}
            </Text>
            <Text style={styles.enrollmentDate}>Enrolled: {couple.enrollmentDate}</Text>
          </View>

          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={COLORS.textMuted}
          />
        </TouchableOpacity>

        {/* Expanded User Details */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            {/* Male User */}
            <View style={styles.userCard}>
              <View style={styles.userCardHeader}>
                <View style={[styles.genderIcon, { backgroundColor: COLORS.primary + '15' }]}>
                  <Ionicons name="male" size={18} color={COLORS.primary} />
                </View>
                <View style={styles.userIdContainer}>
                  <Text style={styles.userId}>{couple.male.id}</Text>
                  <View style={[styles.miniStatusBadge, { backgroundColor: getStatusColor(couple.male.status) }]} />
                </View>
              </View>
              
              <View style={styles.userDetails}>
                <View style={styles.userDetailRow}>
                  <Ionicons name="person" size={14} color={COLORS.textMuted} />
                  <Text style={styles.userDetailText}>{couple.male.name}</Text>
                </View>
                <View style={styles.userDetailRow}>
                  <Ionicons name="calendar" size={14} color={COLORS.textMuted} />
                  <Text style={styles.userDetailText}>Age: {couple.male.age} years</Text>
                </View>
                <View style={styles.userDetailRow}>
                  <Ionicons name="call" size={14} color={COLORS.textMuted} />
                  <Text style={styles.userDetailText}>{couple.male.phone}</Text>
                </View>
                {couple.male.email && (
                  <View style={styles.userDetailRow}>
                    <Ionicons name="mail" size={14} color={COLORS.textMuted} />
                    <Text style={styles.userDetailText}>{couple.male.email}</Text>
                  </View>
                )}
                <View style={styles.healthMetricsRow}>
                  <View style={styles.healthMetric}>
                    <Ionicons name="fitness" size={14} color={COLORS.primary} />
                    <Text style={styles.healthMetricLabel}>Weight</Text>
                    <Text style={styles.healthMetricValue}>{couple.male.weight} kg</Text>
                  </View>
                  <View style={styles.healthMetric}>
                    <Ionicons name="resize-outline" size={14} color={COLORS.accent} />
                    <Text style={styles.healthMetricLabel}>Height</Text>
                    <Text style={styles.healthMetricValue}>{couple.male.height} cm</Text>
                  </View>
                  <View style={styles.healthMetric}>
                    <Ionicons name="body" size={14} color={COLORS.info} />
                    <Text style={styles.healthMetricLabel}>BMI</Text>
                    <Text style={styles.healthMetricValue}>{couple.male.bmi}</Text>
                  </View>
                </View>
                <View style={styles.userDetailRow}>
                  <Ionicons name="time" size={14} color={COLORS.textMuted} />
                  <Text style={styles.userDetailText}>Last Login: {couple.male.lastActive}</Text>
                </View>
                
                {/* Setup Status & Temp Password */}
                <View style={styles.setupStatusRow}>
                  <View style={[styles.setupBadge, { backgroundColor: couple.male.isPasswordReset ? COLORS.success + '20' : COLORS.warning + '20' }]}>
                    <Ionicons name={couple.male.isPasswordReset ? 'checkmark-circle' : 'alert-circle'} size={12} color={couple.male.isPasswordReset ? COLORS.success : COLORS.warning} />
                    <Text style={[styles.setupBadgeText, { color: couple.male.isPasswordReset ? COLORS.success : COLORS.warning }]}>
                      {couple.male.isPasswordReset ? 'Password Set' : 'Needs Reset'}
                    </Text>
                  </View>
                  <View style={[styles.setupBadge, { backgroundColor: couple.male.isPinSet ? COLORS.success + '20' : COLORS.warning + '20' }]}>
                    <Ionicons name={couple.male.isPinSet ? 'checkmark-circle' : 'alert-circle'} size={12} color={couple.male.isPinSet ? COLORS.success : COLORS.warning} />
                    <Text style={[styles.setupBadgeText, { color: couple.male.isPinSet ? COLORS.success : COLORS.warning }]}>
                      {couple.male.isPinSet ? 'PIN Set' : 'Needs PIN'}
                    </Text>
                  </View>
                </View>
                
                {/* Show temp password if not yet reset */}
                {!couple.male.isPasswordReset && couple.male.tempPassword && (
                  <View style={styles.tempPasswordRow}>
                    <Ionicons name="key" size={14} color={COLORS.warning} />
                    <Text style={styles.tempPasswordLabel}>Temp Password:</Text>
                    <Text style={styles.tempPasswordValue}>{couple.male.tempPassword}</Text>
                  </View>
                )}
              </View>

              <View style={styles.userActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleUserAction('edit', couple.coupleId, 'male')}
                >
                  <Ionicons name="create-outline" size={16} color={COLORS.primary} />
                  <Text style={[styles.actionButtonText, { color: COLORS.primary }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleUserAction('reset', couple.coupleId, 'male')}
                >
                  <Ionicons name="key-outline" size={16} color={COLORS.warning} />
                  <Text style={[styles.actionButtonText, { color: COLORS.warning }]}>Reset Password</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleUserAction('toggle', couple.coupleId, 'male')}
                >
                  <Ionicons name={couple.male.status === 'active' ? 'pause-circle-outline' : 'play-circle-outline'} size={16} color={couple.male.status === 'active' ? COLORS.error : COLORS.success} />
                  <Text style={[styles.actionButtonText, { color: couple.male.status === 'active' ? COLORS.error : COLORS.success }]}>
                    {couple.male.status === 'active' ? 'Pause' : 'Activate'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Female User */}
            <View style={styles.userCard}>
              <View style={styles.userCardHeader}>
                <View style={[styles.genderIcon, { backgroundColor: COLORS.accent + '20' }]}>
                  <Ionicons name="female" size={18} color={COLORS.accentDark} />
                </View>
                <View style={styles.userIdContainer}>
                  <Text style={styles.userId}>{couple.female.id}</Text>
                  <View style={[styles.miniStatusBadge, { backgroundColor: getStatusColor(couple.female.status) }]} />
                </View>
              </View>
              
              <View style={styles.userDetails}>
                <View style={styles.userDetailRow}>
                  <Ionicons name="person" size={14} color={COLORS.textMuted} />
                  <Text style={styles.userDetailText}>{couple.female.name}</Text>
                </View>
                <View style={styles.userDetailRow}>
                  <Ionicons name="calendar" size={14} color={COLORS.textMuted} />
                  <Text style={styles.userDetailText}>Age: {couple.female.age} years</Text>
                </View>
                <View style={styles.userDetailRow}>
                  <Ionicons name="call" size={14} color={COLORS.textMuted} />
                  <Text style={styles.userDetailText}>{couple.female.phone}</Text>
                </View>
                {couple.female.email && (
                  <View style={styles.userDetailRow}>
                    <Ionicons name="mail" size={14} color={COLORS.textMuted} />
                    <Text style={styles.userDetailText}>{couple.female.email}</Text>
                  </View>
                )}
                <View style={styles.healthMetricsRow}>
                  <View style={styles.healthMetric}>
                    <Ionicons name="fitness" size={14} color={COLORS.primary} />
                    <Text style={styles.healthMetricLabel}>Weight</Text>
                    <Text style={styles.healthMetricValue}>{couple.female.weight} kg</Text>
                  </View>
                  <View style={styles.healthMetric}>
                    <Ionicons name="resize-outline" size={14} color={COLORS.accent} />
                    <Text style={styles.healthMetricLabel}>Height</Text>
                    <Text style={styles.healthMetricValue}>{couple.female.height} cm</Text>
                  </View>
                  <View style={styles.healthMetric}>
                    <Ionicons name="body" size={14} color={COLORS.info} />
                    <Text style={styles.healthMetricLabel}>BMI</Text>
                    <Text style={styles.healthMetricValue}>{couple.female.bmi}</Text>
                  </View>
                </View>
                <View style={styles.userDetailRow}>
                  <Ionicons name="time" size={14} color={COLORS.textMuted} />
                  <Text style={styles.userDetailText}>Last Login: {couple.female.lastActive}</Text>
                </View>
                
                {/* Setup Status & Temp Password */}
                <View style={styles.setupStatusRow}>
                  <View style={[styles.setupBadge, { backgroundColor: couple.female.isPasswordReset ? COLORS.success + '20' : COLORS.warning + '20' }]}>
                    <Ionicons name={couple.female.isPasswordReset ? 'checkmark-circle' : 'alert-circle'} size={12} color={couple.female.isPasswordReset ? COLORS.success : COLORS.warning} />
                    <Text style={[styles.setupBadgeText, { color: couple.female.isPasswordReset ? COLORS.success : COLORS.warning }]}>
                      {couple.female.isPasswordReset ? 'Password Set' : 'Needs Reset'}
                    </Text>
                  </View>
                  <View style={[styles.setupBadge, { backgroundColor: couple.female.isPinSet ? COLORS.success + '20' : COLORS.warning + '20' }]}>
                    <Ionicons name={couple.female.isPinSet ? 'checkmark-circle' : 'alert-circle'} size={12} color={couple.female.isPinSet ? COLORS.success : COLORS.warning} />
                    <Text style={[styles.setupBadgeText, { color: couple.female.isPinSet ? COLORS.success : COLORS.warning }]}>
                      {couple.female.isPinSet ? 'PIN Set' : 'Needs PIN'}
                    </Text>
                  </View>
                </View>
                
                {/* Show temp password if not yet reset */}
                {!couple.female.isPasswordReset && couple.female.tempPassword && (
                  <View style={styles.tempPasswordRow}>
                    <Ionicons name="key" size={14} color={COLORS.warning} />
                    <Text style={styles.tempPasswordLabel}>Temp Password:</Text>
                    <Text style={styles.tempPasswordValue}>{couple.female.tempPassword}</Text>
                  </View>
                )}
              </View>

              <View style={styles.userActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleUserAction('edit', couple.coupleId, 'female')}
                >
                  <Ionicons name="create-outline" size={16} color={COLORS.primary} />
                  <Text style={[styles.actionButtonText, { color: COLORS.primary }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleUserAction('reset', couple.coupleId, 'female')}
                >
                  <Ionicons name="key-outline" size={16} color={COLORS.warning} />
                  <Text style={[styles.actionButtonText, { color: COLORS.warning }]}>Reset Password</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleUserAction('toggle', couple.coupleId, 'female')}
                >
                  <Ionicons name={couple.female.status === 'active' ? 'pause-circle-outline' : 'play-circle-outline'} size={16} color={couple.female.status === 'active' ? COLORS.error : COLORS.success} />
                  <Text style={[styles.actionButtonText, { color: couple.female.status === 'active' ? COLORS.error : COLORS.success }]}>
                    {couple.female.status === 'active' ? 'Pause' : 'Activate'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Upcoming Appointment Section */}
            {(() => {
              const appointment = mockUserAppointments[couple.coupleId];
              return (
                <View style={styles.appointmentCard}>
                  <View style={styles.appointmentHeader}>
                    <Ionicons name="calendar" size={18} color={COLORS.primary} />
                    <Text style={styles.appointmentTitle}>Upcoming Appointment</Text>
                  </View>
                  {appointment ? (
                    <View style={styles.appointmentContent}>
                      <View style={styles.appointmentRow}>
                        <View style={styles.appointmentInfo}>
                          <View style={styles.appointmentDateBadge}>
                            <Ionicons name="time-outline" size={14} color={COLORS.primary} />
                            <Text style={styles.appointmentDateText}>{appointment.date} at {appointment.time}</Text>
                          </View>
                          <View style={[styles.appointmentTypeBadge, { backgroundColor: getAppointmentTypeColor(appointment.type) + '15' }]}>
                            <Text style={[styles.appointmentTypeText, { color: getAppointmentTypeColor(appointment.type) }]}>
                              {appointment.type.charAt(0).toUpperCase() + appointment.type.slice(1)}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.appointmentDetailRow}>
                        <Ionicons name="medkit" size={14} color={COLORS.accent} />
                        <Text style={styles.appointmentDetailLabel}>Doctor:</Text>
                        <Text style={styles.appointmentDetailValue}>{appointment.doctor}</Text>
                      </View>
                      <View style={styles.appointmentDetailRow}>
                        <Ionicons name="document-text" size={14} color={COLORS.info} />
                        <Text style={styles.appointmentDetailLabel}>Purpose:</Text>
                        <Text style={styles.appointmentDetailValue}>{appointment.purpose}</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.noAppointmentContent}>
                      <Ionicons name="calendar-outline" size={24} color={COLORS.textMuted} />
                      <Text style={styles.noAppointmentText}>No upcoming appointments</Text>
                    </View>
                  )}
                </View>
              );
            })()}
          </View>
        )}
      </View>
    );
  };

  // Enrollment Modal
  const renderEnrollmentModal = () => (
    <Modal
      visible={showEnrollModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowEnrollModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, isMobile && styles.modalContentMobile]}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Enroll New Couple</Text>
              <Text style={styles.modalSubtitle}>Step {enrollStep} of 2</Text>
            </View>
            <TouchableOpacity onPress={() => setShowEnrollModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressStep, styles.progressStepActive]}>
              <Text style={styles.progressStepText}>1</Text>
            </View>
            <View style={[styles.progressLine, enrollStep === 2 && styles.progressLineActive]} />
            <View style={[styles.progressStep, enrollStep === 2 && styles.progressStepActive]}>
              <Text style={[styles.progressStepText, enrollStep !== 2 && styles.progressStepTextInactive]}>2</Text>
            </View>
          </View>

          <ScrollView style={styles.modalBody}>
            {enrollStep === 1 ? (
              // Step 1: Couple Profile
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Couple Profile</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Couple ID</Text>
                  <View style={styles.readOnlyInput}>
                    <Text style={styles.readOnlyText}>{enrollForm.coupleId}</Text>
                    <Text style={styles.autoGenLabel}>Auto-generated</Text>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Enrollment Date</Text>
                  <TextInput
                    style={styles.input}
                    value={enrollForm.enrollmentDate}
                    onChangeText={(text) => setEnrollForm({ ...enrollForm, enrollmentDate: text })}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
              </View>
            ) : (
              // Step 2: Individual Accounts
              <View style={styles.formSection}>
                {/* Male Account */}
                <View style={styles.accountSection}>
                  <View style={styles.accountHeader}>
                    <View style={[styles.genderIcon, { backgroundColor: COLORS.primary + '15' }]}>
                      <Ionicons name="male" size={18} color={COLORS.primary} />
                    </View>
                    <View>
                      <Text style={styles.accountTitle}>Male Account</Text>
                      <Text style={styles.accountId}>{enrollForm.coupleId}_M</Text>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Full Name *</Text>
                    <TextInput
                      style={styles.input}
                      value={enrollForm.maleName}
                      onChangeText={(text) => setEnrollForm({ ...enrollForm, maleName: text })}
                      placeholder="Enter full name"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Age *</Text>
                    <TextInput
                      style={styles.input}
                      value={enrollForm.maleAge}
                      onChangeText={(text) => setEnrollForm({ ...enrollForm, maleAge: text })}
                      placeholder="Enter age"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Phone Number *</Text>
                    <TextInput
                      style={styles.input}
                      value={enrollForm.malePhone}
                      onChangeText={(text) => setEnrollForm({ ...enrollForm, malePhone: text })}
                      placeholder="Enter phone number"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={styles.input}
                      value={enrollForm.maleEmail}
                      onChangeText={(text) => setEnrollForm({ ...enrollForm, maleEmail: text })}
                      placeholder="Enter email address"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="email-address"
                    />
                  </View>

                  <View style={styles.passwordNote}>
                    <Ionicons name="information-circle" size={16} color={COLORS.info} />
                    <Text style={styles.passwordNoteText}>Temporary password will be auto-generated with Force Reset enabled</Text>
                  </View>
                </View>

                {/* Female Account */}
                <View style={styles.accountSection}>
                  <View style={styles.accountHeader}>
                    <View style={[styles.genderIcon, { backgroundColor: COLORS.accent + '20' }]}>
                      <Ionicons name="female" size={18} color={COLORS.accentDark} />
                    </View>
                    <View>
                      <Text style={styles.accountTitle}>Female Account</Text>
                      <Text style={styles.accountId}>{enrollForm.coupleId}_F</Text>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Full Name *</Text>
                    <TextInput
                      style={styles.input}
                      value={enrollForm.femaleName}
                      onChangeText={(text) => setEnrollForm({ ...enrollForm, femaleName: text })}
                      placeholder="Enter full name"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Age *</Text>
                    <TextInput
                      style={styles.input}
                      value={enrollForm.femaleAge}
                      onChangeText={(text) => setEnrollForm({ ...enrollForm, femaleAge: text })}
                      placeholder="Enter age"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Phone Number *</Text>
                    <TextInput
                      style={styles.input}
                      value={enrollForm.femalePhone}
                      onChangeText={(text) => setEnrollForm({ ...enrollForm, femalePhone: text })}
                      placeholder="Enter phone number"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={styles.input}
                      value={enrollForm.femaleEmail}
                      onChangeText={(text) => setEnrollForm({ ...enrollForm, femaleEmail: text })}
                      placeholder="Enter email address"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="email-address"
                    />
                  </View>

                  <View style={styles.passwordNote}>
                    <Ionicons name="information-circle" size={16} color={COLORS.info} />
                    <Text style={styles.passwordNoteText}>Temporary password will be auto-generated with Force Reset enabled</Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            {enrollStep === 2 && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setEnrollStep(1)}
              >
                <Ionicons name="arrow-back" size={18} color={COLORS.textSecondary} />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleEnrollSubmit}
            >
              <Text style={styles.submitButtonText}>
                {enrollStep === 1 ? 'Continue' : 'Enroll Couple'}
              </Text>
              <Ionicons name={enrollStep === 1 ? 'arrow-forward' : 'checkmark'} size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Toast Component
  const renderToast = () => (
    <Animated.View
      style={[
        styles.toast,
        { transform: [{ translateY: toastAnim }] },
        toast.type === 'error' ? styles.toastError : styles.toastSuccess,
      ]}
    >
      <Ionicons
        name={toast.type === 'error' ? 'alert-circle' : 'checkmark-circle'}
        size={20}
        color="#fff"
      />
      <Text style={styles.toastText}>{toast.message}</Text>
    </Animated.View>
  );

  // Temp Password Modal
  const renderTempPasswordModal = () => (
    <Modal
      visible={showTempPasswordModal}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowTempPasswordModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.tempPasswordModal, isMobile && styles.modalContentMobile]}>
          <View style={styles.tempPasswordHeader}>
            <View style={[styles.tempPasswordIcon, { backgroundColor: COLORS.success + '15' }]}>
              <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
            </View>
            <Text style={styles.tempPasswordTitle}>Enrollment Successful!</Text>
            <Text style={styles.tempPasswordSubtitle}>
              Share these credentials with each user individually
            </Text>
          </View>

          <View style={styles.credentialBox}>
            <Text style={styles.credentialLabel}>Couple ID</Text>
            <View style={styles.credentialValue}>
              <Text style={styles.credentialText}>{tempPasswordInfo.coupleId}</Text>
            </View>
          </View>

          {/* Male User Credentials */}
          <View style={[styles.credentialBox, { borderLeftColor: COLORS.primary, borderLeftWidth: 3 }]}>
            <View style={styles.credentialUserHeader}>
              <Ionicons name="male" size={16} color={COLORS.primary} />
              <Text style={[styles.credentialLabel, { color: COLORS.primary }]}>{tempPasswordInfo.maleName} ({tempPasswordInfo.coupleId}_M)</Text>
            </View>
            <View style={styles.credentialValue}>
              <Text style={[styles.credentialText, styles.passwordText]}>{tempPasswordInfo.maleTempPassword}</Text>
            </View>
          </View>

          {/* Female User Credentials */}
          <View style={[styles.credentialBox, { borderLeftColor: COLORS.accent, borderLeftWidth: 3 }]}>
            <View style={styles.credentialUserHeader}>
              <Ionicons name="female" size={16} color={COLORS.accentDark} />
              <Text style={[styles.credentialLabel, { color: COLORS.accentDark }]}>{tempPasswordInfo.femaleName} ({tempPasswordInfo.coupleId}_F)</Text>
            </View>
            <View style={styles.credentialValue}>
              <Text style={[styles.credentialText, styles.passwordText]}>{tempPasswordInfo.femaleTempPassword}</Text>
            </View>
          </View>

          <View style={styles.tempPasswordNote}>
            <Ionicons name="information-circle" size={16} color={COLORS.info} />
            <Text style={styles.tempPasswordNoteText}>
              Each user must login with their own ID/Phone/Email and reset their password individually.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.tempPasswordButton}
            onPress={() => setShowTempPasswordModal(false)}
          >
            <Text style={styles.tempPasswordButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading couples...</Text>
      </View>
    );
  }

  // Empty state with helpful message
  const renderEmptyState = () => {
    const isFiltered = searchQuery || filterStatus !== 'all';
    const hasNoCouples = couples.length === 0;
    
    return (
      <View style={styles.emptyState}>
        <View style={[styles.emptyIconCircle, { backgroundColor: COLORS.primary + '10' }]}>
          <Ionicons 
            name={hasNoCouples ? "people-outline" : "search-outline"} 
            size={48} 
            color={COLORS.primary} 
          />
        </View>
        <Text style={styles.emptyTitle}>
          {hasNoCouples ? 'No couples enrolled yet' : 'No couples found'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {hasNoCouples 
            ? 'Get started by enrolling your first couple using the button above' 
            : 'Try adjusting your search or filters'}
        </Text>
        {hasNoCouples && (
          <TouchableOpacity
            style={styles.emptyActionButton}
            onPress={() => setShowEnrollModal(true)}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.emptyActionText}>Enroll First Couple</Text>
          </TouchableOpacity>
        )}
        {isFiltered && !hasNoCouples && (
          <TouchableOpacity
            style={[styles.emptyActionButton, { backgroundColor: COLORS.textSecondary }]}
            onPress={() => {
              setSearchQuery('');
              setFilterStatus('all');
            }}
          >
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.emptyActionText}>Clear Filters</Text>
          </TouchableOpacity>
        )}
      </View>
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
          {filteredCouples.length === 0 ? (
            renderEmptyState()
          ) : (
            filteredCouples.map(renderCoupleRow)
          )}
        </View>
      </ScrollView>

      {renderEnrollmentModal()}
      {renderTempPasswordModal()}
      {toast.visible && renderToast()}
      
      {/* Loading overlay for actions */}
      {actionLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
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
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },

  // Header Styles
  header: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.borderLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  filtersContainer: {
    marginTop: 4,
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginRight: 4,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.borderLight,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.border,
    marginHorizontal: 12,
  },

  // Couple Row Styles
  coupleContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  coupleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  coupleAvatars: {
    flexDirection: 'row',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  coupleInfo: {
    flex: 1,
  },
  coupleIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  coupleId: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  groupBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  groupText: {
    fontSize: 10,
    fontWeight: '600',
  },
  coupleNames: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  enrollmentDate: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // Expanded Content Styles
  expandedContent: {
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  userCard: {
    backgroundColor: COLORS.borderLight,
    borderRadius: 12,
    padding: 14,
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  genderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userId: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  miniStatusBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  userDetails: {
    gap: 8,
    marginBottom: 14,
  },
  userDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userDetailText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  healthMetricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  healthMetric: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  healthMetricLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  healthMetricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  setupStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  setupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  setupBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tempPasswordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '10',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.warning + '30',
  },
  tempPasswordLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.warning,
  },
  tempPasswordValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  userActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Appointment Card Styles
  appointmentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  appointmentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  appointmentContent: {
    gap: 10,
  },
  appointmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appointmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  appointmentDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  appointmentDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  appointmentTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  appointmentTypeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  appointmentDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  appointmentDetailLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  appointmentDetailValue: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  noAppointmentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  noAppointmentText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
  },
  modalContentMobile: {
    maxHeight: '95%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  progressStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressStepActive: {
    backgroundColor: COLORS.primary,
  },
  progressStepText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  progressStepTextInactive: {
    color: COLORS.textMuted,
  },
  progressLine: {
    width: 60,
    height: 3,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: COLORS.primary,
  },
  modalBody: {
    padding: 20,
  },
  formSection: {
    gap: 16,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  inputGroup: {
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.borderLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  readOnlyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.borderLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readOnlyText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  autoGenLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  radioOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    backgroundColor: COLORS.borderLight,
    gap: 10,
  },
  radioOptionActive: {
    backgroundColor: COLORS.primary + '15',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: COLORS.textMuted,
  },
  radioCircleActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  radioText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  radioTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  accountSection: {
    backgroundColor: COLORS.borderLight,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  accountTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  accountId: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  passwordNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.info + '10',
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 8,
  },
  passwordNoteText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.info,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.borderLight,
    gap: 6,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 20,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 24,
  },
  emptyActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Toast
  toast: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  toastSuccess: {
    backgroundColor: COLORS.success,
  },
  toastError: {
    backgroundColor: COLORS.error,
  },
  toastText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },

  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },

  // Temp Password Modal
  tempPasswordModal: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  tempPasswordHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  tempPasswordIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  tempPasswordTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  tempPasswordSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  credentialBox: {
    width: '100%',
    marginBottom: 16,
  },
  credentialLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  credentialUserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  credentialValue: {
    backgroundColor: COLORS.borderLight,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  credentialText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  passwordText: {
    fontFamily: 'monospace',
  },
  tempPasswordNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.info + '10',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 24,
    width: '100%',
  },
  tempPasswordNoteText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.info,
    lineHeight: 18,
  },
  tempPasswordButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  tempPasswordButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
