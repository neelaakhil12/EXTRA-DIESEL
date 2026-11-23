import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { ScreenName } from '../types';
import { APP_CONFIG } from '../constants/config';

interface HomeScreenProps {
  onNavigate: (screen: ScreenName) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const [fuelRate, setFuelRate] = useState<number>(94.50);
  const [rateCity, setRateCity] = useState<string>('Hyderabad');

  // Fetch real-time dynamic diesel price from live backend
  useEffect(() => {
    const fetchRate = async () => {
      try {
        const baseUrl = APP_CONFIG.LIVE_API_BASE_URL || 'https://gtmining.xyz';
        const res = await fetch(`${baseUrl}/api/fuel-rate`);
        const data = await res.json();
        if (data.rate && !isNaN(Number(data.rate))) {
          setFuelRate(Number(data.rate));
          if (data.city) setRateCity(data.city);
        }
      } catch (err) {
        // Fallback default
      }
    };

    fetchRate();
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isDesktop && styles.desktopContent]}
    >
      {/* Top Banner Row: On Desktop side-by-side, on Mobile stacked */}
      <View style={[styles.topRow, isDesktop && styles.desktopTopRow]}>
        {/* Doorstep Diesel Delivery Banner */}
        <View style={[styles.heroBanner, isDesktop && styles.desktopHeroBanner]}>
          <View style={styles.heroTextContainer}>
            <Text style={styles.heroBadge}>FREE DELIVERY ON 200L+</Text>
            <Text style={[styles.heroTitle, isDesktop && styles.desktopHeroTitle]}>
              Doorstep Diesel Delivery Platform
            </Text>
            <Text style={styles.heroSubtitle}>
              100% pure BS-VI fuel delivered directly to your generators, fleets, machinery & commercial sites.
            </Text>
            <TouchableOpacity
              style={styles.heroBtn}
              onPress={() => onNavigate('order')}
              activeOpacity={0.85}
            >
              <Text style={styles.heroBtnText}>Order Now</Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          <Image
            source={require('../../assets/images/order-truck-thumb.png')}
            style={[styles.heroImage, isDesktop && styles.desktopHeroImage]}
            resizeMode="contain"
          />
        </View>

        {/* Live Rate Ticker Card */}
        <View style={[styles.rateCard, isDesktop && styles.desktopRateCard]}>
          <View style={styles.rateLeft}>
            <View style={styles.fuelIcon}>
              <Ionicons name="flame" size={26} color={COLORS.secondary} />
            </View>
            <View>
              <Text style={styles.rateSubtitle}>Today's Live Rate ({rateCity})</Text>
              <Text style={styles.rateTitle}>BS-VI High Speed</Text>
              <View style={styles.pesoMiniBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#10B981" />
                <Text style={styles.pesoMiniText}>PESO Verified</Text>
              </View>
            </View>
          </View>
          <View style={styles.rateRight}>
            <Text style={styles.rateValue}>₹{fuelRate.toFixed(2)}</Text>
            <Text style={styles.rateUnit}>per Liter</Text>
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

        {/* Card 3: Subscription */}
        <TouchableOpacity
          style={[styles.serviceCard, isDesktop && styles.desktopServiceCard]}
          onPress={() => onNavigate('subscription')}
          activeOpacity={0.85}
        >
          <View style={[styles.serviceIconCircle, { backgroundColor: '#E0E7FF' }]}>
            <Ionicons name="calendar" size={24} color="#4F46E5" />
          </View>
          <Text style={styles.serviceTitle}>Subscription</Text>
          <Text style={styles.serviceDesc}>Scheduled auto-refill</Text>
          <View style={styles.cardArrow}>
            <Ionicons name="chevron-forward" size={16} color="#4F46E5" />
          </View>
        </TouchableOpacity>

        {/* Card 4: Live Track */}
        <TouchableOpacity
          style={[styles.serviceCard, isDesktop && styles.desktopServiceCard]}
          onPress={() => onNavigate('track')}
          activeOpacity={0.85}
        >
          <View style={[styles.serviceIconCircle, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="location" size={24} color={COLORS.greenDark} />
          </View>
          <Text style={styles.serviceTitle}>Track Bowser</Text>
          <Text style={styles.serviceDesc}>Live GPS tracking</Text>
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
          Every delivery is licensed by PESO (Petroleum and Explosives Safety Organization) and measured using legal metrology flow meters.
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
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  rateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fuelIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rateSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '500',
  },
  rateTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
  },
  rateRight: {
    alignItems: 'flex-end',
  },
  rateValue: {
    color: COLORS.secondary,
    fontSize: 24,
    fontWeight: '900',
  },
  rateUnit: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '600',
  },
  heroBanner: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  heroTextContainer: {
    flex: 1,
  },
  heroBadge: {
    backgroundColor: '#FEE2E2',
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  heroBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 4,
  },
  heroBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  heroImage: {
    width: 90,
    height: 90,
    marginLeft: 8,
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
    marginBottom: 0,
    justifyContent: 'center',
    padding: 24,
  },
  pesoMiniBadge: {
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
  pesoMiniText: {
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
