import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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

interface CoupleUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'pending';
  lastActive: string;
  forceReset: boolean;
}

interface Couple {
  id: string;
  coupleId: string;
  enrollmentDate: string;
  status: 'active' | 'inactive';
  male: CoupleUser;
  female: CoupleUser;
}

// Mock couples data
const mockCouples: Couple[] = [
  {
    id: '1',
    coupleId: 'C_001',
    enrollmentDate: '2024-10-01',
    status: 'active',
    male: { id: 'C_001_M', name: 'John Doe', email: 'john@example.com', phone: '+91 98765 43210', status: 'active', lastActive: '2024-11-25', forceReset: false },
    female: { id: 'C_001_F', name: 'Sarah Doe', email: 'sarah@example.com', phone: '+91 98765 43211', status: 'active', lastActive: '2024-11-25', forceReset: false },
  },
  {
    id: '2',
    coupleId: 'C_002',
    enrollmentDate: '2024-10-15',
    status: 'active',
    male: { id: 'C_002_M', name: 'Raj Kumar', email: 'raj@example.com', phone: '+91 98765 43212', status: 'active', lastActive: '2024-11-24', forceReset: false },
    female: { id: 'C_002_F', name: 'Priya Kumar', email: 'priya@example.com', phone: '+91 98765 43213', status: 'inactive', lastActive: '2024-11-10', forceReset: false },
  },
  {
    id: '3',
    coupleId: 'C_003',
    enrollmentDate: '2024-11-01',
    status: 'active',
    male: { id: 'C_003_M', name: 'Anand M', email: 'anand@example.com', phone: '+91 98765 43214', status: 'pending', lastActive: '2024-11-20', forceReset: true },
    female: { id: 'C_003_F', name: 'Meena S', email: 'meena@example.com', phone: '+91 98765 43215', status: 'pending', lastActive: '2024-11-22', forceReset: true },
  },
  {
    id: '4',
    coupleId: 'C_004',
    enrollmentDate: '2024-11-10',
    status: 'active',
    male: { id: 'C_004_M', name: 'Vikram S', email: 'vikram@example.com', phone: '+91 98765 43216', status: 'active', lastActive: '2024-11-26', forceReset: false },
    female: { id: 'C_004_F', name: 'Lakshmi V', email: 'lakshmi@example.com', phone: '+91 98765 43217', status: 'active', lastActive: '2024-11-26', forceReset: false },
  },
  {
    id: '5',
    coupleId: 'C_005',
    enrollmentDate: '2024-11-15',
    status: 'inactive',
    male: { id: 'C_005_M', name: 'Suresh R', email: 'suresh@example.com', phone: '+91 98765 43218', status: 'inactive', lastActive: '2024-11-05', forceReset: false },
    female: { id: 'C_005_F', name: 'Geetha R', email: 'geetha@example.com', phone: '+91 98765 43219', status: 'inactive', lastActive: '2024-11-05', forceReset: false },
  },
];

// Generate next couple ID
const generateNextCoupleId = () => {
  const maxId = mockCouples.reduce((max, couple) => {
    const num = parseInt(couple.coupleId.split('_')[1]);
    return num > max ? num : max;
  }, 0);
  return `C_${String(maxId + 1).padStart(3, '0')}`;
};

