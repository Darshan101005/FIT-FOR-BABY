import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
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

interface Admin {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'superadmin';
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin?: string;
}

// Mock admin data
const initialAdmins: Admin[] = [
  {
    id: 'ADM001',
    name: 'Super Admin',
    email: 'superadmin@fitforbaby.com',
    phone: '+91 98765 00001',
    role: 'superadmin',
    status: 'active',
    createdAt: '2024-01-01',
    lastLogin: '2024-11-27',
  },
  {
    id: 'ADM002',
    name: 'Dr. Priya Sharma',
    email: 'priya@fitforbaby.com',
    phone: '+91 98765 00002',
    role: 'admin',
    status: 'active',
    createdAt: '2024-03-15',
    lastLogin: '2024-11-26',
  },
  {
    id: 'ADM003',
    name: 'Dr. Vikram Singh',
    email: 'vikram@fitforbaby.com',
    phone: '+91 98765 00003',
    role: 'admin',
    status: 'active',
    createdAt: '2024-05-20',
    lastLogin: '2024-11-25',
  },
  {
    id: 'ADM004',
    name: 'Nurse Anita Reddy',
    email: 'anita@fitforbaby.com',
    phone: '+91 98765 00004',
    role: 'admin',
    status: 'inactive',
    createdAt: '2024-06-10',
    lastLogin: '2024-10-15',
  },
];

