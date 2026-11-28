import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
  Modal,
  useWindowDimensions,
} from 'react-native';
import * as Location from 'expo-location';
import { io, Socket } from 'socket.io-client';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { ScreenName } from '../types';
import { APP_CONFIG } from '../constants/config';
import { sendSystemNotification } from '../services/notificationService';
import { TANKER_MARKER_BASE64 } from '../constants/tankerMarkerBase64';

interface DeliveryDashboardScreenProps {
  onNavigate: (screen: ScreenName) => void;
  onLogout: () => void;
  currentUser?: {
    name: string;
    email: string;
    phone?: string;
    vehicleNumber?: string;
  };
}

interface DeliveryOrder {
  id: string;
  name: string;
  email: string;
  phone?: string;
  date: string;
  liters: number;
  fuelRate: number;
  deliveryFee: number;
  total: number;
  status: 'pending' | 'assigned' | 'out_for_delivery' | 'arrived' | 'delivered' | 'cancelled';
  statusText?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  address: string;
  mapsLink?: string | null;
  vehicleType?: string;
  slot?: string;
  assignedTo?: string | null;
  assignedToName?: string | null;
  vehicleNumber?: string | null;
  dispatchedAt?: string;
  arrivedAt?: string;
  deliveredAt?: string;
}

