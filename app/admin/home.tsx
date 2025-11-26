import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
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
  partner?: string;
  status: 'active' | 'inactive' | 'pending';
  joinDate: string;
  lastActive: string;
  questionnaire: number;
  weight: { current: number; start: number; target: number };
  steps: { avg: number; target: number };
}

const mockUsers: User[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    partner: 'Sarah Doe',
    status: 'active',
    joinDate: '2024-10-01',
    lastActive: '2024-11-25',
    questionnaire: 100,
    weight: { current: 85, start: 92, target: 80 },
    steps: { avg: 8500, target: 10000 },
  },
  {
    id: '2',
    name: 'Sarah Doe',
    email: 'sarah@example.com',
    partner: 'John Doe',
    status: 'active',
    joinDate: '2024-10-01',
    lastActive: '2024-11-25',
    questionnaire: 100,
    weight: { current: 78, start: 85, target: 70 },
    steps: { avg: 9200, target: 10000 },
  },
  {
    id: '3',
    name: 'Raj Kumar',
    email: 'raj@example.com',
    partner: 'Priya Kumar',
    status: 'active',
    joinDate: '2024-10-15',
    lastActive: '2024-11-24',
    questionnaire: 100,
    weight: { current: 95, start: 100, target: 85 },
    steps: { avg: 6500, target: 10000 },
  },
  {
    id: '4',
    name: 'Priya Kumar',
    email: 'priya@example.com',
    partner: 'Raj Kumar',
    status: 'inactive',
    joinDate: '2024-10-15',
    lastActive: '2024-11-10',
    questionnaire: 75,
    weight: { current: 72, start: 75, target: 65 },
    steps: { avg: 4200, target: 10000 },
  },
  {
    id: '5',
    name: 'Anand M',
    email: 'anand@example.com',
    status: 'pending',
    joinDate: '2024-11-20',
    lastActive: '2024-11-20',
    questionnaire: 25,
    weight: { current: 88, start: 88, target: 75 },
    steps: { avg: 0, target: 10000 },
  },
];

const dashboardStats = {
  totalUsers: 124,
  activeUsers: 98,
  avgWeightLoss: 4.2,
  avgStepsPerDay: 7850,
  appointmentsToday: 8,
  pendingQuestionnaires: 12,
};

