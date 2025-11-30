import { registerWithEmail } from '@/services/firebase';
import { adminService } from '@/services/firestore.service';
import { Admin as FirebaseAdmin } from '@/types/firebase.types';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
// Added imports for Password Update functionality
import { getAuth, updatePassword } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
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

const isWeb = Platform.OS === 'web';

// Extend Firebase Admin type with document ID
interface Admin extends FirebaseAdmin {
  id: string; // Firestore document ID
}

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

// Admin interface is now imported from firebase.types.ts

export default function ManageAdminsScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;

  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Form state for add/edit
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'admin' as 'admin' | 'superadmin' | 'owner',
  });
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [ownerPasswordInput, setOwnerPasswordInput] = useState('');
  const [showOwnerPasswordModal, setShowOwnerPasswordModal] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Current logged-in user info (fetched from AsyncStorage/Firestore)
  const [currentUser, setCurrentUser] = useState<Admin | null>(null);

  useEffect(() => {
    checkSuperAdminAccess();
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      // Subscribe to real-time admin updates
      console.log('Setting up admin subscription...');
      const unsubscribe = adminService.subscribe((adminList) => {
        console.log('Received admin list update:', adminList.length, 'admins');
        setAdmins(adminList);
        setLoading(false);
      });

      return () => {
        console.log('Cleaning up admin subscription');
        unsubscribe();
      };
    }
  }, [isSuperAdmin]);

  // Load current logged-in user's admin data
  const loadCurrentUser = async () => {
    try {
      const adminUid = await AsyncStorage.getItem('adminUid');
      if (adminUid) {
        const adminData = await adminService.get(adminUid);
        if (adminData) {
          setCurrentUser(adminData as Admin);
        }
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  // Manual refresh function
  const refreshAdmins = async () => {
    setLoading(true);
    try {
      const adminList = await adminService.getAll();
      setAdmins(adminList as Admin[]);
    } catch (error) {
      console.error('Error refreshing admins:', error);
    } finally {
      setLoading(false);
    }
  };

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

  // Helper to format date
  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  // Filter admins
  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = 
      admin.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.uid?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && admin.isActive) ||
      (filterStatus === 'inactive' && !admin.isActive);
    
    return matchesSearch && matchesStatus;
  });

  const handleAddAdmin = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      setFormError('Please fill in all required fields');
      return;
    }

    if (formData.password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }

    setActionLoading(true);
    setFormError('');

    try {
      // Create Firebase Auth user
      const authResult = await registerWithEmail(formData.email, formData.password);
      
      if (!authResult.success || !authResult.user) {
        setFormError(authResult.error || 'Failed to create admin account');
        setActionLoading(false);
        return;
      }

      // Create admin document in Firestore
      const nameParts = formData.name.trim().split(' ');
      await adminService.create(authResult.user.uid, {
        email: formData.email,
        phone: formData.phone || '',
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        displayName: formData.name,
        role: formData.role,
        isActive: true,
        password: formData.password, // Store password for superadmin reference
        permissions: {
          canManageUsers: true,
          canManageAdmins: formData.role === 'superadmin',
          canViewReports: true,
          canSendNotifications: true,
          canManageAppointments: true,
          canAccessMonitoring: true,
          canManageContent: formData.role === 'superadmin',
        },
      });

      setShowAddModal(false);
      resetForm();
      Alert.alert('Success', `Admin ${formData.name} has been created successfully!\n\nEmail: ${formData.email}\nPassword: ${formData.password}`);
    } catch (error: any) {
      console.error('Error creating admin:', error);
      setFormError(error.message || 'Failed to create admin');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditAdmin = async () => {
    if (!selectedAdmin) return;

    if (!formData.name || !formData.email) {
      setFormError('Please fill in all required fields');
      return;
    }

    setActionLoading(true);
    setFormError('');

    try {
      const nameParts = formData.name.trim().split(' ');
      const updateData: any = {
        email: formData.email,
        phone: formData.phone || '',
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        displayName: formData.name,
        role: formData.role,
      };

      // --- LOGIC CHANGE START ---
      // Check if the user is editing their own profile
      const isEditingSelf = currentUser && selectedAdmin.uid === currentUser.uid;

      // Only attempt to update password if it's the current user AND they provided a new password
      if (isEditingSelf && formData.password && formData.password.trim().length > 0) {
        
        if (formData.password.length < 6) {
             setFormError('New password must be at least 6 characters');
             setActionLoading(false);
             return;
        }

        try {
          const auth = getAuth();
          // Verify we have a user logged in to Auth SDK
          if (auth.currentUser) {
            // Update in Firebase Auth
            await updatePassword(auth.currentUser, formData.password);
            // If successful, add to Firestore update data to keep sync
            updateData.password = formData.password;
          } else {
             console.warn("No Auth user found, skipping auth password update");
          }
        } catch (authError: any) {
          if (authError.code === 'auth/requires-recent-login') {
            Alert.alert('Security Check', 'To change your password, please logout and login again to verify your identity.');
            setActionLoading(false);
            return;
          } else {
            // Throw to outer catch block
            throw new Error(authError.message || 'Failed to update password in authentication system.');
          }
        }
      }
      // If editing someone else, we do NOTHING with password, even if entered.
      // --- LOGIC CHANGE END ---

      await adminService.update(selectedAdmin.uid, updateData);

      setShowEditModal(false);
      setSelectedAdmin(null);
      resetForm();
      Alert.alert('Success', 'Admin details updated successfully!');
    } catch (error: any) {
      console.error('Error updating admin:', error);
      setFormError(error.message || 'Failed to update admin');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!selectedAdmin) return;

    // Owner cannot be deleted
    if (selectedAdmin.role === 'owner') {
      Alert.alert('Error', 'Cannot delete the Owner account.');
      setShowDeleteModal(false);
      return;
    }

    // All deletions require password confirmation
    // Close delete modal and open password modal
    setShowDeleteModal(false);
    setShowOwnerPasswordModal(true);
  };

  const performDelete = async () => {
    if (!selectedAdmin) return;

    setActionLoading(true);

    try {
      const adminId = selectedAdmin.id || selectedAdmin.uid;
      const deletedName = selectedAdmin.displayName;
      
      console.log('Deleting admin with ID:', adminId);
      
      // Delete from Firestore - user won't be able to login anymore
      await adminService.delete(adminId);
      console.log('✅ Admin deleted from Firestore');
      
      // Close modals and reset state
      setShowDeleteModal(false);
      setShowOwnerPasswordModal(false);
      setOwnerPasswordInput('');
      setSelectedAdmin(null);
      
      Alert.alert(
        'Admin Deleted', 
        `${deletedName} has been removed and can no longer access the system.`
      );
    } catch (error: any) {
      console.error('Error deleting admin:', error);
      Alert.alert('Error', error.message || 'Failed to delete admin');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOwnerPasswordConfirm = async () => {
    // Clear previous error
    setPasswordError('');
    
    if (!currentUser || !currentUser.password) {
      setPasswordError('Unable to verify your credentials. Please re-login.');
      return;
    }
    
    if (ownerPasswordInput !== currentUser.password) {
      setPasswordError('Incorrect password. Please try again.');
      return;
    }
    
    // Password correct, proceed with deletion
    await performDelete();
  };

  const openPauseModal = (admin: Admin) => {
    setSelectedAdmin(admin);
    setShowPauseModal(true);
  };

  const handleToggleStatus = async () => {
    if (!selectedAdmin) return;
    
    setActionLoading(true);
    try {
      if (selectedAdmin.isActive) {
        await adminService.deactivate(selectedAdmin.uid);
        Alert.alert('Success', `${selectedAdmin.displayName} has been paused`);
      } else {
        await adminService.activate(selectedAdmin.uid);
        Alert.alert('Success', `${selectedAdmin.displayName} is now active`);
      }
      setShowPauseModal(false);
      setSelectedAdmin(null);
    } catch (error: any) {
      console.error('Error toggling admin status:', error);
      Alert.alert('Error', error.message || 'Failed to update admin status');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePromoteDemote = async (admin: Admin) => {
    try {
      if (admin.role === 'admin') {
        await adminService.promoteToSuperAdmin(admin.uid);
        Alert.alert('Success', `${admin.displayName} has been promoted to Super Admin`);
      } else {
        await adminService.demoteToAdmin(admin.uid);
        Alert.alert('Success', `${admin.displayName} has been demoted to Admin`);
      }
    } catch (error: any) {
      console.error('Error promoting/demoting admin:', error);
      Alert.alert('Error', error.message || 'Failed to change admin role');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'admin',
    });
    setFormError('');
    setShowPassword(false);
  };

  const openEditModal = (admin: Admin) => {
    setSelectedAdmin(admin);
    // Determine if we show the password in the box
    // If editing self, show current password (or empty if you prefer they re-enter)
    // If editing others, we will hide the field in render, so data here matters less, 
    // but good practice not to load their password.
    const isEditingSelf = currentUser && admin.uid === currentUser.uid;

    setFormData({
      name: admin.displayName || '',
      email: admin.email || '',
      phone: admin.phone || '',
      password: isEditingSelf ? (admin.password || '') : '', // Only load pass if self
      role: admin.role,
    });
    setFormError('');
    setShowPassword(false);
    setShowEditModal(true);
  };

  const openDeleteModal = (admin: Admin) => {
    setSelectedAdmin(admin);
    setShowDeleteModal(true);
  };

  if (!isSuperAdmin || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>{loading ? 'Loading admins...' : 'Checking access...'}</Text>
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
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={refreshAdmins}
          >
            <Ionicons name="refresh" size={20} color={COLORS.primary} />
          </TouchableOpacity>
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
          <Text style={styles.statValue}>{admins.filter(a => a.isActive).length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
      </View>

      <View style={[styles.statCard, { borderLeftColor: COLORS.warning }]}>
        <View style={[styles.statIcon, { backgroundColor: COLORS.warning + '15' }]}>
          <Ionicons name="pause-circle" size={22} color={COLORS.warning} />
        </View>
        <View>
          <Text style={styles.statValue}>{admins.filter(a => !a.isActive).length}</Text>
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
  const renderAdminCard = (admin: Admin) => {
    const displayName = admin.displayName || admin.email?.split('@')[0] || 'Admin';
    const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const createdDate = admin.createdAt ? admin.createdAt.toDate().toLocaleDateString() : 'N/A';
    
    // Determine avatar color based on role
    const getAvatarColor = () => {
      switch (admin.role) {
        case 'owner': return COLORS.primaryDark;
        case 'superadmin': return COLORS.accent;
        default: return COLORS.primary;
      }
    };
    
    return (
      <View key={admin.id} style={styles.adminCard}>
        <View style={styles.adminCardLeft}>
          <View style={[styles.adminAvatar, { backgroundColor: getAvatarColor() }]}>
            <Text style={styles.adminAvatarText}>{initials}</Text>
          </View>
          <View style={styles.adminInfo}>
            <View style={styles.adminNameRow}>
              <Text style={styles.adminName}>{displayName}</Text>
              {admin.role === 'owner' && (
                <View style={[styles.superAdminBadge, { backgroundColor: COLORS.primaryDark + '20' }]}>
                  <Ionicons name="diamond" size={12} color={COLORS.primaryDark} />
                  <Text style={[styles.superAdminBadgeText, { color: COLORS.primaryDark }]}>Owner</Text>
                </View>
              )}
              {admin.role === 'superadmin' && (
                <View style={styles.superAdminBadge}>
                  <Ionicons name="shield-checkmark" size={12} color={COLORS.accentDark} />
                  <Text style={styles.superAdminBadgeText}>Super</Text>
                </View>
              )}
            </View>
            <Text style={styles.adminEmail}>{admin.email}</Text>
            <Text style={styles.adminPhone}>{admin.phone || 'No phone'}</Text>
            <View style={styles.adminMeta}>
              <Text style={styles.adminMetaText}>ID: {admin.id?.slice(0, 8)}...</Text>
              <Text style={styles.adminMetaText}>•</Text>
              <Text style={styles.adminMetaText}>Created: {createdDate}</Text>
            </View>
          </View>
        </View>

        <View style={styles.adminCardRight}>
          <TouchableOpacity
            style={[
              styles.statusBadge,
              { backgroundColor: admin.isActive ? COLORS.success + '15' : COLORS.warning + '15' }
            ]}
            onPress={() => admin.role !== 'owner' && admin.uid !== currentUser?.uid && openPauseModal(admin)}
            disabled={admin.role === 'owner' || admin.uid === currentUser?.uid}
          >
            <View style={[
              styles.statusDot,
              { backgroundColor: admin.isActive ? COLORS.success : COLORS.warning }
            ]} />
            <Text style={[
              styles.statusText,
              { color: admin.isActive ? COLORS.success : COLORS.warning }
            ]}>
              {admin.isActive ? 'Active' : 'Paused'}
            </Text>
          </TouchableOpacity>

        <View style={styles.actionButtons}>
          {/* Pause/Play button - not for owner and not for self */}
          {admin.role !== 'owner' && admin.uid !== currentUser?.uid && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: admin.isActive ? COLORS.warning + '20' : COLORS.success + '20' }]}
              onPress={() => openPauseModal(admin)}
            >
              <Ionicons 
                name={admin.isActive ? 'pause-circle-outline' : 'play-circle-outline'} 
                size={20} 
                color={admin.isActive ? COLORS.warning : COLORS.success} 
              />
            </TouchableOpacity>
          )}
          {/* Edit button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openEditModal(admin)}
          >
            <Ionicons name="create-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          {/* Delete button - not for owner, not for self, superadmin needs password confirmation */}
          {admin.role !== 'owner' && admin.uid !== currentUser?.uid && (
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
  };

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

            {/* --- LOGIC CHANGE START --- 
                Only show Password Field if:
                1. It is 'Add New Admin' mode (!isEdit)
                2. OR It is 'Edit Mode' AND user is editing themselves
            */}
            {(!isEdit || (isEdit && selectedAdmin?.uid === currentUser?.uid)) && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{isEdit ? 'Password (leave empty to keep current)' : 'Password *'}</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder={isEdit ? 'Enter new password to change' : 'Enter password'}
                    placeholderTextColor={COLORS.textMuted}
                    value={formData.password}
                    onChangeText={(text) => setFormData({ ...formData, password: text })}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    style={styles.passwordToggle}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={22}
                      color={COLORS.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {/* --- LOGIC CHANGE END --- */}

            {/* Hide role selector when editing owner - owner role cannot be changed */}
            {!(isEdit && selectedAdmin?.role === 'owner') && (
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
            )}

            {formError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.errorText}>{formError}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalSecondaryButton}
              onPress={() => isEdit ? setShowEditModal(false) : setShowAddModal(false)}
              disabled={actionLoading}
            >
              <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalPrimaryButton, actionLoading && { opacity: 0.6 }]}
              onPress={isEdit ? handleEditAdmin : handleAddAdmin}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name={isEdit ? "checkmark" : "add"} size={18} color="#fff" />
                  <Text style={styles.modalPrimaryButtonText}>{isEdit ? 'Save Changes' : 'Create Admin'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Pause/Activate Confirmation Modal
  const renderPauseModal = () => (
    <Modal
      visible={showPauseModal}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowPauseModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.deleteModalContent, isMobile && styles.modalContentMobile]}>
          <View style={[styles.deleteIconContainer, { backgroundColor: selectedAdmin?.isActive ? COLORS.warning + '15' : COLORS.success + '15' }]}>
            <Ionicons 
              name={selectedAdmin?.isActive ? 'pause-circle' : 'play-circle'} 
              size={48} 
              color={selectedAdmin?.isActive ? COLORS.warning : COLORS.success} 
            />
          </View>
          <Text style={styles.deleteModalTitle}>
            {selectedAdmin?.isActive ? 'Pause Admin' : 'Activate Admin'}
          </Text>
          <Text style={styles.deleteModalText}>
            {selectedAdmin?.isActive 
              ? `Are you sure you want to pause ${selectedAdmin?.displayName}? They won't be able to log in until activated again.`
              : `Are you sure you want to activate ${selectedAdmin?.displayName}? They will be able to log in again.`
            }
          </Text>
          <View style={styles.deleteModalButtons}>
            <TouchableOpacity
              style={styles.deleteModalCancelButton}
              onPress={() => {
                setShowPauseModal(false);
                setSelectedAdmin(null);
              }}
              disabled={actionLoading}
            >
              <Text style={styles.deleteModalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.deleteModalConfirmButton, 
                { backgroundColor: selectedAdmin?.isActive ? COLORS.warning : COLORS.success },
                actionLoading && { opacity: 0.6 }
              ]}
              onPress={handleToggleStatus}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons 
                    name={selectedAdmin?.isActive ? 'pause' : 'play'} 
                    size={18} 
                    color="#fff" 
                  />
                  <Text style={styles.deleteModalConfirmText}>
                    {selectedAdmin?.isActive ? 'Pause' : 'Activate'}
                  </Text>
                </>
              )}
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
            Are you sure you want to delete {selectedAdmin?.displayName || selectedAdmin?.email}? This action cannot be undone.
          </Text>
          <View style={styles.deleteModalButtons}>
            <TouchableOpacity
              style={styles.deleteModalCancelButton}
              onPress={() => setShowDeleteModal(false)}
              disabled={actionLoading}
            >
              <Text style={styles.deleteModalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteModalConfirmButton, actionLoading && { opacity: 0.6 }]}
              onPress={handleDeleteAdmin}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="trash" size={18} color="#fff" />
                  <Text style={styles.deleteModalConfirmText}>Delete</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Password Confirmation Modal (for deleting admins)
  const renderOwnerPasswordModal = () => (
    <Modal
      visible={showOwnerPasswordModal}
      animationType="fade"
      transparent={true}
      onRequestClose={() => {
        setShowOwnerPasswordModal(false);
        setOwnerPasswordInput('');
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.deleteModalContent, isMobile && styles.modalContentMobile]}>
          <View style={[styles.deleteIconContainer, { backgroundColor: COLORS.warning + '15' }]}>
            <Ionicons name="key" size={48} color={COLORS.warning} />
          </View>
          <Text style={styles.deleteModalTitle}>Password Required</Text>
          <Text style={styles.deleteModalText}>
            Enter your password to confirm deletion of {selectedAdmin?.displayName}.
          </Text>
          <View style={styles.formGroup}>
            <TextInput
              style={[styles.formInput, { marginTop: 10, borderColor: passwordError ? COLORS.error : COLORS.border }]}
              placeholder="Enter your password"
              placeholderTextColor={COLORS.textMuted}
              value={ownerPasswordInput}
              onChangeText={(text) => {
                setOwnerPasswordInput(text);
                if (passwordError) setPasswordError('');
              }}
              secureTextEntry
              autoCapitalize="none"
            />
            {passwordError ? (
              <View style={styles.passwordErrorContainer}>
                <Ionicons name="alert-circle" size={14} color={COLORS.error} />
                <Text style={styles.passwordErrorText}>{passwordError}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.deleteModalButtons}>
            <TouchableOpacity
              style={styles.deleteModalCancelButton}
              onPress={() => {
                setShowOwnerPasswordModal(false);
                setOwnerPasswordInput('');
                setPasswordError('');
                setSelectedAdmin(null);
              }}
              disabled={actionLoading}
            >
              <Text style={styles.deleteModalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteModalConfirmButton, actionLoading && { opacity: 0.6 }]}
              onPress={handleOwnerPasswordConfirm}
              disabled={actionLoading || !ownerPasswordInput}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="trash" size={18} color="#fff" />
                  <Text style={styles.deleteModalConfirmText}>Delete</Text>
                </>
              )}
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
      {renderPauseModal()}
      {renderOwnerPasswordModal()}
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
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
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.borderLight,
    borderRadius: 10,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  passwordToggle: {
    padding: 12,
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

  // Error display
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error + '15',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.error,
  },
  passwordErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  passwordErrorText: {
    fontSize: 13,
    color: COLORS.error,
    fontWeight: '500',
  },
});