import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';

const PRIMARY = '#006dab';
const ACCENT = '#98be4e';

interface TabItem {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFilled: keyof typeof Ionicons.glyphMap;
  route: string;
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
    name: 'logs',
    label: 'Logs',
    icon: 'journal-outline',
    iconFilled: 'journal',
    route: '/user/log-food',
  },
  {
    name: 'progress',
    label: 'Progress',
    icon: 'stats-chart-outline',
    iconFilled: 'stats-chart',
    route: '/user/progress',
  },
  {
    name: 'messages',
    label: 'Messages',
    icon: 'chatbubbles-outline',
    iconFilled: 'chatbubbles',
    route: '/user/messages',
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

  const isActive = (route: string) => {
    // Check if the current path matches or starts with the route
    if (pathname === route) return true;
    // Handle special cases for nested routes
    if (route === '/user/log-food' && pathname.startsWith('/user/log-')) return true;
    return false;
  };

  const getActiveTabName = () => {
    if (pathname.startsWith('/user/log-')) return 'logs';
    if (pathname === '/user/home') return 'home';
    if (pathname === '/user/progress') return 'progress';
    if (pathname === '/user/messages') return 'messages';
    if (pathname === '/user/profile') return 'profile';
    if (pathname === '/user/appointments') return 'home';
    return 'home';
  };

  const activeTabName = getActiveTabName();

  return (
    <View style={[styles.container, isMobile && styles.containerMobile]}>
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
              <View style={[styles.iconContainer, active && styles.iconContainerActive]}>
                <Ionicons
                  name={active ? tab.iconFilled : tab.icon}
                  size={active ? 26 : 24}
                  color={active ? PRIMARY : '#6b7280'}
                />
              </View>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.label}
              </Text>
              {active && <View style={styles.activeIndicator} />}
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
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
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
  },
  iconContainerActive: {
    backgroundColor: `${PRIMARY}10`,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 2,
  },
  tabLabelActive: {
    color: PRIMARY,
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: PRIMARY,
  },
});
