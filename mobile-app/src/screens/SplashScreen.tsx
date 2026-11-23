import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Image,
  StatusBar,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const insets = useSafeAreaInsets();
  const dynamicTopPadding = Platform.OS === 'android'
    ? Math.max(insets.top, StatusBar.currentHeight || 28) + 12
    : Math.max(insets.top, 24);

  // Animation values for clean logo entrance
  const splashOpacity = useRef(new Animated.Value(0)).current;
  const splashScale = useRef(new Animated.Value(0.92)).current;
  const hasFinishedRef = useRef(false);

  useEffect(() => {
    // 1. Smooth entrance of logo
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
        tension: 45,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    // 2. Automatically advance after 1.5 seconds (pure splash logo screen)
    const timer = setTimeout(() => {
      if (!hasFinishedRef.current) {
        hasFinishedRef.current = true;
        onFinish();
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: dynamicTopPadding }]}>
      <StatusBar barStyle="dark-content" />

      {/* Main Center Area: Logo Only */}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
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
});
