import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { ScreenName } from '../types';

interface MyOrdersScreenProps {
  onNavigate: (screen: ScreenName) => void;
  onSelectOrder: (orderId: string) => void;
}

export const MyOrdersScreen: React.FC<MyOrdersScreenProps> = ({ onNavigate, onSelectOrder }) => {
  const [tab, setTab] = useState<'all' | 'pending' | 'delivered'>('all');

  const orders = [
    {
      id: 'ED20261116-8941',
      date: '19 Nov, 2026 • 10:15 AM',
      liters: 200,
      total: 19845.00,
      status: 'out_for_delivery',
      statusText: 'Out for Delivery',
      address: 'Plot 42, Hitech City, Hyderabad',
    },
    {
      id: 'ED20261112-4210',
      date: '12 Nov, 2026 • 02:30 PM',
      liters: 500,
      total: 49612.50,
      status: 'delivered',
      statusText: 'Delivered',
      address: 'Site 8, Gachibowli, Hyderabad',
    },
    {
      id: 'ED20261105-1829',
      date: '05 Nov, 2026 • 11:00 AM',
      liters: 300,
      total: 29767.50,
      status: 'delivered',
      statusText: 'Delivered',
      address: 'Plot 42, Hitech City, Hyderabad',
    },
  ];

  const filteredOrders = orders.filter((o) => {
    if (tab === 'pending') return o.status === 'out_for_delivery';
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

      {/* Orders List */}
      {filteredOrders.map((order) => {
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
              <TouchableOpacity
                style={styles.invoiceBtn}
                onPress={() => alert(`Downloading GST Tax Invoice for #${order.id}`)}
              >
                <Ionicons name="document-text-outline" size={15} color={COLORS.dark} />
                <Text style={styles.invoiceBtnText}>Invoice</Text>
              </TouchableOpacity>

              {!isDelivered ? (
                <TouchableOpacity
                  style={styles.trackBtn}
                  onPress={() => {
                    onSelectOrder(order.id);
                    onNavigate('track');
                  }}
                >
                  <Ionicons name="location" size={15} color={COLORS.white} />
                  <Text style={styles.trackBtnText}>Track Bowser</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.reorderBtn}
                  onPress={() => onNavigate('order')}
                >
                  <Ionicons name="repeat" size={15} color={COLORS.primary} />
                  <Text style={styles.reorderBtnText}>Repeat Order</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
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
    paddingBottom: Platform.OS === 'android' ? 100 : 85,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
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
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderIdText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.dark,
  },
  orderDateText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeDelivered: {
    backgroundColor: '#ECFDF5',
  },
  badgePending: {
    backgroundColor: '#FEF2F2',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textDelivered: {
    color: COLORS.greenDark,
  },
  textPending: {
    color: COLORS.primary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.dark,
    marginTop: 2,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.primary,
    marginTop: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 14,
  },
  addressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  invoiceBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  invoiceBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.dark,
  },
  trackBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    gap: 6,
  },
  trackBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  reorderBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: '#FEF2F2',
    gap: 6,
  },
  reorderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
