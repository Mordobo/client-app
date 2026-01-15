import { API_BASE } from '@/utils/apiConfig';
import { handleUnauthorizedError } from '../utils/authEvents';
import { getToken } from '../utils/userStorage';
import { createApiHeaders } from '../utils/apiHeaders';
import { request, ApiError } from './auth';
import { t } from '@/i18n';

// Helper to handle API responses and detect auth errors
const handleApiResponse = async (response: Response): Promise<Response> => {
  if (response.status === 401 || response.status === 403) {
    handleUnauthorizedError();
    throw new ApiError('Session expired. Please log in again.', response.status);
  }
  return response;
};

export interface Conversation {
  id: string;
  client_id: string;
  supplier_id: string;
  order_id: string | null;
  last_message_at: string | null; // Can be null if conversation has no messages yet
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


// GET /conversations - Fetch all conversations
export const fetchConversations = async (): Promise<Conversation[]> => {
  try {
    // Use request() from auth.ts which handles token refresh automatically
    const data = await request<{ conversations: Conversation[] }>(
      '/conversations',
      {
        method: 'GET',
      },
      t('errors.requestFailedStatus', { status: 0 })
    );
    if (!data.conversations) {
      throw new ApiError('Invalid response format: missing conversations', 500);
    }
    // Validate and sanitize data to prevent crashes
    return data.conversations.map((conv) => ({
      ...conv,
      // Ensure last_message_at is either a valid string or null
      last_message_at: conv.last_message_at || null,
      // Ensure other fields have defaults
      last_message: conv.last_message || null,
      other_user_image: conv.other_user_image || null,
      unread_count: typeof conv.unread_count === 'number' ? conv.unread_count : 0,
    }));
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Network error. Please check your connection.', 0, error);
  }
};

// POST /conversations - Create or get existing conversation
export const getOrCreateConversation = async (
  supplierId: string,
  orderId?: string
): Promise<{ conversation: ConversationDetail; created: boolean }> => {
  try {
    const token = await getToken();
    
    if (!token) {
      handleUnauthorizedError();
      throw new ApiError('Not authenticated. Please log in.', 401);
    }
    
    const response = await fetch(`${API_BASE}/conversations`, {
      method: 'POST',
      headers: createApiHeaders({
        'Authorization': `Bearer ${token}`,
      }),
      body: JSON.stringify({ supplierId, orderId }),
    });

    await handleApiResponse(response);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || 'Failed to create conversation',
        response.status
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Network error. Please check your connection.', 0, error);
  }
};

// GET /conversations/:id - Fetch conversation details
export const fetchConversation = async (conversationId: string): Promise<ConversationDetail> => {
  try {
    const token = await getToken();
    
    if (!token) {
      handleUnauthorizedError();
      throw new ApiError('Not authenticated. Please log in.', 401);
    }
    
    const response = await fetch(`${API_BASE}/conversations/${conversationId}`, {
      method: 'GET',
      headers: createApiHeaders({
        'Authorization': `Bearer ${token}`,
      }),
    });

    await handleApiResponse(response);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || 'Failed to fetch conversation',
        response.status
      );
    }

    const data = await response.json();
    return data.conversation;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Network error. Please check your connection.', 0, error);
  }
};

// GET /conversations/:id/messages - Fetch messages
export const fetchConversationMessages = async (conversationId: string): Promise<Message[]> => {
  try {
    const token = await getToken();
    
    if (!token) {
      handleUnauthorizedError();
      throw new ApiError('Not authenticated. Please log in.', 401);
    }
    
    const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
      method: 'GET',
      headers: createApiHeaders({
        'Authorization': `Bearer ${token}`,
      }),
    });

    await handleApiResponse(response);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || 'Failed to fetch messages',
        response.status
      );
    }

    const data = await response.json();
    return data.messages;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Network error. Please check your connection.', 0, error);
  }
};

// POST /conversations/:id/messages - Send message
export const sendConversationMessage = async (
  conversationId: string,
  content: string
): Promise<Message> => {
  try {
    const token = await getToken();
    
    if (!token) {
      handleUnauthorizedError();
      throw new ApiError('Not authenticated. Please log in.', 401);
    }
    
    const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: createApiHeaders({
        'Authorization': `Bearer ${token}`,
      }),
      body: JSON.stringify({ content }),
    });

    await handleApiResponse(response);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || 'Failed to send message',
        response.status
      );
    }

    const data = await response.json();
    return data.message;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Network error. Please check your connection.', 0, error);
  }
};

// GET /conversations/unread-count - Fetch unread count
export const fetchUnreadCount = async (): Promise<number> => {
  try {
    const token = await getToken();
    
    // For unread count, silently return 0 if not authenticated (don't redirect)
    if (!token) {
      return 0;
    }
    
    const url = `${API_BASE}/conversations/unread-count`;
    const response = await fetch(url, {
      method: 'GET',
      headers: createApiHeaders({
        'Authorization': `Bearer ${token}`,
      }),
    });

    // For unread count, silently return 0 on 401 (polling shouldn't cause logout)
    if (response.status === 401) {
      return 0;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || 'Failed to fetch unread count',
        response.status
      );
    }

    const data = await response.json();
    return data.unreadCount;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Network error. Please check your connection.', 0, error);
  }
};

