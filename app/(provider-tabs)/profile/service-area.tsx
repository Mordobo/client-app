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

export default function ProviderServiceAreaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
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
        <TouchableOpacity
          style={styles.saveButton}
          onPress={save}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.saveButtonText, { color: colors.primary }]}>{t('providerDashboard.providerServiceArea.save')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Map placeholder */}
        <View style={[styles.mapCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.mapPlaceholder}>
            <View style={[styles.mapCircle, { borderColor: `${colors.primary}66`, backgroundColor: `${colors.primary}1A` }]}>
              <View style={[styles.mapDot, { backgroundColor: colors.primary }]} />
            </View>
            <View style={styles.zoomControls}>
              <TouchableOpacity style={styles.zoomButton} onPress={() => setRadius(state.radiusKm - 1)}>
                <Text style={[styles.zoomButtonText, { color: colors.textSecondary }]}>−</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.zoomButton} onPress={() => setRadius(state.radiusKm + 1)}>
                <Text style={[styles.zoomButtonText, { color: colors.textSecondary }]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.baseLocationRow}>
            <Text style={styles.locationIcon}>📍</Text>
            <View style={styles.baseLocationText}>
              <Text style={[styles.baseLocationLabel, { color: colors.textPrimary }]}>{t('providerDashboard.providerServiceArea.baseLocation')}</Text>
              {editingAddress ? (
                <TextInput
                  style={[styles.addressInput, { color: colors.textPrimary, borderBottomColor: colors.cardBorder }]}
                  value={state.baseAddress}
                  onChangeText={(text) => setState((prev) => (prev ? { ...prev, baseAddress: text } : null))}
                  placeholder={t('providerDashboard.providerServiceArea.baseLocationPlaceholder')}
                  placeholderTextColor={colors.textTertiary}
                  autoFocus
                  onBlur={() => setEditingAddress(false)}
                />
              ) : (
                <Text style={[styles.baseLocationAddress, { color: colors.textTertiary }]} numberOfLines={1}>
                  {state.baseAddress || '—'}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => setEditingAddress((v) => !v)}>
              <Text style={[styles.editLink, { color: colors.primary }]}>{t('providerDashboard.providerServiceArea.edit')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Coverage radius */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
          {t('providerDashboard.providerServiceArea.sectionCoverageRadius')}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.radiusRow}>
            <Text style={[styles.radiusLabel, { color: colors.textPrimary }]}>{t('providerDashboard.providerServiceArea.currentRadius')}</Text>
            <Text style={[styles.radiusValue, { color: colors.primary }]}>{state.radiusKm} km</Text>
          </View>
          <View
            style={styles.sliderTrack}
            onLayout={onSliderLayout}
            {...panResponder.panHandlers}
          >
            <View style={[styles.sliderTrackInner, { width: `${radiusRatio * 100}%`, backgroundColor: colors.primary }]} />
            <View style={[styles.sliderThumb, { left: `${radiusRatio * 100}%`, marginLeft: -10, borderColor: colors.card, backgroundColor: colors.primary }]} />
          </View>
          <View style={styles.sliderLabels}>
            <Text style={[styles.sliderLabelText, { color: colors.textTertiary }]}>{RADIUS_MIN_KM} km</Text>
            <Text style={[styles.sliderLabelText, { color: colors.textTertiary }]}>{RADIUS_MAX_KM} km</Text>
          </View>
        </View>

        {/* Specific zones */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
          {t('providerDashboard.providerServiceArea.sectionSpecificZones')}
        </Text>
        <View style={styles.zonesList}>
          {state.zones.map((zone: ServiceZoneItem) => (
            <View key={zone.id} style={[styles.zoneRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.zoneLeft}>
                <View style={[styles.zoneIcon, zone.enabled ? styles.zoneIconOn : styles.zoneIconOff]}>
                  <Text style={styles.zoneIconText}>📍</Text>
                </View>
                <Text style={[styles.zoneName, { color: colors.textPrimary }, !zone.enabled && { color: colors.textTertiary }]}>{zone.name}</Text>
              </View>
              <Switch
                value={zone.enabled}
                onValueChange={(v) => toggleZone(zone.id, v)}
                trackColor={{ false: colors.cardBorder, true: 'rgba(34, 197, 94, 0.4)' }}
                thumbColor={zone.enabled ? '#4ADE80' : colors.textTertiary}
              />
            </View>
          ))}
        </View>

        {/* Distance charge */}
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
              <Text style={[styles.afterKmLabel, { color: colors.textSecondary }]}>{t('providerDashboard.providerServiceArea.afterKmBefore')}</Text>
              <TextInput
                style={[styles.afterKmInput, { color: colors.textPrimary }]}
                value={String(state.distanceChargeAfterKm)}
                onChangeText={(text) => {
                  const n = parseInt(text.replace(/\D/g, ''), 10);
                  if (!Number.isNaN(n)) setDistanceCharge({ distanceChargeAfterKm: n });
                }}
                keyboardType="number-pad"
                placeholder="10"
                placeholderTextColor={colors.textTertiary}
              />
              <Text style={[styles.afterKmSuffix, { color: colors.textSecondary }]}>{t('providerDashboard.providerServiceArea.afterKmAfter')}</Text>
            </View>
            <View style={styles.perKmRow}>
              <Text style={[styles.currencySymbol, { color: colors.textTertiary }]}>$</Text>
              <TextInput
                style={[styles.perKmInput, { color: colors.textPrimary }]}
                value={String(state.distanceChargeRatePerKm)}
                onChangeText={(text) => {
                  const n = parseInt(text.replace(/\D/g, ''), 10);
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
  container: { flex: 1 },
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
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },
  sectionTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  mapCard: {
    borderRadius: 12,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
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
  addressInput: {
    fontSize: 12,
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
  },
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
  zonesList: { gap: 8, marginBottom: 20 },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  zoneLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  zoneIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  zoneIconOn: { backgroundColor: 'rgba(34, 197, 94, 0.15)' },
  zoneIconOff: { backgroundColor: 'rgba(255,255,255,0.05)' },
  zoneIconText: { fontSize: 14 },
  zoneName: { fontSize: 14 },
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
    width: 40,
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
});
