import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

// Auth storage keys - must match what login.tsx uses
const AUTH_KEYS = {
  USER_ROLE: 'userRole',
  COUPLE_ID: 'coupleId',
  USER_GENDER: 'userGender',
  USER_ID: 'userId',
  USER_NAME: 'userName',
  ADMIN_UID: 'adminUid',
  ADMIN_EMAIL: 'adminEmail',
  ADMIN_NAME: 'adminName',
  IS_SUPER_ADMIN: 'isSuperAdmin',
  QUICK_ACCESS_MODE: 'quickAccessMode',
  SESSION_EXPIRY: 'sessionExpiry',
  REMEMBER_ME: 'rememberMe',
} as const;

// Session durations
const SESSION_DURATION_REMEMBER_ME = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
const SESSION_DURATION_DEFAULT = 24 * 60 * 60 * 1000; // 24 hours in ms

// Role types
export type UserRole = 'user' | 'admin' | 'superadmin' | 'owner' | null;

// Auth state interface
interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userRole: UserRole;
  pendingSetup: string | null; // 'password-reset' | 'pin-setup' | null
  // User-specific data
  coupleId: string | null;
  userGender: 'male' | 'female' | null;
  userId: string | null;
  userName: string | null;
  // Admin-specific data
  adminUid: string | null;
  adminEmail: string | null;
  adminName: string | null;
  isSuperAdmin: boolean;
}

interface AuthContextType extends AuthState {
  login: (data: Partial<AuthState>, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuthState: () => Promise<void>;
  isAdminRole: () => boolean;
  isUserRole: () => boolean;
  setSessionExpiry: (rememberMe: boolean) => Promise<void>;
}

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  userRole: null,
  pendingSetup: null,
  coupleId: null,
  userGender: null,
  userId: null,
  userName: null,
  adminUid: null,
  adminEmail: null,
  adminName: null,
  isSuperAdmin: false,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(initialState);
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  // Load auth state from AsyncStorage on mount
  const loadAuthState = useCallback(async () => {
    try {
      const [
        userRole,
        coupleId,
        userGender,
        userId,
        userName,
        adminUid,
        adminEmail,
        adminName,
        isSuperAdmin,
        sessionExpiry,
        pendingSetup,
      ] = await Promise.all([
        AsyncStorage.getItem(AUTH_KEYS.USER_ROLE),
        AsyncStorage.getItem(AUTH_KEYS.COUPLE_ID),
        AsyncStorage.getItem(AUTH_KEYS.USER_GENDER),
        AsyncStorage.getItem(AUTH_KEYS.USER_ID),
        AsyncStorage.getItem(AUTH_KEYS.USER_NAME),
        AsyncStorage.getItem(AUTH_KEYS.ADMIN_UID),
        AsyncStorage.getItem(AUTH_KEYS.ADMIN_EMAIL),
        AsyncStorage.getItem(AUTH_KEYS.ADMIN_NAME),
        AsyncStorage.getItem(AUTH_KEYS.IS_SUPER_ADMIN),
        AsyncStorage.getItem(AUTH_KEYS.SESSION_EXPIRY),
        AsyncStorage.getItem('pendingSetup'),
      ]);

      // Check if session has expired
      // Allow partial auth state for profile selection flow (has coupleId but no userId yet)
      const hasPendingProfileSelection = await AsyncStorage.getItem('pendingProfileSelection');
      const hasQuickAccessMode = await AsyncStorage.getItem(AUTH_KEYS.QUICK_ACCESS_MODE);
      const isInProfileSelectionFlow = !!(userRole === 'user' && coupleId && (hasPendingProfileSelection || hasQuickAccessMode) && !userId);
      const hasValidSession = !!(userRole && (userId || adminUid || isInProfileSelectionFlow));
      const sessionExpired = sessionExpiry ? Date.now() > parseInt(sessionExpiry, 10) : false;
      
      if (hasValidSession && sessionExpired) {
        // Session expired - clear everything and redirect to login
        console.log('Session expired, clearing auth state');
        await AsyncStorage.multiRemove([
          AUTH_KEYS.USER_ROLE, AUTH_KEYS.COUPLE_ID, AUTH_KEYS.USER_GENDER,
          AUTH_KEYS.USER_ID, AUTH_KEYS.USER_NAME, AUTH_KEYS.ADMIN_UID,
          AUTH_KEYS.ADMIN_EMAIL, AUTH_KEYS.ADMIN_NAME, AUTH_KEYS.IS_SUPER_ADMIN,
          AUTH_KEYS.QUICK_ACCESS_MODE, AUTH_KEYS.SESSION_EXPIRY, AUTH_KEYS.REMEMBER_ME,
        ]);
        setAuthState({ ...initialState, isLoading: false });
        return;
      }

      const isAuthenticated = hasValidSession && !sessionExpired;

      setAuthState({
        isAuthenticated,
        isLoading: false,
        userRole: userRole as UserRole,
        pendingSetup,
        coupleId,
        userGender: userGender as 'male' | 'female' | null,
        userId,
        userName,
        adminUid,
        adminEmail,
        adminName,
        isSuperAdmin: isSuperAdmin === 'true',
      });
    } catch (error) {
      console.error('Error loading auth state:', error);
      setAuthState({ ...initialState, isLoading: false });
    }
  }, []);

