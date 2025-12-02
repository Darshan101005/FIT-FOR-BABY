import { useTheme } from '@/context/ThemeContext';
import { broadcastService } from '@/services/firestore.service';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';

const BROADCASTS_READ_KEY = 'broadcasts_last_read_timestamp';

interface TabItem {
  name: string;
  label: string;
  mobileLabel?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFilled: keyof typeof Ionicons.glyphMap;
  route: string;
  showBadge?: boolean;
}

const tabs: TabItem[] = [
  {
    name: 'home',
    label: 'Home',
    icon: 'home-outline',
    iconFilled: 'home',
    route: '/user/home',
  },
  {
    name: 'progress',
    label: 'Progress',
    icon: 'stats-chart-outline',
    iconFilled: 'stats-chart',
    route: '/user/progress',
  },
  {
    name: 'appointments',
    label: 'Appointments',
    mobileLabel: 'Schedule',
    icon: 'calendar-outline',
    iconFilled: 'calendar',
    route: '/user/appointments',
  },
  {
    name: 'messages',
    label: 'Messages',
    icon: 'chatbubbles-outline',
    iconFilled: 'chatbubbles',
    route: '/user/messages',
    showBadge: true,
  },
  {
    name: 'profile',
    label: 'Profile',
    icon: 'person-outline',
    iconFilled: 'person',
    route: '/user/profile',
  },
];

export default function BottomNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { colors } = useTheme();
  const [unreadBroadcastCount, setUnreadBroadcastCount] = useState(0);

  // Fetch unread broadcast count for badge
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const broadcasts = await broadcastService.getActive();
        
        // Check last read timestamp to determine unread count
        const lastReadStr = await AsyncStorage.getItem(BROADCASTS_READ_KEY);
        const lastReadTime = lastReadStr ? parseInt(lastReadStr) : 0;
        
        // Count broadcasts created after last read time
        const unreadCount = broadcasts.filter(b => {
          const createdAt = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt as any);
          return createdAt.getTime() > lastReadTime;
        }).length;
        
        setUnreadBroadcastCount(unreadCount);
      } catch (error) {
        console.error('Error fetching broadcast count:', error);
      }
    };

    fetchUnreadCount();
    
    // Refresh count every 30 seconds to catch when user reads messages
    const interval = setInterval(fetchUnreadCount, 30 * 1000);
    return () => clearInterval(interval);
  }, [pathname]); // Re-fetch when pathname changes (user navigates)

  const isActive = (route: string) => {
    // Check if the current path matches or starts with the route
    if (pathname === route) return true;
    return false;
  };

  const getActiveTabName = () => {
    if (pathname === '/user/home') return 'home';
    if (pathname === '/user/progress') return 'progress';
    if (pathname === '/user/appointments') return 'appointments';
    if (pathname === '/user/messages') return 'messages';
    if (pathname === '/user/profile') return 'profile';
    return 'home';
  };

  const activeTabName = getActiveTabName();

  return (
    <View style={[
      styles.container, 
      isMobile && styles.containerMobile,
      { backgroundColor: colors.tabBar, borderTopColor: colors.tabBarBorder }
    ]}>
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const active = activeTabName === tab.name;
          
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tabItem}
              onPress={() => router.push(tab.route as any)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.iconContainer, 
                active && { backgroundColor: colors.primary + '15' }
              ]}>
                <Ionicons
                  name={active ? tab.iconFilled : tab.icon}
                  size={active ? 26 : 24}
                  color={active ? colors.primary : colors.textMuted}
                />
                {tab.showBadge && unreadBroadcastCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadBroadcastCount > 9 ? '9+' : unreadBroadcastCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[
                styles.tabLabel, 
                { color: colors.textMuted },
                active && { color: colors.primary, fontWeight: '600' }
              ]}>
                {isMobile && tab.mobileLabel ? tab.mobileLabel : tab.label}
              </Text>
              {active && <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 10,
  },
  containerMobile: {
    paddingBottom: Platform.OS === 'ios' ? 25 : 8,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 10,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
    position: 'relative',
  },
  iconContainer: {
    padding: 6,
    borderRadius: 16,
    marginBottom: 2,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -6,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
