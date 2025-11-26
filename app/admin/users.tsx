import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
  useWindowDimensions
} from 'react-native';

const isWeb = Platform.OS === 'web';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  gender: 'male' | 'female';
  partner?: { id: string; name: string };
  status: 'active' | 'inactive' | 'pending';
  joinDate: string;
  lastActive: string;
  questionnaire: number;
  weight: { current: number; start: number; target: number };
  steps: { avg: number; target: number };
  bmi: number;
  appointments: number;
}

const mockUsers: User[] = [
  {
    id: '1', name: 'John Doe', email: 'john@example.com', phone: '+91 98765 43210',
    gender: 'male', partner: { id: '2', name: 'Sarah Doe' }, status: 'active',
    joinDate: '2024-10-01', lastActive: '2024-11-25', questionnaire: 100,
    weight: { current: 85, start: 92, target: 80 }, steps: { avg: 8500, target: 10000 },
    bmi: 27.8, appointments: 4,
  },
  {
    id: '2', name: 'Sarah Doe', email: 'sarah@example.com', phone: '+91 98765 43211',
    gender: 'female', partner: { id: '1', name: 'John Doe' }, status: 'active',
    joinDate: '2024-10-01', lastActive: '2024-11-25', questionnaire: 100,
    weight: { current: 78, start: 85, target: 70 }, steps: { avg: 9200, target: 10000 },
    bmi: 28.4, appointments: 5,
  },
  {
    id: '3', name: 'Raj Kumar', email: 'raj@example.com', phone: '+91 98765 43212',
    gender: 'male', partner: { id: '4', name: 'Priya Kumar' }, status: 'active',
    joinDate: '2024-10-15', lastActive: '2024-11-24', questionnaire: 100,
    weight: { current: 95, start: 100, target: 85 }, steps: { avg: 6500, target: 10000 },
    bmi: 32.1, appointments: 3,
  },
  {
    id: '4', name: 'Priya Kumar', email: 'priya@example.com', phone: '+91 98765 43213',
    gender: 'female', partner: { id: '3', name: 'Raj Kumar' }, status: 'inactive',
    joinDate: '2024-10-15', lastActive: '2024-11-10', questionnaire: 75,
    weight: { current: 72, start: 75, target: 65 }, steps: { avg: 4200, target: 10000 },
    bmi: 26.8, appointments: 2,
  },
  {
    id: '5', name: 'Anand M', email: 'anand@example.com', phone: '+91 98765 43214',
    gender: 'male', status: 'pending',
    joinDate: '2024-11-20', lastActive: '2024-11-20', questionnaire: 25,
    weight: { current: 88, start: 88, target: 75 }, steps: { avg: 0, target: 10000 },
    bmi: 29.3, appointments: 0,
  },
  {
    id: '6', name: 'Meena S', email: 'meena@example.com', phone: '+91 98765 43215',
    gender: 'female', status: 'pending',
    joinDate: '2024-11-22', lastActive: '2024-11-22', questionnaire: 50,
    weight: { current: 68, start: 68, target: 58 }, steps: { avg: 0, target: 10000 },
    bmi: 25.4, appointments: 0,
  },
];

