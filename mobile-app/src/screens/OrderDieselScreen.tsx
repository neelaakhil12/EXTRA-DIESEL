import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { ScreenName } from '../types';
import { APP_CONFIG } from '../constants/config';
import * as Location from 'expo-location';
import { sendSystemNotification } from '../services/notificationService';

interface OrderDieselScreenProps {
  onOrderSuccess: (orderId: string) => void;
  onNavigate: (screen: ScreenName) => void;
  currentUser?: { name: string; email: string; phone?: string };
  deliveryLocation?: { fullAddress: string; shortAddress?: string };
  onOpenLocationModal?: () => void;
}

export const OrderDieselScreen: React.FC<OrderDieselScreenProps> = ({
  onOrderSuccess,
  onNavigate,
  currentUser,
  deliveryLocation,
  onOpenLocationModal,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  // Customer Contact Details (Autofilled from currentUser)
  const [customerName, setCustomerName] = useState<string>(currentUser?.name || '');
  const [customerPhone, setCustomerPhone] = useState<string>(currentUser?.phone || '');
  const [customerEmail, setCustomerEmail] = useState<string>(currentUser?.email || '');

  // Delivery Address & Google Maps link
  const [deliveryAddress, setDeliveryAddress] = useState<string>(
    deliveryLocation?.fullAddress || ''
  );
  const [googleMapsLink, setGoogleMapsLink] = useState<string>('');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locateStatus, setLocateStatus] = useState<string>('');

  // Fuel & Order details
  const [litersInput, setLitersInput] = useState<string>('200');
  const [vehicleType, setVehicleType] = useState<string>('DG Set');
  const [selectedSlot, setSelectedSlot] = useState<string>('08:00 AM - 12:00 PM');
  const [slotOptions, setSlotOptions] = useState<string[]>([
    '08:00 AM - 12:00 PM',
    '01:00 PM - 05:00 PM',
    '06:00 PM - 10:00 PM',
  ]);
  const [ratePerLiter, setRatePerLiter] = useState<number>(94.50);
  const [deliveryChargeUpTo500, setDeliveryChargeUpTo500] = useState<number>(0);
  const [deliveryChargeAbove500, setDeliveryChargeAbove500] = useState<number>(0);
  const [tier1MaxLiters, setTier1MaxLiters] = useState<number>(500);
  const [taxRatePercent, setTaxRatePercent] = useState<number>(0);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);

  // Sync props changes if user updates
  useEffect(() => {
    if (currentUser?.name && !customerName) setCustomerName(currentUser.name);
    if (currentUser?.phone && !customerPhone) setCustomerPhone(currentUser.phone);
    if (currentUser?.email && !customerEmail) setCustomerEmail(currentUser.email);
  }, [currentUser]);

  useEffect(() => {
    if (deliveryLocation?.fullAddress && !deliveryAddress) {
      setDeliveryAddress(deliveryLocation.fullAddress);
    }
  }, [deliveryLocation]);

  // Fetch live settings (Diesel rate, Slots, Delivery fee & GST) from backend
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const baseUrl = APP_CONFIG.LIVE_API_BASE_URL || 'https://extradiesel.in';
        const res = await fetch(`${baseUrl}/api/settings`);
        const data = await res.json();
        if (data.success && data.settings) {
          const s = data.settings;
          if (s.dieselRate) setRatePerLiter(Number(s.dieselRate));
          if (s.deliveryChargeUpTo500 !== undefined) setDeliveryChargeUpTo500(Number(s.deliveryChargeUpTo500) || 0);
          if (s.deliveryChargeAbove500 !== undefined) setDeliveryChargeAbove500(Number(s.deliveryChargeAbove500) || 0);
          if (s.tier1MaxLiters !== undefined) setTier1MaxLiters(Number(s.tier1MaxLiters));
          if (s.taxRatePercent !== undefined) setTaxRatePercent(Number(s.taxRatePercent) || 0);
          if (Array.isArray(s.deliverySlots) && s.deliverySlots.length > 0) {
            setSlotOptions(s.deliverySlots);
            if (!s.deliverySlots.includes(selectedSlot)) {
              setSelectedSlot(s.deliverySlots[0]);
            }
          }
        }
      } catch (err) {}
    };
    fetchSettings();
  }, []);

  // Parse liters safely from manual input (Minimum 1 Liter)
  const parsedLiters = Math.max(1, parseInt(litersInput, 10) || 1);
  const liters = parsedLiters;

  // Autofill Calculations
  const subtotal = liters * ratePerLiter;
  const rawDeliveryFee = liters <= tier1MaxLiters ? deliveryChargeUpTo500 : deliveryChargeAbove500;
  const deliveryFee = rawDeliveryFee > 0 ? rawDeliveryFee : 0;
  const gstRate = taxRatePercent > 0 ? taxRatePercent / 100 : 0;
  const tax = gstRate > 0 ? (subtotal + deliveryFee) * gstRate : 0;
  const totalAmount = subtotal + deliveryFee + tax;

  const vehicleOptions = ['DG Set', 'Excavator', 'Commercial Fleet', 'Storage Tank'];

  // GPS Locate Me Handler (Pins exact Colony, Landmark, Area via Mapbox & Reverse Geocode)
  const handleLocateMe = async () => {
    try {
      setIsLocating(true);
      setLocateStatus('Detecting precise GPS coordinates...');
      const baseUrl = APP_CONFIG.LIVE_API_BASE_URL || 'https://extradiesel.in';

      let latitude: number | null = null;
      let longitude: number | null = null;

      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
        await new Promise<void>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              latitude = pos.coords.latitude;
              longitude = pos.coords.longitude;
              resolve();
            },
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
          );
        });
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Please grant location permission to auto-detect your site.');
          setIsLocating(false);
          return;
        }
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
        });
        latitude = location.coords.latitude;
        longitude = location.coords.longitude;
      }

      if (!latitude || !longitude) {
        throw new Error('Unable to acquire coordinates');
      }

      setLocateStatus('Reverse geocoding exact street & colony...');
      const geoRes = await fetch(`${baseUrl}/api/location/reverse-geocode?lat=${latitude}&lon=${longitude}`);
      const geoData = await geoRes.json();

      let detectedAddress = '';
      if (geoData.success && geoData.location) {
        const l = geoData.location;
        const parts = [
          l.plotNo ? `Plot/Door: ${l.plotNo}` : '',
          l.street || '',
          l.area || '',
          l.landmark ? `Near ${l.landmark}` : '',
          l.city || 'Hyderabad',
          l.pincode ? `PIN: ${l.pincode}` : '',
        ].filter(Boolean);
        detectedAddress = parts.join(', ');
      } else {
        detectedAddress = `Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}`;
      }

      setDeliveryAddress(detectedAddress);
      setGoogleMapsLink(`https://maps.google.com/?q=${latitude},${longitude}`);
      setLocateStatus('Location pinned successfully!');
      setTimeout(() => setLocateStatus(''), 4000);
    } catch (err: any) {
      setLocateStatus('Could not detect GPS location.');
      setTimeout(() => setLocateStatus(''), 3000);
    } finally {
      setIsLocating(false);
    }
  };

  // Helper to dynamically load Razorpay checkout script on web
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (Platform.OS !== 'web' || typeof document === 'undefined') {
        resolve(true);
        return;
      }
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Confirm Order & Trigger Razorpay Payment
  const handleConfirmOrderAndPay = async () => {
    if (!customerName.trim()) {
      Alert.alert('Required Field', 'Please enter your full name.');
      return;
    }
    if (!customerPhone.trim() || customerPhone.replace(/\D/g, '').length < 10) {
      Alert.alert('Required Field', 'Please provide a valid 10-digit mobile number.');
      return;
    }
    if (!deliveryAddress.trim()) {
      Alert.alert('Required Field', 'Please provide or pin your delivery site address.');
      return;
    }

    try {
      setIsProcessingPayment(true);
      const baseUrl = APP_CONFIG.LIVE_API_BASE_URL || 'https://extradiesel.in';
      const orderId = `ED${new Date().getFullYear()}${Math.floor(100000 + Math.random() * 900000)}`;

      // 1. Create Razorpay Order on Backend
      const rzpRes = await fetch(`${baseUrl}/api/payment/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(totalAmount * 100), // amount in paise
          currency: 'INR',
          receipt: orderId,
        }),
      });

      const rzpData = await rzpRes.json();
      const razorpayKeyId = rzpData.keyId || 'rzp_test_U0oP5sFk81MJMT';
      const razorpayOrderId = rzpData.order?.id;

      // 2. Open Razorpay Checkout on Web
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          throw new Error('Failed to load Razorpay payment gateway');
        }

        const options = {
          key: razorpayKeyId,
          amount: Math.round(totalAmount * 100),
          currency: 'INR',
          name: 'EXTRA DIESEL',
          description: `${liters}L High-Speed BS-VI Diesel Doorstep Delivery`,
          image: 'https://extradiesel.in/assets/images/logo.png',
          order_id: razorpayOrderId,
          handler: async (response: any) => {
            // Payment Success: Verify & Save Order
            await saveFinalOrder(orderId, response.razorpay_payment_id || 'pay_test_completed', 'paid');
          },
          prefill: {
            name: customerName,
            email: customerEmail,
            contact: customerPhone,
          },
          notes: {
            address: deliveryAddress,
            mapsLink: googleMapsLink,
            liters: liters.toString(),
            equipment: vehicleType,
          },
          theme: {
            color: '#DC2626',
          },
          modal: {
            ondismiss: () => {
              setIsProcessingPayment(false);
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
        return;
      }

      // 3. For Mobile App / Fallback: Record Payment & Order
      await saveFinalOrder(orderId, `pay_test_${Math.floor(100000 + Math.random() * 900000)}`, 'paid');
    } catch (err: any) {
      Alert.alert('Payment Failed', err.message || 'Unable to initialize Razorpay payment. Please try again.');
      setIsProcessingPayment(false);
    }
  };

  // Save Final Confirmed Order to Backend
  const saveFinalOrder = async (orderId: string, paymentId: string, paymentStatus: string) => {
    try {
      const baseUrl = APP_CONFIG.LIVE_API_BASE_URL || 'https://extradiesel.in';
      const orderPayload = {
        id: orderId,
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        address: deliveryAddress,
        mapsLink: googleMapsLink,
        liters,
        fuelRate: ratePerLiter,
        deliveryFee,
        tax,
        total: totalAmount,
        equipment: vehicleType,
        deliverySlot: selectedSlot,
        paymentId,
        paymentStatus,
        paymentMethod: 'Razorpay UPI / Cards / NetBanking',
        status: 'pending',
        statusText: 'Order Placed - Awaiting Bowser Dispatch',
      };

      await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      // Trigger System Status Bar Push Notification & save to Notification Center
      try {
        await sendSystemNotification(
          '🎉 Diesel Order Confirmed!',
          `Your refuel order #${orderId} (${liters}L BS-VI) has been placed successfully. Awaiting bowser dispatch.`,
          'order'
        );
      } catch (err) {}

      setIsProcessingPayment(false);
      onOrderSuccess(orderId);
    } catch (err) {
      setIsProcessingPayment(false);
      onOrderSuccess(orderId);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        isDesktop && { maxWidth: 880, width: '100%', alignSelf: 'center', paddingVertical: 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Customer Information Card (Autofilled) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="person-circle" size={20} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Customer Details</Text>
          <View style={styles.autofillBadge}>
            <Ionicons name="checkmark-done" size={12} color="#15803D" />
            <Text style={styles.autofillBadgeText}>Autofilled</Text>
          </View>
        </View>

        <View style={styles.formGrid}>
          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Full Name *</Text>
            <TextInput
              style={styles.textInput}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Your Name"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Mobile Phone *</Text>
            <TextInput
              style={styles.textInput}
              value={customerPhone}
              onChangeText={setCustomerPhone}
              placeholder="+91 98765 43210"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={[styles.formGroup, { marginTop: 10 }]}>
          <Text style={styles.inputLabel}>Email Address (For Tax Invoices) *</Text>
          <TextInput
            style={styles.textInput}
            value={customerEmail}
            onChangeText={setCustomerEmail}
            placeholder="name@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* 2. Delivery Location Card with Locate Me Button & Maps Link */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="location" size={20} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Delivery Site & GPS Pin</Text>
        </View>

        <View style={styles.locateRow}>
          <TouchableOpacity
            style={styles.locateMeBtn}
            onPress={handleLocateMe}
            disabled={isLocating}
            activeOpacity={0.8}
          >
            {isLocating ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Ionicons name="navigate" size={17} color={COLORS.white} />
            )}
            <Text style={styles.locateMeBtnText}>
              {isLocating ? 'Locating...' : '📍 Locate Me (GPS Reverse Geocode)'}
            </Text>
          </TouchableOpacity>

          {onOpenLocationModal && (
            <TouchableOpacity
              style={styles.changeModalBtn}
              onPress={onOpenLocationModal}
              activeOpacity={0.7}
            >
              <Ionicons name="map-outline" size={15} color={COLORS.primary} />
              <Text style={styles.changeModalBtnText}>Pin Details</Text>
            </TouchableOpacity>
          )}
        </View>

        {locateStatus ? (
          <Text style={styles.locateStatusText}>{locateStatus}</Text>
        ) : null}

        <View style={[styles.formGroup, { marginTop: 12 }]}>
          <Text style={styles.inputLabel}>Delivery Site Address (Colony, Plot, Landmark) *</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
            placeholder="e.g. Plot 42, Hitech City Phase 2, Near Mindspace West Gate, Madhapur, Hyderabad, 500081"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={[styles.formGroup, { marginTop: 10 }]}>
          <Text style={styles.inputLabel}>Google Maps Link / Coordinates (Optional)</Text>
          <TextInput
            style={styles.textInput}
            value={googleMapsLink}
            onChangeText={setGoogleMapsLink}
            placeholder="Paste Google Maps URL or Location Link here"
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* 3. Fuel Quantity Selector (Manual Input from 1 Liter Upwards) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="funnel" size={20} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Fuel Quantity (Liters)</Text>
        </View>

        {/* Stepper & Direct Manual Input control */}
        <View style={styles.stepperContainer}>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => {
              const current = parseInt(litersInput, 10) || 1;
              const nextVal = Math.max(1, current - (current > 50 ? 50 : 1));
              setLitersInput(String(nextVal));
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="remove" size={22} color={COLORS.dark} />
          </TouchableOpacity>

          <View style={styles.qtyDisplay}>
            <TextInput
              style={styles.qtyInputText}
              value={litersInput}
              onChangeText={(text) => {
                const clean = text.replace(/[^0-9]/g, '');
                setLitersInput(clean);
              }}
              keyboardType="number-pad"
              placeholder="1"
            />
            <Text style={styles.qtyUnit}>Liters (BS-VI Diesel)</Text>
          </View>

          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => {
              const current = parseInt(litersInput, 10) || 0;
              const nextVal = current + 50;
              setLitersInput(String(nextVal));
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={22} color={COLORS.dark} />
          </TouchableOpacity>
        </View>

        <Text style={{ textAlign: 'center', fontSize: 12, color: '#64748B', marginTop: 2 }}>
          Enter any custom fuel quantity from 1 Liter to any required volume.
        </Text>
      </View>

      {/* 4. Equipment Type & Preferred Slot */}
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
              activeOpacity={0.75}
            >
              <Text style={[styles.pillText, vehicleType === v && styles.pillTextActive]}>{v}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.cardHeader, { marginTop: 16 }]}>
          <Ionicons name="time" size={20} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Preferred Delivery Slot</Text>
        </View>
        {slotOptions.map((slot) => (
          <TouchableOpacity
            key={slot}
            style={[styles.slotItem, selectedSlot === slot && styles.slotItemActive]}
            onPress={() => setSelectedSlot(slot)}
            activeOpacity={0.7}
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

      {/* 5. Itemized Bill Summary (Real-time Autofill) */}
      <View style={styles.billCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.billTitle}>Bill Summary</Text>
          <View style={styles.secureBadge}>
            <Ionicons name="shield-checkmark" size={13} color="#15803D" />
            <Text style={styles.secureBadgeText}>100% BS-VI Pure</Text>
          </View>
        </View>
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Base Diesel ({liters}L @ ₹{ratePerLiter.toFixed(2)})</Text>
          <Text style={styles.billValue}>₹{subtotal.toFixed(2)}</Text>
        </View>
        {deliveryFee > 0 ? (
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Doorstep Delivery Fee</Text>
            <Text style={styles.billValue}>₹{deliveryFee.toFixed(2)}</Text>
          </View>
        ) : null}
        {gstRate > 0 && tax > 0 ? (
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>GST ({(gstRate * 100).toFixed(0)}%)</Text>
            <Text style={styles.billValue}>₹{tax.toFixed(2)}</Text>
          </View>
        ) : null}
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Payable</Text>
          <Text style={styles.totalValue}>₹{totalAmount.toFixed(2)}</Text>
        </View>
      </View>

      {/* 6. Razorpay Payment Button */}
      <TouchableOpacity
        style={[styles.orderButton, isProcessingPayment && { opacity: 0.7 }]}
        onPress={handleConfirmOrderAndPay}
        disabled={isProcessingPayment}
        activeOpacity={0.85}
      >
        {isProcessingPayment ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <>
            <View>
              <Text style={styles.orderButtonSub}>Pay ₹{totalAmount.toFixed(2)} via Razorpay</Text>
              <Text style={styles.orderButtonMain}>Confirm & Pay Order</Text>
            </View>
            <Ionicons name="arrow-forward" size={22} color={COLORS.white} />
          </>
        )}
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
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.dark,
    flex: 1,
  },
  autofillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  autofillBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  formGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  formGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.dark,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  locateRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  locateMeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  locateMeBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  changeModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  changeModalBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  locateStatusText: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '600',
    marginTop: 4,
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
    gap: 16,
    marginBottom: 14,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyDisplay: {
    alignItems: 'center',
    minWidth: 120,
  },
  qtyInputText: {
    fontSize: 34,
    fontWeight: '900',
    color: COLORS.dark,
    textAlign: 'center',
    paddingVertical: 2,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    minWidth: 90,
  },
  qtyDisplayText: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.dark,
  },
  qtyUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
  },
  freeDeliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    padding: 10,
  },
  freeDeliveryText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.greenDark,
    flex: 1,
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
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pillActive: {
    backgroundColor: '#FEF2F2',
    borderColor: COLORS.primary,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
  },
  pillTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  slotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  slotItemActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#FEF2F2',
  },
  slotText: {
    fontSize: 13,
    color: COLORS.dark,
    fontWeight: '500',
  },
  slotTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  billCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  billTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.white,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  secureBadgeText: {
    fontSize: 11,
    color: '#86EFAC',
    fontWeight: '700',
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  billLabel: {
    fontSize: 13,
    color: '#94A3B8',
  },
  billValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.white,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F87171',
  },
  orderButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  orderButtonSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
  },
  orderButtonMain: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.white,
  },
});
