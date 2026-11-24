import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

interface WelcomeScreenProps {
  onLoginPress: () => void;
  onExplorePress?: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onLoginPress,
}) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const dynamicTopPadding = Platform.OS === 'android'
    ? Math.max(insets.top, StatusBar.currentHeight || 28) + 12
    : Math.max(insets.top, 20);

  const dynamicBottomPadding = Math.max(
    insets.bottom > 0 ? insets.bottom + 12 : 24,
    20
  );

  return (
    <View style={[styles.container, { paddingTop: dynamicTopPadding, paddingBottom: dynamicBottomPadding }]}>
      <StatusBar barStyle="dark-content" />

      {/* Top Header Logo */}
      <View style={styles.topLogoWrap}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, isDesktop && styles.desktopScrollContent]}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Tanker Hero Image */}
        <View style={[styles.tankerImageContainer, isDesktop && styles.desktopTankerImageContainer]}>
          <Image
            source={require('../../assets/images/tanker-welcome.png')}
            style={styles.tankerImage}
            resizeMode="cover"
          />
          <View style={styles.pesoOverlayBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#10B981" />
            <Text style={styles.pesoOverlayText}>PESO Certified Tanker Bowser</Text>
          </View>
        </View>

        {/* Text Content */}
        <View style={[styles.textWrap, isDesktop && styles.desktopTextWrap]}>
          <Text style={styles.welcomeTagline}>DOORSTEP DIESEL DELIVERY</Text>
          <Text style={styles.welcomeTitle}>
            Reliable Diesel Delivered Right To Your Doorstep
          </Text>
          <Text style={styles.welcomeSubtitle}>
            100% pure BS-VI fuel supplied through automated, calibrated smart bowsers for your generators, heavy machinery, fleets and commercial sites.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Action Area: Login Button */}
      <View style={[styles.bottomContainer, isDesktop && styles.desktopBottomContainer]}>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={onLoginPress}
          activeOpacity={0.88}
        >
          <Text style={styles.loginButtonText}>Login to Continue</Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  topLogoWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  headerLogo: {
    width: 200,
    height: 52,
  },
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  desktopScrollContent: {
    maxWidth: 680,
    alignSelf: 'center',
    width: '100%',
  },
  tankerImageContainer: {
    width: '100%',
    height: 250,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    marginBottom: 20,
  },
  desktopTankerImageContainer: {
    height: 320,
  },
  tankerImage: {
    width: '100%',
    height: '100%',
  },
  pesoOverlayBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  pesoOverlayText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  textWrap: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  desktopTextWrap: {
    paddingHorizontal: 24,
  },
  welcomeTagline: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 1.2,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 28,
  },
  welcomeSubtitle: {
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomContainer: {
    width: '100%',
    paddingTop: 12,
    gap: 10,
  },
  desktopBottomContainer: {
    maxWidth: 480,
    alignSelf: 'center',
  },
  loginButton: {
    width: '100%',
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    gap: 10,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  guestButton: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 4,
  },
  guestButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },
});
