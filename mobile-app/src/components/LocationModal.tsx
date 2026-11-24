import React, { useState, useRef } from 'react';
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

interface PlaceSearchResult {
  id: string;
  name: string;
  placeName: string;
  lat: number;
  lon: number;
  plotNo?: string;
  street?: string;
  area?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export const LocationModal: React.FC<LocationModalProps> = ({
  visible,
  onClose,
  onSaveLocation,
  currentLocation,
}) => {
  const [plotNo, setPlotNo] = useState(currentLocation?.plotNo || '');
  const [street, setStreet] = useState(currentLocation?.street || '');
  const [area, setArea] = useState(currentLocation?.area || '');
  const [landmark, setLandmark] = useState(currentLocation?.landmark || '');
  const [city, setCity] = useState(currentLocation?.city || 'Hyderabad');
  const [pincode, setPincode] = useState(currentLocation?.pincode || '');
  const [coords, setCoords] = useState<{ lat?: number; lon?: number }>({
    lat: currentLocation?.lat,
    lon: currentLocation?.lon,
  });

  // Place Search & Autocomplete
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<any>(null);

  const [isLocating, setIsLocating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const baseUrl = APP_CONFIG.LIVE_API_BASE_URL || 'https://extradiesel.in';
  const mapboxToken = APP_CONFIG.MAPBOX_ACCESS_TOKEN || '';

  // Handle Search Input with Debounce
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (text.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      await performPlaceSearch(text.trim());
    }, 350);
  };

