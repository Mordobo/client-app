import { ServiceAreaMap, type ServiceAreaMapHandle } from '@/components/ServiceAreaMap';
import { Toast } from '@/components/Toast';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { t } from '@/i18n';
import {
  loadProviderServiceArea,
  saveProviderServiceArea,
  type ProviderServiceAreaState,
  type ServiceZoneItem,
  RADIUS_MIN_KM,
  RADIUS_MAX_KM,
} from '@/utils/providerServiceArea';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FALLBACK_MAP_CENTER = { latitude: 19.4326, longitude: -99.1332 };

function makeZoneId(): string {
  return `z-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

function formatReverseGeocode(place: Location.LocationGeocodedAddress): string {
  const parts = [place.name, place.street, place.district, place.city, place.region, place.country].filter(
    (p): p is string => Boolean(p && String(p).trim().length > 0)
  );
  const joined = parts.join(', ');
  return joined.length > 0 ? joined : '—';
}

export default function ProviderServiceAreaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const queryClient = useQueryClient();
  const mapRef = useRef<ServiceAreaMapHandle>(null);
  const mapCenterRef = useRef(FALLBACK_MAP_CENTER);

  const [state, setState] = useState<ProviderServiceAreaState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [addZoneModalVisible, setAddZoneModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoneNameInput, setZoneNameInput] = useState('');
  const [locationBusy, setLocationBusy] = useState(false);
  const [showUserOnMap, setShowUserOnMap] = useState(false);
  const sliderWidthRef = useRef(0);
  const sliderStartXRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (!cancelled && status === Location.PermissionStatus.GRANTED) {
        setShowUserOnMap(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyReverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const first = results[0];
      if (first) {
        const line = formatReverseGeocode(first);
        setState((prev) => (prev ? { ...prev, baseAddress: line } : null));
      } else {
        setToast({ message: t('providerDashboard.providerServiceArea.reverseGeocodeFailed'), type: 'error' });
      }
    } catch {
      setToast({ message: t('providerDashboard.providerServiceArea.reverseGeocodeFailed'), type: 'error' });
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadProviderServiceArea();
      setState(data);
      if (data.latitude != null && data.longitude != null) {
        mapCenterRef.current = { latitude: data.latitude, longitude: data.longitude };
      }
    } catch {
      setToast({ message: t('providerDashboard.providerServiceArea.loadFailed'), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async () => {
    if (!state) return;
    setSaving(true);
    try {
      await saveProviderServiceArea(state);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      queryClient.invalidateQueries({ queryKey: ['providerScheduleConfig'] });
      setToast({ message: t('providerDashboard.providerServiceArea.saveSuccess'), type: 'success' });
    } catch {
      setToast({ message: t('providerDashboard.providerServiceArea.saveFailed'), type: 'error' });
    } finally {
      setSaving(false);
    }
  }, [state, queryClient]);

  const setRadius = useCallback((km: number) => {
    const clamped = Math.max(RADIUS_MIN_KM, Math.min(RADIUS_MAX_KM, km));
    setState((prev) => (prev ? { ...prev, radiusKm: clamped } : null));
  }, []);

  const onSliderLayout = useCallback((e: LayoutChangeEvent) => {
    sliderWidthRef.current = e.nativeEvent.layout.width;
  }, []);

  const updateRadiusFromX = useCallback(
    (x: number) => {
      const w = sliderWidthRef.current;
      if (w <= 0) return;
      const ratio = Math.max(0, Math.min(1, x / w));
      const km = Math.round(RADIUS_MIN_KM + ratio * (RADIUS_MAX_KM - RADIUS_MIN_KM));
      setRadius(km);
    },
    [setRadius]
  );

  const updateRadiusFromXRef = useRef(updateRadiusFromX);
  updateRadiusFromXRef.current = updateRadiusFromX;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const w = sliderWidthRef.current;
        const x = Math.max(0, Math.min(w, evt.nativeEvent.locationX));
        sliderStartXRef.current = x;
        updateRadiusFromXRef.current(x);
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      },
      onPanResponderMove: (_evt, gestureState) => {
        const w = sliderWidthRef.current;
        if (w <= 0) return;
        const x = Math.max(0, Math.min(w, sliderStartXRef.current + gestureState.dx));
        updateRadiusFromXRef.current(x);
      },
    })
  ).current;

  const toggleZone = useCallback((id: string, enabled: boolean) => {
    setState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        zones: prev.zones.map((z) => (z.id === id ? { ...z, enabled } : z)),
      };
    });
  }, []);

  const removeZone = useCallback((id: string) => {
    setState((prev) => {
      if (!prev) return null;
      return { ...prev, zones: prev.zones.filter((z) => z.id !== id) };
    });
  }, []);

  const setDistanceCharge = useCallback(
    (updates: Partial<Pick<ProviderServiceAreaState, 'distanceChargeEnabled' | 'distanceChargeAfterKm' | 'distanceChargeRatePerKm'>>) => {
      setState((prev) => (prev ? { ...prev, ...updates } : null));
    },
    []
  );

  const onBaseCoordinateChange = useCallback(
    (lat: number, lng: number) => {
      setState((prev) => (prev ? { ...prev, latitude: lat, longitude: lng } : null));
      mapCenterRef.current = { latitude: lat, longitude: lng };
      void applyReverseGeocode(lat, lng);
    },
    [applyReverseGeocode]
  );

  const onRegionComplete = useCallback((lat: number, lng: number) => {
    mapCenterRef.current = { latitude: lat, longitude: lng };
  }, []);

  const openLocationModal = useCallback(() => {
    setSearchQuery(state?.baseAddress ?? '');
    setLocationModalVisible(true);
  }, [state?.baseAddress]);

  const runAddressSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setLocationBusy(true);
    try {
      const hits = await Location.geocodeAsync(q);
      const hit = hits[0];
      if (!hit) {
        setToast({ message: t('providerDashboard.providerServiceArea.geocodeFailed'), type: 'error' });
        return;
      }
      const lat = hit.latitude;
      const lng = hit.longitude;
      setState((prev) => (prev ? { ...prev, latitude: lat, longitude: lng, baseAddress: q } : null));
      mapCenterRef.current = { latitude: lat, longitude: lng };
      await applyReverseGeocode(lat, lng);
      setLocationModalVisible(false);
    } catch {
      setToast({ message: t('providerDashboard.providerServiceArea.geocodeFailed'), type: 'error' });
    } finally {
      setLocationBusy(false);
    }
  }, [searchQuery, applyReverseGeocode]);

  const applyDeviceGpsLocation = useCallback(async () => {
    setLocationBusy(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        setToast({ message: t('providerDashboard.providerServiceArea.locationPermissionDenied'), type: 'error' });
        return;
      }
      setShowUserOnMap(true);
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setState((prev) => (prev ? { ...prev, latitude: lat, longitude: lng } : null));
      mapCenterRef.current = { latitude: lat, longitude: lng };
      await applyReverseGeocode(lat, lng);
      setLocationModalVisible(false);
    } catch {
      setToast({ message: t('providerDashboard.providerServiceArea.geocodeFailed'), type: 'error' });
    } finally {
      setLocationBusy(false);
    }
  }, [applyReverseGeocode]);

  const confirmAddZone = useCallback(() => {
    const name = zoneNameInput.trim();
    if (!name || !state) return;
    const c = mapCenterRef.current;
    const item: ServiceZoneItem = {
      id: makeZoneId(),
      name,
      enabled: true,
      latitude: c.latitude,
      longitude: c.longitude,
    };
    setState((prev) => (prev ? { ...prev, zones: [...prev.zones, item] } : null));
    setZoneNameInput('');
    setAddZoneModalVisible(false);
  }, [zoneNameInput, state]);

  if (loading || !state) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('providerDashboard.providerServiceArea.title')}</Text>
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  const radiusRatio = (state.radiusKm - RADIUS_MIN_KM) / (RADIUS_MAX_KM - RADIUS_MIN_KM);

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('providerDashboard.providerServiceArea.title')}</Text>
        <TouchableOpacity style={styles.saveButton} onPress={save} disabled={saving} activeOpacity={0.8}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.saveButtonText, { color: colors.primary }]}>{t('providerDashboard.providerServiceArea.save')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.mapCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.mapWrap}>
          <ServiceAreaMap
            ref={mapRef}
            latitude={state.latitude}
            longitude={state.longitude}
            radiusKm={state.radiusKm}
            primaryColor={colors.primary}
            isDark={isDark}
            showsUserLocation={showUserOnMap}
            onBaseCoordinateChange={onBaseCoordinateChange}
            onRegionComplete={onRegionComplete}
          />
          <View style={styles.zoomControls}>
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={() => mapRef.current?.zoomIn()}
              accessibilityLabel={t('providerDashboard.providerServiceArea.zoomInA11y')}
            >
              <Text style={[styles.zoomButtonText, { color: colors.textSecondary }]}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={() => mapRef.current?.zoomOut()}
              accessibilityLabel={t('providerDashboard.providerServiceArea.zoomOutA11y')}
            >
              <Text style={[styles.zoomButtonText, { color: colors.textSecondary }]}>−</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.baseLocationRow}>
          <Text style={styles.locationIcon}>📍</Text>
          <View style={styles.baseLocationText}>
            <Text style={[styles.baseLocationLabel, { color: colors.textPrimary }]}>
              {t('providerDashboard.providerServiceArea.baseLocation')}
            </Text>
            <Text style={[styles.baseLocationAddress, { color: colors.textTertiary }]} numberOfLines={2}>
              {state.baseAddress || '—'}
            </Text>
          </View>
          <TouchableOpacity onPress={openLocationModal} activeOpacity={0.8}>
            <Text style={[styles.editLink, { color: colors.primary }]}>{t('providerDashboard.providerServiceArea.edit')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
          {t('providerDashboard.providerServiceArea.sectionCoverageRadius')}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.radiusRow}>
            <Text style={[styles.radiusLabel, { color: colors.textPrimary }]}>
              {t('providerDashboard.providerServiceArea.currentRadius')}
            </Text>
            <Text style={[styles.radiusValue, { color: colors.primary }]}>{state.radiusKm} km</Text>
          </View>
          <View style={styles.sliderTrack} onLayout={onSliderLayout} {...panResponder.panHandlers}>
            <View style={[styles.sliderTrackInner, { width: `${radiusRatio * 100}%`, backgroundColor: colors.primary }]} />
            <View
              style={[
                styles.sliderThumb,
                { left: `${radiusRatio * 100}%`, marginLeft: -10, borderColor: colors.card, backgroundColor: colors.primary },
              ]}
            />
          </View>
          <View style={styles.sliderLabels}>
            <Text style={[styles.sliderLabelText, { color: colors.textTertiary }]}>{RADIUS_MIN_KM} km</Text>
            <Text style={[styles.sliderLabelText, { color: colors.textTertiary }]}>{RADIUS_MAX_KM} km</Text>
          </View>
        </View>

        <View style={styles.zonesHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary, marginBottom: 0 }]}>
            {t('providerDashboard.providerServiceArea.sectionSpecificZones')}
          </Text>
          <TouchableOpacity onPress={() => setAddZoneModalVisible(true)} activeOpacity={0.8}>
            <Text style={[styles.addZoneLink, { color: colors.primary }]}>{t('providerDashboard.providerServiceArea.addZone')}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.zonesList}>
          {state.zones.map((zone: ServiceZoneItem) => (
            <View key={zone.id} style={[styles.zoneRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.zoneLeft}>
                <View style={[styles.zoneIcon, zone.enabled ? styles.zoneIconOn : styles.zoneIconOff]}>
                  <Text style={styles.zoneIconText}>📍</Text>
                </View>
                <Text
                  style={[styles.zoneName, { color: colors.textPrimary }, !zone.enabled && { color: colors.textTertiary }]}
                  numberOfLines={1}
                >
                  {zone.name}
                </Text>
              </View>
              <View style={styles.zoneActions}>
                <TouchableOpacity
                  onPress={() => removeZone(zone.id)}
                  style={styles.zoneTrash}
                  accessibilityLabel={t('providerDashboard.providerServiceArea.removeZoneA11y')}
                  accessibilityRole="button"
                >
                  <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <Switch
                  value={zone.enabled}
                  onValueChange={(v) => toggleZone(zone.id, v)}
                  trackColor={{ false: colors.cardBorder, true: 'rgba(34, 197, 94, 0.4)' }}
                  thumbColor={zone.enabled ? '#4ADE80' : colors.textTertiary}
                />
              </View>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
          {t('providerDashboard.providerServiceArea.sectionDistanceCharge')}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.distanceChargeRow}>
            <Text style={[styles.distanceChargeLabel, { color: colors.textPrimary }]}>
              {t('providerDashboard.providerServiceArea.distanceChargeLabel')}
            </Text>
            <Switch
              value={state.distanceChargeEnabled}
              onValueChange={(v) => setDistanceCharge({ distanceChargeEnabled: v })}
              trackColor={{ false: colors.cardBorder, true: 'rgba(34, 197, 94, 0.4)' }}
              thumbColor={state.distanceChargeEnabled ? '#4ADE80' : colors.textTertiary}
            />
          </View>
          <View style={[styles.distanceChargeInputRow, { backgroundColor: colors.background }]}>
            <View style={styles.afterKmRow}>
              <Text style={[styles.afterKmLabel, { color: colors.textSecondary }]}>
                {t('providerDashboard.providerServiceArea.afterKmBefore')}
              </Text>
              <TextInput
                style={[styles.afterKmInput, { color: colors.textPrimary }]}
                value={String(state.distanceChargeAfterKm)}
                onChangeText={(text) => {
                  const digits = text.replace(/\D/g, '');
                  if (digits === '') {
                    setDistanceCharge({ distanceChargeAfterKm: 0 });
                    return;
                  }
                  const n = parseInt(digits, 10);
                  if (!Number.isNaN(n)) setDistanceCharge({ distanceChargeAfterKm: n });
                }}
                onBlur={() => {
                  if (state.distanceChargeAfterKm < 0) setDistanceCharge({ distanceChargeAfterKm: 0 });
                }}
                keyboardType="number-pad"
                placeholder="10"
                placeholderTextColor={colors.textTertiary}
              />
              <Text style={[styles.afterKmSuffix, { color: colors.textSecondary }]}>
                {t('providerDashboard.providerServiceArea.afterKmAfter')}
              </Text>
            </View>
            <View style={styles.perKmRow}>
              <Text style={[styles.currencySymbol, { color: colors.textTertiary }]}>$</Text>
              <TextInput
                style={[styles.perKmInput, { color: colors.textPrimary }]}
                value={String(state.distanceChargeRatePerKm)}
                onChangeText={(text) => {
                  const digits = text.replace(/\D/g, '');
                  if (digits === '') {
                    setDistanceCharge({ distanceChargeRatePerKm: 0 });
                    return;
                  }
                  const n = parseInt(digits, 10);
                  if (!Number.isNaN(n)) setDistanceCharge({ distanceChargeRatePerKm: n });
                }}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
              />
              <Text style={[styles.perKmSuffix, { color: colors.textTertiary }]}>{t('providerDashboard.providerServiceArea.perKm')}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal visible={locationModalVisible} animationType="slide" transparent onRequestClose={() => setLocationModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <TouchableOpacity style={styles.modalBackdropTouchable} activeOpacity={1} onPress={() => setLocationModalVisible(false)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('providerDashboard.providerServiceArea.setLocationTitle')}</Text>
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('providerDashboard.providerServiceArea.searchAddress')}</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.cardBorder }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('providerDashboard.providerServiceArea.baseLocationPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
            />
            <TouchableOpacity
              style={[styles.modalPrimary, { backgroundColor: colors.primary }]}
              onPress={() => void runAddressSearch()}
              disabled={locationBusy}
            >
              {locationBusy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalPrimaryText}>{t('providerDashboard.providerServiceArea.searchButton')}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalSecondary, { borderColor: colors.cardBorder }]}
              onPress={() => void applyDeviceGpsLocation()}
              disabled={locationBusy}
            >
              <Text style={[styles.modalSecondaryText, { color: colors.primary }]}>
                {t('providerDashboard.providerServiceArea.useDeviceLocation')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setLocationModalVisible(false)}>
              <Text style={{ color: colors.textSecondary }}>{t('providerDashboard.providerServiceArea.addZoneCancel')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={addZoneModalVisible} animationType="fade" transparent onRequestClose={() => setAddZoneModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={styles.modalBackdropTouchable} activeOpacity={1} onPress={() => setAddZoneModalVisible(false)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('providerDashboard.providerServiceArea.addZone')}</Text>
            <Text style={[styles.modalHint, { color: colors.textTertiary }]}>{t('providerDashboard.providerServiceArea.addZoneFromMapHint')}</Text>
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('providerDashboard.providerServiceArea.zoneNameLabel')}</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.cardBorder }]}
              value={zoneNameInput}
              onChangeText={setZoneNameInput}
              placeholder={t('providerDashboard.providerServiceArea.zoneNameLabel')}
              placeholderTextColor={colors.textTertiary}
            />
            <TouchableOpacity
              style={[styles.modalPrimary, { backgroundColor: colors.primary }]}
              onPress={confirmAddZone}
              disabled={!zoneNameInput.trim()}
            >
              <Text style={styles.modalPrimaryText}>{t('providerDashboard.providerServiceArea.addZoneConfirm')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setAddZoneModalVisible(false)}>
              <Text style={{ color: colors.textSecondary }}>{t('providerDashboard.providerServiceArea.addZoneCancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {toast && (
        <Toast message={toast.message} visible type={toast.type} onHide={() => setToast(null)} duration={3000} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'column' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, fontSize: 18, fontWeight: '700' },
  saveButton: { paddingVertical: 8, paddingHorizontal: 12, minWidth: 60, alignItems: 'flex-end' },
  saveButtonText: { fontSize: 14, fontWeight: '600' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1, minHeight: 0 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 32 },
  sectionTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  mapCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  mapWrap: {
    height: 220,
    position: 'relative',
  },
  zoomControls: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'column',
    gap: 4,
    zIndex: 4,
  },
  zoomButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomButtonText: { fontSize: 16 },
  baseLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
  },
  locationIcon: { fontSize: 18 },
  baseLocationText: { flex: 1 },
  baseLocationLabel: { fontSize: 14, fontWeight: '500' },
  baseLocationAddress: { fontSize: 12, marginTop: 2 },
  editLink: { fontSize: 12 },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  radiusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  radiusLabel: { fontSize: 14 },
  radiusValue: { fontWeight: '700', fontSize: 18 },
  sliderTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 8,
    position: 'relative',
    justifyContent: 'center',
  },
  sliderTrackInner: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 4,
  },
  sliderThumb: {
    position: 'absolute',
    top: '50%',
    marginTop: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderLabelText: { fontSize: 12 },
  zonesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addZoneLink: { fontSize: 13, fontWeight: '600' },
  zonesList: { gap: 8, marginBottom: 20 },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  zoneLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 8 },
  zoneIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  zoneIconOn: { backgroundColor: 'rgba(34, 197, 94, 0.15)' },
  zoneIconOff: { backgroundColor: 'rgba(255,255,255,0.05)' },
  zoneIconText: { fontSize: 14 },
  zoneName: { fontSize: 14, flex: 1 },
  zoneActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  zoneTrash: { padding: 4 },
  distanceChargeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  distanceChargeLabel: { fontSize: 14 },
  distanceChargeInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  afterKmRow: { flexDirection: 'row', alignItems: 'center' },
  afterKmLabel: { fontSize: 14 },
  afterKmInput: {
    width: 44,
    fontSize: 14,
    paddingHorizontal: 4,
    paddingVertical: 0,
  },
  afterKmSuffix: { fontSize: 14 },
  perKmRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  currencySymbol: {},
  perKmInput: {
    minWidth: 48,
    fontSize: 14,
    textAlign: 'right',
    padding: 0,
  },
  perKmSuffix: {},
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdropTouchable: {
    flex: 1,
  },
  modalSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 28,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  modalHint: { fontSize: 12, marginBottom: 12, lineHeight: 16 },
  modalLabel: { fontSize: 13, marginBottom: 6 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 14,
  },
  modalPrimary: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalPrimaryText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  modalSecondary: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  modalSecondaryText: { fontWeight: '600', fontSize: 15 },
  modalCancel: { alignItems: 'center', paddingVertical: 10 },
});
