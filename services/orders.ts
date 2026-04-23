import { t } from '@/i18n';
import { coerceSupplierProfileImage } from '@/services/suppliers';
import { ApiError as AuthApiError, request } from './auth';

export type OrderStatus = 'pending_for_provider' | 'pending_for_client' | 'pending_payment' | 'accepted' | 'in_progress' | 'pending_review' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  client_id: string;
  supplier_id?: string;
  service_id?: string; // null for custom-quote orders created from conversation
  category_id?: string;
  quote_id?: string;
  scheduled_at?: string;
  address?: string;
  notes?: string;
  total_amount?: number;
  /** Set by GET /orders when a quote exists: sum(line items)+tax (fixed price; same as charged amount). */
  display_total?: number | null;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  // Fields returned from backend JOINs
  service_name?: string;
  service_description?: string;
  supplier_name?: string;
  business_name?: string;
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
  status: 'draft' | 'pending' | 'sent' | 'approved' | 'rejected' | 'expired';
  valid_until?: string;
  estimated_time?: number;
  estimated_time_unit?: 'hours' | 'days';
  notes?: string;
  commission_rate?: number;
  created_at: string;
  updated_at: string;
}

export interface QuoteLineItem {
  description: string;
  amount: number;
}

export interface CreateQuotePayload {
  line_items: QuoteLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  description?: string;
  scheduled_at?: string;
  address?: string;
  valid_until?: string;
  estimated_time?: number;
  estimated_time_unit?: 'hours' | 'days';
  notes?: string;
  commission_rate?: number;
  status?: 'draft' | 'sent';
}

export interface OrdersResponse {
  orders: Order[];
  total: number;
}

export interface ClientAddress {
  id: string;
  name: string;
  type: 'home' | 'office' | 'other';
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  postal_code?: string;
  country: string;
  is_default: boolean;
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
  client?: {
    id: string;
    full_name: string;
  };
  clientAddress?: ClientAddress;
  /** Conversation id for this order (to open chat with client after withdraw/cancel) */
  conversation_id?: string | null;
  /** When true, client already submitted a review for this order (rate screen shows "already reviewed" state) */
  client_has_reviewed?: boolean;
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
    const res = await request<OrderDetailResponse>(
      `/orders/${orderId}`,
      {
        method: 'GET',
      },
      t('errors.requestFailed')
    );
    if (!res.supplier) return res;
    const profile_image =
      coerceSupplierProfileImage(res.supplier as Record<string, unknown>) ?? res.supplier.profile_image;
    return { ...res, supplier: { ...res.supplier, profile_image } };
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

// PATCH /orders/:id/quote/reject - Client rejects quote (so provider can send a new one)
export const rejectQuote = async (orderId: string): Promise<Quote> => {
  try {
    const result = await request<{ quote: Quote }>(
      `/orders/${orderId}/quote/reject`,
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

// POST /orders/:id/quote - Create quote (provider)
export const createQuote = async (
  orderId: string,
  data: CreateQuotePayload
): Promise<Quote> => {
  try {
    const result = await request<{ quote: Quote }>(
      `/orders/${orderId}/quote`,
      {
        method: 'POST',
        body: JSON.stringify(data),
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

// PATCH /orders/:id/quote - Supplier updates quote (only when not yet approved)
export const updateQuote = async (
  orderId: string,
  data: CreateQuotePayload
): Promise<Quote> => {
  try {
    const result = await request<{ quote: Quote }>(
      `/orders/${orderId}/quote`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
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

// PATCH /orders/:id/quote/withdraw - Supplier withdraws their quote (only when not yet approved)
export const withdrawQuote = async (orderId: string): Promise<Quote> => {
  try {
    const result = await request<{ quote: Quote }>(
      `/orders/${orderId}/quote/withdraw`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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

/** Create order + quote from a conversation that has no order (custom/personalized quote flow). */
export const createQuoteFromConversation = async (
  conversationId: string,
  data: CreateQuotePayload
): Promise<{ order: Order; quote: Quote }> => {
  try {
    const result = await request<{ order: Order; quote: Quote }>(
      `/orders/from-conversation/${conversationId}/quote`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      t('errors.requestFailed')
    );
    return { order: result.order, quote: result.quote };
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









