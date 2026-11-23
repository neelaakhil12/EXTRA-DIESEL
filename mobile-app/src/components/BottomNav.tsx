import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { ScreenName } from '../types';

interface BottomNavProps {
  currentScreen: ScreenName;
  onNavigate: (screen: ScreenName) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate }) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  // On desktop view, full-width top Navbar handles navigation, so hide bottom tab bar
  if (isDesktop) {
    return null;
  }

  // Dynamic bottom padding:
  // - With Android 3-Button Navigation (Square/Circle/Triangle): insets.bottom is ~48-56dp.
  //   We add +6dp breathing room, so labels & icons sit completely clear above the system buttons.
  // - With Android Gesture Navigation: insets.bottom is ~15-20dp -> padding becomes ~21-26dp.
  // - With iOS Home Indicator: insets.bottom is 34dp -> padding becomes 40dp.
  // - Desktop web / devices without bottom bar: insets.bottom is 0 -> fallback to 14dp.
  const dynamicPaddingBottom = Math.max(
    insets.bottom > 0 ? insets.bottom + 6 : (Platform.OS === 'android' ? 14 : 10),
    12
  );

  const tabs: { screen: ScreenName; label: string; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }[] = [
    { screen: 'home', label: 'Home', icon: 'home-outline', iconActive: 'home' },
    { screen: 'orders', label: 'Orders', icon: 'receipt-outline', iconActive: 'receipt' },
    { screen: 'track', label: 'Track', icon: 'location-outline', iconActive: 'location' },
    { screen: 'profile', label: 'Profile', icon: 'person-outline', iconActive: 'person' },
  ];

  return (
    <View style={[styles.container, { paddingBottom: dynamicPaddingBottom }]}>
      {tabs.map((tab) => {
        const isActive = currentScreen === tab.screen;
        return (
          <TouchableOpacity
            key={tab.screen}
            onPress={() => onNavigate(tab.screen)}
            style={styles.tab}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrapper, isActive && styles.iconWrapperActive]}>
              <Ionicons
                name={isActive ? tab.iconActive : tab.icon}
                size={22}
                color={isActive ? COLORS.primary : COLORS.muted}
              />
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    padding: 4,
    borderRadius: 16,
  },
  iconWrapperActive: {
    backgroundColor: '#FEE2E2',
  },
  label: {
    fontSize: 11,
    marginTop: 2,
    color: COLORS.muted,
    fontWeight: '500',
  },
  labelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
