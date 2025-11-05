// Firebase Configuration
// TODO: Replace with your actual Firebase config from Firebase Console

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBJ55SK7CRIB7gpVZ0FYvxVq7rqXYk205w",
  authDomain: "fit-for-baby.firebaseapp.com",
  projectId: "fit-for-baby",
  storageBucket: "fit-for-baby.firebasestorage.app",
  messagingSenderId: "322995357195",
  appId: "1:322995357195:web:3fb043ec69d23ad72b290e",
  measurementId: "G-4PR80EPMZQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Admin Login Function
export const loginAdmin = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log('Admin logged in:', user.email);
    return { success: true, user };
  } catch (error: any) {
    console.error('Login error:', error.message);
    
    // Handle specific error codes
    let errorMessage = 'Login failed. Please try again.';
    
    if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address.';
    } else if (error.code === 'auth/user-not-found') {
      errorMessage = 'No admin account found with this email.';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect password.';
    } else if (error.code === 'auth/invalid-credential') {
      errorMessage = 'Invalid email or password.';
    }
    
    return { success: false, error: errorMessage };
  }
};

// Logout Function
export const logoutAdmin = async () => {
  try {
    await auth.signOut();
    console.log('Admin logged out');
    return { success: true };
  } catch (error: any) {
    console.error('Logout error:', error.message);
    return { success: false, error: error.message };
  }
};

// Check if user is logged in
export const getCurrentUser = () => {
  return auth.currentUser;
};
