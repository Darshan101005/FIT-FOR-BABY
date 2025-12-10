import { loginWithEmail, registerWithEmail } from '@/services/firebase';
import { adminService } from '@/services/firestore.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

// Owner configuration - change these for production
const OWNER_CONFIG = {
  email: 'darshanvenkatesan2005@gmail.com',
  password: 'Dar.1010',
  displayName: 'Darshan',
  phone: '9884671395',
};

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-setup owner account if it doesn't exist
  const setupOwnerIfNeeded = async (userUid: string, userEmail: string) => {
    // Check if this is the owner email and if owner document exists
    if (userEmail.toLowerCase() === OWNER_CONFIG.email.toLowerCase()) {
      const existingAdmin = await adminService.get(userUid);
      if (!existingAdmin) {
        // Create owner document in Firestore
        await adminService.create(userUid, {
          email: OWNER_CONFIG.email,
          firstName: OWNER_CONFIG.displayName.split(' ')[0] || OWNER_CONFIG.displayName,
          lastName: OWNER_CONFIG.displayName.split(' ')[1] || '',
          displayName: OWNER_CONFIG.displayName,
          phone: OWNER_CONFIG.phone,
          role: 'owner',
          password: OWNER_CONFIG.password, // Store for owner verification
          isActive: true,
          permissions: {
            canManageUsers: true,
            canManageAdmins: true,
            canViewReports: true,
            canSendNotifications: true,
            canManageAppointments: true,
            canAccessMonitoring: true,
            canManageContent: true,
          },
        });
        console.log('✅ Owner account created in Firestore');
      }
    }
  };

  const handleLogin = async () => {
    // Validation
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email');
      return;
    }

    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();

    try {
      // Try to login first
      let result = await loginWithEmail(normalizedEmail, password);
      
      // If login fails and this is the owner email, try to register first
      if (!result.success && normalizedEmail === OWNER_CONFIG.email.toLowerCase() && password === OWNER_CONFIG.password) {
        console.log('Owner not found in Auth, creating...');
        const registerResult = await registerWithEmail(OWNER_CONFIG.email, OWNER_CONFIG.password);
        if (registerResult.success && registerResult.user) {
          result = { success: true, user: registerResult.user };
          console.log('✅ Owner registered in Firebase Auth');
        }
      }
      
      if (!result.success) {
        Alert.alert('Login Failed', result.error || 'Invalid email or password');
        setLoading(false);
        return;
      }

      // Setup owner in Firestore if needed
      await setupOwnerIfNeeded(result.user!.uid, normalizedEmail);

      // Check if user is an admin in Firestore
      const adminData = await adminService.get(result.user!.uid);
      
      if (!adminData) {
        Alert.alert('Access Denied', 'You are not registered as an admin.');
        setLoading(false);
        return;
      }

      if (!adminData.isActive) {
        Alert.alert('Account Paused', 'Your admin account has been paused. Please contact the owner.');
        setLoading(false);
        return;
      }

      // Store admin info for access control
      const isSuperAdmin = adminData.role === 'superadmin' || adminData.role === 'owner';
      await AsyncStorage.setItem('isSuperAdmin', isSuperAdmin ? 'true' : 'false');
      await AsyncStorage.setItem('adminRole', adminData.role);
      await AsyncStorage.setItem('adminUid', adminData.uid);
      await AsyncStorage.setItem('adminEmail', adminData.email);
      
      // Construct admin name with fallbacks
      const adminName = adminData.displayName || 
        `${adminData.firstName || ''} ${adminData.lastName || ''}`.trim() || 
        'Admin';
      await AsyncStorage.setItem('adminName', adminName);

      // Update last login time
      await adminService.updateLastLogin(adminData.uid);

      setLoading(false);
      
      const roleLabel = adminData.role === 'owner' ? 'Owner' : 
                        adminData.role === 'superadmin' ? 'Super Admin' : 'Admin';
      Alert.alert('Success', `Welcome ${roleLabel}!`);
      router.replace('/admin/home');
      
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Error', error.message || 'An error occurred during login');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.formContainer}>
        {/* Header */}
        <Text style={styles.title}>Admin Login</Text>
        <Text style={styles.subtitle}>Fit For Baby - Nursing Dashboard</Text>

        {/* Email Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="admin@fitforbaby.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
        </View>

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />
        </View>

        {/* Login Button */}
        <TouchableOpacity 
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.loginButtonText}>
            {loading ? 'Logging in...' : 'Login'}
          </Text>
        </TouchableOpacity>

        {/* Info Text */}
        <Text style={styles.infoText}>
          Admin access only. Contact IT department for credentials.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 40,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#2c3e50',
  },
  loginButton: {
    backgroundColor: '#3498db',
    borderRadius: 10,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#3498db',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  loginButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 12,
    color: '#95a5a6',
  },
});
