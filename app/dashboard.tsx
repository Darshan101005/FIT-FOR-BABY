import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { logoutAdmin } from '../services/firebase';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const containerWidth = isWeb ? Math.min(width * 0.95, 1200) : width;

export default function DashboardScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    await logoutAdmin();
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { width: containerWidth }]}>
        <View style={styles.headerLeft}>
          <Image 
            source={require('../assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.headerTitle}>Fit for Baby</Text>
            <Text style={styles.headerSubtitle}>Dashboard</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { width: containerWidth }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>✓ Login Successful!</Text>
          <Text style={styles.welcomeText}>Welcome to Fit for Baby Dashboard</Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Text style={styles.icon}>👥</Text>
            </View>
            <Text style={styles.cardTitle}>Patients</Text>
            <Text style={styles.cardValue}>0</Text>
            <Text style={styles.cardLabel}>Total Registered</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Text style={styles.icon}>🍎</Text>
            </View>
            <Text style={styles.cardTitle}>Nutrition</Text>
            <Text style={styles.cardValue}>0</Text>
            <Text style={styles.cardLabel}>Meal Logs</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Text style={styles.icon}>🚶‍♀️</Text>
            </View>
            <Text style={styles.cardTitle}>Activity</Text>
            <Text style={styles.cardValue}>0</Text>
            <Text style={styles.cardLabel}>Walk Records</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Text style={styles.icon}>📊</Text>
            </View>
            <Text style={styles.cardTitle}>Reports</Text>
            <Text style={styles.cardValue}>0</Text>
            <Text style={styles.cardLabel}>Generated</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Dashboard is ready!</Text>
          <Text style={styles.infoText}>
            Your authentication is working correctly. You can now start building features like patient management, nutrition tracking, and activity monitoring.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 40,
    height: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0066a1',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
    alignSelf: 'center',
  },
  welcomeCard: {
    backgroundColor: '#d1fae5',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 14,
    color: '#065f46',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    flex: 1,
    minWidth: isWeb ? 250 : '47%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 28,
  },
  cardTitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
    fontWeight: '500',
  },
  cardValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0066a1',
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 22,
  },
});
