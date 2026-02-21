import { useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient, setSupabaseAuth, REALTIME_MESSAGES_TABLE } from '@/utils/supabase';
import { getToken } from '@/utils/userStorage';
import type { Message } from '@/services/conversations';

/** Raw row from Supabase (snake_case). */
interface RealtimeMessageRow {
  id: string;
  conversation_id: string;
  order_id: string | null;
  sender_type: string;
  sender_id: string;
  receiver_type: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

function mapRowToMessage(row: RealtimeMessageRow): Message {
  return {
    id: row.id,
    conversation_id: row.conversation_id,
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
 * Subscribes to new messages for a conversation via Supabase Realtime (Postgres Changes).
 * Calls onMessage for each INSERT. No-op if Supabase is not configured.
 * Sets Realtime auth from current API token so RLS can apply if configured.
 */
export function useRealtimeConversationMessages(
  conversationId: string | undefined,
  onMessage: (message: Message) => void
): void {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!conversationId || conversationId === 'demo') return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    const channelRef = { current: null as RealtimeChannel | null };

    const setup = async () => {
      const token = await getToken();
      setSupabaseAuth(token || '');

      const ch = supabase
        .channel(`conv-messages-${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: REALTIME_MESSAGES_TABLE,
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const row = payload.new as RealtimeMessageRow;
            if (row) {
              onMessageRef.current(mapRowToMessage(row));
            }
          }
        )
        .subscribe();
      channelRef.current = ch;
    };

    setup();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId]);
}
