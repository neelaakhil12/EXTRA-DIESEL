import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  BackHandler,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { ScreenName } from '../types';
import { APP_CONFIG } from '../constants/config';

interface DeliverySite {
  id: string;
  name: string;
  address: string;
  dgCapacity: string;
  accessNotes: string;
  isPrimary: boolean;
}

interface TermItem {
  id: string;
  title: string;
  desc: string;
}

const DEFAULT_TERMS: TermItem[] = [
  { id: 'tc-1', title: '100% Pure BS-VI High-Speed Diesel', desc: 'All diesel delivered is sourced directly from authorized oil marketing terminal depots and meets strict BS-VI environmental and engine standards.' },
  { id: 'tc-2', title: 'PESO-Certified Mobile Bowsers', desc: 'Deliveries are executed strictly via Petroleum and Explosives Safety Organisation (PESO) licensed smart bowsers with spark arrestors.' },
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
  { id: 'tc-17', title: 'No Loose Container Fueling', desc: 'In compliance with PESO rules, dispensing into open buckets, jerry cans, or unapproved plastic containers is strictly prohibited.' },
  { id: 'tc-18', title: 'Spill Prevention & Environmental Safety', desc: 'Our bowsers are equipped with emergency shut-off valves, automatic dry-break nozzles, and spill containment kits.' },
  { id: 'tc-19', title: 'Scheduled Recurring Refills', desc: 'Customers on weekly/monthly subscription refuels may pause, reschedule, or adjust quota up to 4 hours before the window.' },
  { id: 'tc-20', title: '24/7 Bowser Dispatch & Support Helpline', desc: 'For emergency fueling or delivery assistance, reach our 24x7 control room via 1800-DIESEL-EX or WhatsApp support.' },
];

interface ProfileScreenProps {
  user?: {
    name: string;
    email: string;
    phone: string;
    company?: string;
    gstin?: string;
    role?: string;
    vehicleNumber?: string;
    profileImage?: string;
    deliverySites?: DeliverySite[];
  };
  onLogout: () => void;
  onNavigate: (screen: ScreenName) => void;
  onUpdateUser?: (updated: {
    name?: string;
    phone?: string;
    company?: string;
    gstin?: string;
    profileImage?: string;
  }) => void;
}

type SubScreen = 'sites' | 'terms' | 'support' | 'editProfile' | 'avatarPresets' | null;

