import React, { useState, useEffect, useRef } from 'react';
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
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { ScreenName } from '../types';
import { APP_CONFIG } from '../constants/config';
import { sendSystemNotification } from '../services/notificationService';

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
  status: 'pending' | 'assigned' | 'out_for_delivery' | 'arrived' | 'delivered' | 'cancelled';
  statusText?: string;
  address: string;
  mapsLink?: string | null;
  slot?: string;
  assignedTo?: string | null;
  assignedToName?: string | null;
  vehicleNumber?: string | null;
  captainLat?: number | null;
  captainLon?: number | null;
  captainHeading?: number | null;
  lastLocationUpdate?: string | null;
  createdAt?: string;
  dispatchedAt?: string;
  arrivedAt?: string;
  deliveredAt?: string;
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
              (o: TrackedOrder) => o.status === 'out_for_delivery' || o.status === 'arrived' || o.status === 'assigned' || o.status === 'pending'
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

  // Periodic 8-second polling to update Captain's live GPS movement from backend
  useEffect(() => {
    if (!activeOrder?.id || activeOrder.status === 'delivered') return;

    const pollTimer = setInterval(async () => {
      try {
        const res = await fetch(`${baseUrl}/api/orders/${activeOrder.id}`);
        const data = await res.json();
        if (data.success && data.order) {
          setActiveOrder((prev) => ({
            ...prev,
            ...data.order,
          }));
        }
      } catch (e) {}
    }, 8000);

    return () => clearInterval(pollTimer);
  }, [activeOrder?.id, activeOrder?.status]);

  // Live ETA simulation countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setEtaMins((prev) => (prev > 5 ? prev - 1 : 8));
      setDistanceKm((prev) => (prev > 0.8 ? parseFloat((prev - 0.2).toFixed(1)) : 1.2));
    }, 45000);
    return () => clearInterval(timer);
  }, []);

  // Listen for driver assignment update & trigger status bar push notification ONLY once per driver assignment
  useEffect(() => {
    if (!activeOrder?.id) return;

    const checkAndNotify = async () => {
      try {
        // 1. Captain Assigned Notification
        if (activeOrder.assignedToName) {
          const assignKey = `ed_notif_assign_${activeOrder.id}_${activeOrder.assignedToName}`;
          const alreadyAssigned = await AsyncStorage.getItem(assignKey);
          if (!alreadyAssigned) {
            await AsyncStorage.setItem(assignKey, 'true');
            await sendSystemNotification(
              '🚚 Bowser Captain Assigned!',
              `Captain ${activeOrder.assignedToName} (${activeOrder.vehicleNumber || 'Bowser'}) has been assigned to your order #${activeOrder.id}.`,
              'driver'
            ).catch(() => {});
          }
        }

        // 2. Out for Delivery Notification
        if (activeOrder.status === 'out_for_delivery') {
          const outKey = `ed_notif_out_${activeOrder.id}`;
          const alreadyOut = await AsyncStorage.getItem(outKey);
          if (!alreadyOut) {
            await AsyncStorage.setItem(outKey, 'true');
            await sendSystemNotification(
              '🚀 Fuel Tanker Out for Delivery!',
              `Bowser (${activeOrder.vehicleNumber || 'Bowser'}) is en route to your site. Expected shortly!`,
              'driver'
            ).catch(() => {});
          }
        }

        // 3. Captain Arrived at Site Notification
        if (activeOrder.status === 'arrived') {
          const arriveKey = `ed_notif_arrive_${activeOrder.id}`;
          const alreadyArrived = await AsyncStorage.getItem(arriveKey);
          if (!alreadyArrived) {
            await AsyncStorage.setItem(arriveKey, 'true');
            await sendSystemNotification(
              '📍 Bowser Captain Arrived at Site!',
              `Captain ${activeOrder.assignedToName || 'Bowser'} has reached your delivery destination and is preparing smart meter dispensing.`,
              'driver'
            ).catch(() => {});
          }
        }

        // 4. Delivered Notification
        if (activeOrder.status === 'delivered') {
          const deliverKey = `ed_notif_delivered_${activeOrder.id}`;
          const alreadyDelivered = await AsyncStorage.getItem(deliverKey);
          if (!alreadyDelivered) {
            await AsyncStorage.setItem(deliverKey, 'true');
            await sendSystemNotification(
              '✅ Fuel Dispensed & Delivered!',
              `Successfully dispensed ${activeOrder.liters} Liters of BS-VI Diesel for Order #${activeOrder.id}. Your digital tax invoice is ready.`,
              'order'
            ).catch(() => {});
          }
        }
      } catch (e) {}
    };

    checkAndNotify();
  }, [activeOrder?.status, activeOrder?.assignedToName, activeOrder?.id]);

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
      case 'arrived':
        return { label: 'CAPTAIN ARRIVED AT SITE', color: '#D97706', bg: '#FEF3C7' };
      case 'out_for_delivery':
        return { label: 'OUT FOR DELIVERY • EN ROUTE', color: COLORS.primary, bg: '#FEF2F2' };
      case 'assigned':
        return { label: 'BOWSER ASSIGNED • LOADING FUEL', color: '#2563EB', bg: '#EFF6FF' };
      default:
        return { label: 'ORDER CONFIRMED • DISPATCHING', color: '#2563EB', bg: '#EFF6FF' };
    }
  };

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Live Delivery Status...</Text>
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
  const isArrived = activeOrder.status === 'arrived' || isDelivered;
  const isOutForDelivery = activeOrder.status === 'out_for_delivery' || isArrived;
  const isAssigned = !!activeOrder.assignedToName || activeOrder.status === 'assigned' || isOutForDelivery;

  const getInteractiveMapHtml = () => {
    // Dynamic Destination Coordinates from active order
    let destLat = 17.313112;
    let destLon = 78.545285;
    if (activeOrder?.mapsLink) {
      const qMatch = activeOrder.mapsLink.match(/(?:q|destination|query)=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (qMatch) {
        destLat = parseFloat(qMatch[1]);
        destLon = parseFloat(qMatch[2]);
      }
    } else if (activeOrder?.address) {
      const cMatch = activeOrder.address.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
      if (cMatch) {
        destLat = parseFloat(cMatch[1]);
        destLon = parseFloat(cMatch[2]);
      }
    }

    const depotLat = 17.3550;
    const depotLon = 78.5150;
    const midLat = (depotLat + destLat) / 2;
    const midLon = (depotLon + destLon) / 2;

    const currentLat = activeOrder?.captainLat || (isOutForDelivery ? midLat : depotLat);
    const currentLon = activeOrder?.captainLon || (isOutForDelivery ? midLon : depotLon);

    const shortSiteTitle = activeOrder?.address
      ? activeOrder.address.split(',')[0].trim()
      : 'Delivery Site';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; }
    .tanker-wrap {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      transition: all 1.2s ease-in-out;
    }
    .tanker-pill {
      background: #DC2626; color: #FFFFFF; font-weight: 800; font-size: 11px;
      padding: 3px 8px; border-radius: 12px; border: 2px solid #FFFFFF;
      box-shadow: 0 4px 10px rgba(220, 38, 38, 0.45); white-space: nowrap; text-align: center;
      margin-top: 2px;
    }
    .pulse-ring {
      width: 44px; height: 44px; border-radius: 50%; background: rgba(220, 38, 38, 0.3);
      position: absolute; top: -7px; left: 5px; animation: pulse 1.8s infinite; pointer-events: none;
    }
    @keyframes pulse { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(2.4); opacity: 0; } }
    .site-pill {
      background: #0F172A; color: #FFFFFF; font-weight: 800; font-size: 10.5px;
      padding: 3px 8px; border-radius: 10px; border: 2px solid #FFFFFF;
      box-shadow: 0 3px 8px rgba(0,0,0,0.3); white-space: nowrap; text-align: center;
    }
    .depot-pill {
      background: #059669; color: #FFFFFF; font-weight: 800; font-size: 10px;
      padding: 2px 7px; border-radius: 8px; border: 1.5px solid #FFFFFF;
      white-space: nowrap; text-align: center;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var depot = [${depotLat}, ${depotLon}];
    var site = [${destLat}, ${destLon}];
    var livePos = [${currentLat}, ${currentLon}];
    
    var waypoints = [
      depot,
      [${(depotLat * 0.7 + destLat * 0.3).toFixed(6)}, ${(depotLon * 0.7 + destLon * 0.3).toFixed(6)}],
      livePos,
      [${(depotLat * 0.3 + destLat * 0.7).toFixed(6)}, ${(depotLon * 0.3 + destLon * 0.7).toFixed(6)}],
      site
    ];

    var map = L.map('map', { zoomControl: false, attributionControl: false }).setView(livePos, 13);
    L.control.zoom({ position: 'topleft' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    // Route Polyline
    L.polyline(waypoints, { color: '#DC2626', weight: 5, opacity: 0.85, dashArray: '8, 8' }).addTo(map);

    // 1. Site Destination Marker
    var siteIcon = L.divIcon({
      className: 'site-marker',
      html: '<div style="display:flex; flex-direction:column; align-items:center;"><div style="font-size:26px;">📍</div><div class="site-pill">${shortSiteTitle}</div></div>',
      iconSize: [120, 54],
      iconAnchor: [60, 48]
    });
    L.marker(site, { icon: siteIcon }).addTo(map);

    // 2. Fuel Depot Marker
    var depotIcon = L.divIcon({
      className: 'depot-marker',
      html: '<div style="display:flex; flex-direction:column; align-items:center;"><div style="font-size:22px;">⛽</div><div class="depot-pill">Terminal Depot</div></div>',
      iconSize: [100, 46],
      iconAnchor: [50, 40]
    });
    L.marker(depot, { icon: depotIcon }).addTo(map);

    // 3. Live Moving Bowser Fuel Tanker Marker (🚚⛽ Extra Diesel Captain)
    var bowserIcon = L.divIcon({
      className: 'bowser-marker',
      html: '<div class="tanker-wrap" style="position:relative;"><div class="pulse-ring"></div><div style="font-size:32px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">🚛⛽</div><div class="tanker-pill">${bowserNo}</div></div>',
      iconSize: [120, 64],
      iconAnchor: [60, 36]
    });

    var bowserMarker = L.marker(livePos, { icon: bowserIcon }).addTo(map);

    var currentStep = 1;
    setInterval(function() {
      currentStep = (currentStep + 1) % waypoints.length;
      if (currentStep === 0) currentStep = 1;
      bowserMarker.setLatLng(waypoints[currentStep]);
    }, 3800);

    map.fitBounds(L.latLngBounds([depot, site]), { padding: [40, 40] });
  </script>
</body>
</html>`;
  };

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
            ? 'Fuel Dispensed & Delivered • Tax Invoice Ready'
            : activeOrder.status === 'arrived'
            ? 'Bowser Captain Arrived at Site • Ready to Dispense'
            : activeOrder.status === 'out_for_delivery'
            ? 'Fuel Tanker Dispatched • Bowser En Route'
            : isAssigned
            ? `Captain Assigned • Tanker Loading at Depot`
            : `Order Confirmed • Scheduled Slot: ${activeOrder.slot || '08:00 AM - 12:00 PM'}`}
        </Text>
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

      {/* Interactive Live Map (Real Leaflet/OpenStreetMap with moving Fuel Bowser Tanker like Rapido/Swiggy) */}
      <View style={styles.mapCard}>
        {Platform.OS === 'web' ? (
          <iframe
            srcDoc={getInteractiveMapHtml()}
            title="Live Bowser Tracking Map"
            style={{
              width: '100%',
              height: 340,
              border: 'none',
              borderRadius: 14,
            } as any}
          />
        ) : (
          <WebView
            originWhitelist={['*']}
            source={{ html: getInteractiveMapHtml() }}
            style={{
              width: '100%',
              height: 340,
              borderRadius: 14,
              backgroundColor: '#E2E8F0',
            }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            scrollEnabled={false}
          />
        )}

        {/* Live Overlay Stats Pill */}
        <View style={styles.mapOverlayPill}>
          <Ionicons name="speedometer" size={16} color={COLORS.primary} />
          <Text style={styles.mapOverlayText}>
            {isDelivered
              ? 'Fuel Dispensed & Delivered • Tax Invoice Ready'
              : activeOrder.status === 'arrived'
              ? 'Captain Arrived at Site • Dispenser Connected'
              : isOutForDelivery
              ? `Bowser ${bowserNo} en route • ETA: ~${etaMins}m`
              : isAssigned
              ? `Bowser Assigned • Preparing at depot`
              : `Order Confirmed • Dispatch desk active`}
          </Text>
        </View>

        <View style={styles.livePulsePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveDotText}>LIVE GPS</Text>
        </View>
      </View>

      {/* Driver & Bowser Card */}
      {!activeOrder.assignedToName ? (
        <View style={[styles.driverCard, { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }]}>
          <View style={styles.driverInfoRow}>
            <View style={[styles.driverAvatarCircle, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="hourglass-outline" size={24} color={COLORS.white} />
            </View>
            <View style={styles.driverDetails}>
              <Text style={[styles.driverName, { color: '#B45309' }]}>Delivery Partner Not Assigned Yet</Text>
              <Text style={{ fontSize: 12.5, color: '#78350F', marginTop: 3, lineHeight: 18 }}>
                Your order is confirmed. Our hub dispatch team is assigning an authorized bowser captain shortly.
              </Text>
            </View>
          </View>
        </View>
      ) : (
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
                <Text style={styles.ratingText}>Verified Bowser Captain</Text>
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
      )}

      {/* Flipkart / Amazon Style Delivery Milestone Timeline */}
      <View style={styles.timelineCard}>
        <View style={styles.timelineHeader}>
          <Ionicons name="git-commit-outline" size={20} color={COLORS.primary} />
          <Text style={styles.timelineTitle}>Delivery Milestones</Text>
        </View>

        {/* Milestone 1: Order Confirmed */}
        <View style={styles.timelineItem}>
          <View style={styles.timelineDotActive}>
            <Ionicons name="checkmark" size={14} color={COLORS.white} />
          </View>
          <View style={styles.timelineTextContainer}>
            <Text style={styles.timelineItemTitle}>Order Confirmed</Text>
            <Text style={styles.timelineItemTime}>
              Smart automated dispenser verified • {activeOrder.date || 'Today'}
            </Text>
          </View>
        </View>

        <View style={[styles.timelineLine, isAssigned ? styles.lineActive : styles.linePending]} />

        {/* Milestone 2: Bowser Captain Assigned & Tanker Loaded */}
        <View style={styles.timelineItem}>
          <View style={isAssigned ? styles.timelineDotActive : styles.timelineDotPending}>
            {isAssigned && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
          </View>
          <View style={styles.timelineTextContainer}>
            <Text style={isAssigned ? styles.timelineItemTitle : styles.timelineItemPending}>
              Captain Assigned & Fuel Tanker Dispatched
            </Text>
            <Text style={styles.timelineItemTime}>
              {isAssigned
                ? `Captain ${driverName} assigned • Tanker loaded with certified BS-VI diesel (832 kg/m³)`
                : 'Awaiting bowser captain allocation from nearest hub depot'}
            </Text>
          </View>
        </View>

        <View style={[styles.timelineLine, isOutForDelivery ? styles.lineActive : styles.linePending]} />

        {/* Milestone 3: Out for Delivery (Bowser En Route) */}
        <View style={styles.timelineItem}>
          <View
            style={
              isOutForDelivery
                ? [styles.timelineDotActive, { backgroundColor: COLORS.primary }]
                : styles.timelineDotPending
            }
          >
            {isOutForDelivery && <Ionicons name="car" size={14} color={COLORS.white} />}
          </View>
          <View style={styles.timelineTextContainer}>
            <Text
              style={
                isOutForDelivery
                  ? [styles.timelineItemTitle, { color: COLORS.primary }]
                  : styles.timelineItemPending
              }
            >
              Out for Delivery (Bowser En Route)
            </Text>
            <Text style={styles.timelineItemTime}>
              {isOutForDelivery
                ? `Bowser ${bowserNo} dispatched • Moving towards your delivery destination`
                : 'Bowser will depart from depot terminal during your scheduled slot'}
            </Text>
          </View>
        </View>

        <View style={[styles.timelineLine, isArrived ? styles.lineActive : styles.linePending]} />

        {/* Milestone 4: Captain Arrived at Site */}
        <View style={styles.timelineItem}>
          <View
            style={
              isArrived
                ? [styles.timelineDotActive, { backgroundColor: '#D97706' }]
                : styles.timelineDotPending
            }
          >
            {isArrived && <Ionicons name="location" size={14} color={COLORS.white} />}
          </View>
          <View style={styles.timelineTextContainer}>
            <Text
              style={
                isArrived
                  ? [styles.timelineItemTitle, { color: '#D97706' }]
                  : styles.timelineItemPending
              }
            >
              Captain Arrived at Site
            </Text>
            <Text style={styles.timelineItemTime}>
              {isArrived
                ? 'Bowser has reached your site location • Ready for fueling & smart dispenser connection'
                : 'Captain notification will trigger upon arriving at your destination site'}
            </Text>
          </View>
        </View>

        <View style={[styles.timelineLine, isDelivered ? styles.lineActive : styles.linePending]} />

        {/* Milestone 5: Diesel Dispensed & Delivered */}
        <View style={styles.timelineItem}>
          <View style={isDelivered ? styles.timelineDotActive : styles.timelineDotPending}>
            {isDelivered && <Ionicons name="checkmark-done" size={14} color={COLORS.white} />}
          </View>
          <View style={styles.timelineTextContainer}>
            <Text style={isDelivered ? styles.timelineItemTitle : styles.timelineItemPending}>
              Diesel Dispensed & Delivered
            </Text>
            <Text style={styles.timelineItemTime}>
              {isDelivered
                ? `Dispensed ${activeOrder.liters}L BS-VI Diesel with automated digital meter receipt`
                : 'Final status once fuel dumping & digital metering is completed by captain'}
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
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
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
