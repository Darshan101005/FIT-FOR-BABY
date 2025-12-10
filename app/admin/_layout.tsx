import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, usePathname, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Image,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { supportRequestService } from '../../services/firestore.service';

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

interface NavItem {
  id: string;
  label: string;
  icon: string;
  iconFamily: 'Ionicons' | 'MaterialCommunityIcons';
  route: string;
  badge?: number;
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'grid-outline',
    iconFamily: 'Ionicons',
    route: '/admin/home',
  },
  {
    id: 'users',
    label: 'User Management',
    icon: 'people-outline',
    iconFamily: 'Ionicons',
    route: '/admin/users',
  },
  {
    id: 'appointments',
    label: 'Appointments',
    icon: 'calendar-outline',
    iconFamily: 'Ionicons',
    route: '/admin/appointments',
  },
  {
    id: 'tasks',
    label: 'Tasks & Goals',
    icon: 'target',
    iconFamily: 'MaterialCommunityIcons',
    route: '/admin/tasks',
  },
  {
    id: 'monitoring',
    label: 'Monitoring',
    icon: 'analytics-outline',
    iconFamily: 'Ionicons',
    route: '/admin/monitoring',
  },
  {
    id: 'questionnaire',
    label: 'Questionnaires',
    icon: 'clipboard-list-outline',
    iconFamily: 'MaterialCommunityIcons',
    route: '/admin/questionnaire',
  },
  {
    id: 'communication',
    label: 'Communication',
    icon: 'chatbubbles-outline',
    iconFamily: 'Ionicons',
    route: '/admin/communication',
  },
  {
    id: 'requested-calls',
    label: 'Requested Calls',
    icon: 'call-outline',
    iconFamily: 'Ionicons',
    route: '/admin/requested-calls',
  },
];

const isWeb = Platform.OS === 'web';

// Loading screen for auth check
function AuthLoadingScreen() {
  return (
    <View style={authStyles.loadingContainer}>
      <Image
        source={require('../../assets/logos/fit_for_baby_horizontal.png')}
        style={authStyles.logo}
        resizeMode="contain"
      />
      <Text style={authStyles.loadingTitle}>Fit for Baby</Text>
      <Text style={authStyles.loadingSubtitle}>Admin Portal</Text>
      <ActivityIndicator size="large" color="#006dab" style={authStyles.spinner} />
      <Text style={authStyles.loadingText}>Verifying admin access...</Text>
    </View>
  );
}

const authStyles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#006dab',
    marginBottom: 4,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
  },
  spinner: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
  },
});

