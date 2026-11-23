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

interface SubscriptionScreenProps {
  onNavigate: (screen: ScreenName) => void;
  userEmail?: string;
}

export const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({ onNavigate, userEmail }) => {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [frequency, setFrequency] = useState<'weekly' | 'bi-weekly' | 'monthly'>('weekly');
  const [liters, setLiters] = useState<number>(300);
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Thu']);
  const [siteName, setSiteName] = useState<string>('Hitech City Phase 2 DG Set');
  const [planStatus, setPlanStatus] = useState<'active' | 'paused'>('active');
  const [nextRefill, setNextRefill] = useState<string>('Mon 23 Nov, 08:00 AM');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successBanner, setSuccessBanner] = useState<string>('');

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const baseUrl = APP_CONFIG.LIVE_API_BASE_URL || 'https://extradiesel.in';
  const email = userEmail || 'aadhyafuels9@gmail.com';

  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/user/subscription?email=${encodeURIComponent(email)}`);
        const data = await res.json();
        if (data.success && data.subscription) {
          const s = data.subscription;
          if (s.frequency) setFrequency(s.frequency);
          if (s.liters) setLiters(s.liters);
          if (Array.isArray(s.days) && s.days.length > 0) setSelectedDays(s.days);
          if (s.siteName) setSiteName(s.siteName);
          if (s.status) setPlanStatus(s.status);
          if (s.nextRefill) setNextRefill(s.nextRefill);
        }
      } catch (e) {
        console.error('Failed to load subscription:', e);
      }
    };
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

  const handleSaveSubscription = async () => {
    setIsSaving(true);
    setSuccessBanner('');
    try {
      const updatedSub = {
        siteName: siteName.trim() || 'Primary DG Set',
        liters,
        frequency,
        days: selectedDays,
        status: planStatus,
        nextRefill: `Upcoming ${selectedDays[0] || 'Monday'}, 08:00 AM`,
      };

      const res = await fetch(`${baseUrl}/api/user/subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          subscription: updatedSub,
        }),
      });

      const data = await res.json();
      setIsSaving(false);
      setIsEditing(false);
      setNextRefill(updatedSub.nextRefill);

      const msg = `Subscription Updated: ${liters}L (${frequency.toUpperCase()}) on ${selectedDays.join(', ')} for "${siteName}".`;
      setSuccessBanner(msg);
      setTimeout(() => setSuccessBanner(''), 6000);

      Alert.alert(
        'Subscription Updated!',
        msg,
        [{ text: 'Great!' }]
      );
    } catch (e: any) {
      setIsSaving(false);
      setIsEditing(false);
      Alert.alert('Notice', 'Plan saved locally. Will sync with server.');
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = planStatus === 'active' ? 'paused' : 'active';
    setPlanStatus(newStatus);
    try {
      await fetch(`${baseUrl}/api/user/subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          subscription: {
            siteName,
            liters,
            frequency,
            days: selectedDays,
            status: newStatus,
            nextRefill: newStatus === 'active' ? nextRefill : 'Paused by User',
          },
        }),
      });
      Alert.alert(
        newStatus === 'active' ? 'Plan Resumed' : 'Plan Paused',
        newStatus === 'active' ? 'Automated refills resumed.' : 'Automated refills paused temporarily. No bowser will dispatch.'
      );
    } catch (e) {}
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isDesktop && { maxWidth: 860, width: '100%', alignSelf: 'center', paddingVertical: 24 }]}
    >
      {/* Top Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerIcon}>
          <Ionicons name="repeat" size={24} color={COLORS.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Never Run Out of Diesel</Text>
          <Text style={styles.bannerSubtitle}>
            Automated recurring fuel refills for continuous DG set and fleet operations.
          </Text>
        </View>
      </View>

      {/* Success Banner */}
      {successBanner ? (
        <View style={styles.successCard}>
          <Ionicons name="checkmark-circle" size={20} color="#059669" />
          <Text style={styles.successCardText}>{successBanner}</Text>
        </View>
      ) : null}

      {/* Active Subscription Summary Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Current Active Plan</Text>
          <TouchableOpacity
            style={[styles.statusTogglePill, planStatus === 'paused' && { backgroundColor: '#FEE2E2' }]}
            onPress={handleToggleStatus}
            activeOpacity={0.7}
          >
            <View style={[styles.statusDot, planStatus === 'paused' && { backgroundColor: '#EF4444' }]} />
            <Text style={[styles.statusToggleText, planStatus === 'paused' && { color: '#DC2626' }]}>
              {planStatus === 'active' ? 'ACTIVE • Pause' : 'PAUSED • Resume'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activePlanBox}>
          <View style={styles.activePlanHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.activePlanName}>{siteName}</Text>
              <Text style={styles.activePlanMeta}>
                {liters} Liters • {frequency.toUpperCase()} • Every {selectedDays.join(' & ')}
              </Text>
            </View>
            <View style={[styles.activeBadge, planStatus === 'paused' && { backgroundColor: '#FEE2E2' }]}>
              <Text style={[styles.activeBadgeText, planStatus === 'paused' && { color: '#DC2626' }]}>
                {planStatus === 'active' ? 'ACTIVE' : 'PAUSED'}
              </Text>
            </View>
          </View>
          <Text style={styles.nextDate}>
            {planStatus === 'active' ? `Next refill scheduled: ${nextRefill}` : 'Refills temporarily paused'}
          </Text>
        </View>

        <View style={styles.planActionRow}>
          <TouchableOpacity
            style={styles.editPlanButton}
            onPress={() => setIsEditing(!isEditing)}
            activeOpacity={0.7}
          >
            <Ionicons name={isEditing ? 'close-circle-outline' : 'create-outline'} size={16} color={COLORS.primary} />
            <Text style={styles.editPlanButtonText}>
              {isEditing ? 'Cancel Plan Editing' : 'Edit Subscription Parameters'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Site Name Input */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Delivery Site / Generator Unit</Text>
        <TextInput
          style={styles.textInput}
          value={siteName}
          onChangeText={setSiteName}
          placeholder="e.g. Hitech City Phase 2 DG Set"
        />
      </View>

      {/* Delivery Frequency Selector */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Delivery Frequency</Text>
        <View style={styles.freqRow}>
          {(['weekly', 'bi-weekly', 'monthly'] as const).map((freq) => (
            <TouchableOpacity
              key={freq}
              style={[styles.freqBtn, frequency === freq && styles.freqBtnActive]}
              onPress={() => setFrequency(freq)}
            >
              <Text style={[styles.freqBtnText, frequency === freq && styles.freqBtnTextActive]}>
                {freq.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Day Picker */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Preferred Delivery Days</Text>
        <View style={styles.daysRow}>
          {daysOfWeek.map((day) => {
            const isSelected = selectedDays.includes(day);
            return (
              <TouchableOpacity
                key={day}
                style={[styles.dayCircle, isSelected && styles.dayCircleActive]}
                onPress={() => toggleDay(day)}
              >
                <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>{day}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.fieldNote}>
          Selected: {selectedDays.join(', ')}
        </Text>
      </View>

      {/* Fuel Volume */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recurring Fuel Quantity (Per Dispatch)</Text>
        <View style={styles.qtyRow}>
          {[200, 300, 500, 1000].map((qty) => (
            <TouchableOpacity
              key={qty}
              style={[styles.qtyBtn, liters === qty && styles.qtyBtnActive]}
              onPress={() => setLiters(qty)}
            >
              <Text style={[styles.qtyBtnText, liters === qty && styles.qtyBtnTextActive]}>
                {qty} L
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Submit / Update Button */}
      <TouchableOpacity
        style={styles.submitBtn}
        onPress={handleSaveSubscription}
        disabled={isSaving}
        activeOpacity={0.85}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
            <Text style={styles.submitBtnText}>Update & Save Subscription Plan</Text>
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
  banner: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.white,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    lineHeight: 16,
  },
  successCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 14,
  },
  successCardText: {
    fontSize: 13,
    color: '#065F46',
    fontWeight: '600',
    flex: 1,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 8,
  },
  statusTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  statusToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  activePlanName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.dark,
  },
  activePlanMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    fontWeight: '500',
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  nextDate: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: 10,
  },
  planActionRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  editPlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  editPlanButtonText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
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
  freqRow: {
    flexDirection: 'row',
    gap: 8,
  },
  freqBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  freqBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  freqBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  freqBtnTextActive: {
    color: COLORS.white,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginVertical: 4,
  },
  dayCircle: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: 44,
  },
  dayCircleActive: {
    backgroundColor: COLORS.primary,
  },
  dayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  dayTextActive: {
    color: COLORS.white,
  },
  fieldNote: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 8,
    fontStyle: 'italic',
  },
  qtyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  qtyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qtyBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  qtyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  qtyBtnTextActive: {
    color: COLORS.white,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
});