export default function AdminUsersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const toastAnim = useRef(new Animated.Value(-100)).current;

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const [expandedCouples, setExpandedCouples] = useState<string[]>([]);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollStep, setEnrollStep] = useState<1 | 2>(1);
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });

  // Enrollment form state
  const [enrollForm, setEnrollForm] = useState({
    coupleId: generateNextCoupleId(),
    enrollmentDate: new Date().toISOString().split('T')[0],
    maleName: '',
    maleEmail: '',
    malePhone: '',
    femaleName: '',
    femaleEmail: '',
    femalePhone: '',
  });

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

  const filteredCouples = mockCouples.filter(couple => {
    const matchesSearch = 
      couple.coupleId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      couple.male.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      couple.female.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      couple.male.phone.includes(searchQuery);
    
    const matchesStatus = filterStatus === 'all' || 
      couple.male.status === filterStatus || 
      couple.female.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleEnrollSubmit = () => {
    if (enrollStep === 1) {
      setEnrollStep(2);
    } else {
      // Validate and submit
      if (!enrollForm.maleName || !enrollForm.maleEmail || !enrollForm.femaleName || !enrollForm.femaleEmail) {
        showToast('Please fill all required fields', 'error');
        return;
      }
      // Submit enrollment
      showToast(`Couple ${enrollForm.coupleId} enrolled successfully!`, 'success');
      setShowEnrollModal(false);
      setEnrollStep(1);
      setEnrollForm({
        ...enrollForm,
        coupleId: generateNextCoupleId(),
        maleName: '',
        maleEmail: '',
        malePhone: '',
        femaleName: '',
        femaleEmail: '',
        femalePhone: '',
      });
    }
  };

  const handleUserAction = (action: 'edit' | 'reset' | 'toggle', userId: string) => {
    switch (action) {
      case 'edit':
        showToast(`Edit profile for ${userId}`, 'success');
        break;
      case 'reset':
        showToast(`Password reset email sent to ${userId}`, 'success');
        break;
      case 'toggle':
        showToast(`Status toggled for ${userId}`, 'success');
        break;
    }
  };

  // Header with search
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.headerTitle}>User Management</Text>
          <Text style={styles.headerSubtitle}>{mockCouples.length} couples enrolled</Text>
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
                  <Ionicons name="mail" size={14} color={COLORS.textMuted} />
                  <Text style={styles.userDetailText}>{couple.male.email}</Text>
                </View>
                <View style={styles.userDetailRow}>
                  <Ionicons name="call" size={14} color={COLORS.textMuted} />
                  <Text style={styles.userDetailText}>{couple.male.phone}</Text>
                </View>
                <View style={styles.userDetailRow}>
                  <Ionicons name="time" size={14} color={COLORS.textMuted} />
                  <Text style={styles.userDetailText}>Last active: {couple.male.lastActive}</Text>
                </View>
              </View>

              <View style={styles.userActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleUserAction('edit', couple.male.id)}
                >
                  <Ionicons name="create-outline" size={16} color={COLORS.primary} />
                  <Text style={[styles.actionButtonText, { color: COLORS.primary }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleUserAction('reset', couple.male.id)}
                >
                  <Ionicons name="key-outline" size={16} color={COLORS.warning} />
                  <Text style={[styles.actionButtonText, { color: COLORS.warning }]}>Reset Password</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleUserAction('toggle', couple.male.id)}
                >
                  <Ionicons name={couple.male.status === 'active' ? 'pause-circle-outline' : 'play-circle-outline'} size={16} color={couple.male.status === 'active' ? COLORS.error : COLORS.success} />
                  <Text style={[styles.actionButtonText, { color: couple.male.status === 'active' ? COLORS.error : COLORS.success }]}>
                    {couple.male.status === 'active' ? 'Deactivate' : 'Activate'}
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
                  <Ionicons name="mail" size={14} color={COLORS.textMuted} />
                  <Text style={styles.userDetailText}>{couple.female.email}</Text>
                </View>
                <View style={styles.userDetailRow}>
                  <Ionicons name="call" size={14} color={COLORS.textMuted} />
                  <Text style={styles.userDetailText}>{couple.female.phone}</Text>
                </View>
                <View style={styles.userDetailRow}>
                  <Ionicons name="time" size={14} color={COLORS.textMuted} />
                  <Text style={styles.userDetailText}>Last active: {couple.female.lastActive}</Text>
                </View>
              </View>

              <View style={styles.userActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleUserAction('edit', couple.female.id)}
                >
                  <Ionicons name="create-outline" size={16} color={COLORS.primary} />
                  <Text style={[styles.actionButtonText, { color: COLORS.primary }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleUserAction('reset', couple.female.id)}
                >
                  <Ionicons name="key-outline" size={16} color={COLORS.warning} />
                  <Text style={[styles.actionButtonText, { color: COLORS.warning }]}>Reset Password</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleUserAction('toggle', couple.female.id)}
                >
                  <Ionicons name={couple.female.status === 'active' ? 'pause-circle-outline' : 'play-circle-outline'} size={16} color={couple.female.status === 'active' ? COLORS.error : COLORS.success} />
                  <Text style={[styles.actionButtonText, { color: couple.female.status === 'active' ? COLORS.error : COLORS.success }]}>
                    {couple.female.status === 'active' ? 'Deactivate' : 'Activate'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
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
                    <Text style={styles.inputLabel}>Email *</Text>
                    <TextInput
                      style={styles.input}
                      value={enrollForm.maleEmail}
                      onChangeText={(text) => setEnrollForm({ ...enrollForm, maleEmail: text })}
                      placeholder="Enter email address"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="email-address"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Phone Number</Text>
                    <TextInput
                      style={styles.input}
                      value={enrollForm.malePhone}
                      onChangeText={(text) => setEnrollForm({ ...enrollForm, malePhone: text })}
                      placeholder="Enter phone number"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="phone-pad"
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
                    <Text style={styles.inputLabel}>Email *</Text>
                    <TextInput
                      style={styles.input}
                      value={enrollForm.femaleEmail}
                      onChangeText={(text) => setEnrollForm({ ...enrollForm, femaleEmail: text })}
                      placeholder="Enter email address"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="email-address"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Phone Number</Text>
                    <TextInput
                      style={styles.input}
                      value={enrollForm.femalePhone}
                      onChangeText={(text) => setEnrollForm({ ...enrollForm, femalePhone: text })}
                      placeholder="Enter phone number"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="phone-pad"
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

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      <ScrollView
        contentContainerStyle={[styles.scrollContent, !isMobile && styles.scrollContentDesktop]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.content, !isMobile && styles.contentDesktop]}>
          {filteredCouples.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No couples found</Text>
              <Text style={styles.emptySubtitle}>Try adjusting your search or filters</Text>
            </View>
          ) : (
            filteredCouples.map(renderCoupleRow)
          )}
        </View>
      </ScrollView>

      {renderEnrollmentModal()}
      {toast.visible && renderToast()}
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
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
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
});
