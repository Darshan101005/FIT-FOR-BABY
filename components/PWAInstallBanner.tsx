import {
    canInstallPWA,
    isMobileDevice,
    isRunningAsPWA,
    onInstallPromptChange,
    promptInstall,
} from '@/services/pwa.service';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
    Animated,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';

const isWeb = Platform.OS === 'web';

interface PWAInstallBannerProps {
  onDismiss?: () => void;
}

export default function PWAInstallBanner({ onDismiss }: PWAInstallBannerProps) {
  const { width: screenWidth } = useWindowDimensions();
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const slideAnim = useState(new Animated.Value(200))[0];

  useEffect(() => {
    if (!isWeb) return;

    const checkInstallAvailability = async () => {
      // Don't show if already installed as PWA
      if (isRunningAsPWA()) {
        return;
      }

      // Don't show on desktop
      if (!isMobileDevice()) {
        return;
      }

      // Check if user dismissed banner recently (within 7 days)
      const dismissedAt = await AsyncStorage.getItem('pwa_banner_dismissed');
      if (dismissedAt) {
        const dismissedTime = parseInt(dismissedAt, 10);
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - dismissedTime < sevenDays) {
          return;
        }
      }

      // Check if install prompt is available
      if (canInstallPWA()) {
        setShowBanner(true);
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 10,
        }).start();
      }
    };

    // Initial check
    checkInstallAvailability();

    // Listen for install prompt changes
    const unsubscribe = onInstallPromptChange((available) => {
      if (available && isMobileDevice() && !isRunningAsPWA()) {
        checkInstallAvailability();
      } else {
        hideBanner();
      }
    });

    return unsubscribe;
  }, []);

  const hideBanner = () => {
    Animated.timing(slideAnim, {
      toValue: 200,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowBanner(false);
    });
  };

  const handleInstall = async () => {
    setIsInstalling(true);
    const success = await promptInstall();
    setIsInstalling(false);
    
    if (success) {
      hideBanner();
    }
  };

  const handleDismiss = async () => {
    await AsyncStorage.setItem('pwa_banner_dismissed', Date.now().toString());
    hideBanner();
    onDismiss?.();
  };

  if (!showBanner || !isWeb) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.banner}>
        <TouchableOpacity style={styles.closeButton} onPress={handleDismiss}>
          <Ionicons name="close" size={20} color="#64748b" />
        </TouchableOpacity>
        
        <View style={styles.iconContainer}>
          <View style={styles.iconBackground}>
            <Ionicons name="download-outline" size={28} color="#006dab" />
          </View>
        </View>
        
        <View style={styles.content}>
          <Text style={styles.title}>Install Fit for Baby</Text>
          <Text style={styles.description}>
            Add to your home screen for quick access and a better experience
          </Text>
        </View>
        
        <TouchableOpacity
          style={[styles.installButton, isInstalling && styles.installButtonDisabled]}
          onPress={handleInstall}
          disabled={isInstalling}
        >
          <Text style={styles.installButtonText}>
            {isInstalling ? 'Installing...' : 'Install'}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  banner: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
    zIndex: 1,
  },
  iconContainer: {
    marginRight: 12,
  },
  iconBackground: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#e6f4fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  installButton: {
    backgroundColor: '#006dab',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  installButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  installButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
