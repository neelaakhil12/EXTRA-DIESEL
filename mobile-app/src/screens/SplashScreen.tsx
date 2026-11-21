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
  // Animation value for clean logo entrance on mount
  const splashOpacity = useRef(new Animated.Value(0)).current;
  const splashScale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    // Smooth entrance of logo on app launch
    Animated.parallel([
      Animated.timing(splashOpacity, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(splashScale, {
        toValue: 1,
        friction: 8,
        tension: 50,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Main Center Area: Logo */}
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

      {/* Bottom Section: Static Login Button (Navigates ONLY on click) */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={onGetStarted}
          activeOpacity={0.88}
        >
          <Text style={styles.loginButtonText}>Login</Text>
          <Ionicons name="arrow-forward" size={19} color={COLORS.white} />
        </TouchableOpacity>

        <Text style={styles.taglineText}>Doorstep Diesel Delivery Platform</Text>
      </View>
    </View>
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
