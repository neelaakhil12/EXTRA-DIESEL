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

  const tabs: { screen: ScreenName; label: string; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }[] = [
    { screen: 'home', label: 'Home', icon: 'home-outline', iconActive: 'home' },
    { screen: 'orders', label: 'Orders', icon: 'receipt-outline', iconActive: 'receipt' },
    { screen: 'track', label: 'Track', icon: 'location-outline', iconActive: 'location' },
    { screen: 'profile', label: 'Profile', icon: 'person-outline', iconActive: 'person' },
  ];

  return (
    <View style={styles.navWrapper}>
      <View style={styles.container}>
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
                  size={23}
                  color={isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.75)'}
                />
              </View>
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {insets.bottom > 0 && (
        <View style={{ height: insets.bottom, backgroundColor: '#000000' }} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  navWrapper: {
    backgroundColor: '#000000',
  },
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 0,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    padding: 3,
    borderRadius: 16,
  },
  iconWrapperActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  label: {
    fontSize: 11,
    marginTop: 2,
    color: 'rgba(255, 255, 255, 0.78)',
    fontWeight: '600',
  },
  labelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
