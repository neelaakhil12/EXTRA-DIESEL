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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { ScreenName } from '../types';

interface ProfileScreenProps {
  user?: {
    name: string;
    email: string;
    phone: string;
  };
  onLogout: () => void;
  onNavigate: (screen: ScreenName) => void;
}

type ActiveModal = 'sites' | 'credit' | 'compliance' | 'support' | null;

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ user, onLogout, onNavigate }) => {
  const userName = user?.name || 'Akhil Kumar';
  const userPhone = user?.phone || '+91 98765 43210';
  const userEmail = user?.email || 'akhil@extradiesel.com';

  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={32} color={COLORS.primary} />
        </View>
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
});
