import { request, ApiError } from './auth';
import { t } from '@/i18n';
import type { OrderStatus } from './orders';

export interface Conversation {
  id: string;
  client_id: string;
  supplier_id: string;
  order_id: string | null;
  /** Real active order status for this client-supplier pair; null when no active order. */
  active_order_status: OrderStatus | null;
  /** True when the current active order has a completed client payment (same order as active_order_status). */
  active_order_has_client_payment?: boolean;
  last_message_at: string | null;
  created_at: string;
  other_user_name: string;
  other_user_image: string | null;
  last_message: string | null;
  unread_count: number;
}

export interface ConversationDetail {
  id: string;
  client_id: string;
  supplier_id: string;
  order_id: string | null;
  last_message_at: string;
  created_at: string;
  client_name: string;
  supplier_name: string;
  supplier_image: string | null;
  client_image?: string | null;
  supplier_phone_number?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  order_id: string | null;
  sender_type: 'client' | 'supplier';
  sender_id: string;
  receiver_type: 'client' | 'supplier';
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}


/** Role for inbox: 'client' = conversations where user is client; 'provider' = where user is supplier */
export type ConversationRole = 'client' | 'provider';

/** Role to use when fetching messages / marking as read. Pass when opening chat so unread count updates correctly for provider inbox. */
export type MessageViewRole = ConversationRole;

// GET /conversations - Fetch conversations (optional role to separate client vs provider inbox)
export const fetchConversations = async (role?: ConversationRole): Promise<Conversation[]> => {
  try {
    const asParam = role === 'provider' ? 'supplier' : 'client';
    const data = await request<{ conversations: Conversation[] }>(
      `/conversations?as=${asParam}`,
      { method: 'GET' },
      t('errors.requestFailedStatus', { status: 0 })
    );
    if (!data.conversations) {
      throw new ApiError('Invalid response format: missing conversations', 500);
    }
    return data.conversations.map((conv) => ({
      ...conv,
      last_message_at: conv.last_message_at || null,
      last_message: conv.last_message || null,
      other_user_image: conv.other_user_image || null,
      unread_count: typeof conv.unread_count === 'number' ? conv.unread_count : 0,
      active_order_status: conv.active_order_status ?? null,
      active_order_has_client_payment: Boolean(
        (conv as { active_order_has_client_payment?: boolean }).active_order_has_client_payment,
      ),
    }));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Network error. Please check your connection.', 0, error);
  }
};

// DELETE /conversations/:id - Remove conversation and its messages
export const deleteConversation = async (conversationId: string): Promise<void> => {
  try {
    await request<Record<string, never>>(
      `/conversations/${conversationId}`,
      { method: 'DELETE' },
      t('chat.deleteFailed')
    );
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Network error. Please check your connection.', 0, error);
  }
};

// POST /conversations - Create or get existing conversation
export const getOrCreateConversation = async (
  supplierId: string,
  orderId?: string
): Promise<{ conversation: ConversationDetail; created: boolean }> => {
  try {
    return await request<{ conversation: ConversationDetail; created: boolean }>(
      '/conversations',
      {
        method: 'POST',
        body: JSON.stringify({ supplierId, orderId }),
      },
      'Failed to create conversation'
    );
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Network error. Please check your connection.', 0, error);
  }
};

// GET /conversations/:id - Fetch conversation details
export const fetchConversation = async (conversationId: string): Promise<ConversationDetail> => {
  try {
    const data = await request<{ conversation: ConversationDetail }>(
      `/conversations/${conversationId}`,
      { method: 'GET' },
      'Failed to fetch conversation'
    );
    return data.conversation;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Network error. Please check your connection.', 0, error);
  }
};

// GET /conversations/:id/client-address - Get client's default address for this conversation
export const fetchConversationClientAddress = async (
  conversationId: string
): Promise<import('@/services/orders').ClientAddress | null> => {
  try {
    const data = await request<{ address: import('@/services/orders').ClientAddress | null }>(
      `/conversations/${conversationId}/client-address`,
      { method: 'GET' },
      'Failed to fetch client address'
    );
    return data.address;
  } catch {
    return null;
  }
};

// GET /conversations/:id/active-order - Get the current active order for this conversation (client-supplier pair).
export const fetchConversationActiveOrder = async (
  conversationId: string
): Promise<import('@/services/orders').Order | null> => {
  try {
    const data = await request<{ order: import('@/services/orders').Order | null }>(
      `/conversations/${conversationId}/active-order`,
      { method: 'GET' },
      'Failed to fetch active order'
    );
    return data.order ?? null;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Network error. Please check your connection.', 0, error);
  }
};

// GET /conversations/:id/active-quote - Get active quote for conversation (if any)
export const fetchConversationActiveQuote = async (
  conversationId: string
): Promise<{ quote: import('@/services/orders').Quote | null; order: import('@/services/orders').Order | null }> => {
  try {
    return await request<{ quote: import('@/services/orders').Quote | null; order: import('@/services/orders').Order | null }>(
      `/conversations/${conversationId}/active-quote`,
      { method: 'GET' },
      'Failed to fetch active quote'
    );
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Network error. Please check your connection.', 0, error);
  }
};

// GET /conversations/:id/messages - Fetch messages
export const fetchConversationMessages = async (
  conversationId: string,
  viewAs?: MessageViewRole
): Promise<Message[]> => {
  try {
    const asParam = viewAs === 'provider' ? 'supplier' : viewAs === 'client' ? 'client' : undefined;
    const url = asParam
      ? `/conversations/${conversationId}/messages?as=${asParam}`
      : `/conversations/${conversationId}/messages`;
    const data = await request<{ messages: Message[] }>(
      url,
      { method: 'GET' },
      'Failed to fetch messages'
    );
    return data.messages;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Network error. Please check your connection.', 0, error);
  }
};

// POST /conversations/:id/messages - Send message
export const sendConversationMessage = async (
  conversationId: string,
  content: string
): Promise<Message> => {
  try {
    const data = await request<{ message: Message }>(
      `/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ content }),
      },
      'Failed to send message'
    );
    return data.message;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Network error. Please check your connection.', 0, error);
  }
};

// GET /conversations/unread-count - Fetch unread count
export const fetchUnreadCount = async (): Promise<number> => {
  try {
    const data = await request<{ unreadCount: number }>(
      '/conversations/unread-count',
      { method: 'GET' },
      'Failed to fetch unread count'
    );
    return data.unreadCount;
  } catch {
    return 0;
  }
};
