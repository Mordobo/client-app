import { Platform } from 'react-native';
import { handleUnauthorizedError } from '../utils/authEvents';
import { getToken } from '../utils/userStorage';
import { createApiHeaders } from '../utils/apiHeaders';

const getApiUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
  if (Platform.OS === 'android' && /localhost/i.test(envUrl)) {
    return envUrl.replace(/localhost/gi, '10.0.2.2');
  }
  return envUrl;
};

const API_BASE = getApiUrl();

// Helper to handle API responses and detect auth errors
const handleApiResponse = async (response: Response): Promise<Response> => {
  if (response.status === 401) {
    handleUnauthorizedError();
    throw new ApiError('Session expired. Please log in again.', 401);
  }
  return response;
};

export interface Conversation {
  id: string;
  client_id: string;
  supplier_id: string;
  order_id: string | null;
  last_message_at: string;
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

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 0,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// GET /conversations - Fetch all conversations
export const fetchConversations = async (): Promise<Conversation[]> => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversations.ts:74',message:'fetchConversations called',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
  // #endregion
  try {
    const token = await getToken();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversations.ts:77',message:'Token retrieved for conversations',data:{hasToken:!!token,tokenLength:token?.length||0,apiBase:API_BASE},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    
    if (!token) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversations.ts:80',message:'No token for conversations',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
      handleUnauthorizedError();
      throw new ApiError('Not authenticated. Please log in.', 401);
    }
    
    const url = `${API_BASE}/conversations`;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversations.ts:84',message:'Making fetch request for conversations',data:{url,method:'GET'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversations.ts:93',message:'Response received for conversations',data:{status:response.status,statusText:response.statusText,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
    // #endregion

    await handleApiResponse(response);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversations.ts:99',message:'Response not OK for conversations',data:{status:response.status,errorData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'})}).catch(()=>{});
      // #endregion
      throw new ApiError(
        errorData.message || 'Failed to fetch conversations',
        response.status
      );
    }

    const data = await response.json();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversations.ts:107',message:'Success, returning conversations',data:{conversationsCount:data.conversations?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
    // #endregion
    return data.conversations;
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversations.ts:110',message:'Error caught in fetchConversations',data:{errorMessage:error instanceof Error?error.message:String(error),errorType:error instanceof ApiError?'ApiError':error instanceof Error?'Error':'Unknown',statusCode:error instanceof ApiError?error.statusCode:undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'K'})}).catch(()=>{});
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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversations.ts:271',message:'fetchUnreadCount called',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    const token = await getToken();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversations.ts:274',message:'Token retrieved',data:{hasToken:!!token,tokenLength:token?.length||0,apiBase:API_BASE},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // For unread count, silently return 0 if not authenticated (don't redirect)
    if (!token) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversations.ts:277',message:'No token, returning 0',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return 0;
    }
    
    const url = `${API_BASE}/conversations/unread-count`;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversations.ts:280',message:'Making fetch request',data:{url,method:'GET'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const response = await fetch(url, {
      method: 'GET',
      headers: createApiHeaders({
        'Authorization': `Bearer ${token}`,
      }),
    });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversations.ts:288',message:'Response received',data:{status:response.status,statusText:response.statusText,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    // For unread count, silently return 0 on 401 (polling shouldn't cause logout)
    if (response.status === 401) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversations.ts:290',message:'401 Unauthorized, returning 0',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return 0;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversations.ts:294',message:'Response not OK',data:{status:response.status,errorData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      throw new ApiError(
        errorData.message || 'Failed to fetch unread count',
        response.status
      );
    }

    const data = await response.json();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversations.ts:302',message:'Success, returning unreadCount',data:{unreadCount:data.unreadCount},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    return data.unreadCount;
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversations.ts:304',message:'Error caught',data:{errorMessage:error instanceof Error?error.message:String(error),errorType:error instanceof ApiError?'ApiError':error instanceof Error?'Error':'Unknown',statusCode:error instanceof ApiError?error.statusCode:undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Network error. Please check your connection.', 0, error);
  }
};

