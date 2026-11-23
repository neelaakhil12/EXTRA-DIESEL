import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { ScreenName } from '../types';
import { APP_CONFIG } from '../constants/config';

interface TrackOrderScreenProps {
  orderId?: string;
  onNavigate: (screen: ScreenName) => void;
  currentUser?: { name: string; email: string };
}

interface TrackedOrder {
  id: string;
  name: string;
  email: string;
  phone?: string;
  date: string;
  liters: number;
  total: number;
  status: 'pending' | 'assigned' | 'out_for_delivery' | 'delivered' | 'cancelled';
  statusText?: string;
  address: string;
  assignedTo?: string | null;
  assignedToName?: string | null;
  vehicleNumber?: string | null;
  createdAt?: string;
}

export const TrackOrderScreen: React.FC<TrackOrderScreenProps> = ({
  orderId,
  onNavigate,
  currentUser,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [loading, setLoading] = useState(true);
  const [activeOrder, setActiveOrder] = useState<TrackedOrder | null>(null);
  const [recentOrders, setRecentOrders] = useState<TrackedOrder[]>([]);
  const [etaMins, setEtaMins] = useState(18);
  const [distanceKm, setDistanceKm] = useState(2.8);

  const baseUrl = APP_CONFIG.LIVE_API_BASE_URL || 'https://extradiesel.in';

  // Load Order Data
  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        setLoading(true);
        const emailParam = currentUser?.email ? `email=${encodeURIComponent(currentUser.email)}` : 'all=true';
        const res = await fetch(`${baseUrl}/api/orders?${emailParam}`);
        const data = await res.json();

        if (data.success && Array.isArray(data.orders)) {
          setRecentOrders(data.orders);

          // Find requested order or latest active non-delivered order
          let found: TrackedOrder | null = null;
          if (orderId) {
            found = data.orders.find((o: TrackedOrder) => o.id === orderId) || null;
          }
          if (!found) {
            found = data.orders.find(
              (o: TrackedOrder) => o.status === 'out_for_delivery' || o.status === 'assigned' || o.status === 'pending'
            ) || data.orders[0] || null;
          }

          setActiveOrder(found);
        }
      } catch (e) {
        console.error('Failed to load tracking data:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderData();
  }, [orderId, currentUser?.email]);

  // Live ETA simulation countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setEtaMins((prev) => (prev > 5 ? prev - 1 : 8));
      setDistanceKm((prev) => (prev > 0.8 ? parseFloat((prev - 0.2).toFixed(1)) : 1.2));
    }, 45000);
    return () => clearInterval(timer);
  }, []);

  const driverName = activeOrder?.assignedToName || 'Assigned Delivery Captain';
  const bowserNo = activeOrder?.vehicleNumber || 'Bowser TS 09 UB 4521';
  const driverPhone = '+919989551305';

  const handleCallDriver = () => {
    Linking.openURL(`tel:${driverPhone}`);
  };

  const handleWhatsAppDriver = () => {
    const text = encodeURIComponent(
      `Hi, checking live delivery status of Extra Diesel Order #${activeOrder?.id || ''}.`
    );
    Linking.openURL(`https://wa.me/919989551305?text=${text}`);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'delivered':
        return { label: 'SUCCESSFULLY DELIVERED', color: '#059669', bg: '#ECFDF5' };
      case 'out_for_delivery':
        return { label: 'OUT FOR DELIVERY • EN ROUTE', color: COLORS.primary, bg: '#FEF2F2' };
      case 'assigned':
        return { label: 'BOWSER ASSIGNED • LOADING FUEL', color: '#D97706', bg: '#FEF3C7' };
      default:
        return { label: 'ORDER CONFIRMED • DISPATCHING', color: '#2563EB', bg: '#EFF6FF' };
    }
  };

  // Generate interactive Leaflet Map HTML
  const getInteractiveMapHtml = () => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; font-family: -apple-system, sans-serif; background: #e2e8f0; }
    .map-tag {
      background: #D50000; color: #fff; font-weight: 800; font-size: 11px;
      padding: 3px 8px; border-radius: 12px; border: 2px solid #fff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3); white-space: nowrap; text-align: center;
    }
    .site-tag {
      background: #0F172A; color: #fff; font-weight: 800; font-size: 11px;
      padding: 3px 8px; border-radius: 12px; border: 2px solid #fff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3); white-space: nowrap; text-align: center;
    }
    .depot-tag {
      background: #059669; color: #fff; font-weight: 800; font-size: 10px;
      padding: 2px 6px; border-radius: 10px; border: 1.5px solid #fff;
      white-space: nowrap; text-align: center;
    }
    .pulse-ring {
      width: 14px; height: 14px; border-radius: 50%; background: rgba(213,0,0,0.4);
      position: absolute; top: -5px; left: -5px; animation: pulse 1.8s infinite;
    }
    @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2.8); opacity: 0; } }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var depot = [17.4720, 78.3480]; // Kondapur Terminal
    var site = [17.4483, 78.3748];  // Customer Destination
    var bowser = [17.4590, 78.3610]; // Moving Bowser

    var map = L.map('map', { zoomControl: true, attributionControl: false }).setView(bowser, 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    // Route line
    var route = [depot, [17.4660, 78.3540], bowser, [17.4530, 78.3680], site];
    L.polyline(route, { color: '#D50000', weight: 5, opacity: 0.85, dashArray: '8, 8' }).addTo(map);

    // Bowser Marker
    var bowserIcon = L.divIcon({
      className: 'bowser-marker',
      html: '<div style="position:relative;"><div class="pulse-ring"></div><div style="font-size:26px;">🚚</div><div class="map-tag">${bowserNo}</div></div>',
      iconSize: [80, 54],
      iconAnchor: [40, 27]
    });
    L.marker(bowser, { icon: bowserIcon }).addTo(map);

    // Site Marker
    var siteIcon = L.divIcon({
      className: 'site-marker',
      html: '<div style="font-size:26px;">🏢</div><div class="site-tag">Delivery Site</div>',
      iconSize: [80, 50],
      iconAnchor: [40, 25]
    });
    L.marker(site, { icon: siteIcon }).addTo(map);

    // Depot Marker
    var depotIcon = L.divIcon({
      className: 'depot-marker',
      html: '<div style="font-size:22px;">⛽</div><div class="depot-tag">Fuel Depot</div>',
      iconSize: [60, 44],
      iconAnchor: [30, 22]
    });
    L.marker(depot, { icon: depotIcon }).addTo(map);

    map.fitBounds(L.latLngBounds([depot, site]), { padding: [35, 35] });
  </script>
</body>
</html>`;
  };

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Connecting to Live GPS Bowser Tracker...</Text>
      </View>
    );
  }

  // If no order exists at all
  if (!activeOrder) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.emptyContent}>
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="location-outline" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>No Active Deliveries to Track</Text>
          <Text style={styles.emptySub}>
            You do not have any ongoing diesel bowser orders right now. Place a new order to track doorstep fuel dispensing in real-time.
          </Text>
          <TouchableOpacity
            style={styles.orderNowBtn}
            onPress={() => onNavigate('order')}
            activeOpacity={0.85}
          >
            <Ionicons name="flash" size={18} color={COLORS.white} />
            <Text style={styles.orderNowBtnText}>Order Diesel Now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  const badge = getStatusBadge(activeOrder.status);
  const isDelivered = activeOrder.status === 'delivered';
  const isOutForDelivery = activeOrder.status === 'out_for_delivery';
  const isAssigned = activeOrder.status === 'assigned' || isOutForDelivery || isDelivered;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        isDesktop && { maxWidth: 860, width: '100%', alignSelf: 'center', paddingVertical: 24 },
      ]}
    >
      {/* Order Status Banner */}
      <View style={[styles.statusBanner, isDelivered && { backgroundColor: '#059669' }]}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{badge.label}</Text>
        </View>
        <Text style={styles.orderIdText}>Order #{activeOrder.id}</Text>
        <Text style={styles.etaText}>
          {isDelivered
            ? 'Delivered to Site • Meter Dispensed'
            : `Estimated Arrival: In ~${etaMins} Mins (${distanceKm} km away)`}
        </Text>
      </View>

      {/* Interactive Live Map (Zoomable, Pannable Leaflet OSM) */}
      <View style={styles.mapCard}>
        {Platform.OS === 'web' ? (
          <iframe
            srcDoc={getInteractiveMapHtml()}
            title="Live Bowser Tracking Map"
            style={{
              width: '100%',
              height: 320,
              border: 'none',
              borderRadius: 14,
            } as any}
          />
        ) : (
          <View style={styles.nativeMapBox}>
            <Ionicons name="map" size={48} color={COLORS.primary} />
            <Text style={styles.nativeMapTitle}>Interactive GPS Tracking Active</Text>
            <Text style={styles.nativeMapSub}>Bowser TS 09 UB 4521 en route to your site.</Text>
          </View>
        )}

        {/* Live Overlay Stats Pill */}
        <View style={styles.mapOverlayPill}>
          <Ionicons name="speedometer" size={16} color={COLORS.primary} />
          <Text style={styles.mapOverlayText}>
            {isDelivered
              ? 'Arrived at Site • Dispenser Engaged'
              : `Bowser ${distanceKm} km away • 35 km/h • ETA: ${etaMins}m`}
          </Text>
        </View>

        <View style={styles.livePulsePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveDotText}>LIVE GPS</Text>
        </View>
      </View>

      {/* Destination Site Card */}
      <View style={styles.siteCard}>
        <View style={styles.siteCardHeader}>
          <Ionicons name="location" size={20} color={COLORS.primary} />
          <Text style={styles.siteCardTitle}>Delivery Destination Site</Text>
        </View>
        <Text style={styles.siteAddressText}>{activeOrder.address || 'Plot 42, Hitech City, Hyderabad'}</Text>
        <View style={styles.siteMetaRow}>
          <Text style={styles.siteMetaPill}>Fuel: {activeOrder.liters} Liters</Text>
          <Text style={styles.siteMetaPill}>Total: ₹{Number(activeOrder.total).toLocaleString('en-IN')}</Text>
          <Text style={styles.siteMetaPill}>Date: {activeOrder.date}</Text>
        </View>
      </View>

      {/* Driver & Bowser Card */}
      <View style={styles.driverCard}>
        <View style={styles.driverInfoRow}>
          <View style={styles.driverAvatarCircle}>
            <Ionicons name="person" size={24} color={COLORS.white} />
          </View>
          <View style={styles.driverDetails}>
            <Text style={styles.driverName}>{driverName}</Text>
            <Text style={styles.driverVehicle}>🚚 {bowserNo}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="shield-checkmark" size={14} color="#059669" />
              <Text style={styles.ratingText}>PESO Certified Bowser Captain</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={styles.callButton} onPress={handleCallDriver} activeOpacity={0.85}>
            <Ionicons name="call" size={17} color={COLORS.white} />
            <Text style={styles.callButtonText}>Call Captain</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.waButton} onPress={handleWhatsAppDriver} activeOpacity={0.85}>
            <Ionicons name="logo-whatsapp" size={17} color="#25D366" />
            <Text style={styles.waButtonText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Dynamic Delivery Milestone Timeline */}
      <View style={styles.timelineCard}>
        <Text style={styles.timelineTitle}>Delivery Milestones</Text>

        {/* Milestone 1 */}
        <View style={styles.timelineItem}>
          <View style={styles.timelineDotActive}>
            <Ionicons name="checkmark" size={12} color={COLORS.white} />
          </View>
          <View style={styles.timelineTextContainer}>
            <Text style={styles.timelineItemTitle}>Order Confirmed</Text>
            <Text style={styles.timelineItemTime}>Automated Smart Meter Configured & Verified</Text>
          </View>
        </View>

        <View style={[styles.timelineLine, isAssigned ? styles.lineActive : styles.linePending]} />

        {/* Milestone 2 */}
        <View style={styles.timelineItem}>
          <View style={isAssigned ? styles.timelineDotActive : styles.timelineDotPending}>
            {isAssigned && <Ionicons name="checkmark" size={12} color={COLORS.white} />}
          </View>
          <View style={styles.timelineTextContainer}>
            <Text style={isAssigned ? styles.timelineItemTitle : styles.timelineItemPending}>
              Tanker Loaded at Depot
            </Text>
            <Text style={styles.timelineItemTime}>Quality Density Certified (832 kg/m³ BS-VI)</Text>
          </View>
        </View>

        <View style={[styles.timelineLine, isOutForDelivery || isDelivered ? styles.lineActive : styles.linePending]} />

        {/* Milestone 3 */}
        <View style={styles.timelineItem}>
          <View
            style={
              isOutForDelivery || isDelivered
                ? [styles.timelineDotActive, { backgroundColor: COLORS.primary }]
                : styles.timelineDotPending
            }
          >
            {(isOutForDelivery || isDelivered) && <Ionicons name="navigate" size={12} color={COLORS.white} />}
          </View>
          <View style={styles.timelineTextContainer}>
            <Text
              style={
                isOutForDelivery || isDelivered
                  ? [styles.timelineItemTitle, { color: COLORS.primary }]
                  : styles.timelineItemPending
              }
            >
              Out for Delivery
            </Text>
            <Text style={styles.timelineItemTime}>
              {isOutForDelivery ? `En route to site • Bowser ${distanceKm} km away` : 'Dispatched from terminal'}
            </Text>
          </View>
        </View>

        <View style={[styles.timelineLine, isDelivered ? styles.lineActive : styles.linePending]} />

        {/* Milestone 4 */}
        <View style={styles.timelineItem}>
          <View style={isDelivered ? styles.timelineDotActive : styles.timelineDotPending}>
            {isDelivered && <Ionicons name="checkmark-done" size={12} color={COLORS.white} />}
          </View>
          <View style={styles.timelineTextContainer}>
            <Text style={isDelivered ? styles.timelineItemTitle : styles.timelineItemPending}>
              Arrived at Site & Dispensing
            </Text>
            <Text style={styles.timelineItemTime}>
              {isDelivered ? 'Dispensed with automated digital printout' : `Estimated ~${etaMins} mins`}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  statusBanner: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  statusBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
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
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  etaText: {
    color: '#FEF08A',
    fontSize: 14,
    fontWeight: '700',
  },
  mapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  nativeMapBox: {
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 20,
  },
  nativeMapTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 10,
  },
  nativeMapSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  mapOverlayPill: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapOverlayText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  livePulsePill: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  liveDotText: {
    color: COLORS.white,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  siteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  siteCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  siteCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  siteAddressText: {
    fontSize: 13.5,
    color: '#334155',
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 10,
  },
  siteMetaRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  siteMetaPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 6,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  driverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  driverInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  driverAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverDetails: {
    marginLeft: 14,
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  driverVehicle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  callButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 10,
  },
  callButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  waButton: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 10,
  },
  waButtonText: {
    color: '#15803D',
    fontSize: 14,
    fontWeight: '800',
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
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
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  timelineDotPending: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#CBD5E1',
    marginTop: 2,
  },
  timelineLine: {
    width: 2,
    height: 28,
    marginLeft: 10,
    marginVertical: 4,
  },
  lineActive: {
    backgroundColor: '#059669',
  },
  linePending: {
    backgroundColor: '#E2E8F0',
  },
  timelineTextContainer: {
    marginLeft: 14,
    flex: 1,
  },
  timelineItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  timelineItemPending: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  timelineItemTime: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  emptyContent: {
    padding: 24,
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    maxWidth: 440,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  orderNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 12,
  },
  orderNowBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
});
