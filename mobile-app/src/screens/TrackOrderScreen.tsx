import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { io, Socket } from 'socket.io-client';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { ScreenName } from '../types';
import { APP_CONFIG } from '../constants/config';
import { sendSystemNotification } from '../services/notificationService';
import { TANKER_MARKER_BASE64 } from '../constants/tankerMarkerBase64';

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
  captainSpeed?: number | null;
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
  const [parentScrollEnabled, setParentScrollEnabled] = useState(true);

  const webViewRef = useRef<any>(null);
  const iframeRef = useRef<any>(null);
  const socketRef = useRef<Socket | null>(null);

  const baseUrl = APP_CONFIG.LIVE_API_BASE_URL || 'https://extradiesel.in';

  // Helper to push real-time GPS coordinates to Leaflet Map iframe or WebView
  const sendCoordsToMap = (lat: number, lon: number, heading?: number | null) => {
    const payload = JSON.stringify({ type: 'BOWSER_GPS', lat, lon, heading: heading ?? null });
    try {
      if (Platform.OS === 'web') {
        if (iframeRef.current && (iframeRef.current as any).contentWindow) {
          (iframeRef.current as any).contentWindow.postMessage(payload, '*');
        }
      } else {
        if (webViewRef.current) {
          webViewRef.current.postMessage(payload);
        }
      }
    } catch (e) {}
  };

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

  // Real-Time Socket.io Live Tracking Connection
  useEffect(() => {
    if (!activeOrder?.id || activeOrder.status === 'delivered') return;

    const socket = io(baseUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 25,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_order_track', activeOrder.id);
    });

    // Receive sub-second live GPS coordinates broadcast from Bowser Captain's phone
    socket.on('bowser_location_changed', (data: { orderId: string; lat: number; lon: number; heading?: number | null; speed?: number | null }) => {
      if (data && data.orderId === activeOrder.id) {
        setActiveOrder((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            captainLat: data.lat,
            captainLon: data.lon,
            captainHeading: data.heading,
            captainSpeed: data.speed,
            lastLocationUpdate: new Date().toISOString(),
          };
        });
        sendCoordsToMap(data.lat, data.lon, data.heading);
      }
    });

    // Receive immediate status transitions (e.g. Assigned -> Out for Delivery -> Arrived)
    socket.on('order_status_changed', (data: { orderId: string; status: any; statusText?: string; order?: any }) => {
      if (data && data.orderId === activeOrder.id) {
        setActiveOrder((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            ...(data.order || {}),
            status: data.status,
            statusText: data.statusText || prev.statusText,
          };
        });
      }
    });

    return () => {
      socket.emit('leave_order_track', activeOrder.id);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [activeOrder?.id, baseUrl]);

  // Periodic 8-second polling fallback to keep order state in sync
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
          if (data.order.captainLat && data.order.captainLon) {
            sendCoordsToMap(data.order.captainLat, data.order.captainLon, data.order.captainHeading);
          }
        }
      } catch (e) {}
    }, 8000);

    return () => clearInterval(pollTimer);
  }, [activeOrder?.id, activeOrder?.status]);

  // Calculate genuine Haversine distance between Bowser and Delivery Site
  const calcDistance = useMemo(() => {
    if (!activeOrder?.captainLat || !activeOrder?.captainLon) return null;
    let dLat = 17.313112;
    let dLon = 78.545285;
    if (activeOrder.mapsLink) {
      const q = activeOrder.mapsLink.match(/(?:q|destination|query)=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (q) {
        dLat = parseFloat(q[1]);
        dLon = parseFloat(q[2]);
      }
    } else if (activeOrder.address) {
      const c = activeOrder.address.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
      if (c) {
        dLat = parseFloat(c[1]);
        dLon = parseFloat(c[2]);
      }
    }
    const R = 6371; // km
    const dL = ((dLat - activeOrder.captainLat) * Math.PI) / 180;
    const dO = ((dLon - activeOrder.captainLon) * Math.PI) / 180;
    const a =
      Math.sin(dL / 2) * Math.sin(dL / 2) +
      Math.cos((activeOrder.captainLat * Math.PI) / 180) *
        Math.cos((dLat * Math.PI) / 180) *
        Math.sin(dO / 2) *
        Math.sin(dO / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  }, [activeOrder?.captainLat, activeOrder?.captainLon, activeOrder?.address, activeOrder?.mapsLink]);

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
  const isTripActive = activeOrder.status === 'out_for_delivery';
  const isOutForDelivery = isTripActive || isArrived;
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

    const currentLat = activeOrder?.captainLat || (activeOrder.status === 'out_for_delivery' ? midLat : (isArrived || isDelivered ? destLat : depotLat));
    const currentLon = activeOrder?.captainLon || (activeOrder.status === 'out_for_delivery' ? midLon : (isArrived || isDelivered ? destLon : depotLon));

    const shortSiteTitle = activeOrder?.address
      ? activeOrder.address.split(',')[0].trim()
      : 'Delivery Site';

    const isTripActive = activeOrder.status === 'out_for_delivery';
    const isStationaryAtDepot = !isTripActive && !isArrived && !isDelivered;
    const isStationaryAtSite = isArrived || isDelivered;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=20.0, user-scalable=yes" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { box-sizing: border-box; }
    body, html, #map {
      margin: 0; padding: 0; width: 100%; height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f1f5f9;
      touch-action: pan-x pan-y pinch-zoom;
    }
    .tanker-marker-wrap {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      width: 68px; height: 68px;
    }
    .tanker-rotator {
      width: 54px; height: 54px;
      display: flex; align-items: center; justify-content: center;
      transform-origin: center center;
      transition: transform 0.25s linear;
    }
    .tanker-img {
      width: 52px; height: 52px; object-fit: contain;
      filter: drop-shadow(0 4px 10px rgba(0,0,0,0.45));
    }
    .pulse-glow {
      position: absolute; width: 50px; height: 50px; border-radius: 50%;
      background: rgba(37, 99, 235, 0.25);
      animation: pulseAnim 2s infinite ease-out; pointer-events: none;
    }
    @keyframes pulseAnim {
      0% { transform: scale(0.6); opacity: 1; }
      100% { transform: scale(2.2); opacity: 0; }
    }
    .tanker-pill {
      background: #2563EB; color: #FFFFFF; font-weight: 800; font-size: 10px;
      padding: 2px 8px; border-radius: 12px; border: 1.5px solid #FFFFFF;
      box-shadow: 0 3px 8px rgba(37, 99, 235, 0.4); white-space: nowrap; text-align: center;
      margin-top: -3px;
    }
    .site-pill {
      background: #0F172A; color: #FFFFFF; font-weight: 800; font-size: 10.5px;
      padding: 3px 8px; border-radius: 8px; border: 2px solid #FFFFFF;
      box-shadow: 0 3px 8px rgba(0,0,0,0.3); white-space: nowrap; text-align: center;
      margin-top: -2px;
    }
    .depot-pill {
      background: #059669; color: #FFFFFF; font-weight: 800; font-size: 10px;
      padding: 2px 7px; border-radius: 8px; border: 1.5px solid #FFFFFF;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25); white-space: nowrap; text-align: center;
      margin-top: -2px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var depot = [${depotLat}, ${depotLon}];
    var site = [${destLat}, ${destLon}];
    var isTripActive = ${isTripActive ? 'true' : 'false'};
    var isStationaryAtDepot = ${isStationaryAtDepot ? 'true' : 'false'};
    var isStationaryAtSite = ${isStationaryAtSite ? 'true' : 'false'};

    var livePos = isStationaryAtDepot ? depot : (isStationaryAtSite ? site : [${currentLat}, ${currentLon}]);
    
    // Road polyline waypoints
    var waypoints = [
      depot,
      [${(depotLat * 0.75 + destLat * 0.25).toFixed(6)}, ${(depotLon * 0.75 + destLon * 0.25).toFixed(6)}],
      [${(depotLat * 0.50 + destLat * 0.50).toFixed(6)}, ${(depotLon * 0.50 + destLon * 0.50).toFixed(6)}],
      [${(depotLat * 0.25 + destLat * 0.75).toFixed(6)}, ${(depotLon * 0.25 + destLon * 0.75).toFixed(6)}],
      site
    ];

    var map = L.map('map', {
      zoomControl: true,
      attributionControl: false,
      dragging: true,
      touchZoom: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      boxZoom: true,
      tap: true,
      bounceAtZoomLimits: true
    }).setView(livePos, 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    // 1. Highlighted Blue Polyline Route (Google Maps / Swiggy / Rapido style)
    // Darker blue outer border casing
    L.polyline(waypoints, {
      color: '#1E40AF',
      weight: 8,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // Bright cyan/blue inner route
    L.polyline(waypoints, {
      color: '#3B82F6',
      weight: 5,
      opacity: 1,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // 2. Site Destination Marker (Red Location Pin)
    var siteIcon = L.divIcon({
      className: 'site-marker-box',
      html: '<div style="display:flex; flex-direction:column; align-items:center;"><div style="font-size:28px;">📍</div><div class="site-pill">${shortSiteTitle}</div></div>',
      iconSize: [120, 56],
      iconAnchor: [60, 50]
    });
    L.marker(site, { icon: siteIcon }).addTo(map);

    // 3. Fuel Depot Marker
    var depotIcon = L.divIcon({
      className: 'depot-marker-box',
      html: '<div style="display:flex; flex-direction:column; align-items:center;"><div style="font-size:24px;">⛽</div><div class="depot-pill">Terminal Depot</div></div>',
      iconSize: [100, 48],
      iconAnchor: [50, 42]
    });
    L.marker(depot, { icon: depotIcon }).addTo(map);

    // 4. Custom 2D/3D Top-Down Fuel Tanker Icon Marker
    var tankerStatusLabel = isTripActive
      ? '${bowserNo}'
      : (isStationaryAtDepot ? 'Parked at Depot' : 'Arrived at Site');

    var tankerIcon = L.divIcon({
      className: 'custom-tanker-marker',
      html: '<div class="tanker-marker-wrap" style="position:relative;"><div class="pulse-glow" style="display:' + (isTripActive ? 'block' : 'none') + '"></div><div class="tanker-rotator" id="tankerRotator"><img src="${TANKER_MARKER_BASE64}" class="tanker-img" alt="Tanker" /></div><div class="tanker-pill">' + tankerStatusLabel + '</div></div>',
      iconSize: [68, 68],
      iconAnchor: [34, 34]
    });
    var bowserMarker = L.marker(livePos, { icon: tankerIcon }).addTo(map);

    // Smooth Linear Interpolation (lerp) & Bearing Rotation
    function lerp(a, b, t) {
      return a + (b - a) * t;
    }

    function calculateBearing(lat1, lon1, lat2, lon2) {
      var dLon = (lon2 - lon1) * Math.PI / 180;
      var y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
      var x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
              Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
      var brng = Math.atan2(y, x) * 180 / Math.PI;
      return (brng + 360) % 360;
    }

    var curLat = livePos[0];
    var curLon = livePos[1];
    var targetLat = livePos[0];
    var targetLon = livePos[1];
    var curAngle = 0;
    var targetAngle = 0;

    // 60fps continuous smooth motion loop
    function animateFrame() {
      curLat = lerp(curLat, targetLat, 0.08);
      curLon = lerp(curLon, targetLon, 0.08);

      var diff = (targetAngle - curAngle + 180) % 360 - 180;
      curAngle = (curAngle + diff * 0.12 + 360) % 360;

      bowserMarker.setLatLng([curLat, curLon]);
      var rot = document.getElementById('tankerRotator');
      if (rot) {
        rot.style.transform = 'rotate(' + curAngle.toFixed(1) + 'deg)';
      }
      requestAnimationFrame(animateFrame);
    }
    requestAnimationFrame(animateFrame);

    function updateTankerPos(newLat, newLon, explicitAngle) {
      if (typeof newLat !== 'number' || typeof newLon !== 'number' || isNaN(newLat) || isNaN(newLon)) return;
      var bearing = (explicitAngle !== undefined && explicitAngle !== null && !isNaN(explicitAngle))
        ? explicitAngle
        : calculateBearing(curLat, curLon, newLat, newLon);
      targetLat = newLat;
      targetLon = newLon;
      targetAngle = bearing;
    }

    // Real-Time GPS updates via Web & Mobile WebView messages (Sub-second sync)
    function onIncomingGps(data) {
      if (!data) return;
      var nLat = parseFloat(data.lat);
      var nLon = parseFloat(data.lon);
      if (!isNaN(nLat) && !isNaN(nLon)) {
        updateTankerPos(nLat, nLon, data.heading);
      }
    }

    window.addEventListener('message', function(event) {
      try {
        var msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (msg && (msg.type === 'BOWSER_GPS' || msg.lat !== undefined)) {
          onIncomingGps(msg);
        }
      } catch (err) {}
    });

    document.addEventListener('message', function(event) {
      try {
        var msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (msg && (msg.type === 'BOWSER_GPS' || msg.lat !== undefined)) {
          onIncomingGps(msg);
        }
      } catch (err) {}
    });

    map.fitBounds(L.latLngBounds([depot, site]), { padding: [40, 40] });
  </script>
</body>
</html>`;
  };

  return (
    <ScrollView
      style={styles.container}
      scrollEnabled={parentScrollEnabled}
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
      <View
        style={styles.mapCard}
        onTouchStart={() => setParentScrollEnabled(false)}
        onTouchEnd={() => setParentScrollEnabled(true)}
        onTouchCancel={() => setParentScrollEnabled(true)}
      >
        {Platform.OS === 'web' ? (
          <iframe
            ref={iframeRef}
            srcDoc={getInteractiveMapHtml()}
            title="Live Bowser Tracking Map"
            style={{
              width: '100%',
              height: 360,
              border: 'none',
              borderRadius: 14,
            } as any}
          />
        ) : (
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: getInteractiveMapHtml() }}
            style={{
              width: '100%',
              height: 360,
              borderRadius: 14,
              backgroundColor: '#E2E8F0',
            }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            scrollEnabled={true}
            nestedScrollEnabled={true}
            setBuiltInZoomControls={false}
            setDisplayZoomControls={false}
            overScrollMode="never"
          />
        )}

        {/* Live GPS Badge */}
        <View style={[
          styles.livePulsePill,
          !isTripActive && !isDelivered && { backgroundColor: 'rgba(15, 23, 42, 0.82)' },
          isDelivered && { backgroundColor: 'rgba(5, 150, 105, 0.9)' }
        ]}>
          <View style={[
            styles.liveDot,
            !isTripActive && !isDelivered && { backgroundColor: '#F59E0B' },
            isDelivered && { backgroundColor: '#10B981' }
          ]} />
          <Text style={styles.liveDotText}>
            {isTripActive
              ? 'LIVE GPS TRACKING'
              : isDelivered
              ? 'DELIVERY COMPLETE'
              : isAssigned
              ? 'PREPARING AT DEPOT'
              : 'AWAITING DISPATCH'}
          </Text>
        </View>
      </View>

      {/* Swiggy / Rapido Style Live Status & ETA Bottom Card */}
      <View style={styles.swiggyBottomCard}>
        <View style={styles.bottomCardHandle} />

        <View style={styles.etaHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.etaTitleText}>
              {isDelivered
                ? 'Delivered at Site'
                : activeOrder.status === 'arrived'
                ? 'Captain Arrived at Site'
                : isTripActive
                ? (calcDistance !== null ? `Bowser En Route • ${calcDistance} km away` : 'Bowser En Route to Destination')
                : isAssigned
                ? 'Bowser Captain Assigned'
                : 'Order Confirmed'}
            </Text>
            <Text style={styles.etaDistanceText}>
              {isDelivered
                ? '100% BS-VI Pure Dispensed • Complete'
                : activeOrder.status === 'arrived'
                ? 'Captain ready to connect hose & dispense fuel'
                : isTripActive
                ? (activeOrder.captainSpeed && activeOrder.captainSpeed > 0
                    ? `Live GPS Active • Bowser moving at ${Math.round(activeOrder.captainSpeed)} km/h`
                    : 'Real-time Live GPS Active • Connected via WebSocket')
                : isAssigned
                ? 'Tanker loading and safety check at dispatch depot'
                : `Scheduled Slot: ${activeOrder.slot || '08:00 AM - 12:00 PM'}`}
            </Text>
          </View>
          <View style={[styles.etaPillBadge, isTripActive && { backgroundColor: '#DCFCE7' }]}>
            <Ionicons
              name={isTripActive ? 'navigate' : isDelivered ? 'checkmark-circle' : 'time-outline'}
              size={15}
              color={isTripActive ? '#059669' : isDelivered ? '#059669' : '#64748B'}
            />
            <Text style={[styles.etaPillBadgeText, isTripActive && { color: '#059669' }]}>
              {isTripActive ? 'LIVE' : isDelivered ? 'DONE' : isAssigned ? 'PREP' : 'WAIT'}
            </Text>
          </View>
        </View>

        {/* Dynamic Progress Bar */}
        <View style={styles.etaProgressBarTrack}>
          <View
            style={[
              styles.etaProgressBarFill,
              {
                width: isDelivered
                  ? '100%'
                  : activeOrder.status === 'arrived'
                  ? '85%'
                  : isOutForDelivery
                  ? '60%'
                  : isAssigned
                  ? '30%'
                  : '15%',
              },
            ]}
          />
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
  swiggyBottomCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  bottomCardHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  etaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  etaTitleText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  etaDistanceText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  etaPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  etaPillBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563EB',
  },
  etaProgressBarTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  etaProgressBarFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 3,
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
