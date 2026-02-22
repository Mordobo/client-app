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
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
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
import { Toast } from '@/components/Toast';
import { useQueryClient } from '@tanstack/react-query';

const BACKGROUND = '#12121A';
const CARD_BG = '#1E1B2E';
const CARD_BORDER = 'rgba(61, 51, 112, 0.2)';
const CARD_BORDER_MAP = 'rgba(61, 51, 112, 0.3)';
const SECTION_HEADER_COLOR = 'rgba(255,255,255,0.4)';
const PURPLE_ACTIVE = '#8B5CF6';

export default function ProviderServiceAreaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [state, setState] = useState<ProviderServiceAreaState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string } | null>(null);
  const [editingAddress, setEditingAddress] = useState(false);
  const [sliderWidth, setSliderWidth] = useState(0);
  const sliderWidthRef = useRef(0);
  const sliderStartXRef = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadProviderServiceArea();
      setState(data);
    } catch {
      setToast({ message: t('providerDashboard.providerServiceArea.saveFailed') });
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
      setToast({ message: t('providerDashboard.providerServiceArea.saveSuccess') });
    } catch {
      setToast({ message: t('providerDashboard.providerServiceArea.saveFailed') });
    } finally {
      setSaving(false);
    }
  }, [state, queryClient]);

  const setRadius = useCallback((km: number) => {
    const clamped = Math.max(RADIUS_MIN_KM, Math.min(RADIUS_MAX_KM, km));
    setState((prev) => (prev ? { ...prev, radiusKm: clamped } : null));
  }, []);

  const onSliderLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setSliderWidth(w);
    sliderWidthRef.current = w;
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

  const setDistanceCharge = useCallback(
    (updates: Partial<Pick<ProviderServiceAreaState, 'distanceChargeEnabled' | 'distanceChargeAfterKm' | 'distanceChargeRatePerKm'>>) => {
      setState((prev) => (prev ? { ...prev, ...updates } : null));
    },
    []
  );

  if (loading || !state) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          <Text style={styles.title}>{t('providerDashboard.providerServiceArea.title')}</Text>
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={PURPLE_ACTIVE} />
        </View>
      </View>
    );
  }

  const radiusRatio = (state.radiusKm - RADIUS_MIN_KM) / (RADIUS_MAX_KM - RADIUS_MIN_KM);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('providerDashboard.providerServiceArea.title')}</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={save}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color={PURPLE_ACTIVE} />
          ) : (
            <Text style={styles.saveButtonText}>{t('providerDashboard.providerServiceArea.save')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Map placeholder */}
        <View style={[styles.mapCard, { borderColor: CARD_BORDER_MAP }]}>
          <View style={styles.mapPlaceholder}>
            <View style={styles.mapCircle}>
              <View style={styles.mapDot} />
            </View>
            <View style={styles.zoomControls}>
              <TouchableOpacity style={styles.zoomButton} onPress={() => setRadius(state.radiusKm - 1)}>
                <Text style={styles.zoomButtonText}>−</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.zoomButton} onPress={() => setRadius(state.radiusKm + 1)}>
                <Text style={styles.zoomButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.baseLocationRow}>
            <Text style={styles.locationIcon}>📍</Text>
            <View style={styles.baseLocationText}>
              <Text style={styles.baseLocationLabel}>{t('providerDashboard.providerServiceArea.baseLocation')}</Text>
              {editingAddress ? (
                <TextInput
                  style={styles.addressInput}
                  value={state.baseAddress}
                  onChangeText={(text) => setState((prev) => (prev ? { ...prev, baseAddress: text } : null))}
                  placeholder={t('providerDashboard.providerServiceArea.baseLocationPlaceholder')}
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  autoFocus
                  onBlur={() => setEditingAddress(false)}
                />
              ) : (
                <Text style={styles.baseLocationAddress} numberOfLines={1}>
                  {state.baseAddress || '—'}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => setEditingAddress((v) => !v)}>
              <Text style={styles.editLink}>{t('providerDashboard.providerServiceArea.edit')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Coverage radius */}
        <Text style={styles.sectionTitle}>
          {t('providerDashboard.providerServiceArea.sectionCoverageRadius')}
        </Text>
        <View style={[styles.card, { borderColor: CARD_BORDER }]}>
          <View style={styles.radiusRow}>
            <Text style={styles.radiusLabel}>{t('providerDashboard.providerServiceArea.currentRadius')}</Text>
            <Text style={styles.radiusValue}>{state.radiusKm} km</Text>
          </View>
          <View
            style={styles.sliderTrack}
            onLayout={onSliderLayout}
            {...panResponder.panHandlers}
          >
            <View style={[styles.sliderTrackInner, { width: `${radiusRatio * 100}%` }]} />
            <View style={[styles.sliderThumb, { left: `${radiusRatio * 100}%`, marginLeft: -10 }]} />
          </View>
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabelText}>{RADIUS_MIN_KM} km</Text>
            <Text style={styles.sliderLabelText}>{RADIUS_MAX_KM} km</Text>
          </View>
        </View>

        {/* Specific zones */}
        <Text style={styles.sectionTitle}>
          {t('providerDashboard.providerServiceArea.sectionSpecificZones')}
        </Text>
        <View style={styles.zonesList}>
          {state.zones.map((zone: ServiceZoneItem) => (
            <View key={zone.id} style={[styles.zoneRow, { borderColor: CARD_BORDER }]}>
              <View style={styles.zoneLeft}>
                <View style={[styles.zoneIcon, zone.enabled ? styles.zoneIconOn : styles.zoneIconOff]}>
                  <Text style={styles.zoneIconText}>📍</Text>
                </View>
                <Text style={[styles.zoneName, !zone.enabled && styles.zoneNameOff]}>{zone.name}</Text>
              </View>
              <Switch
                value={zone.enabled}
                onValueChange={(v) => toggleZone(zone.id, v)}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(34, 197, 94, 0.4)' }}
                thumbColor={zone.enabled ? '#4ADE80' : 'rgba(255,255,255,0.4)'}
              />
            </View>
          ))}
        </View>

        {/* Distance charge */}
        <Text style={styles.sectionTitle}>
          {t('providerDashboard.providerServiceArea.sectionDistanceCharge')}
        </Text>
        <View style={[styles.card, { borderColor: CARD_BORDER }]}>
          <View style={styles.distanceChargeRow}>
            <Text style={styles.distanceChargeLabel}>
              {t('providerDashboard.providerServiceArea.distanceChargeLabel')}
            </Text>
            <Switch
              value={state.distanceChargeEnabled}
              onValueChange={(v) => setDistanceCharge({ distanceChargeEnabled: v })}
              trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(34, 197, 94, 0.4)' }}
              thumbColor={state.distanceChargeEnabled ? '#4ADE80' : 'rgba(255,255,255,0.4)'}
            />
          </View>
          <View style={styles.distanceChargeInputRow}>
            <View style={styles.afterKmRow}>
              <Text style={styles.afterKmLabel}>{t('providerDashboard.providerServiceArea.afterKmBefore')}</Text>
              <TextInput
                style={styles.afterKmInput}
                value={String(state.distanceChargeAfterKm)}
                onChangeText={(text) => {
                  const n = parseInt(text.replace(/\D/g, ''), 10);
                  if (!Number.isNaN(n)) setDistanceCharge({ distanceChargeAfterKm: n });
                }}
                keyboardType="number-pad"
                placeholder="10"
              />
              <Text style={styles.afterKmSuffix}>{t('providerDashboard.providerServiceArea.afterKmAfter')}</Text>
            </View>
            <View style={styles.perKmRow}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.perKmInput}
                value={String(state.distanceChargeRatePerKm)}
                onChangeText={(text) => {
                  const n = parseInt(text.replace(/\D/g, ''), 10);
                  if (!Number.isNaN(n)) setDistanceCharge({ distanceChargeRatePerKm: n });
                }}
                keyboardType="number-pad"
                placeholder="0"
              />
              <Text style={styles.perKmSuffix}>{t('providerDashboard.providerServiceArea.perKm')}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {toast && (
        <Toast
          message={toast.message}
          visible
          onHide={() => setToast(null)}
          type="success"
          duration={3000}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND },
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
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#fff' },
  saveButton: { paddingVertical: 8, paddingHorizontal: 12, minWidth: 60, alignItems: 'flex-end' },
  saveButtonText: { color: PURPLE_ACTIVE, fontSize: 14, fontWeight: '600' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },
  sectionTitle: {
    fontSize: 12,
    color: SECTION_HEADER_COLOR,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  mapCard: {
    borderRadius: 12,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    height: 192,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mapCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: PURPLE_ACTIVE,
  },
  zoomControls: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'column',
    gap: 4,
  },
  zoomButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomButtonText: { color: 'rgba(255,255,255,0.6)', fontSize: 16 },
  baseLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
  },
  locationIcon: { fontSize: 18 },
  baseLocationText: { flex: 1 },
  baseLocationLabel: { color: '#fff', fontSize: 14, fontWeight: '500' },
  baseLocationAddress: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  addressInput: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  editLink: { color: '#A78BFA', fontSize: 12 },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    marginBottom: 20,
  },
  radiusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  radiusLabel: { color: '#fff', fontSize: 14 },
  radiusValue: { color: PURPLE_ACTIVE, fontWeight: '700', fontSize: 18 },
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
    backgroundColor: PURPLE_ACTIVE,
  },
  sliderThumb: {
    position: 'absolute',
    top: '50%',
    marginTop: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: PURPLE_ACTIVE,
  },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderLabelText: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
  zonesList: { gap: 8, marginBottom: 20 },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    borderWidth: 1,
  },
  zoneLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  zoneIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  zoneIconOn: { backgroundColor: 'rgba(34, 197, 94, 0.15)' },
  zoneIconOff: { backgroundColor: 'rgba(255,255,255,0.05)' },
  zoneIconText: { fontSize: 14 },
  zoneName: { color: '#fff', fontSize: 14 },
  zoneNameOff: { color: 'rgba(255,255,255,0.4)' },
  distanceChargeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  distanceChargeLabel: { color: '#fff', fontSize: 14 },
  distanceChargeInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  afterKmRow: { flexDirection: 'row', alignItems: 'center' },
  afterKmLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  afterKmInput: {
    width: 40,
    color: '#fff',
    fontSize: 14,
    paddingHorizontal: 4,
    paddingVertical: 0,
  },
  afterKmSuffix: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  perKmRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  currencySymbol: { color: 'rgba(255,255,255,0.4)' },
  perKmInput: {
    minWidth: 48,
    color: '#fff',
    fontSize: 14,
    textAlign: 'right',
    padding: 0,
  },
  perKmSuffix: { color: 'rgba(255,255,255,0.4)' },
});