  useEffect(() => {
    loadAuthState();
  }, [loadAuthState]);

  // Route protection logic
  useEffect(() => {
    if (!navigationState?.key || authState.isLoading) return;

    const firstSegment = segments[0] as string;
    
    // Check for pendingSetup flag - user is in password reset or PIN setup flow
    // Don't run any route protection when this flag is set (use sync state check)
    if (authState.pendingSetup) {
      // User is in setup flow - don't interfere with navigation
      return;
    }
    
    // Check if user is in profile selection flow (partial auth)
    // This happens when user started quick access but hasn't selected a profile yet
    const isInProfileSelectionFlow = authState.isAuthenticated && 
                                      authState.userRole === 'user' && 
                                      authState.coupleId && 
                                      !authState.userId;
    
    // Skip route protection for certain flows to avoid redirect conflicts
    const inAuthGroup = firstSegment === 'login' || 
                        firstSegment === 'admin-login' || 
                        firstSegment === 'get-started' ||
                        firstSegment === 'landing' ||
                        firstSegment === 'index' ||
                        firstSegment === 'reset-password' ||
                        firstSegment === 'questionnaire';
    
    const inUserGroup = firstSegment === 'user';
    const inAdminGroup = firstSegment === 'admin';

    // Not authenticated user trying to access protected routes
    if (!authState.isAuthenticated) {
      if (inUserGroup || inAdminGroup) {
        router.replace('/login');
        return;
      }
      // Don't redirect from auth pages if not authenticated - that's expected
      return;
    }
    
    // Profile selection flow - allow access to enter-pin and manage-pin without full auth
    if (isInProfileSelectionFlow) {
      if (inUserGroup) {
        const secondSegment = segments[1] as string;
        // Only allow enter-pin, manage-pin, and reset-password during profile selection
        if (secondSegment === 'enter-pin' || secondSegment === 'manage-pin') {
          return; // Allow access
        }
        // Block access to other user pages - redirect to enter-pin
        router.replace('/user/enter-pin');
        return;
      }
      // For partial auth users on auth pages (login, get-started, etc.) - DON'T redirect
      // They need to complete profile selection first, not go to home
      if (inAuthGroup) {
        return; // Allow them to stay on auth pages
      }
      return;
    }

    // Authenticated user (FULL auth, not partial) - handle redirects
    if (inAuthGroup) {
      // Only redirect from index/landing/get-started (entry points) if FULLY authenticated
      // Don't redirect from login as it handles its own navigation
      if (firstSegment === 'index' || firstSegment === 'landing' || firstSegment === 'get-started') {
        if (authState.userRole === 'user' && authState.userId) {
          router.replace('/user/home');
        } else if (['admin', 'superadmin', 'owner'].includes(authState.userRole || '')) {
          router.replace('/admin/home');
        }
      }
      return;
    }

    // User role trying to access admin routes
    if (authState.userRole === 'user' && inAdminGroup) {
      router.replace('/user/home');
      return;
    }

    // Admin role trying to access user routes
    if (['admin', 'superadmin', 'owner'].includes(authState.userRole || '') && inUserGroup) {
      router.replace('/admin/home');
      return;
    }
  }, [authState.isAuthenticated, authState.isLoading, authState.userRole, authState.userId, authState.pendingSetup, segments, navigationState?.key, router]);

