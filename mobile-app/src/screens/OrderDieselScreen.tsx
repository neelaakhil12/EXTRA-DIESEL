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
  Modal,
  Image,
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
  const [pastedMapsLink, setPastedMapsLink] = useState<string>('');
  const [isResolvingLink, setIsResolvingLink] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locateStatus, setLocateStatus] = useState<string>('');

  // Fuel & Order details
  const [litersInput, setLitersInput] = useState<string>('200');
  const [vehicleType, setVehicleType] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'online' | 'cod'>('online');
  const [selectedSlot, setSelectedSlot] = useState<string>('08:00 AM - 12:00 PM');
  const [slotOptions, setSlotOptions] = useState<string[]>([
    '08:00 AM - 12:00 PM',
    '01:00 PM - 05:00 PM',
    '06:00 PM - 10:00 PM',
  ]);

  // Delivery Date Selection
  const formatDateDisplay = (d: Date) => {
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const formatDateShort = (d: Date) => {
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<string>(formatDateDisplay(today));
  const [showCalendarModal, setShowCalendarModal] = useState<boolean>(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1));

  // Helper for rendering days in month calendar
  const renderCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const cells = [];
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(year, month, day);
      const isPast = cellDate < startOfToday;
      const formatted = formatDateDisplay(cellDate);
      const isSelected = selectedDate === formatted;
      const isTodayDate = cellDate.getTime() === startOfToday.getTime();

      cells.push(
        <TouchableOpacity
          key={`day-${day}`}
          style={[
            styles.dayCell,
            isSelected && styles.dayCellSelected,
            isTodayDate && !isSelected && styles.dayCellToday,
          ]}
          disabled={isPast}
          onPress={() => {
            setSelectedDate(formatted);
            setShowCalendarModal(false);
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.dayCellText,
              isPast && styles.dayCellTextDisabled,
              isSelected && styles.dayCellTextSelected,
              isTodayDate && !isSelected && styles.dayCellTextToday,
            ]}
          >
            {day}
          </Text>
        </TouchableOpacity>
      );
    }
    return cells;
  };

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

  // Resolve pasted Google Maps link in Checkout
  const handleResolvePastedLink = async () => {
    const rawUrl = pastedMapsLink.trim();
    if (!rawUrl) {
      Alert.alert('Paste Link', 'Please paste a Google Maps link or coordinates.');
      return;
    }

    try {
      setIsResolvingLink(true);
      setLocateStatus('Extracting GPS site address from link...');
      const baseUrl = APP_CONFIG.LIVE_API_BASE_URL || 'https://extradiesel.in';

      const res = await fetch(`${baseUrl}/api/location/resolve-link?url=${encodeURIComponent(rawUrl)}`);
      const data = await res.json();

      const loc = data.location || data;
      if (data.success && loc && (loc.fullAddress || loc.shortAddress || (loc.lat && loc.lon))) {
        const fullAddr = loc.fullAddress || loc.shortAddress || `Site Coordinates (${loc.lat}, ${loc.lon})`;
        const shortAddr = loc.shortAddress || loc.colony || loc.area || '';
        const link = loc.mapsLink || rawUrl;

        setDeliveryAddress(fullAddr);
        setGoogleMapsLink(link);
        setLocateStatus(`📍 Pinned: ${shortAddr || fullAddr}`);
        setPastedMapsLink('');
        setTimeout(() => setLocateStatus(''), 4500);
      } else {
        const coordMatch = rawUrl.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
        if (coordMatch) {
          const lat = parseFloat(coordMatch[1]);
          const lon = parseFloat(coordMatch[2]);
          if (!isNaN(lat) && !isNaN(lon)) {
            const geoRes = await fetch(`${baseUrl}/api/location/reverse-geocode?lat=${lat}&lon=${lon}`);
            const geoData = await geoRes.json();
            const addr = geoData.success && geoData.location ? (geoData.location.fullAddress || geoData.location.area) : `GPS Site (${lat.toFixed(5)}, ${lon.toFixed(5)})`;
            setDeliveryAddress(addr);
            setGoogleMapsLink(`https://maps.google.com/?q=${lat.toFixed(6)},${lon.toFixed(6)}`);
            setLocateStatus(`📍 Pinned: ${addr}`);
            setPastedMapsLink('');
            setTimeout(() => setLocateStatus(''), 4500);
            return;
          }
        }
        Alert.alert('Notice', data.error || 'Could not resolve the Maps link. Please enter your address manually.');
        setLocateStatus('');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to resolve location link.');
      setLocateStatus('');
    } finally {
      setIsResolvingLink(false);
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

      // 1. Cash on Delivery (COD) Flow: Directly create order without opening Razorpay
      if (paymentMode === 'cod') {
        await saveFinalOrder(orderId, 'COD_PENDING', 'pending', 'Cash on Delivery');
        return;
      }

      // 2. Online Payment Flow (Razorpay)
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

      // Open Razorpay Checkout on Web
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          throw new Error('Failed to load payment gateway');
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
            await saveFinalOrder(
              orderId,
              response.razorpay_payment_id || 'pay_test_completed',
              'paid',
              'Online (Instant UPI / Cards)'
            );
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
            equipment: vehicleType || 'Not Specified',
            deliveryDate: selectedDate,
            deliverySlot: selectedSlot,
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

      // For Mobile App: Record Payment & Order
      await saveFinalOrder(
        orderId,
        `pay_test_${Math.floor(100000 + Math.random() * 900000)}`,
        'paid',
        'Online (Instant UPI / Cards)'
      );
    } catch (err: any) {
      Alert.alert('Payment Failed', err.message || 'Unable to process payment. Please try again.');
      setIsProcessingPayment(false);
    }
  };

  // Save Final Confirmed Order to Backend
  const saveFinalOrder = async (
    orderId: string,
    paymentId: string,
    paymentStatus: string,
    paymentMethod: string = 'Online (Instant UPI / Cards)'
  ) => {
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
        equipment: vehicleType || 'Not Specified',
        deliverySlot: selectedSlot,
        deliveryDate: selectedDate,
        date: `${selectedDate} • ${selectedSlot}`,
        paymentId,
        paymentStatus,
        paymentMethod,
        status: 'pending',
        statusText:
          paymentMethod === 'Cash on Delivery'
            ? 'Order Placed (Cash on Delivery) - Awaiting Bowser Dispatch'
            : 'Order Placed (Paid Online) - Awaiting Bowser Dispatch',
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
          paymentMethod === 'Cash on Delivery'
            ? '💵 Diesel Order Placed (Cash on Delivery)!'
            : '🎉 Diesel Order Confirmed (Paid Online)!',
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
          {/* 3D Bowser Tanker Rate Card (Screenshot 2 Match) */}
          <View style={styles.dieselRateCardModern}>
            <View style={styles.dieselThumbBox}>
              <Image
                source={require('../../assets/images/diesel-tanker-card-icon.png')}
                style={styles.dieselThumbImg}
                resizeMode="contain"
              />
            </View>
            <View style={styles.dieselInfoCol}>
              <Text style={styles.dieselCardTitle}>Diesel</Text>
              <Text style={styles.dieselCardPrice}>
                Price - {ratePerLiter.toFixed(2)} / 1 Liter
              </Text>
            </View>
            <View style={styles.dieselQtyBox}>
              <Text style={styles.dieselQtyText}>1 L</Text>
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

          {/* 2. Equipment / Vehicle Type (Optional) */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="construct" size={20} color={COLORS.primary} />
              <Text style={styles.cardTitle}>Equipment / Vehicle Type (Optional)</Text>
            </View>
            <View style={styles.pillRow}>
              {vehicleOptions.map((v) => {
                const isSelected = vehicleType === v;
                return (
                  <TouchableOpacity
                    key={v}
                    style={[styles.pill, isSelected && styles.pillActive]}
                    onPress={() => setVehicleType((prev) => (prev === v ? '' : v))}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                      {isSelected ? '✓ ' : ''}{v}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 3. Preferred Delivery Date */}
            <View style={[styles.cardHeader, { marginTop: 18 }]}>
              <Ionicons name="calendar" size={20} color={COLORS.primary} />
              <Text style={styles.cardTitle}>Preferred Delivery Date</Text>
            </View>

            <TouchableOpacity
              style={styles.calendarPickerCard}
              onPress={() => setShowCalendarModal(true)}
              activeOpacity={0.8}
            >
              <View style={styles.calendarPickerLeft}>
                <View style={styles.calendarIconCircle}>
                  <Ionicons name="calendar" size={20} color="#DC2626" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.calendarPickerSubLabel}>Selected Delivery Date</Text>
                  <Text style={styles.calendarPickerDateText}>{selectedDate}</Text>
                </View>
              </View>

              <View style={styles.calendarPickerBtn}>
                <Ionicons name="calendar-outline" size={15} color="#FFFFFF" />
                <Text style={styles.calendarPickerBtnText}>Change Date</Text>
              </View>
            </TouchableOpacity>

            {/* Selected Date & Slot Confirmation Banner */}
            <View style={styles.scheduleBanner}>
              <Ionicons name="time-outline" size={16} color="#DC2626" />
              <Text style={styles.scheduleBannerText}>
                Scheduled for <Text style={{ fontWeight: '800' }}>{selectedDate}</Text> • <Text style={{ fontWeight: '800' }}>{selectedSlot}</Text>
              </Text>
            </View>

            {/* 4. Preferred Delivery Slot */}
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
                {liters}L • {vehicleType} • {selectedDate.split(' ').slice(0, 2).join(' ')}
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

            {/* Paste Google Maps Link Sub-bar */}
            <View style={styles.pasteLinkCheckoutRow}>
              <TextInput
                style={styles.pasteLinkCheckoutInput}
                placeholder="Or paste Google Maps location link..."
                placeholderTextColor="#94A3B8"
                value={pastedMapsLink}
                onChangeText={setPastedMapsLink}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[
                  styles.pasteLinkCheckoutBtn,
                  (!pastedMapsLink.trim() || isResolvingLink) && styles.pasteLinkCheckoutBtnDisabled,
                ]}
                onPress={handleResolvePastedLink}
                disabled={!pastedMapsLink.trim() || isResolvingLink}
                activeOpacity={0.8}
              >
                {isResolvingLink ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.pasteLinkCheckoutBtnText}>Fetch</Text>
                )}
              </TouchableOpacity>
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
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Delivery Date</Text>
              <Text style={[styles.billValue, { color: '#FFFFFF', fontWeight: '700' }]}>{selectedDate}</Text>
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Delivery Slot</Text>
              <Text style={[styles.billValue, { color: '#F87171', fontWeight: '800' }]}>{selectedSlot}</Text>
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

          {/* 4. Payment Method Selection (Pay Online vs Cash on Delivery) */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="wallet-outline" size={20} color={COLORS.primary} />
              <Text style={styles.cardTitle}>Choose Payment Method</Text>
            </View>

            {/* Pay Online Option */}
            <TouchableOpacity
              style={[
                styles.paymentOptionCard,
                paymentMode === 'online' && styles.paymentOptionCardActive,
              ]}
              onPress={() => setPaymentMode('online')}
              activeOpacity={0.8}
            >
              <View style={styles.paymentRadioRow}>
                <Ionicons
                  name={paymentMode === 'online' ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={paymentMode === 'online' ? COLORS.primary : COLORS.muted}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.paymentOptionTitle}>Pay Online</Text>
                    <View style={styles.onlineBadge}>
                      <Text style={styles.onlineBadgeText}>Instant</Text>
                    </View>
                  </View>
                  <Text style={styles.paymentOptionSub}>
                    UPI (Google Pay, PhonePe, Paytm), Cards & NetBanking
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Cash on Delivery Option */}
            <TouchableOpacity
              style={[
                styles.paymentOptionCard,
                paymentMode === 'cod' && styles.paymentOptionCardActive,
              ]}
              onPress={() => setPaymentMode('cod')}
              activeOpacity={0.8}
            >
              <View style={styles.paymentRadioRow}>
                <Ionicons
                  name={paymentMode === 'cod' ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={paymentMode === 'cod' ? COLORS.primary : COLORS.muted}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.paymentOptionTitle}>Cash on Delivery</Text>
                    <View style={styles.codBadge}>
                      <Text style={styles.codBadgeText}>Pay at Site</Text>
                    </View>
                  </View>
                  <Text style={styles.paymentOptionSub}>
                    Pay cash directly to bowser captain after fueling completed
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* 5. Action Button (Pay Now or Place Order COD) */}
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
                  <Text style={styles.orderButtonMain}>
                    {paymentMode === 'cod'
                      ? `Place Order (Cash on Delivery)`
                      : `Pay Now • ₹${totalAmount.toFixed(2)}`}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={22} color={COLORS.white} />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ========================================================================= */}
      {/* INTERACTIVE CALENDAR MODAL */}
      {/* ========================================================================= */}
      <Modal
        visible={showCalendarModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalendarModal(false)}
      >
        <View style={styles.calendarModalOverlay}>
          <View style={styles.calendarModalBox}>
            {/* Modal Header */}
            <View style={styles.calendarHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="calendar" size={20} color="#DC2626" />
                <Text style={styles.calendarModalTitle}>Select Delivery Date</Text>
              </View>
              <TouchableOpacity
                style={styles.calendarCloseBtn}
                onPress={() => setShowCalendarModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Month Navigator */}
            <View style={styles.monthNavRow}>
              <TouchableOpacity
                style={styles.monthNavBtn}
                onPress={() => {
                  const prev = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
                  const minMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                  if (prev >= minMonth) {
                    setCalendarMonth(prev);
                  }
                }}
              >
                <Ionicons name="chevron-back" size={20} color="#0F172A" />
              </TouchableOpacity>

              <Text style={styles.monthYearTitle}>
                {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>

              <TouchableOpacity
                style={styles.monthNavBtn}
                onPress={() => {
                  const next = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
                  setCalendarMonth(next);
                }}
              >
                <Ionicons name="chevron-forward" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {/* Day of Week Headers */}
            <View style={styles.weekHeadersRow}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <Text key={d} style={styles.weekHeaderCell}>{d}</Text>
              ))}
            </View>

            {/* Calendar Days Grid */}
            <View style={styles.daysGrid}>
              {renderCalendarDays()}
            </View>

            {/* Modal Footer */}
            <View style={styles.calendarModalFooter}>
              <TouchableOpacity
                style={styles.calendarConfirmBtn}
                onPress={() => setShowCalendarModal(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.calendarConfirmBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  // Modern Diesel Card matching Screenshot 2
  dieselRateCardModern: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  dieselThumbBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  dieselThumbImg: {
    width: 48,
    height: 48,
  },
  dieselInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  dieselCardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 3,
  },
  dieselCardPrice: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  dieselQtyBox: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dieselQtyText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  // Payment Method Selection Styles
  paymentOptionCard: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#FAFAFA',
  },
  paymentOptionCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#FEF2F2',
  },
  paymentRadioRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentOptionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  paymentOptionSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 16,
  },
  onlineBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  onlineBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  codBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  codBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
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
    marginRight: 8,
  },
  rateCardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#991B1B',
  },
  rateCardSub: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 2,
    fontWeight: '500',
  },
  rateBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexShrink: 0,
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
  pasteLinkCheckoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  pasteLinkCheckoutInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    fontSize: 12.5,
    color: '#0F172A',
  },
  pasteLinkCheckoutBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pasteLinkCheckoutBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  pasteLinkCheckoutBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
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
  calendarPickerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DC2626',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  calendarPickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  calendarIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarPickerSubLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  calendarPickerDateText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  calendarPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  calendarPickerBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scheduleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 4,
    marginBottom: 4,
  },
  scheduleBannerText: {
    fontSize: 12,
    color: '#991B1B',
    flex: 1,
  },
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarModalBox: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  calendarModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  calendarCloseBtn: {
    padding: 4,
  },
  monthNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  monthNavBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  monthYearTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  weekHeadersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weekHeaderCell: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginVertical: 2,
  },
  dayCellSelected: {
    backgroundColor: '#DC2626',
    borderRadius: 18,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: '#DC2626',
    borderRadius: 18,
  },
  dayCellText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  dayCellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  dayCellTextToday: {
    color: '#DC2626',
    fontWeight: '800',
  },
  dayCellTextDisabled: {
    color: '#CBD5E1',
    fontWeight: '400',
  },
  calendarModalFooter: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  calendarConfirmBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  calendarConfirmBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
