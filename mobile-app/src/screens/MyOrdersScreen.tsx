import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { ScreenName } from '../types';
import { APP_CONFIG } from '../constants/config';

interface OrderItem {
  id: string;
  date: string;
  liters: number;
  total: number;
  status: string;
  statusText: string;
  address: string;
}

interface MyOrdersScreenProps {
  onNavigate: (screen: ScreenName) => void;
  onSelectOrder: (orderId: string) => void;
}

export const MyOrdersScreen: React.FC<MyOrdersScreenProps> = ({ onNavigate, onSelectOrder }) => {
  const [tab, setTab] = useState<'all' | 'pending' | 'delivered'>('all');
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real orders from backend
  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const baseUrl = APP_CONFIG.LIVE_API_BASE_URL || 'https://gtmining.xyz';
      const res = await fetch(`${baseUrl}/api/orders`);
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
      }
    } catch (e) {
      // Keep empty or fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter((o) => {
    if (tab === 'pending') return o.status === 'out_for_delivery' || o.status === 'pending';
    if (tab === 'delivered') return o.status === 'delivered';
    return true;
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        {(['all', 'pending', 'delivered'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabButton, tab === t && styles.tabButtonActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabButtonText, tab === t && styles.tabButtonTextActive]}>
              {t.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Loading Indicator */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : filteredOrders.length === 0 ? (
        /* Empty State */
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="receipt-outline" size={42} color="#94A3B8" />
          </View>
          <Text style={styles.emptyTitle}>No Orders Found</Text>
          <Text style={styles.emptySubtitle}>
            {tab === 'all'
              ? 'You have not placed any fuel orders yet. Order high-speed diesel delivered directly to your site!'
              : `No ${tab} orders at this moment.`}
          </Text>
          <TouchableOpacity
            style={styles.orderNowBtn}
            onPress={() => onNavigate('order')}
            activeOpacity={0.85}
          >
            <Ionicons name="funnel" size={17} color={COLORS.white} />
            <Text style={styles.orderNowBtnText}>Order Diesel Now</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Real Orders List */
        filteredOrders.map((order) => {
          const isDelivered = order.status === 'delivered';
          return (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderCardHeader}>
                <View>
                  <Text style={styles.orderIdText}>#{order.id}</Text>
                  <Text style={styles.orderDateText}>{order.date}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    isDelivered ? styles.badgeDelivered : styles.badgePending,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      isDelivered ? styles.textDelivered : styles.textPending,
                    ]}
                  >
                    {order.statusText}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailsRow}>
                <View>
                  <Text style={styles.detailLabel}>Fuel Volume</Text>
                  <Text style={styles.detailValue}>{order.liters} Liters (BS-VI)</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.detailLabel}>Total Paid</Text>
                  <Text style={styles.totalValue}>₹{order.total.toFixed(2)}</Text>
                </View>
              </View>

              <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={14} color={COLORS.muted} />
                <Text style={styles.addressText} numberOfLines={1}>
                  {order.address}
                </Text>
              </View>

              <View style={styles.actionRow}>
                {!isDelivered && (
                  <TouchableOpacity
                    style={styles.trackBtn}
                    onPress={() => {
                      onSelectOrder(order.id);
                      onNavigate('track');
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="location" size={15} color={COLORS.white} />
                    <Text style={styles.trackBtnText}>Track Bowser</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })
      )}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: COLORS.primary,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
  },
  tabButtonTextActive: {
    color: COLORS.white,
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  orderNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  orderNowBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderIdText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 2,
  },
  orderDateText: {
    fontSize: 11,
    color: COLORS.muted,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgePending: {
    backgroundColor: '#FEF2F2',
  },
  badgeDelivered: {
    backgroundColor: '#ECFDF5',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textPending: {
    color: COLORS.primary,
  },
  textDelivered: {
    color: '#059669',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 11,
    color: COLORS.muted,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.dark,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  addressText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  trackBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
});
