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
  // #region agent log
  const token = await getToken();
  let decodedToken: any = null;
  if (token) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        decodedToken = JSON.parse(atob(parts[1]));
      }
    } catch (e) {
      // ignore decode errors
    }
  }
  fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversations.ts:59',message:'fetchConversations START',data:{hasToken:!!token,tokenLength:token?.length||0,tokenUserId:decodedToken?.userId||'NONE',tokenUserType:decodedToken?.userType||'NONE'},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  try {
    // Use request() from auth.ts which handles token refresh automatically
    // #region agent log
    // #endregion
    const data = await request<{ conversations: Conversation[] }>(
      '/conversations',
      {
        method: 'GET',
      },
      t('errors.requestFailedStatus', { status: 0 })
    );
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversations.ts:73',message:'fetchConversations response received',data:{hasConversations:!!data?.conversations,conversationsCount:data?.conversations?.length||0,rawResponse:JSON.stringify(data)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    if (!data.conversations) {
      // #region agent log
      // #endregion
      throw new ApiError('Invalid response format: missing conversations', 500);
    }
    // Validate and sanitize data to prevent crashes
    const sanitized = data.conversations.map((conv) => ({
      ...conv,
      // Ensure last_message_at is either a valid string or null
      last_message_at: conv.last_message_at || null,
      // Ensure other fields have defaults
      last_message: conv.last_message || null,
      other_user_image: conv.other_user_image || null,
      unread_count: typeof conv.unread_count === 'number' ? conv.unread_count : 0,
    }));
    // #region agent log
    // #endregion
    return sanitized;
  } catch (error) {
    // #region agent log
    // #endregion
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