export default function AdminLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { width: screenWidth } = useWindowDimensions();
  const { isAuthenticated, isLoading: authLoading, userRole, logout } = useAuth();
  const insets = useSafeAreaInsets();
  
  // Responsive breakpoints
  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1024;
  const isDesktop = screenWidth >= 1024;
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isTablet);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  
  // Logged-in admin info
  const [adminName, setAdminName] = useState('Admin');
  const [adminRole, setAdminRole] = useState('admin');
  const [adminInitials, setAdminInitials] = useState('AD');
  const [requestedCallsCount, setRequestedCallsCount] = useState<number>(0);

  // Auth protection - redirect if not authenticated or not an admin
  useEffect(() => {
    if (!authLoading) {
      const isAdmin = ['admin', 'superadmin', 'owner'].includes(userRole || '');
      
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (!isAdmin) {
        // User trying to access admin routes
        router.replace('/user/home');
      }
    }
  }, [isAuthenticated, authLoading, userRole, router]);

  useEffect(() => {
    loadAdminInfo();
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadCount = async () => {
      try {
        const requests = await supportRequestService.getAll();
        if (!mounted) return;
        const pending = requests.filter((r: any) => r.status === 'pending').length;
        setRequestedCallsCount(pending);
      } catch (err) {
        console.error('Error loading requested calls count:', err);
      }
    };

    loadCount();
    const iv = setInterval(loadCount, 15000); // refresh every 15s
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  const loadAdminInfo = async () => {
    try {
      const name = await AsyncStorage.getItem('adminName');
      const role = await AsyncStorage.getItem('userRole');
      if (name) {
        setAdminName(name);
        const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
        setAdminInitials(initials || 'AD');
      }
      if (role) {
        setAdminRole(role);
      }
    } catch (error) {
      console.error('Error loading admin info:', error);
    }
  };

  const isActive = (route: string) => pathname === route || pathname.startsWith(route + '/');

  const handleNavigation = (route: string) => {
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
    router.push(route as any);
  };

  const handleLogout = async () => {
    try {
      await logout(); // This clears AsyncStorage and navigates to login
    } catch (error) {
      console.error('Error during logout:', error);
      // Fallback - navigate anyway
      router.replace('/login');
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return <AuthLoadingScreen />;
  }

  // Don't render if not authenticated or wrong role
  const isAdmin = ['admin', 'superadmin', 'owner'].includes(userRole || '');
  if (!isAuthenticated || !isAdmin) {
    return <AuthLoadingScreen />;
  }

  const renderNavItem = (item: NavItem, collapsed: boolean = false) => {
    const active = isActive(item.route);
    const IconComponent = item.iconFamily === 'Ionicons' ? Ionicons : MaterialCommunityIcons;

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.navItem,
          active && styles.navItemActive,
          collapsed && styles.navItemCollapsed,
        ]}
        onPress={() => handleNavigation(item.route)}
        activeOpacity={0.7}
      >
        <View style={[styles.navIconContainer, active && styles.navIconContainerActive]}>
          <IconComponent
            name={item.icon as any}
            size={22}
            color={active ? COLORS.primary : COLORS.textSecondary}
          />
        </View>
        {!collapsed && (
          <Text style={[styles.navLabel, active && styles.navLabelActive]}>
            {item.label}
          </Text>
        )}
        {(!collapsed) && (() => {
          const badgeNumber = item.id === 'requested-calls' ? requestedCallsCount : item.badge;
          return badgeNumber ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeNumber}</Text>
            </View>
          ) : null;
        })()}
      </TouchableOpacity>
    );
  };

  // Desktop/Tablet Sidebar
  const renderSidebar = () => (
    <View style={[
      styles.sidebar,
      sidebarCollapsed && styles.sidebarCollapsed,
    ]}>
      {/* Logo Header */}
      <View style={styles.sidebarHeader}>
        <Image
          source={require('../../assets/logos/logo-icon-alt.svg')}
          style={styles.logo}
          resizeMode="contain"
        />
        {!sidebarCollapsed && (
          <View style={styles.logoText}>
            <Text style={styles.appName}>Fit for Baby</Text>
            <Text style={styles.appSubtitle}>Admin Portal</Text>
          </View>
        )}
        {isTablet && (
          <TouchableOpacity
            style={styles.collapseButton}
            onPress={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <Ionicons
              name={sidebarCollapsed ? 'chevron-forward' : 'chevron-back'}
              size={18}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Navigation Items */}
      <ScrollView style={styles.navContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.navSection}>
          {!sidebarCollapsed && <Text style={styles.navSectionTitle}>MAIN MENU</Text>}
          {navItems.map((item) => renderNavItem(item, sidebarCollapsed))}
        </View>
      </ScrollView>

      {/* User Profile Section */}
      <View style={styles.sidebarFooter}>
        <TouchableOpacity style={[styles.profileSection, sidebarCollapsed && styles.profileSectionCollapsed]}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitials}>{adminInitials}</Text>
          </View>
          {!sidebarCollapsed && (
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{adminName}</Text>
              <View style={styles.onlineStatus}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Online</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.logoutButton, sidebarCollapsed && styles.logoutButtonCollapsed]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          {!sidebarCollapsed && <Text style={styles.logoutText}>Logout</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  // Mobile Drawer
  const renderMobileDrawer = () => (
    <>
      {mobileDrawerOpen && (
        <Pressable
          style={styles.drawerOverlay}
          onPress={() => setMobileDrawerOpen(false)}
        />
      )}
      <Animated.View style={[
        styles.mobileDrawer,
        { transform: [{ translateX: mobileDrawerOpen ? 0 : -300 }] },
      ]}>
        {/* Drawer Header */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.drawerHeader}
        >
          <View style={styles.drawerHeaderContent}>
            <Image
              source={require('../../assets/logos/logo-icon-alt.svg')}
              style={styles.drawerLogo}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.drawerAppName}>Fit for Baby</Text>
              <Text style={styles.drawerAppSubtitle}>Admin Portal</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.drawerCloseButton}
            onPress={() => setMobileDrawerOpen(false)}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Drawer Navigation */}
        <ScrollView style={styles.drawerNav}>
          {navItems.map((item) => renderNavItem(item, false))}
        </ScrollView>

        {/* Drawer Footer */}
        <View style={styles.drawerFooter}>
          <TouchableOpacity style={styles.drawerProfileSection}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileInitials}>{adminInitials}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{adminName}</Text>
              <View style={styles.onlineStatus}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Online</Text>
              </View>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.drawerLogoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </>
  );

  // Mobile Header
  const renderMobileHeader = () => (
    <View style={styles.mobileHeader}>
      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setMobileDrawerOpen(true)}
      >
        <Ionicons name="menu" size={24} color={COLORS.textPrimary} />
      </TouchableOpacity>
      <View style={styles.mobileHeaderCenter}>
        <Image
          source={require('../../assets/logos/logo-icon-alt.svg')}
          style={styles.mobileHeaderLogo}
          resizeMode="contain"
        />
        <Text style={styles.mobileHeaderTitle}>Admin</Text>
      </View>
      <TouchableOpacity style={styles.notificationButton}>
        <Ionicons name="notifications-outline" size={24} color={COLORS.textPrimary} />
        <View style={styles.notificationBadge}>
          <Text style={styles.notificationBadgeText}>3</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  // Mobile Bottom Navigation
  const renderMobileBottomNav = () => (
    <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {navItems.slice(0, 5).map((item) => {
        const active = isActive(item.route);
        const IconComponent = item.iconFamily === 'Ionicons' ? Ionicons : MaterialCommunityIcons;
        
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.bottomNavItem}
            onPress={() => handleNavigation(item.route)}
          >
            <IconComponent
              name={item.icon as any}
              size={22}
              color={active ? COLORS.primary : COLORS.textMuted}
            />
            <Text style={[
              styles.bottomNavLabel,
              active && styles.bottomNavLabelActive,
            ]}>
              {item.label.split(' ')[0]}
            </Text>
            {active && <View style={styles.bottomNavIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Desktop/Tablet: Sidebar */}
      {!isMobile && renderSidebar()}
      
      {/* Mobile: Drawer */}
      {isMobile && renderMobileDrawer()}

      {/* Main Content Area */}
      <View style={[
        styles.mainContent,
        !isMobile && !sidebarCollapsed && styles.mainContentWithSidebar,
        !isMobile && sidebarCollapsed && styles.mainContentWithCollapsedSidebar,
      ]}>
        {/* Mobile Header */}
        {isMobile && renderMobileHeader()}

        {/* Stack Navigator for Admin Pages */}
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: COLORS.background },
          }}
        >
          <Stack.Screen name="home" />
          <Stack.Screen name="users" />
          <Stack.Screen name="questionnaire" />
          <Stack.Screen name="tasks" />
          <Stack.Screen name="monitoring" />
          <Stack.Screen name="communication" />
          <Stack.Screen name="user-dashboard" />
        </Stack>

        {/* Mobile Bottom Navigation */}
        {isMobile && renderMobileBottomNav()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    // For mobile web browsers, use min-height with dvh (dynamic viewport height)
    ...(isWeb && {
      minHeight: '100dvh' as any,
      height: '100dvh' as any,
    }),
  },

  // Sidebar Styles
  sidebar: {
    width: 260,
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    paddingTop: isWeb ? 0 : 50,
  },
  sidebarCollapsed: {
    width: 80,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: 12,
  },
  logo: {
    width: 44,
    height: 44,
  },
  logoText: {
    flex: 1,
  },
  appName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  appSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  collapseButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },
  navSection: {
    paddingVertical: 16,
  },
  navSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 12,
    marginLeft: 12,
    letterSpacing: 0.5,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
    gap: 12,
  },
  navItemActive: {
    backgroundColor: COLORS.primary + '10',
  },
  navItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  navIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.borderLight,
  },
  navIconContainerActive: {
    backgroundColor: COLORS.primary + '20',
  },
  navLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  navLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  sidebarFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.borderLight,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  profileSectionCollapsed: {
    justifyContent: 'center',
    padding: 8,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitials: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  onlineText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  logoutButtonCollapsed: {
    padding: 8,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.error,
  },

  // Mobile Drawer Styles
  drawerOverlay: {
    // Use fixed position for web to ensure overlay covers entire viewport
    ...(isWeb ? {
      position: 'fixed' as any,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 100,
    } : {
      position: 'absolute' as any,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 100,
    }),
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  mobileDrawer: {
    // Use fixed position for web to ensure drawer stays in place
    ...(isWeb ? {
      position: 'fixed' as any,
      top: 0,
      left: 0,
      bottom: 0,
      width: 280,
      zIndex: 101,
    } : {
      position: 'absolute' as any,
      top: 0,
      left: 0,
      bottom: 0,
      width: 280,
      zIndex: 101,
    }),
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  drawerHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  drawerLogo: {
    width: 40,
    height: 40,
  },
  drawerAppName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  drawerAppSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  drawerCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerNav: {
    flex: 1,
    padding: 16,
  },
  drawerFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  drawerProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.borderLight,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  drawerLogoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },

  // Mobile Header Styles
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileHeaderCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mobileHeaderLogo: {
    width: 32,
    height: 32,
  },
  mobileHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.error,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },

  // Bottom Navigation Styles
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    // Use fixed position for web to prevent nav bar moving when URL bar appears/disappears
    ...(isWeb && {
      position: 'fixed' as any,
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
    }),
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  bottomNavLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  bottomNavLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  bottomNavIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 20,
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },

  // Main Content Styles
  mainContent: {
    flex: 1,
    backgroundColor: COLORS.background,
    // Add padding bottom on mobile web to account for fixed bottom nav
    ...(isWeb && {
      paddingBottom: 70,
    }),
  },
  mainContentWithSidebar: {
    marginLeft: 0,
  },
  mainContentWithCollapsedSidebar: {
    marginLeft: 0,
  },
});
