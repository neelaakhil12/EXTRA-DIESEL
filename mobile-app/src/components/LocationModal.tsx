import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { APP_CONFIG } from '../constants/config';

export interface SavedLocation {
  plotNo: string;
  street: string;
  area: string;
  landmark: string;
  city: string;
  pincode: string;
  fullAddress: string;
  shortAddress?: string;
  siteName?: string;
  siteType?: string;
  lat?: number;
  lon?: number;
}

interface LocationModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveLocation: (location: SavedLocation) => void;
  currentLocation?: SavedLocation | null;
}

const SITE_TYPES = [
  { id: 'dg_set', label: 'Generator (DG Set)', icon: 'hardware-chip-outline' },
  { id: 'commercial', label: 'Commercial Site', icon: 'business-outline' },
  { id: 'construction', label: 'Construction', icon: 'construct-outline' },
  { id: 'fleet', label: 'Fleet Yard', icon: 'car-sport-outline' },
  { id: 'residential', label: 'Residential', icon: 'home-outline' },
];

export const LocationModal: React.FC<LocationModalProps> = ({
  visible,
  onClose,
  onSaveLocation,
  currentLocation,
}) => {
  const [plotNo, setPlotNo] = useState(currentLocation?.plotNo || 'Plot 42');
  const [street, setStreet] = useState(currentLocation?.street || 'HITEC City Main Road');
  const [area, setArea] = useState(currentLocation?.area || 'Madhapur');
  const [landmark, setLandmark] = useState(currentLocation?.landmark || 'Near Cyber Towers Gate 3');
  const [city, setCity] = useState(currentLocation?.city || 'Hyderabad');
  const [pincode, setPincode] = useState(currentLocation?.pincode || '500081');
  const [selectedSiteType, setSelectedSiteType] = useState(currentLocation?.siteType || 'dg_set');
  const [isLocating, setIsLocating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const baseUrl = APP_CONFIG.LIVE_API_BASE_URL || 'https://extradiesel.in';

  // "Locate Me" GPS Reverse Geocoding
  const handleLocateMe = () => {
    setIsLocating(true);
    setStatusMessage('Fetching GPS location...');

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            setStatusMessage('Detecting street & landmark...');

            const res = await fetch(
              `${baseUrl}/api/location/reverse-geocode?lat=${latitude}&lon=${longitude}`
            );
            const data = await res.json();

            if (data.success && data.location) {
              const loc = data.location;
              if (loc.plotNo) setPlotNo(loc.plotNo);
              if (loc.street) setStreet(loc.street);
              if (loc.area) setArea(loc.area);
              if (loc.landmark) setLandmark(loc.landmark);
              if (loc.city) setCity(loc.city);
              if (loc.pincode) setPincode(loc.pincode);
              setStatusMessage('GPS location detected successfully!');
              setTimeout(() => setStatusMessage(''), 3000);
            }
          } catch (e) {
            setStatusMessage('Using nearby Hyderabad site coordinates.');
            setTimeout(() => setStatusMessage(''), 3000);
          } finally {
            setIsLocating(false);
          }
        },
        (error) => {
          setIsLocating(false);
          setStatusMessage('Location permission denied or unavailable. Please enter site details below.');
          setTimeout(() => setStatusMessage(''), 4000);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    } else {
      setIsLocating(false);
      Alert.alert('Notice', 'GPS is not supported in this browser. Please enter your address manually.');
    }
  };

  const handleConfirm = () => {
    const parts = [plotNo, street, landmark ? `Near ${landmark}` : '', area, city, pincode].filter(Boolean);
    const full = parts.join(', ');

    const saved: SavedLocation = {
      plotNo: plotNo.trim(),
      street: street.trim(),
      area: area.trim(),
      landmark: landmark.trim(),
      city: city.trim(),
      pincode: pincode.trim(),
      fullAddress: full,
      siteType: selectedSiteType,
    };

    onSaveLocation(saved);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.pinIconWrap}>
                <Ionicons name="location" size={22} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.modalTitle}>Set Delivery Location</Text>
                <Text style={styles.modalSub}>Doorstep Bowser Fueling Destination</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Locate Me Primary Action Button */}
            <TouchableOpacity
              style={styles.locateMeBtn}
              onPress={handleLocateMe}
              disabled={isLocating}
              activeOpacity={0.85}
            >
              {isLocating ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Ionicons name="navigate" size={20} color={COLORS.white} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.locateMeBtnText}>Use Current Location (GPS)</Text>
                <Text style={styles.locateMeBtnSub}>Auto-detect street, area, and nearby landmark</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>

            {statusMessage ? (
              <View style={styles.statusBox}>
                <Ionicons name="information-circle" size={16} color="#059669" />
                <Text style={styles.statusBoxText}>{statusMessage}</Text>
              </View>
            ) : null}

            {/* Site Type Selector */}
            <Text style={styles.fieldSectionHeading}>Site / Equipment Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.siteTypeScroll}>
              {SITE_TYPES.map((type) => {
                const isSelected = selectedSiteType === type.id;
                return (
                  <TouchableOpacity
                    key={type.id}
                    style={[styles.siteTypeChip, isSelected && styles.siteTypeChipActive]}
                    onPress={() => setSelectedSiteType(type.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={type.icon as any}
                      size={15}
                      color={isSelected ? COLORS.white : '#475569'}
                    />
                    <Text style={[styles.siteTypeChipText, isSelected && styles.siteTypeChipTextActive]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Address Fields Form */}
            <Text style={styles.fieldSectionHeading}>Delivery Address & Landmark Details</Text>

            <View style={styles.fieldRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Plot / Door / Flat No. *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Plot 42 / Gate 3"
                  value={plotNo}
                  onChangeText={setPlotNo}
                />
              </View>
              <View style={{ flex: 1.5 }}>
                <Text style={styles.inputLabel}>Street / Road Name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. HITEC City Main Rd"
                  value={street}
                  onChangeText={setStreet}
                />
              </View>
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={styles.inputLabel}>Key Landmark (For Bowser Driver Navigation) *</Text>
              <View style={styles.landmarkWrap}>
                <Ionicons name="flag-outline" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                <TextInput
                  style={[styles.textInput, { flex: 1, borderWidth: 0, paddingHorizontal: 0 }]}
                  placeholder="e.g. Opposite Mindspace Gate 1 / Cyber Towers"
                  value={landmark}
                  onChangeText={setLandmark}
                />
              </View>
            </View>

            <View style={styles.fieldRow}>
              <View style={{ flex: 1.5 }}>
                <Text style={styles.inputLabel}>Area / Locality *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Madhapur"
                  value={area}
                  onChangeText={setArea}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>City</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Hyderabad"
                  value={city}
                  onChangeText={setCity}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Pincode</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="500081"
                  keyboardType="number-pad"
                  value={pincode}
                  onChangeText={setPincode}
                />
              </View>
            </View>
          </ScrollView>

          {/* Confirm Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
              <Text style={styles.confirmBtnText}>Confirm & Pin Delivery Site</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 540,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pinIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  locateMeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  locateMeBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
  locateMeBtnSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11.5,
    marginTop: 2,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  statusBoxText: {
    fontSize: 12.5,
    color: '#065F46',
    fontWeight: '600',
    flex: 1,
  },
  fieldSectionHeading: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 6,
  },
  siteTypeScroll: {
    marginBottom: 14,
  },
  siteTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
  },
  siteTypeChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  siteTypeChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  siteTypeChipTextActive: {
    color: COLORS.white,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
    color: '#0F172A',
  },
  landmarkWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  confirmBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 13,
    borderRadius: 10,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
});
