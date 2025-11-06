import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Animated, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

export default function DashboardScreen() {
  const router = useRouter();
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
      }).start(() => {
        setToast({ visible: false, message: '', type: '' });
      });
    }, 3000);
  };

  const handleLogout = () => {
    showToast('Logging out...', 'success');
    setTimeout(() => {
      router.replace('/login');
    }, 1000);
  };

  const statsData = [
    { id: 1, title: 'Total Patients', value: '245', change: '+12%', color: '#22c55e' },
    { id: 2, title: 'Active Cases', value: '128', change: '+8%', color: '#3b82f6' },
    { id: 3, title: 'Appointments', value: '32', change: '+24%', color: '#f59e0b' },
    { id: 4, title: 'Reports', value: '18', change: '+5%', color: '#8b5cf6' },
  ];

  return (
    <View style={styles.container}>
      {toast.visible && (
        <Animated.View 
          style={[
            styles.toast,
            toast.type === 'error' ? styles.toastError : styles.toastSuccess,
            { transform: [{ translateY: toastAnim }] }
          ]}
        >
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      )}

      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Image 
              source={require('../assets/logos/logo-icon.svg')}
              style={styles.logo}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.headerTitle}>Admin Dashboard</Text>
              <Text style={styles.headerSubtitle}>Manage your healthcare center</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#ef4444', '#dc2626']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.logoutGradient}
            >
              <Text style={styles.logoutButtonText}>Logout</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContent}>
          <View style={styles.statsGrid}>
            {statsData.map((stat) => (
              <TouchableOpacity key={stat.id} style={styles.statCard} activeOpacity={0.9}>
                <View style={[styles.statHeader, { borderLeftColor: stat.color }]}>
                  <Text style={styles.statTitle}>{stat.title}</Text>
                  <View style={[styles.changeTag, { backgroundColor: stat.color + '20' }]}>
                    <Text style={[styles.changeText, { color: stat.color }]}>{stat.change}</Text>
                  </View>
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>Total registered</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              <TouchableOpacity 
                style={styles.actionCard}
                activeOpacity={0.9}
                onPress={() => showToast('Add Patient feature coming soon!', 'success')}
              >
                <LinearGradient
                  colors={['#22c55e', '#16a34a']}
                  style={styles.actionIconGradient}
                >
                  <Text style={styles.actionIcon}>+</Text>
                </LinearGradient>
                <Text style={styles.actionTitle}>Add Patient</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard}
                activeOpacity={0.9}
                onPress={() => showToast('Nutrition Plan feature coming soon!', 'success')}
              >
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  style={styles.actionIconGradient}
                >
                  <Text style={styles.actionIcon}>📋</Text>
                </LinearGradient>
                <Text style={styles.actionTitle}>Nutrition Plan</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard}
                activeOpacity={0.9}
                onPress={() => showToast('Activity Log feature coming soon!', 'success')}
              >
                <LinearGradient
                  colors={['#f59e0b', '#d97706']}
                  style={styles.actionIconGradient}
                >
                  <Text style={styles.actionIcon}>📊</Text>
                </LinearGradient>
                <Text style={styles.actionTitle}>Activity Log</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard}
                activeOpacity={0.9}
                onPress={() => showToast('Generate Report feature coming soon!', 'success')}
              >
                <LinearGradient
                  colors={['#8b5cf6', '#7c3aed']}
                  style={styles.actionIconGradient}
                >
                  <Text style={styles.actionIcon}>📄</Text>
                </LinearGradient>
                <Text style={styles.actionTitle}>Reports</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.activityCard}>
              <View style={styles.activityItem}>
                <View style={[styles.activityDot, { backgroundColor: '#22c55e' }]} />
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>New patient registered</Text>
                  <Text style={styles.activityTime}>2 hours ago</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.activityItem}>
                <View style={[styles.activityDot, { backgroundColor: '#3b82f6' }]} />
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>Nutrition plan updated</Text>
                  <Text style={styles.activityTime}>5 hours ago</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.activityItem}>
                <View style={[styles.activityDot, { backgroundColor: '#f59e0b' }]} />
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>Appointment scheduled</Text>
                  <Text style={styles.activityTime}>1 day ago</Text>
                </View>
              </View>
            </View>
          </View>
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
    right: 20,
    left: 20,
    zIndex: 1000,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  toastError: {
    backgroundColor: '#ef4444',
  },
  toastSuccess: {
    backgroundColor: '#22c55e',
  },
  toastText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingTop: isWeb ? 20 : 50,
    paddingBottom: 20,
    paddingHorizontal: isWeb ? 40 : 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  logo: {
    width: 75,
    height: 75,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 4,
  },
  logoutButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  logoutGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  scrollContent: {
    padding: isWeb ? 40 : 24,
  },
  mainContent: {
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
    gap: 40,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isWeb ? 24 : 16,
  },
  statCard: {
    flex: isWeb ? 0 : 1,
    minWidth: isWeb ? 280 : 150,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingLeft: 12,
    borderLeftWidth: 4,
  },
  statTitle: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
  },
  changeTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  changeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  statValue: {
    fontSize: 42,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  section: {
    gap: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isWeb ? 24 : 16,
  },
  actionCard: {
    flex: isWeb ? 0 : 1,
    minWidth: isWeb ? 200 : 150,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  actionIconGradient: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  actionIcon: {
    fontSize: 32,
    color: '#ffffff',
    fontWeight: '800',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  activityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    gap: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingVertical: 16,
  },
  activityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 6,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  activityTime: {
    fontSize: 15,
    color: '#94a3b8',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
  },
});
