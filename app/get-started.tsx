import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');

export default function GetStartedScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image 
          source={require('../assets/logos/logo-icon.svg')}
          style={styles.logo}
          contentFit="contain"
        />
        
        <View style={styles.textContainer}>
          <Text style={styles.titleNormal}>Healthcare Companion for</Text>
          <LinearGradient
            colors={['#22c55e', '#16a34a', '#15803d']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientText}
          >
            <Text style={styles.titleGradient}>Expecting Mothers</Text>
          </LinearGradient>
          <Text style={styles.subtitle}>
            Track nutrition, monitor activities, and ensure a healthy pregnancy journey with personalized care
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => router.push('/login')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#22c55e', '#16a34a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <View style={styles.dot} />
        <View style={[styles.dot, styles.dotActive]} />
        <View style={styles.dot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  logo: {
    width: 210,
    height: 210,
    marginBottom: 60,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 70,
    width: '100%',
  },
  titleNormal: {
    fontSize: 28,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
    marginBottom: 12,
  },
  gradientText: {
    borderRadius: 8,
    marginBottom: 24,
  },
  titleGradient: {
    fontSize: 36,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  subtitle: {
    fontSize: 17,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 480,
  },
  primaryButton: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  buttonGradient: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 19,
    fontWeight: '800',
    color: '#ffffff',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 50,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#cbd5e1',
  },
  dotActive: {
    width: 32,
    backgroundColor: '#22c55e',
  },
});