  // Login function - saves to AsyncStorage
  const login = async (data: Partial<AuthState>, rememberMe: boolean = false) => {
    try {
      const updates: [string, string][] = [];

      if (data.userRole) updates.push([AUTH_KEYS.USER_ROLE, data.userRole]);
      if (data.coupleId) updates.push([AUTH_KEYS.COUPLE_ID, data.coupleId]);
      if (data.userGender) updates.push([AUTH_KEYS.USER_GENDER, data.userGender]);
      if (data.userId) updates.push([AUTH_KEYS.USER_ID, data.userId]);
      if (data.userName) updates.push([AUTH_KEYS.USER_NAME, data.userName]);
      if (data.adminUid) updates.push([AUTH_KEYS.ADMIN_UID, data.adminUid]);
      if (data.adminEmail) updates.push([AUTH_KEYS.ADMIN_EMAIL, data.adminEmail]);
      if (data.adminName) updates.push([AUTH_KEYS.ADMIN_NAME, data.adminName]);
      if (data.isSuperAdmin !== undefined) updates.push([AUTH_KEYS.IS_SUPER_ADMIN, String(data.isSuperAdmin)]);
      
      // Set session expiry based on rememberMe
      const sessionDuration = rememberMe ? SESSION_DURATION_REMEMBER_ME : SESSION_DURATION_DEFAULT;
      const expiryTime = Date.now() + sessionDuration;
      updates.push([AUTH_KEYS.SESSION_EXPIRY, String(expiryTime)]);
      updates.push([AUTH_KEYS.REMEMBER_ME, String(rememberMe)]);

      await AsyncStorage.multiSet(updates);

      setAuthState(prev => ({
        ...prev,
        ...data,
        isAuthenticated: true,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Error saving auth state:', error);
      throw error;
    }
  };

  // Logout function - clears all auth data
  const logout = async () => {
    try {
      // Clear all auth-related keys including session
      await AsyncStorage.multiRemove([
        AUTH_KEYS.USER_ROLE,
        AUTH_KEYS.COUPLE_ID,
        AUTH_KEYS.USER_GENDER,
        AUTH_KEYS.USER_ID,
        AUTH_KEYS.USER_NAME,
        AUTH_KEYS.ADMIN_UID,
        AUTH_KEYS.ADMIN_EMAIL,
        AUTH_KEYS.ADMIN_NAME,
        AUTH_KEYS.IS_SUPER_ADMIN,
        AUTH_KEYS.QUICK_ACCESS_MODE,
        AUTH_KEYS.SESSION_EXPIRY,
        AUTH_KEYS.REMEMBER_ME,
        // Also clear any cached data
        'userProfileImage',
        'lastLoginTime',
        'pendingProfileSelection',
      ]);

      setAuthState({ ...initialState, isLoading: false });
      
      // Navigate to login
      router.replace('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  };

  // Set session expiry (useful for extending session after PIN verification etc.)
  const setSessionExpiry = async (rememberMe: boolean) => {
    const sessionDuration = rememberMe ? SESSION_DURATION_REMEMBER_ME : SESSION_DURATION_DEFAULT;
    const expiryTime = Date.now() + sessionDuration;
    await AsyncStorage.setItem(AUTH_KEYS.SESSION_EXPIRY, String(expiryTime));
    await AsyncStorage.setItem(AUTH_KEYS.REMEMBER_ME, String(rememberMe));
  };

  // Refresh auth state from AsyncStorage
  const refreshAuthState = async () => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    await loadAuthState();
  };

  // Helper functions
  const isAdminRole = () => ['admin', 'superadmin', 'owner'].includes(authState.userRole || '');
  const isUserRole = () => authState.userRole === 'user';

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        logout,
        refreshAuthState,
        isAdminRole,
        isUserRole,
        setSessionExpiry,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
