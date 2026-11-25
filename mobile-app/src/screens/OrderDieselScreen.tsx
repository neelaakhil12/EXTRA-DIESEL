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
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  deliveryLocation?: { fullAddress: string; shortAddress?: string; locationLink?: string };
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

  // Step 1: 'config' (Fuel, Equipment & Slot)
  // Step 2: 'checkout' (Delivery Site, Customer Details, Bill Summary & Razorpay Pay Now)
  const [orderStep, setOrderStep] = useState<'config' | 'checkout'>('config');

  // Customer Contact Details (Autofilled from currentUser / AsyncStorage / backend)
  const [customerName, setCustomerName] = useState<string>(currentUser?.name || '');
  const [customerPhone, setCustomerPhone] = useState<string>(currentUser?.phone || '');
  const [customerEmail, setCustomerEmail] = useState<string>(currentUser?.email || '');

  // Delivery Address & Google Maps link
  const [deliveryAddress, setDeliveryAddress] = useState<string>(
    deliveryLocation?.fullAddress || ''
  );
  const [googleMapsLink, setGoogleMapsLink] = useState<string>(
    deliveryLocation?.locationLink || ''
  );
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

  // Load and sync customer contact details and fix phone autofill
  useEffect(() => {
    const loadContactInfo = async () => {
      try {
        if (currentUser?.name && !customerName) setCustomerName(currentUser.name);
        if (currentUser?.email && !customerEmail) setCustomerEmail(currentUser.email);

        let phone = currentUser?.phone || customerPhone;

        // Fallback 1: Local Storage
        if (!phone) {
          const storedPhone = await AsyncStorage.getItem('ed_user_phone');
          if (storedPhone) phone = storedPhone;
        }

        // Fallback 2: Backend user profile API
        if (!phone && (currentUser?.email || customerEmail)) {
          const baseUrl = APP_CONFIG.LIVE_API_BASE_URL || 'https://extradiesel.in';
          const emailQuery = currentUser?.email || customerEmail;
          const res = await fetch(`${baseUrl}/api/user/profile?email=${encodeURIComponent(emailQuery)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.user?.phone) {
              phone = data.user.phone;
            }
          }
        }

        if (phone) {
          setCustomerPhone(phone);
          await AsyncStorage.setItem('ed_user_phone', phone);
        }
      } catch (err) {
        console.warn('Error loading contact info:', err);
      }
    };

    loadContactInfo();
  }, [currentUser]);

  // Sync delivery location changes
  useEffect(() => {
    if (deliveryLocation?.fullAddress) {
      setDeliveryAddress(deliveryLocation.fullAddress);
    }
    if (deliveryLocation?.locationLink) {
      setGoogleMapsLink(deliveryLocation.locationLink);
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

  // Save phone number to persistent storage whenever typed
  const handlePhoneChange = (text: string) => {
    setCustomerPhone(text);
    AsyncStorage.setItem('ed_user_phone', text).catch(() => {});
  };

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
  const quickLiterPresets = [100, 200, 500, 1000];

  // GPS Locate Me Handler
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

      setLocateStatus('Reverse geocoding exact street & landmark...');
      const geoRes = await fetch(`${baseUrl}/api/location/reverse-geocode?lat=${latitude}&lon=${longitude}`);
      const geoData = await geoRes.json();

      let detectedAddress = '';
      if (geoData.success && geoData.location) {
        detectedAddress = geoData.location.fullAddress || geoData.location.area || '';
      } else {
        detectedAddress = `GPS Location (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`;
      }

      setDeliveryAddress(detectedAddress);
      setGoogleMapsLink(`https://maps.google.com/?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`);
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

      // 3. For Mobile App: Record Payment & Order
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

      // Save phone number persistently
      if (customerPhone) {
        AsyncStorage.setItem('ed_user_phone', customerPhone).catch(() => {});
      }

      // Trigger System Status Bar Push Notification
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
      keyboardShouldPersistTaps="handled"
    >
      {/* ========================================================================= */}
      {/* STEP 1: CONFIGURE ORDER (Fuel Quantity, Equipment & Preferred Slot) */}
      {/* ========================================================================= */}
      {orderStep === 'config' ? (
        <View>
          {/* Rate & Compliance Strip */}
          <View style={styles.rateCard}>
            <View style={styles.rateCardLeft}>
              <Ionicons name="flame" size={22} color="#DC2626" />
              <View>
                <Text style={styles.rateCardTitle}>Today's Live Rate (Hyderabad)</Text>
                <Text style={styles.rateCardSub}>BS-VI High Speed Doorstep Bowser Fuel</Text>
              </View>
            </View>
            <View style={styles.rateBadge}>
              <Text style={styles.rateBadgeText}>₹{ratePerLiter.toFixed(2)} / L</Text>
            </View>
          </View>

          {/* 1. Fuel Quantity Selector */}
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
                  placeholderTextColor="#94A3B8"
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

            {/* Quick Presets */}
            <View style={styles.presetRow}>
              {quickLiterPresets.map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={[styles.presetBtn, liters === preset && styles.presetBtnActive]}
                  onPress={() => setLitersInput(String(preset))}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.presetBtnText, liters === preset && styles.presetBtnTextActive]}>
                    {preset}L
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.qtyHelpText}>
              Enter any custom fuel quantity from 1 Liter upwards for direct bowser dispensing.
            </Text>
          </View>

          {/* 2. Equipment / Vehicle Type */}
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

            {/* 3. Preferred Delivery Slot */}
            <View style={[styles.cardHeader, { marginTop: 18 }]}>
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

          {/* Proceed Button */}
          <TouchableOpacity
            style={styles.proceedBtn}
            onPress={() => setOrderStep('checkout')}
            activeOpacity={0.88}
          >
            <View>
              <Text style={styles.proceedBtnSub}>{liters} Liters • Est. ₹{subtotal.toLocaleString('en-IN')}</Text>
              <Text style={styles.proceedBtnMain}>Proceed to Checkout</Text>
            </View>
            <Ionicons name="arrow-forward" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      ) : (
        /* ========================================================================= */
        /* STEP 2: CHECKOUT PAGE (Site Location, Customer Info, Bill Summary & Pay) */
        /* ========================================================================= */
        <View>
          {/* Back & Order Summary Navigation Bar */}
          <View style={styles.checkoutNavHeader}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setOrderStep('config')}
              activeOpacity={0.75}
            >
              <Ionicons name="arrow-back" size={18} color="#0F172A" />
              <Text style={styles.backBtnText}>Change Quantity / Slot</Text>
            </TouchableOpacity>

            <View style={styles.summaryBadge}>
              <Text style={styles.summaryBadgeText}>
                {liters}L • {vehicleType}
              </Text>
            </View>
          </View>

          {/* 1. Delivery Site & GPS Pin Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="location" size={20} color={COLORS.primary} />
              <Text style={styles.cardTitle}>Delivery Site & GPS Pin</Text>
              {deliveryAddress ? (
                <View style={styles.pinnedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#059669" />
                  <Text style={styles.pinnedBadgeText}>Pinned</Text>
                </View>
              ) : null}
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
                  {isLocating ? 'Locating...' : 'Use Current Location (GPS)'}
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
              <Text style={styles.inputLabel}>Delivery Site Address *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
                placeholder="Enter or GPS-pin site address (Door/Plot, Road, Landmark, Area, City, Pincode)"
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={[styles.formGroup, { marginTop: 10 }]}>
              <Text style={styles.inputLabel}>GPS Location Link (Google Maps)</Text>
              <TextInput
                style={styles.textInput}
                value={googleMapsLink}
                onChangeText={setGoogleMapsLink}
                placeholder="https://maps.google.com/?q=lat,lon"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* 2. Customer Contact Details (Autofilled) */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="person-circle" size={20} color={COLORS.primary} />
              <Text style={styles.cardTitle}>Customer Details</Text>
              {customerPhone ? (
                <View style={styles.autofillBadge}>
                  <Ionicons name="checkmark-done" size={12} color="#15803D" />
                  <Text style={styles.autofillBadgeText}>Autofilled</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.formGrid}>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={customerName}
                  onChangeText={setCustomerName}
                  placeholder="Your Full Name"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Mobile Phone *</Text>
                <TextInput
                  style={styles.textInput}
                  value={customerPhone}
                  onChangeText={handlePhoneChange}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#94A3B8"
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
                placeholder="name@example.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* 3. Itemized Bill Summary */}
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

          {/* 4. Pay Now via Razorpay Button */}
          <TouchableOpacity
            style={[styles.orderButton, isProcessingPayment && { opacity: 0.7 }]}
            onPress={handleConfirmOrderAndPay}
            disabled={isProcessingPayment}
            activeOpacity={0.88}
          >
            {isProcessingPayment ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <View>
                  <Text style={styles.orderButtonSub}>Total: ₹{totalAmount.toFixed(2)} (Incl. Taxes)</Text>
                  <Text style={styles.orderButtonMain}>Pay Now via Razorpay</Text>
                </View>
                <Ionicons name="arrow-forward" size={22} color={COLORS.white} />
              </>
            )}
          </TouchableOpacity>
        </View>
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
    paddingBottom: Platform.OS === 'android' ? 100 : 85,
  },
  rateCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  rateCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  rateCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991B1B',
  },
  rateCardSub: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 1,
  },
  rateBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  rateBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
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
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  pinnedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 8,
    marginVertical: 4,
  },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  qtyDisplay: {
    alignItems: 'center',
    flex: 1,
  },
  qtyInputText: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.dark,
    textAlign: 'center',
    minWidth: 120,
    paddingVertical: 0,
  },
  qtyUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  presetBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetBtnActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#DC2626',
  },
  presetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  presetBtnTextActive: {
    color: '#DC2626',
    fontWeight: '800',
  },
  qtyHelpText: {
    textAlign: 'center',
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 10,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    fontWeight: '800',
  },
  slotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
  },
  slotItemActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#FEF2F2',
  },
  slotText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.dark,
  },
  slotTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  proceedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#DC2626',
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 4,
    marginBottom: 20,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  proceedBtnMain: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  proceedBtnSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
    marginBottom: 2,
  },
  checkoutNavHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  backBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  summaryBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  locateRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  locateMeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  locateMeBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.white,
  },
  changeModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  changeModalBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.primary,
  },
  locateStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
    marginVertical: 4,
  },
  formGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  formGroup: {
    flex: 1,
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 5,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    color: '#0F172A',
    fontWeight: '500',
  },
  textArea: {
    height: 75,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  billCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  billTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#052e16',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#15803D',
  },
  secureBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#4ADE80',
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
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
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
    color: '#FFFFFF',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F87171',
  },
  orderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#DC2626',
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderRadius: 14,
    marginBottom: 20,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  orderButtonMain: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  orderButtonSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
    marginBottom: 2,
  },
});
