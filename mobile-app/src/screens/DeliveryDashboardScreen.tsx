import React, { useState, useEffect } from 'react';
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
  useWindowDimensions,
} from 'react-native';
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
  status: 'pending' | 'assigned' | 'out_for_delivery' | 'delivered' | 'cancelled';
  statusText?: string;
  address: string;
  vehicleType?: string;
  slot?: string;
  assignedTo?: string | null;
  assignedToName?: string | null;
  vehicleNumber?: string | null;
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

  const baseUrl = APP_CONFIG.LIVE_API_BASE_URL || 'https://extradiesel.in';
  const driverEmail = currentUser?.email || 'delivery@extradiesel.in';

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

  // Handle Status Update (Out for Delivery or Delivered)
  const handleUpdateStatus = async (orderId: string, newStatus: 'out_for_delivery' | 'delivered') => {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch(`${baseUrl}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          statusText: newStatus === 'delivered' ? 'Delivered' : 'Out for Delivery (Bowser En Route)',
        }),
      });

      const data = await res.json();
      if (data.success) {
        Alert.alert(
          'Status Updated',
          newStatus === 'delivered'
            ? `Order #${orderId} marked as Delivered successfully!`
            : `Order #${orderId} is now marked Out for Delivery.`
        );
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

  // Open Maps Navigation
  const handleOpenMaps = (address: string) => {
    const query = encodeURIComponent(address);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
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
            <Ionicons name="reload" size={18} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
            <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>

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
              return (
                <View key={order.id} style={styles.deliveryCard}>
                  {/* Order Top Bar */}
                  <View style={styles.deliveryCardTop}>
                    <View>
                      <Text style={styles.deliveryOrderId}>#{order.id}</Text>
                      <Text style={styles.deliveryOrderDate}>{order.date}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusTag,
                        { backgroundColor: isOutForDelivery ? '#EFF6FF' : '#FEF3C7' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusTagText,
                          { color: isOutForDelivery ? '#2563EB' : '#D97706' },
                        ]}
                      >
                        {isOutForDelivery ? 'En Route (Out for Delivery)' : 'Assigned - Action Needed'}
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
                      onPress={() => handleOpenMaps(order.address)}
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
                    {!isOutForDelivery && (
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
                            <Text style={styles.enRouteBtnText}>Start Delivery (En Route)</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}

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
    backgroundColor: '#0F172A',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  driverHeaderLeft: {
    flex: 1,
  },
  driverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
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
    color: '#94A3B8',
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
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
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
});
