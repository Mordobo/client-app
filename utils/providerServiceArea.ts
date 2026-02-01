import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getProviderScheduleConfig,
  putProviderScheduleConfig,
} from '@/services/providerDashboard';

const STORAGE_KEY = 'SERVICE_AREA_PROVIDER';

const RADIUS_MIN_KM = 5;
const RADIUS_MAX_KM = 25;

export interface ServiceZoneItem {
  id: string;
  name: string;
  enabled: boolean;
}

export interface ProviderServiceAreaState {
  baseAddress: string;
  latitude: number | null;
  longitude: number | null;
  radiusKm: number;
  zones: ServiceZoneItem[];
  distanceChargeEnabled: boolean;
  distanceChargeAfterKm: number;
  distanceChargeRatePerKm: number;
}

const DEFAULT_ZONES: ServiceZoneItem[] = [
  { id: '1', name: 'Roma Norte', enabled: true },
  { id: '2', name: 'Condesa', enabled: true },
  { id: '3', name: 'Polanco', enabled: true },
  { id: '4', name: 'Santa Fe', enabled: false },
  { id: '5', name: 'Coyoacán', enabled: false },
];

const DEFAULT_STATE: ProviderServiceAreaState = {
  baseAddress: '',
  latitude: null,
  longitude: null,
  radiusKm: 15,
  zones: DEFAULT_ZONES,
  distanceChargeEnabled: true,
  distanceChargeAfterKm: 10,
  distanceChargeRatePerKm: 5,
};

function clampRadius(km: number): number {
  return Math.max(RADIUS_MIN_KM, Math.min(RADIUS_MAX_KM, km));
}

/** Load service area: merge schedule-config (radius) with AsyncStorage (base location, zones, distance charge). */
export async function loadProviderServiceArea(): Promise<ProviderServiceAreaState> {
  const [config, stored] = await Promise.all([
    getProviderScheduleConfig().catch(() => null),
    AsyncStorage.getItem(STORAGE_KEY),
  ]);

  const radiusFromApi =
    config?.coverageRadiusKm != null
      ? clampRadius(config.coverageRadiusKm)
      : DEFAULT_STATE.radiusKm;

  const merged: ProviderServiceAreaState = {
    ...DEFAULT_STATE,
    radiusKm: radiusFromApi,
  };

  if (stored) {
    try {
      const parsed = JSON.parse(stored) as Partial<ProviderServiceAreaState>;
      if (parsed.baseAddress !== undefined) merged.baseAddress = parsed.baseAddress;
      if (parsed.latitude !== undefined) merged.latitude = parsed.latitude;
      if (parsed.longitude !== undefined) merged.longitude = parsed.longitude;
      if (parsed.radiusKm !== undefined) merged.radiusKm = clampRadius(parsed.radiusKm);
      if (Array.isArray(parsed.zones) && parsed.zones.length > 0) merged.zones = parsed.zones;
      if (parsed.distanceChargeEnabled !== undefined)
        merged.distanceChargeEnabled = parsed.distanceChargeEnabled;
      if (parsed.distanceChargeAfterKm !== undefined)
        merged.distanceChargeAfterKm = parsed.distanceChargeAfterKm;
      if (parsed.distanceChargeRatePerKm !== undefined)
        merged.distanceChargeRatePerKm = parsed.distanceChargeRatePerKm;
    } catch {
      // ignore invalid stored json
    }
  }
  return merged;
}

/** Save service area: persist to AsyncStorage and sync radius to API (schedule-config). Does not overwrite other schedule config. */
export async function saveProviderServiceArea(
  state: ProviderServiceAreaState
): Promise<void> {
  const toStore: ProviderServiceAreaState = {
    ...state,
    radiusKm: clampRadius(state.radiusKm),
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  const current = await getProviderScheduleConfig().catch(() => null);
  if (current) {
    await putProviderScheduleConfig({
      scheduleConfig: current.scheduleConfig,
      bufferMinutes: current.bufferMinutes,
      maxJobsPerDay: current.maxJobsPerDay,
      coverageRadiusKm: toStore.radiusKm,
      blockedDates: current.blockedDates,
    });
  }
}

export { RADIUS_MIN_KM, RADIUS_MAX_KM };
