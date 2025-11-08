import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

const isWeb = Platform.OS === 'web';

const GetStartedScreen: React.FC = () => {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();

  const isMobileWeb = useMemo(() => {
    if (!isWeb) return false;
    return /Mobi|Android|iPhone/i.test(navigator.userAgent);
  }, []);

  // Responsive sizing
  const logoSize = isMobileWeb ?
    Math.min(screenWidth * 0.8, 500) :
    (isWeb ? Math.min(screenWidth * 0.5, 350) : Math.min(screenWidth * 0.85, 420));
  const coupleImageHeight = isMobileWeb ? 
    Math.min(screenWidth * 0.91, 390) : 
    (isWeb ? Math.min(screenWidth * 0.35, 300) : Math.min(screenWidth * 0.7, 280));

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, isMobileWeb && styles.mobileWebScrollContent]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.contentWrapper, isMobileWeb && styles.mobileWebContentWrapper]}>
            <View style={[styles.logoSection, isMobileWeb && styles.mobileWebLogoSection]}>
              <Image 
                source={require('../assets/logos/logo-icon.svg')}
                style={{ width: logoSize, height: logoSize }}
                contentFit="contain"
              />
            </View>
            
            <View style={[styles.imageSection, isMobileWeb && styles.mobileWebImageSection]}>
              <Image 
                source={require('../assets/images/couple.jpg')} 
                style={{ width: '100%', height: coupleImageHeight }}
                contentFit="contain"
              />
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.titleText}>Grow together for your little one.</Text>
            </View>

            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => router.push('/login')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#006dab', '#005a8f']} 
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.primaryButtonText}>Let's Start  ▶</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingVertical: isWeb ? 20 : 20,
    paddingTop: isWeb ? 5 : 40,
  },
  mobileWebScrollContent: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  contentWrapper: {
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: isWeb ? 40 : 24,
    marginTop: isWeb ? 0 : -32,
  },
  mobileWebContentWrapper: {
    flex: 1,
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 0,
    paddingBottom: 80,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: isWeb ? -118 : -88,
  },
  mobileWebLogoSection: {
    marginTop: -40,
    marginBottom: 0,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: isWeb ? 16 : 12,
  },
  mobileWebImageSection: {
    marginTop: -150,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: isWeb ? 24 : 32,
    width: '100%',
  },
  titleText: { 
    fontSize: isWeb ? 28 : 24,
    fontWeight: '900',
    color: '#006dab',
    textAlign: 'center',
    lineHeight: isWeb ? 38 : 34,
  },
  primaryButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#006dab', 
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 24,
  },
  buttonGradient: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64,
  },
  primaryButtonText: {
    fontSize: 19,
    fontWeight: '800',
    color: '#ffffff',
  },
});

export default GetStartedScreen;