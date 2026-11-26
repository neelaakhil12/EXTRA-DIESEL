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
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { ScreenName } from '../types';
import { APP_CONFIG } from '../constants/config';

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
  const gpsIntervalRef = useRef<any>(null);

  const baseUrl = APP_CONFIG.LIVE_API_BASE_URL || 'https://extradiesel.in';
  const driverEmail = currentUser?.email || 'delivery@extradiesel.in';

  // Broadcast current GPS location to backend for all active assigned orders
  const broadcastLocation = async (lat: number, lon: number) => {
    try {
      const activeList = orders.filter((o) => o.status === 'out_for_delivery' || o.status === 'arrived' || o.status === 'assigned');
      for (const order of activeList) {
        await fetch(`${baseUrl}/api/orders/${order.id}/location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat,
            lon,
            driverEmail,
          }),
        }).catch(() => {});
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
              broadcastLocation(coords.lat, coords.lon);
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
      broadcastLocation(coords.lat, coords.lon);
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

  // Periodic GPS Location Transmitter (every 10 seconds while GPS is active)
  useEffect(() => {
    if (isGpsActive) {
      gpsIntervalRef.current = setInterval(async () => {
        try {
          if (Platform.OS === 'web') {
            if (typeof navigator !== 'undefined' && navigator.geolocation) {
              navigator.geolocation.getCurrentPosition((pos) => {
                const c = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                setCaptainCoords(c);
                broadcastLocation(c.lat, c.lon);
              });
            }
          } else {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const c = { lat: loc.coords.latitude, lon: loc.coords.longitude };
            setCaptainCoords(c);
            broadcastLocation(c.lat, c.lon);
          }
        } catch (e) {}
      }, 10000);
    } else {
      if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
    }

    return () => {
      if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
    };
  }, [isGpsActive, orders]);

  // Load driver's assigned orders
  const loadDriverOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${baseUrl}/api/orders?deliveryBoyEmail=${encodeURIComponent(driverEmail)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
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
    newStatus: 'out_for_delivery' | 'arrived' | 'delivered'
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

  // Call Customer
  const handleCallCustomer = (phone?: string) => {
    if (!phone) {
      Alert.alert('No Phone', 'No contact phone number provided for this order.');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  // Open Maps Navigation directly to customer's exact pinned GPS site
  const handleOpenMaps = (order: DeliveryOrder) => {
    // 1. If exact Google Maps GPS link exists
    if (order.mapsLink && order.mapsLink.trim()) {
      let url = order.mapsLink.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      Linking.openURL(url);
      return;
    }

    // 2. If address string contains latitude, longitude coordinates
    const coordMatch = order.address && order.address.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    if (coordMatch) {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${coordMatch[1]},${coordMatch[2]}`);
      return;
    }

    // 3. Fallback to delivery address query
    const query = encodeURIComponent(order.address);
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${query}`);
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

                  {/* Payment Info */}
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Total Collectable</Text>
                    <Text style={styles.paymentAmount}>₹{Number(order.total).toLocaleString('en-IN')}</Text>
                  </View>

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
                        onPress={() => handleUpdateStatus(order.id, 'delivered')}
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
                  <View>
                    <Text style={styles.customerName}>{order.name}</Text>
                    <Text style={styles.customerPhone}>📍 {order.address}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
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
});
