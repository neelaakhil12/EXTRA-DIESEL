import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Platform } from 'react-native';
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

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ user, onLogout, onNavigate }) => {
  const userName = user?.name || 'Akhil Kumar';
  const userPhone = user?.phone || '+91 98765 43210';
  const userEmail = user?.email || 'akhil@extradiesel.com';
  const menuItems = [
    { icon: 'location-outline', label: 'Delivery Sites & Addresses', action: () => Alert.alert('Saved Sites', '1. Plot 42 Hitech City\n2. Site 8 Gachibowli') },
    { icon: 'business-outline', label: 'B2B Corporate Credit Account', action: () => Alert.alert('Corporate B2B', 'Credit Limit: ₹5,00,000\nAvailable: ₹4,30,500\nGSTIN: 36AAACE1234F1Z5') },
    { icon: 'receipt-outline', label: 'GST Tax Invoices', action: () => onNavigate('orders') },
    { icon: 'calendar-outline', label: 'Subscription Manager', action: () => onNavigate('subscription') },
    { icon: 'shield-checkmark-outline', label: 'PESO & Legal Metrology Compliance', action: () => Alert.alert('Compliance', 'Extra Diesel operates 100% PESO compliant bowsers with legal metrology certified flow meters.') },
    { icon: 'help-circle-outline', label: '24/7 Support Hotline', action: () => Alert.alert('Helpdesk', 'Call: 1800-DIESEL-EX\nEmail: support@extradiesel.com') },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={36} color={COLORS.primary} />
        </View>
        <View style={styles.profileInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.profileName}>{userName}</Text>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={COLORS.green} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          </View>
          <Text style={styles.profilePhone}>{userPhone}</Text>
          <Text style={styles.profileCompany}>{userEmail}</Text>
        </View>
      </View>

      {/* Credit Line Highlight */}
      <View style={styles.creditCard}>
        <View style={styles.creditHeader}>
          <Text style={styles.creditLabel}>Available Fuel Credit</Text>
          <Text style={styles.creditLimit}>Limit: ₹5,00,000</Text>
        </View>
        <Text style={styles.creditAmount}>₹4,30,500</Text>
        <Text style={styles.creditSub}>B2B Corporate Net-30 Account</Text>
      </View>

      {/* Menu List */}
      <View style={styles.menuCard}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.menuItem, index < menuItems.length - 1 && styles.menuItemBorder]}
            onPress={item.action}
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
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.dark,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.greenDark,
  },
  profilePhone: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  profileCompany: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  creditCard: {
    backgroundColor: COLORS.dark,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  creditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  creditLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  creditLimit: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: '700',
  },
  creditAmount: {
    color: COLORS.white,
    fontSize: 26,
    fontWeight: '900',
  },
  creditSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    marginTop: 4,
  },
  menuCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
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
    borderBottomColor: COLORS.border,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    gap: 8,
    marginBottom: 20,
  },
  logoutText: {
    color: COLORS.danger,
    fontSize: 15,
    fontWeight: '700',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.muted,
  },
});
