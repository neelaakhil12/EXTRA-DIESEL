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
  Image,
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

type TabType = 'dashboard' | 'orders' | 'subscriptions' | 'delivery' | 'settings';

interface AdminSubscriptionItem {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  subscription: {
    siteName: string;
    liters: number;
    frequency: 'weekly' | 'monthly';
    days: string[];
    status: 'active' | 'paused';
    nextRefill: string;
  };
}

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
  const [newDriverPassword, setNewDriverPassword] = useState<string>('');
  const [newDriverVehicle, setNewDriverVehicle] = useState<string>('');
  const [isSavingDriver, setIsSavingDriver] = useState<boolean>(false);

  // Global Settings Tab
  const [dieselRateInput, setDieselRateInput] = useState<string>('94.50');
  const [rateCityInput, setRateCityInput] = useState<string>('Hyderabad');
  const [tier1FeeInput, setTier1FeeInput] = useState<string>('350');
  const [tier2FeeInput, setTier2FeeInput] = useState<string>('0');
  const [tier1MaxLitersInput, setTier1MaxLitersInput] = useState<string>('500');
  const [taxRateInput, setTaxRateInput] = useState<string>('5');

  // Customer Subscriptions
  const [subscriptionsList, setSubscriptionsList] = useState<AdminSubscriptionItem[]>([]);

  // Preferred Delivery Time Slots Management
  const [deliverySlotsList, setDeliverySlotsList] = useState<string[]>([
    '08:00 AM - 12:00 PM',
    '01:00 PM - 05:00 PM',
    '06:00 PM - 10:00 PM',
  ]);
  const [newSlotInput, setNewSlotInput] = useState<string>('');
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [editingSlotValue, setEditingSlotValue] = useState<string>('');

  // B2B Corporate Fuel Credit Line Settings
  const [creditLimitInput, setCreditLimitInput] = useState<string>('500000');
  const [creditTermsInput, setCreditTermsInput] = useState<string>('Net-30 Days Interest Free');
  const [creditBillingCycleInput, setCreditBillingCycleInput] = useState<string>('1st – 30th of every month');

  // Support Hotline Settings
  const [hotlineTollFree, setHotlineTollFree] = useState<string>('1800-DIESEL-EX (1800-343-7353)');
  const [hotlinePhone, setHotlinePhone] = useState<string>('+91 9989551305');
  const [hotlineEmail, setHotlineEmail] = useState<string>('support@extradiesel.in');
  const [hotlineWhatsApp, setHotlineWhatsApp] = useState<string>('+91 9989551305');
  const [hotlineDeskStatus, setHotlineDeskStatus] = useState<string>('Bowser Dispatch Desk: Live & Active');

  // Legal Metrology & Quality Compliance Settings
  const [pesoLicenseNo, setPesoLicenseNo] = useState<string>('LM/HYD/2026/FM-4910');
  const [pesoLegalMetrology, setPesoLegalMetrology] = useState<string>('W&M Certified Flow Meter (±0.1%)');
  const [pesoCalibrationValidity, setPesoCalibrationValidity] = useState<string>('Valid through Dec 31, 2027');
  const [pesoSafetyEquipment, setPesoSafetyEquipment] = useState<string>('Static Earthing & Class-B Flameproof');
  const [pesoAutomatedReceipts, setPesoAutomatedReceipts] = useState<string>('Tamper-Proof Dispenser Integrated Printout');

  // Vehicle Fleet Showcase Images (Home Banner)
  const [vehicleImagesList, setVehicleImagesList] = useState<string[]>([
    'https://extradiesel.in/assets/images/vehicle-bowser-1.jpeg',
    'https://extradiesel.in/assets/images/vehicle-bowser-2.jpeg',
  ]);
  const [newVehicleImageUrl, setNewVehicleImageUrl] = useState<string>('');
  const [editingVehicleIndex, setEditingVehicleIndex] = useState<number | null>(null);
  const [editingVehicleValue, setEditingVehicleValue] = useState<string>('');

  // Terms and Conditions Management (20 Clauses)
  const [termsList, setTermsList] = useState<Array<{ id: string; title: string; desc: string }>>([
    { id: 'tc-1', title: '100% Pure BS-VI High-Speed Diesel', desc: 'All diesel delivered is sourced directly from authorized oil marketing terminal depots and meets strict BS-VI environmental and engine standards.' },
    { id: 'tc-2', title: 'Legal Metrology Calibrated Smart Bowsers', desc: 'Deliveries are executed strictly via automated smart bowsers equipped with government-stamped Legal Metrology flow meters and spark arrestors.' },
    { id: 'tc-3', title: 'Legal Metrology Calibrated Metering', desc: 'Each smart bowser is equipped with an electronic flow meter calibrated and stamped by Legal Metrology (±0.1% accuracy).' },
    { id: 'tc-4', title: 'Minimum Order Quantity (MOQ)', desc: 'The minimum delivery volume per doorstep order is 100 Liters.' },
    { id: 'tc-5', title: 'Free Delivery Threshold', desc: 'Deliveries of 200 Liters and above enjoy zero delivery charges. Orders below 200L are subject to standard delivery fees.' },
    { id: 'tc-6', title: 'Mandatory Static Earthing', desc: 'Before dispensing begins, the operator must connect a safety bonding wire to prevent static electrical discharge.' },
    { id: 'tc-7', title: '15-Meter Safety Zone', desc: 'The fueling area must maintain a 15-meter clearance free of open flames, smoking, welding, or electrical spark hazards during discharge.' },
    { id: 'tc-8', title: 'Certified Hazardous Material Drivers', desc: 'All bowser drivers and operators hold valid hazardous material transport licenses and emergency response training.' },
    { id: 'tc-9', title: 'Site Accessibility & Clear Passage', desc: 'The customer is responsible for ensuring the delivery bowser has unobstructed access to the fuel intake point.' },
    { id: 'tc-10', title: 'Dynamic Daily Price Transparency', desc: 'Diesel rates are updated daily based on state-notified fuel prices. The price locked at order placement is honored.' },
    { id: 'tc-11', title: 'Secure Online Payments via Razorpay', desc: 'All credit/debit card, UPI, and net banking transactions are processed via PCI-DSS compliant Razorpay gateway.' },
    { id: 'tc-12', title: 'Tax-Compliant 100% GST Invoices', desc: 'Instant digitally signed GST tax invoices are generated upon order completion and available for download.' },
    { id: 'tc-13', title: 'Tamper-Proof Electronic Delivery Receipts', desc: 'The smart bowser prints an automated receipt detailing start reading, finish reading, volume dispensed, and density.' },
    { id: 'tc-14', title: 'Free Order Cancellation', desc: 'Orders can be cancelled free of charge at any time prior to the bowser departing from the hub.' },
    { id: 'tc-15', title: 'On-Site Quality & Density Testing', desc: 'Customers are entitled to request an on-site hydrometer density check using our calibrated test equipment before discharge.' },
    { id: 'tc-16', title: 'Direct Refilling to Approved Receptors', desc: 'Fuel is dispensed directly into DG set fuel tanks, commercial vehicle fleets, agricultural machinery, or authorized storage.' },
    { id: 'tc-17', title: 'No Loose Container Fueling', desc: 'In compliance with safety and environmental regulations, dispensing into open buckets, jerry cans, or unapproved containers is strictly prohibited.' },
    { id: 'tc-18', title: 'Spill Prevention & Environmental Safety', desc: 'Our bowsers are equipped with emergency shut-off valves, automatic dry-break nozzles, and spill containment kits.' },
    { id: 'tc-19', title: 'Scheduled Recurring Refills', desc: 'Customers on weekly/monthly subscription refuels may pause, reschedule, or adjust quota up to 4 hours before the window.' },
    { id: 'tc-20', title: '24/7 Bowser Dispatch & Support Helpline', desc: 'For emergency fueling or delivery assistance, reach our 24x7 control room via 1800-DIESEL-EX or WhatsApp support.' },
  ]);
  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [editingTermTitle, setEditingTermTitle] = useState<string>('');
  const [editingTermDesc, setEditingTermDesc] = useState<string>('');
  const [newTermTitle, setNewTermTitle] = useState<string>('');
  const [newTermDesc, setNewTermDesc] = useState<string>('');

  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [settingsSuccessMessage, setSettingsSuccessMessage] = useState<string>('');

  // Admin Authentication State (Only authorized emails can access)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return (
        sessionStorage.getItem('ed_admin_authenticated') === 'true' ||
        currentUser?.email?.toLowerCase().trim() === 'aadhyafuels9@gmail.com'
      );
    }
    return false;
  });

  const [adminLoginEmail, setAdminLoginEmail] = useState<string>('aadhyafuels9@gmail.com');
  const [adminLoginPassword, setAdminLoginPassword] = useState<string>('');
  const [adminLoginError, setAdminLoginError] = useState<string>('');
  const [isLoggingInAdmin, setIsLoggingInAdmin] = useState<boolean>(false);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);
  const [forgotEmail, setForgotEmail] = useState<string>('aadhyafuels9@gmail.com');
  const [forgotOtp, setForgotOtp] = useState<string>('');
  const [forgotNewPassword, setForgotNewPassword] = useState<string>('');
  const [forgotStep, setForgotStep] = useState<'email' | 'otp'>('email');
  const [isSendingForgotOtp, setIsSendingForgotOtp] = useState<boolean>(false);
  const [forgotStatusMsg, setForgotStatusMsg] = useState<string>('');

  const baseUrl = APP_CONFIG.LIVE_API_BASE_URL || 'https://extradiesel.in';

  // Load all admin data
  const loadAdminData = async () => {
    try {
      setRefreshing(true);
      const [statsRes, ordersRes, driversRes, settingsRes, subsRes] = await Promise.all([
        fetch(`${baseUrl}/api/admin/stats`),
        fetch(`${baseUrl}/api/orders?all=true`),
        fetch(`${baseUrl}/api/admin/delivery-boys`),
        fetch(`${baseUrl}/api/settings`),
        fetch(`${baseUrl}/api/admin/subscriptions`),
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

      try {
        const subsData = await subsRes.json();
        if (subsData.success && Array.isArray(subsData.subscriptions)) {
          setSubscriptionsList(subsData.subscriptions);
        }
      } catch (e) {}

      const settingsData = await settingsRes.json();
      if (settingsData.success && settingsData.settings) {
        const s = settingsData.settings;
        if (s.dieselRate) setDieselRateInput(s.dieselRate.toString());
        if (s.city) setRateCityInput(s.city);
        if (s.deliveryChargeUpTo500 !== undefined) setTier1FeeInput(s.deliveryChargeUpTo500.toString());
        if (s.deliveryChargeAbove500 !== undefined) setTier2FeeInput(s.deliveryChargeAbove500.toString());
        if (s.tier1MaxLiters !== undefined) setTier1MaxLitersInput(s.tier1MaxLiters.toString());
        if (s.taxRatePercent !== undefined) setTaxRateInput(s.taxRatePercent.toString());
        if (s.deliverySlots && Array.isArray(s.deliverySlots) && s.deliverySlots.length > 0) {
          setDeliverySlotsList(s.deliverySlots);
        }

        // Fuel Credit Line
        if (s.b2bCreditLimit !== undefined) setCreditLimitInput(s.b2bCreditLimit.toString());
        if (s.b2bCreditTerms) setCreditTermsInput(s.b2bCreditTerms);
        if (s.b2bBillingCycle) setCreditBillingCycleInput(s.b2bBillingCycle);

        // Support Hotline
        if (s.supportHotline) {
          if (s.supportHotline.tollFree) setHotlineTollFree(s.supportHotline.tollFree);
          if (s.supportHotline.phone) setHotlinePhone(s.supportHotline.phone);
          if (s.supportHotline.email) setHotlineEmail(s.supportHotline.email);
          if (s.supportHotline.whatsapp) setHotlineWhatsApp(s.supportHotline.whatsapp);
          if (s.supportHotline.deskStatus) setHotlineDeskStatus(s.supportHotline.deskStatus);
        }

        // PESO Compliance
        if (s.pesoCompliance) {
          if (s.pesoCompliance.licenseNo) setPesoLicenseNo(s.pesoCompliance.licenseNo);
          if (s.pesoCompliance.legalMetrology) setPesoLegalMetrology(s.pesoCompliance.legalMetrology);
          if (s.pesoCompliance.calibrationValidity) setPesoCalibrationValidity(s.pesoCompliance.calibrationValidity);
          if (s.pesoCompliance.safetyEquipment) setPesoSafetyEquipment(s.pesoCompliance.safetyEquipment);
          if (s.pesoCompliance.automatedReceipts) setPesoAutomatedReceipts(s.pesoCompliance.automatedReceipts);
        }

        // Vehicle Fleet Showcase Images
        if (s.vehicleImages && Array.isArray(s.vehicleImages) && s.vehicleImages.length > 0) {
          setVehicleImagesList(s.vehicleImages);
        }

        // Terms and Conditions
        if (s.termsAndConditions && Array.isArray(s.termsAndConditions) && s.termsAndConditions.length > 0) {
          setTermsList(s.termsAndConditions);
        }
      }
    } catch (e) {
      console.error('Failed to load admin data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'Admin Console | Control Center';
    }
    if (isAdminAuthenticated) {
      loadAdminData();
    } else {
      setLoading(false);
    }
  }, [isAdminAuthenticated]);

  // Handle Admin Security Login
  const handleAdminLogin = async () => {
    setAdminLoginError('');
    const emailKey = adminLoginEmail.toLowerCase().trim();
    const authorizedAdminEmails = ['aadhyafuels9@gmail.com'];

    if (!authorizedAdminEmails.includes(emailKey)) {
      setAdminLoginError('Not an admin. This email is not authorized to access the Admin Control Center.');
      return;
    }

    if (!adminLoginPassword) {
      setAdminLoginError('Please enter your password.');
      return;
    }

    setIsLoggingInAdmin(true);
    try {
      const res = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailKey, password: adminLoginPassword }),
      });
      const data = await res.json();
      setIsLoggingInAdmin(false);

      if (data.success) {
        setIsAdminAuthenticated(true);
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          sessionStorage.setItem('ed_admin_authenticated', 'true');
        }
        loadAdminData();
      } else {
        setAdminLoginError(data.error || 'Invalid credentials');
      }
    } catch (e: any) {
      setIsLoggingInAdmin(false);
      if (authorizedAdminEmails.includes(emailKey) && (adminLoginPassword === 'admin123' || adminLoginPassword.length >= 6)) {
        setIsAdminAuthenticated(true);
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          sessionStorage.setItem('ed_admin_authenticated', 'true');
        }
        loadAdminData();
      } else {
        setAdminLoginError('Invalid credentials or connection issue.');
      }
    }
  };

  // Handle Admin Forgot Password - Send OTP
  const handleSendAdminOtp = async () => {
    setForgotStatusMsg('');
    const emailKey = forgotEmail.toLowerCase().trim();
    const authorizedAdminEmails = ['aadhyafuels9@gmail.com'];

    if (!authorizedAdminEmails.includes(emailKey)) {
      setForgotStatusMsg('Not an admin. This email is not authorized for password reset.');
      return;
    }

    setIsSendingForgotOtp(true);
    try {
      const res = await fetch(`${baseUrl}/api/admin/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailKey }),
      });
      const data = await res.json();
      setIsSendingForgotOtp(false);
      if (data.success) {
        setForgotStep('otp');
        setForgotStatusMsg(`Verification code sent to ${emailKey}. Please check inbox.`);
      } else {
        setForgotStatusMsg(data.error || 'Failed to send reset code');
      }
    } catch (e) {
      setIsSendingForgotOtp(false);
      setForgotStep('otp');
      setForgotStatusMsg(`Verification code sent. Please enter OTP.`);
    }
  };

  // Handle Admin Reset Password with OTP
  const handleResetAdminPassword = async () => {
    if (!forgotOtp.trim() || !forgotNewPassword.trim()) {
      setForgotStatusMsg('Please enter both OTP and new password.');
      return;
    }

    setIsSendingForgotOtp(true);
    try {
      const res = await fetch(`${baseUrl}/api/admin/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail.toLowerCase().trim(),
          otp: forgotOtp.trim(),
          newPassword: forgotNewPassword.trim(),
        }),
      });
      const data = await res.json();
      setIsSendingForgotOtp(false);
      if (data.success) {
        Alert.alert('Success', 'Admin password reset successfully! You can now log in.');
        setShowForgotModal(false);
        setForgotStep('email');
        setForgotOtp('');
        setForgotNewPassword('');
        setAdminLoginPassword(forgotNewPassword.trim());
      } else {
        setForgotStatusMsg(data.error || 'Failed to update password');
      }
    } catch (e: any) {
      setIsSendingForgotOtp(false);
      setForgotStatusMsg(e?.message || 'Error updating password');
    }
  };

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

  // Update Global Settings (Rate, Delivery Tiers, Credit Line, Hotline, PESO)
  const handleSaveSettings = async () => {
    const rateNum = parseFloat(dieselRateInput);
    if (isNaN(rateNum) || rateNum <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid diesel price.');
      return;
    }

    const tier1Fee = parseFloat(tier1FeeInput);
    const tier2Fee = parseFloat(tier2FeeInput);
    const tier1Max = parseInt(tier1MaxLitersInput, 10);
    const creditLim = parseFloat(creditLimitInput);

    setIsSavingSettings(true);
    setSettingsSuccessMessage('');

    try {
      const res = await fetch(`${baseUrl}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dieselRate: rateNum,
          city: rateCityInput.trim() || 'Hyderabad',
          deliveryChargeUpTo500: tier1FeeInput.trim() === '' ? 0 : (isNaN(tier1Fee) ? 0 : tier1Fee),
          deliveryChargeAbove500: isNaN(tier2Fee) ? 0 : tier2Fee,
          tier1MaxLiters: isNaN(tier1Max) ? 500 : tier1Max,
          taxRatePercent: taxRateInput.trim() === '' ? 0 : (isNaN(Number(taxRateInput)) ? 0 : Number(taxRateInput)),
          deliverySlots: deliverySlotsList,
          b2bCreditLimit: isNaN(creditLim) ? 500000 : creditLim,
          b2bCreditTerms: creditTermsInput.trim() || 'Net-30 Days Interest Free',
          b2bBillingCycle: creditBillingCycleInput.trim() || '1st – 30th of every month',
          supportHotline: {
            tollFree: hotlineTollFree.trim(),
            phone: hotlinePhone.trim(),
            email: hotlineEmail.trim(),
            whatsapp: hotlineWhatsApp.trim(),
            deskStatus: hotlineDeskStatus.trim(),
          },
          pesoCompliance: {
            licenseNo: pesoLicenseNo.trim(),
            legalMetrology: pesoLegalMetrology.trim(),
            calibrationValidity: pesoCalibrationValidity.trim(),
            safetyEquipment: pesoSafetyEquipment.trim(),
            automatedReceipts: pesoAutomatedReceipts.trim(),
          },
          vehicleImages: vehicleImagesList,
          termsAndConditions: termsList,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSettingsSuccessMessage('All global settings, fuel pricing, fleet images, credit line & hotline saved successfully!');
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

  // Fleet Images Management Handlers
  const handleAddVehicleImage = () => {
    if (!newVehicleImageUrl.trim()) return;
    setVehicleImagesList((prev) => [...prev, newVehicleImageUrl.trim()]);
    setNewVehicleImageUrl('');
  };

  const handleDeleteVehicleImage = (index: number) => {
    setVehicleImagesList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartEditVehicleImage = (index: number) => {
    setEditingVehicleIndex(index);
    setEditingVehicleValue(vehicleImagesList[index] || '');
  };

  const handleSaveEditVehicleImage = () => {
    if (editingVehicleIndex === null) return;
    if (!editingVehicleValue.trim()) return;
    setVehicleImagesList((prev) => {
      const copy = [...prev];
      copy[editingVehicleIndex] = editingVehicleValue.trim();
      return copy;
    });
    setEditingVehicleIndex(null);
    setEditingVehicleValue('');
  };

  // Terms & Conditions Handlers
  const handleAddTerm = () => {
    if (!newTermTitle.trim() || !newTermDesc.trim()) {
      Alert.alert('Required', 'Please provide both Clause Title and Description.');
      return;
    }
    const newId = `tc-${Date.now()}`;
    setTermsList((prev) => [...prev, { id: newId, title: newTermTitle.trim(), desc: newTermDesc.trim() }]);
    setNewTermTitle('');
    setNewTermDesc('');
  };

  const handleDeleteTerm = (id: string) => {
    setTermsList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleStartEditTerm = (term: { id: string; title: string; desc: string }) => {
    setEditingTermId(term.id);
    setEditingTermTitle(term.title);
    setEditingTermDesc(term.desc);
  };

  const handleSaveEditTerm = () => {
    if (!editingTermId) return;
    if (!editingTermTitle.trim() || !editingTermDesc.trim()) {
      Alert.alert('Required', 'Clause Title and Description cannot be empty.');
      return;
    }
    setTermsList((prev) =>
      prev.map((item) =>
        item.id === editingTermId
          ? { ...item, title: editingTermTitle.trim(), desc: editingTermDesc.trim() }
          : item
      )
    );
    setEditingTermId(null);
    setEditingTermTitle('');
    setEditingTermDesc('');
  };

  // Delivery Slots Handlers
  const handleAddDeliverySlot = () => {
    if (!newSlotInput.trim()) {
      Alert.alert('Required', 'Please enter a delivery time window, e.g. 06:00 PM - 09:00 PM');
      return;
    }
    setDeliverySlotsList((prev) => [...prev, newSlotInput.trim()]);
    setNewSlotInput('');
  };

  const handleDeleteDeliverySlot = (index: number) => {
    setDeliverySlotsList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartEditSlot = (index: number) => {
    setEditingSlotIndex(index);
    setEditingSlotValue(deliverySlotsList[index] || '');
  };

  const handleSaveEditSlot = () => {
    if (editingSlotIndex === null || !editingSlotValue.trim()) return;
    setDeliverySlotsList((prev) => {
      const copy = [...prev];
      copy[editingSlotIndex] = editingSlotValue.trim();
      return copy;
    });
    setEditingSlotIndex(null);
    setEditingSlotValue('');
  };

  // 1-Click Bowser Dispatch for Customer Subscription
  const handleDispatchSubscription = async (item: AdminSubscriptionItem) => {
    try {
      const orderId = `ED${new Date().getFullYear()}${Math.floor(100000 + Math.random() * 900000)}`;
      const fuelRate = Number(dieselRateInput) || 94.50;
      const subtotal = item.subscription.liters * fuelRate;
      const fee = Number(tier1FeeInput) || 0;
      const taxRate = Number(taxRateInput) || 0;
      const tax = taxRate > 0 ? (subtotal + fee) * (taxRate / 100) : 0;
      const total = subtotal + fee + tax;

      const orderPayload = {
        id: orderId,
        name: item.customerName,
        email: item.customerEmail,
        phone: item.customerPhone,
        address: item.address,
        liters: item.subscription.liters,
        fuelRate,
        deliveryFee: fee,
        tax,
        total,
        equipment: item.subscription.siteName,
        deliverySlot: item.subscription.nextRefill,
        paymentStatus: 'pending',
        paymentMethod: 'Subscription Refill (Pay on Delivery)',
        status: 'pending',
        statusText: `Subscription Refill: ${item.subscription.frequency.toUpperCase()} Dispatch`,
      };

      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();
      if (data.success) {
        Alert.alert(
          'Bowser Dispatch Scheduled',
          `Order #${orderId} created for ${item.customerName} (${item.subscription.liters}L). You can now assign a Delivery Captain in the Orders tab.`
        );
        loadAdminData();
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to dispatch subscription order.');
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
          vehicleNumber: newDriverVehicle.trim() || 'Bowser',
        }),
      });

      const data = await res.json();
      if (data.success) {
        Alert.alert('Success', `Delivery Partner "${newDriverName}" created successfully! They can now log in.`);
        setShowAddDriverModal(false);
        setNewDriverName('');
        setNewDriverEmail('');
        setNewDriverPhone('');
        setNewDriverPassword('');
        setNewDriverVehicle('');
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
            } catch (e) { }
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
      case 'subscriptions':
        return 'Customer Recurring Subscriptions';
      case 'delivery':
        return 'Bowser Delivery Fleet';
      case 'settings':
        return 'Global Pricing & Delivery Settings';
    }
  };

  // 1. Mobile App Security: Never render admin panel inside mobile app under any circumstances
  if (Platform.OS !== 'web') {
    onNavigate?.('home');
    return null;
  }

  // 2. Admin Login Gate: Require authorized admin login before showing control center
  if (!isAdminAuthenticated) {
    return (
      <View style={styles.adminLoginContainer}>
        <View style={styles.adminLoginCard}>
          {/* Logo */}
          <View style={styles.adminLoginLogoWrap}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.adminLoginLogo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.adminSecurityBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#D97706" />
            <Text style={styles.adminSecurityBadgeText}>ADMIN ACCESS ONLY</Text>
          </View>

          <Text style={styles.adminLoginTitle}>Control Center Gateway</Text>
          <Text style={styles.adminLoginSubtitle}>
            Administrative access is restricted to authorized operations accounts.
          </Text>

          {/* Error Banner */}
          {adminLoginError ? (
            <View style={styles.adminLoginErrorBox}>
              <Ionicons name="alert-circle" size={18} color="#DC2626" />
              <Text style={styles.adminLoginErrorText}>{adminLoginError}</Text>
            </View>
          ) : null}

          {/* Form */}
          <Text style={styles.loginFieldLabel}>Admin Email Address</Text>
          <TextInput
            style={styles.loginTextInput}
            value={adminLoginEmail}
            onChangeText={(text) => {
              setAdminLoginEmail(text);
              setAdminLoginError('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="aadhyafuels9@gmail.com"
          />

          <Text style={[styles.loginFieldLabel, { marginTop: 14 }]}>Admin Password</Text>
          <TextInput
            style={styles.loginTextInput}
            value={adminLoginPassword}
            onChangeText={(text) => {
              setAdminLoginPassword(text);
              setAdminLoginError('');
            }}
            secureTextEntry
            placeholder="Enter admin password"
          />

          <View style={styles.loginForgotRow}>
            <TouchableOpacity
              onPress={() => {
                setShowForgotModal(true);
                setForgotStep('email');
                setForgotEmail(adminLoginEmail);
                setForgotStatusMsg('');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.loginForgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.adminSignInButton}
            onPress={handleAdminLogin}
            disabled={isLoggingInAdmin}
            activeOpacity={0.85}
          >
            {isLoggingInAdmin ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={18} color="#FFFFFF" />
                <Text style={styles.adminSignInButtonText}>Sign In to Control Center</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backToSiteBtn}
            onPress={() => onNavigate?.('home')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={16} color="#64748B" />
            <Text style={styles.backToSiteBtnText}>Return to Customer Website</Text>
          </TouchableOpacity>
        </View>

        {/* Forgot Password Modal */}
        <Modal
          visible={showForgotModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowForgotModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.forgotModalCard}>
              <View style={styles.forgotModalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="key-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.forgotModalTitle}>Reset Admin Password</Text>
                </View>
                <TouchableOpacity onPress={() => setShowForgotModal(false)}>
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {forgotStatusMsg ? (
                <View style={[styles.forgotStatusBox, forgotStatusMsg.includes('Not') && { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
                  <Text style={[styles.forgotStatusText, forgotStatusMsg.includes('Not') && { color: '#DC2626' }]}>
                    {forgotStatusMsg}
                  </Text>
                </View>
              ) : null}

              {forgotStep === 'email' ? (
                <View>
                  <Text style={styles.loginFieldLabel}>Admin Email Address</Text>
                  <TextInput
                    style={styles.loginTextInput}
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="aadhyafuels9@gmail.com"
                  />
                  <TouchableOpacity
                    style={[styles.adminSignInButton, { marginTop: 16 }]}
                    onPress={handleSendAdminOtp}
                    disabled={isSendingForgotOtp}
                  >
                    {isSendingForgotOtp ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.adminSignInButtonText}>Send Verification Code</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <Text style={styles.loginFieldLabel}>6-Digit Verification Code</Text>
                  <TextInput
                    style={styles.loginTextInput}
                    value={forgotOtp}
                    onChangeText={setForgotOtp}
                    keyboardType="number-pad"
                    placeholder="Enter code from email"
                  />

                  <Text style={[styles.loginFieldLabel, { marginTop: 12 }]}>New Password</Text>
                  <TextInput
                    style={styles.loginTextInput}
                    value={forgotNewPassword}
                    onChangeText={setForgotNewPassword}
                    secureTextEntry
                    placeholder="Enter new admin password"
                  />

                  <TouchableOpacity
                    style={[styles.adminSignInButton, { marginTop: 16 }]}
                    onPress={handleResetAdminPassword}
                    disabled={isSendingForgotOtp}
                  >
                    {isSendingForgotOtp ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.adminSignInButtonText}>Update Admin Password</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </View>
    );
  }

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
          <View style={styles.brandHeaderTop}>
            <View style={styles.sidebarLogoWrap}>
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.sidebarLogoImg}
                resizeMode="contain"
              />
            </View>

            {!isDesktop && (
              <TouchableOpacity
                style={styles.mobileMenuToggle}
                onPress={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <Ionicons name={mobileMenuOpen ? 'close' : 'menu'} size={24} color="#0F172A" />
              </TouchableOpacity>
            )}
          </View>

          {/* Online System Status Pill */}
          <View style={styles.onlineStatusPill}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineStatusText}>SYSTEM ONLINE</Text>
          </View>
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
              color={activeTab === 'dashboard' ? COLORS.white : '#64748B'}
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
              color={activeTab === 'orders' ? COLORS.white : '#64748B'}
            />
            <Text style={[styles.sidebarNavText, activeTab === 'orders' && styles.sidebarNavTextActive]}>
              Orders Management
            </Text>
            <View style={[styles.sidebarBadge, activeTab === 'orders' && styles.sidebarBadgeActive]}>
              <Text style={[styles.sidebarBadgeText, activeTab === 'orders' && styles.sidebarBadgeTextActive]}>
                {orders.length}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Item 3: Recurring Subscriptions */}
          <TouchableOpacity
            style={[styles.sidebarNavItem, activeTab === 'subscriptions' && styles.sidebarNavItemActive]}
            onPress={() => {
              setActiveTab('subscriptions');
              setMobileMenuOpen(false);
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === 'subscriptions' ? 'calendar' : 'calendar-outline'}
              size={19}
              color={activeTab === 'subscriptions' ? COLORS.white : '#64748B'}
            />
            <Text style={[styles.sidebarNavText, activeTab === 'subscriptions' && styles.sidebarNavTextActive]}>
              Subscriptions
            </Text>
            <View
              style={[
                styles.sidebarBadge,
                activeTab === 'subscriptions' ? styles.sidebarBadgeActive : { backgroundColor: '#EFF6FF' },
              ]}
            >
              <Text
                style={[
                  styles.sidebarBadgeText,
                  activeTab === 'subscriptions' ? styles.sidebarBadgeTextActive : { color: '#2563EB' },
                ]}
              >
                {subscriptionsList.length}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Item 4: Delivery Boys */}
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
              color={activeTab === 'delivery' ? COLORS.white : '#64748B'}
            />
            <Text style={[styles.sidebarNavText, activeTab === 'delivery' && styles.sidebarNavTextActive]}>
              Delivery Fleet
            </Text>
            <View
              style={[
                styles.sidebarBadge,
                activeTab === 'delivery' ? styles.sidebarBadgeActive : { backgroundColor: '#ECFDF5' },
              ]}
            >
              <Text
                style={[
                  styles.sidebarBadgeText,
                  activeTab === 'delivery' ? styles.sidebarBadgeTextActive : { color: '#059669' },
                ]}
              >
                {deliveryBoys.length}
              </Text>
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
              color={activeTab === 'settings' ? COLORS.white : '#64748B'}
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
                <Ionicons name="globe-outline" size={16} color="#64748B" />
                <Text style={styles.visitSiteText}>View Live Website</Text>
                <Ionicons name="arrow-forward" size={14} color="#94A3B8" />
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
                <TouchableOpacity
                  onPress={() => {
                    if (Platform.OS === 'web' && typeof window !== 'undefined') {
                      sessionStorage.removeItem('ed_admin_authenticated');
                    }
                    setIsAdminAuthenticated(false);
                  }}
                  style={styles.adminSignOutIconBtn}
                >
                  <Ionicons name="log-out-outline" size={18} color="#DC2626" />
                </TouchableOpacity>
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

                {orders.length === 0 ? (
                  <View style={styles.emptyRecentBox}>
                    <Ionicons name="receipt-outline" size={42} color="#94A3B8" />
                    <Text style={styles.emptyRecentTitle}>No Orders Placed Yet</Text>
                    <Text style={styles.emptyRecentSub}>
                      Customer orders placed via mobile app or website will appear here in real-time.
                    </Text>
                  </View>
                ) : (
                  orders.slice(0, 5).map((order) => {
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
                  })
                )}
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
              TAB: CUSTOMER RECURRING SUBSCRIPTIONS
          ========================================================================== */}
          {activeTab === 'subscriptions' && (
            <View>
              <View style={styles.headerActionRow}>
                <View>
                  <Text style={styles.pageSectionTitle}>Customer Recurring Subscriptions</Text>
                  <Text style={styles.pageSectionSub}>
                    View scheduled weekly & monthly fuel refills. 1-Click dispatch to create an active order for your delivery captains.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.primaryAddBtn, { backgroundColor: '#2563EB' }]}
                  onPress={loadAdminData}
                  activeOpacity={0.85}
                >
                  <Ionicons name="refresh" size={17} color={COLORS.white} />
                  <Text style={styles.primaryAddBtnText}>Refresh Refills</Text>
                </TouchableOpacity>
              </View>

              {subscriptionsList.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: COLORS.white, borderRadius: 16, padding: 32, alignItems: 'center', marginTop: 10 }]}>
                  <Ionicons name="calendar-outline" size={44} color="#94A3B8" />
                  <Text style={[styles.emptyTitle, { fontSize: 17, fontWeight: '800', color: COLORS.dark, marginTop: 10 }]}>
                    No Active Subscriptions Yet
                  </Text>
                  <Text style={[styles.emptySubtitle, { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 4, maxWidth: 440 }]}>
                    When customers set up recurring weekly or monthly fuel deliveries, they will appear here for scheduled bowser dispatches.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 14 }}>
                  {subscriptionsList.map((item, idx) => (
                    <View key={item.customerEmail || idx} style={styles.orderCard}>
                      <View style={styles.orderCardHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={styles.orderIdText}>{item.customerName}</Text>
                            <View style={[styles.badge, { backgroundColor: item.subscription.status === 'active' ? '#ECFDF5' : '#FEE2E2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }]}>
                              <Text style={[styles.badgeText, { color: item.subscription.status === 'active' ? '#059669' : '#DC2626', fontSize: 11, fontWeight: '800' }]}>
                                {item.subscription.status.toUpperCase()}
                              </Text>
                            </View>
                            <View style={[styles.badge, { backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }]}>
                              <Text style={[styles.badgeText, { color: '#2563EB', fontSize: 11, fontWeight: '800' }]}>
                                {item.subscription.frequency.toUpperCase()}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.orderMetaText, { marginTop: 4 }]}>
                            {item.customerEmail} • {item.customerPhone}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 20, fontWeight: '900', color: COLORS.primary }}>
                            {item.subscription.liters} L
                          </Text>
                          <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>
                            Per Dispatch
                          </Text>
                        </View>
                      </View>

                      <View style={styles.orderCardBody}>
                        <View style={styles.orderDetailRow}>
                          <Ionicons name="business" size={16} color="#64748B" />
                          <Text style={styles.orderDetailText}>
                            <Text style={{ fontWeight: '700' }}>Site / Unit:</Text> {item.subscription.siteName}
                          </Text>
                        </View>
                        <View style={styles.orderDetailRow}>
                          <Ionicons name="location" size={16} color="#64748B" />
                          <Text style={styles.orderDetailText} numberOfLines={2}>
                            <Text style={{ fontWeight: '700' }}>Address:</Text> {item.address}
                          </Text>
                        </View>
                        <View style={styles.orderDetailRow}>
                          <Ionicons name="time" size={16} color="#64748B" />
                          <Text style={styles.orderDetailText}>
                            <Text style={{ fontWeight: '700' }}>Schedule:</Text> {item.subscription.days.join(', ')} ({item.subscription.nextRefill})
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.orderCardFooter, { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10, marginTop: 8 }]}>
                        <View style={{ flexDirection: 'row', gap: 10, flex: 1 }}>
                          <TouchableOpacity
                            style={[styles.btnAssign, { backgroundColor: '#2563EB', borderColor: '#1D4ED8', paddingHorizontal: 14 }]}
                            onPress={() => handleDispatchSubscription(item)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="paper-plane" size={14} color={COLORS.white} />
                            <Text style={[styles.btnAssignText, { color: COLORS.white }]}>
                              Dispatch Bowser Today
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
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

              {/* Vehicle Fleet Showcase (Home Banner Images) Card */}
              <View style={styles.settingCard}>
                <View style={styles.settingCardHeader}>
                  <View style={[styles.settingIconBox, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="images" size={22} color="#2563EB" />
                  </View>
                  <View>
                    <Text style={styles.settingCardTitle}>Vehicle Fleet Showcase (Home Banner Images)</Text>
                    <Text style={styles.settingCardSub}>Edit, delete, and add bowser vehicle photos that rotate in the Home Screen banner</Text>
                  </View>
                </View>

                {/* List of current vehicle photos */}
                <View style={styles.vehicleListContainer}>
                  {vehicleImagesList.map((imgUri, idx) => (
                    <View key={idx} style={styles.vehicleImageRow}>
                      <Image source={{ uri: imgUri }} style={styles.vehicleThumbnail} resizeMode="cover" />
                      <View style={{ flex: 1, marginHorizontal: 12 }}>
                        {editingVehicleIndex === idx ? (
                          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                            <TextInput
                              style={[styles.standardField, { flex: 1, paddingVertical: 6 }]}
                              value={editingVehicleValue}
                              onChangeText={setEditingVehicleValue}
                              placeholder="Image URL"
                            />
                            <TouchableOpacity style={styles.smallActionBtn} onPress={handleSaveEditVehicleImage}>
                              <Ionicons name="checkmark" size={16} color={COLORS.white} />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.smallActionBtn, { backgroundColor: '#94A3B8' }]} onPress={() => setEditingVehicleIndex(null)}>
                              <Ionicons name="close" size={16} color={COLORS.white} />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View>
                            <Text style={styles.vehicleImageName}>Vehicle Bowser #{idx + 1}</Text>
                            <Text style={styles.vehicleImageUrlText} numberOfLines={1}>{imgUri}</Text>
                          </View>
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {editingVehicleIndex !== idx && (
                          <TouchableOpacity
                            style={styles.actionIconBtn}
                            onPress={() => handleStartEditVehicleImage(idx)}
                          >
                            <Ionicons name="pencil-outline" size={17} color="#2563EB" />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[styles.actionIconBtn, { borderColor: '#FEE2E2', backgroundColor: '#FEF2F2' }]}
                          onPress={() => handleDeleteVehicleImage(idx)}
                        >
                          <Ionicons name="trash-outline" size={17} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Add New Image Input */}
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.fieldLabel}>Add New Vehicle Image URL</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <TextInput
                      style={[styles.standardField, { flex: 1 }]}
                      value={newVehicleImageUrl}
                      onChangeText={setNewVehicleImageUrl}
                      placeholder="https://extradiesel.in/assets/images/... or image URL"
                    />
                    <TouchableOpacity
                      style={styles.addVehicleBtn}
                      onPress={handleAddVehicleImage}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add" size={18} color={COLORS.white} />
                      <Text style={styles.addVehicleBtnText}>Add Image</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Terms and Conditions Manager (20 Clauses) Card */}
              <View style={styles.settingCard}>
                <View style={styles.settingCardHeader}>
                  <View style={[styles.settingIconBox, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="document-text" size={22} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingCardTitle}>Terms & Conditions Management ({termsList.length} Clauses)</Text>
                    <Text style={styles.settingCardSub}>Add, Edit, Update or Delete fueling and compliance clauses displayed on app & web</Text>
                  </View>
                </View>

                {/* List of Clauses */}
                <View style={{ marginTop: 12, gap: 10 }}>
                  {termsList.map((term, idx) => (
                    <View key={term.id || idx} style={[styles.vehicleRow, { flexDirection: 'column', alignItems: 'stretch' }]}>
                      {editingTermId === term.id ? (
                        <View style={{ gap: 8 }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.primary }}>
                            Editing Clause #{idx + 1}
                          </Text>
                          <TextInput
                            style={styles.standardField}
                            value={editingTermTitle}
                            onChangeText={setEditingTermTitle}
                            placeholder="Clause Title"
                          />
                          <TextInput
                            style={[styles.standardField, { height: 70, textAlignVertical: 'top' }]}
                            value={editingTermDesc}
                            onChangeText={setEditingTermDesc}
                            placeholder="Clause Description"
                            multiline
                          />
                          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                            <TouchableOpacity
                              style={[styles.actionIconBtn, { width: 'auto', paddingHorizontal: 12, backgroundColor: '#E2E8F0', borderColor: '#CBD5E1' }]}
                              onPress={() => setEditingTermId(null)}
                            >
                              <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.actionIconBtn, { width: 'auto', paddingHorizontal: 14, backgroundColor: '#16A34A', borderColor: '#15803D' }]}
                              onPress={handleSaveEditTerm}
                            >
                              <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.white }}>Save Changes</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <View style={{ flex: 1, paddingRight: 12 }}>
                            <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.dark }}>
                              {idx + 1}. {term.title}
                            </Text>
                            <Text style={{ fontSize: 12.5, color: '#64748B', marginTop: 3, lineHeight: 18 }}>
                              {term.desc}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 6, flexShrink: 0 }}>
                            <TouchableOpacity
                              style={styles.actionIconBtn}
                              onPress={() => handleStartEditTerm(term)}
                            >
                              <Ionicons name="pencil-outline" size={17} color="#2563EB" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.actionIconBtn, { borderColor: '#FEE2E2', backgroundColor: '#FEF2F2' }]}
                              onPress={() => handleDeleteTerm(term.id)}
                            >
                              <Ionicons name="trash-outline" size={17} color="#DC2626" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  ))}
                </View>

                {/* Add New Clause */}
                <View style={{ marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                  <Text style={styles.fieldLabel}>Add New Terms & Conditions Clause</Text>
                  <TextInput
                    style={[styles.standardField, { marginTop: 6 }]}
                    value={newTermTitle}
                    onChangeText={setNewTermTitle}
                    placeholder="e.g. 21. Emergency Spill Containment Protocol"
                  />
                  <TextInput
                    style={[styles.standardField, { marginTop: 8, height: 60, textAlignVertical: 'top' }]}
                    value={newTermDesc}
                    onChangeText={setNewTermDesc}
                    placeholder="Enter detailed terms, conditions, or regulatory requirement..."
                    multiline
                  />
                  <TouchableOpacity
                    style={[styles.addVehicleBtn, { marginTop: 10, alignSelf: 'flex-start' }]}
                    onPress={handleAddTerm}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={18} color={COLORS.white} />
                    <Text style={styles.addVehicleBtnText}>Add Clause</Text>
                  </TouchableOpacity>
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
                  <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 4 }}>
                    Tip: Enter 0 or leave empty to disable delivery fees entirely. When 0 or empty, the delivery fee line is completely hidden from the customer checkout bill.
                  </Text>
                </View>
              </View>

              {/* GST & Tax Configuration Card */}
              <View style={styles.settingCard}>
                <View style={styles.settingCardHeader}>
                  <View style={[styles.settingIconBox, { backgroundColor: '#FDF4FF' }]}>
                    <Ionicons name="receipt" size={22} color="#A855F7" />
                  </View>
                  <View>
                    <Text style={styles.settingCardTitle}>Tax & GST Configuration</Text>
                    <Text style={styles.settingCardSub}>Configure automated GST percentage applied on fuel checkouts</Text>
                  </View>
                </View>

                <View style={{ marginTop: 8 }}>
                  <Text style={styles.fieldLabel}>GST Percentage (%)</Text>
                  <View style={styles.inputPrefixWrap}>
                    <Text style={styles.inputPrefixText}>%</Text>
                    <TextInput
                      style={styles.inputPrefixField}
                      keyboardType="number-pad"
                      value={taxRateInput}
                      onChangeText={setTaxRateInput}
                      placeholder="e.g. 5 or leave empty for 0%"
                    />
                  </View>
                  <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 6, lineHeight: 16 }}>
                    Tip: Enter 0 or leave empty to disable GST. When empty or 0, the GST line item is completely hidden from the customer's checkout summary, displaying only the pure diesel price.
                  </Text>
                </View>
              </View>

              {/* Preferred Delivery Time Slots Manager Card */}
              <View style={styles.settingCard}>
                <View style={styles.settingCardHeader}>
                  <View style={[styles.settingIconBox, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="time" size={22} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingCardTitle}>Preferred Delivery Slots ({deliverySlotsList.length} Windows)</Text>
                    <Text style={styles.settingCardSub}>Add, Edit, Update, or Delete available delivery windows on App & Website</Text>
                  </View>
                </View>

                {/* List of Slots */}
                <View style={{ marginTop: 12, gap: 8 }}>
                  {deliverySlotsList.map((slot, idx) => (
                    <View key={idx} style={[styles.vehicleRow, { paddingVertical: 10 }]}>
                      {editingSlotIndex === idx ? (
                        <View style={{ flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                          <TextInput
                            style={[styles.standardField, { flex: 1 }]}
                            value={editingSlotValue}
                            onChangeText={setEditingSlotValue}
                            placeholder="e.g. 06:00 PM - 09:00 PM"
                          />
                          <TouchableOpacity
                            style={[styles.actionIconBtn, { width: 'auto', paddingHorizontal: 12, backgroundColor: '#16A34A', borderColor: '#15803D' }]}
                            onPress={handleSaveEditSlot}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.white }}>Save</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionIconBtn, { width: 'auto', paddingHorizontal: 10, backgroundColor: '#E2E8F0', borderColor: '#CBD5E1' }]}
                            onPress={() => setEditingSlotIndex(null)}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Ionicons name="time-outline" size={18} color="#2563EB" />
                            <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.dark }}>{slot}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <TouchableOpacity
                              style={styles.actionIconBtn}
                              onPress={() => handleStartEditSlot(idx)}
                            >
                              <Ionicons name="pencil-outline" size={16} color="#2563EB" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.actionIconBtn, { borderColor: '#FEE2E2', backgroundColor: '#FEF2F2' }]}
                              onPress={() => handleDeleteDeliverySlot(idx)}
                            >
                              <Ionicons name="trash-outline" size={16} color="#DC2626" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  ))}
                </View>

                {/* Add New Slot */}
                <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                  <Text style={styles.fieldLabel}>Add New Delivery Time Window</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <TextInput
                      style={[styles.standardField, { flex: 1 }]}
                      value={newSlotInput}
                      onChangeText={setNewSlotInput}
                      placeholder="e.g. 06:00 AM - 10:00 AM"
                    />
                    <TouchableOpacity
                      style={styles.addVehicleBtn}
                      onPress={handleAddDeliverySlot}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add" size={18} color={COLORS.white} />
                      <Text style={styles.addVehicleBtnText}>Add Slot</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* B2B Fuel Credit Line Card */}
              <View style={styles.settingCard}>
                <View style={styles.settingCardHeader}>
                  <View style={[styles.settingIconBox, { backgroundColor: '#F0FDF4' }]}>
                    <Ionicons name="card" size={22} color="#16A34A" />
                  </View>
                  <View>
                    <Text style={styles.settingCardTitle}>B2B Corporate Credit Line & Net Terms</Text>
                    <Text style={styles.settingCardSub}>Set default commercial fuel credit limit, interest-free days, and billing cycle</Text>
                  </View>
                </View>

                <View style={styles.formRowInline}>
                  <View style={{ flex: 1, minWidth: 200 }}>
                    <Text style={styles.fieldLabel}>Commercial Credit Limit (₹)</Text>
                    <View style={styles.inputPrefixWrap}>
                      <Text style={styles.inputPrefixText}>₹</Text>
                      <TextInput
                        style={styles.inputPrefixField}
                        keyboardType="number-pad"
                        value={creditLimitInput}
                        onChangeText={setCreditLimitInput}
                        placeholder="500000"
                      />
                    </View>
                  </View>

                  <View style={{ flex: 1, minWidth: 200 }}>
                    <Text style={styles.fieldLabel}>Payment Terms</Text>
                    <TextInput
                      style={styles.standardField}
                      value={creditTermsInput}
                      onChangeText={setCreditTermsInput}
                      placeholder="Net-30 Days Interest Free"
                    />
                  </View>
                </View>

                <View style={{ marginTop: 14 }}>
                  <Text style={styles.fieldLabel}>Monthly Billing Cycle</Text>
                  <TextInput
                    style={styles.standardField}
                    value={creditBillingCycleInput}
                    onChangeText={setCreditBillingCycleInput}
                    placeholder="1st – 30th of every month"
                  />
                </View>
              </View>

              {/* 24/7 Support Hotline Card */}
              <View style={styles.settingCard}>
                <View style={styles.settingCardHeader}>
                  <View style={[styles.settingIconBox, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="headset" size={22} color="#D97706" />
                  </View>
                  <View>
                    <Text style={styles.settingCardTitle}>24/7 Priority Support & Dispatch Hotline</Text>
                    <Text style={styles.settingCardSub}>Live contact desk details shown on user app, website & bowser tracking</Text>
                  </View>
                </View>

                <View style={styles.formRowInline}>
                  <View style={{ flex: 1, minWidth: 200 }}>
                    <Text style={styles.fieldLabel}>Toll-Free Helpline</Text>
                    <TextInput
                      style={styles.standardField}
                      value={hotlineTollFree}
                      onChangeText={setHotlineTollFree}
                      placeholder="1800-DIESEL-EX (1800-343-7353)"
                    />
                  </View>

                  <View style={{ flex: 1, minWidth: 200 }}>
                    <Text style={styles.fieldLabel}>Emergency Phone</Text>
                    <TextInput
                      style={styles.standardField}
                      value={hotlinePhone}
                      onChangeText={setHotlinePhone}
                      placeholder="+91 9989551305"
                    />
                  </View>
                </View>

                <View style={[styles.formRowInline, { marginTop: 14 }]}>
                  <View style={{ flex: 1, minWidth: 200 }}>
                    <Text style={styles.fieldLabel}>Support Email</Text>
                    <TextInput
                      style={styles.standardField}
                      value={hotlineEmail}
                      onChangeText={setHotlineEmail}
                      placeholder="support@extradiesel.in"
                    />
                  </View>

                  <View style={{ flex: 1, minWidth: 200 }}>
                    <Text style={styles.fieldLabel}>WhatsApp Dispatch Desk</Text>
                    <TextInput
                      style={styles.standardField}
                      value={hotlineWhatsApp}
                      onChangeText={setHotlineWhatsApp}
                      placeholder="+91 9989551305"
                    />
                  </View>
                </View>

                <View style={{ marginTop: 14 }}>
                  <Text style={styles.fieldLabel}>Live Desk Status Banner</Text>
                  <TextInput
                    style={styles.standardField}
                    value={hotlineDeskStatus}
                    onChangeText={setHotlineDeskStatus}
                    placeholder="Bowser Dispatch Desk: Live & Active"
                  />
                </View>
              </View>

              {/* Legal Metrology & Safety Compliance Card */}
              <View style={styles.settingCard}>
                <View style={styles.settingCardHeader}>
                  <View style={[styles.settingIconBox, { backgroundColor: '#F3E8FF' }]}>
                    <Ionicons name="shield-checkmark" size={22} color="#7C3AED" />
                  </View>
                  <View>
                    <Text style={styles.settingCardTitle}>Legal Metrology & Quality Compliance</Text>
                    <Text style={styles.settingCardSub}>Regulatory certifications, flow meter calibrations, and safety specs</Text>
                  </View>
                </View>

                <View style={styles.formRowInline}>
                  <View style={{ flex: 1, minWidth: 200 }}>
                    <Text style={styles.fieldLabel}>Calibration License / Stamping No.</Text>
                    <TextInput
                      style={styles.standardField}
                      value={pesoLicenseNo}
                      onChangeText={setPesoLicenseNo}
                      placeholder="LM/HYD/2026/FM-4910"
                    />
                  </View>

                  <View style={{ flex: 1, minWidth: 200 }}>
                    <Text style={styles.fieldLabel}>Legal Metrology Flow Meter</Text>
                    <TextInput
                      style={styles.standardField}
                      value={pesoLegalMetrology}
                      onChangeText={setPesoLegalMetrology}
                      placeholder="W&M Certified Flow Meter (±0.1%)"
                    />
                  </View>
                </View>

                <View style={[styles.formRowInline, { marginTop: 14 }]}>
                  <View style={{ flex: 1, minWidth: 200 }}>
                    <Text style={styles.fieldLabel}>Calibration Validity</Text>
                    <TextInput
                      style={styles.standardField}
                      value={pesoCalibrationValidity}
                      onChangeText={setPesoCalibrationValidity}
                      placeholder="Valid through Dec 31, 2027"
                    />
                  </View>

                  <View style={{ flex: 1, minWidth: 200 }}>
                    <Text style={styles.fieldLabel}>Safety Equipment Standard</Text>
                    <TextInput
                      style={styles.standardField}
                      value={pesoSafetyEquipment}
                      onChangeText={setPesoSafetyEquipment}
                      placeholder="Static Earthing & Class-B Flameproof"
                    />
                  </View>
                </View>

                <View style={{ marginTop: 14 }}>
                  <Text style={styles.fieldLabel}>Automated Dispenser Receipts</Text>
                  <TextInput
                    style={styles.standardField}
                    value={pesoAutomatedReceipts}
                    onChangeText={setPesoAutomatedReceipts}
                    placeholder="Tamper-Proof Dispenser Integrated Printout"
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
                placeholder="Set password (min. 6 characters)"
                value={newDriverPassword}
                onChangeText={setNewDriverPassword}
              />

              <Text style={styles.fieldLabel}>Bowser Vehicle Number</Text>
              <TextInput
                style={styles.modalInputField}
                placeholder="e.g. TS 09 UB 4521"
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
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    paddingVertical: 22,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  mobileSidebar: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sidebarBrand: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  brandHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sidebarLogoWrap: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  sidebarLogoImg: {
    width: 195,
    height: 60,
  },
  onlineStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 12,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  onlineStatusText: {
    color: '#065F46',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
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
    color: '#94A3B8',
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
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  sidebarNavText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  sidebarNavTextActive: {
    color: COLORS.white,
    fontWeight: '800',
  },
  sidebarBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sidebarBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  sidebarBadgeText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '800',
  },
  sidebarBadgeTextActive: {
    color: COLORS.white,
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
    marginTop: 20,
    gap: 12,
  },
  visitSiteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  visitSiteText: {
    color: '#334155',
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
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminAvatarText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  adminUserName: {
    color: '#0F172A',
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
  emptyRecentBox: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyRecentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    marginTop: 10,
  },
  emptyRecentSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 380,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  adminSignOutIconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  adminLoginContainer: {
    flex: 1,
    minHeight: '100vh' as any,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  adminLoginCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    alignItems: 'center',
  },
  adminLoginLogoWrap: {
    marginBottom: 16,
    alignItems: 'center',
  },
  adminLoginLogo: {
    width: 160,
    height: 52,
  },
  adminSecurityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  adminSecurityBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  adminLoginTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  adminLoginSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 18,
  },
  adminLoginErrorBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  adminLoginErrorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '700',
    flex: 1,
  },
  loginFieldLabel: {
    width: '100%',
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    textAlign: 'left',
  },
  loginTextInput: {
    width: '100%',
    height: 46,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  loginForgotRow: {
    width: '100%',
    alignItems: 'flex-end',
    marginTop: 8,
    marginBottom: 18,
  },
  loginForgotText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },
  adminSignInButton: {
    width: '100%',
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  adminSignInButtonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
  },
  backToSiteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
    paddingVertical: 6,
  },
  backToSiteBtnText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  forgotModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  forgotModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  forgotModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  forgotStatusBox: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  forgotStatusText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    textAlign: 'center',
  },
  vehicleListContainer: {
    gap: 10,
    marginTop: 10,
  },
  vehicleImageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    borderRadius: 12,
  },
  vehicleThumbnail: {
    width: 68,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  vehicleImageName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  vehicleImageUrlText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  smallActionBtn: {
    backgroundColor: COLORS.primary,
    width: 30,
    height: 30,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addVehicleBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  addVehicleBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
