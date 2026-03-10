import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Linking,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const isWeb = Platform.OS === 'web';

export default function RedirectScreen() {
  const { token, username, password, app } = useLocalSearchParams<{ token?: string; username?: string; password?: string; app?: string }>();
  const router = useRouter();
  const [showFallback, setShowFallback] = useState(false);
  const [appTried, setAppTried] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Build params for reset-password page (support both old token and new username+password)
  const resetParams = token
    ? { token }
    : username && password
    ? { username, password }
    : null;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (!resetParams) {
      // No valid params — go home
      router.replace('/');
      return;
    }

    // Build query string for URLs
    const queryString = token
      ? `token=${encodeURIComponent(token)}`
      : `username=${encodeURIComponent(username!)}&password=${encodeURIComponent(password!)}`;

    const webResetUrl = `/reset-password?${queryString}`;
    const appDeepLink = `fitforbaby://reset-password?${queryString}`;

    if (!isWeb) {
      // Native app — navigate directly to reset-password screen
      router.replace({
        pathname: '/reset-password',
        params: resetParams,
      });
      return;
    }

    // Web: detect mobile browser
    const isMobileBrowser =
      typeof navigator !== 'undefined' &&
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (!isMobileBrowser) {
      // Desktop — go straight to web reset page
      router.replace({
        pathname: '/reset-password',
        params: resetParams,
      });
      return;
    }

    // Mobile browser — try to open the native app first
    setAppTried(true);

    // Try deep link via Linking
    Linking.openURL(appDeepLink).catch(() => {
      // App not installed or deep link failed — show fallback
      setShowFallback(true);
    });

    // Fallback: if still on page after 2.5s, show options
    const timer = setTimeout(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        setShowFallback(true);
      }
    }, 2500);

    // Also listen for page visibility (app opened = page goes hidden)
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        clearTimeout(timer);
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      clearTimeout(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, [token, username, password]);

  const handleOpenInBrowser = () => {
    if (resetParams) {
      router.replace({
        pathname: '/reset-password',
        params: resetParams,
      });
    }
  };

  const handleOpenApp = () => {
    if (resetParams) {
      const queryString = token
        ? `token=${encodeURIComponent(token)}`
        : `username=${encodeURIComponent(username!)}&password=${encodeURIComponent(password!)}`;
      Linking.openURL(`fitforbaby://reset-password?${queryString}`).catch(() => {
        setShowFallback(true);
      });
    }
  };

  // While redirecting (no fallback yet)
  const renderLoading = () => (
    <View style={styles.card}>
      <View style={styles.iconCircle}>
        <Ionicons name="log-in-outline" size={44} color="#006dab" />
      </View>
      <Text style={styles.title}>Opening Fit for Baby...</Text>
      <Text style={styles.subtitle}>Please wait while we redirect you to the app.</Text>
      <View style={styles.spinnerRow}>
        <Ionicons name="sync" size={28} color="#006dab" style={{ marginRight: 8 }} />
        <Text style={styles.spinnerText}>Redirecting...</Text>
      </View>
    </View>
  );

  // Fallback UI when app didn't open
  const renderFallback = () => (
    <View style={styles.card}>
      <View style={styles.iconCircle}>
        <Ionicons name="lock-open-outline" size={44} color="#006dab" />
      </View>
      <Text style={styles.title}>Set Your Password</Text>
      <Text style={styles.subtitle}>Choose how you'd like to continue:</Text>

      <TouchableOpacity style={styles.primaryBtn} onPress={handleOpenApp}>
        <Ionicons name="phone-portrait-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.primaryBtnText}>Open in App</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryBtn} onPress={handleOpenInBrowser}>
        <Ionicons name="globe-outline" size={20} color="#475569" style={{ marginRight: 8 }} />
        <Text style={styles.secondaryBtnText}>Continue in Browser</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <LinearGradient colors={['#f0f9ff', '#e0f2fe']} style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {showFallback ? renderFallback() : renderLoading()}
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    paddingTop: 0,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 36,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#006dab',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  spinnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spinnerText: {
    fontSize: 15,
    color: '#006dab',
    fontWeight: '600',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#006dab',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    marginBottom: 20,
  },
  secondaryBtnText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '600',
  },
});
