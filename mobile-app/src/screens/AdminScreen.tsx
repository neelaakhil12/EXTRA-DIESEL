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

type TabType = 'dashboard' | 'orders' | 'delivery' | 'settings';

export const AdminScreen: React.FC<AdminScreenProps> = ({ onNavigate, currentUser }) => {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 860;

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
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

  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Executive Dashboard';
      case 'orders':
        return 'Orders & Fleet Assignments';
      case 'delivery':
        return 'Bowser Delivery Fleet';
      case 'settings':
        return 'Global Pricing & Delivery Settings';
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
    <View style={[styles.container, isDesktop ? styles.desktopRow : styles.mobileColumn]}>
      {/* =========================================================================
          LEFT SIDEBAR (Dedicated Desktop Sidebar or Mobile Header Drawer)
      ========================================================================== */}
      <View style={[styles.sidebar, !isDesktop && styles.mobileSidebar]}>
        {/* Brand Area */}
        <View style={styles.sidebarBrand}>
          <View style={styles.brandLogoRow}>
            <View style={styles.flameIconCircle}>
              <Ionicons name="flame" size={20} color={COLORS.white} />
            </View>
            <View>
              <Text style={styles.brandTitle}>
                EXTRA <Text style={{ color: '#FFB300' }}>DIESEL</Text>
              </Text>
              <Text style={styles.brandSubtitle}>CONTROL CENTER</Text>
            </View>
          </View>

          {/* Online System Status */}
          <View style={styles.onlineStatusPill}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineStatusText}>SYSTEM ONLINE</Text>
          </View>

          {!isDesktop && (
            <TouchableOpacity
              style={styles.mobileMenuToggle}
              onPress={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Ionicons name={mobileMenuOpen ? 'close' : 'menu'} size={24} color={COLORS.white} />
            </TouchableOpacity>
          )}
        </View>

        {/* Sidebar Navigation Items */}
        <View style={[styles.sidebarNav, !isDesktop && !mobileMenuOpen && styles.hiddenMobileNav]}>
          <Text style={styles.navSectionLabel}>NAVIGATION MENU</Text>

          {/* Item 1: Dashboard */}
          <TouchableOpacity
            style={[styles.sidebarNavItem, activeTab === 'dashboard' && styles.sidebarNavItemActive]}
            onPress={() => {
              setActiveTab('dashboard');
              setMobileMenuOpen(false);
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === 'dashboard' ? 'grid' : 'grid-outline'}
              size={19}
              color={activeTab === 'dashboard' ? COLORS.white : '#94A3B8'}
            />
            <Text style={[styles.sidebarNavText, activeTab === 'dashboard' && styles.sidebarNavTextActive]}>
              Dashboard
            </Text>
          </TouchableOpacity>

          {/* Item 2: Orders */}
          <TouchableOpacity
            style={[styles.sidebarNavItem, activeTab === 'orders' && styles.sidebarNavItemActive]}
            onPress={() => {
              setActiveTab('orders');
              setMobileMenuOpen(false);
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === 'orders' ? 'receipt' : 'receipt-outline'}
              size={19}
              color={activeTab === 'orders' ? COLORS.white : '#94A3B8'}
            />
            <Text style={[styles.sidebarNavText, activeTab === 'orders' && styles.sidebarNavTextActive]}>
              Orders Management
            </Text>
            <View style={styles.sidebarBadge}>
              <Text style={styles.sidebarBadgeText}>{orders.length}</Text>
            </View>
          </TouchableOpacity>

          {/* Item 3: Delivery Boys */}
          <TouchableOpacity
            style={[styles.sidebarNavItem, activeTab === 'delivery' && styles.sidebarNavItemActive]}
            onPress={() => {
              setActiveTab('delivery');
              setMobileMenuOpen(false);
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === 'delivery' ? 'bicycle' : 'bicycle-outline'}
              size={19}
              color={activeTab === 'delivery' ? COLORS.white : '#94A3B8'}
            />
            <Text style={[styles.sidebarNavText, activeTab === 'delivery' && styles.sidebarNavTextActive]}>
              Delivery Fleet
            </Text>
            <View style={[styles.sidebarBadge, { backgroundColor: '#059669' }]}>
              <Text style={styles.sidebarBadgeText}>{deliveryBoys.length}</Text>
            </View>
          </TouchableOpacity>

          {/* Item 4: Global Settings */}
          <TouchableOpacity
            style={[styles.sidebarNavItem, activeTab === 'settings' && styles.sidebarNavItemActive]}
            onPress={() => {
              setActiveTab('settings');
              setMobileMenuOpen(false);
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === 'settings' ? 'settings-sharp' : 'settings-outline'}
              size={19}
              color={activeTab === 'settings' ? COLORS.white : '#94A3B8'}
            />
            <Text style={[styles.sidebarNavText, activeTab === 'settings' && styles.sidebarNavTextActive]}>
              Global Settings
            </Text>
          </TouchableOpacity>

          {/* Sidebar Footer (Desktop only) */}
          {isDesktop && (
            <View style={styles.sidebarFooter}>
              {/* Go to Live Website link */}
              <TouchableOpacity
                style={styles.visitSiteBtn}
                onPress={() => onNavigate('home')}
                activeOpacity={0.8}
              >
                <Ionicons name="globe-outline" size={16} color="#94A3B8" />
                <Text style={styles.visitSiteText}>View Live Website</Text>
                <Ionicons name="arrow-forward" size={14} color="#64748B" />
              </TouchableOpacity>

              {/* Admin Profile Details */}
              <View style={styles.adminUserBox}>
                <View style={styles.adminAvatarCircle}>
                  <Text style={styles.adminAvatarText}>AD</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.adminUserName} numberOfLines={1}>
                    {currentUser?.name || 'Administrator'}
                  </Text>
                  <Text style={styles.adminUserRole}>Super Admin</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* =========================================================================
          RIGHT MAIN CONTENT AREA
      ========================================================================== */}
      <View style={styles.mainContent}>
        {/* Top Navbar */}
        <View style={styles.topNavbar}>
          <View>
            <Text style={styles.topNavbarBreadcrumb}>ADMIN CONSOLE / {activeTab.toUpperCase()}</Text>
            <Text style={styles.topNavbarTitle}>{getTabTitle()}</Text>
          </View>

          <View style={styles.topNavbarActions}>
            {/* Live Diesel Rate Pill */}
            <View style={styles.topRatePill}>
              <View style={styles.topRatePulse} />
              <Text style={styles.topRateText}>₹{dieselRateInput}/L ({rateCityInput})</Text>
            </View>

            {/* Quick Export CSV Button */}
            <TouchableOpacity style={styles.topActionBtn} onPress={handleExportCsv} activeOpacity={0.8}>
              <Ionicons name="download-outline" size={16} color={COLORS.white} />
              <Text style={styles.topActionBtnText}>Export CSV</Text>
            </TouchableOpacity>

            {/* Refresh Button */}
            <TouchableOpacity style={styles.topRefreshBtn} onPress={loadAdminData} activeOpacity={0.8}>
              <Ionicons name="reload" size={16} color="#475569" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Scrollable Body */}
        <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.bodyScrollContent}>
          {/* =========================================================================
              TAB 1: DASHBOARD
          ========================================================================== */}
          {activeTab === 'dashboard' && (
            <View>
              {/* Metrics Grid */}
              <View style={styles.metricsGrid}>
                {/* Metric 1 */}
                <View style={[styles.metricCard, { borderTopColor: '#059669', borderTopWidth: 4 }]}>
                  <View style={styles.metricCardTop}>
                    <Text style={styles.metricLabel}>Total Revenue</Text>
                    <View style={[styles.metricIconWrap, { backgroundColor: '#ECFDF5' }]}>
                      <Ionicons name="cash" size={20} color="#059669" />
                    </View>
                  </View>
                  <Text style={styles.metricValue}>₹{stats.totalEarnings.toLocaleString('en-IN')}</Text>
                  <Text style={styles.metricSub}>Gross confirmed order volume</Text>
                </View>

                {/* Metric 2 */}
                <View style={[styles.metricCard, { borderTopColor: '#D97706', borderTopWidth: 4 }]}>
                  <View style={styles.metricCardTop}>
                    <Text style={styles.metricLabel}>Today's Earnings</Text>
                    <View style={[styles.metricIconWrap, { backgroundColor: '#FEF3C7' }]}>
                      <Ionicons name="trending-up" size={20} color="#D97706" />
                    </View>
                  </View>
                  <Text style={styles.metricValue}>₹{stats.todayEarnings.toLocaleString('en-IN')}</Text>
                  <Text style={styles.metricSub}>Recorded for today</Text>
                </View>

                {/* Metric 3 */}
                <View style={[styles.metricCard, { borderTopColor: COLORS.primary, borderTopWidth: 4 }]}>
                  <View style={styles.metricCardTop}>
                    <Text style={styles.metricLabel}>Pending Deliveries</Text>
                    <View style={[styles.metricIconWrap, { backgroundColor: '#FEF2F2' }]}>
                      <Ionicons name="time" size={20} color={COLORS.primary} />
                    </View>
                  </View>
                  <Text style={styles.metricValue}>{stats.pendingOrdersCount}</Text>
                  <Text style={styles.metricSub}>Awaiting / en route bowsers</Text>
                </View>

                {/* Metric 4 */}
                <View style={[styles.metricCard, { borderTopColor: '#2563EB', borderTopWidth: 4 }]}>
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

              {/* Quick Config Banner */}
              <View style={styles.quickBanner}>
                <View style={styles.quickBannerLeft}>
                  <View style={styles.quickBannerIcon}>
                    <Ionicons name="flame" size={24} color="#EA580C" />
                  </View>
                  <View>
                    <Text style={styles.quickBannerTitle}>
                      Active Fuel Rate: ₹{dieselRateInput}/L • Delivery: ₹{tier1FeeInput} (≤500L) • ₹{tier2FeeInput === '0' ? 'FREE' : '₹' + tier2FeeInput} (&gt;500L)
                    </Text>
                    <Text style={styles.quickBannerSub}>
                      All customer billings are automatically computed using these global parameters.
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.quickBannerBtn} onPress={() => setActiveTab('settings')}>
                  <Text style={styles.quickBannerBtnText}>Adjust Settings</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              {/* Recent Orders Overview */}
              <View style={styles.cardBox}>
                <View style={styles.cardBoxHeader}>
                  <View>
                    <Text style={styles.cardBoxTitle}>Recent Orders Activity</Text>
                    <Text style={styles.cardBoxSub}>Latest deliveries placed across sites</Text>
                  </View>
                  <TouchableOpacity onPress={() => setActiveTab('orders')}>
                    <Text style={styles.linkText}>View All ({orders.length}) →</Text>
                  </TouchableOpacity>
                </View>

                {orders.slice(0, 5).map((order) => {
                  const badge = getStatusBadgeStyle(order.status);
                  return (
                    <View key={order.id} style={styles.recentRow}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={styles.orderIdBold}>#{order.id}</Text>
                          <View style={[styles.statusTag, { backgroundColor: badge.bg }]}>
                            <Text style={[styles.statusTagText, { color: badge.text }]}>{badge.label}</Text>
                          </View>
                        </View>
                        <Text style={styles.orderClientText}>{order.name} • {order.liters} Liters</Text>
                        <Text style={styles.orderDateSub}>{order.date}</Text>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.orderAmountBold}>₹{Number(order.total).toLocaleString('en-IN')}</Text>
                        <Text style={styles.orderDriverSub}>
                          {order.assignedToName ? `🚚 ${order.assignedToName}` : '⚠️ Unassigned'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* =========================================================================
              TAB 2: ORDERS MANAGEMENT
          ========================================================================== */}
          {activeTab === 'orders' && (
            <View>
              {/* Filter & Search Bar */}
              <View style={styles.filterCard}>
                <View style={styles.searchRow}>
                  <Ionicons name="search" size={18} color="#94A3B8" />
                  <TextInput
                    style={styles.searchInputField}
                    placeholder="Search by order ID, customer name, phone, address..."
                    value={orderSearchQuery}
                    onChangeText={setOrderSearchQuery}
                  />
                  {orderSearchQuery ? (
                    <TouchableOpacity onPress={() => setOrderSearchQuery('')}>
                      <Ionicons name="close-circle" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Filter Chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                  {['all', 'pending', 'out_for_delivery', 'delivered'].map((st) => (
                    <TouchableOpacity
                      key={st}
                      style={[styles.filterChip, orderStatusFilter === st && styles.filterChipActive]}
                      onPress={() => setOrderStatusFilter(st)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          orderStatusFilter === st && styles.filterChipTextActive,
                        ]}
                      >
                        {st === 'all'
                          ? 'All Orders'
                          : st === 'pending'
                          ? 'Pending & Assigned'
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
                <View style={styles.emptyBox}>
                  <Ionicons name="file-tray-outline" size={48} color="#94A3B8" />
                  <Text style={styles.emptyTitle}>No Orders Match Your Query</Text>
                  <Text style={styles.emptySub}>Try searching with a different term or clear the filter.</Text>
                </View>
              ) : (
                filteredOrders.map((order) => {
                  const badge = getStatusBadgeStyle(order.status);
                  return (
                    <View key={order.id} style={styles.orderListItem}>
                      <View style={styles.orderListTop}>
                        <View>
                          <Text style={styles.orderListId}>#{order.id}</Text>
                          <Text style={styles.orderListDate}>{order.date}</Text>
                        </View>
                        <View style={[styles.statusTag, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.statusTagText, { color: badge.text }]}>{badge.label}</Text>
                        </View>
                      </View>

                      <View style={styles.orderListDivider} />

                      <View style={styles.orderListColumns}>
                        <View style={{ flex: 1.2, minWidth: 150 }}>
                          <Text style={styles.colLabel}>Customer Details</Text>
                          <Text style={styles.colValue}>{order.name}</Text>
                          <Text style={styles.colSub}>{order.email}</Text>
                          {order.phone ? <Text style={styles.colSub}>📞 {order.phone}</Text> : null}
                        </View>

                        <View style={{ flex: 1, minWidth: 110 }}>
                          <Text style={styles.colLabel}>Fuel Volume</Text>
                          <Text style={styles.colValue}>{order.liters} L</Text>
                          <Text style={styles.colSub}>@ ₹{order.fuelRate || dieselRateInput}/L</Text>
                        </View>

                        <View style={{ flex: 1, minWidth: 110 }}>
                          <Text style={styles.colLabel}>Total Invoice</Text>
                          <Text style={[styles.colValue, { color: COLORS.primary }]}>
                            ₹{Number(order.total).toLocaleString('en-IN')}
                          </Text>
                          <Text style={styles.colSub}>
                            Delivery: {order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee}`}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.orderSiteBox}>
                        <Ionicons name="location" size={16} color={COLORS.primary} />
                        <Text style={styles.orderSiteText}>{order.address}</Text>
                      </View>

                      {/* Driver & Action Buttons */}
                      <View style={styles.orderBottomBar}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                          <Ionicons
                            name={order.assignedToName ? 'bicycle' : 'alert-circle'}
                            size={16}
                            color={order.assignedToName ? '#059669' : '#D97706'}
                          />
                          <Text style={styles.driverAssignedText}>
                            {order.assignedToName
                              ? `Assigned: ${order.assignedToName} (${order.vehicleNumber || 'Bowser'})`
                              : 'No Delivery Partner Assigned'}
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity
                            style={styles.btnAssign}
                            onPress={() => setSelectedOrderForAssign(order)}
                          >
                            <Ionicons name="person-add" size={13} color={COLORS.primary} />
                            <Text style={styles.btnAssignText}>
                              {order.assignedToName ? 'Reassign' : 'Assign Driver'}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.btnStatus}
                            onPress={() => setSelectedOrderForStatus(order)}
                          >
                            <Ionicons name="sync" size={13} color="#2563EB" />
                            <Text style={styles.btnStatusText}>Status</Text>
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
              TAB 3: DELIVERY FLEET
          ========================================================================== */}
          {activeTab === 'delivery' && (
            <View>
              <View style={styles.headerActionRow}>
                <View>
                  <Text style={styles.pageSectionTitle}>Bowser Drivers & Delivery Personnel</Text>
                  <Text style={styles.pageSectionSub}>
                    Create login credentials for your drivers. They log in directly via the regular app login screen.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.primaryAddBtn}
                  onPress={() => setShowAddDriverModal(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add" size={18} color={COLORS.white} />
                  <Text style={styles.primaryAddBtnText}>Add New Driver</Text>
                </TouchableOpacity>
              </View>

              {deliveryBoys.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="bicycle-outline" size={48} color="#94A3B8" />
                  <Text style={styles.emptyTitle}>No Delivery Partners Configured</Text>
                  <Text style={styles.emptySub}>Click the button above to register your first delivery driver.</Text>
                </View>
              ) : (
                <View style={styles.driverGrid}>
                  {deliveryBoys.map((driver) => (
                    <View key={driver.email} style={styles.driverGridCard}>
                      <View style={styles.driverGridTop}>
                        <View style={styles.driverGridAvatar}>
                          <Ionicons name="person" size={22} color={COLORS.primary} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.driverGridName}>{driver.name}</Text>
                          <Text style={styles.driverGridVehicle}>🚚 {driver.vehicleNumber}</Text>
                        </View>
                        <View style={styles.driverOnlineBadge}>
                          <Text style={styles.driverOnlineText}>Active</Text>
                        </View>
                      </View>

                      <View style={styles.driverDetailsContainer}>
                        <View style={styles.driverDetailRow}>
                          <Ionicons name="mail-outline" size={14} color="#64748B" />
                          <Text style={styles.driverDetailText}>{driver.email}</Text>
                        </View>
                        <View style={styles.driverDetailRow}>
                          <Ionicons name="call-outline" size={14} color="#64748B" />
                          <Text style={styles.driverDetailText}>{driver.phone || 'No phone set'}</Text>
                        </View>
                      </View>

                      <View style={styles.driverStatsPair}>
                        <View style={styles.statSubBox}>
                          <Text style={styles.statSubNum}>{driver.assignedOrdersCount}</Text>
                          <Text style={styles.statSubLabel}>In Progress</Text>
                        </View>
                        <View style={styles.statSubBox}>
                          <Text style={[styles.statSubNum, { color: '#059669' }]}>
                            {driver.completedOrdersCount}
                          </Text>
                          <Text style={styles.statSubLabel}>Delivered</Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.deleteDriverAction}
                        onPress={() => handleDeleteDriver(driver.email, driver.name)}
                      >
                        <Ionicons name="trash-outline" size={14} color="#DC2626" />
                        <Text style={styles.deleteDriverActionText}>Remove Driver</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* =========================================================================
              TAB 4: GLOBAL PRICING & SETTINGS
          ========================================================================== */}
          {activeTab === 'settings' && (
            <View>
              <Text style={styles.pageSectionTitle}>Global Fuel & Delivery Fee Settings</Text>
              <Text style={styles.pageSectionSub}>
                Update daily diesel price and volume-based delivery fees. All changes take effect across mobile & web instantly.
              </Text>

              {settingsSuccessMessage ? (
                <View style={styles.alertSuccess}>
                  <Ionicons name="checkmark-circle" size={20} color="#059669" />
                  <Text style={styles.alertSuccessText}>{settingsSuccessMessage}</Text>
                </View>
              ) : null}

              {/* Fuel Price Card */}
              <View style={styles.settingCard}>
                <View style={styles.settingCardHeader}>
                  <View style={[styles.settingIconBox, { backgroundColor: '#FEF2F2' }]}>
                    <Ionicons name="flame" size={22} color={COLORS.primary} />
                  </View>
                  <View>
                    <Text style={styles.settingCardTitle}>Daily Diesel Price Rate</Text>
                    <Text style={styles.settingCardSub}>Live retail rate per liter applied to new orders</Text>
                  </View>
                </View>

                <View style={styles.formRowInline}>
                  <View style={{ flex: 1, minWidth: 200 }}>
                    <Text style={styles.fieldLabel}>Price Per Liter (₹)</Text>
                    <View style={styles.inputPrefixWrap}>
                      <Text style={styles.inputPrefixText}>₹</Text>
                      <TextInput
                        style={styles.inputPrefixField}
                        keyboardType="decimal-pad"
                        value={dieselRateInput}
                        onChangeText={setDieselRateInput}
                        placeholder="94.50"
                      />
                    </View>
                  </View>

                  <View style={{ flex: 1, minWidth: 200 }}>
                    <Text style={styles.fieldLabel}>City / Jurisdiction</Text>
                    <TextInput
                      style={styles.standardField}
                      value={rateCityInput}
                      onChangeText={setRateCityInput}
                      placeholder="Hyderabad"
                    />
                  </View>
                </View>
              </View>

              {/* Delivery Charges Tiers Card */}
              <View style={styles.settingCard}>
                <View style={styles.settingCardHeader}>
                  <View style={[styles.settingIconBox, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="cube" size={22} color="#2563EB" />
                  </View>
                  <View>
                    <Text style={styles.settingCardTitle}>Doorstep Delivery Fee Tiers</Text>
                    <Text style={styles.settingCardSub}>Configure automated delivery pricing for small vs bulk orders</Text>
                  </View>
                </View>

                <View style={styles.tiersGrid}>
                  {/* Tier 1 */}
                  <View style={styles.tierGridBox}>
                    <View style={styles.tierHeaderRow}>
                      <Text style={styles.tierHeading}>Tier 1: Up to {tier1MaxLitersInput} Liters</Text>
                      <Text style={styles.tierPillStandard}>Standard Fee</Text>
                    </View>
                    <Text style={styles.fieldLabel}>Delivery Fee (₹)</Text>
                    <View style={styles.inputPrefixWrap}>
                      <Text style={styles.inputPrefixText}>₹</Text>
                      <TextInput
                        style={styles.inputPrefixField}
                        keyboardType="number-pad"
                        value={tier1FeeInput}
                        onChangeText={setTier1FeeInput}
                        placeholder="350"
                      />
                    </View>
                    <Text style={styles.tierNote}>
                      Orders ≤ {tier1MaxLitersInput}L will automatically add ₹{tier1FeeInput} delivery charge.
                    </Text>
                  </View>

                  {/* Tier 2 */}
                  <View style={styles.tierGridBox}>
                    <View style={styles.tierHeaderRow}>
                      <Text style={styles.tierHeading}>Tier 2: Above {tier1MaxLitersInput} Liters (Bulk)</Text>
                      <Text style={[styles.tierPillStandard, { backgroundColor: '#ECFDF5', color: '#059669' }]}>
                        {tier2FeeInput === '0' ? 'FREE' : `₹${tier2FeeInput}`}
                      </Text>
                    </View>
                    <Text style={styles.fieldLabel}>Delivery Fee (₹) - Enter 0 for FREE</Text>
                    <View style={styles.inputPrefixWrap}>
                      <Text style={styles.inputPrefixText}>₹</Text>
                      <TextInput
                        style={styles.inputPrefixField}
                        keyboardType="number-pad"
                        value={tier2FeeInput}
                        onChangeText={setTier2FeeInput}
                        placeholder="0"
                      />
                    </View>
                    <Text style={styles.tierNote}>
                      Orders &gt; {tier1MaxLitersInput}L qualify for FREE Doorstep Delivery (₹0).
                    </Text>
                  </View>
                </View>

                {/* Cut-off volume input */}
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.fieldLabel}>Volume Threshold (Liters)</Text>
                  <TextInput
                    style={styles.standardField}
                    keyboardType="number-pad"
                    value={tier1MaxLitersInput}
                    onChangeText={setTier1MaxLitersInput}
                    placeholder="500"
                  />
                </View>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={styles.saveSettingsButton}
                onPress={handleSaveSettings}
                disabled={isSavingSettings}
                activeOpacity={0.85}
              >
                {isSavingSettings ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color={COLORS.white} />
                    <Text style={styles.saveSettingsButtonText}>Update & Save Live Configuration</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>

      {/* =========================================================================
          MODALS
      ========================================================================== */}
      {/* Assign Modal */}
      <Modal
        visible={!!selectedOrderForAssign}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedOrderForAssign(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalCardHeader}>
              <Text style={styles.modalCardTitle}>Assign Delivery Partner</Text>
              <TouchableOpacity onPress={() => setSelectedOrderForAssign(null)}>
                <Ionicons name="close" size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {selectedOrderForAssign && (
              <View style={styles.modalMetaBox}>
                <Text style={styles.modalMetaTitle}>Order #{selectedOrderForAssign.id}</Text>
                <Text style={styles.modalMetaSub}>
                  {selectedOrderForAssign.name} • {selectedOrderForAssign.liters}L • {selectedOrderForAssign.address}
                </Text>
              </View>
            )}

            <Text style={styles.modalSelectLabel}>Select Available Driver:</Text>
            <ScrollView style={{ maxHeight: 260 }}>
              {deliveryBoys.map((driver) => (
                <TouchableOpacity
                  key={driver.email}
                  style={styles.driverOptionItem}
                  onPress={() => handleAssignOrder(driver)}
                >
                  <View style={styles.driverOptionAvatar}>
                    <Ionicons name="bicycle" size={18} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.driverOptionName}>{driver.name}</Text>
                    <Text style={styles.driverOptionVehicle}>{driver.vehicleNumber}</Text>
                  </View>
                  <Text style={styles.driverOptionActiveCount}>{driver.assignedOrdersCount} active</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Status Modal */}
      <Modal
        visible={!!selectedOrderForStatus}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedOrderForStatus(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalCardHeader}>
              <Text style={styles.modalCardTitle}>Change Order Status</Text>
              <TouchableOpacity onPress={() => setSelectedOrderForStatus(null)}>
                <Ionicons name="close" size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {[
              { status: 'pending', label: 'Pending (Order Placed)', color: '#D50000' },
              { status: 'assigned', label: 'Assigned to Driver', color: '#D97706' },
              { status: 'out_for_delivery', label: 'Out for Delivery (En Route)', color: '#2563EB' },
              { status: 'delivered', label: 'Delivered (Complete)', color: '#059669' },
              { status: 'cancelled', label: 'Cancelled', color: '#DC2626' },
            ].map((item) => (
              <TouchableOpacity
                key={item.status}
                style={styles.statusSelectRow}
                onPress={() => handleUpdateOrderStatus(item.status)}
              >
                <View style={[styles.statusSelectDot, { backgroundColor: item.color }]} />
                <Text style={styles.statusSelectLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Add Driver Modal */}
      <Modal
        visible={showAddDriverModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddDriverModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxWidth: 460 }]}>
            <View style={styles.modalCardHeader}>
              <Text style={styles.modalCardTitle}>Create Driver Login Credentials</Text>
              <TouchableOpacity onPress={() => setShowAddDriverModal(false)}>
                <Ionicons name="close" size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.fieldLabel}>Full Name *</Text>
              <TextInput
                style={styles.modalInputField}
                placeholder="e.g. Suresh Kumar"
                value={newDriverName}
                onChangeText={setNewDriverName}
              />

              <Text style={styles.fieldLabel}>Email (Login Username) *</Text>
              <TextInput
                style={styles.modalInputField}
                placeholder="suresh@extradiesel.in"
                keyboardType="email-address"
                autoCapitalize="none"
                value={newDriverEmail}
                onChangeText={setNewDriverEmail}
              />

              <Text style={styles.fieldLabel}>Mobile Number</Text>
              <TextInput
                style={styles.modalInputField}
                placeholder="+91 9876543210"
                keyboardType="phone-pad"
                value={newDriverPhone}
                onChangeText={setNewDriverPhone}
              />

              <Text style={styles.fieldLabel}>Password *</Text>
              <TextInput
                style={styles.modalInputField}
                placeholder="driver123"
                value={newDriverPassword}
                onChangeText={setNewDriverPassword}
              />

              <Text style={styles.fieldLabel}>Bowser Vehicle Number</Text>
              <TextInput
                style={styles.modalInputField}
                placeholder="TS 09 UB 4521"
                value={newDriverVehicle}
                onChangeText={setNewDriverVehicle}
              />

              <TouchableOpacity
                style={styles.submitDriverButton}
                onPress={handleCreateDriver}
                disabled={isSavingDriver}
                activeOpacity={0.85}
              >
                {isSavingDriver ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="person-add" size={16} color={COLORS.white} />
                    <Text style={styles.submitDriverButtonText}>Create Driver Account</Text>
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
    height: '100%',
  },
  desktopRow: {
    flexDirection: 'row',
  },
  mobileColumn: {
    flexDirection: 'column',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B1120',
  },
  loadingText: {
    marginTop: 12,
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 15,
  },
  // Sidebar
  sidebar: {
    width: 260,
    backgroundColor: '#0B1120',
    borderRightWidth: 1,
    borderRightColor: '#1E293B',
    paddingVertical: 20,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  mobileSidebar: {
    width: '100%',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  sidebarBrand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  brandLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  flameIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 1,
  },
  onlineStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  onlineStatusText: {
    color: '#10B981',
    fontSize: 9.5,
    fontWeight: '800',
  },
  mobileMenuToggle: {
    padding: 6,
  },
  sidebarNav: {
    flex: 1,
  },
  hiddenMobileNav: {
    display: 'none',
  },
  navSectionLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 6,
  },
  sidebarNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  sidebarNavItemActive: {
    backgroundColor: COLORS.primary,
  },
  sidebarNavText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    flex: 1,
  },
  sidebarNavTextActive: {
    color: COLORS.white,
    fontWeight: '800',
  },
  sidebarBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sidebarBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 16,
    marginTop: 20,
    gap: 12,
  },
  visitSiteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  visitSiteText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  adminUserBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
  },
  adminAvatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminAvatarText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },
  adminUserName: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  adminUserRole: {
    color: '#64748B',
    fontSize: 11,
  },
  // Main Content
  mainContent: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    height: '100%',
  },
  topNavbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexWrap: 'wrap',
    gap: 12,
  },
  topNavbarBreadcrumb: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  topNavbarTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
  },
  topNavbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topRatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  topRatePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D97706',
  },
  topRateText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#78350F',
  },
  topActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  topActionBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  topRefreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bodyScroll: {
    flex: 1,
  },
  bodyScrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  // Dashboard Metrics
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
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
  quickBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  quickBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  quickBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FFEDD5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#9A3412',
  },
  quickBannerSub: {
    fontSize: 13,
    color: '#C2410C',
    marginTop: 2,
  },
  quickBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  quickBannerBtnText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  cardBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
  },
  cardBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardBoxTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardBoxSub: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  linkText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700',
  },
  recentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  orderIdBold: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  orderClientText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
    marginTop: 2,
  },
  orderDateSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  orderAmountBold: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
  },
  orderDriverSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statusTag: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusTagText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  // Orders Tab
  filterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInputField: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  chipsRow: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  orderListItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
  },
  orderListTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderListId: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  orderListDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  orderListDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  orderListColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  colLabel: {
    fontSize: 11,
    color: '#94A3B8',
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 2,
  },
  colValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  colSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  orderSiteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  orderSiteText: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
    fontWeight: '500',
  },
  orderBottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  driverAssignedText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  btnAssign: {
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
  btnAssignText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  btnStatus: {
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
  btnStatusText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
  },
  // Delivery Fleet
  headerActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  pageSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  pageSectionSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  primaryAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  primaryAddBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 13,
  },
  driverGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  driverGridCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  driverGridTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverGridAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverGridName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  driverGridVehicle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  driverOnlineBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  driverOnlineText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
  },
  driverDetailsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    gap: 6,
    marginBottom: 12,
  },
  driverDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  driverDetailText: {
    fontSize: 13,
    color: '#334155',
  },
  driverStatsPair: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statSubBox: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  statSubNum: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  statSubLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  deleteDriverAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  deleteDriverActionText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  // Settings Tab
  alertSuccess: {
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
  alertSuccessText: {
    color: '#065F46',
    fontWeight: '700',
    fontSize: 14,
    flex: 1,
  },
  settingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    marginBottom: 16,
  },
  settingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  settingIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  settingCardSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  formRowInline: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  inputPrefixWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  inputPrefixText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
    marginRight: 6,
  },
  inputPrefixField: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  standardField: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  tiersGrid: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
  },
  tierGridBox: {
    flex: 1,
    minWidth: 260,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 14,
  },
  tierHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tierHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  tierPillStandard: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tierNote: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
    lineHeight: 16,
  },
  saveSettingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 8,
  },
  saveSettingsButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    maxHeight: '90%',
  },
  modalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalCardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalMetaBox: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
  },
  modalMetaTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalMetaSub: {
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
  driverOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  driverOptionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverOptionName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  driverOptionVehicle: {
    fontSize: 12,
    color: '#64748B',
  },
  driverOptionActiveCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  statusSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  statusSelectDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  statusSelectLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  modalInputField: {
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
  submitDriverButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  submitDriverButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  emptyBox: {
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
