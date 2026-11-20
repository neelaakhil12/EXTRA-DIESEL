import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

interface SplashScreenProps {
  onGetStarted: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onGetStarted }) => {
  // Animation values for clean entrance and sleek disappear transition
  const splashOpacity = useRef(new Animated.Value(0)).current;
  const splashScale = useRef(new Animated.Value(0.92)).current;
  const footerFade = useRef(new Animated.Value(0)).current;

  // Trigger smooth disappearing exit animation
  const handleDisappearExit = () => {
    Animated.parallel([
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 450,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(splashScale, {
        toValue: 1.12,
        duration: 450,
        easing: Easing.in(Easing.ease),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(footerFade, {
        toValue: 0,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      onGetStarted();
    });
  };

  useEffect(() => {
    // 1. Smooth entrance of transparent logo
    Animated.parallel([
      Animated.timing(splashOpacity, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(splashScale, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(footerFade, {
        toValue: 1,
        duration: 800,
        delay: 300,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    // 2. Exactly 2 seconds splash duration, then smooth disappear transition to Login screen
    const timer = setTimeout(() => {
      handleDisappearExit();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={1}
      onPress={handleDisappearExit}
    >
      <StatusBar barStyle="dark-content" />

      {/* Main Center Area: Crisp Transparent Logo with Disappear Exit Animation */}
      <View style={styles.centerContainer}>
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              opacity: splashOpacity,
              transform: [{ scale: splashScale }],
            },
          ]}
        >
          <Image
            source={require('../../assets/images/splash-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      {/* Bottom Minimal Footer & Login Action */}
      <Animated.View style={[styles.bottomSection, { opacity: footerFade }]}>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleDisappearExit}
          activeOpacity={0.88}
        >
          <Text style={styles.loginButtonText}>Login</Text>
          <Ionicons name="arrow-forward" size={19} color={COLORS.white} />
        </TouchableOpacity>

        <Text style={styles.taglineText}>Doorstep Diesel Delivery Platform</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
    paddingVertical: Platform.OS === 'android' ? 24 : 32,
    paddingHorizontal: 24,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 290,
    height: 190,
  },
  bottomSection: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'android' ? 20 : 14,
  },
  loginButton: {
    width: '100%',
    backgroundColor: '#D50000',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    gap: 10,
    elevation: 3,
    shadowColor: '#D50000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  taglineText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