export default function AdminHomeScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');

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

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>Manage users & monitor progress</Text>
        </View>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="notifications-outline" size={22} color="#0f172a" />
          <View style={styles.notificationBadge}>
            <Text style={styles.badgeText}>3</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.adminAvatar}>
          <Text style={styles.adminAvatarText}>AD</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStatCards = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <LinearGradient colors={['#006dab', '#005a8f']} style={styles.statGradient}>
            <MaterialCommunityIcons name="account-group" size={28} color="#fff" />
            <Text style={styles.statValue}>{dashboardStats.totalUsers}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </LinearGradient>
        </View>
        <View style={styles.statCard}>
          <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.statGradient}>
            <MaterialCommunityIcons name="account-check" size={28} color="#fff" />
            <Text style={styles.statValue}>{dashboardStats.activeUsers}</Text>
            <Text style={styles.statLabel}>Active Users</Text>
          </LinearGradient>
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.statGradient}>
            <MaterialCommunityIcons name="scale-bathroom" size={28} color="#fff" />
            <Text style={styles.statValue}>{dashboardStats.avgWeightLoss} kg</Text>
            <Text style={styles.statLabel}>Avg Weight Loss</Text>
          </LinearGradient>
        </View>
        <View style={styles.statCard}>
          <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.statGradient}>
            <MaterialCommunityIcons name="walk" size={28} color="#fff" />
            <Text style={styles.statValue}>{(dashboardStats.avgStepsPerDay / 1000).toFixed(1)}k</Text>
            <Text style={styles.statLabel}>Avg Steps/Day</Text>
          </LinearGradient>
        </View>
      </View>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActionsSection}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickActionsScroll}>
        <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/admin/users' as any)}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#dbeafe' }]}>
            <Ionicons name="people" size={24} color="#3b82f6" />
          </View>
          <Text style={styles.quickActionLabel}>Manage Users</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/admin/goals' as any)}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#dcfce7' }]}>
            <Ionicons name="flag" size={24} color="#22c55e" />
          </View>
          <Text style={styles.quickActionLabel}>Set Goals</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/admin/reports' as any)}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#fef3c7' }]}>
            <Ionicons name="stats-chart" size={24} color="#f59e0b" />
          </View>
          <Text style={styles.quickActionLabel}>View Reports</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#ede9fe' }]}>
            <Ionicons name="download" size={24} color="#8b5cf6" />
          </View>
          <Text style={styles.quickActionLabel}>Export Data</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#fee2e2' }]}>
            <Ionicons name="calendar" size={24} color="#ef4444" />
          </View>
          <Text style={styles.quickActionLabel}>Appointments</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderSearchAndFilter = () => (
    <View style={styles.searchSection}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search users..."
          placeholderTextColor="#94a3b8"
        />
        {searchQuery && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.filterTabs}>
        {(['all', 'active', 'inactive', 'pending'] as const).map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.filterTab, filterStatus === status && styles.filterTabActive]}
            onPress={() => setFilterStatus(status)}
          >
            <Text style={[styles.filterTabText, filterStatus === status && styles.filterTabTextActive]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderUsersList = () => (
    <View style={styles.usersSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Users ({filteredUsers.length})</Text>
        <TouchableOpacity style={styles.viewAllButton} onPress={() => router.push('/admin/users' as any)}>
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="arrow-forward" size={16} color="#006dab" />
        </TouchableOpacity>
      </View>

      {filteredUsers.map((user) => (
        <TouchableOpacity key={user.id} style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {user.name.split(' ').map(n => n[0]).join('')}
            </Text>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(user.status) }]} />
          </View>
          <View style={styles.userInfo}>
            <View style={styles.userHeader}>
              <Text style={styles.userName}>{user.name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(user.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(user.status) }]}>
                  {user.status}
                </Text>
              </View>
            </View>
            <Text style={styles.userEmail}>{user.email}</Text>
            {user.partner && (
              <View style={styles.partnerBadge}>
                <Ionicons name="heart" size={12} color="#ef4444" />
                <Text style={styles.partnerName}>Paired with {user.partner}</Text>
              </View>
            )}
            <View style={styles.userStats}>
              <View style={styles.userStat}>
                <MaterialCommunityIcons name="scale-bathroom" size={14} color="#64748b" />
                <Text style={styles.userStatText}>
                  -{(user.weight.start - user.weight.current).toFixed(1)} kg
                </Text>
              </View>
              <View style={styles.userStat}>
                <MaterialCommunityIcons name="walk" size={14} color="#64748b" />
                <Text style={styles.userStatText}>
                  {(user.steps.avg / 1000).toFixed(1)}k avg
                </Text>
              </View>
              <View style={styles.userStat}>
                <MaterialCommunityIcons name="clipboard-check" size={14} color="#64748b" />
                <Text style={styles.userStatText}>{user.questionnaire}%</Text>
              </View>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderAlerts = () => (
    <View style={styles.alertsSection}>
      <Text style={styles.sectionTitle}>Alerts & Notifications</Text>
      
      <View style={styles.alertCard}>
        <View style={[styles.alertIcon, { backgroundColor: '#fee2e2' }]}>
          <Ionicons name="warning" size={20} color="#ef4444" />
        </View>
        <View style={styles.alertContent}>
          <Text style={styles.alertTitle}>12 users haven't logged in 7+ days</Text>
          <Text style={styles.alertTime}>Requires attention</Text>
        </View>
        <TouchableOpacity style={styles.alertAction}>
          <Text style={styles.alertActionText}>View</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.alertCard}>
        <View style={[styles.alertIcon, { backgroundColor: '#fef3c7' }]}>
          <Ionicons name="document-text" size={20} color="#f59e0b" />
        </View>
        <View style={styles.alertContent}>
          <Text style={styles.alertTitle}>{dashboardStats.pendingQuestionnaires} pending questionnaires</Text>
          <Text style={styles.alertTime}>Users need reminders</Text>
        </View>
        <TouchableOpacity style={styles.alertAction}>
          <Text style={styles.alertActionText}>Send</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.alertCard}>
        <View style={[styles.alertIcon, { backgroundColor: '#dbeafe' }]}>
          <Ionicons name="calendar" size={20} color="#3b82f6" />
        </View>
        <View style={styles.alertContent}>
          <Text style={styles.alertTitle}>{dashboardStats.appointmentsToday} appointments today</Text>
          <Text style={styles.alertTime}>Next at 10:00 AM</Text>
        </View>
        <TouchableOpacity style={styles.alertAction}>
          <Text style={styles.alertActionText}>View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {renderStatCards()}
          {renderQuickActions()}
          {renderSearchAndFilter()}
          {renderUsersList()}
          {renderAlerts()}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingTop: isWeb ? 20 : 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  headerSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#ef4444',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  adminAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#006dab',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminAvatarText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  content: {
    padding: isWeb ? 40 : 16,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  statsContainer: { gap: 12, marginBottom: 24 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statGradient: {
    padding: 16,
    alignItems: 'center',
  },
  statValue: { fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 8 },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  quickActionsSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  quickActionsScroll: { marginHorizontal: -16 },
  quickAction: {
    alignItems: 'center',
    marginHorizontal: 8,
    width: 80,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', textAlign: 'center' },
  searchSection: { marginBottom: 24 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    marginLeft: 12,
    fontSize: 16,
    color: '#0f172a',
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  filterTabActive: {
    backgroundColor: '#006dab',
  },
  filterTabText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  filterTabTextActive: { color: '#ffffff' },
  usersSection: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: { fontSize: 14, fontWeight: '600', color: '#006dab' },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    position: 'relative',
  },
  userAvatarText: { fontSize: 16, fontWeight: '700', color: '#64748b' },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  userInfo: { flex: 1 },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  userName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  userEmail: { fontSize: 13, color: '#64748b' },
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  partnerName: { fontSize: 11, color: '#94a3b8' },
  userStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  userStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userStatText: { fontSize: 12, color: '#64748b' },
  alertsSection: { marginBottom: 24 },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  alertTime: { fontSize: 12, color: '#64748b', marginTop: 2 },
  alertAction: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  alertActionText: { fontSize: 13, fontWeight: '600', color: '#006dab' },
});
