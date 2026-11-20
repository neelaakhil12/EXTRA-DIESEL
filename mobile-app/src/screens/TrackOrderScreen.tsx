import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { ScreenName } from '../types';

interface TrackOrderScreenProps {
  orderId?: string;
  onNavigate: (screen: ScreenName) => void;
}

export const TrackOrderScreen: React.FC<TrackOrderScreenProps> = ({
  orderId = 'ED20261116-8941',
  onNavigate,
}) => {
  const driverName = 'Ramesh Kumar';
  const driverPhone = '+919876543210';
  const bowserNo = 'TS 09 ED 7721';

  const handleCallDriver = () => {
    Linking.openURL(`tel:${driverPhone}`);
  };

  const handleWhatsAppDriver = () => {
    Linking.openURL(`https://wa.me/919876543210?text=Hi%20Ramesh,%20checking%20status%20of%20Order%20${orderId}`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Order Status Banner */}
      <View style={styles.statusBanner}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>OUT FOR DELIVERY</Text>
        </View>
        <Text style={styles.orderIdText}>Order #{orderId}</Text>
        <Text style={styles.etaText}>Estimated Arrival: In 25 Mins</Text>
      </View>

      {/* Map Preview Card */}
      <View style={styles.mapCard}>
        <Image
          source={require('../../assets/images/map-track.png')}
          style={styles.mapImage}
          resizeMode="cover"
        />
        <View style={styles.mapOverlayPill}>
          <Ionicons name="speedometer" size={16} color={COLORS.primary} />
          <Text style={styles.mapOverlayText}>Bowser 3.4 km away</Text>
        </View>
      </View>

      {/* Driver & Bowser Card */}
      <View style={styles.driverCard}>
        <View style={styles.driverInfoRow}>
          <Image
            source={require('../../assets/images/driver-avatar.png')}
            style={styles.driverAvatar}
          />
          <View style={styles.driverDetails}>
            <Text style={styles.driverName}>{driverName}</Text>
            <Text style={styles.driverVehicle}>Bowser: {bowserNo}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color={COLORS.secondary} />
              <Text style={styles.ratingText}>4.9 (184 deliveries)</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={styles.callButton} onPress={handleCallDriver} activeOpacity={0.85}>
            <Ionicons name="call" size={18} color={COLORS.white} />
            <Text style={styles.callButtonText}>Call Driver</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.waButton} onPress={handleWhatsAppDriver} activeOpacity={0.85}>
            <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
            <Text style={styles.waButtonText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Delivery Milestone Timeline */}
      <View style={styles.timelineCard}>
        <Text style={styles.timelineTitle}>Delivery Milestones</Text>

        <View style={styles.timelineItem}>
          <View style={styles.timelineDotActive}>
            <Ionicons name="checkmark" size={12} color={COLORS.white} />
          </View>
          <View style={styles.timelineTextContainer}>
            <Text style={styles.timelineItemTitle}>Order Confirmed</Text>
            <Text style={styles.timelineItemTime}>10:15 AM • Automated Smart Meter Configured</Text>
          </View>
        </View>

        <View style={styles.timelineLineActive} />

        <View style={styles.timelineItem}>
          <View style={styles.timelineDotActive}>
            <Ionicons name="checkmark" size={12} color={COLORS.white} />
          </View>
          <View style={styles.timelineTextContainer}>
            <Text style={styles.timelineItemTitle}>Tanker Loaded at Depot</Text>
            <Text style={styles.timelineItemTime}>10:45 AM • Quality Density Certified (832 kg/m³)</Text>
          </View>
        </View>

        <View style={styles.timelineLineActive} />

        <View style={styles.timelineItem}>
          <View style={[styles.timelineDotActive, { backgroundColor: COLORS.secondary }]}>
            <Ionicons name="navigate" size={12} color={COLORS.dark} />
          </View>
          <View style={styles.timelineTextContainer}>
            <Text style={[styles.timelineItemTitle, { color: COLORS.primary }]}>Out for Delivery</Text>
            <Text style={styles.timelineItemTime}>11:05 AM • En route via Outer Ring Road</Text>
          </View>
        </View>

        <View style={styles.timelineLinePending} />

        <View style={styles.timelineItem}>
          <View style={styles.timelineDotPending} />
          <View style={styles.timelineTextContainer}>
            <Text style={styles.timelineItemPending}>Arriving at Site & Dispensing</Text>
            <Text style={styles.timelineItemTime}>Expected 11:30 AM</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: Platform.OS === 'android' ? 100 : 85,
  },
  statusBanner: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  statusBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  orderIdText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '900',
  },
  etaText: {
    color: COLORS.secondary,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  mapCard: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 180,
    marginBottom: 16,
    position: 'relative',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  mapOverlayPill: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    elevation: 3,
  },
  mapOverlayText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.dark,
  },
  driverCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  driverInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  driverAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 14,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.dark,
  },
  driverVehicle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.dark,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  callButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  callButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  waButton: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  waButtonText: {
    color: '#15803D',
    fontSize: 14,
    fontWeight: '700',
  },
  timelineCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineDotActive: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.green,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDotPending: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.softGray,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: 12,
  },
  timelineLineActive: {
    width: 2,
    height: 24,
    backgroundColor: COLORS.green,
    marginLeft: 10,
    marginVertical: 2,
  },
  timelineLinePending: {
    width: 2,
    height: 24,
    backgroundColor: COLORS.border,
    marginLeft: 10,
    marginVertical: 2,
  },
  timelineTextContainer: {
    flex: 1,
  },
  timelineItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.dark,
  },
  timelineItemPending: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.muted,
  },
  timelineItemTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
