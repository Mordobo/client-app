import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY_PREFIX = "provider_client_rated_orders:";
const MAX_ORDER_IDS = 300;

function storageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

function parseIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Persist that this provider already submitted a client rating for the order (API may lag updating active-job status). */
export async function rememberProviderRatedClient(userId: string, orderId: string): Promise<void> {
  if (!userId || !orderId) return;
  const key = storageKey(userId);
  const ids = parseIds(await AsyncStorage.getItem(key));
  if (ids.includes(orderId)) return;
  ids.push(orderId);
  const trimmed = ids.length > MAX_ORDER_IDS ? ids.slice(-MAX_ORDER_IDS) : ids;
  await AsyncStorage.setItem(key, JSON.stringify(trimmed));
}

export async function hasProviderRatedClient(userId: string, orderId: string): Promise<boolean> {
  if (!userId || !orderId) return false;
  return parseIds(await AsyncStorage.getItem(storageKey(userId))).includes(orderId);
}

export async function loadRatedOrderIds(userId: string): Promise<Set<string>> {
  if (!userId) return new Set();
  return new Set(parseIds(await AsyncStorage.getItem(storageKey(userId))));
}
