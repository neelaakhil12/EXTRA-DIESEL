import React, { useState, useEffect, useRef } from 'react';
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
  const [animationCompleted, setAnimationCompleted] = useState<boolean>(false);

  // Animation values for red pulsating rings, scale, and smooth button reveal
  const pulseScale = useRef(new Animated.Value(0.95)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const buttonFade = useRef(new Animated.Value(0)).current;
  const buttonSlide = useRef(new Animated.Value(20)).current;
  const redRingScale = useRef(new Animated.Value(0.7)).current;
  const redRingOpacity = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // 1. Initial 2-second entrance and red pulse animation
    Animated.parallel([
      // Smooth logo appearance
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: Platform.OS !== 'web',
      }),
      // Red pulsing glow expansion
      Animated.timing(redRingScale, {
        toValue: 1.4,
        duration: 1800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(redRingOpacity, {
        toValue: 0,
        duration: 1800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    // Secondary continuous breathing pulse
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseScale, {
          toValue: 0.97,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    pulseLoop.start();

    // Exactly 2-second timer to finish the opening splash animation
    const splashTimer = setTimeout(() => {
      setAnimationCompleted(true);
      // Reveal the Login button smoothly
      Animated.parallel([
        Animated.timing(buttonFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(buttonSlide, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }, 2000);

    return () => {
      clearTimeout(splashTimer);
      pulseLoop.stop();
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Main Center Area: Logo + Red Animated Glowing Rings */}
      <View style={styles.centerContainer}>
        {/* Animated Expanding Red Aura Ring */}
        <Animated.View
          style={[
            styles.redAuraRing,
            {
              transform: [{ scale: redRingScale }],
              opacity: redRingOpacity,
            },
          ]}
        />

        {/* Pulsing Soft Red Halo */}
        <Animated.View
          style={[
            styles.pulsingHalo,
            {
              transform: [{ scale: pulseScale }],
            },
          ]}
        />

        {/* Master Extra Diesel Logo */}
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Red Status Pill during initial 2s animation */}
        {!animationCompleted && (
          <View style={styles.loadingPill}>
            <View style={styles.redPulseDot} />
            <Text style={styles.loadingPillText}>Connecting to High-Speed Fuel Network...</Text>
          </View>
        )}
      </View>

      {/* Bottom Action Area: ONLY shown after the 2-second animation completes */}
      {animationCompleted && (
        <Animated.View
          style={[
            styles.bottomSection,
            {
              opacity: buttonFade,
              transform: [{ translateY: buttonSlide }],
            },
          ]}
        >
          {/* PESO Quality Assurance Badges */}
          <View style={styles.featuresRow}>
            <View style={styles.featureItem}>
              <Ionicons name="shield-checkmark" size={17} color={COLORS.primary} />
              <Text style={styles.featureText}>PESO Certified</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="time" size={17} color={COLORS.primary} />
              <Text style={styles.featureText}>On-Site Delivery</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="speedometer" size={17} color={COLORS.primary} />
              <Text style={styles.featureText}>W&M Calibrated</Text>
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={styles.loginButton}
            onPress={onGetStarted}
            activeOpacity={0.88}
          >
            <Text style={styles.loginButtonText}>Login</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
          </TouchableOpacity>

          <Text style={styles.footerNote}>Direct BS-VI High Speed Diesel to Your Premises</Text>
        </Animated.View>
      )}
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
    position: 'relative',
  },
  redAuraRing: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 3,
    borderColor: '#D50000',
    backgroundColor: 'rgba(213, 0, 0, 0.04)',
  },
  pulsingHalo: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(213, 0, 0, 0.08)',
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    zIndex: 2,
  },
  logoImage: {
    width: 260,
    height: 180,
  },
  loadingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFF1F2',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFE4E6',
  },
  redPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D50000',
  },
  loadingPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B',
  },
  bottomSection: {
    width: '100%',
    paddingBottom: Platform.OS === 'android' ? 20 : 12,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  featureText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  loginButton: {
    backgroundColor: '#D50000',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    elevation: 4,
    shadowColor: '#D50000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 12,
    fontWeight: '500',
  },
});