export default function AdminUsersScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const toastAnim = useRef(new Animated.Value(-100)).current;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });

  const showToast = (message: string, type: 'error' | 'success') => {
    setToast({ visible: true, message, type });
    Animated.spring(toastAnim, { toValue: 20, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(toastAnim, { toValue: -100, duration: 300, useNativeDriver: true })
        .start(() => setToast({ visible: false, message: '', type: '' }));
    }, 2500);
  };

  const filteredUsers = mockUsers.filter((user) => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#22c55e';
      case 'inactive': return '#f59e0b';
      case 'pending': return '#64748b';
      default: return '#64748b';
    }
  };

  const handleSendReminder = (user: User) => {
    setModalVisible(false);
    showToast(`Reminder sent to ${user.name}`, 'success');
  };

  const handlePairUsers = () => {
    showToast('User pairing feature coming soon', 'success');
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#0f172a" />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>User Management</Text>
        <Text style={styles.headerSubtitle}>{mockUsers.length} total users</Text>
      </View>
      <TouchableOpacity style={styles.addButton}>
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderStats = () => (
    <View style={styles.statsRow}>
      <View style={[styles.statCard, { backgroundColor: '#dcfce7' }]}>
        <Text style={[styles.statValue, { color: '#16a34a' }]}>
          {mockUsers.filter(u => u.status === 'active').length}
        </Text>
        <Text style={styles.statLabel}>Active</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
        <Text style={[styles.statValue, { color: '#d97706' }]}>
          {mockUsers.filter(u => u.status === 'inactive').length}
        </Text>
        <Text style={styles.statLabel}>Inactive</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: '#f1f5f9' }]}>
        <Text style={[styles.statValue, { color: '#64748b' }]}>
          {mockUsers.filter(u => u.status === 'pending').length}
        </Text>
        <Text style={styles.statLabel}>Pending</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: '#fee2e2' }]}>
        <Text style={[styles.statValue, { color: '#ef4444' }]}>
          {mockUsers.filter(u => !u.partner).length}
        </Text>
        <Text style={styles.statLabel}>Unpaired</Text>
      </View>
    </View>
  );

  const renderSearch = () => (
    <View style={styles.searchSection}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by name or email..."
          placeholderTextColor="#94a3b8"
        />
        {searchQuery && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {(['all', 'active', 'inactive', 'pending'] as const).map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.filterChip, filterStatus === status && styles.filterChipActive]}
            onPress={() => setFilterStatus(status)}
          >
            <Text style={[styles.filterChipText, filterStatus === status && styles.filterChipTextActive]}>
              {status === 'all' ? 'All Users' : status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderUserCard = (user: User) => (
    <TouchableOpacity
      key={user.id}
      style={styles.userCard}
      onPress={() => { setSelectedUser(user); setModalVisible(true); }}
    >
      <View style={styles.userCardHeader}>
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>
            {user.name.split(' ').map(n => n[0]).join('')}
          </Text>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(user.status) }]} />
        </View>
        <View style={styles.userMainInfo}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          {user.partner ? (
            <View style={styles.partnerTag}>
              <Ionicons name="heart" size={12} color="#ef4444" />
              <Text style={styles.partnerText}>{user.partner.name}</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.pairButton} onPress={handlePairUsers}>
              <Ionicons name="link" size={12} color="#006dab" />
              <Text style={styles.pairButtonText}>Pair User</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(user.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(user.status) }]}>
            {user.status}
          </Text>
        </View>
      </View>

      <View style={styles.userMetrics}>
        <View style={styles.metricItem}>
          <MaterialCommunityIcons name="scale-bathroom" size={16} color="#64748b" />
          <Text style={styles.metricValue}>{user.weight.current} kg</Text>
          <Text style={[styles.metricChange, { color: '#22c55e' }]}>
            -{(user.weight.start - user.weight.current).toFixed(1)}
          </Text>
        </View>
        <View style={styles.metricItem}>
          <MaterialCommunityIcons name="walk" size={16} color="#64748b" />
          <Text style={styles.metricValue}>{(user.steps.avg / 1000).toFixed(1)}k</Text>
          <Text style={styles.metricLabel}>avg</Text>
        </View>
        <View style={styles.metricItem}>
          <MaterialCommunityIcons name="clipboard-check" size={16} color="#64748b" />
          <Text style={styles.metricValue}>{user.questionnaire}%</Text>
        </View>
        <View style={styles.metricItem}>
          <MaterialCommunityIcons name="calendar-check" size={16} color="#64748b" />
          <Text style={styles.metricValue}>{user.appointments}</Text>
        </View>
      </View>

      <View style={styles.userCardFooter}>
        <Text style={styles.lastActive}>
          Last active: {new Date(user.lastActive).toLocaleDateString()}
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
      </View>
    </TouchableOpacity>
  );

  const renderUserModal = () => {
    if (!selectedUser) return null;

    return (
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>User Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalProfile}>
                <View style={styles.modalAvatar}>
                  <Text style={styles.modalAvatarText}>
                    {selectedUser.name.split(' ').map(n => n[0]).join('')}
                  </Text>
                </View>
                <Text style={styles.modalName}>{selectedUser.name}</Text>
                <Text style={styles.modalEmail}>{selectedUser.email}</Text>
                <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(selectedUser.status) + '20' }]}>
                  <Text style={[styles.statusTextLarge, { color: getStatusColor(selectedUser.status) }]}>
                    {selectedUser.status}
                  </Text>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Contact Info</Text>
                <View style={styles.modalRow}>
                  <Ionicons name="mail-outline" size={18} color="#64748b" />
                  <Text style={styles.modalRowText}>{selectedUser.email}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Ionicons name="call-outline" size={18} color="#64748b" />
                  <Text style={styles.modalRowText}>{selectedUser.phone}</Text>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Health Metrics</Text>
                <View style={styles.metricsGrid}>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricBoxValue}>{selectedUser.weight.current}</Text>
                    <Text style={styles.metricBoxLabel}>Current (kg)</Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricBoxValue}>{selectedUser.weight.target}</Text>
                    <Text style={styles.metricBoxLabel}>Target (kg)</Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Text style={[styles.metricBoxValue, { color: '#22c55e' }]}>
                      -{(selectedUser.weight.start - selectedUser.weight.current).toFixed(1)}
                    </Text>
                    <Text style={styles.metricBoxLabel}>Lost (kg)</Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricBoxValue}>{selectedUser.bmi}</Text>
                    <Text style={styles.metricBoxLabel}>BMI</Text>
                  </View>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Progress</Text>
                <View style={styles.progressItem}>
                  <Text style={styles.progressLabel}>Questionnaire</Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${selectedUser.questionnaire}%` }]} />
                  </View>
                  <Text style={styles.progressValue}>{selectedUser.questionnaire}%</Text>
                </View>
                <View style={styles.progressItem}>
                  <Text style={styles.progressLabel}>Steps Goal</Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${Math.min((selectedUser.steps.avg / selectedUser.steps.target) * 100, 100)}%`, backgroundColor: '#f59e0b' }]} />
                  </View>
                  <Text style={styles.progressValue}>{Math.round((selectedUser.steps.avg / selectedUser.steps.target) * 100)}%</Text>
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="chatbubble-outline" size={20} color="#006dab" />
                  <Text style={styles.actionButtonText}>Message</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleSendReminder(selectedUser)}>
                  <Ionicons name="notifications-outline" size={20} color="#f59e0b" />
                  <Text style={styles.actionButtonText}>Remind</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="flag-outline" size={20} color="#22c55e" />
                  <Text style={styles.actionButtonText}>Set Goals</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.viewFullButton}>
                <LinearGradient colors={['#006dab', '#005a8f']} style={styles.viewFullGradient}>
                  <Text style={styles.viewFullText}>View Full Profile</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {toast.visible && (
        <Animated.View style={[styles.toast, toast.type === 'error' ? styles.toastError : styles.toastSuccess, { transform: [{ translateY: toastAnim }] }]}>
          <View style={styles.toastContent}>
            <Text style={styles.toastIcon}>{toast.type === 'error' ? '✗' : '✓'}</Text>
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}

      {renderHeader()}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {renderStats()}
          {renderSearch()}

          <Text style={styles.resultCount}>
            Showing {filteredUsers.length} of {mockUsers.length} users
          </Text>

          {filteredUsers.map(renderUserCard)}
        </View>
      </ScrollView>

      {renderUserModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  toast: {
    position: 'absolute', top: 0, left: isWeb ? undefined : 16, right: isWeb ? 20 : 16, zIndex: 1000,
    backgroundColor: '#ffffff', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12,
    elevation: 8, maxWidth: isWeb ? 320 : undefined, borderLeftWidth: 4,
  },
  toastError: { borderLeftColor: '#ef4444' },
  toastSuccess: { borderLeftColor: '#98be4e' },
  toastContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toastIcon: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  toastText: { color: '#1e293b', fontSize: 14, fontWeight: '600', flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',
    paddingTop: isWeb ? 20 : 50, paddingBottom: 16, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, marginLeft: 16 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  headerSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  addButton: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#006dab',
    alignItems: 'center', justifyContent: 'center',
  },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  content: { padding: isWeb ? 40 : 16, maxWidth: 900, width: '100%', alignSelf: 'center' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, padding: 14, borderRadius: 12, alignItems: 'center',
  },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 11, color: '#64748b', marginTop: 4 },
  searchSection: { marginBottom: 20 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',
    borderRadius: 12, paddingHorizontal: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  searchInput: { flex: 1, paddingVertical: 14, marginLeft: 12, fontSize: 16, color: '#0f172a' },
  filterScroll: { marginHorizontal: -16 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#ffffff', marginHorizontal: 4,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  filterChipActive: { backgroundColor: '#006dab', borderColor: '#006dab' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  filterChipTextActive: { color: '#ffffff' },
  resultCount: { fontSize: 13, color: '#64748b', marginBottom: 16 },
  userCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04,
    shadowRadius: 6, elevation: 1,
  },
  userCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  userAvatar: {
    width: 50, height: 50, borderRadius: 14, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center', marginRight: 14, position: 'relative',
  },
  userAvatarText: { fontSize: 16, fontWeight: '700', color: '#64748b' },
  statusDot: {
    position: 'absolute', bottom: 2, right: 2, width: 12, height: 12,
    borderRadius: 6, borderWidth: 2, borderColor: '#ffffff',
  },
  userMainInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  userEmail: { fontSize: 13, color: '#64748b', marginTop: 2 },
  partnerTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4,
    backgroundColor: '#fef2f2', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 6, alignSelf: 'flex-start',
  },
  partnerText: { fontSize: 11, color: '#ef4444', fontWeight: '600' },
  pairButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4,
    backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 6, alignSelf: 'flex-start',
  },
  pairButtonText: { fontSize: 11, color: '#006dab', fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  userMetrics: {
    flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#f1f5f9',
  },
  metricItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricValue: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  metricChange: { fontSize: 12, fontWeight: '600' },
  metricLabel: { fontSize: 11, color: '#94a3b8' },
  userCardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12,
  },
  lastActive: { fontSize: 12, color: '#94a3b8' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  modalClose: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },
  modalProfile: { alignItems: 'center', marginBottom: 24 },
  modalAvatar: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: '#006dab',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  modalAvatarText: { fontSize: 28, fontWeight: '700', color: '#ffffff' },
  modalName: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  modalEmail: { fontSize: 14, color: '#64748b', marginTop: 4 },
  statusBadgeLarge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, marginTop: 12 },
  statusTextLarge: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  modalSection: { marginBottom: 20 },
  modalSectionTitle: { fontSize: 14, fontWeight: '700', color: '#64748b', marginBottom: 12 },
  modalRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  modalRowText: { fontSize: 15, color: '#0f172a' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricBox: {
    flex: 1, minWidth: '45%', backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, alignItems: 'center',
  },
  metricBoxValue: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  metricBoxLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },
  progressItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  progressLabel: { width: 100, fontSize: 13, color: '#64748b' },
  progressBar: {
    flex: 1, height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#22c55e', borderRadius: 4 },
  progressValue: { width: 40, fontSize: 13, fontWeight: '600', color: '#0f172a', textAlign: 'right' },
  modalActions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  actionButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, gap: 6,
  },
  actionButtonText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  viewFullButton: { borderRadius: 12, overflow: 'hidden' },
  viewFullGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, gap: 8,
  },
  viewFullText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
});
