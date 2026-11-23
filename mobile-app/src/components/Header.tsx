import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { ScreenName } from '../types';

interface HeaderProps {
  title?: string;
  userName?: string;
  userAvatar?: string;
  showBack?: boolean;
  onBack?: () => void;
  showNotification?: boolean;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
  currentScreen?: ScreenName;
  onNavigate?: (screen: ScreenName) => void;
  isLoggedIn?: boolean;
  onLoginPress?: () => void;
  onLogout?: () => void;
  userRole?: string;
  liveFuelRate?: number;
  currentLocationText?: string;
  onLocationPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  userName = 'Akhil Kumar',
  userAvatar,
  showBack = false,
  onBack,
  showNotification = true,
  onNotificationPress,
  onProfilePress,
  currentScreen = 'home',
  onNavigate,
  isLoggedIn = true,
  onLoginPress,
  onLogout,
  userRole = 'customer',
  liveFuelRate = 94.50,
  currentLocationText,
  onLocationPress,
}) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const dynamicPaddingTop = Platform.OS === 'android'
    ? Math.max(insets.top, StatusBar.currentHeight || 28) + 8
    : Math.max(insets.top, 14);

  const getInitials = (name?: string) => {
    if (!name || !name.trim()) return 'ED';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  /* =========================================================================
     1. DESKTOP FULL-SCREEN NAVBAR (When viewed on Laptop / Desktop Browser)
     ========================================================================= */
  if (isDesktop) {
    const navLinks: { screen: ScreenName; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
      { screen: 'home', label: 'Home', icon: 'home-outline' },
      { screen: 'order', label: 'Order Diesel', icon: 'funnel-outline' },
      { screen: 'track', label: 'Live Track', icon: 'location-outline' },
      { screen: 'orders', label: 'Order History', icon: 'receipt-outline' },
      { screen: 'subscription', label: 'Subscriptions', icon: 'calendar-outline' },
    ];

    return (
      <View style={styles.desktopNavbar}>
        <View style={styles.desktopNavInner}>
          {/* Brand Logo Only (Website Logo) */}
          <TouchableOpacity
            onPress={() => onNavigate?.('home')}
            style={styles.desktopBrandWrap}
            activeOpacity={0.8}
          >
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.desktopBrandLogoImage}
              resizeMode="contain"
            />
          </TouchableOpacity>

          {/* Navigation Links */}
          <View style={styles.desktopNavLinks}>
            {navLinks.map((link) => {
              const isActive = currentScreen === link.screen;
              return (
                <TouchableOpacity
                  key={link.screen}
                  onPress={() => onNavigate?.(link.screen)}
                  style={[styles.desktopNavLink, isActive && styles.desktopNavLinkActive]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={link.icon}
                    size={17}
                    color={isActive ? COLORS.primary : '#475569'}
                  />
                  <Text style={[styles.desktopNavLinkText, isActive && styles.desktopNavLinkTextActive]}>
                    {link.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Right Actions: Live Price, Notifications, User Profile */}
          <View style={styles.desktopRightActions}>
            {/* Location Selector Pill */}
            <TouchableOpacity
              style={styles.desktopLocationPill}
              onPress={onLocationPress}
              activeOpacity={0.75}
            >
              <Ionicons name="location" size={15} color={COLORS.primary} />
              <View style={{ maxWidth: 140 }}>
                <Text style={styles.desktopLocationLabel}>Delivering To:</Text>
                <Text style={styles.desktopLocationVal} numberOfLines={1}>
                  {currentLocationText || 'Plot 42, Hitech City'}
                </Text>
              </View>
              <Text style={styles.desktopLocationChangeText}>Change</Text>
            </TouchableOpacity>

            {/* Live Diesel Price Pill */}
            <View style={styles.desktopRateBadge}>
              <View style={styles.livePulseDot} />
              <Text style={styles.desktopRateLabel}>Diesel:</Text>
              <Text style={styles.desktopRatePrice}>₹{liveFuelRate.toFixed(2)}/L</Text>
            </View>

            {/* Notification Bell */}
            <TouchableOpacity
              onPress={onNotificationPress}
              style={styles.desktopIconBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications-outline" size={20} color={COLORS.dark} />
              <View style={styles.notificationDot} />
            </TouchableOpacity>

            {/* User Account / Profile */}
            {isLoggedIn ? (
              <TouchableOpacity
                onPress={onProfilePress}
                style={styles.desktopUserButton}
                activeOpacity={0.75}
              >
                {userAvatar ? (
                  <Image source={{ uri: userAvatar }} style={styles.desktopUserAvatar} />
                ) : (
                  <View style={styles.desktopUserAvatarFallback}>
                    <Text style={styles.desktopAvatarInitials}>{getInitials(userName)}</Text>
                  </View>
                )}
                <View style={styles.desktopUserNameWrap}>
                  <Text style={styles.desktopUserName} numberOfLines={1}>
                    {userName}
                  </Text>
                  <Text style={styles.desktopUserSub}>Verified Account</Text>
                </View>
                <Ionicons name="chevron-down" size={14} color="#64748B" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={onLoginPress}
                style={styles.desktopSignInBtn}
                activeOpacity={0.85}
              >
                <Text style={styles.desktopSignInText}>Sign In</Text>
                <Ionicons name="log-in-outline" size={18} color={COLORS.white} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  /* =========================================================================
     2. MOBILE HEADER (When viewed on Mobile Device or Mobile Web Browser)
     ========================================================================= */

  // If inner screen with title (e.g. Order Diesel, Track, History, etc.)
  if (title) {
    return (
      <View style={[styles.container, { paddingTop: dynamicPaddingTop }]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.innerHeader}>
          {showBack ? (
            <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={20} color={COLORS.dark} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 38 }} />
          )}

          <View style={styles.titleContainer}>
            <Text style={styles.titleText}>{title}</Text>
          </View>

          {showNotification ? (
            <TouchableOpacity onPress={onNotificationPress} style={styles.iconCircle} activeOpacity={0.7}>
              <Ionicons name="notifications-outline" size={19} color={COLORS.dark} />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 38 }} />
          )}
        </View>
      </View>
    );
  }

  // Home Screen: Mobile Location & Profile Bar
  return (
    <View style={[styles.container, { paddingTop: dynamicPaddingTop }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.homeHeader}>
        {/* Left: Location Pin & Site Selector */}
        <TouchableOpacity
          style={styles.locationContainer}
          onPress={onLocationPress}
          activeOpacity={0.7}
        >
          <View style={styles.locationIconWrap}>
            <Ionicons name="location" size={18} color={COLORS.primary} />
          </View>
          <View style={styles.locationTextWrap}>
            <View style={styles.locationLabelRow}>
              <Text style={styles.locationLabel}>DELIVERING TO SITE</Text>
              <Ionicons name="chevron-down" size={13} color={COLORS.primary} />
            </View>
            <Text style={styles.locationSiteName} numberOfLines={1}>
              {currentLocationText || 'Plot 42, Hitech City'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Right: Notification & Profile Avatar Button */}
        <View style={styles.rightActions}>
          <TouchableOpacity
            onPress={onNotificationPress}
            style={styles.iconCircle}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={19} color={COLORS.dark} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onProfilePress}
            style={styles.avatarButton}
            activeOpacity={0.7}
          >
            {userAvatar ? (
              <Image source={{ uri: userAvatar }} style={styles.mobileAvatarImg} />
            ) : (
              <Text style={styles.avatarText}>{getInitials(userName)}</Text>
            )}
            <View style={styles.onlineBadge} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Modern App Brand Strip */}
      <View style={styles.brandStrip}>
        <View style={styles.brandBadge}>
          <Ionicons name="flame" size={15} color={COLORS.primary} />
          <Text style={styles.brandText}>
            EXTRA <Text style={styles.brandTextAccent}>DIESEL</Text>
          </Text>
        </View>

        <View style={styles.complianceTag}>
          <Ionicons name="shield-checkmark" size={12} color={COLORS.greenDark} />
          <Text style={styles.complianceText}>PESO Certified Bowser</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Mobile Container Styles
  container: {
    backgroundColor: COLORS.white,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  homeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  locationIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationTextWrap: {
    flex: 1,
  },
  locationLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.8,
  },
  locationSiteName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.dark,
    marginTop: 1,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.primary,
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
  },
  mobileAvatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  brandStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.dark,
    letterSpacing: 0.5,
  },
  brandTextAccent: {
    color: COLORS.primary,
  },
  complianceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  complianceText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#065F46',
  },
  innerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  titleText: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.dark,
  },

  /* =========================================================================
     Desktop Navbar Styles
     ========================================================================= */
  desktopNavbar: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    zIndex: 100,
  },
  desktopNavInner: {
    maxWidth: 1240,
    width: '100%',
    marginHorizontal: 'auto' as any,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  desktopBrandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    cursor: 'pointer' as any,
  },
  desktopBrandLogoImage: {
    width: 145,
    height: 46,
  },
  desktopNavLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  desktopNavLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  desktopNavLinkActive: {
    backgroundColor: '#FEE2E2',
  },
  desktopNavLinkText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#475569',
  },
  desktopNavLinkTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  desktopRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  desktopLocationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  desktopLocationLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  desktopLocationVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  desktopLocationChangeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 4,
  },
  desktopRateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#D97706',
  },
  desktopRateLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#92400E',
  },
  desktopRatePrice: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#78350F',
  },
  roleQuickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  roleQuickPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  desktopIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  desktopUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  desktopUserAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  desktopUserAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  desktopAvatarInitials: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },
  desktopUserNameWrap: {
    maxWidth: 120,
  },
  desktopUserName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.dark,
  },
  desktopUserSub: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '600',
  },
  desktopSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  desktopSignInText: {
    color: COLORS.white,
    fontSize: 13.5,
    fontWeight: '700',
  },
});
