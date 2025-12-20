import { Platform } from 'react-native';
import { getToken } from '../utils/userStorage';

const getApiUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
  if (Platform.OS === 'android' && /localhost/i.test(envUrl)) {
    return envUrl.replace(/localhost/gi, '10.0.2.2');
  }
  return envUrl;
};

const API_BASE = getApiUrl();

export interface Message {
  id: string;
  order_id: string;
  sender_type: 'client' | 'supplier';
  sender_id: string;
  receiver_type: 'client' | 'supplier';
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export interface MessagesResponse {
  messages: Message[];
  total: number;
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

// GET /orders/:orderId/messages - Fetch chat history
export const fetchMessages = async (orderId: string): Promise<Message[]> => {
  try {
    const token = await getToken();
    
    const response = await fetch(`${API_BASE}/orders/${orderId}/messages`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || 'Failed to fetch messages',
        response.status
      );
    }

    const data: MessagesResponse = await response.json();
    return data.messages;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      'Network error. Please check your connection.',
      0,
      error
    );
  }
};

interface SendMessageData {
  content: string;
}

// POST /orders/:orderId/messages - Send message
export const sendMessage = async (
  orderId: string,
  data: SendMessageData
): Promise<Message> => {
  try {
    const token = await getToken();
    
    const response = await fetch(`${API_BASE}/orders/${orderId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || 'Failed to send message',
        response.status
      );
    }

    const result = await response.json();
    return result.message;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      'Network error. Please check your connection.',
      0,
      error
    );
  }
};






