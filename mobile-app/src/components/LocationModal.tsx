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
import * as Location from 'expo-location';

export interface SavedLocation {
  plotNo?: string;
  street?: string;
  area?: string;
  landmark?: string;
  city?: string;
  pincode?: string;
  fullAddress: string;
  shortAddress?: string;
  locationLink?: string;
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

export const LocationModal: React.FC<LocationModalProps> = ({
  visible,
  onClose,
  onSaveLocation,
  currentLocation,
}) => {
  const [address, setAddress] = useState(currentLocation?.fullAddress || '');
  const [locationLink, setLocationLink] = useState(
    currentLocation?.locationLink ||
    (currentLocation?.lat && currentLocation?.lon
      ? `https://maps.google.com/?q=${currentLocation.lat.toFixed(6)},${currentLocation.lon.toFixed(6)}`
      : '')
  );
  const [shortAddress, setShortAddress] = useState(currentLocation?.shortAddress || '');
  const [coords, setCoords] = useState<{ lat?: number; lon?: number }>({
    lat: currentLocation?.lat,
    lon: currentLocation?.lon,
  });

  const [isLocating, setIsLocating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const baseUrl = APP_CONFIG.LIVE_API_BASE_URL || 'https://extradiesel.in';
  const mapboxToken = APP_CONFIG.MAPBOX_ACCESS_TOKEN || '';

  // Apply location details from coordinates dynamically using Native Geocoder + Server OSM / Mapbox
  const applyCoordinatesLocation = async (latitude: number, longitude: number) => {
    try {
      setStatusMessage('Detecting detailed site address & landmarks...');
      setCoords({ lat: latitude, lon: longitude });

      const mapsUrl = `https://maps.google.com/?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`;
      setLocationLink(mapsUrl);

      let detectedPlot = '';
      let detectedStreet = '';
      let detectedLandmark = '';
      let detectedColony = '';
      let detectedSuburb = '';
      let detectedCity = 'Hyderabad';
      let detectedState = 'Telangana';
      let detectedPincode = '';

      // 1. Mobile Native Geocoder via expo-location (uses Android Google Play Services / iOS MapKit)
      if (Platform.OS !== 'web') {
        try {
          const geoResults = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (geoResults && geoResults.length > 0) {
            const g = geoResults[0];
            const isPlusCode = (t?: string | null) => t && /^[A-Z0-9]{4,8}\+/i.test(t.trim());

            if (g.name && !isPlusCode(g.name)) {
              if (/^\d+/.test(g.name)) {
                detectedPlot = `Plot No ${g.name}`;
              } else if (g.name !== g.street) {
                detectedLandmark = g.name;
              }
            }
            if (g.streetNumber && !detectedPlot) {
              detectedPlot = `Plot No ${g.streetNumber}`;
            }
            if (g.street && !isPlusCode(g.street)) {
              detectedStreet = g.street;
            }
            if (g.district && !isPlusCode(g.district)) {
              detectedColony = g.district;
            }
            if (g.subregion && g.subregion !== g.city && !isPlusCode(g.subregion)) {
              detectedSuburb = g.subregion;
            }
            if (g.city) detectedCity = g.city;
            if (g.region) detectedState = g.region;
            if (g.postalCode) detectedPincode = g.postalCode;
          }
        } catch (nativeErr) {
          console.warn('Native reverseGeocode error:', nativeErr);
        }
      }

      // 2. Server Reverse Geocode API (OSM Nominatim + Mapbox Places POI)
      try {
        const res = await fetch(
          `${baseUrl}/api/location/reverse-geocode?lat=${latitude}&lon=${longitude}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.location) {
            const loc = data.location;
            if (loc.plotNo && !detectedPlot) {
              detectedPlot = loc.plotNo.startsWith('Plot') ? loc.plotNo : `Plot No ${loc.plotNo}`;
            }
            if (loc.street && !detectedStreet) detectedStreet = loc.street;
            if (loc.landmark && !detectedLandmark) detectedLandmark = loc.landmark;
            if (loc.area) {
              const parts = loc.area.split(',').map((p: string) => p.trim());
              if (!detectedColony && parts[0]) detectedColony = parts[0];
              if (!detectedSuburb && parts[1]) detectedSuburb = parts[1];
            }
            if (loc.city && detectedCity === 'Hyderabad') detectedCity = loc.city;
            if (loc.state) detectedState = loc.state;
            if (loc.pincode && !detectedPincode) detectedPincode = loc.pincode;
          }
        }
      } catch (srvErr) {
        console.warn('Backend geocode error:', srvErr);
      }

      // 3. Fallback Mapbox Places API directly if needed
      if ((!detectedStreet || !detectedColony) && mapboxToken) {
        try {
          const mbUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxToken}&types=address,poi,neighborhood,locality,place,postcode`;
          const mbRes = await fetch(mbUrl);
          if (mbRes.ok) {
            const mbData = await mbRes.json();
            if (mbData.features && mbData.features.length > 0) {
              const feat = mbData.features[0];
              const ctx = feat.context || [];
              const isPlusCode = (t?: string | null) => t && /^[A-Z0-9]{4,8}\+/i.test(t.trim());

              if (!detectedStreet && feat.text && !isPlusCode(feat.text)) {
                detectedStreet = feat.text;
              }
              ctx.forEach((c: any) => {
                if (!detectedPincode && c.id.startsWith('postcode')) detectedPincode = c.text;
                else if (!detectedColony && c.id.startsWith('neighborhood')) detectedColony = c.text;
                else if (!detectedSuburb && c.id.startsWith('locality')) detectedSuburb = c.text;
                else if (c.id.startsWith('place')) detectedCity = c.text;
                else if (c.id.startsWith('region')) detectedState = c.text;
              });

              const poi = mbData.features.find((f: any) => f.place_type && f.place_type.includes('poi'));
              if (poi && poi.text && !detectedLandmark) detectedLandmark = poi.text;
            }
          }
        } catch (mbErr) {
          console.warn('Mapbox direct error:', mbErr);
        }
      }

      // Format Landmark neatly (e.g., "near Vinayaka mandapamu")
      let landmarkStr = '';
      if (detectedLandmark) {
        landmarkStr = detectedLandmark.toLowerCase().startsWith('near')
          ? detectedLandmark
          : `near ${detectedLandmark}`;
      } else if (detectedColony && detectedColony !== detectedSuburb) {
        landmarkStr = `near ${detectedColony}`;
      }

      // Construct detailed address array
      const addressParts = [
        detectedPlot,
        detectedStreet,
        landmarkStr,
        detectedColony,
        detectedSuburb && detectedSuburb !== detectedColony ? detectedSuburb : '',
        detectedCity,
        detectedState ? `${detectedState} ${detectedPincode}`.trim() : detectedPincode,
      ].filter(Boolean);

      const fullDetailed = addressParts.join(', ') || `Site Location, ${detectedCity}, ${detectedState} ${detectedPincode}`.trim();
      setAddress(fullDetailed);

      // Short address for header pill (e.g., "Chaitanya Hills, Almasguda")
      const shortHeader = [detectedColony || detectedStreet, detectedSuburb || detectedCity].filter(Boolean).join(', ') || detectedCity;
      setShortAddress(shortHeader);

      setStatusMessage(`📍 Pinned: ${shortHeader}`);
      setTimeout(() => setStatusMessage(''), 4500);
    } catch (e) {
      console.warn('Geocoding error:', e);
      setStatusMessage(`GPS pinned (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  // "Locate Me" GPS Reverse Geocoding
  const handleLocateMe = async () => {
    setIsLocating(true);
    setStatusMessage('Fetching live GPS coordinates...');

    // Mobile App Native GPS via expo-location
    if (Platform.OS !== 'web') {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setIsLocating(false);
          setStatusMessage('Location permission denied. Please enter address manually.');
          setTimeout(() => setStatusMessage(''), 4000);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const lat = loc.coords.latitude;
        const lon = loc.coords.longitude;
        setCoords({ lat, lon });

        await applyCoordinatesLocation(lat, lon);
      } catch (err: any) {
        setStatusMessage('GPS detection failed. Please enter address manually.');
        setTimeout(() => setStatusMessage(''), 4000);
      } finally {
        setIsLocating(false);
      }
      return;
    }

    // Web Browser Geolocation
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            await applyCoordinatesLocation(pos.coords.latitude, pos.coords.longitude);
          } finally {
            setIsLocating(false);
          }
        },
        (error) => {
          setIsLocating(false);
          setStatusMessage('Location permission denied or unavailable in browser.');
          setTimeout(() => setStatusMessage(''), 4000);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } else {
      setIsLocating(false);
      Alert.alert('Notice', 'GPS is not supported in this browser. Please enter your address manually.');
    }
  };

  const handleConfirm = () => {
    const full = address.trim() || 'Site Delivery Location, Hyderabad';
    const link = locationLink.trim() || (coords?.lat && coords?.lon ? `https://maps.google.com/?q=${coords.lat.toFixed(6)},${coords.lon.toFixed(6)}` : '');

    // Compute short address from full address if not set
    let short = shortAddress;
    if (!short) {
      const parts = full.split(',').map((p) => p.trim()).filter((p) => !/^[A-Z0-9]{4,8}\+/i.test(p));
      short = parts.slice(0, 2).join(', ') || parts[0] || 'Delivery Site';
    }

    const saved: SavedLocation = {
      fullAddress: full,
      shortAddress: short,
      locationLink: link,
      lat: coords?.lat,
      lon: coords?.lon,
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
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Set Delivery Location</Text>
                <Text style={styles.modalSub}>Doorstep Bowser Fueling Destination</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
                <Text style={styles.locateMeBtnSub}>Auto-detect full site address & Google Maps link</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>

            {/* Pinned Address Feedback Box */}
            {statusMessage ? (
              <View style={styles.statusBox}>
                <Ionicons name="checkmark-circle" size={17} color="#059669" />
                <Text style={styles.statusBoxText} numberOfLines={2}>{statusMessage}</Text>
              </View>
            ) : null}

            {/* Box 1: Delivery Address */}
            <View style={{ marginBottom: 14, marginTop: 4 }}>
              <View style={styles.inputHeaderRow}>
                <Text style={styles.inputLabel}>DELIVERY ADDRESS *</Text>
                <Text style={styles.inputHint}>(Full site details & landmark)</Text>
              </View>
              <TextInput
                style={styles.addressTextArea}
                placeholder="Enter or GPS-detect full delivery address (Plot/Door, Road, Landmark, Area, City, Pincode)"
                placeholderTextColor="#94A3B8"
                multiline={true}
                numberOfLines={3}
                value={address}
                onChangeText={setAddress}
                textAlignVertical="top"
              />
            </View>

            {/* Box 2: Current Location Link */}
            <View style={{ marginBottom: 16 }}>
              <View style={styles.inputHeaderRow}>
                <Text style={styles.inputLabel}>GPS LOCATION LINK (GOOGLE MAPS)</Text>
                {coords.lat && coords.lon && (
                  <View style={styles.coordsBadge}>
                    <Ionicons name="locate" size={11} color="#059669" />
                    <Text style={styles.coordsBadgeText}>GPS Pinned</Text>
                  </View>
                )}
              </View>
              <View style={styles.linkInputWrap}>
                <Ionicons name="globe-outline" size={18} color="#0284C7" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.linkInput}
                  placeholder="https://maps.google.com/?q=lat,lon"
                  placeholderTextColor="#94A3B8"
                  value={locationLink}
                  onChangeText={setLocationLink}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>
          </ScrollView>

          {/* Modal Footer Confirmation */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.88}>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  pinIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  modalBody: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 6,
  },
  locateMeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  locateMeBtnText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 14,
  },
  locateMeBtnSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
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
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
  },
  statusBoxText: {
    fontSize: 12.5,
    color: '#065F46',
    fontWeight: '700',
    flex: 1,
  },
  inputHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.3,
  },
  inputHint: {
    fontSize: 11,
    color: '#64748B',
  },
  coordsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  coordsBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  addressTextArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    color: '#0F172A',
    fontWeight: '500',
    minHeight: 82,
    lineHeight: 20,
  },
  linkInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  linkInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
    paddingVertical: 8,
  },
  modalFooter: {
    paddingHorizontal: 18,
    paddingVertical: 12,
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
    borderRadius: 11,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmBtnText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 14,
  },
});
