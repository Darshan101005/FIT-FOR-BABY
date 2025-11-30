// Firebase Configuration with Emulator Support
// Switch between emulator and production by changing USE_EMULATOR flag

import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

// ============================================
// CONFIGURATION
// ============================================

// Set to true for local development, false for production
const USE_EMULATOR = __DEV__; // Automatically true in development

// Emulator host - use 10.0.2.2 for Android emulator, localhost for web/iOS
const getEmulatorHost = () => {
  if (Platform.OS === 'android') {
    return '10.0.2.2'; // Android emulator localhost
  }
  return 'localhost'; // iOS simulator and web
};

const EMULATOR_HOST = getEmulatorHost();

// Your Firebase production configuration
const firebaseConfig = {
  apiKey: "AIzaSyBJ55SK7CRIB7gpVZ0FYvxVq7rqXYk205w",
  authDomain: "fit-for-baby.firebaseapp.com",
  projectId: "fit-for-baby",
  storageBucket: "fit-for-baby.firebasestorage.app",
  messagingSenderId: "322995357195",
  appId: "1:322995357195:web:3fb043ec69d23ad72b290e",
  measurementId: "G-4PR80EPMZQ"
};

// ============================================
// INITIALIZE FIREBASE
// ============================================

const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Connect to emulators if in development
let emulatorsConnected = false;

export const connectToEmulators = () => {
  if (USE_EMULATOR && !emulatorsConnected) {
    try {
      connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, { disableWarnings: true });
      connectFirestoreEmulator(db, EMULATOR_HOST, 8080);
      connectStorageEmulator(storage, EMULATOR_HOST, 9199);
      emulatorsConnected = true;
      console.log('🔥 Connected to Firebase Emulators');
    } catch (error) {
      console.log('Emulators already connected or error:', error);
    }
  }
};

// Auto-connect to emulators in development
if (USE_EMULATOR) {
  connectToEmulators();
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

// Login with email and password
export const loginWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    console.error('Login error:', error.message);
    return { success: false, error: getAuthErrorMessage(error.code) };
  }
};

// Register new user
export const registerWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    console.error('Registration error:', error.message);
    return { success: false, error: getAuthErrorMessage(error.code) };
  }
};

// Logout
export const logout = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    console.error('Logout error:', error.message);
    return { success: false, error: error.message };
  }
};

// Reset password
export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error: any) {
    console.error('Password reset error:', error.message);
    return { success: false, error: getAuthErrorMessage(error.code) };
  }
};

// Get current user
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Auth error message helper
const getAuthErrorMessage = (code: string): string => {
  switch (code) {
    case 'auth/invalid-email':
      return 'Invalid email address.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    default:
      return 'An error occurred. Please try again.';
  }
};

// ============================================
// LEGACY ADMIN FUNCTIONS (for backward compatibility)
// ============================================

export const loginAdmin = loginWithEmail;
export const logoutAdmin = logout;
