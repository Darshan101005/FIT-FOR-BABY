import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
    Animated,
    BackHandler,
    Dimensions,
    Easing,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { height } = Dimensions.get('window');

// --- Custom Pulsing Circle Component ---
const PulsingCircle = ({ delay }: { delay: number }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, [anim, delay]);

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0],
  });

  return (
    <Animated.View
      style={[
        styles.pulseCircle,
        {
          transform: [{ scale }],
          opacity,
        },
      ]}
    />
  );
};

interface OfflineModalProps {
  visible: boolean;
  onExit: () => void;
}

export default function OfflineModal({ visible, onExit }: OfflineModalProps) {
  const [fontsLoaded] = useFonts(Ionicons.font);
  const slideAnim = useRef(new Animated.Value(height)).current;
  const router = useRouter();

  useEffect(() => {
    if (visible) {
      // Slide Up (Spring Physics)
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 15,
        stiffness: 100,
        useNativeDriver: true,
      }).start();
    } else {
      // Slide Down
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  // Try Again Handler - Check connection
  const handleRetry = async () => {
    try {
      let isOnline = false;

      if (Platform.OS === 'web') {
        // Check web connection
        isOnline = navigator.onLine;
      } else {
        // Check mobile connection
        const state = await NetInfo.fetch();
        isOnline = state.isConnected ?? false;
      }

      if (isOnline) {
        // Connection restored - go to home
        onExit();
        router.replace('/');
      } else {
        // Still offline - show 404 page
        onExit();
        router.push('/+not-found');
      }
    } catch (error) {
      // Error checking connection - show 404
      console.error('Error checking network:', error);
      onExit();
      router.push('/+not-found');
    }
  };

  // Exit Handler - Close the entire app
  const handleExit = () => {
    if (Platform.OS === 'web') {
      // For web - close the window/tab
      window.close();
      // If window.close() doesn't work (most modern browsers block it),
      // navigate to a blank page or show a message
      if (!window.closed) {
        alert('Please close this tab manually');
      }
    } else {
      // For mobile - exit the app
      BackHandler.exitApp();
    }
  };

  if (!visible || !fontsLoaded) return null;

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="none" // We handle animation manually
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            { transform: [{ translateY: slideAnim }] }, // Bind animation
          ]}
        >
          {/* Grey Handle */}
          <View style={styles.handle} />

          {/* Animated Icon Section */}
          <View style={styles.iconWrapper}>
            <PulsingCircle delay={0} />
            <PulsingCircle delay={600} />
            <View style={styles.iconContainer}>
              <Ionicons 
                name="wifi-outline" 
                size={50} 
                color="#fff"
              />
              {/* Diagonal line through WiFi symbol to indicate offline */}
              <View style={styles.offlineLine} />
            </View>
          </View>

          {/* Text Content */}
          <View style={styles.textSection}>
            <Text style={styles.title}>Connection Lost</Text>
            <Text style={styles.subtitle}>
              It looks like you're offline. Please check your internet connection.
            </Text>
          </View>

          {/* Buttons */}
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={handleRetry} 
            activeOpacity={0.8}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={handleExit} 
            activeOpacity={0.6}
          >
            <Text style={styles.settingsText}>Exit</Text>
          </TouchableOpacity>

        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)', // Deep Dim
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 25,
    minHeight: height * 0.55, // 55% of screen
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    marginBottom: 40,
  },
  // Icon Styles
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    marginTop: 10,
    height: 100, // Reserve space for pulses
  },
  pulseCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.2)', // Light Red Pulse
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#EF4444', // Red Background
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
    zIndex: 10,
    overflow: 'hidden',
  },
  offlineLine: {
    position: 'absolute',
    width: 90,
    height: 3,
    backgroundColor: '#fff',
    transform: [{ rotate: '45deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  // Typography
  textSection: {
    alignItems: 'center',
    marginBottom: 35,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  // Buttons
  retryButton: {
    backgroundColor: '#111827', // Dark/Black button for high contrast
    width: '100%',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  retryText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  settingsText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
});