const AVATAR_PRESETS = [
  { id: '1', label: 'Executive', uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80' },
  { id: '2', label: 'Operations', uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80' },
  { id: '3', label: 'Logistics', uri: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80' },
  { id: '4', label: 'Fleet Lead', uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80' },
  { id: '5', label: 'Fuel Head', uri: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80' },
  { id: '6', label: 'Site Admin', uri: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80' },
];

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ user, onLogout, onNavigate, onUpdateUser }) => {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const baseUrl = APP_CONFIG.LIVE_API_BASE_URL || 'https://extradiesel.in';

  // Current User Data
  const userName = user?.name || 'Akhil Kumar';
  const userPhone = user?.phone || '+91 98765 43210';
  const userEmail = user?.email || 'aadhyafuels9@gmail.com';
  const userCompany = user?.company || 'Aadhya Fuels & Infra';
  const userGstin = user?.gstin || '36AAACE1234F1Z5';
  const profileImage = user?.profileImage;

  // Navigation within Profile (sub-screens instead of small modals)
  const [activeSubScreen, setActiveSubScreen] = useState<SubScreen>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Edit Profile Form State
  const [editName, setEditName] = useState(userName);
  const [editPhone, setEditPhone] = useState(userPhone);
  const [editCompany, setEditCompany] = useState(userCompany);
  const [editGstin, setEditGstin] = useState(userGstin);

  // Global Settings for B2B Credit, Hotline & PESO Compliance
  const [creditLimit, setCreditLimit] = useState<number>(500000);
  const [creditTerms, setCreditTerms] = useState<string>('Net-30 Days Interest Free');
  const [creditBillingCycle, setCreditBillingCycle] = useState<string>('1st – 30th of every month');
  const [usedCredit, setUsedCredit] = useState<number>(69500);

  const [hotlineSettings, setHotlineSettings] = useState({
    tollFree: '1800-DIESEL-EX (1800-343-7353)',
    phone: '+91 9989551305',
    email: 'support@extradiesel.in',
    whatsapp: '+91 9989551305',
    deskStatus: 'Bowser Dispatch Desk: Live & Active',
  });

  const [pesoSettings, setPesoSettings] = useState({
    licenseNo: 'PESO/HYD/2026/DL-4910',
    legalMetrology: 'W&M Certified Flow Meter (±0.1%)',
    calibrationValidity: 'Valid through Dec 31, 2027',
    safetyEquipment: 'Static Earthing & Class-B Flameproof',
    automatedReceipts: 'Tamper-Proof Dispenser Integrated Printout',
  });

  // Terms and Conditions State (Dynamic 20 Clauses synced with admin panel)
  const [termsList, setTermsList] = useState<TermItem[]>(DEFAULT_TERMS);

  // Delivery Site State - Strictly 1 Single Delivery Address (No Hardcoded Dummy Sites)
  const [deliverySites, setDeliverySites] = useState<DeliverySite[]>([]);

  // Delivery Site Form State
  const [isShowingSiteForm, setIsShowingSiteForm] = useState(false);
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [siteFormName, setSiteFormName] = useState('');
  const [siteFormAddress, setSiteFormAddress] = useState('');
  const [siteFormDg, setSiteFormDg] = useState('');
  const [siteFormNotes, setSiteFormNotes] = useState('');

  // Load Settings, Terms & User profile from backend and local persistent storage
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsRes, profileRes] = await Promise.all([
          fetch(`${baseUrl}/api/settings`),
          fetch(`${baseUrl}/api/user/profile?email=${encodeURIComponent(userEmail)}`),
        ]);

        const settingsData = await settingsRes.json();
        if (settingsData.success && settingsData.settings) {
          const s = settingsData.settings;
          if (s.termsAndConditions && Array.isArray(s.termsAndConditions) && s.termsAndConditions.length > 0) {
            setTermsList(s.termsAndConditions);
          }
          if (s.supportHotline) setHotlineSettings((prev) => ({ ...prev, ...s.supportHotline }));
        }

        const profileData = await profileRes.json();
        let loadedSite: DeliverySite | null = null;
        if (profileData.success && profileData.user) {
          const u = profileData.user;
          if (u.name) setEditName(u.name);
          if (u.phone) setEditPhone(u.phone);
          if (u.company) setEditCompany(u.company);
          if (u.gstin) setEditGstin(u.gstin);
          if (Array.isArray(u.deliverySites) && u.deliverySites.length > 0) {
            loadedSite = u.deliverySites[0];
          }
        }

        if (!loadedSite) {
          const stored = await AsyncStorage.getItem('ed_delivery_site');
          if (stored) {
            try {
              loadedSite = JSON.parse(stored);
            } catch (e) {}
          }
        }

        if (loadedSite) {
          setDeliverySites([loadedSite]);
        } else {
          setDeliverySites([]);
        }
      } catch (e) {
        console.log('Error fetching profile/settings:', e);
      }
    };
    fetchData();
  }, [userEmail]);

  const getInitials = (name?: string) => {
    if (!name || !name.trim()) return 'ED';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Save profile updates to backend
  const handleSaveProfile = async (updates: {
    name?: string;
    phone?: string;
    company?: string;
    gstin?: string;
    profileImage?: string | null;
  }) => {
    try {
      setIsSaving(true);
      const payload = {
        email: userEmail,
        name: updates.name !== undefined ? updates.name : editName,
        phone: updates.phone !== undefined ? updates.phone : editPhone,
        company: updates.company !== undefined ? updates.company : editCompany,
        gstin: updates.gstin !== undefined ? updates.gstin : editGstin,
        profileImage: updates.profileImage !== undefined ? updates.profileImage : (profileImage || null),
      };

      const res = await fetch(`${baseUrl}/api/user/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setIsSaving(false);

      if (data.success && data.user) {
        if (onUpdateUser) {
          onUpdateUser({
            name: data.user.name,
            phone: data.user.phone,
            company: data.user.company,
            gstin: data.user.gstin,
            profileImage: data.user.profileImage,
          });
        }
        Alert.alert('Profile Updated', 'Your profile details have been saved successfully.');
        setActiveSubScreen(null);
      } else {
        Alert.alert('Notice', data.error || 'Saved locally.');
        setActiveSubScreen(null);
      }
    } catch (e: any) {
      setIsSaving(false);
      Alert.alert('Notice', 'Profile updated locally.');
      if (onUpdateUser) {
        onUpdateUser(updates as any);
      }
      setActiveSubScreen(null);
    }
  };

  // Launch File Picker on Web or ImagePicker on Native
  const handlePickImage = async () => {
    try {
      setIsSaving(true);
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: any) => {
          const file = e.target?.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = async (event) => {
              const base64 = event.target?.result as string;
              await handleSaveProfile({ profileImage: base64 });
            };
            reader.readAsDataURL(file);
          } else {
            setIsSaving(false);
          }
        };
        input.click();
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Needed', 'Please allow photo gallery access to upload a profile photo.');
          setIsSaving(false);
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
          base64: true,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
          const asset = result.assets[0];
          const imageUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
          await handleSaveProfile({ profileImage: imageUri });
        } else {
          setIsSaving(false);
        }
      }
    } catch (err: any) {
      setIsSaving(false);
      Alert.alert('Upload Error', err?.message || 'Could not pick image');
    }
  };

  // =========================================================================
  // DELIVERY SITES HANDLERS: ADD, EDIT, DELETE (ONLY 1 SINGLE DELIVERY ADDRESS ALLOWED)
  // =========================================================================
  const openAddSiteForm = () => {
    setEditingSiteId(null);
    setSiteFormName('');
    setSiteFormAddress('');
    setSiteFormDg('500 kVA DG Set');
    setSiteFormNotes('Direct Bowser Ramp Gate Access');
    setIsShowingSiteForm(true);
  };

  const openEditSiteForm = (site: DeliverySite) => {
    setEditingSiteId(site.id);
    setSiteFormName(site.name);
    setSiteFormAddress(site.address);
    setSiteFormDg(site.dgCapacity);
    setSiteFormNotes(site.accessNotes);
    setIsShowingSiteForm(true);
  };

  const handleSaveSiteForm = async () => {
    if (!siteFormAddress.trim()) {
      Alert.alert('Required Field', 'Please enter your delivery site address.');
      return;
    }

    const singleSite: DeliverySite = {
      id: 'site-primary',
      name: siteFormName.trim() || 'Primary Delivery Site',
      address: siteFormAddress.trim(),
      dgCapacity: siteFormDg.trim() || 'Standard Delivery',
      accessNotes: siteFormNotes.trim() || 'Direct Bowser Gate Access',
      isPrimary: true,
    };

    setDeliverySites([singleSite]);
    setIsShowingSiteForm(false);

    try {
      await AsyncStorage.setItem('ed_delivery_site', JSON.stringify(singleSite));
      await fetch(`${baseUrl}/api/user/delivery-sites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, deliverySites: [singleSite] }),
      });
      Alert.alert('Success', 'Delivery address saved successfully!');
    } catch (e) {
      Alert.alert('Saved', 'Delivery address saved locally.');
    }
  };

  const handleDeleteSite = (_siteId?: string) => {
    Alert.alert(
      'Delete Delivery Site',
      'Are you sure you want to remove your delivery address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeliverySites([]);
            try {
              await AsyncStorage.removeItem('ed_delivery_site');
              await fetch(`${baseUrl}/api/user/delivery-sites`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail, deliverySites: [] }),
              });
            } catch (e) {}
            Alert.alert('Deleted', 'Delivery address removed.');
          },
        },
      ]
    );
  };

  // Calculations for Fuel Credit
  const availableCredit = Math.max(0, creditLimit - usedCredit);
  const creditUsagePercent = creditLimit > 0 ? Math.min(100, Math.round((availableCredit / creditLimit) * 100)) : 100;

  // Listen for hardware back or swipe back to close sub-screen
  useEffect(() => {
    const onBackPress = () => {
      if (isShowingSiteForm) {
        setIsShowingSiteForm(false);
        return true;
      }
      if (activeSubScreen !== null) {
        setActiveSubScreen(null);
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [activeSubScreen, isShowingSiteForm]);

  // Navigation Sub-header (Clean header aligned to the LEFT, handled by device gestures & nav buttons)
  const renderSubHeader = (title: string, subtitle?: string) => (
    <View style={styles.subHeaderBar}>
      <View style={{ flex: 1, alignItems: 'flex-start' }}>
        <Text style={[styles.subHeaderTitle, { textAlign: 'left' }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subHeaderSub, { textAlign: 'left' }]}>{subtitle}</Text> : null}
      </View>
    </View>
  );

  // =========================================================================
  // SUB-SCREEN 1: EDIT PROFILE DETAILS FULL PAGE
  // =========================================================================
  if (activeSubScreen === 'editProfile') {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, isDesktop && styles.desktopContent]}
      >
        {renderSubHeader('Edit Profile Details', 'Update your personal and business credentials')}

        {/* Avatar Photo Section */}
        <View style={styles.card}>
          <Text style={styles.formSectionHeading}>Profile Photo</Text>
          <View style={styles.editAvatarRow}>
            <TouchableOpacity style={styles.largeAvatarWrap} onPress={handlePickImage} activeOpacity={0.8}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.largeAvatarImage} />
              ) : (
                <View style={styles.largeAvatarCircle}>
                  <Text style={styles.largeAvatarInitials}>{getInitials(editName)}</Text>
                </View>
              )}
              <View style={styles.largeCameraBadge}>
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <View style={{ flex: 1, marginLeft: 16 }}>
              <TouchableOpacity style={styles.uploadPhotoBtn} onPress={handlePickImage} activeOpacity={0.7}>
                <Ionicons name="cloud-upload-outline" size={18} color={COLORS.primary} />
                <Text style={styles.uploadPhotoBtnText}>Upload New Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetAvatarBtn}
                onPress={() => setActiveSubScreen('avatarPresets')}
                activeOpacity={0.7}
              >
                <Ionicons name="images-outline" size={16} color="#64748B" />
                <Text style={styles.presetAvatarBtnText}>Choose from Presets</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Personal & Business Form */}
        <View style={styles.card}>
          <Text style={styles.formSectionHeading}>Personal & Company Information</Text>

          <Text style={styles.inputLabel}>Full Name</Text>
          <TextInput
            style={styles.textInput}
            value={editName}
            onChangeText={setEditName}
            placeholder="e.g. Akhil Kumar"
          />

          <Text style={styles.inputLabel}>Mobile Phone Number</Text>
          <TextInput
            style={styles.textInput}
            value={editPhone}
            onChangeText={setEditPhone}
            keyboardType="phone-pad"
            placeholder="+91 98765 43210"
          />

          <Text style={styles.inputLabel}>Email Address (Account ID)</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: '#F1F5F9', color: '#64748B' }]}
            value={userEmail}
            editable={false}
          />

          <Text style={styles.inputLabel}>Company / Business Name</Text>
          <TextInput
            style={styles.textInput}
            value={editCompany}
            onChangeText={setEditCompany}
            placeholder="e.g. Aadhya Fuels & Infra"
          />

          <Text style={styles.inputLabel}>GSTIN (For B2B Tax Invoicing)</Text>
          <TextInput
            style={styles.textInput}
            value={editGstin}
            onChangeText={setEditGstin}
            autoCapitalize="characters"
            placeholder="e.g. 36AAACE1234F1Z5"
          />

          <TouchableOpacity
            style={styles.saveProfileBtn}
            onPress={() =>
              handleSaveProfile({
                name: editName,
                phone: editPhone,
                company: editCompany,
                gstin: editGstin,
              })
            }
            disabled={isSaving}
            activeOpacity={0.85}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.saveProfileBtnText}>Save Profile Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // =========================================================================
  // SUB-SCREEN: AVATAR PRESETS
  // =========================================================================
  if (activeSubScreen === 'avatarPresets') {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, isDesktop && styles.desktopContent]}
      >
        {renderSubHeader('Choose Profile Avatar', 'Select an executive avatar for your corporate account')}

        <View style={styles.presetsGrid}>
          {AVATAR_PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.id}
              style={styles.presetCard}
              onPress={() => handleSaveProfile({ profileImage: preset.uri })}
              activeOpacity={0.8}
            >
              <Image source={{ uri: preset.uri }} style={styles.presetImage} />
              <Text style={styles.presetLabel}>{preset.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  // =========================================================================
  // SUB-SCREEN 2: DELIVERY SITES & ADDRESSES FULL PAGE (ADD, EDIT, DELETE)
  // =========================================================================
  if (activeSubScreen === 'sites') {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, isDesktop && styles.desktopContent]}
      >
        {renderSubHeader('Delivery Sites & Addresses', 'Manage bowser refueling drop points, DG sets, and gate permissions')}

        {/* Add / Edit Site Form */}
        {isShowingSiteForm ? (
          <View style={styles.siteFormCard}>
            <View style={styles.siteFormHeader}>
              <Ionicons name="business" size={20} color={COLORS.primary} />
              <Text style={styles.siteFormTitle}>
                {editingSiteId ? 'Edit Delivery Site' : 'Add New Delivery Site'}
              </Text>
            </View>

            <Text style={styles.inputLabel}>Site / Facility Name</Text>
            <TextInput
              style={styles.textInput}
              value={siteFormName}
              onChangeText={setSiteFormName}
              placeholder="e.g. Cyber Gateway DG Yard"
            />

            <Text style={styles.inputLabel}>Full Street Address & Landmark</Text>
            <TextInput
              style={[styles.textInput, { height: 75, textAlignVertical: 'top' }]}
              value={siteFormAddress}
              onChangeText={setSiteFormAddress}
              multiline
              numberOfLines={3}
              placeholder="Plot No, Street, Landmark, Area, Hyderabad"
            />

            <Text style={styles.inputLabel}>DG Set Capacity / Fleet Units</Text>
            <TextInput
              style={styles.textInput}
              value={siteFormDg}
              onChangeText={setSiteFormDg}
              placeholder="e.g. 500 kVA (2 Units) / 12 Trucks"
            />

            <Text style={styles.inputLabel}>Bowser Access & Security Notes</Text>
            <TextInput
              style={styles.textInput}
              value={siteFormNotes}
              onChangeText={setSiteFormNotes}
              placeholder="e.g. Gate 2 Ramp Access • Night Refill Approved"
            />

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setSiteFormIsPrimary(!siteFormIsPrimary)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={siteFormIsPrimary ? 'checkbox' : 'square-outline'}
                size={22}
                color={COLORS.primary}
              />
              <Text style={styles.checkboxLabel}>Set as Primary Delivery Site</Text>
            </TouchableOpacity>

            <View style={styles.formBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsShowingSiteForm(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveSiteBtn}
                onPress={handleSaveSiteForm}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.saveSiteBtnText}>
                  {editingSiteId ? 'Update Site' : 'Save Site'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addSiteHeaderBtn}
            onPress={openAddSiteForm}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.addSiteHeaderBtnText}>Add New Delivery Site</Text>
          </TouchableOpacity>
        )}

        {/* Add Site Button: Only visible if no address exists yet */}
        {!isShowingSiteForm && deliverySites.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 24, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
            <Ionicons name="location-outline" size={44} color="#94A3B8" />
            <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.dark, marginTop: 10 }}>
              No Delivery Address Added
            </Text>
            <Text style={{ fontSize: 12.5, color: '#64748B', textAlign: 'center', marginTop: 4, marginBottom: 18 }}>
              Add your single primary delivery site address for doorstep bowser refueling.
            </Text>
            <TouchableOpacity
              style={styles.addSiteHeaderBtn}
              onPress={openAddSiteForm}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle" size={18} color="#FFFFFF" />
              <Text style={styles.addSiteHeaderBtnText}>Add Delivery Address</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Single Primary Site Card */}
        {deliverySites.map((site) => (
          <View key={site.id} style={styles.siteCardFull}>
            <View style={styles.siteCardHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.siteName}>{site.name}</Text>
                  <View style={styles.primaryBadge}>
                    <Text style={styles.primaryBadgeText}>PRIMARY ADDRESS</Text>
                  </View>
                </View>
                <Text style={styles.siteAddress}>{site.address}</Text>
              </View>
            </View>

            <View style={styles.siteMetaRow}>
              <View style={styles.siteMetaItem}>
                <Ionicons name="flash-outline" size={14} color="#64748B" />
                <Text style={styles.siteMetaText}>{site.dgCapacity || 'Standard Refill'}</Text>
              </View>
              <View style={styles.siteMetaItem}>
                <Ionicons name="shield-outline" size={14} color="#64748B" />
                <Text style={styles.siteMetaText}>{site.accessNotes || 'Bowser Gate Access'}</Text>
              </View>
            </View>

            {/* Action Bar for Single Site: Edit, Delete */}
            <View style={styles.siteActionRow}>
              <TouchableOpacity
                style={styles.siteEditBtn}
                onPress={() => openEditSiteForm(site)}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={16} color={COLORS.primary} />
                <Text style={styles.siteEditBtnText}>Edit Address</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.siteDeleteBtn}
                onPress={() => handleDeleteSite(site.id)}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={16} color="#DC2626" />
                <Text style={styles.siteDeleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    );
  }

  // =========================================================================
  // SUB-SCREEN 3: TERMS AND CONDITIONS FULL PAGE (20 CLAUSES SYNCED WITH ADMIN)
  // =========================================================================
  if (activeSubScreen === 'terms') {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, isDesktop && styles.desktopContent]}
      >
        {renderSubHeader('Terms and Conditions', 'Official fueling guidelines, safety policies and regulatory standards')}

        <View style={styles.termsHeroBadge}>
          <Ionicons name="document-text" size={32} color={COLORS.primary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.termsHeroTitle}>Extra Diesel Service Agreement</Text>
            <Text style={styles.termsHeroSub}>
              PESO-Certified, Legal Metrology Calibrated Doorstep Fuel Delivery
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.formSectionHeading}>Standard Operating Policies & Safety Clauses ({termsList.length} Points)</Text>
          {termsList.map((item, idx) => (
            <View key={item.id || idx} style={[styles.termItemBox, idx < termsList.length - 1 && styles.termItemBorder]}>
              <View style={styles.termIndexCircle}>
                <Text style={styles.termIndexText}>{idx + 1}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.termTitleText}>{item.title}</Text>
                <Text style={styles.termDescText}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  // =========================================================================
  // SUB-SCREEN 5: 24/7 SUPPORT HOTLINE FULL PAGE
  // =========================================================================
  if (activeSubScreen === 'support') {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, isDesktop && styles.desktopContent]}
      >
        {renderSubHeader('24/7 Support Hotline', 'Instant emergency contact and bowser dispatch support')}

        {/* Live Status Pill */}
        <View style={styles.supportStatusPill}>
          <View style={styles.statusDotGreen} />
          <Text style={styles.supportStatusText}>{hotlineSettings.deskStatus}</Text>
        </View>

        {/* Hotline Contact Cards */}
        <View style={styles.supportCard}>
          <View style={styles.supportItemRow}>
            <View style={[styles.supportIconWrap, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="call" size={20} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.supportItemLabel}>Toll-Free Helpline</Text>
              <Text style={styles.supportItemValue}>{hotlineSettings.tollFree}</Text>
            </View>
            <TouchableOpacity
              style={styles.quickDialBtn}
              onPress={() => Linking.openURL('tel:18003437353')}
            >
              <Text style={styles.quickDialText}>Call</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.supportItemRow, styles.supportItemBorder]}>
            <View style={[styles.supportIconWrap, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="logo-whatsapp" size={20} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.supportItemLabel}>WhatsApp Dispatch Desk</Text>
              <Text style={styles.supportItemValue}>{hotlineSettings.whatsapp}</Text>
            </View>
            <TouchableOpacity
              style={[styles.quickDialBtn, { backgroundColor: '#10B981' }]}
              onPress={() =>
                Linking.openURL(
                  `https://wa.me/919989551305?text=${encodeURIComponent(
                    'Hello Extra Diesel Dispatch Desk, I need fuel assistance.'
                  )}`
                )
              }
            >
              <Text style={styles.quickDialText}>Chat</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.supportItemRow, styles.supportItemBorder]}>
            <View style={[styles.supportIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="mail" size={20} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.supportItemLabel}>Corporate Support Email</Text>
              <Text style={styles.supportItemValue}>{hotlineSettings.email}</Text>
            </View>
            <TouchableOpacity
              style={[styles.quickDialBtn, { backgroundColor: '#D97706' }]}
              onPress={() => Linking.openURL(`mailto:${hotlineSettings.email}`)}
            >
              <Text style={styles.quickDialText}>Mail</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  // =========================================================================
  // MAIN PROFILE SCREEN (ALL MENU ITEMS OPEN STANDALONE FULL PAGES)
  // =========================================================================
  const menuItems = [
    {
      icon: 'location-outline',
      label: 'Delivery Sites & Addresses',
      action: () => setActiveSubScreen('sites'),
    },
    {
      icon: 'receipt-outline',
      label: 'Invoices',
      action: () => onNavigate('orders'),
    },
    {
      icon: 'calendar-outline',
      label: 'Subscription Manager',
      action: () => onNavigate('subscription'),
    },
    {
      icon: 'document-text-outline',
      label: 'Terms and Conditions',
      action: () => setActiveSubScreen('terms'),
    },
    {
      icon: 'help-circle-outline',
      label: '24/7 Support Hotline',
      action: () => setActiveSubScreen('support'),
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isDesktop && styles.desktopContent]}
    >
      {/* Profile Card with Photo & Edit Profile Button */}
      <View style={styles.profileCard}>
        <TouchableOpacity
          style={styles.avatarWrap}
          onPress={handlePickImage}
          activeOpacity={0.8}
        >
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitialsText}>{getInitials(userName)}</Text>
            </View>
          )}
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={13} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        <View style={styles.profileInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.profileName}>{userName}</Text>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={13} color={COLORS.green} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          </View>
          <Text style={styles.profilePhone}>{userPhone}</Text>
          <Text style={styles.profileCompany}>{userEmail}</Text>

          <TouchableOpacity
            style={styles.editProfilePill}
            onPress={() => {
              setEditName(userName);
              setEditPhone(userPhone);
              setEditCompany(userCompany);
              setEditGstin(userGstin);
              setActiveSubScreen('editProfile');
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={13} color={COLORS.primary} />
            <Text style={styles.editProfilePillText}>Edit Profile Details</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile Menu List */}
      <View style={styles.menuCard}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.menuItem, index < menuItems.length - 1 && styles.menuItemBorder]}
            onPress={item.action}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <View style={styles.menuIconContainer}>
                <Ionicons name={item.icon as any} size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.85}>
        <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>Extra Diesel Mobile & Web Platform v2.0</Text>
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
  desktopContent: {
    maxWidth: 860,
    width: '100%',
    alignSelf: 'center',
    paddingVertical: 24,
  },
  subHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 10,
    gap: 4,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.dark,
  },
  subHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.dark,
  },
  subHeaderSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  avatarInitialsText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.dark,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  verifiedText: {
    fontSize: 11,
    color: COLORS.green,
    fontWeight: '700',
  },
  profilePhone: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  profileCompany: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
  },
  editProfilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  editProfilePillText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
  },
  creditCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  creditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  creditLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  creditLimit: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FCD34D',
  },
  creditAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  creditFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  creditSub: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  menuCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 20,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.danger,
  },
  versionText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 10,
  },
  formSectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 10,
    marginBottom: 6,
  },
  textInput: {
    height: 46,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: COLORS.dark,
    backgroundColor: '#F8FAFC',
  },
  editAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  largeAvatarWrap: {
    position: 'relative',
  },
  largeAvatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  largeAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  largeAvatarInitials: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.primary,
  },
  largeCameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  uploadPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  uploadPhotoBtnText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700',
  },
  presetAvatarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  presetAvatarBtnText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  saveProfileBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
  },
  saveProfileBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  presetCard: {
    width: '30%',
    minWidth: 100,
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  presetImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 8,
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.dark,
  },
  addSiteHeaderBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  addSiteHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  siteFormCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  siteFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  siteFormTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.dark,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  checkboxLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
  },
  formBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  saveSiteBtn: {
    flex: 2,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  saveSiteBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  siteCardFull: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  siteCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  siteName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.dark,
  },
  primaryBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  primaryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  siteAddress: {
    fontSize: 13,
    color: '#475569',
    marginTop: 6,
    lineHeight: 18,
  },
  siteMetaRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 4,
  },
  siteMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  siteMetaText: {
    fontSize: 12,
    color: '#64748B',
  },
  siteActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },
  setPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  setPrimaryBtnText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '700',
  },
  siteEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
  siteEditBtnText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },
  siteDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },
  siteDeleteBtnText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '700',
  },
  creditSummaryBox: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  creditSummaryLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  creditSummaryValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 4,
    marginBottom: 12,
  },
  creditProgressTrack: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
  },
  creditProgressBar: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  creditSplitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  creditSplitText: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: COLORS.dark,
    fontWeight: '700',
  },
  infoValueBold: {
    fontSize: 13,
    color: COLORS.dark,
    fontWeight: '800',
    textAlign: 'right',
    maxWidth: '60%',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  statusDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  creditExplainCard: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  creditExplainTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0369A1',
    marginBottom: 4,
  },
  creditExplainText: {
    fontSize: 12,
    color: '#0C4A6E',
    lineHeight: 18,
  },
  actionBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  complianceBadgeBox: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  complianceBadgeTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#065F46',
    marginTop: 8,
  },
  complianceBadgeSub: {
    fontSize: 12,
    color: '#047857',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  supportStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    alignSelf: 'center',
    marginBottom: 16,
  },
  supportStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  supportCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  supportItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  supportItemBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  supportIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportItemLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  supportItemValue: {
    fontSize: 13,
    color: COLORS.dark,
    fontWeight: '700',
    marginTop: 2,
  },
  quickDialBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  quickDialText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  termsHeroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  termsHeroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  termsHeroSub: {
    fontSize: 11.5,
    color: '#991B1B',
    marginTop: 2,
    fontWeight: '500',
  },
  termItemBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  termItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  termIndexCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  termIndexText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  termTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 3,
  },
  termDescText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
});
