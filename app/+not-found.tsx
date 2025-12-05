import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import {
    Animated,
    Easing,
    Platform,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from 'react-native';

// Fit for Baby Palette - Adapted for Night Mode
const COLORS = {
  nightSkyTop: '#003655', // Deep version of primary
  nightSkyBottom: '#006dab', // Your primary color
  moon: '#fffae3',
  cloud: 'rgba(255, 255, 255, 0.15)',
  cloudForeground: 'rgba(255, 255, 255, 0.3)',
  textWhite: '#ffffff',
  accent: '#98be4e',
};

export default function NotFoundScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isMobile = width < 768;
  
  // Generate random stars based on screen size
  const STARS = useMemo(() => Array.from({ length: 20 }).map((_, i) => ({
    id: i,
    x: Math.random() * width,
    y: Math.random() * (height * 0.6), // Keep stars in top 60%
    size: Math.random() * 3 + 1,
    duration: Math.random() * 2000 + 1000,
  })), [width, height]);

  // Animations
  const moonAnim = useRef(new Animated.Value(0)).current;
  const cloudAnim1 = useRef(new Animated.Value(0)).current;
  const cloudAnim2 = useRef(new Animated.Value(0)).current;
  const textFloatAnim = useRef(new Animated.Value(0)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Moon Glow Pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(moonAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(moonAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 2. Parallax Clouds (Infinite Loop)
    const createCloudLoop = (anim: Animated.Value, duration: number) => {
      Animated.loop(
        Animated.sequence([
            Animated.timing(anim, {
                toValue: 1,
                duration: duration,
                easing: Easing.linear,
                useNativeDriver: true,
            }),
            Animated.timing(anim, {
                toValue: 0,
                duration: 0, // Reset instantly
                useNativeDriver: true,
            })
        ])
      ).start();
    };

    createCloudLoop(cloudAnim1, 20000); // Slow back clouds
    createCloudLoop(cloudAnim2, 12000); // Faster front clouds

    // 3. Text Floating
    Animated.loop(
      Animated.sequence([
        Animated.timing(textFloatAnim, {
          toValue: -10,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(textFloatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleGoHome = () => {
    Animated.sequence([
      Animated.timing(buttonScaleAnim, { toValue: 0.9, duration: 100, useNativeDriver: true }),
      Animated.timing(buttonScaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start(() => {
        router.replace('/');
    });
  };

  // Interpolations
  const moonGlow = moonAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.5],
  });

  // Cloud movements
  const cloudTranslateX1 = cloudAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width], // Move across screen
  });
  
  const cloudTranslateX2 = cloudAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [-width * 1.2, width], 
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* 1. Deep Space Gradient */}
      <LinearGradient
        colors={[COLORS.nightSkyTop, COLORS.nightSkyBottom, '#4dabf5']}
        style={StyleSheet.absoluteFill}
        locations={[0, 0.6, 1]}
      />

      {/* 2. Twinkling Stars Background */}
      {STARS.map((star) => (
        <Star key={star.id} {...star} />
      ))}

      {/* 3. The Scenic Elements */}
      <View style={styles.sceneContainer}>
        
        {/* The Moon */}
        <View style={[styles.moonContainer, { top: height * (isMobile ? 0.08 : 0.15), right: width * (isMobile ? 0.05 : 0.1) }]}>
            {/* Glow Layer */}
            <Animated.View style={[styles.moonGlow, { transform: [{ scale: moonGlow }] }]} />
            {/* The Moon itself */}
            <View style={styles.moon} />
        </View>

        {/* Background Clouds */}
        <Animated.View style={[styles.cloudRow, { top: height * (isMobile ? 0.15 : 0.25), transform: [{ translateX: cloudTranslateX1 }] }]}>
            <View style={[styles.cloudBubble, { width: 100, height: 100, borderRadius: 50, top: 20 }]} />
            <View style={[styles.cloudBubble, { width: 140, height: 140, borderRadius: 70, left: 60 }]} />
            <View style={[styles.cloudBubble, { width: 90, height: 90, borderRadius: 45, left: 180, top: 30 }]} />
        </Animated.View>

        {/* MAIN TEXT CONTENT */}
        <Animated.View style={[styles.contentWrapper, { transform: [{ translateY: textFloatAnim }] }]}>
            <Text style={[styles.errorCode, isMobile && styles.errorCodeMobile]}>404</Text>
            <View style={styles.separator} />
            <Text style={styles.errorTitle}>Page Not Found</Text>
            <Text style={styles.errorDesc}>
                Looks like you've drifted into outer space. The page you're looking for isn't here.
            </Text>
        </Animated.View>

        {/* Foreground Clouds (Passing in front) */}
        <Animated.View style={[styles.cloudRowForeground, { bottom: height * (isMobile ? 0.2 : 0.3), transform: [{ translateX: cloudTranslateX2 }] }]}>
             <View style={[styles.cloudBubbleFore, { width: 120, height: 120, borderRadius: 60 }]} />
             <View style={[styles.cloudBubbleFore, { width: 160, height: 160, borderRadius: 80, left: 80, top: -20 }]} />
        </Animated.View>

      </View>

      {/* 4. Action Button (Bottom Sheet Style) */}
      <View style={styles.bottomContainer}>
        <Pressable onPress={handleGoHome}>
            <Animated.View style={[styles.button, { transform: [{ scale: buttonScaleAnim }] }]}>
                <LinearGradient
                    colors={[COLORS.accent, '#8ab33e']} // Green accent for contrast against blue
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buttonGradient}
                >
                    <Ionicons name="rocket" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.buttonText}>Take Me Home</Text>
                </LinearGradient>
            </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

// Helper Component for Stars
const Star = ({ x, y, size, duration }: { x: number; y: number; size: number; duration: number }) => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 1, duration: duration, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0.3, duration: duration, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    return (
        <Animated.View 
            style={{
                position: 'absolute',
                left: x,
                top: y,
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: '#fff',
                opacity,
            }} 
        />
    );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.nightSkyTop,
  },
  sceneContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  
  // MOON
  moonContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.moon,
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  moonGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 250, 227, 0.2)',
  },

  // CLOUDS (Built with CSS shapes)
  cloudRow: {
    position: 'absolute',
    flexDirection: 'row',
    left: 0,
    opacity: 0.6,
  },
  cloudBubble: {
    backgroundColor: COLORS.cloud,
    position: 'absolute',
  },
  cloudRowForeground: {
    position: 'absolute',
    flexDirection: 'row',
    left: 0,
  },
  cloudBubbleFore: {
    backgroundColor: COLORS.cloudForeground,
    position: 'absolute',
  },

  // TEXT CONTENT
  contentWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    paddingHorizontal: 20,
    marginTop: 40,
  },
  errorCode: {
    fontSize: 120,
    fontWeight: '900',
    color: 'rgba(255,255,255, 0.9)',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 10 },
    textShadowRadius: 20,
    includeFontPadding: false,
    lineHeight: 120,
  },
  errorCodeMobile: {
    fontSize: 80,
    lineHeight: 80,
  },
  separator: {
    width: 60,
    height: 6,
    backgroundColor: COLORS.accent,
    borderRadius: 3,
    marginVertical: 10,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: 1,
  },
  errorDesc: {
    color: 'rgba(255,255,255, 0.7)',
    fontSize: 16,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 22,
  },

  // BOTTOM SECTION
  bottomContainer: {
    paddingHorizontal: 30,
    paddingBottom: Platform.OS === 'ios' ? 60 : 40,
    alignItems: 'center',
  },
  button: {
    width: '100%',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});