export default function ManageAdminsScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;

  const [admins, setAdmins] = useState<Admin[]>(initialAdmins);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Form state for add/edit
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'admin' as 'admin' | 'superadmin',
  });

  useEffect(() => {
    checkSuperAdminAccess();
  }, []);

  const checkSuperAdminAccess = async () => {
    try {
      const superAdminFlag = await AsyncStorage.getItem('isSuperAdmin');
      if (superAdminFlag !== 'true') {
        Alert.alert('Access Denied', 'You do not have permission to access this page.');
        router.replace('/admin/home');
      } else {
        setIsSuperAdmin(true);
      }
    } catch (error) {
      console.error('Error checking super admin access:', error);
      router.replace('/admin/home');
    }
  };

  // Filter admins
  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = 
      admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || admin.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleAddAdmin = () => {
    if (!formData.name || !formData.email || !formData.password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const newAdmin: Admin = {
      id: `ADM${String(admins.length + 1).padStart(3, '0')}`,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      role: formData.role,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
    };

    setAdmins([...admins, newAdmin]);
    setShowAddModal(false);
    resetForm();
    Alert.alert('Success', `Admin ${formData.name} has been created successfully!`);
  };

  const handleEditAdmin = () => {
    if (!selectedAdmin) return;

    const updatedAdmins = admins.map(admin => 
      admin.id === selectedAdmin.id 
        ? { ...admin, name: formData.name, email: formData.email, phone: formData.phone, role: formData.role }
        : admin
    );

    setAdmins(updatedAdmins);
    setShowEditModal(false);
    setSelectedAdmin(null);
    resetForm();
    Alert.alert('Success', 'Admin details updated successfully!');
  };

  const handleDeleteAdmin = () => {
    if (!selectedAdmin) return;

    if (selectedAdmin.role === 'superadmin') {
      Alert.alert('Error', 'Cannot delete a Super Admin account');
      return;
    }

    const updatedAdmins = admins.filter(admin => admin.id !== selectedAdmin.id);
    setAdmins(updatedAdmins);
    setShowDeleteModal(false);
    setSelectedAdmin(null);
    Alert.alert('Success', `Admin ${selectedAdmin.name} has been deleted.`);
  };

  const handleToggleStatus = (admin: Admin) => {
    if (admin.role === 'superadmin') {
      Alert.alert('Error', 'Cannot deactivate a Super Admin account');
      return;
    }

    const updatedAdmins = admins.map(a => 
      a.id === admin.id 
        ? { ...a, status: a.status === 'active' ? 'inactive' : 'active' } as Admin
        : a
    );

    setAdmins(updatedAdmins);
    Alert.alert('Success', `Admin ${admin.name} is now ${admin.status === 'active' ? 'inactive' : 'active'}`);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'admin',
    });
  };

  const openEditModal = (admin: Admin) => {
    setSelectedAdmin(admin);
    setFormData({
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      password: '',
      role: admin.role,
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (admin: Admin) => {
    setSelectedAdmin(admin);
    setShowDeleteModal(true);
  };

  if (!isSuperAdmin) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Checking access...</Text>
      </View>
    );
  }

  // Header
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Manage Admins</Text>
            <Text style={styles.headerSubtitle}>Super Admin Control Panel</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setShowAddModal(true);
          }}
        >
          <Ionicons name="add" size={20} color="#fff" />
          {!isMobile && <Text style={styles.addButtonText}>Add Admin</Text>}
        </TouchableOpacity>
      </View>

      {/* Search and Filters */}
      <View style={[styles.filtersContainer, isMobile && styles.filtersContainerMobile]}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, or ID..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.filterChips}>
          {(['all', 'active', 'inactive'] as const).map(status => (
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
      </View>
    </View>
  );

  // Stats
  const renderStats = () => (
    <View style={[styles.statsContainer, isMobile && styles.statsContainerMobile]}>
      <View style={[styles.statCard, { borderLeftColor: COLORS.primary }]}>
        <View style={[styles.statIcon, { backgroundColor: COLORS.primary + '15' }]}>
          <Ionicons name="people" size={22} color={COLORS.primary} />
        </View>
        <View>
          <Text style={styles.statValue}>{admins.length}</Text>
          <Text style={styles.statLabel}>Total Admins</Text>
        </View>
      </View>

      <View style={[styles.statCard, { borderLeftColor: COLORS.success }]}>
        <View style={[styles.statIcon, { backgroundColor: COLORS.success + '15' }]}>
          <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
        </View>
        <View>
          <Text style={styles.statValue}>{admins.filter(a => a.status === 'active').length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
      </View>

      <View style={[styles.statCard, { borderLeftColor: COLORS.warning }]}>
        <View style={[styles.statIcon, { backgroundColor: COLORS.warning + '15' }]}>
          <Ionicons name="pause-circle" size={22} color={COLORS.warning} />
        </View>
        <View>
          <Text style={styles.statValue}>{admins.filter(a => a.status === 'inactive').length}</Text>
          <Text style={styles.statLabel}>Inactive</Text>
        </View>
      </View>

      <View style={[styles.statCard, { borderLeftColor: COLORS.accent }]}>
        <View style={[styles.statIcon, { backgroundColor: COLORS.accent + '20' }]}>
          <Ionicons name="shield-checkmark" size={22} color={COLORS.accentDark} />
        </View>
        <View>
          <Text style={styles.statValue}>{admins.filter(a => a.role === 'superadmin').length}</Text>
          <Text style={styles.statLabel}>Super Admins</Text>
        </View>
      </View>
    </View>
  );

  // Admin Card
  const renderAdminCard = (admin: Admin) => (
    <View key={admin.id} style={styles.adminCard}>
      <View style={styles.adminCardLeft}>
        <View style={[styles.adminAvatar, { backgroundColor: admin.role === 'superadmin' ? COLORS.accent : COLORS.primary }]}>
          <Text style={styles.adminAvatarText}>
            {admin.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </Text>
        </View>
        <View style={styles.adminInfo}>
          <View style={styles.adminNameRow}>
            <Text style={styles.adminName}>{admin.name}</Text>
            {admin.role === 'superadmin' && (
              <View style={styles.superAdminBadge}>
                <Ionicons name="shield-checkmark" size={12} color={COLORS.accentDark} />
                <Text style={styles.superAdminBadgeText}>Super</Text>
              </View>
            )}
          </View>
          <Text style={styles.adminEmail}>{admin.email}</Text>
          <Text style={styles.adminPhone}>{admin.phone}</Text>
          <View style={styles.adminMeta}>
            <Text style={styles.adminMetaText}>ID: {admin.id}</Text>
            <Text style={styles.adminMetaText}>•</Text>
            <Text style={styles.adminMetaText}>Created: {admin.createdAt}</Text>
          </View>
        </View>
      </View>

      <View style={styles.adminCardRight}>
        <TouchableOpacity
          style={[
            styles.statusBadge,
            { backgroundColor: admin.status === 'active' ? COLORS.success + '15' : COLORS.error + '15' }
          ]}
          onPress={() => handleToggleStatus(admin)}
        >
          <View style={[
            styles.statusDot,
            { backgroundColor: admin.status === 'active' ? COLORS.success : COLORS.error }
          ]} />
          <Text style={[
            styles.statusText,
            { color: admin.status === 'active' ? COLORS.success : COLORS.error }
          ]}>
            {admin.status.charAt(0).toUpperCase() + admin.status.slice(1)}
          </Text>
        </TouchableOpacity>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openEditModal(admin)}
          >
            <Ionicons name="create-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          {admin.role !== 'superadmin' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => openDeleteModal(admin)}
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  // Add/Edit Modal
  const renderFormModal = (isEdit: boolean) => (
    <Modal
      visible={isEdit ? showEditModal : showAddModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => isEdit ? setShowEditModal(false) : setShowAddModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, isMobile && styles.modalContentMobile]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{isEdit ? 'Edit Admin' : 'Add New Admin'}</Text>
            <TouchableOpacity onPress={() => isEdit ? setShowEditModal(false) : setShowAddModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Full Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter full name"
                placeholderTextColor={COLORS.textMuted}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Email *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter email address"
                placeholderTextColor={COLORS.textMuted}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Phone Number</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter phone number"
                placeholderTextColor={COLORS.textMuted}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                keyboardType="phone-pad"
              />
            </View>

            {!isEdit && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Password *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter password"
                  placeholderTextColor={COLORS.textMuted}
                  value={formData.password}
                  onChangeText={(text) => setFormData({ ...formData, password: text })}
                  secureTextEntry
                />
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Role</Text>
              <View style={styles.roleSelector}>
                <TouchableOpacity
                  style={[styles.roleOption, formData.role === 'admin' && styles.roleOptionActive]}
                  onPress={() => setFormData({ ...formData, role: 'admin' })}
                >
                  <Ionicons 
                    name="person" 
                    size={18} 
                    color={formData.role === 'admin' ? COLORS.primary : COLORS.textMuted} 
                  />
                  <Text style={[styles.roleOptionText, formData.role === 'admin' && styles.roleOptionTextActive]}>
                    Admin
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleOption, formData.role === 'superadmin' && styles.roleOptionActive]}
                  onPress={() => setFormData({ ...formData, role: 'superadmin' })}
                >
                  <Ionicons 
                    name="shield-checkmark" 
                    size={18} 
                    color={formData.role === 'superadmin' ? COLORS.accent : COLORS.textMuted} 
                  />
                  <Text style={[styles.roleOptionText, formData.role === 'superadmin' && styles.roleOptionTextActive]}>
                    Super Admin
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalSecondaryButton}
              onPress={() => isEdit ? setShowEditModal(false) : setShowAddModal(false)}
            >
              <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalPrimaryButton}
              onPress={isEdit ? handleEditAdmin : handleAddAdmin}
            >
              <Ionicons name={isEdit ? "checkmark" : "add"} size={18} color="#fff" />
              <Text style={styles.modalPrimaryButtonText}>{isEdit ? 'Save Changes' : 'Create Admin'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Delete Confirmation Modal
  const renderDeleteModal = () => (
    <Modal
      visible={showDeleteModal}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowDeleteModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.deleteModalContent, isMobile && styles.modalContentMobile]}>
          <View style={styles.deleteIconContainer}>
            <Ionicons name="alert-circle" size={48} color={COLORS.error} />
          </View>
          <Text style={styles.deleteModalTitle}>Delete Admin</Text>
          <Text style={styles.deleteModalText}>
            Are you sure you want to delete {selectedAdmin?.name}? This action cannot be undone.
          </Text>
          <View style={styles.deleteModalButtons}>
            <TouchableOpacity
              style={styles.deleteModalCancelButton}
              onPress={() => setShowDeleteModal(false)}
            >
              <Text style={styles.deleteModalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteModalConfirmButton}
              onPress={handleDeleteAdmin}
            >
              <Ionicons name="trash" size={18} color="#fff" />
              <Text style={styles.deleteModalConfirmText}>Delete</Text>
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

          <View style={styles.listContainer}>
            <Text style={styles.sectionTitle}>
              {filterStatus === 'all' ? 'All Admins' : `${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)} Admins`}
              <Text style={styles.countText}> ({filteredAdmins.length})</Text>
            </Text>

            {filteredAdmins.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyStateText}>No admins found</Text>
                <Text style={styles.emptyStateSubtext}>Try adjusting your search or filters</Text>
              </View>
            ) : (
              filteredAdmins.map(renderAdminCard)
            )}
          </View>
        </View>
      </ScrollView>

      {renderFormModal(false)}
      {renderFormModal(true)}
      {renderDeleteModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
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

  // List
  listContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  countText: {
    fontWeight: '400',
    color: COLORS.textMuted,
  },

  // Admin Card
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  adminCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  adminAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  adminInfo: {
    flex: 1,
  },
  adminNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  superAdminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  superAdminBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.accentDark,
  },
  adminEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  adminPhone: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  adminMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  adminMetaText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  adminCardRight: {
    alignItems: 'flex-end',
    gap: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.borderLight,
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

  // Form
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: COLORS.borderLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.borderLight,
    gap: 8,
  },
  roleOptionActive: {
    backgroundColor: COLORS.primary + '15',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  roleOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  roleOptionTextActive: {
    color: COLORS.primary,
  },

  // Delete Modal
  deleteModalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  deleteIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.error + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  deleteModalText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteModalCancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.borderLight,
  },
  deleteModalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  deleteModalConfirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.error,
    gap: 8,
  },
  deleteModalConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
