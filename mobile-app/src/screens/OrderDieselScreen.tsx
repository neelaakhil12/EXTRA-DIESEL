import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { ScreenName } from '../types';
import { APP_CONFIG } from '../constants/config';

interface OrderDieselScreenProps {
  onOrderSuccess: (orderId: string) => void;
  onNavigate: (screen: ScreenName) => void;
}

export const OrderDieselScreen: React.FC<OrderDieselScreenProps> = ({ onOrderSuccess, onNavigate }) => {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const [liters, setLiters] = useState<number>(200);
  const [vehicleType, setVehicleType] = useState<string>('DG Set');
  const [deliveryType, setDeliveryType] = useState<'one-time' | 'subscription'>('one-time');
  const [selectedSlot, setSelectedSlot] = useState<string>('08:00 AM - 12:00 PM');
  const [selectedAddress, setSelectedAddress] = useState<string>('Plot 42, Hitech City, Phase 2, Hyderabad');
  const [ratePerLiter, setRatePerLiter] = useState<number>(94.50);

  // Fetch live dynamic diesel rate from backend
  useEffect(() => {
    const fetchRate = async () => {
      try {
        const baseUrl = APP_CONFIG.LIVE_API_BASE_URL || 'https://gtmining.xyz';
        const res = await fetch(`${baseUrl}/api/fuel-rate`);
        const data = await res.json();
        if (data.rate && !isNaN(Number(data.rate))) {
          setRatePerLiter(Number(data.rate));
        }
      } catch (err) {}
    };
    fetchRate();
  }, []);

  const subtotal = liters * ratePerLiter;
  const deliveryFee = liters >= 200 ? 0 : 250;
  const gstRate = 0.05; // 5%
  const tax = subtotal * gstRate;
  const totalAmount = subtotal + deliveryFee + tax;

  const quickQuantities = [100, 200, 500, 1000];
  const vehicleOptions = ['DG Set', 'Excavator', 'Commercial Fleet', 'Storage Tank'];
  const slotOptions = ['08:00 AM - 12:00 PM', '01:00 PM - 05:00 PM', '06:00 PM - 10:00 PM'];

  const handlePlaceOrder = async () => {
    const newOrderId = `ED${new Date().getFullYear()}${Math.floor(100000 + Math.random() * 900000)}`;
    const orderPayload = {
      id: newOrderId,
      liters,
      total: totalAmount,
      address: selectedAddress,
      status: 'out_for_delivery',
      statusText: 'Out for Delivery',
    };

    try {
      const baseUrl = APP_CONFIG.LIVE_API_BASE_URL || 'https://gtmining.xyz';
      await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });
    } catch (e) {}

    onOrderSuccess(newOrderId);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isDesktop && { maxWidth: 860, width: '100%', alignSelf: 'center', paddingVertical: 24 }]}
    >
      {/* Location Selector */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="location" size={20} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Delivery Site</Text>
        </View>
        <Text style={styles.addressText}>{selectedAddress}</Text>
        <TouchableOpacity style={styles.changeLink}>
          <Text style={styles.changeLinkText}>Change Site</Text>
        </TouchableOpacity>
      </View>

      {/* Quantity Selector */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="funnel" size={20} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Fuel Quantity</Text>
        </View>

        {/* Quick presets */}
        <View style={styles.quickGrid}>
          {quickQuantities.map((qty) => (
            <TouchableOpacity
              key={qty}
              style={[styles.quickButton, liters === qty && styles.quickButtonActive]}
              onPress={() => setLiters(qty)}
            >
              <Text style={[styles.quickButtonText, liters === qty && styles.quickButtonTextActive]}>
                {qty} L
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stepper control */}
        <View style={styles.stepperContainer}>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => setLiters((prev) => Math.max(50, prev - 50))}
          >
            <Ionicons name="remove" size={22} color={COLORS.dark} />
          </TouchableOpacity>
          <View style={styles.qtyDisplay}>
            <Text style={styles.qtyDisplayText}>{liters}</Text>
            <Text style={styles.qtyUnit}>Liters</Text>
          </View>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => setLiters((prev) => prev + 50)}
          >
            <Ionicons name="add" size={22} color={COLORS.dark} />
          </TouchableOpacity>
        </View>
        {liters >= 200 && (
          <View style={styles.freeDeliveryBadge}>
            <Ionicons name="checkmark-circle" size={14} color={COLORS.greenDark} />
            <Text style={styles.freeDeliveryText}>Qualified for FREE Doorstep Delivery!</Text>
          </View>
        )}
      </View>

      {/* Equipment / Target */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="construct" size={20} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Equipment / Vehicle Type</Text>
        </View>
        <View style={styles.pillRow}>
          {vehicleOptions.map((v) => (
            <TouchableOpacity
              key={v}
              style={[styles.pill, vehicleType === v && styles.pillActive]}
              onPress={() => setVehicleType(v)}
            >
              <Text style={[styles.pillText, vehicleType === v && styles.pillTextActive]}>{v}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Time Slot */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="time" size={20} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Preferred Delivery Slot</Text>
        </View>
        {slotOptions.map((slot) => (
          <TouchableOpacity
            key={slot}
            style={[styles.slotItem, selectedSlot === slot && styles.slotItemActive]}
            onPress={() => setSelectedSlot(slot)}
          >
            <Ionicons
              name={selectedSlot === slot ? 'radio-button-on' : 'radio-button-off'}
              size={18}
              color={selectedSlot === slot ? COLORS.primary : COLORS.muted}
            />
            <Text style={[styles.slotText, selectedSlot === slot && styles.slotTextActive]}>
              {slot}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Itemized Price Breakdown */}
      <View style={styles.billCard}>
        <Text style={styles.billTitle}>Bill Summary</Text>
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Base Diesel ({liters}L @ ₹{ratePerLiter.toFixed(2)})</Text>
          <Text style={styles.billValue}>₹{subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Doorstep Delivery Fee</Text>
          <Text style={[styles.billValue, deliveryFee === 0 && { color: COLORS.greenDark }]}>
            {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}
          </Text>
        </View>
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>GST (5%)</Text>
          <Text style={styles.billValue}>₹{tax.toFixed(2)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Payable</Text>
          <Text style={styles.totalValue}>₹{totalAmount.toFixed(2)}</Text>
        </View>
      </View>

      {/* Checkout Button */}
      <TouchableOpacity style={styles.orderButton} onPress={handlePlaceOrder} activeOpacity={0.85}>
        <View>
          <Text style={styles.orderButtonSub}>Pay ₹{totalAmount.toFixed(2)}</Text>
          <Text style={styles.orderButtonMain}>Confirm & Pay Order</Text>
        </View>
        <Ionicons name="arrow-forward" size={22} color={COLORS.white} />
      </TouchableOpacity>
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
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.dark,
  },
  addressText: {
    fontSize: 14,
    color: COLORS.dark,
    lineHeight: 20,
    fontWeight: '500',
  },
  changeLink: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  changeLinkText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  quickButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  quickButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.dark,
  },
  quickButtonTextActive: {
    color: COLORS.white,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  qtyDisplayText: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.dark,
  },
  qtyUnit: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  freeDeliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  freeDeliveryText: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '600',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.dark,
  },
  pillTextActive: {
    color: COLORS.white,
  },
  slotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  slotItemActive: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  slotText: {
    fontSize: 13,
    color: COLORS.dark,
  },
  slotTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  billCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  billTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 12,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  billLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  billValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.dark,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
  },
  orderButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  orderButtonSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
  },
  orderButtonMain: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
  },
});
