import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { ScreenName } from '../types';
import { APP_CONFIG } from '../constants/config';

interface AdminScreenProps {
  onNavigate: (screen: ScreenName) => void;
  currentUser?: { name: string; email: string };
}

interface AdminStats {
  totalEarnings: number;
  todayEarnings: number;
  pendingOrdersCount: number;
  deliveredOrdersCount: number;
  totalOrdersCount: number;
  totalDeliveryBoys: number;
}

interface OrderItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  date: string;
  liters: number;
  fuelRate: number;
  deliveryFee: number;
  tax: number;
  total: number;
  status: 'pending' | 'assigned' | 'out_for_delivery' | 'delivered' | 'cancelled';
  statusText?: string;
  address: string;
  assignedTo?: string | null;
  assignedToName?: string | null;
  vehicleNumber?: string | null;
}

interface DeliveryBoy {
  id: string;
  name: string;
  email: string;
  phone: string;
  vehicleNumber: string;
  status: string;
  assignedOrdersCount: number;
  completedOrdersCount: number;
}

export const AdminScreen: React.FC<AdminScreenProps> = ({ onNavigate, currentUser }) => {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'delivery' | 'settings'>('dashboard');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Dashboard Stats
  const [stats, setStats] = useState<AdminStats>({
    totalEarnings: 0,
    todayEarnings: 0,
    pendingOrdersCount: 0,
    deliveredOrdersCount: 0,
    totalOrdersCount: 0,
    totalDeliveryBoys: 0,
  });

  // Orders Tab
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [selectedOrderForAssign, setSelectedOrderForAssign] = useState<OrderItem | null>(null);
  const [selectedOrderForStatus, setSelectedOrderForStatus] = useState<OrderItem | null>(null);

  // Delivery Boys Tab
  const [deliveryBoys, setDeliveryBoys] = useState<DeliveryBoy[]>([]);
  const [showAddDriverModal, setShowAddDriverModal] = useState<boolean>(false);
  const [newDriverName, setNewDriverName] = useState<string>('');
  const [newDriverEmail, setNewDriverEmail] = useState<string>('');
  const [newDriverPhone, setNewDriverPhone] = useState<string>('');
  const [newDriverPassword, setNewDriverPassword] = useState<string>('driver123');
  const [newDriverVehicle, setNewDriverVehicle] = useState<string>('Bowser TS 09 UB 4521');
  const [isSavingDriver, setIsSavingDriver] = useState<boolean>(false);

  // Global Settings Tab
  const [dieselRateInput, setDieselRateInput] = useState<string>('94.50');
  const [rateCityInput, setRateCityInput] = useState<string>('Hyderabad');
  const [tier1FeeInput, setTier1FeeInput] = useState<string>('350');
  const [tier2FeeInput, setTier2FeeInput] = useState<string>('0');
  const [tier1MaxLitersInput, setTier1MaxLitersInput] = useState<string>('500');
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [settingsSuccessMessage, setSettingsSuccessMessage] = useState<string>('');

  const baseUrl = APP_CONFIG.LIVE_API_BASE_URL || 'https://extradiesel.in';

  // Load all admin data
  const loadAdminData = async () => {
    try {
      setRefreshing(true);
      const [statsRes, ordersRes, driversRes, settingsRes] = await Promise.all([
        fetch(`${baseUrl}/api/admin/stats`),
        fetch(`${baseUrl}/api/orders?all=true`),
        fetch(`${baseUrl}/api/admin/delivery-boys`),
        fetch(`${baseUrl}/api/settings`),
      ]);

      const statsData = await statsRes.json();
      if (statsData.success && statsData.stats) {
        setStats(statsData.stats);
      }

      const ordersData = await ordersRes.json();
      if (ordersData.success && Array.isArray(ordersData.orders)) {
        setOrders(ordersData.orders);
      }

      const driversData = await driversRes.json();
      if (driversData.success && Array.isArray(driversData.deliveryBoys)) {
        setDeliveryBoys(driversData.deliveryBoys);
      }

      const settingsData = await settingsRes.json();
      if (settingsData.success && settingsData.settings) {
        const s = settingsData.settings;
        if (s.dieselRate) setDieselRateInput(s.dieselRate.toString());
        if (s.city) setRateCityInput(s.city);
        if (s.deliveryChargeUpTo500 !== undefined) setTier1FeeInput(s.deliveryChargeUpTo500.toString());
        if (s.deliveryChargeAbove500 !== undefined) setTier2FeeInput(s.deliveryChargeAbove500.toString());
        if (s.tier1MaxLiters !== undefined) setTier1MaxLitersInput(s.tier1MaxLiters.toString());
      }
    } catch (e) {
      console.error('Failed to load admin data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Export Transactions CSV
  const handleExportCsv = () => {
    const csvUrl = `${baseUrl}/api/admin/export-transactions`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(csvUrl, '_blank');
    } else {
      Alert.alert(
        'Export Transactions',
        `Download CSV transactions from:\n${csvUrl}`,
        [{ text: 'OK' }]
      );
    }
  };

  // Update Global Settings (Rate & Delivery Tier Charges)
  const handleSaveSettings = async () => {
    const rateNum = parseFloat(dieselRateInput);
    if (isNaN(rateNum) || rateNum <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid diesel price.');
      return;
    }

    const tier1Fee = parseFloat(tier1FeeInput);
    const tier2Fee = parseFloat(tier2FeeInput);
    const tier1Max = parseInt(tier1MaxLitersInput, 10);

    setIsSavingSettings(true);
    setSettingsSuccessMessage('');

    try {
      const res = await fetch(`${baseUrl}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dieselRate: rateNum,
          city: rateCityInput.trim() || 'Hyderabad',
          deliveryChargeUpTo500: isNaN(tier1Fee) ? 350 : tier1Fee,
          deliveryChargeAbove500: isNaN(tier2Fee) ? 0 : tier2Fee,
          tier1MaxLiters: isNaN(tier1Max) ? 500 : tier1Max,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSettingsSuccessMessage('Settings updated successfully! Live rate and delivery fees are now active.');
        setTimeout(() => setSettingsSuccessMessage(''), 5000);
        loadAdminData();
      } else {
        Alert.alert('Error', data.error || 'Failed to update settings');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Connection error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Create Delivery Boy
  const handleCreateDriver = async () => {
    if (!newDriverName.trim()) {
      Alert.alert('Required', 'Please enter Delivery Partner name.');
      return;
    }
    if (!newDriverEmail.trim() || !newDriverEmail.includes('@')) {
      Alert.alert('Required', 'Please enter a valid email address.');
      return;
    }
    if (!newDriverPassword || newDriverPassword.length < 6) {
      Alert.alert('Required', 'Password must be at least 6 characters.');
      return;
    }

    setIsSavingDriver(true);
    try {
      const res = await fetch(`${baseUrl}/api/admin/delivery-boys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDriverName.trim(),
          email: newDriverEmail.toLowerCase().trim(),
          phone: newDriverPhone.trim(),
          password: newDriverPassword.trim(),
          vehicleNumber: newDriverVehicle.trim() || 'Bowser TS 09 UB 4521',
        }),
      });

      const data = await res.json();
      if (data.success) {
        Alert.alert('Success', `Delivery Partner "${newDriverName}" created successfully! They can now log in.`);
        setShowAddDriverModal(false);
        setNewDriverName('');
        setNewDriverEmail('');
        setNewDriverPhone('');
        setNewDriverPassword('driver123');
        loadAdminData();
      } else {
        Alert.alert('Error', data.error || 'Failed to create delivery boy');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Connection error');
    } finally {
      setIsSavingDriver(false);
    }
  };

  // Delete Delivery Boy
  const handleDeleteDriver = (email: string, name: string) => {
    Alert.alert(
      'Remove Delivery Partner',
      `Are you sure you want to remove ${name} (${email})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${baseUrl}/api/admin/delivery-boys/${encodeURIComponent(email)}`, {
                method: 'DELETE',
              });
              const data = await res.json();
              if (data.success) {
                loadAdminData();
              }
            } catch (e) {}
          },
        },
      ]
    );
  };

  // Assign Order to Delivery Partner
  const handleAssignOrder = async (driver: DeliveryBoy) => {
    if (!selectedOrderForAssign) return;

    try {
      const res = await fetch(`${baseUrl}/api/admin/orders/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrderForAssign.id,
          deliveryBoyEmail: driver.email,
          deliveryBoyName: driver.name,
          vehicleNumber: driver.vehicleNumber,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSelectedOrderForAssign(null);
        loadAdminData();
        Alert.alert('Order Assigned', `Order #${selectedOrderForAssign.id} assigned to ${driver.name}.`);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to assign order');
    }
  };

  // Update Order Status
  const handleUpdateOrderStatus = async (status: string) => {
    if (!selectedOrderForStatus) return;

    try {
      const res = await fetch(`${baseUrl}/api/orders/${selectedOrderForStatus.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();
      if (data.success) {
        setSelectedOrderForStatus(null);
        loadAdminData();
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  // Filtered orders list
  const filteredOrders = orders.filter((o) => {
    const matchesFilter =
      orderStatusFilter === 'all'
        ? true
        : orderStatusFilter === 'pending'
        ? o.status === 'pending' || o.status === 'assigned'
        : o.status === orderStatusFilter;

    const query = orderSearchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      o.id.toLowerCase().includes(query) ||
      o.name.toLowerCase().includes(query) ||
      (o.phone && o.phone.includes(query)) ||
      (o.assignedToName && o.assignedToName.toLowerCase().includes(query));

    return matchesFilter && matchesSearch;
  });

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'delivered':
        return { bg: '#ECFDF5', text: '#059669', label: 'Delivered' };
      case 'out_for_delivery':
        return { bg: '#EFF6FF', text: '#2563EB', label: 'Out for Delivery' };
      case 'assigned':
        return { bg: '#FEF3C7', text: '#D97706', label: 'Assigned' };
      case 'cancelled':
        return { bg: '#FEE2E2', text: '#DC2626', label: 'Cancelled' };
      default:
        return { bg: '#FEF2F2', text: '#D50000', label: 'Pending' };
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Extra Diesel Admin Panel...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Admin Top Header Bar */}
      <View style={styles.adminHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.adminBadge}>
            <Ionicons name="shield" size={14} color={COLORS.white} />
            <Text style={styles.adminBadgeText}>ADMIN PORTAL</Text>
          </View>
          <Text style={styles.adminTitle}>Extra Diesel Control Center</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.customerViewBtn}
            onPress={() => onNavigate('home')}
            activeOpacity={0.8}
          >
            <Ionicons name="storefront-outline" size={16} color={COLORS.dark} />
            <Text style={styles.customerViewText}>Store View</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={loadAdminData}
            activeOpacity={0.7}
          >
            <Ionicons name="reload" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Navigation Tabs Bar */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'dashboard' && styles.tabBtnActive]}
          onPress={() => setActiveTab('dashboard')}
        >
          <Ionicons
            name="pie-chart"
            size={18}
            color={activeTab === 'dashboard' ? COLORS.primary : COLORS.muted}
          />
          <Text style={[styles.tabBtnText, activeTab === 'dashboard' && styles.tabBtnTextActive]}>
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'orders' && styles.tabBtnActive]}
          onPress={() => setActiveTab('orders')}
        >
          <Ionicons
            name="receipt"
            size={18}
            color={activeTab === 'orders' ? COLORS.primary : COLORS.muted}
          />
          <Text style={[styles.tabBtnText, activeTab === 'orders' && styles.tabBtnTextActive]}>
            Orders ({orders.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'delivery' && styles.tabBtnActive]}
          onPress={() => setActiveTab('delivery')}
        >
          <Ionicons
            name="bicycle"
            size={18}
            color={activeTab === 'delivery' ? COLORS.primary : COLORS.muted}
          />
          <Text style={[styles.tabBtnText, activeTab === 'delivery' && styles.tabBtnTextActive]}>
            Delivery Boys ({deliveryBoys.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'settings' && styles.tabBtnActive]}
          onPress={() => setActiveTab('settings')}
        >
          <Ionicons
            name="options"
            size={18}
            color={activeTab === 'settings' ? COLORS.primary : COLORS.muted}
          />
          <Text style={[styles.tabBtnText, activeTab === 'settings' && styles.tabBtnTextActive]}>
            Global Settings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Tab Content */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[styles.contentContainer, isDesktop && styles.desktopContainer]}
      >
        {/* =========================================================================
            TAB 1: DASHBOARD
        ========================================================================== */}
        {activeTab === 'dashboard' && (
          <View>
            {/* Top Metrics Cards Row */}
            <View style={styles.metricsGrid}>
              {/* Card 1: Total Earnings */}
              <View style={[styles.metricCard, { borderLeftColor: '#059669', borderLeftWidth: 4 }]}>
                <View style={styles.metricCardTop}>
                  <Text style={styles.metricLabel}>Total Revenue</Text>
                  <View style={[styles.metricIconWrap, { backgroundColor: '#ECFDF5' }]}>
                    <Ionicons name="cash" size={20} color="#059669" />
                  </View>
                </View>
                <Text style={styles.metricValue}>₹{stats.totalEarnings.toLocaleString('en-IN')}</Text>
                <Text style={styles.metricSub}>From all confirmed deliveries</Text>
              </View>

              {/* Card 2: Today's Earnings */}
              <View style={[styles.metricCard, { borderLeftColor: COLORS.secondary, borderLeftWidth: 4 }]}>
                <View style={styles.metricCardTop}>
                  <Text style={styles.metricLabel}>Today's Earnings</Text>
                  <View style={[styles.metricIconWrap, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="trending-up" size={20} color="#D97706" />
                  </View>
                </View>
                <Text style={styles.metricValue}>₹{stats.todayEarnings.toLocaleString('en-IN')}</Text>
                <Text style={styles.metricSub}>Gross revenue for today</Text>
              </View>

              {/* Card 3: Pending Orders */}
              <View style={[styles.metricCard, { borderLeftColor: COLORS.primary, borderLeftWidth: 4 }]}>
                <View style={styles.metricCardTop}>
                  <Text style={styles.metricLabel}>Pending Deliveries</Text>
                  <View style={[styles.metricIconWrap, { backgroundColor: '#FEF2F2' }]}>
                    <Ionicons name="time" size={20} color={COLORS.primary} />
                  </View>
                </View>
                <Text style={styles.metricValue}>{stats.pendingOrdersCount}</Text>
                <Text style={styles.metricSub}>Awaiting / en route bowsers</Text>
              </View>

              {/* Card 4: Delivered Orders */}
              <View style={[styles.metricCard, { borderLeftColor: '#2563EB', borderLeftWidth: 4 }]}>
                <View style={styles.metricCardTop}>
                  <Text style={styles.metricLabel}>Completed Orders</Text>
                  <View style={[styles.metricIconWrap, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="checkmark-done" size={20} color="#2563EB" />
                  </View>
                </View>
                <Text style={styles.metricValue}>{stats.deliveredOrdersCount}</Text>
                <Text style={styles.metricSub}>Successfully delivered</Text>
              </View>
            </View>

            {/* Actions & Export Row */}
            <View style={styles.exportRow}>
              <View>
                <Text style={styles.sectionTitle}>Financial & Order Transactions</Text>
                <Text style={styles.sectionSub}>Download complete order records, client billings & delivery details.</Text>
              </View>

              <TouchableOpacity style={styles.exportBtn} onPress={handleExportCsv} activeOpacity={0.85}>
                <Ionicons name="download-outline" size={18} color={COLORS.white} />
                <Text style={styles.exportBtnText}>Download Transactions (CSV)</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Live Rate Status Card */}
            <View style={styles.quickSettingsBanner}>
              <View style={styles.quickSettingsLeft}>
                <View style={styles.flameIconWrap}>
                  <Ionicons name="flame" size={24} color="#EA580C" />
                </View>
                <View>
                  <Text style={styles.quickSettingsTitle}>Current Live Diesel Rate: ₹{dieselRateInput}/L ({rateCityInput})</Text>
                  <Text style={styles.quickSettingsSub}>
                    Delivery Charge: ₹{tier1FeeInput} (0-500L) • ₹{tier2FeeInput === '0' ? 'FREE' : '₹' + tier2FeeInput} (500L+)
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.quickEditBtn}
                onPress={() => setActiveTab('settings')}
                activeOpacity={0.8}
              >
                <Text style={styles.quickEditBtnText}>Edit Rates</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            {/* Recent Orders Overview */}
            <View style={styles.recentOrdersCard}>
              <View style={styles.recentOrdersHeader}>
                <Text style={styles.recentOrdersTitle}>Recent Orders Activity</Text>
                <TouchableOpacity onPress={() => setActiveTab('orders')}>
                  <Text style={styles.viewAllText}>View All ({orders.length}) →</Text>
                </TouchableOpacity>
              </View>

              {orders.slice(0, 4).map((order) => {
                const badge = getStatusBadgeStyle(order.status);
                return (
                  <View key={order.id} style={styles.recentOrderItem}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.recentOrderId}>#{order.id}</Text>
                        <View style={[styles.statusPill, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.statusPillText, { color: badge.text }]}>{badge.label}</Text>
                        </View>
                      </View>
                      <Text style={styles.recentOrderCustomer}>{order.name} • {order.liters} Liters</Text>
                      <Text style={styles.recentOrderDate}>{order.date}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.recentOrderTotal}>₹{Number(order.total).toLocaleString('en-IN')}</Text>
                      <Text style={styles.recentOrderDriver}>
                        {order.assignedToName ? `👤 ${order.assignedToName}` : '⚠️ Unassigned'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* =========================================================================
            TAB 2: ORDERS DETAILS TAB
        ========================================================================== */}
        {activeTab === 'orders' && (
          <View>
            <View style={styles.ordersHeaderRow}>
              <Text style={styles.sectionTitle}>All Customer Orders ({filteredOrders.length})</Text>
              <TouchableOpacity style={styles.exportBtnSmall} onPress={handleExportCsv}>
                <Ionicons name="download-outline" size={16} color={COLORS.white} />
                <Text style={styles.exportBtnTextSmall}>Export CSV</Text>
              </TouchableOpacity>
            </View>

            {/* Search and Filters */}
            <View style={styles.filterBar}>
              <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color={COLORS.muted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search order ID, client name, phone..."
                  value={orderSearchQuery}
                  onChangeText={setOrderSearchQuery}
                />
                {orderSearchQuery ? (
                  <TouchableOpacity onPress={() => setOrderSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color={COLORS.muted} />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Status Pills */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusChipsRow}>
                {['all', 'pending', 'out_for_delivery', 'delivered'].map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.statusChip, orderStatusFilter === st && styles.statusChipActive]}
                    onPress={() => setOrderStatusFilter(st)}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        orderStatusFilter === st && styles.statusChipTextActive,
                      ]}
                    >
                      {st === 'all'
                        ? 'All'
                        : st === 'pending'
                        ? 'Pending / Assigned'
                        : st === 'out_for_delivery'
                        ? 'En Route'
                        : 'Delivered'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="file-tray-outline" size={48} color={COLORS.muted} />
                <Text style={styles.emptyTitle}>No Orders Found</Text>
                <Text style={styles.emptySub}>No orders matching the selected filter criteria.</Text>
              </View>
            ) : (
              filteredOrders.map((order) => {
                const badge = getStatusBadgeStyle(order.status);
                return (
                  <View key={order.id} style={styles.orderCard}>
                    <View style={styles.orderCardHeader}>
                      <View>
                        <Text style={styles.orderCardId}>#{order.id}</Text>
                        <Text style={styles.orderCardDate}>{order.date}</Text>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.statusPillText, { color: badge.text }]}>{badge.label}</Text>
                      </View>
                    </View>

                    <View style={styles.orderDivider} />

                    <View style={styles.orderDetailRow}>
                      <View style={styles.orderDetailCol}>
                        <Text style={styles.orderDetailLabel}>Customer</Text>
                        <Text style={styles.orderDetailValue}>{order.name}</Text>
                        <Text style={styles.orderDetailSub}>{order.email}</Text>
                        {order.phone ? <Text style={styles.orderDetailSub}>📞 {order.phone}</Text> : null}
                      </View>

                      <View style={styles.orderDetailCol}>
                        <Text style={styles.orderDetailLabel}>Fuel Quantity</Text>
                        <Text style={styles.orderDetailValue}>{order.liters} Liters</Text>
                        <Text style={styles.orderDetailSub}>@ ₹{order.fuelRate || dieselRateInput}/L</Text>
                      </View>

                      <View style={styles.orderDetailCol}>
                        <Text style={styles.orderDetailLabel}>Total Amount</Text>
                        <Text style={[styles.orderDetailValue, { color: COLORS.primary }]}>
                          ₹{Number(order.total).toLocaleString('en-IN')}
                        </Text>
                        <Text style={styles.orderDetailSub}>
                          Delivery: {order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee}`}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.orderAddressBox}>
                      <Ionicons name="location" size={16} color={COLORS.primary} />
                      <Text style={styles.orderAddressText}>{order.address}</Text>
                    </View>

                    {/* Assigned Driver Info */}
                    <View style={styles.driverInfoRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons
                          name={order.assignedToName ? 'bicycle' : 'alert-circle'}
                          size={16}
                          color={order.assignedToName ? '#059669' : '#D97706'}
                        />
                        <Text style={styles.driverInfoText}>
                          {order.assignedToName
                            ? `Assigned: ${order.assignedToName} (${order.vehicleNumber || 'Bowser'})`
                            : 'No Delivery Partner Assigned'}
                        </Text>
                      </View>

                      <View style={styles.orderCardActions}>
                        <TouchableOpacity
                          style={styles.actionBtnAssign}
                          onPress={() => setSelectedOrderForAssign(order)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="person-add" size={14} color={COLORS.primary} />
                          <Text style={styles.actionBtnAssignText}>
                            {order.assignedToName ? 'Reassign' : 'Assign Driver'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.actionBtnStatus}
                          onPress={() => setSelectedOrderForStatus(order)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="sync" size={14} color="#2563EB" />
                          <Text style={styles.actionBtnStatusText}>Status</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* =========================================================================
            TAB 3: DELIVERY BOYS MANAGEMENT
        ========================================================================== */}
        {activeTab === 'delivery' && (
          <View>
            <View style={styles.ordersHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Delivery Bowser Partners ({deliveryBoys.length})</Text>
                <Text style={styles.sectionSub}>
                  Create credentials here. Delivery boys log in directly using the regular app login screen.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.addDriverBtn}
                onPress={() => setShowAddDriverModal(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={20} color={COLORS.white} />
                <Text style={styles.addDriverBtnText}>Create Driver Login</Text>
              </TouchableOpacity>
            </View>

            {deliveryBoys.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="bicycle-outline" size={48} color={COLORS.muted} />
                <Text style={styles.emptyTitle}>No Delivery Partners Yet</Text>
                <Text style={styles.emptySub}>Click the button above to create login credentials for your first driver.</Text>
              </View>
            ) : (
              <View style={styles.driverCardsGrid}>
                {deliveryBoys.map((driver) => (
                  <View key={driver.email} style={styles.driverCard}>
                    <View style={styles.driverCardTop}>
                      <View style={styles.driverAvatar}>
                        <Ionicons name="person" size={24} color={COLORS.primary} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.driverName}>{driver.name}</Text>
                        <Text style={styles.driverVehicle}>{driver.vehicleNumber}</Text>
                      </View>
                      <View style={styles.driverActivePill}>
                        <View style={styles.activeDot} />
                        <Text style={styles.driverActiveText}>Active</Text>
                      </View>
                    </View>

                    <View style={styles.driverDetailsBox}>
                      <View style={styles.driverDetailItem}>
                        <Ionicons name="mail-outline" size={14} color={COLORS.muted} />
                        <Text style={styles.driverDetailValue}>{driver.email}</Text>
                      </View>
                      <View style={styles.driverDetailItem}>
                        <Ionicons name="call-outline" size={14} color={COLORS.muted} />
                        <Text style={styles.driverDetailValue}>{driver.phone || 'No phone set'}</Text>
                      </View>
                    </View>

                    <View style={styles.driverStatsRow}>
                      <View style={styles.driverStatBox}>
                        <Text style={styles.driverStatNum}>{driver.assignedOrdersCount}</Text>
                        <Text style={styles.driverStatLabel}>Assigned</Text>
                      </View>
                      <View style={styles.driverStatBox}>
                        <Text style={[styles.driverStatNum, { color: '#059669' }]}>
                          {driver.completedOrdersCount}
                        </Text>
                        <Text style={styles.driverStatLabel}>Completed</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.deleteDriverBtn}
                      onPress={() => handleDeleteDriver(driver.email, driver.name)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={14} color="#DC2626" />
                      <Text style={styles.deleteDriverText}>Remove Account</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* =========================================================================
            TAB 4: GLOBAL SETTINGS & DAILY PRICE UPDATE
        ========================================================================== */}
        {activeTab === 'settings' && (
          <View>
            <Text style={styles.sectionTitle}>Global System Configuration</Text>
            <Text style={styles.sectionSub}>
              Set the daily live diesel rate and delivery fees. Changes take effect instantly for all app and web users.
            </Text>

            {settingsSuccessMessage ? (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle" size={20} color="#059669" />
                <Text style={styles.successBannerText}>{settingsSuccessMessage}</Text>
              </View>
            ) : null}

            {/* Section 1: Daily Diesel Price */}
            <View style={styles.settingsCard}>
              <View style={styles.settingsCardHeader}>
                <View style={[styles.settingsIconWrap, { backgroundColor: '#FEF2F2' }]}>
                  <Ionicons name="flame" size={22} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.settingsCardTitle}>Daily Diesel Price Rate</Text>
                  <Text style={styles.settingsCardSub}>Live per-liter rate charged on all purchases</Text>
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Fuel Rate (₹ per Liter)</Text>
                  <View style={styles.currencyInputWrap}>
                    <Text style={styles.currencyPrefix}>₹</Text>
                    <TextInput
                      style={styles.currencyInput}
                      keyboardType="decimal-pad"
                      value={dieselRateInput}
                      onChangeText={setDieselRateInput}
                      placeholder="94.50"
                    />
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>City / Location</Text>
                  <TextInput
                    style={styles.textInput}
                    value={rateCityInput}
                    onChangeText={setRateCityInput}
                    placeholder="Hyderabad"
                  />
                </View>
              </View>
            </View>

            {/* Section 2: Delivery Charges Configuration */}
            <View style={styles.settingsCard}>
              <View style={styles.settingsCardHeader}>
                <View style={[styles.settingsIconWrap, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="cube" size={22} color="#2563EB" />
                </View>
                <View>
                  <Text style={styles.settingsCardTitle}>Doorstep Delivery Charges (Tiers)</Text>
                  <Text style={styles.settingsCardSub}>Configure automated delivery pricing based on ordered volume</Text>
                </View>
              </View>

              <View style={styles.tiersContainer}>
                {/* Tier 1: 0 to 500L */}
                <View style={styles.tierBox}>
                  <View style={styles.tierHeader}>
                    <Text style={styles.tierTitle}>Tier 1: Up to {tier1MaxLitersInput} Liters (0 - 500L)</Text>
                    <Text style={styles.tierBadge}>Standard Fee</Text>
                  </View>
                  <Text style={styles.inputLabel}>Delivery Charge for orders ≤ {tier1MaxLitersInput}L (₹)</Text>
                  <View style={styles.currencyInputWrap}>
                    <Text style={styles.currencyPrefix}>₹</Text>
                    <TextInput
                      style={styles.currencyInput}
                      keyboardType="number-pad"
                      value={tier1FeeInput}
                      onChangeText={setTier1FeeInput}
                      placeholder="350"
                    />
                  </View>
                  <Text style={styles.tierHelperText}>
                    Orders below {tier1MaxLitersInput}L will automatically add ₹{tier1FeeInput} delivery charge at checkout.
                  </Text>
                </View>

                {/* Tier 2: 500L+ */}
                <View style={styles.tierBox}>
                  <View style={styles.tierHeader}>
                    <Text style={styles.tierTitle}>Tier 2: Above {tier1MaxLitersInput} Liters (Bulk Orders)</Text>
                    <Text style={[styles.tierBadge, { backgroundColor: '#ECFDF5', color: '#059669' }]}>
                      {tier2FeeInput === '0' ? 'FREE Delivery' : `₹${tier2FeeInput}`}
                    </Text>
                  </View>
                  <Text style={styles.inputLabel}>Delivery Charge for orders &gt; {tier1MaxLitersInput}L (₹)</Text>
                  <View style={styles.currencyInputWrap}>
                    <Text style={styles.currencyPrefix}>₹</Text>
                    <TextInput
                      style={styles.currencyInput}
                      keyboardType="number-pad"
                      value={tier2FeeInput}
                      onChangeText={setTier2FeeInput}
                      placeholder="0"
                    />
                  </View>
                  <Text style={styles.tierHelperText}>
                    Enter 0 to grant FREE Doorstep Delivery on orders above {tier1MaxLitersInput}L.
                  </Text>
                </View>
              </View>

              {/* Threshold control */}
              <View style={{ marginTop: 14 }}>
                <Text style={styles.inputLabel}>Tier Cut-off Volume (Liters)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="number-pad"
                  value={tier1MaxLitersInput}
                  onChangeText={setTier1MaxLitersInput}
                  placeholder="500"
                />
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={styles.saveSettingsBtn}
              onPress={handleSaveSettings}
              disabled={isSavingSettings}
              activeOpacity={0.85}
            >
              {isSavingSettings ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color={COLORS.white} />
                  <Text style={styles.saveSettingsBtnText}>Update & Save Live Configuration</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* =========================================================================
          MODAL: ASSIGN DELIVERY BOY
      ========================================================================== */}
      <Modal
        visible={!!selectedOrderForAssign}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedOrderForAssign(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Delivery Partner</Text>
              <TouchableOpacity onPress={() => setSelectedOrderForAssign(null)}>
                <Ionicons name="close" size={24} color={COLORS.dark} />
              </TouchableOpacity>
            </View>

            {selectedOrderForAssign && (
              <View style={styles.assignOrderMeta}>
                <Text style={styles.assignOrderTitle}>Order #{selectedOrderForAssign.id}</Text>
                <Text style={styles.assignOrderSub}>
                  {selectedOrderForAssign.name} • {selectedOrderForAssign.liters}L • {selectedOrderForAssign.address}
                </Text>
              </View>
            )}

            <Text style={styles.modalSelectLabel}>Select Available Delivery Bowser Partner:</Text>

            <ScrollView style={{ maxHeight: 260 }}>
              {deliveryBoys.length === 0 ? (
                <Text style={{ color: COLORS.muted, textAlign: 'center', padding: 20 }}>
                  No delivery boys registered yet. Go to Delivery Boys tab to create credentials.
                </Text>
              ) : (
                deliveryBoys.map((driver) => (
                  <TouchableOpacity
                    key={driver.email}
                    style={styles.driverSelectItem}
                    onPress={() => handleAssignOrder(driver)}
                  >
                    <View style={styles.driverSelectAvatar}>
                      <Ionicons name="bicycle" size={20} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.driverSelectName}>{driver.name}</Text>
                      <Text style={styles.driverSelectVehicle}>{driver.vehicleNumber}</Text>
                    </View>
                    <Text style={styles.driverSelectAssignedCount}>
                      {driver.assignedOrdersCount} active
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          MODAL: UPDATE ORDER STATUS
      ========================================================================== */}
      <Modal
        visible={!!selectedOrderForStatus}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedOrderForStatus(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Order Status</Text>
              <TouchableOpacity onPress={() => setSelectedOrderForStatus(null)}>
                <Ionicons name="close" size={24} color={COLORS.dark} />
              </TouchableOpacity>
            </View>

            {selectedOrderForStatus && (
              <Text style={styles.assignOrderMeta}>Order #{selectedOrderForStatus.id}</Text>
            )}

            {[
              { status: 'pending', label: 'Pending (Order Placed)', color: '#D50000' },
              { status: 'assigned', label: 'Assigned to Driver', color: '#D97706' },
              { status: 'out_for_delivery', label: 'Out for Delivery (En Route)', color: '#2563EB' },
              { status: 'delivered', label: 'Delivered (Complete)', color: '#059669' },
              { status: 'cancelled', label: 'Cancelled', color: '#DC2626' },
            ].map((item) => (
              <TouchableOpacity
                key={item.status}
                style={styles.statusOptionItem}
                onPress={() => handleUpdateOrderStatus(item.status)}
              >
                <View style={[styles.statusDot, { backgroundColor: item.color }]} />
                <Text style={styles.statusOptionLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          MODAL: CREATE DELIVERY BOY CREDENTIALS
      ========================================================================== */}
      <Modal
        visible={showAddDriverModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddDriverModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 500 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Delivery Partner Account</Text>
              <TouchableOpacity onPress={() => setShowAddDriverModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.dark} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Suresh Kumar"
                value={newDriverName}
                onChangeText={setNewDriverName}
              />

              <Text style={styles.inputLabel}>Email (Login Username) *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. suresh@extradiesel.in"
                keyboardType="email-address"
                autoCapitalize="none"
                value={newDriverEmail}
                onChangeText={setNewDriverEmail}
              />

              <Text style={styles.inputLabel}>Mobile Phone Number</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="+91 9876543210"
                keyboardType="phone-pad"
                value={newDriverPhone}
                onChangeText={setNewDriverPhone}
              />

              <Text style={styles.inputLabel}>Login Password *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="driver123"
                secureTextEntry={false}
                value={newDriverPassword}
                onChangeText={setNewDriverPassword}
              />

              <Text style={styles.inputLabel}>Bowser Vehicle Number</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. TS 09 UB 4521"
                value={newDriverVehicle}
                onChangeText={setNewDriverVehicle}
              />

              <TouchableOpacity
                style={styles.submitDriverBtn}
                onPress={handleCreateDriver}
                disabled={isSavingDriver}
                activeOpacity={0.85}
              >
                {isSavingDriver ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="person-add" size={18} color={COLORS.white} />
                    <Text style={styles.submitDriverBtnText}>Create Credentials</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
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
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.dark,
    fontWeight: '600',
    fontSize: 15,
  },
  adminHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerLeft: {
    flex: 1,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 4,
  },
  adminBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  adminTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  customerViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  customerViewText: {
    color: COLORS.dark,
    fontWeight: '700',
    fontSize: 13,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 12,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: COLORS.primary,
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.muted,
  },
  tabBtnTextActive: {
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
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
  },
  // Dashboard
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  metricCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  metricSub: {
    fontSize: 12,
    color: '#94A3B8',
  },
  exportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  exportBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
  exportBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  exportBtnTextSmall: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 12,
  },
  quickSettingsBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  quickSettingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  flameIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FFEDD5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickSettingsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#9A3412',
  },
  quickSettingsSub: {
    fontSize: 13,
    color: '#C2410C',
    marginTop: 2,
  },
  quickEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  quickEditBtnText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  recentOrdersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
  },
  recentOrdersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  recentOrdersTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  viewAllText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700',
  },
  recentOrderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  recentOrderId: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  recentOrderCustomer: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
    marginTop: 2,
  },
  recentOrderDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  recentOrderTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
  },
  recentOrderDriver: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  // Orders Tab
  ordersHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  filterBar: {
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.dark,
  },
  statusChipsRow: {
    flexDirection: 'row',
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    marginRight: 8,
  },
  statusChipActive: {
    backgroundColor: COLORS.primary,
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  statusChipTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderCardId: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  orderCardDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  orderDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  orderDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  orderDetailCol: {
    flex: 1,
    minWidth: 110,
  },
  orderDetailLabel: {
    fontSize: 11,
    color: '#94A3B8',
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 2,
  },
  orderDetailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  orderDetailSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  orderAddressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  orderAddressText: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
    fontWeight: '500',
  },
  driverInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  driverInfoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  orderCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnAssign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  actionBtnAssignText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  actionBtnStatusText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
  },
  // Delivery Boys Tab
  addDriverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addDriverBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 13,
  },
  driverCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  driverCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  driverCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  driverVehicle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  driverActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  driverActiveText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
  },
  driverDetailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    gap: 6,
    marginBottom: 12,
  },
  driverDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  driverDetailValue: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  driverStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  driverStatBox: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  driverStatNum: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  driverStatLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  deleteDriverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  deleteDriverText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  // Global Settings Tab
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    marginBottom: 16,
  },
  settingsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  settingsIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  settingsCardSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  formRow: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  currencyInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
    marginRight: 6,
  },
  currencyInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  tiersContainer: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
  },
  tierBox: {
    flex: 1,
    minWidth: 260,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 14,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tierTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  tierBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tierHelperText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
    lineHeight: 16,
  },
  saveSettingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  saveSettingsBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  successBannerText: {
    color: '#065F46',
    fontWeight: '700',
    fontSize: 14,
    flex: 1,
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 12,
  },
  submitDriverBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  submitDriverBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  assignOrderMeta: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
  },
  assignOrderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  assignOrderSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  modalSelectLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
  },
  driverSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  driverSelectAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverSelectName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  driverSelectVehicle: {
    fontSize: 12,
    color: '#64748B',
  },
  driverSelectAssignedCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  statusOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  statusOptionLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
});
