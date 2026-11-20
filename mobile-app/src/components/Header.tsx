import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  showNotification?: boolean;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  onBack,
  showNotification = true,
  onNotificationPress,
  onProfilePress,
}) => {
  // If it's an inner screen with a title (e.g. Order Diesel, Track, History, etc.)
  if (title) {
    return (
      <View style={styles.container}>
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

  // Home Screen: Modern App Location & Profile Bar (like Blinkit / Swiggy / Uber)
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.homeHeader}>
        {/* Left: Location Pin & Site Selector */}
        <TouchableOpacity style={styles.locationContainer} activeOpacity={0.7}>
          <View style={styles.locationIconWrap}>
            <Ionicons name="location" size={18} color={COLORS.primary} />
          </View>
          <View style={styles.locationTextWrap}>
            <View style={styles.locationLabelRow}>
              <Text style={styles.locationLabel}>DELIVERING TO SITE</Text>
              <Ionicons name="chevron-down" size={13} color={COLORS.primary} />
            </View>
            <Text style={styles.locationSiteName} numberOfLines={1}>
              Plot 42, Hitech City
            </Text>
          </View>
        </TouchableOpacity>

        {/* Right: Notification & Profile Button */}
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
            <Text style={styles.avatarText}>AK</Text>
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
  container: {
    backgroundColor: COLORS.white,
    paddingTop: 48, // Generous space so Dynamic Island / Notch never overlaps
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
  // Home Header Style
  homeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  locationIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
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
    letterSpacing: 0.6,
  },
  locationSiteName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.dark,
    marginTop: 1,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    backgroundColor: COLORS.dark,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.green,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  brandStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
    paddingVertical: 2,
    borderRadius: 6,
  },
  complianceText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.greenDark,
  },
  // Inner Screens Header Style
  innerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
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
    color: COLORS.dark,
    fontSize: 17,
    fontWeight: '800',
  },
});