export const DeliveryDashboardScreen: React.FC<DeliveryDashboardScreenProps> = ({
  onNavigate,
  onLogout,
  currentUser,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [activeTab, setActiveTab] = useState<'assigned' | 'completed'>('assigned');
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // GPS Tracking States
  const [showGpsModal, setShowGpsModal] = useState<boolean>(true);
  const [isGpsActive, setIsGpsActive] = useState<boolean>(false);
  const [captainCoords, setCaptainCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [lastGpsSyncTime, setLastGpsSyncTime] = useState<string | null>(null);
  const [navigatingOrder, setNavigatingOrder] = useState<DeliveryOrder | null>(null);
  const [floatingPipOrder, setFloatingPipOrder] = useState<DeliveryOrder | null>(null);
  const scrollViewRef = useRef<any>(null);
  const gpsIntervalRef = useRef<any>(null);
  const locationSubRef = useRef<any>(null);
  const socketRef = useRef<Socket | null>(null);
  const ordersRef = useRef<DeliveryOrder[]>(orders);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());

  // Keep ordersRef in sync with latest orders state to avoid stale closure in timers
  useEffect(() => {
    ordersRef.current = orders;
    if (floatingPipOrder) {
      const updated = orders.find((o) => o.id === floatingPipOrder.id);
      if (updated) {
        if (updated.status === 'delivered' || updated.status === 'cancelled') {
          setFloatingPipOrder(null);
        } else {
          setFloatingPipOrder(updated);
        }
      }
    }
  }, [orders]);

  // Cash on Delivery Collection Modal State
  const [cashCollectOrder, setCashCollectOrder] = useState<DeliveryOrder | null>(null);

  const baseUrl = APP_CONFIG.LIVE_API_BASE_URL || 'https://extradiesel.in';
  const driverEmail = currentUser?.email || 'delivery@extradiesel.in';

  // Initialize Socket.io connection for sub-second live GPS transmission and instant dispatch alerts
  useEffect(() => {
    const socket = io(baseUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 25,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_driver_channel', driverEmail.toLowerCase().trim());
    });

    socket.on('order_assigned_to_captain', async (data: any) => {
      if (data && data.order) {
        loadDriverOrders();
        await sendSystemNotification(
          '⛽ New Diesel Delivery Assigned!',
          `Order #${data.order.id}: ${data.order.liters}L to ${data.order.address || 'Delivery Site'}. Tap to start delivery trip.`,
          'driver'
        ).catch(() => {});
      }
    });

    socket.on('driver_orders_updated', () => {
      loadDriverOrders();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [baseUrl, driverEmail]);

  // Broadcast current GPS location to backend & socket room for all active assigned orders
  const broadcastLocation = async (lat: number, lon: number, heading?: number, speed?: number) => {
    try {
      const currentOrders = ordersRef.current && ordersRef.current.length > 0 ? ordersRef.current : orders;
      const activeList = currentOrders.filter(
        (o) => o.status === 'out_for_delivery' || o.status === 'arrived' || o.status === 'assigned'
      );

      // 1. Broadcast specifically to each active order's tracking room
      for (const order of activeList) {
        if (socketRef.current) {
          socketRef.current.emit('captain_location_update', {
            orderId: order.id,
            lat,
            lon,
            heading: heading ?? null,
            speed: speed ?? null,
            driverEmail,
          });
        }

        // HTTP POST fallback
        fetch(`${baseUrl}/api/orders/${order.id}/location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat,
            lon,
            heading: heading ?? null,
            speed: speed ?? null,
            driverEmail,
          }),
        }).catch(() => {});
      }

      // 2. Also emit driver-level broadcast so server automatically routes to all orders assigned to this driver
      if (socketRef.current) {
        socketRef.current.emit('captain_location_update', {
          driverEmail,
          lat,
          lon,
          heading: heading ?? null,
          speed: speed ?? null,
        });
      }

      setLastGpsSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (e) {}
  };

  // Turn ON GPS and request permission
  const handleAllowGps = async () => {
    setShowGpsModal(false);
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
              setCaptainCoords(coords);
              setIsGpsActive(true);
              broadcastLocation(coords.lat, coords.lon, pos.coords.heading ?? undefined, pos.coords.speed ?? undefined);
            },
            () => {
              // Fallback to default depot location coordinates
              const fallback = { lat: 17.3850, lon: 78.4867 };
              setCaptainCoords(fallback);
              setIsGpsActive(true);
              broadcastLocation(fallback.lat, fallback.lon);
            },
            { enableHighAccuracy: true }
          );
        }
        return;
      }

      // Native Device GPS Permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'GPS location access is required to track bowser route and broadcast to customers.');
        setIsGpsActive(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coords = { lat: loc.coords.latitude, lon: loc.coords.longitude };
      setCaptainCoords(coords);
      setIsGpsActive(true);
      broadcastLocation(coords.lat, coords.lon, loc.coords.heading ?? undefined, loc.coords.speed ?? undefined);
    } catch (e: any) {
      console.warn('GPS location request error:', e);
      setIsGpsActive(false);
    }
  };

  // Deny GPS
  const handleDenyGps = () => {
    setShowGpsModal(false);
    setIsGpsActive(false);
  };

  // Live GPS Location Watcher & Transmitter (continuous 5 seconds interval + native watcher)
  useEffect(() => {
    if (!isGpsActive) {
      if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
      if (locationSubRef.current) {
        locationSubRef.current.remove?.();
        locationSubRef.current = null;
      }
      return;
    }

    const intervalMs = 5000; // Exact 5-second automatic update

    // Robust function to get current location and broadcast to Socket.io and DB
    const fetchAndTransmitCoords = async () => {
      try {
        if (Platform.OS === 'web') {
          if (typeof navigator !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const c = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                setCaptainCoords(c);
                broadcastLocation(c.lat, c.lon, pos.coords.heading ?? undefined, pos.coords.speed ?? undefined);
              },
              () => {},
              { enableHighAccuracy: true, maximumAge: 3000, timeout: 5000 }
            );
          }
        } else {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          const c = { lat: loc.coords.latitude, lon: loc.coords.longitude };
          setCaptainCoords(c);
          broadcastLocation(c.lat, c.lon, loc.coords.heading ?? undefined, loc.coords.speed ?? undefined);
        }
      } catch (err) {}
    };

    // Immediate ping
    fetchAndTransmitCoords();

    // Native continuous position watcher
    if (Platform.OS !== 'web') {
      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5,
          timeInterval: 4000,
        },
        (loc) => {
          const c = { lat: loc.coords.latitude, lon: loc.coords.longitude };
          setCaptainCoords(c);
          broadcastLocation(c.lat, c.lon, loc.coords.heading ?? undefined, loc.coords.speed ?? undefined);
        }
      ).then((sub) => {
        locationSubRef.current = sub;
      }).catch(() => {});
    }

    // Repeating timer every 5 seconds without requiring manual screen refresh
    gpsIntervalRef.current = setInterval(fetchAndTransmitCoords, intervalMs);

    return () => {
      if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
      if (locationSubRef.current) {
        locationSubRef.current.remove?.();
        locationSubRef.current = null;
      }
    };
  }, [isGpsActive]);

  // Load driver's assigned orders
  const loadDriverOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${baseUrl}/api/orders?deliveryBoyEmail=${encodeURIComponent(driverEmail)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        const newOrders = data.orders as DeliveryOrder[];
        if (knownOrderIdsRef.current.size > 0) {
          for (const o of newOrders) {
            if (!knownOrderIdsRef.current.has(o.id) && (o.status === 'assigned' || o.status === 'out_for_delivery')) {
              sendSystemNotification(
                '⛽ New Diesel Delivery Assigned!',
                `Order #${o.id}: ${o.liters}L to ${o.address || 'Delivery Site'}. Tap to start delivery trip.`,
                'driver'
              ).catch(() => {});
            }
          }
        }
        newOrders.forEach((o) => knownOrderIdsRef.current.add(o.id));
        setOrders(newOrders);
      }
    } catch (e) {
      console.error('Failed to load driver orders:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDriverOrders();
  }, [driverEmail]);

  // Handle Status Update (Out for Delivery, Arrived at Site, or Delivered)
  const handleUpdateStatus = async (
    orderId: string,
    newStatus: 'out_for_delivery' | 'arrived' | 'delivered',
    extraPayload?: { paymentStatus?: string; paymentMethod?: string }
  ) => {
    setUpdatingOrderId(orderId);
    try {
      const statusTextMap = {
        out_for_delivery: 'Out for Delivery (Bowser En Route)',
        arrived: 'Captain Arrived at Site (Ready to Dispense)',
        delivered: 'Delivered',
      };

      const res = await fetch(`${baseUrl}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          statusText: statusTextMap[newStatus],
          ...(extraPayload || {}),
        }),
      });

      const data = await res.json();
      if (data.success) {
        const msgMap = {
          out_for_delivery: `Order #${orderId} marked Out for Delivery. Bowser en route.`,
          arrived: `Order #${orderId} marked Arrived at Site. Customer notified!`,
          delivered: `Order #${orderId} marked as Fuel Delivered successfully!`,
        };
        Alert.alert('Status Updated', msgMap[newStatus]);
        loadDriverOrders();
      } else {
        Alert.alert('Error', data.error || 'Failed to update order status');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Connection error');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Handle Mark Delivered click with COD check
  const handleDeliveredClick = (order: DeliveryOrder) => {
    const isCod =
      order.paymentMethod?.toLowerCase().includes('cash') ||
      order.paymentStatus === 'pending' ||
      order.paymentStatus === 'COD_PENDING';

    if (isCod) {
      // Prompt modal to collect cash before completing delivery
      setCashCollectOrder(order);
    } else {
      handleUpdateStatus(order.id, 'delivered');
    }
  };

  // Call Customer
  const handleCallCustomer = (phone?: string) => {
    if (!phone) {
      Alert.alert('No Phone', 'No contact phone number provided for this order.');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  // Extract destination GPS coordinates
  const getOrderCoords = (order: DeliveryOrder) => {
    if (order.mapsLink) {
      const m = order.mapsLink.match(/([-+]?\d+\.\d+)\s*,\s*([-+]?\d+\.\d+)/);
      if (m) return { lat: parseFloat(m[1]), lon: parseFloat(m[2]) };
    }
    const addrMatch = order.address && order.address.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    if (addrMatch) return { lat: parseFloat(addrMatch[1]), lon: parseFloat(addrMatch[2]) };
    return { lat: 17.3850, lon: 78.4867 };
  };

  // Calculate straight-line distance in km
  const getRemainingDistance = (order: DeliveryOrder) => {
    if (!captainCoords) return null;
    const dest = getOrderCoords(order);
    const R = 6371;
    const dLat = ((dest.lat - captainCoords.lat) * Math.PI) / 180;
    const dLon = ((dest.lon - captainCoords.lon) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((captainCoords.lat * Math.PI) / 180) *
        Math.cos((dest.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  // Calculate estimated arrival time in minutes (assuming 25 km/h urban speed)
  const getEtaMinutes = (order: DeliveryOrder) => {
    const distStr = getRemainingDistance(order);
    if (!distStr) return '2';
    const distNum = parseFloat(distStr);
    if (isNaN(distNum) || distNum <= 0) return '1';
    return String(Math.max(1, Math.round((distNum / 25) * 60)));
  };

  // Switch / focus into the Delivery Captain Dashboard when floating card is tapped
  const handleFloatingCardPress = () => {
    setActiveTab('assigned');
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  // Open External Google Maps App if explicitly requested
  const openExternalMapsApp = (order: DeliveryOrder) => {
    if (order.mapsLink && order.mapsLink.trim()) {
      let url = order.mapsLink.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      Linking.openURL(url);
      return;
    }
    const coordMatch = order.address && order.address.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    if (coordMatch) {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${coordMatch[1]},${coordMatch[2]}`);
      return;
    }
    const query = encodeURIComponent(order.address);
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${query}`);
  };

  // Redirect directly to Google Maps navigation + activate PiP floating screen & continuous GPS streaming
  const handleOpenMaps = async (order: DeliveryOrder) => {
    // 1. Ensure GPS tracking is active
    if (!isGpsActive) {
      await handleAllowGps();
    }
    // Request background location permission on native if available
    if (Platform.OS !== 'web' && (Location as any).requestBackgroundPermissionsAsync) {
      try {
        await (Location as any).requestBackgroundPermissionsAsync();
      } catch (e) {}
    }

    // 2. Set Floating PiP active order for continuous dashboard presence
    setFloatingPipOrder(order);

    // 3. Post Sticky System Notification for OS Foreground continuity
    sendSystemNotification(
      '🚚 Bowser Live Navigation Active',
      `Streaming GPS for Order #${order.id} (${order.liters}L). Live tracking active for customer.`,
      'driver',
      true
    ).catch(() => {});

    // 4. Open External Google Maps Navigation App
    openExternalMapsApp(order);
  };

  // Navigation Interactive Map HTML
  const getNavMapHtml = (order: DeliveryOrder) => {
    const dest = getOrderCoords(order);
    const startLat = captainCoords?.lat || 17.3850;
    const startLon = captainCoords?.lon || 78.4867;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body, html, #map { width: 100%; height: 100%; background: #0f172a; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .tanker-marker-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 68px; height: 68px; }
    .tanker-rotator { width: 54px; height: 54px; display: flex; align-items: center; justify-content: center; transform-origin: center center; }
    .tanker-img { width: 52px; height: 52px; object-fit: contain; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.55)); }
    .tanker-pill { background: #2563EB; color: #fff; font-weight: 800; font-size: 10px; padding: 2px 8px; border-radius: 10px; border: 1.5px solid #fff; margin-top: -3px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.3); }
    .site-pill { background: #DC2626; color: #fff; font-weight: 800; font-size: 10px; padding: 3px 8px; border-radius: 8px; border: 2px solid #fff; box-shadow: 0 3px 8px rgba(0,0,0,0.3); margin-top: -2px; white-space: nowrap; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var startPos = [${startLat}, ${startLon}];
    var sitePos = [${dest.lat}, ${dest.lon}];

    var map = L.map('map', { zoomControl: true, attributionControl: false }).setView(startPos, 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    var routeOuter = L.polyline([startPos, sitePos], { color: '#1E40AF', weight: 8, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }).addTo(map);
    var routeInner = L.polyline([startPos, sitePos], { color: '#3B82F6', weight: 5, opacity: 1, lineCap: 'round', lineJoin: 'round' }).addTo(map);

    // Real-World Road Driving Route
    fetch('https://router.project-osrm.org/route/v1/driving/' + startPos[1] + ',' + startPos[0] + ';' + sitePos[1] + ',' + sitePos[0] + '?overview=full&geometries=geojson')
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d && d.routes && d.routes[0] && d.routes[0].geometry) {
          var pts = d.routes[0].geometry.coordinates.map(function(pt) { return [pt[1], pt[0]]; });
          if (pts && pts.length > 1) {
            routeOuter.setLatLngs(pts);
            routeInner.setLatLngs(pts);
            map.fitBounds(L.latLngBounds(pts), { padding: [40, 40] });
          }
        }
      }).catch(function() {});

    // Destination Pin
    var siteIcon = L.divIcon({
      className: 'custom-site-marker',
      html: '<div style="display:flex; flex-direction:column; align-items:center;"><div style="width:36px; height:36px; border-radius:50%; background:#DC2626; display:flex; align-items:center; justify-content:center; border:2px solid #fff; box-shadow:0 3px 10px rgba(0,0,0,0.4);"><span style="font-size:18px;">📍</span></div><div class="site-pill">CUSTOMER SITE</div></div>',
      iconSize: [80, 56],
      iconAnchor: [40, 48]
    });
    L.marker(sitePos, { icon: siteIcon }).addTo(map);

    // Bowser Tanker Marker
    var tankerIcon = L.divIcon({
      className: 'custom-tanker-marker',
      html: '<div class="tanker-marker-wrap"><div class="tanker-rotator" id="tankerRotator"><img src="${TANKER_MARKER_BASE64}" class="tanker-img" alt="Tanker" /></div><div class="tanker-pill">YOUR BOWSER</div></div>',
      iconSize: [68, 68],
      iconAnchor: [34, 34]
    });
    var bowserMarker = L.marker(startPos, { icon: tankerIcon }).addTo(map);

    function calculateBearing(lat1, lon1, lat2, lon2) {
      var dLon = (lon2 - lon1) * Math.PI / 180;
      var lat1Rad = lat1 * Math.PI / 180;
      var lat2Rad = lat2 * Math.PI / 180;
      var y = Math.sin(dLon) * Math.cos(lat2Rad);
      var x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
      var brng = Math.atan2(y, x) * 180 / Math.PI;
      return (brng + 360) % 360;
    }

    var curLat = startPos[0];
    var curLon = startPos[1];
    var targetLat = startPos[0];
    var targetLon = startPos[1];
    var prevGpsLat = startPos[0];
    var prevGpsLon = startPos[1];
    var curAngle = calculateBearing(startPos[0], startPos[1], sitePos[0], sitePos[1]);
    var targetAngle = curAngle;

    function lerp(a, b, t) { return a + (b - a) * t; }

    function animateFrame() {
      curLat = lerp(curLat, targetLat, 0.08);
      curLon = lerp(curLon, targetLon, 0.08);
      var diff = (targetAngle - curAngle + 180) % 360 - 180;
      curAngle = (curAngle + diff * 0.15 + 360) % 360;
      bowserMarker.setLatLng([curLat, curLon]);
      var el = bowserMarker.getElement();
      var rot = el ? el.querySelector('.tanker-rotator') : document.getElementById('tankerRotator');
      if (rot) {
        rot.style.transform = 'rotate(' + curAngle.toFixed(1) + 'deg)';
      }
      requestAnimationFrame(animateFrame);
    }
    requestAnimationFrame(animateFrame);
  </script>
</body>
</html>`;
  };

  // Split orders into Assigned (Active) and Completed
  const assignedOrders = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled');
  const completedOrders = orders.filter((o) => o.status === 'delivered');

  return (
    <View style={styles.container}>
      {/* Top Bowser Driver Header Bar */}
      <View style={styles.driverHeader}>
        <View style={styles.driverHeaderLeft}>
          <View style={styles.driverBadge}>
            <Ionicons name="shield-checkmark" size={14} color={COLORS.white} />
            <Text style={styles.driverBadgeText}>DELIVERY BOWSER PARTNER</Text>
          </View>
          <Text style={styles.driverHeaderName}>{currentUser?.name || 'Ramesh Kumar'}</Text>
          <Text style={styles.driverHeaderVehicle}>
            🚚 {currentUser?.vehicleNumber || 'Bowser TS 09 UB 4521'} • On Duty
          </Text>
        </View>

        <View style={styles.driverHeaderRight}>
          <TouchableOpacity style={styles.refreshIconBtn} onPress={loadDriverOrders}>
            <Ionicons name="reload" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
            <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Live GPS Broadcast Status Banner */}
      <TouchableOpacity
        style={[styles.gpsBanner, isGpsActive ? styles.gpsBannerActive : styles.gpsBannerInactive]}
        onPress={() => {
          if (!isGpsActive) {
            setShowGpsModal(true);
          } else {
            setIsGpsActive(false);
          }
        }}
        activeOpacity={0.85}
      >
        <View style={styles.gpsBannerLeft}>
          <View style={[styles.gpsDot, isGpsActive ? styles.gpsDotActive : styles.gpsDotInactive]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.gpsBannerTitle, isGpsActive ? styles.gpsTextActive : styles.gpsTextInactive]}>
              {isGpsActive ? 'Live GPS Active • Broadcasting' : 'GPS Location is OFF'}
            </Text>
            <Text style={styles.gpsBannerSub}>
              {isGpsActive
                ? `Syncing every 10s • Lat: ${captainCoords?.lat.toFixed(4) || '17.3850'}, Lon: ${captainCoords?.lon.toFixed(4) || '78.4867'}${lastGpsSyncTime ? ` • ${lastGpsSyncTime}` : ''}`
                : 'Tap to turn ON GPS for live route navigation & customer tracking'}
            </Text>
          </View>
        </View>
        <View style={[styles.gpsTogglePill, isGpsActive ? styles.gpsPillActive : styles.gpsPillInactive]}>
          <Text style={[styles.gpsPillText, isGpsActive ? styles.gpsPillTextActive : styles.gpsPillTextInactive]}>
            {isGpsActive ? 'ON' : 'ENABLE'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'assigned' && styles.tabItemActive]}
          onPress={() => setActiveTab('assigned')}
        >
          <Ionicons
            name="navigate"
            size={18}
            color={activeTab === 'assigned' ? COLORS.primary : COLORS.muted}
          />
          <Text style={[styles.tabText, activeTab === 'assigned' && styles.tabTextActive]}>
            Assigned Deliveries ({assignedOrders.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'completed' && styles.tabItemActive]}
          onPress={() => setActiveTab('completed')}
        >
          <Ionicons
            name="checkmark-done-circle"
            size={18}
            color={activeTab === 'completed' ? '#059669' : COLORS.muted}
          />
          <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
            Completed ({completedOrders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollArea}
        contentContainerStyle={[styles.contentContainer, isDesktop && styles.desktopContainer]}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Fetching delivery assignments...</Text>
          </View>
        ) : activeTab === 'assigned' ? (
          assignedOrders.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="checkmark-circle-outline" size={54} color="#059669" />
              <Text style={styles.emptyTitle}>All Caught Up!</Text>
              <Text style={styles.emptySub}>
                You have no pending deliveries assigned right now. When admin assigns a new order, it will appear here.
              </Text>
            </View>
          ) : (
            assignedOrders.map((order) => {
              const isOutForDelivery = order.status === 'out_for_delivery';
              const isArrived = order.status === 'arrived';
              return (
                <View key={order.id} style={styles.deliveryCard}>
                  {/* Order Top Bar */}
                  <View style={styles.deliveryCardTop}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.deliveryOrderId}>#{order.id}</Text>
                      <Text style={styles.deliveryOrderDate}>{order.date}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusTag,
                        {
                          backgroundColor: isArrived
                            ? '#FEF3C7'
                            : isOutForDelivery
                            ? '#EFF6FF'
                            : '#F1F5F9',
                          alignSelf: 'flex-start',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusTagText,
                          {
                            color: isArrived
                              ? '#D97706'
                              : isOutForDelivery
                              ? '#2563EB'
                              : '#475569',
                          },
                        ]}
                      >
                        {isArrived
                          ? '📍 At Site'
                          : isOutForDelivery
                          ? '🚚 En Route'
                          : '📋 Assigned'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  {/* Customer & Fuel Info */}
                  <View style={styles.customerRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.customerLabel}>Customer / Site Contact</Text>
                      <Text style={styles.customerName}>{order.name}</Text>
                      {order.phone ? <Text style={styles.customerPhone}>📞 {order.phone}</Text> : null}
                    </View>

                    <View style={styles.fuelBadge}>
                      <Text style={styles.fuelLiters}>{order.liters} L</Text>
                      <Text style={styles.fuelLabel}>Diesel (BS-VI)</Text>
                    </View>
                  </View>

                  {/* Delivery Location */}
                  <View style={styles.addressBox}>
                    <Ionicons name="location" size={18} color={COLORS.primary} />
                    <Text style={styles.addressText}>{order.address}</Text>
                  </View>

                  {/* Contact & Map Action Buttons */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.callBtn}
                      onPress={() => handleCallCustomer(order.phone)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="call" size={16} color="#059669" />
                      <Text style={styles.callBtnText}>Call Customer</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.mapBtn}
                      onPress={() => handleOpenMaps(order)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="navigate" size={16} color="#2563EB" />
                      <Text style={styles.mapBtnText}>Navigate Map</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.divider} />

                  {/* Payment Info & Status */}
                  {order.paymentMethod?.toLowerCase().includes('cash') ||
                  order.paymentStatus === 'pending' ||
                  order.paymentStatus === 'COD_PENDING' ? (
                    <View style={styles.codPaymentBox}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="cash" size={16} color="#B45309" />
                          <Text style={styles.codPaymentTitle}>Cash on Delivery (Pay at Site)</Text>
                        </View>
                        <Text style={styles.codPaymentSub}>Collect cash from customer before delivery</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                        <Text style={styles.codPaymentLabel}>To Collect</Text>
                        <Text style={styles.codPaymentAmount}>₹{Number(order.total).toLocaleString('en-IN')}</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.onlinePaymentBox}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="checkmark-circle" size={16} color="#059669" />
                          <Text style={styles.onlinePaymentTitle}>Prepaid Online</Text>
                        </View>
                        <Text style={styles.onlinePaymentSub}>Payment completed via UPI/Cards</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                        <Text style={styles.onlinePaymentLabel}>Amount Paid</Text>
                        <Text style={styles.onlinePaymentAmount}>₹{Number(order.total).toLocaleString('en-IN')}</Text>
                      </View>
                    </View>
                  )}

                  {/* Driver Delivery Actions */}
                  <View style={styles.deliveryActionButtons}>
                    {/* Stage 1: When Assigned -> Start Delivery */}
                    {!isOutForDelivery && !isArrived && (
                      <TouchableOpacity
                        style={styles.enRouteBtn}
                        onPress={() => handleUpdateStatus(order.id, 'out_for_delivery')}
                        disabled={updatingOrderId === order.id}
                        activeOpacity={0.85}
                      >
                        {updatingOrderId === order.id ? (
                          <ActivityIndicator size="small" color={COLORS.white} />
                        ) : (
                          <>
                            <Ionicons name="car" size={18} color={COLORS.white} />
                            <Text style={styles.enRouteBtnText}>Start Delivery (Out for Delivery)</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}

                    {/* Stage 2: When En Route -> Mark Arrived at Site */}
                    {isOutForDelivery && (
                      <TouchableOpacity
                        style={styles.arrivedBtn}
                        onPress={() => handleUpdateStatus(order.id, 'arrived')}
                        disabled={updatingOrderId === order.id}
                        activeOpacity={0.85}
                      >
                        {updatingOrderId === order.id ? (
                          <ActivityIndicator size="small" color={COLORS.white} />
                        ) : (
                          <>
                            <Ionicons name="location" size={18} color={COLORS.white} />
                            <Text style={styles.arrivedBtnText}>Arrived at Site (Notify Customer)</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}

                    {/* Stage 3: When at site (or en route) -> Mark Fuel Delivered */}
                    {(isArrived || isOutForDelivery) && (
                      <TouchableOpacity
                        style={styles.deliveredBtn}
                        onPress={() => handleDeliveredClick(order)}
                        disabled={updatingOrderId === order.id}
                        activeOpacity={0.85}
                      >
                        {updatingOrderId === order.id ? (
                          <ActivityIndicator size="small" color={COLORS.white} />
                        ) : (
                          <>
                            <Ionicons name="checkmark-done" size={18} color={COLORS.white} />
                            <Text style={styles.deliveredBtnText}>Mark Fuel Delivered</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )
        ) : (
          /* Completed Orders Tab */
          completedOrders.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="time-outline" size={54} color={COLORS.muted} />
              <Text style={styles.emptyTitle}>No Completed Deliveries Yet</Text>
              <Text style={styles.emptySub}>Delivered orders will be archived here for your delivery log.</Text>
            </View>
          ) : (
            completedOrders.map((order) => (
              <View key={order.id} style={styles.completedCard}>
                <View style={styles.deliveryCardTop}>
                  <View>
                    <Text style={styles.deliveryOrderId}>#{order.id}</Text>
                    <Text style={styles.deliveryOrderDate}>{order.date}</Text>
                  </View>
                  <View style={[styles.statusTag, { backgroundColor: '#ECFDF5' }]}>
                    <Ionicons name="checkmark-circle" size={14} color="#059669" />
                    <Text style={[styles.statusTagText, { color: '#059669', marginLeft: 4 }]}>Delivered</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.customerRow}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={styles.customerName}>{order.name}</Text>
                    <Text style={styles.customerAddressText} numberOfLines={2}>
                      📍 {order.address}
                    </Text>
                    {/* Payment status badge */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      {order.paymentMethod?.toLowerCase().includes('cash') ? (
                        <View style={styles.codDeliveredBadge}>
                          <Ionicons name="cash" size={12} color="#B45309" />
                          <Text style={styles.codDeliveredBadgeText}>Cash Collected</Text>
                        </View>
                      ) : (
                        <View style={styles.onlineDeliveredBadge}>
                          <Ionicons name="checkmark-circle" size={12} color="#059669" />
                          <Text style={styles.onlineDeliveredBadgeText}>Paid Online</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', flexShrink: 0, minWidth: 80 }}>
                    <Text style={styles.fuelLiters}>{order.liters} L</Text>
                    <Text style={styles.paymentAmount}>₹{Number(order.total).toLocaleString('en-IN')}</Text>
                  </View>
                </View>
              </View>
            ))
          )
        )}
      </ScrollView>

      {/* Turn On GPS Location Modal (Allow / Deny) */}
      <Modal
        visible={showGpsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleDenyGps}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.gpsModalCard, isDesktop && { maxWidth: 440 }]}>
            {/* Header Icon */}
            <View style={styles.gpsIconCircle}>
              <Ionicons name="navigate" size={32} color={COLORS.primary} />
            </View>

            <Text style={styles.gpsModalTitle}>Turn On GPS Location</Text>
            <Text style={styles.gpsModalSub}>
              Extra Diesel Delivery Captain portal requires your active GPS location to navigate bowser routes and broadcast live tracking to customers.
            </Text>

            {/* Feature Perks */}
            <View style={styles.gpsPerksList}>
              <View style={styles.gpsPerkItem}>
                <Ionicons name="car" size={18} color="#059669" />
                <Text style={styles.gpsPerkText}>Live Bowser Tracking for Customer App</Text>
              </View>
              <View style={styles.gpsPerkItem}>
                <Ionicons name="compass" size={18} color="#2563EB" />
                <Text style={styles.gpsPerkText}>Turn-by-turn Navigation to Fueling Sites</Text>
              </View>
              <View style={styles.gpsPerkItem}>
                <Ionicons name="notifications" size={18} color="#D97706" />
                <Text style={styles.gpsPerkText}>Automated Arrival Alerts on Site Reach</Text>
              </View>
            </View>

            {/* Actions: Allow & Deny */}
            <View style={styles.gpsModalActions}>
              <TouchableOpacity
                style={styles.gpsAllowBtn}
                onPress={handleAllowGps}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
                <Text style={styles.gpsAllowBtnText}>Allow / Turn On GPS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gpsDenyBtn}
                onPress={handleDenyGps}
                activeOpacity={0.7}
              >
                <Text style={styles.gpsDenyBtnText}>Deny / Not Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cash on Delivery Collection Confirmation Modal */}
      <Modal
        visible={!!cashCollectOrder}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCashCollectOrder(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.cashModalCard, isDesktop && { maxWidth: 440 }]}>
            <View style={styles.cashIconCircle}>
              <Ionicons name="cash" size={34} color="#B45309" />
            </View>

            <Text style={styles.cashModalTitle}>Collect Cash on Delivery</Text>
            <Text style={styles.cashModalSub}>
              This is a Cash on Delivery order. Please collect cash from the customer before completing fuel delivery.
            </Text>

            {cashCollectOrder && (
              <View style={styles.cashBillBox}>
                <View style={styles.cashBillRow}>
                  <Text style={styles.cashBillLabel}>Customer Name:</Text>
                  <Text style={styles.cashBillVal}>{cashCollectOrder.name}</Text>
                </View>
                <View style={styles.cashBillRow}>
                  <Text style={styles.cashBillLabel}>Fuel Dispensed:</Text>
                  <Text style={styles.cashBillVal}>{cashCollectOrder.liters} Liters (BS-VI)</Text>
                </View>
                <View style={styles.cashDivider} />
                <View style={styles.cashBillRow}>
                  <Text style={styles.cashTotalLabel}>Cash to Collect:</Text>
                  <Text style={styles.cashTotalVal}>
                    ₹{Number(cashCollectOrder.total).toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.cashModalActions}>
              <TouchableOpacity
                style={styles.cashConfirmBtn}
                onPress={() => {
                  if (cashCollectOrder) {
                    handleUpdateStatus(cashCollectOrder.id, 'delivered', {
                      paymentStatus: 'paid',
                      paymentMethod: 'Cash on Delivery (Collected)',
                    });
                    setCashCollectOrder(null);
                  }
                }}
                activeOpacity={0.88}
              >
                <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
                <Text style={styles.cashConfirmBtnText}>✅ Cash Received & Mark Delivered</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cashCancelBtn}
                onPress={() => setCashCollectOrder(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.cashCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Full-Screen In-App Live Route Navigation Modal (Foreground GPS) */}
      <Modal
        visible={!!navigatingOrder}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setNavigatingOrder(null)}
      >
        {navigatingOrder && (
          <View style={styles.navModalContainer}>
            {/* Top Navigation Bar */}
            <View style={styles.navTopBar}>
              <TouchableOpacity
                style={styles.navBackBtn}
                onPress={() => setNavigatingOrder(null)}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={{ flex: 1, marginHorizontal: 8 }}>
                <Text style={styles.navBarTitle} numberOfLines={1}>
                  Live Route Navigation
                </Text>
                <Text style={styles.navBarSub} numberOfLines={1}>
                  Order #{navigatingOrder.id} • {navigatingOrder.liters}L Diesel
                </Text>
              </View>

              <TouchableOpacity
                style={styles.navExternalBtn}
                onPress={() => openExternalMapsApp(navigatingOrder)}
                activeOpacity={0.8}
              >
                <Ionicons name="map-outline" size={16} color="#FFFFFF" />
                <Text style={styles.navExternalBtnText}>Google Maps</Text>
              </TouchableOpacity>
            </View>

            {/* GPS & Distance Status Strip */}
            <View style={styles.navStatusStrip}>
              <View style={styles.navDistanceChip}>
                <Ionicons name="navigate-circle" size={18} color="#2563EB" />
                <Text style={styles.navDistanceText}>
                  {getRemainingDistance(navigatingOrder) ? `${getRemainingDistance(navigatingOrder)} km` : 'Calculating...'}
                </Text>
              </View>

              <View style={styles.navGpsChip}>
                <View style={styles.gpsDotActive} />
                <Text style={styles.navGpsText}>
                  GPS Live Streaming {lastGpsSyncTime ? `• ${lastGpsSyncTime}` : ''}
                </Text>
              </View>
            </View>

            {/* Map Area */}
            <View style={styles.navMapWrap}>
              {Platform.OS === 'web' ? (
                <iframe
                  srcDoc={getNavMapHtml(navigatingOrder)}
                  title="In-App Navigation Map"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              ) : (
                <WebView
                  originWhitelist={['*']}
                  source={{ html: getNavMapHtml(navigatingOrder) }}
                  style={{ flex: 1 }}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                />
              )}
            </View>

            {/* Bottom Floating Delivery Card */}
            <View style={styles.navBottomCard}>
              <View style={styles.navCustomerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.navCustomerName}>{navigatingOrder.name}</Text>
                  <Text style={styles.navAddressText} numberOfLines={2}>
                    {navigatingOrder.address}
                  </Text>
                </View>
                {navigatingOrder.phone ? (
                  <TouchableOpacity
                    style={styles.navCallBtn}
                    onPress={() => handleCallCustomer(navigatingOrder.phone)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="call" size={18} color="#FFFFFF" />
                    <Text style={styles.navCallBtnText}>Call</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.navActionsRow}>
                {navigatingOrder.status === 'assigned' || navigatingOrder.status === 'out_for_delivery' ? (
                  <TouchableOpacity
                    style={styles.navArrivedBtn}
                    onPress={() => {
                      handleUpdateStatus(navigatingOrder.id, 'arrived');
                      setNavigatingOrder((prev) => prev ? { ...prev, status: 'arrived' } : null);
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="location" size={18} color="#FFFFFF" />
                    <Text style={styles.navArrivedBtnText}>Mark Arrived at Site</Text>
                  </TouchableOpacity>
                ) : navigatingOrder.status === 'arrived' ? (
                  <TouchableOpacity
                    style={styles.navDeliveredBtn}
                    onPress={() => {
                      handleDeliveredClick(navigatingOrder);
                      setNavigatingOrder(null);
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                    <Text style={styles.navDeliveredBtnText}>Complete Delivery</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={styles.navCloseBtn}
                  onPress={() => setNavigatingOrder(null)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.navCloseBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Modal>
      {/* Rapido-Style Floating Screen Overlay (Active during Google Maps Navigation) */}
      {floatingPipOrder && (
        <View style={styles.floatingPipCard}>
          {/* Top Bar: 🟢 Captain App & Controls */}
          <View style={styles.floatingPipHeader}>
            <View style={styles.floatingPipLiveRow}>
              <View style={styles.floatingPipPulseDot} />
              <Text style={styles.floatingPipLiveText}>Captain App</Text>
              <Text style={styles.floatingPipGpsTag}>• LIVE GPS</Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity
                onPress={() => openExternalMapsApp(floatingPipOrder)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.floatingPipMapsIconBtn}
              >
                <Ionicons name="navigate" size={13} color={COLORS.primary} />
                <Text style={styles.floatingPipMapsIconText}>Maps</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setFloatingPipOrder(null)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.floatingPipCloseBtn}
              >
                <Ionicons name="close" size={16} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Card Middle: Clickable Body -> switches straight into Captain Dashboard! */}
          <TouchableOpacity
            style={styles.floatingPipBody}
            onPress={handleFloatingCardPress}
            activeOpacity={0.85}
          >
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.floatingPipOrderTitle} numberOfLines={1}>
                {floatingPipOrder.name} - Order #{floatingPipOrder.id}
              </Text>
              {floatingPipOrder.status === 'arrived' ? (
                <>
                  <Text style={styles.floatingPipStatusArrived}>Arrived at Location</Text>
                  <Text style={styles.floatingPipSubArrived}>• Awaiting Customer</Text>
                </>
              ) : (
                <>
                  <Text style={styles.floatingPipStatusEnroute}>Arriving Soon</Text>
                  <Text style={styles.floatingPipSubEnroute}>
                    ETA {getEtaMinutes(floatingPipOrder)} mins away | {getRemainingDistance(floatingPipOrder) || '0.8'} km
                  </Text>
                </>
              )}
            </View>

            {/* Prominent Action Button: ARRIVED or ✓ REACHED */}
            <View style={{ justifyContent: 'center' }}>
              {floatingPipOrder.status === 'out_for_delivery' || floatingPipOrder.status === 'assigned' ? (
                <TouchableOpacity
                  style={styles.floatingPipArrivedBtn}
                  onPress={() => {
                    handleUpdateStatus(floatingPipOrder.id, 'arrived');
                    setFloatingPipOrder((prev) => (prev ? { ...prev, status: 'arrived' } : null));
                  }}
                  activeOpacity={0.88}
                >
                  <Text style={styles.floatingPipArrivedBtnText}>ARRIVED</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.floatingPipReachedBtn}
                  onPress={() => {
                    handleDeliveredClick(floatingPipOrder);
                    setFloatingPipOrder(null);
                  }}
                  activeOpacity={0.88}
                >
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  <Text style={styles.floatingPipReachedBtnText}>REACHED</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#B91C1C',
  },
  driverHeaderLeft: {
    flex: 1,
  },
  driverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  driverBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  driverHeaderName: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
  },
  driverHeaderVehicle: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  driverHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.muted,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  scrollArea: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 60,
  },
  desktopContainer: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  loadingWrap: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.dark,
    fontWeight: '600',
  },
  deliveryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  deliveryCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  deliveryOrderId: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  deliveryOrderDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  customerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerLabel: {
    fontSize: 11,
    color: '#94A3B8',
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  customerPhone: {
    fontSize: 13,
    color: '#334155',
    marginTop: 2,
  },
  fuelBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
  },
  fuelLiters: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
  },
  fuelLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 10,
    borderRadius: 8,
  },
  callBtnText: {
    color: '#059669',
    fontWeight: '700',
    fontSize: 13,
  },
  mapBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 10,
    borderRadius: 8,
  },
  mapBtnText: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 13,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  paymentAmount: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  deliveryActionButtons: {
    gap: 8,
    marginTop: 14,
  },
  enRouteBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
  },
  enRouteBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  arrivedBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#D97706',
    paddingVertical: 12,
    borderRadius: 10,
  },
  arrivedBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  deliveredBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 10,
  },
  deliveredBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  completedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  // GPS Status Banner Styles
  gpsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  gpsBannerActive: {
    backgroundColor: '#ECFDF5',
    borderBottomColor: '#A7F3D0',
  },
  gpsBannerInactive: {
    backgroundColor: '#FFFBEB',
    borderBottomColor: '#FDE68A',
  },
  gpsBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    gap: 10,
  },
  gpsDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  gpsDotActive: {
    backgroundColor: '#10B981',
  },
  gpsDotInactive: {
    backgroundColor: '#F59E0B',
  },
  gpsBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  gpsTextActive: {
    color: '#065F46',
  },
  gpsTextInactive: {
    color: '#92400E',
  },
  gpsBannerSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  gpsTogglePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gpsPillActive: {
    backgroundColor: '#059669',
  },
  gpsPillInactive: {
    backgroundColor: '#D97706',
  },
  gpsPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  gpsPillTextActive: {
    color: '#FFFFFF',
  },
  gpsPillTextInactive: {
    color: '#FFFFFF',
  },
  // GPS Permission Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  gpsModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  gpsIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  gpsModalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  gpsModalSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
  },
  gpsPerksList: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 20,
  },
  gpsPerkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gpsPerkText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
  },
  gpsModalActions: {
    width: '100%',
    gap: 10,
  },
  gpsAllowBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
  },
  gpsAllowBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  gpsDenyBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    width: '100%',
  },
  gpsDenyBtnText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },
  // Payment box in active deliveries
  codPaymentBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 12,
  },
  codPaymentTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B45309',
  },
  codPaymentSub: {
    fontSize: 11.5,
    color: '#92400E',
    marginTop: 2,
    fontWeight: '500',
  },
  codPaymentLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#B45309',
    textTransform: 'uppercase',
  },
  codPaymentAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#B45309',
  },
  onlinePaymentBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 12,
  },
  onlinePaymentTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803D',
  },
  onlinePaymentSub: {
    fontSize: 11.5,
    color: '#166534',
    marginTop: 2,
    fontWeight: '500',
  },
  onlinePaymentLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#15803D',
    textTransform: 'uppercase',
  },
  onlinePaymentAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#15803D',
  },
  // Completed card elements
  customerAddressText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  codDeliveredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  codDeliveredBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#B45309',
  },
  onlineDeliveredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  onlineDeliveredBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#059669',
  },
  // Cash on Delivery Collection Modal Styles
  cashModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cashIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cashModalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  cashModalSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
  },
  cashBillBox: {
    width: '100%',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  cashBillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cashBillLabel: {
    fontSize: 13,
    color: '#78350F',
    fontWeight: '600',
  },
  cashBillVal: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
  },
  cashDivider: {
    height: 1,
    backgroundColor: '#FDE68A',
    marginVertical: 8,
  },
  cashTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#92400E',
  },
  cashTotalVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#B45309',
  },
  cashModalActions: {
    width: '100%',
    gap: 10,
  },
  cashConfirmBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
  },
  cashConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
  },
  cashCancelBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    width: '100%',
  },
  cashCancelBtnText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },
  // In-App Navigation Modal Styles
  navModalContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  navTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  navBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  navBarSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '600',
  },
  navExternalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(37, 99, 235, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  navExternalBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  navStatusStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  navDistanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  navDistanceText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E40AF',
  },
  navGpsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navGpsText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#34D399',
  },
  navMapWrap: {
    flex: 1,
  },
  navBottomCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  navCustomerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  navCustomerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  navAddressText: {
    fontSize: 12.5,
    color: '#475569',
    marginTop: 2,
    lineHeight: 17,
  },
  navCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  navCallBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  navActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  navArrivedBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D97706',
    paddingVertical: 12,
    borderRadius: 10,
  },
  navArrivedBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  navDeliveredBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 10,
  },
  navDeliveredBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  navCloseBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  navCloseBtnText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 13.5,
  },
  // Extra Diesel Brand-Themed Floating Screen Overlay Styles
  floatingPipCard: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 14,
    right: 14,
    backgroundColor: '#0F172A',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(213, 0, 0, 0.65)',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 25,
    zIndex: 99999,
  },
  floatingPipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 8,
  },
  floatingPipLiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  floatingPipPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  floatingPipLiveText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  floatingPipGpsTag: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  floatingPipMapsIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(213, 0, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(213, 0, 0, 0.35)',
  },
  floatingPipMapsIconText: {
    color: COLORS.primary,
    fontSize: 10.5,
    fontWeight: '700',
  },
  floatingPipCloseBtn: {
    padding: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  floatingPipBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  floatingPipOrderTitle: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
    marginBottom: 3,
  },
  floatingPipStatusEnroute: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '700',
  },
  floatingPipSubEnroute: {
    color: '#94A3B8',
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 1,
  },
  floatingPipStatusArrived: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  floatingPipSubArrived: {
    color: '#CBD5E1',
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 1,
  },
  floatingPipArrivedBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingPipArrivedBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13.5,
    letterSpacing: 0.5,
  },
  floatingPipReachedBtn: {
    backgroundColor: COLORS.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingPipReachedBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
