import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { ScreenName } from '../types';
import { APP_CONFIG } from '../constants/config';

interface HomeScreenProps {
  onNavigate: (screen: ScreenName) => void;
}

const DEFAULT_VEHICLE_IMAGES = [
  require('../../assets/images/tanker-welcome.png'),
  require('../../assets/images/vehicle-bowser-1.jpeg'),
  require('../../assets/images/vehicle-bowser-2.jpeg'),
];

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const [fuelRate, setFuelRate] = useState<number>(94.50);
  const [rateCity, setRateCity] = useState<string>('Hyderabad');
  const [vehicleImages, setVehicleImages] = useState<any[]>(DEFAULT_VEHICLE_IMAGES);
  const [vehicleImgIdx, setVehicleImgIdx] = useState<number>(0);

  // Fetch real-time dynamic diesel price and fleet showcase images from live backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const baseUrl = APP_CONFIG.LIVE_API_BASE_URL || 'https://extradiesel.in';
        const res = await fetch(`${baseUrl}/api/settings`);
        const data = await res.json();
        if (data.success && data.settings) {
          const s = data.settings;
          if (s.dieselRate && !isNaN(Number(s.dieselRate))) {
            setFuelRate(Number(s.dieselRate));
          }
          if (s.city) setRateCity(s.city);
          if (s.vehicleImages && Array.isArray(s.vehicleImages) && s.vehicleImages.length > 0) {
            const parsedImages = s.vehicleImages.map((img: string) => {
              if (typeof img === 'string') {
                if (img.includes('tanker-welcome')) return DEFAULT_VEHICLE_IMAGES[0];
                if (img.includes('vehicle-bowser-1.jpeg')) return DEFAULT_VEHICLE_IMAGES[1];
                if (img.includes('vehicle-bowser-2.jpeg')) return DEFAULT_VEHICLE_IMAGES[2];
                if (img.startsWith('http') || img.startsWith('data:')) {
                  return { uri: img };
                }
              }
              return DEFAULT_VEHICLE_IMAGES[0];
            });
            setVehicleImages(parsedImages);
          }
        }
      } catch (err) {
        // Fallback default
      }
    };

    fetchData();
  }, []);

  // Automatically cycle vehicle photos every 1.5 seconds
  useEffect(() => {
    if (vehicleImages.length <= 1) return;
    const timer = setInterval(() => {
      setVehicleImgIdx((prev) => (prev + 1) % vehicleImages.length);
    }, 1500);
    return () => clearInterval(timer);
  }, [vehicleImages.length]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isDesktop && styles.desktopContent]}
    >
      {/* Top Banner Row: Side by Side Boxes on Desktop, Stacked on Mobile */}
      <View style={[styles.topRow, isDesktop && styles.desktopTopRow]}>
        {/* 1. Live Diesel Rate Box */}
        <View style={[styles.rateCard, isDesktop && styles.desktopRateCard]}>
          {isDesktop ? (
            /* Desktop Layout for Rate Box */
            <View style={styles.desktopRateCardContent}>
              <View style={styles.desktopRateTop}>
                <View style={styles.fuelIcon}>
                  <Ionicons name="flame" size={24} color={COLORS.secondary} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.rateSubtitle}>TODAY'S LIVE RATE ({rateCity.toUpperCase()})</Text>
                  <View style={styles.qualityBadge}>
                    <Ionicons name="shield-checkmark" size={11} color="#10B981" />
                    <Text style={styles.qualityBadgeText}>Quality Assured</Text>
                  </View>
                </View>
              </View>

              <View style={styles.desktopRateMiddle}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                  <Text style={styles.desktopRateValue}>₹{fuelRate.toFixed(2)}</Text>
                  <Text style={styles.desktopRateUnit}>/ Liter</Text>
                </View>
                <Text style={styles.desktopRateFuelType}>BS-VI High Speed Doorstep Diesel</Text>
              </View>

              <TouchableOpacity
                style={styles.desktopRateOrderBtn}
                onPress={() => onNavigate('order')}
                activeOpacity={0.88}
              >
                <Text style={styles.desktopRateOrderBtnText}>Order Diesel at ₹{fuelRate.toFixed(2)}</Text>
                <Ionicons name="arrow-forward" size={15} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          ) : (
            /* Mobile Layout for Rate Box (Compact Horizontal) */
            <>
              <View style={styles.rateLeft}>
                <View style={styles.fuelIcon}>
                  <Ionicons name="flame" size={22} color={COLORS.secondary} />
                </View>
                <View style={styles.rateLeftTextWrap}>
                  <Text style={styles.rateSubtitle}>Today's Live Rate ({rateCity})</Text>
                  <Text style={styles.rateTitle} numberOfLines={1}>
                    BS-VI High Speed Diesel
                  </Text>
                </View>
              </View>

              <View style={styles.rateRight}>
                <Text style={styles.rateValue}>₹{fuelRate.toFixed(2)}</Text>
                <Text style={styles.rateUnit}>per Liter</Text>
              </View>
            </>
          )}
        </View>

        {/* 2. Slide Images Box (Our Vehicles Showcase) */}
        <View style={[styles.heroVehicleCard, isDesktop && styles.desktopHeroVehicleCard]}>
          <Image
            source={vehicleImages[vehicleImgIdx] || DEFAULT_VEHICLE_IMAGES[0]}
            style={styles.heroVehicleImage}
            resizeMode="cover"
          />
          <View style={styles.heroVehicleOverlay}>
            <View style={styles.vehicleHeaderRow}>
              <View style={styles.heroBadgeWrap}>
                <Text style={styles.heroBadgeText}>OUR FLEET</Text>
              </View>
              <View style={styles.liveVehicleDotWrap}>
                <View style={styles.liveVehicleDot} />
                <Text style={styles.liveVehicleText}>Legal Metrology Certified</Text>
              </View>
            </View>

            <View style={styles.heroVehicleBottom}>
              <View style={{ flex: 1, marginRight: 14 }}>
                <Text style={[styles.heroVehicleTitle, isDesktop && { fontSize: 19 }]}>Our Smart Mobile Bowsers</Text>
                <Text style={[styles.heroVehicleSubtitle, isDesktop && { fontSize: 13 }]} numberOfLines={2}>
                  Automated doorstep delivery for generators, machinery & commercial fleets
                </Text>
              </View>
              <TouchableOpacity
                style={styles.heroVehicleBtn}
                onPress={() => onNavigate('order')}
                activeOpacity={0.88}
              >
                <Text style={styles.heroVehicleBtnText}>Order Now</Text>
                <Ionicons name="arrow-forward" size={15} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Section Title */}
      <Text style={styles.sectionHeading}>Our Services</Text>

      {/* Services Grid: 4-in-a-row on Desktop, 2x2 on Mobile */}
      <View style={[styles.grid, isDesktop && styles.desktopGrid]}>
        {/* Card 1: Order Diesel */}
        <TouchableOpacity
          style={[styles.serviceCard, isDesktop && styles.desktopServiceCard]}
          onPress={() => onNavigate('order')}
          activeOpacity={0.85}
        >
          <View style={[styles.serviceIconCircle, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="funnel" size={24} color={COLORS.primary} />
          </View>
          <Text style={styles.serviceTitle}>Order Diesel</Text>
          <Text style={styles.serviceDesc}>Fast doorstep delivery</Text>
          <View style={styles.cardArrow}>
            <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
          </View>
        </TouchableOpacity>

        {/* Card 2: My Orders */}
        <TouchableOpacity
          style={[styles.serviceCard, isDesktop && styles.desktopServiceCard]}
          onPress={() => onNavigate('orders')}
          activeOpacity={0.85}
        >
          <View style={[styles.serviceIconCircle, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="receipt" size={24} color={COLORS.amber} />
          </View>
          <Text style={styles.serviceTitle}>My Orders</Text>
          <Text style={styles.serviceDesc}>History & GST bills</Text>
          <View style={styles.cardArrow}>
            <Ionicons name="chevron-forward" size={16} color={COLORS.amber} />
          </View>
        </TouchableOpacity>

        {/* Card 3: Schedule Delivery */}
        <TouchableOpacity
          style={[styles.serviceCard, isDesktop && styles.desktopServiceCard]}
          onPress={() => onNavigate('subscription')}
          activeOpacity={0.85}
        >
          <View style={[styles.serviceIconCircle, { backgroundColor: '#E0E7FF' }]}>
            <Ionicons name="calendar" size={24} color="#4F46E5" />
          </View>
          <Text style={styles.serviceTitle}>Schedule Delivery</Text>
          <Text style={styles.serviceDesc}>Plan your delivery</Text>
          <View style={styles.cardArrow}>
            <Ionicons name="chevron-forward" size={16} color="#4F46E5" />
          </View>
        </TouchableOpacity>

        {/* Card 4: Track Order */}
        <TouchableOpacity
          style={[styles.serviceCard, isDesktop && styles.desktopServiceCard]}
          onPress={() => onNavigate('track')}
          activeOpacity={0.85}
        >
          <View style={[styles.serviceIconCircle, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="location" size={24} color={COLORS.greenDark} />
          </View>
          <Text style={styles.serviceTitle}>Track Order</Text>
          <Text style={styles.serviceDesc}>Live tracking</Text>
          <View style={styles.cardArrow}>
            <Ionicons name="chevron-forward" size={16} color={COLORS.greenDark} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Safety & Quality Assurance */}
      <View style={styles.assuranceCard}>
        <View style={styles.assuranceHeader}>
          <Ionicons name="shield-checkmark" size={22} color={COLORS.green} />
          <Text style={styles.assuranceTitle}>Safety & Compliance Assured</Text>
        </View>
        <Text style={styles.assuranceText}>
          Every delivery is calibrated and measured using government-stamped Legal Metrology flow meters for accurate, tamper-proof dispensing.
        </Text>
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
    paddingBottom: Platform.OS === 'android' ? 95 : 85,
  },
  rateCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    overflow: 'hidden',
  },
  rateLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 6,
  },
  fuelIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rateLeftTextWrap: {
    flex: 1,
  },
  rateSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '600',
  },
  rateTitle: {
    color: COLORS.white,
    fontSize: 14.5,
    fontWeight: '800',
  },
  rateRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexShrink: 0,
    paddingLeft: 4,
  },
  rateValue: {
    color: COLORS.secondary,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  rateUnit: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10.5,
    fontWeight: '700',
  },
  heroVehicleCard: {
    width: '100%',
    height: 175,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
    backgroundColor: '#0F172A',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
  },
  desktopHeroVehicleCard: {
    flex: 1.5,
    minHeight: 220,
    maxHeight: 235,
    marginBottom: 0,
    width: undefined,
  },
  heroVehicleImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  heroVehicleOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.44)',
    justifyContent: 'space-between',
    padding: 14,
  },
  vehicleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroBadgeWrap: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  liveVehicleDotWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  liveVehicleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveVehicleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A7F3D0',
  },
  heroVehicleBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  heroVehicleTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: 2,
  },
  heroVehicleSubtitle: {
    color: '#F1F5F9',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroVehicleBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  heroVehicleBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  serviceCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 1,
  },
  serviceIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 2,
  },
  serviceDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  cardArrow: {
    alignSelf: 'flex-end',
  },
  topRow: {
    marginBottom: 16,
  },
  desktopTopRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 20,
    marginBottom: 24,
    width: '100%',
  },
  desktopContent: {
    maxWidth: 1240,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
  desktopHeroBanner: {
    flex: 1.6,
    marginBottom: 0,
    padding: 24,
  },
  desktopHeroTitle: {
    fontSize: 22,
    lineHeight: 28,
  },
  desktopHeroImage: {
    width: 140,
    height: 120,
  },
  desktopRateCard: {
    flex: 1,
    minHeight: 220,
    maxHeight: 235,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 0,
    borderRadius: 18,
    justifyContent: 'space-between',
  },
  desktopRateCardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  desktopRateTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  desktopRateMiddle: {
    marginVertical: 10,
  },
  desktopRateValue: {
    color: COLORS.secondary,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  desktopRateUnit: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '700',
  },
  desktopRateFuelType: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  desktopRateOrderBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  desktopRateOrderBtnText: {
    color: COLORS.primary,
    fontSize: 13.5,
    fontWeight: '800',
  },
  qualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  qualityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  desktopGrid: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 16,
    marginBottom: 28,
  },
  desktopServiceCard: {
    width: undefined,
    flex: 1,
    padding: 20,
  },
  assuranceCard: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    padding: 16,
  },
  assuranceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  assuranceTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46',
  },
  assuranceText: {
    fontSize: 12,
    color: '#047857',
    lineHeight: 18,
  },
});
