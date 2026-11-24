import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { ScreenName } from '../types';
import { APP_CONFIG } from '../constants/config';
import { sendSystemNotification } from '../services/notificationService';

interface SubscriptionScreenProps {
  onNavigate: (screen: ScreenName) => void;
  userEmail?: string;
  userName?: string;
}

interface SubscriptionData {
  siteName: string;
  liters: number;
  frequency: 'weekly' | 'monthly';
  days: string[];
  status: 'active' | 'paused';
  nextRefill: string;
}

export const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({
  onNavigate,
  userEmail,
  userName,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [activePlan, setActivePlan] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreatingOrEditing, setIsCreatingOrEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successBanner, setSuccessBanner] = useState<string>('');

  // Form Fields
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('weekly');
  const [litersInput, setLitersInput] = useState<string>('200');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon']);
  const [siteName, setSiteName] = useState<string>('');
  const [deliverySlot, setDeliverySlot] = useState<string>('08:00 AM - 12:00 PM');

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const baseUrl = APP_CONFIG.LIVE_API_BASE_URL || 'https://extradiesel.in';
  const email = userEmail || 'aadhyafuels9@gmail.com';

  // Load User Subscription from Backend
  const loadSubscription = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${baseUrl}/api/user/subscription?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.success && data.subscription && data.subscription.status !== 'cancelled') {
        const s = data.subscription;
        setActivePlan({
          siteName: s.siteName || 'Primary Refuel Point',
          liters: Number(s.liters) || 200,
          frequency: s.frequency === 'monthly' ? 'monthly' : 'weekly',
          days: Array.isArray(s.days) && s.days.length > 0 ? s.days : ['Mon'],
          status: s.status === 'paused' ? 'paused' : 'active',
          nextRefill: s.nextRefill || 'Upcoming Monday, 08:00 AM',
        });
        setSiteName(s.siteName || '');
        setLitersInput(String(s.liters || 200));
        setFrequency(s.frequency === 'monthly' ? 'monthly' : 'weekly');
        if (Array.isArray(s.days)) setSelectedDays(s.days);
      } else {
        setActivePlan(null);
      }
    } catch (e) {
      setActivePlan(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubscription();
  }, [email]);

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== day));
      }
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  // Toggle Active / Paused
  const handleToggleStatus = async () => {
    if (!activePlan) return;
    const newStatus = activePlan.status === 'active' ? 'paused' : 'active';
    try {
      const updated = { ...activePlan, status: newStatus };
      setActivePlan(updated);
      await fetch(`${baseUrl}/api/user/subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, subscription: updated }),
      });
      setSuccessBanner(
        newStatus === 'active'
          ? 'Recurring refills resumed successfully!'
          : 'Subscription paused. No fuel dispatches will occur.'
      );
      setTimeout(() => setSuccessBanner(''), 4000);
    } catch (e) {}
  };

  // Cancel Subscription
  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your recurring diesel subscription plan? You can reactivate anytime.',
      [
        { text: 'Keep Active', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${baseUrl}/api/user/subscription?email=${encodeURIComponent(email)}`, {
                method: 'DELETE',
              });
              setActivePlan(null);
              setIsCreatingOrEditing(false);
              setSuccessBanner('Subscription cancelled successfully.');
              setTimeout(() => setSuccessBanner(''), 4000);
            } catch (e) {
              Alert.alert('Error', 'Failed to cancel subscription.');
            }
          },
        },
      ]
    );
  };

  // Save New or Edited Subscription Plan
  const handleSaveSubscription = async () => {
    const numericLiters = parseInt(litersInput, 10);
    if (isNaN(numericLiters) || numericLiters < 1) {
      Alert.alert('Invalid Liters', 'Please enter a valid quantity of 1 Liter or more.');
      return;
    }
    if (!siteName.trim()) {
      Alert.alert('Required', 'Please enter the delivery site name or DG set identifier.');
      return;
    }

    setIsSaving(true);
    try {
      const updatedSub: SubscriptionData = {
        siteName: siteName.trim(),
        liters: numericLiters,
        frequency,
        days: frequency === 'weekly' ? selectedDays : ['1st of Month'],
        status: 'active',
        nextRefill:
          frequency === 'weekly'
            ? `Upcoming ${selectedDays[0] || 'Monday'}, ${deliverySlot.split('-')[0].trim()}`
            : `1st of next month, ${deliverySlot.split('-')[0].trim()}`,
      };

      const res = await fetch(`${baseUrl}/api/user/subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, subscription: updatedSub }),
      });

      const data = await res.json();
      if (data.success) {
        setActivePlan(updatedSub);
        setIsCreatingOrEditing(false);
        setSuccessBanner(
          `Subscription Activated: ${numericLiters}L (${frequency.toUpperCase()}) for "${siteName.trim()}".`
        );
        setTimeout(() => setSuccessBanner(''), 5000);

        // Trigger system status bar notification
        sendSystemNotification(
          '⛽ Fuel Subscription Activated!',
          `Recurring ${numericLiters}L (${frequency.toUpperCase()}) refill scheduled for "${siteName.trim()}".`,
          'subscription'
        ).catch(() => {});
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to save subscription. Please try again.');
    } finally {
      setIsSaving(false);
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
      {/* Top Banner */}
      <View style={styles.heroBanner}>
        <View style={styles.bannerIconWrap}>
          <Ionicons name="repeat" size={24} color={COLORS.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Never Run Out of Diesel</Text>
          <Text style={styles.bannerSubtitle}>
            Automated recurring fuel refills for continuous DG sets, heavy machinery, and fleet operations.
          </Text>
        </View>
      </View>

      {/* Success Notification */}
      {successBanner ? (
        <View style={styles.successCard}>
          <Ionicons name="checkmark-circle" size={20} color="#059669" />
          <Text style={styles.successCardText}>{successBanner}</Text>
        </View>
      ) : null}

      {/* Loading Indicator */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Checking subscription status...</Text>
        </View>
      ) : isCreatingOrEditing ? (
        /* =========================================================================
           CREATE OR EDIT SUBSCRIPTION FORM
           ========================================================================= */
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>
              {activePlan ? 'Edit Subscription Parameters' : 'Setup New Fuel Subscription'}
            </Text>
            {activePlan && (
              <TouchableOpacity onPress={() => setIsCreatingOrEditing(false)}>
                <Text style={styles.cancelLinkText}>Cancel Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Delivery Site / DG Set Name */}
          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Delivery Site / Generator Unit *</Text>
            <TextInput
              style={styles.textInput}
              value={siteName}
              onChangeText={setSiteName}
              placeholder="e.g. Primary 250kVA Generator / Warehouse Fleet"
            />
          </View>

          {/* Delivery Frequency: ONLY WEEKLY & MONTHLY */}
          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Delivery Frequency *</Text>
            <View style={styles.freqRow}>
              <TouchableOpacity
                style={[styles.freqBtn, frequency === 'weekly' && styles.freqBtnActive]}
                onPress={() => setFrequency('weekly')}
                activeOpacity={0.8}
              >
                <Text style={[styles.freqBtnText, frequency === 'weekly' && styles.freqBtnTextActive]}>
                  WEEKLY
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.freqBtn, frequency === 'monthly' && styles.freqBtnActive]}
                onPress={() => setFrequency('monthly')}
                activeOpacity={0.8}
              >
                <Text style={[styles.freqBtnText, frequency === 'monthly' && styles.freqBtnTextActive]}>
                  MONTHLY
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Days of Week (When Weekly is Selected) */}
          {frequency === 'weekly' && (
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Preferred Delivery Days *</Text>
              <View style={styles.daysGrid}>
                {daysOfWeek.map((day) => {
                  const isSelected = selectedDays.includes(day);
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[styles.dayCircle, isSelected && styles.dayCircleActive]}
                      onPress={() => toggleDay(day)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>{day}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.helperText}>Selected Days: {selectedDays.join(', ')}</Text>
            </View>
          )}

          {/* Recurring Fuel Quantity (Manual Input from 1 Liter upwards) */}
          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Recurring Fuel Quantity (Per Dispatch) *</Text>
            <View style={styles.qtyInputRow}>
              <TextInput
                style={[styles.textInput, styles.qtyTextInput]}
                value={litersInput}
                onChangeText={setLitersInput}
                keyboardType="number-pad"
                placeholder="200"
              />
              <Text style={styles.litersUnitText}>Liters (BS-VI)</Text>
            </View>
            <Text style={styles.helperText}>Enter any quantity from 1 Liter upwards.</Text>
          </View>

          {/* Delivery Slot */}
          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Preferred Delivery Window</Text>
            <View style={styles.slotPillRow}>
              {['08:00 AM - 12:00 PM', '01:00 PM - 05:00 PM', '06:00 PM - 10:00 PM'].map((slot) => (
                <TouchableOpacity
                  key={slot}
                  style={[styles.slotPill, deliverySlot === slot && styles.slotPillActive]}
                  onPress={() => setDeliverySlot(slot)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.slotPillText, deliverySlot === slot && styles.slotPillTextActive]}>
                    {slot}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSaveSubscription}
            disabled={isSaving}
            activeOpacity={0.85}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                <Text style={styles.saveBtnText}>
                  {activePlan ? 'Update Subscription Plan' : 'Confirm & Activate Subscription'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {!activePlan && (
            <TouchableOpacity
              style={styles.cancelSecondaryBtn}
              onPress={() => setIsCreatingOrEditing(false)}
            >
              <Text style={styles.cancelSecondaryBtnText}>Back to Subscriptions</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : activePlan ? (
        /* =========================================================================
           ACTIVE SUBSCRIPTION PLAN DETAILS (When User has an Active Subscription)
           ========================================================================= */
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Current Active Plan</Text>
            <TouchableOpacity
              style={[styles.statusTogglePill, activePlan.status === 'paused' && { backgroundColor: '#FEE2E2' }]}
              onPress={handleToggleStatus}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.statusDot,
                  activePlan.status === 'paused' && { backgroundColor: '#EF4444' },
                ]}
              />
              <Text
                style={[
                  styles.statusToggleText,
                  activePlan.status === 'paused' && { color: '#DC2626' },
                ]}
              >
                {activePlan.status === 'active' ? 'ACTIVE • Pause' : 'PAUSED • Resume'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.activePlanBox}>
            <View style={styles.activePlanHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.activePlanName}>{activePlan.siteName}</Text>
                <Text style={styles.activePlanMeta}>
                  {activePlan.liters} Liters • {activePlan.frequency.toUpperCase()} • Every{' '}
                  {activePlan.days.join(' & ')}
                </Text>
              </View>
              <View
                style={[
                  styles.activeBadge,
                  activePlan.status === 'paused' && { backgroundColor: '#FEE2E2' },
                ]}
              >
                <Text
                  style={[
                    styles.activeBadgeText,
                    activePlan.status === 'paused' && { color: '#DC2626' },
                  ]}
                >
                  {activePlan.status === 'active' ? 'ACTIVE' : 'PAUSED'}
                </Text>
              </View>
            </View>

            <Text style={styles.nextDate}>
              {activePlan.status === 'active'
                ? `Next refill scheduled: ${activePlan.nextRefill}`
                : 'Refills temporarily paused. Tap resume anytime.'}
            </Text>
          </View>

          <View style={styles.activeActionsRow}>
            <TouchableOpacity
              style={styles.editParametersBtn}
              onPress={() => setIsCreatingOrEditing(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={16} color={COLORS.primary} />
              <Text style={styles.editParametersBtnText}>Edit Parameters</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelPlanBtn}
              onPress={handleCancelSubscription}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={16} color="#DC2626" />
              <Text style={styles.cancelPlanBtnText}>Cancel Plan</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* =========================================================================
           NO SUBSCRIPTION EMPTY STATE (For New Users with No Plan)
           ========================================================================= */
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="calendar-outline" size={38} color="#94A3B8" />
          </View>
          <Text style={styles.emptyTitle}>No Active Subscription Yet</Text>
          <Text style={styles.emptySubtitle}>
            Never worry about running out of diesel. Schedule automated recurring refills for your generators, construction machinery, or vehicle fleets.
          </Text>

          <TouchableOpacity
            style={styles.setupSubBtn}
            onPress={() => setIsCreatingOrEditing(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle-outline" size={20} color={COLORS.white} />
            <Text style={styles.setupSubBtnText}>Setup Recurring Fuel Subscription</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Benefits Card */}
      <View style={styles.card}>
        <Text style={styles.benefitsTitle}>Subscription Privileges</Text>
        <View style={styles.benefitItem}>
          <Ionicons name="shield-checkmark" size={18} color="#16A34A" />
          <Text style={styles.benefitText}>Guaranteed Priority Bowser Dispatch during peak grid power outages</Text>
        </View>
        <View style={styles.benefitItem}>
          <Ionicons name="time" size={18} color="#2563EB" />
          <Text style={styles.benefitText}>Dedicated recurring delivery time slots (Morning, Afternoon, Evening)</Text>
        </View>
        <View style={styles.benefitItem}>
          <Ionicons name="receipt" size={18} color="#D97706" />
          <Text style={styles.benefitText}>Automated GST tax invoices delivered immediately after each refuel</Text>
        </View>
      </View>

      {/* Clear English Policy Note at End of Page */}
      <View style={styles.policyNoteCard}>
        <View style={styles.policyNoteHeader}>
          <Ionicons name="information-circle" size={20} color="#2563EB" />
          <Text style={styles.policyNoteTitle}>Subscription Payment Policy</Text>
        </View>
        <Text style={styles.policyNoteBody}>
          Note: No upfront payment is required to activate a subscription plan. Fuel charges will be invoiced and payable only upon actual doorstep bowser dispensing. You can pause or cancel your recurring schedule anytime with zero cancellation fees.
        </Text>
      </View>
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
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  bannerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.white,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
    lineHeight: 16,
  },
  successCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  successCardText: {
    fontSize: 13,
    color: '#065F46',
    fontWeight: '600',
    flex: 1,
  },
  loadingWrap: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.dark,
    flex: 1,
  },
  cancelLinkText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
  },
  formGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12.5,
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
  freqRow: {
    flexDirection: 'row',
    gap: 10,
  },
  freqBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  freqBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  freqBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
  },
  freqBtnTextActive: {
    color: COLORS.white,
  },
  daysGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dayCircleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  dayTextActive: {
    color: COLORS.white,
  },
  helperText: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 6,
    fontWeight: '500',
  },
  qtyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  qtyTextInput: {
    width: 140,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  litersUnitText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.dark,
  },
  slotPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  slotPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  slotPillActive: {
    backgroundColor: '#FEF2F2',
    borderColor: COLORS.primary,
  },
  slotPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  slotPillTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
  cancelSecondaryBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 6,
  },
  cancelSecondaryBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    maxWidth: 420,
  },
  setupSubBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setupSubBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  statusTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statusToggleText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#065F46',
  },
  activePlanBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activePlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  activePlanName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.dark,
  },
  activePlanMeta: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  activeBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
  },
  nextDate: {
    fontSize: 12.5,
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: 10,
  },
  activeActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  editParametersBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 10,
    paddingVertical: 10,
  },
  editParametersBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  cancelPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FFE4E6',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelPlanBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 10,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 12.5,
    color: '#475569',
    flex: 1,
    lineHeight: 18,
  },
  policyNoteCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 16,
  },
  policyNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  policyNoteTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1E40AF',
  },
  policyNoteBody: {
    fontSize: 12.5,
    color: '#1E3A8A',
    lineHeight: 18,
  },
});
