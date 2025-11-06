import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');

const GetStartedScreen: React.FC = () => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image 
          source={require('../assets/logos/logo-icon.svg')}
          style={styles.logo}
          contentFit="contain"
        />
        
        <Image 
          source={require('../assets/images/couple.jpg')} 
          style={styles.coupleImage}
          contentFit="contain"
        />

        <View style={styles.textContainer}>
          <Text style={styles.titleText}>Grow together, for your little one.</Text>
        </View>

        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => router.push('/login')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#006dab', '#1976D2']} 
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.primaryButtonText}>Let's Start  ▶</Text>
          </LinearGradient>
        </TouchableOpacity>
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
    width: 250, // Reduced width
    height: 250, // Reduced height
    marginBottom: 5, // Reduced margin to bring closer to the image
  },
  coupleImage: { 
    width: '100%',
    height: 350,
    marginBottom: 10, // Adjusted margin
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 25,
    width: '100%',
  },
  titleText: { 
    fontSize: 28,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 38,
  },
  primaryButton: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#006dab', 
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 5,
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
    paddingBottom: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#cbd5e1',
  },
  dotActive: {
    width: 32,
    backgroundColor: '#006dab', 
  },
});

export default GetStartedScreen;