  const performPlaceSearch = async (query: string) => {
    try {
      // 1. Direct Mapbox Places API
      if (mapboxToken) {
        const mbUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&country=IN&proximity=78.4867,17.3850&types=poi,address,neighborhood,locality,place`;
        const mbRes = await fetch(mbUrl);
        if (mbRes.ok) {
          const mbData = await mbRes.json();
          if (mbData.features && mbData.features.length > 0) {
            const results: PlaceSearchResult[] = mbData.features.map((f: any) => {
              const ctx = f.context || [];
              let pNo = f.address || '';
              let st = f.text || '';
              let ar = '';
              let ct = 'Hyderabad';
              let pin = '';
              let lm = '';

              ctx.forEach((c: any) => {
                if (c.id.startsWith('postcode')) pin = c.text;
                else if (c.id.startsWith('neighborhood') || c.id.startsWith('locality')) ar = c.text;
                else if (c.id.startsWith('place')) ct = c.text;
              });

              if (f.place_type && f.place_type.includes('poi')) {
                lm = f.text;
              }

              return {
                id: f.id,
                name: f.text,
                placeName: f.place_name,
                lat: f.center[1],
                lon: f.center[0],
                plotNo: pNo,
                street: st,
                area: ar || f.text,
                landmark: lm,
                city: ct,
                pincode: pin,
              };
            });
            setSearchResults(results);
            setIsSearching(false);
            return;
          }
        }
      }

      // 2. Fallback to Backend Search API
      const res = await fetch(`${baseUrl}/api/location/search?query=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.results) {
          setSearchResults(data.results);
          setIsSearching(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Place search error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (item: PlaceSearchResult) => {
    setPlotNo(item.plotNo || '');
    setStreet(item.street || item.name || '');
    setArea(item.area || item.name || '');
    setLandmark(item.landmark || '');
    setCity(item.city || 'Hyderabad');
    setPincode(item.pincode || '');
    setCoords({ lat: item.lat, lon: item.lon });
    setSearchResults([]);
    setSearchQuery('');
    setStatusMessage(`📍 Pinned: ${item.name} (${item.lat.toFixed(4)}, ${item.lon.toFixed(4)})`);
    setTimeout(() => setStatusMessage(''), 4000);
  };

  const handleClearForm = () => {
    setPlotNo('');
    setStreet('');
    setArea('');
    setLandmark('');
    setCity('Hyderabad');
    setPincode('');
    setCoords({});
    setSearchQuery('');
    setSearchResults([]);
    setStatusMessage('Form cleared. Search or type your exact address.');
    setTimeout(() => setStatusMessage(''), 3000);
  };

  // Apply location details from coordinates using Server Engine (OSM Colony + Mapbox)
  const applyCoordinatesLocation = async (latitude: number, longitude: number) => {
    try {
      setStatusMessage('Pinning exact colony, street & landmark...');
      setCoords({ lat: latitude, lon: longitude });

      // 1. Primary: Server Reverse Geocode API (OSM Nominatim Colony + Mapbox Street/POI)
      try {
        const res = await fetch(
          `${baseUrl}/api/location/reverse-geocode?lat=${latitude}&lon=${longitude}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.location) {
            const loc = data.location;
            setPlotNo(loc.plotNo || '');
            setStreet(loc.street || '');
            setArea(loc.area || loc.city || 'Hyderabad');
            setLandmark(loc.landmark || '');
            setCity(loc.city || 'Hyderabad');
            setPincode(loc.pincode || '');
            setStatusMessage(`📍 Pinned: ${loc.area || loc.shortAddress}`);
            setTimeout(() => setStatusMessage(''), 4000);
            return;
          }
        }
      } catch (e1) {
        console.warn('Backend geocoding error, falling back to Mapbox:', e1);
      }

      // 2. Direct Mapbox Places API fallback
      if (mapboxToken) {
        const mbUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxToken}&types=address,poi,neighborhood,locality,place,postcode`;
        const mbRes = await fetch(mbUrl);

        if (mbRes.ok) {
          const mbData = await mbRes.json();
          if (mbData.features && mbData.features.length > 0) {
            const feat = mbData.features[0];
            const ctx = feat.context || [];

            let st = feat.text && !/^[A-Z0-9]{4,8}\+/i.test(feat.text) ? feat.text : '';
            let colony = '';
            let locality = '';
            let lm = '';
            let ct = 'Hyderabad';
            let pin = '';

            ctx.forEach((c: any) => {
              if (c.id.startsWith('postcode')) pin = c.text;
              else if (c.id.startsWith('neighborhood')) colony = c.text;
              else if (c.id.startsWith('locality')) locality = c.text;
              else if (c.id.startsWith('place')) ct = c.text;
            });

            const poi = mbData.features.find((f: any) => f.place_type && f.place_type.includes('poi'));
            if (poi && poi.text) lm = poi.text;

            const ar = [colony, locality].filter(Boolean).join(', ') || locality || ct;
            setPlotNo('');
            setStreet(st);
            setArea(ar);
            setLandmark(lm);
            setCity(ct);
            setPincode(pin);

            setStatusMessage(`📍 Pinned: ${ar}`);
            setTimeout(() => setStatusMessage(''), 4000);
            return;
          }
        }
      }
    } catch (e) {
      console.warn('Geocoding error:', e);
    }

    setStatusMessage(`GPS pinned (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  // "Locate Me" GPS Reverse Geocoding (Native Mobile GPS + Web Geolocation)
  const handleLocateMe = async () => {
    setIsLocating(true);
    setStatusMessage('Fetching GPS location...');

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
    // Strip any raw Plus Codes (e.g. 8G7W+54M)
    const isPlusCode = (t: string) => /^[A-Z0-9]{4,8}\+[A-Z0-9]{2,4}/i.test((t || '').trim());
    const cleanPlot = isPlusCode(plotNo) ? '' : plotNo.trim();
    const cleanStreet = isPlusCode(street) ? '' : street.trim();
    const cleanArea = isPlusCode(area) ? '' : area.trim();
    const cleanLm = landmark.trim();
    const cleanCt = city.trim() || 'Hyderabad';
    const cleanPin = pincode.trim();

    const parts = [cleanPlot, cleanStreet, cleanLm ? `Near ${cleanLm}` : '', cleanArea, cleanCt, cleanPin].filter(Boolean);
    const full = parts.join(', ');

    // Prefer Colony / Area in short display so user always sees their exact locality
    let short = '';
    if (cleanPlot && cleanStreet) {
      short = `${cleanPlot}, ${cleanStreet}`;
    } else if (cleanStreet && cleanArea) {
      short = `${cleanStreet}, ${cleanArea.split(',')[0]}`;
    } else if (cleanArea) {
      short = cleanArea;
    } else {
      short = cleanCt;
    }

    const saved: SavedLocation = {
      plotNo: cleanPlot,
      street: cleanStreet,
      area: cleanArea,
      landmark: cleanLm,
      city: cleanCt,
      pincode: cleanPin,
      fullAddress: full,
      shortAddress: short,
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
              <View>
                <Text style={styles.modalTitle}>Set Delivery Location</Text>
                <Text style={styles.modalSub}>Doorstep Bowser Fueling Destination</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* 1. Fast Location Search & Autocomplete Bar */}
            <View style={styles.searchSection}>
              <View style={styles.searchHeaderRow}>
                <Text style={styles.fieldSectionHeading}>Search Area, Colony or Landmark</Text>
                <TouchableOpacity onPress={handleClearForm} style={styles.clearFormBtn}>
                  <Ionicons name="trash-outline" size={13} color="#EF4444" />
                  <Text style={styles.clearFormText}>Clear Form</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={18} color="#64748B" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="e.g. Madhapur, Kondapur, Kukatpally, Gachibowli..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={handleSearchChange}
                />
                {isSearching ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : searchQuery.length > 0 ? (
                  <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                    <Ionicons name="close-circle" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Autocomplete Dropdown */}
              {searchResults.length > 0 && (
                <View style={styles.resultsDropdown}>
                  {searchResults.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.resultItem}
                      onPress={() => handleSelectSearchResult(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.resultIconWrap}>
                        <Ionicons name="location-sharp" size={16} color={COLORS.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resultTitle}>{item.name}</Text>
                        <Text style={styles.resultSubtitle} numberOfLines={2}>
                          {item.placeName}
                        </Text>
                      </View>
                      <Ionicons name="arrow-forward-circle-outline" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR AUTO-DETECT</Text>
              <View style={styles.dividerLine} />
            </View>

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

            {/* Desktop browser notice */}
            {Platform.OS === 'web' && (
              <View style={styles.desktopGpsNotice}>
                <Ionicons name="information-circle-outline" size={14} color="#64748B" />
                <Text style={styles.desktopGpsNoticeText}>
                  On PC/Laptop browsers, Wi-Fi location can resolve to your ISP telecom node (e.g. BN Reddy / Almasguda). Use the Search bar above or edit fields below for exact doorstep delivery.
                </Text>
              </View>
            )}

            {statusMessage ? (
              <View style={styles.statusBox}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.statusBoxText}>{statusMessage}</Text>
              </View>
            ) : null}

            {/* Address Fields Form */}
            <View style={styles.addressFormHeaderRow}>
              <Text style={styles.fieldSectionHeading}>Delivery Address & Landmark Details</Text>
              {coords.lat && coords.lon && (
                <View style={styles.coordsBadge}>
                  <Ionicons name="locate" size={12} color="#059669" />
                  <Text style={styles.coordsBadgeText}>
                    GPS: {coords.lat.toFixed(4)}, {coords.lon.toFixed(4)}
                  </Text>
                </View>
              )}
            </View>

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
  searchSection: {
    marginBottom: 14,
  },
  searchHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clearFormBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
  clearFormText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
  },
  resultsDropdown: {
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxHeight: 220,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  resultIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  resultSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  locateMeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  locateMeBtnText: {
    color: COLORS.white,
    fontSize: 14.5,
    fontWeight: '800',
  },
  locateMeBtnSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginTop: 2,
  },
  desktopGpsNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  desktopGpsNoticeText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    flex: 1,
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
  addressFormHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  fieldSectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coordsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  coordsBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#065F46',
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
