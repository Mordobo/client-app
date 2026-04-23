import { useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient, setSupabaseAuth, REALTIME_ORDER_MESSAGES_TABLE } from '@/utils/supabase';
import { getToken } from '@/utils/userStorage';
import type { Message } from '@/services/messages';

/** Raw row from Supabase (snake_case). Order messages may be in same table with order_id. */
interface RealtimeOrderMessageRow {
  id: string;
  order_id: string;
  sender_type: string;
  sender_id: string;
  receiver_type: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

function mapRowToMessage(row: RealtimeOrderMessageRow): Message {
  return {
    id: row.id,
    order_id: row.order_id,
    sender_type: row.sender_type as 'client' | 'supplier',
    sender_id: row.sender_id,
    receiver_type: row.receiver_type as 'client' | 'supplier',
    receiver_id: row.receiver_id,
    content: row.content,
    read: row.read,
    created_at: row.created_at,
  };
}

/**
 * Subscribes to new messages for an order via Supabase Realtime (Postgres Changes).
 * Calls onMessage for each INSERT. No-op if Supabase is not configured.
 * Uses same table as conversation messages, filtered by order_id.
 */
export function useRealtimeOrderMessages(
  orderId: string | undefined,
  onMessage: (message: Message) => void
): void {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!orderId) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    let cancelled = false;
    const channelRef = { current: null as RealtimeChannel | null };

    const setup = async () => {
      const token = await getToken();
      if (cancelled) return;
      setSupabaseAuth(token || '');

      const ch = supabase
        .channel(`order-messages-${orderId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: REALTIME_ORDER_MESSAGES_TABLE,
            filter: `order_id=eq.${orderId}`,
          },
          (payload) => {
            const row = payload.new as RealtimeOrderMessageRow;
            if (row) {
              onMessageRef.current(mapRowToMessage(row));
            }
          }
        )
        .subscribe();

      if (cancelled) {
        supabase.removeChannel(ch);
        return;
      }
      channelRef.current = ch;
    };

    void setup();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [orderId]);
}
