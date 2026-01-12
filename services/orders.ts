import { request, ApiError as AuthApiError } from './auth';
import { t } from '@/i18n';

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

// Re-export ApiError from auth service for backward compatibility
export { ApiError as AuthApiError } from './auth';
export class ApiError extends AuthApiError {
  constructor(
    message: string,
    statusCode: number = 0,
    originalError?: unknown
  ) {
    super(message, statusCode, originalError);
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
    const result = await request<{ order: Order }>(
      '/orders',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      t('errors.requestFailed')
    );
    return result.order;
  } catch (error) {
    if (error instanceof AuthApiError) {
      throw new ApiError(error.message, error.status, error.data);
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
    const data = await request<OrdersResponse>(
      '/orders',
      {
        method: 'GET',
      },
      t('errors.requestFailed')
    );
    return data.orders || [];
  } catch (error) {
    if (error instanceof AuthApiError) {
      throw new ApiError(error.message, error.status, error.data);
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
    return await request<OrderDetailResponse>(
      `/orders/${orderId}`,
      {
        method: 'GET',
      },
      t('errors.requestFailed')
    );
  } catch (error) {
    if (error instanceof AuthApiError) {
      throw new ApiError(error.message, error.status, error.data);
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
    const result = await request<{ order: Order }>(
      `/orders/${orderId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      },
      t('errors.requestFailed')
    );
    return result.order;
  } catch (error) {
    if (error instanceof AuthApiError) {
      throw new ApiError(error.message, error.status, error.data);
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
    const result = await request<{ quote: Quote }>(
      `/orders/${orderId}/quote/approve`,
      {
        method: 'PATCH',
      },
      t('errors.requestFailed')
    );
    return result.quote;
  } catch (error) {
    if (error instanceof AuthApiError) {
      throw new ApiError(error.message, error.status, error.data);
    }
    throw new ApiError(
      'Network error. Please check your connection.',
      0,
      error
    );
  }
};









