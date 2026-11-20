import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

interface SplashScreenProps {
  onGetStarted: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onGetStarted }) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Top Brand Banner */}
      <View style={styles.topSection}>
        <View style={styles.logoBadge}>
          <Ionicons name="flame" size={32} color={COLORS.secondary} />
          <Text style={styles.brandTitle}>
            EXTRA <Text style={styles.brandHighlight}>DIESEL</Text>
          </Text>
        </View>
        <Text style={styles.tagline}>Reliable Diesel Right To Your Site</Text>
      </View>

      {/* Hero Illustration / Graphic */}
      <View style={styles.heroSection}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <View style={styles.cardInfo}>
          <Text style={styles.headline}>Doorstep Fuel Delivery</Text>
          <Text style={styles.subtext}>
            PESO-certified smart tankers delivering pure BS-VI high-speed diesel directly to your generators, fleets & machinery.
          </Text>
        </View>
      </View>

      {/* Feature Badges */}
      <View style={styles.featuresRow}>
        <View style={styles.featureItem}>
          <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
          <Text style={styles.featureText}>PESO Safe</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="time" size={20} color={COLORS.primary} />
          <Text style={styles.featureText}>On-Time</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="speedometer" size={20} color={COLORS.primary} />
          <Text style={styles.featureText}>W&M Calibrated</Text>
        </View>
      </View>

      {/* Action Button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity style={styles.button} onPress={onGetStarted} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Login</Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    justifyContent: 'space-between',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  topSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  brandHighlight: {
    color: COLORS.amber,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 6,
    fontWeight: '600',
  },
  heroSection: {
    alignItems: 'center',
    marginVertical: 20,
  },
  logoImage: {
    width: 220,
    height: 180,
  },
  cardInfo: {
    marginTop: 20,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  headline: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.background,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.dark,
  },
  bottomSection: {
    marginTop: 10,
  },
  button: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
