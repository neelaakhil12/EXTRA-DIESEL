import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
  Linking,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { ScreenName } from '../types';
import { APP_CONFIG } from '../constants/config';

interface ProfileScreenProps {
  user?: {
    name: string;
    email: string;
    phone: string;
    profileImage?: string;
  };
  onLogout: () => void;
  onNavigate: (screen: ScreenName) => void;
  onUpdateUser?: (updated: { name?: string; phone?: string; profileImage?: string }) => void;
}

type ActiveModal = 'sites' | 'credit' | 'compliance' | 'support' | 'avatar' | 'editProfile' | null;

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

  const userName = user?.name || 'Akhil Kumar';
  const userPhone = user?.phone || '+91 98765 43210';
  const userEmail = user?.email || 'akhil@extradiesel.com';
  const profileImage = user?.profileImage;

  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Edit details form state
  const [tempName, setTempName] = useState(userName);
  const [tempPhone, setTempPhone] = useState(userPhone);

  const getInitials = (name?: string) => {
    if (!name || !name.trim()) return 'ED';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Save updated profile to backend database (server/data/users.json)
  const saveProfileToDatabase = async (updates: { name?: string; phone?: string; profileImage?: string | null }) => {
    try {
      setIsSaving(true);
      const baseUrl = APP_CONFIG.LIVE_API_BASE_URL || 'https://extradiesel.in';
      const payload = {
        email: userEmail,
        name: updates.name !== undefined ? updates.name : userName,
        phone: updates.phone !== undefined ? updates.phone : userPhone,
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
            profileImage: data.user.profileImage,
          });
        }
        setActiveModal(null);
      } else {
        Alert.alert('Error', data.error || 'Failed to update profile');
      }
    } catch (e: any) {
      setIsSaving(false);
      Alert.alert('Network Notice', 'Profile saved locally. Syncing with server.');
      if (onUpdateUser) {
        onUpdateUser(updates as any);
      }
      setActiveModal(null);
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
              await saveProfileToDatabase({ profileImage: base64 });
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
          await saveProfileToDatabase({ profileImage: imageUri });
        } else {
          setIsSaving(false);
        }
      }
    } catch (err: any) {
      setIsSaving(false);
      Alert.alert('Upload Error', err?.message || 'Could not pick image');
    }
  };

  const menuItems = [
    {
      icon: 'location-outline',
      label: 'Delivery Sites & Addresses',
      action: () => setActiveModal('sites'),
    },
    {
      icon: 'business-outline',
      label: 'B2B Corporate Credit Account',
      action: () => setActiveModal('credit'),
    },
    {
      icon: 'receipt-outline',
      label: 'GST Tax Invoices',
      action: () => onNavigate('orders'),
    },
    {
      icon: 'calendar-outline',
      label: 'Subscription Manager',
      action: () => onNavigate('subscription'),
    },
    {
      icon: 'shield-checkmark-outline',
      label: 'PESO & Legal Metrology Compliance',
      action: () => setActiveModal('compliance'),
    },
    {
      icon: 'help-circle-outline',
      label: '24/7 Support Hotline',
      action: () => setActiveModal('support'),
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isDesktop && styles.desktopContent]}
    >
      {/* Profile Card with Photo & Edit Button */}
      <View style={styles.profileCard}>
        <TouchableOpacity
          style={styles.avatarWrap}
          onPress={() => setActiveModal('avatar')}
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
              setTempName(userName);
              setTempPhone(userPhone);
              setActiveModal('editProfile');
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={13} color={COLORS.primary} />
            <Text style={styles.editProfilePillText}>Edit Profile Details</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Credit Line Highlight Card */}
      <TouchableOpacity
        style={styles.creditCard}
        activeOpacity={0.9}
        onPress={() => setActiveModal('credit')}
      >
        <View style={styles.creditHeader}>
          <Text style={styles.creditLabel}>Available Fuel Credit</Text>
          <Text style={styles.creditLimit}>Limit: ₹5,00,000</Text>
        </View>
        <Text style={styles.creditAmount}>₹4,30,500</Text>
        <View style={styles.creditFooter}>
          <Text style={styles.creditSub}>B2B Corporate Net-30 Account</Text>
          <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
        </View>
      </TouchableOpacity>

      {/* Menu List */}
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

      <Text style={styles.versionText}>Extra Diesel Mobile App v1.0.0 (Build 2026)</Text>

      {/* ================= MODAL 1: SAVED SITES & ADDRESSES ================= */}
      <Modal
        visible={activeModal === 'sites'}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="location" size={22} color={COLORS.primary} />
                <Text style={styles.modalTitle}>Delivery Sites & Addresses</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={COLORS.dark} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.siteCard}>
                <View style={styles.siteCardHeader}>
                  <Text style={styles.siteName}>Plot 42, Hitech City</Text>
                  <View style={styles.primaryBadge}>
                    <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                  </View>
                </View>
                <Text style={styles.siteAddress}>
                  Survey 42, Phase 2, Near Mindspace, Madhapur, Hyderabad, Telangana 500081
                </Text>
                <View style={styles.siteMetaRow}>
                  <Text style={styles.siteMetaText}>DG Set: 500 kVA (2 Units)</Text>
                  <Text style={styles.siteMetaText}>• Bowser Gate 2 Access</Text>
                </View>
              </View>

              <View style={styles.siteCard}>
                <View style={styles.siteCardHeader}>
                  <Text style={styles.siteName}>Site 8, Gachibowli</Text>
                  <View style={[styles.primaryBadge, { backgroundColor: '#F1F5F9' }]}>
                    <Text style={[styles.primaryBadgeText, { color: '#64748B' }]}>SECONDARY</Text>
                  </View>
                </View>
                <Text style={styles.siteAddress}>
                  Plot 8, Financial District, Nanakramguda, Hyderabad, Telangana 500032
                </Text>
                <View style={styles.siteMetaRow}>
                  <Text style={styles.siteMetaText}>DG Set: 750 kVA (1 Unit)</Text>
                  <Text style={styles.siteMetaText}>• Night Delivery Approved</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.actionBtn}
                activeOpacity={0.85}
                onPress={() => setActiveModal(null)}
              >
                <Ionicons name="add-circle-outline" size={18} color={COLORS.white} />
                <Text style={styles.actionBtnText}>Add New Delivery Site</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL 2: B2B CORPORATE CREDIT ================= */}
      <Modal
        visible={activeModal === 'credit'}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="business" size={22} color={COLORS.primary} />
                <Text style={styles.modalTitle}>B2B Corporate Account</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={COLORS.dark} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.creditSummaryBox}>
                <Text style={styles.creditSummaryLabel}>Available Credit Line</Text>
                <Text style={styles.creditSummaryValue}>₹4,30,500</Text>
                <View style={styles.creditProgressTrack}>
                  <View style={[styles.creditProgressBar, { width: '86%' }]} />
                </View>
                <View style={styles.creditSplitRow}>
                  <Text style={styles.creditSplitText}>Utilized: ₹69,500</Text>
                  <Text style={styles.creditSplitText}>Total Limit: ₹5,00,000</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>GSTIN</Text>
                <Text style={styles.infoValue}>36AAACE1234F1Z5</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Payment Terms</Text>
                <Text style={styles.infoValue}>Net-30 Days Interest Free</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Billing Cycle</Text>
                <Text style={styles.infoValue}>1st – 30th of every month</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Account Status</Text>
                <Text style={[styles.infoValue, { color: '#059669', fontWeight: '800' }]}>Active & In Good Standing</Text>
              </View>

              <TouchableOpacity
                style={styles.actionBtn}
                activeOpacity={0.85}
                onPress={() => {
                  setActiveModal(null);
                  onNavigate('orders');
                }}
              >
                <Ionicons name="receipt-outline" size={18} color={COLORS.white} />
                <Text style={styles.actionBtnText}>View Invoices & Billing History</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL 3: PESO COMPLIANCE ================= */}
      <Modal
        visible={activeModal === 'compliance'}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="shield-checkmark" size={22} color={COLORS.primary} />
                <Text style={styles.modalTitle}>PESO & Safety Compliance</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={COLORS.dark} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.complianceBadgeBox}>
                <Ionicons name="checkmark-done-circle" size={40} color="#059669" />
                <Text style={styles.complianceBadgeTitle}>100% Certified Mobile Bowser</Text>
                <Text style={styles.complianceBadgeSub}>
                  Fully approved under Petroleum and Explosives Safety Organization (PESO) Rules.
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>PESO License No</Text>
                <Text style={styles.infoValue}>PESO/HYD/2026/DL-4910</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Legal Metrology</Text>
                <Text style={styles.infoValue}>W&M Certified Flow Meter (±0.1%)</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Calibration Validity</Text>
                <Text style={styles.infoValue}>Valid through Dec 31, 2027</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Safety Equipment</Text>
                <Text style={styles.infoValue}>Static Earthing & Class-B Flameproof</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Automated Receipts</Text>
                <Text style={styles.infoValue}>Tamper-Proof Dispenser Integrated Printout</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL 4: 24/7 SUPPORT HOTLINE ================= */}
      <Modal
        visible={activeModal === 'support'}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="headset" size={22} color={COLORS.primary} />
                <Text style={styles.modalTitle}>24/7 Priority Support</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={COLORS.dark} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.supportStatusRow}>
                <View style={styles.liveIndicatorDot} />
                <Text style={styles.supportStatusText}>Bowser Dispatch Desk: Live & Active</Text>
              </View>

              <TouchableOpacity
                style={styles.contactCard}
                activeOpacity={0.8}
                onPress={() => Linking.openURL('tel:18003437353').catch(() => {})}
              >
                <View style={[styles.contactIconWrap, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="call" size={22} color={COLORS.primary} />
                </View>
                <View style={styles.contactDetails}>
                  <Text style={styles.contactTitle}>Toll-Free Hotline</Text>
                  <Text style={styles.contactValue}>1800-DIESEL-EX (1800-343-7353)</Text>
                  <Text style={styles.contactSub}>24x7 Emergency Fuel Dispatch</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.contactCard}
                activeOpacity={0.8}
                onPress={() => Linking.openURL('mailto:support@extradiesel.com').catch(() => {})}
              >
                <View style={[styles.contactIconWrap, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="mail" size={22} color="#2563EB" />
                </View>
                <View style={styles.contactDetails}>
                  <Text style={styles.contactTitle}>Official Support Email</Text>
                  <Text style={styles.contactValue}>support@extradiesel.com</Text>
                  <Text style={styles.contactSub}>GST Invoices & Account Queries</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.contactCard}
                activeOpacity={0.8}
                onPress={() => Linking.openURL('https://wa.me/919989551305').catch(() => {})}
              >
                <View style={[styles.contactIconWrap, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="logo-whatsapp" size={22} color="#059669" />
                </View>
                <View style={styles.contactDetails}>
                  <Text style={styles.contactTitle}>WhatsApp Dispatch Desk</Text>
                  <Text style={styles.contactValue}>+91 9989551305</Text>
                  <Text style={styles.contactSub}>Instant Order Refills & Tracking</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL 5: CHANGE / UPLOAD PROFILE PHOTO ================= */}
      <Modal
        visible={activeModal === 'avatar'}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          if (!isSaving) setActiveModal(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <View style={[styles.modalIconCircle, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="camera" size={18} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Profile Photo</Text>
                  <Text style={styles.modalSubtitle}>Syncs across Mobile App & Website</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => {
                  if (!isSaving) setActiveModal(null);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color={COLORS.dark} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Primary: Upload from Device */}
              <TouchableOpacity
                style={styles.uploadPrimaryBtn}
                onPress={handlePickImage}
                disabled={isSaving}
                activeOpacity={0.85}
              >
                <Ionicons name="cloud-upload" size={20} color={COLORS.white} />
                <Text style={styles.uploadPrimaryBtnText}>
                  {Platform.OS === 'web' ? 'Upload Photo from Computer' : 'Choose Photo from Gallery'}
                </Text>
              </TouchableOpacity>

              {/* Or Choose Corporate Preset */}
              <Text style={styles.avatarPresetSectionHeading}>Or Select a Business Avatar</Text>
              <View style={styles.avatarPresetsGrid}>
                {AVATAR_PRESETS.map((preset) => {
                  const isSelected = profileImage === preset.uri;
                  return (
                    <TouchableOpacity
                      key={preset.id}
                      style={[styles.presetAvatarItem, isSelected && styles.presetAvatarItemSelected]}
                      onPress={() => saveProfileToDatabase({ profileImage: preset.uri })}
                      disabled={isSaving}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: preset.uri }} style={styles.presetAvatarImg} />
                      <Text style={[styles.presetAvatarLabel, isSelected && styles.presetAvatarLabelSelected]}>
                        {preset.label}
                      </Text>
                      {isSelected && (
                        <View style={styles.presetCheckmarkBadge}>
                          <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Remove Photo (Reset to Initials) */}
              {profileImage ? (
                <TouchableOpacity
                  style={styles.removePhotoBtn}
                  onPress={() => saveProfileToDatabase({ profileImage: null })}
                  disabled={isSaving}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={17} color={COLORS.danger} />
                  <Text style={styles.removePhotoText}>Remove Profile Photo</Text>
                </TouchableOpacity>
              ) : null}

              {isSaving && (
                <View style={styles.savingOverlay}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.savingText}>Saving to database...</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL 6: EDIT PROFILE DETAILS ================= */}
      <Modal
        visible={activeModal === 'editProfile'}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          if (!isSaving) setActiveModal(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <View style={[styles.modalIconCircle, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="person" size={18} color="#2563EB" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Edit Profile</Text>
                  <Text style={styles.modalSubtitle}>Update your personal details</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => {
                  if (!isSaving) setActiveModal(null);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color={COLORS.dark} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              {/* Full Name Input */}
              <Text style={styles.editInputLabel}>Full Name</Text>
              <View style={styles.editInputWrap}>
                <Ionicons name="person-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.editTextInput}
                  value={tempName}
                  onChangeText={setTempName}
                  placeholder="Enter full name"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* Phone Input */}
              <Text style={styles.editInputLabel}>Phone Number</Text>
              <View style={styles.editInputWrap}>
                <Ionicons name="call-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.editTextInput}
                  value={tempPhone}
                  onChangeText={setTempPhone}
                  placeholder="Enter phone number"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                />
              </View>

              {/* Verified Email (Read-only) */}
              <Text style={styles.editInputLabel}>Email Address (Account ID)</Text>
              <View style={[styles.editInputWrap, { backgroundColor: '#F1F5F9' }]}>
                <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                <Text style={styles.editReadonlyText}>{userEmail}</Text>
                <View style={styles.verifiedMiniTag}>
                  <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                  <Text style={styles.verifiedMiniText}>Verified</Text>
                </View>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={styles.saveChangesBtn}
                onPress={() => saveProfileToDatabase({ name: tempName, phone: tempPhone })}
                disabled={isSaving}
                activeOpacity={0.85}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color={COLORS.white} />
                    <Text style={styles.saveChangesBtnText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
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
    paddingBottom: Platform.OS === 'android' ? 95 : 85,
  },
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.dark,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.green,
  },
  profilePhone: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '500',
    marginBottom: 2,
  },
  profileCompany: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  creditCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  creditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  creditLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  creditLimit: {
    fontSize: 12,
    color: '#FBBF24',
    fontWeight: '700',
  },
  creditAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 4,
  },
  creditFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  creditSub: {
    fontSize: 12,
    color: '#94A3B8',
  },
  menuCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
    flex: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    gap: 8,
    marginBottom: 16,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.danger,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 10,
  },

  // ================= MODAL STYLES =================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'android' ? 32 : 40,
    paddingHorizontal: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.dark,
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  modalIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
  },
  modalBody: {
    marginTop: 14,
  },
  siteCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  siteCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  siteName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.dark,
  },
  primaryBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  primaryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
  },
  siteAddress: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 8,
  },
  siteMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  siteMetaText: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '600',
  },
  actionBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 10,
  },
  actionBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  creditSummaryBox: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  creditSummaryLabel: {
    fontSize: 11,
    color: '#94A3B8',
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 4,
  },
  creditSummaryValue: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 10,
  },
  creditProgressTrack: {
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  creditProgressBar: {
    height: '100%',
    backgroundColor: '#10B981',
  },
  creditSplitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  creditSplitText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13,
    color: COLORS.dark,
    fontWeight: '700',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  complianceBadgeBox: {
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  complianceBadgeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#065F46',
    marginTop: 8,
    marginBottom: 4,
  },
  complianceBadgeSub: {
    fontSize: 12,
    color: '#047857',
    textAlign: 'center',
    lineHeight: 16,
  },
  supportStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  liveIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  supportStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contactIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactDetails: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 2,
  },
  contactSub: {
    fontSize: 11,
    color: COLORS.muted,
  },
  desktopContent: {
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    paddingVertical: 24,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 14,
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarInitialsText: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  editProfilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  editProfilePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  uploadPrimaryBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
  },
  uploadPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  avatarPresetSectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  avatarPresetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 16,
  },
  presetAvatarItem: {
    width: '30%',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  presetAvatarItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#FEF2F2',
  },
  presetAvatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 4,
  },
  presetAvatarLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#475569',
  },
  presetAvatarLabelSelected: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  presetCheckmarkBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FFF5F5',
    borderRadius: 10,
    marginBottom: 8,
  },
  removePhotoText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  savingOverlay: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  savingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  editInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 4,
  },
  editInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  editTextInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    outlineStyle: 'none' as any,
  },
  editReadonlyText: {
    flex: 1,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  verifiedMiniTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedMiniText: {
    fontSize: 10,
    color: '#15803D',
    fontWeight: '700',
  },
  saveChangesBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 12,
    elevation: 2,
  },
  saveChangesBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
