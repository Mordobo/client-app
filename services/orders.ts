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

export type OrderStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  client_id: string;
  supplier_id?: string;
  service_id: string;
  category_id?: string;
  quote_id?: string;
  scheduled_at?: string;
  address?: string;
  notes?: string;
  total_amount?: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
}

export interface Quote {
  id: string;
  order_id: string;
  supplier_id: string;
  description?: string;
  line_items: QuoteLineItem[];
  scheduled_at?: string;
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'sent' | 'approved' | 'rejected' | 'expired';
  valid_until?: string;
  created_at: string;
  updated_at: string;
}

export interface QuoteLineItem {
  description: string;
  amount: number;
}

export interface OrdersResponse {
  orders: Order[];
  total: number;
}

export interface OrderDetailResponse {
  order: Order;
  quote?: Quote;
  supplier?: {
    id: string;
    full_name: string;
    business_name?: string;
    profile_image?: string;
    rating: number;
  };
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

interface CreateOrderData {
  service_id: string;
  category_id?: string;
  supplier_id?: string;
  scheduled_at?: string;
  address?: string;
  notes?: string;
}

// POST /orders - Create new order
export const createOrder = async (data: CreateOrderData): Promise<Order> => {
  try {
    const token = await getToken();
    
    const response = await fetch(`${API_BASE}/orders`, {
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
        errorData.message || 'Failed to create order',
        response.status
      );
    }

    const result = await response.json();
    return result.order;
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

// GET /orders - Fetch my orders
export const fetchOrders = async (): Promise<Order[]> => {
  try {
    const token = await getToken();
    
    const response = await fetch(`${API_BASE}/orders`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || 'Failed to fetch orders',
        response.status
      );
    }

    const data: OrdersResponse = await response.json();
    return data.orders;
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

// GET /orders/:id - Fetch order details
export const fetchOrderDetail = async (orderId: string): Promise<OrderDetailResponse> => {
  try {
    const token = await getToken();
    
    const response = await fetch(`${API_BASE}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || 'Failed to fetch order details',
        response.status
      );
    }

    return await response.json();
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

// PATCH /orders/:id - Update order status
export const updateOrderStatus = async (
  orderId: string,
  status: OrderStatus
): Promise<Order> => {
  try {
    const token = await getToken();
    
    const response = await fetch(`${API_BASE}/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || 'Failed to update order',
        response.status
      );
    }

    const result = await response.json();
    return result.order;
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

// PATCH /orders/:id/quote/approve - Approve quote
export const approveQuote = async (orderId: string): Promise<Quote> => {
  try {
    const token = await getToken();
    
    const response = await fetch(`${API_BASE}/orders/${orderId}/quote/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || 'Failed to approve quote',
        response.status
      );
    }

    const result = await response.json();
    return result.quote;
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






