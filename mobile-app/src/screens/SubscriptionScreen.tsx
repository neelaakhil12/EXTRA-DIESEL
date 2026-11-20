import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { ScreenName } from '../types';

interface SubscriptionScreenProps {
  onNavigate: (screen: ScreenName) => void;
}

export const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({ onNavigate }) => {
  const [frequency, setFrequency] = useState<'weekly' | 'bi-weekly' | 'monthly'>('weekly');
  const [liters, setLiters] = useState<number>(300);
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Thu']);

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== day));
      }
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleCreateSubscription = () => {
    Alert.alert(
      'Subscription Activated!',
      `Auto-delivery scheduled for ${liters}L (${frequency}) on ${selectedDays.join(', ')}. Never run out of diesel!`,
      [{ text: 'OK', onPress: () => onNavigate('home') }]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Highlight Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerIcon}>
          <Ionicons name="repeat" size={24} color={COLORS.secondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Never Run Out of Diesel</Text>
          <Text style={styles.bannerSubtitle}>
            Automated recurring fuel refills for continuous DG set and fleet operations.
          </Text>
        </View>
      </View>

      {/* Frequency Selector */}
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
      </View>

      {/* Fuel Volume */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recurring Fuel Quantity</Text>
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

      {/* Active Subscriptions List */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Active Plan</Text>
        <View style={styles.activePlanBox}>
          <View style={styles.activePlanHeader}>
            <View>
              <Text style={styles.activePlanName}>Hitech City Phase 2 DG Set</Text>
              <Text style={styles.activePlanMeta}>300 Liters • Every Monday & Thursday</Text>
            </View>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>ACTIVE</Text>
            </View>
          </View>
          <Text style={styles.nextDate}>Next refill scheduled: Mon 23 Nov, 08:00 AM</Text>
        </View>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={styles.submitBtn}
        onPress={handleCreateSubscription}
        activeOpacity={0.85}
      >
        <Text style={styles.submitBtnText}>Save Subscription Plan</Text>
        <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
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
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 12,
  },
  freqRow: {
    flexDirection: 'row',
    gap: 8,
  },
  freqBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  freqBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  freqBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
  },
  freqBtnTextActive: {
    color: COLORS.white,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.dark,
  },
  dayTextActive: {
    color: COLORS.white,
  },
  qtyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  qtyBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qtyBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  qtyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.dark,
  },
  qtyBtnTextActive: {
    color: COLORS.white,
  },
  activePlanBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activePlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  activePlanName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.dark,
  },
  activePlanMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.greenDark,
  },
  nextDate: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
