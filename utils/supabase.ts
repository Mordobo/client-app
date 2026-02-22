import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';

/** Table name for Realtime Postgres Changes (conversations). Default "messages". */
export const REALTIME_MESSAGES_TABLE =
  process.env.EXPO_PUBLIC_SUPABASE_REALTIME_MESSAGES_TABLE?.trim() || 'messages';

/** Table for order-scoped messages. If not set, uses REALTIME_MESSAGES_TABLE (single table with order_id). */
export const REALTIME_ORDER_MESSAGES_TABLE =
  process.env.EXPO_PUBLIC_SUPABASE_REALTIME_ORDER_MESSAGES_TABLE?.trim() || REALTIME_MESSAGES_TABLE;

let client: SupabaseClient | null = null;

/**
 * Returns the Supabase client for Realtime (and optional future features).
 * Requires EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.
 * Call setSupabaseAuth(accessToken) before subscribing if you use RLS with your API JWT.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return client;
}

/**
 * Set the JWT used for Realtime connections. Use your API access token if Supabase
 * is configured to accept it (same JWT secret and claims: sub, role, exp, aud).
 * Call with null on logout.
 */
export function setSupabaseAuth(token: string | null): void {
  const c = getSupabaseClient();
  if (c) {
    c.realtime.setAuth(token || '');
  }
}

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
