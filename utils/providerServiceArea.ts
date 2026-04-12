import {
  getProviderScheduleConfig,
  putProviderScheduleConfig,
  type ProviderScheduleServiceArea,
} from "@/services/providerDashboard";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "SERVICE_AREA_PROVIDER";

const RADIUS_MIN_KM = 5;
const RADIUS_MAX_KM = 25;

export interface ServiceZoneItem {
  id: string;
  name: string;
  enabled: boolean;
  latitude?: number | null;
  longitude?: number | null;
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

const DEFAULT_STATE: ProviderServiceAreaState = {
  baseAddress: "",
  latitude: null,
  longitude: null,
  radiusKm: 15,
  zones: [],
  distanceChargeEnabled: true,
  distanceChargeAfterKm: 10,
  distanceChargeRatePerKm: 5,
};

function clampRadius(km: number): number {
  return Math.max(RADIUS_MIN_KM, Math.min(RADIUS_MAX_KM, km));
}

function mapApiServiceAreaToState(api: ProviderScheduleServiceArea): ProviderServiceAreaState {
  return {
    baseAddress: api.baseAddress ?? "",
    latitude: api.latitude ?? null,
    longitude: api.longitude ?? null,
    radiusKm: DEFAULT_STATE.radiusKm,
    zones: Array.isArray(api.zones) ? api.zones : [],
    distanceChargeEnabled: api.distanceChargeEnabled ?? DEFAULT_STATE.distanceChargeEnabled,
    distanceChargeAfterKm: api.distanceChargeAfterKm ?? DEFAULT_STATE.distanceChargeAfterKm,
    distanceChargeRatePerKm: api.distanceChargeRatePerKm ?? DEFAULT_STATE.distanceChargeRatePerKm,
  };
}

function stateToApiPayload(state: ProviderServiceAreaState): ProviderScheduleServiceArea {
  const zones: ProviderScheduleServiceArea["zones"] = state.zones.map((z) => {
    const row: ProviderScheduleServiceArea["zones"][number] = {
      id: z.id,
      name: z.name,
      enabled: z.enabled,
    };
    if (typeof z.latitude === "number") row.latitude = z.latitude;
    if (typeof z.longitude === "number") row.longitude = z.longitude;
    return row;
  });
  return {
    baseAddress: state.baseAddress,
    latitude: state.latitude,
    longitude: state.longitude,
    zones,
    distanceChargeEnabled: state.distanceChargeEnabled,
    distanceChargeAfterKm: state.distanceChargeAfterKm,
    distanceChargeRatePerKm: state.distanceChargeRatePerKm,
  };
}

/** Load service area: API is source of truth when schedule-config loads; AsyncStorage fallback if offline. */
export async function loadProviderServiceArea(): Promise<ProviderServiceAreaState> {
  const [config, stored] = await Promise.all([
    getProviderScheduleConfig().catch(() => null),
    AsyncStorage.getItem(STORAGE_KEY),
  ]);

  const radiusFromApi =
    config?.coverageRadiusKm != null ? clampRadius(config.coverageRadiusKm) : DEFAULT_STATE.radiusKm;

  let merged: ProviderServiceAreaState = {
    ...DEFAULT_STATE,
    radiusKm: radiusFromApi,
  };

  if (config?.serviceArea) {
    const fromApi = mapApiServiceAreaToState(config.serviceArea);
    merged = {
      ...merged,
      ...fromApi,
      radiusKm: radiusFromApi,
    };
  } else if (stored && (!config || !config.serviceArea)) {
    try {
      const parsed = JSON.parse(stored) as Partial<ProviderServiceAreaState>;
      if (parsed.baseAddress !== undefined) merged.baseAddress = parsed.baseAddress;
      if (parsed.latitude !== undefined) merged.latitude = parsed.latitude;
      if (parsed.longitude !== undefined) merged.longitude = parsed.longitude;
      if (parsed.radiusKm !== undefined) merged.radiusKm = clampRadius(parsed.radiusKm);
      if (Array.isArray(parsed.zones)) merged.zones = parsed.zones;
      if (parsed.distanceChargeEnabled !== undefined) merged.distanceChargeEnabled = parsed.distanceChargeEnabled;
      if (parsed.distanceChargeAfterKm !== undefined) merged.distanceChargeAfterKm = parsed.distanceChargeAfterKm;
      if (parsed.distanceChargeRatePerKm !== undefined) merged.distanceChargeRatePerKm = parsed.distanceChargeRatePerKm;
    } catch {
      // ignore invalid stored json
    }
  }

  return merged;
}

/** Save service area: AsyncStorage mirror + schedule-config PUT (radius + serviceArea JSON on server). */
export async function saveProviderServiceArea(state: ProviderServiceAreaState): Promise<void> {
  const toStore: ProviderServiceAreaState = {
    ...state,
    radiusKm: clampRadius(state.radiusKm),
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  const current = await getProviderScheduleConfig().catch(() => null);
  if (!current) {
    throw new Error("schedule_config_unavailable");
  }
  await putProviderScheduleConfig({
    scheduleConfig: current.scheduleConfig,
    bufferMinutes: current.bufferMinutes,
    maxJobsPerDay: current.maxJobsPerDay,
    coverageRadiusKm: toStore.radiusKm,
    blockedDates: current.blockedDates,
    serviceArea: stateToApiPayload(toStore),
  });
}

export { RADIUS_MAX_KM, RADIUS_MIN_KM };
