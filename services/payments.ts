import { API_BASE } from '@/utils/apiConfig';
import { getToken } from '../utils/userStorage';

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  provider: string;
  provider_ref?: string;
  status: string;
  created_at: string;
  card_type?: string | null;
  card_brand?: string | null;
  card_last4?: string | null;
  terms_accepted_at?: string | null;
  legal_terms_version?: string | null;
}

export interface PaymentResponse {
  payment: Payment;
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

interface CreatePaymentData {
  order_id: string;
  amount: number;
  provider: 'card' | 'apple_pay' | 'google_pay';
  payment_method_id?: string;
  terms_accepted: true;
}

export interface BookAndPayData {
  service_id: string;
  category_id?: string;
  supplier_id: string;
  scheduled_at?: string;
  address?: string;
  notes?: string;
  amount: number;
  provider: 'card' | 'apple_pay' | 'google_pay';
  payment_method_id?: string;
  terms_accepted: true;
}

interface BookAndPayResponse {
  order: { id: string; status: string; [key: string]: unknown };
  payment: Payment;
}

export const bookAndPay = async (data: BookAndPayData): Promise<BookAndPayResponse> => {
  try {
    const token = await getToken();

    const response = await fetch(`${API_BASE}/payments/book`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { message?: string; code?: string };
      throw new ApiError(
        errorData.message || 'Failed to complete booking',
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Network error. Please check your connection.', 0, error);
  }
};

// POST /payments - Create payment (for existing orders: quote flow)
export const createPayment = async (data: CreatePaymentData): Promise<Payment> => {
  try {
    const token = await getToken();
    
    const response = await fetch(`${API_BASE}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { message?: string; code?: string };
      throw new ApiError(
        errorData.message || 'Failed to create payment',
        response.status,
        errorData
      );
    }

    const result: PaymentResponse = await response.json();
    return result.payment;
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

// GET /payments/:id - Fetch payment details
export const fetchPayment = async (paymentId: string): Promise<Payment> => {
  try {
    const token = await getToken();
    
    const response = await fetch(`${API_BASE}/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || 'Failed to fetch payment',
        response.status
      );
    }

    const result: PaymentResponse = await response.json();
    return result.payment;
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

// ============================================
// AZUL PAYMENT PAGE (hosted checkout)
// ============================================

export interface AzulConfig {
  enabled: boolean;
  environment?: 'test' | 'live';
}

export interface AzulSessionData {
  /** Existing order (quote flow). */
  order_id?: string;
  /** New booking flow (order does not exist yet). */
  service_id?: string;
  category_id?: string;
  supplier_id?: string;
  scheduled_at?: string;
  address?: string;
  notes?: string;
  amount: number;
  terms_accepted: true;
  /**
   * Native only: deep link (e.g. mordobo://booking/payment-result) where the API
   * redirects the browser after AZUL returns, so the in-app browser closes and
   * control comes back to the app.
   */
  return_deep_link?: string;
}

export interface AzulSession {
  payment_id: string;
  order_id: string;
  order_number: string;
  /** Bridge URL that redirects the browser to AZUL's secure Payment Page. */
  checkout_url: string;
}

// GET /payments/azul/config - Whether the AZUL redirect flow is active on the API
export const getAzulConfig = async (): Promise<AzulConfig> => {
  try {
    const token = await getToken();
    const response = await fetch(`${API_BASE}/payments/azul/config`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) return { enabled: false };
    return await response.json();
  } catch {
    // If the check fails we fall back to the standard (mock) flow.
    return { enabled: false };
  }
};

// POST /payments/azul/session - Create a pending payment and get the AZUL checkout URL
export const createAzulSession = async (data: AzulSessionData): Promise<AzulSession> => {
  try {
    const token = await getToken();
    const response = await fetch(`${API_BASE}/payments/azul/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { message?: string; code?: string };
      throw new ApiError(
        errorData.message || 'Failed to start AZUL checkout',
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Network error. Please check your connection.', 0, error);
  }
};

// ============================================
// PAYMENT METHODS
// ============================================

/** Stored card / wallet discriminator (aligned with API `payment_methods.type`). */
export type PaymentMethodType =
  | 'visa'
  | 'mastercard'
  | 'amex'
  | 'discover'
  | 'diners'
  | 'jcb'
  | 'unionpay'
  | 'maestro'
  | 'mir'
  | 'elo'
  | 'hipercard'
  | 'cartes_bancaires'
  | 'interac'
  | 'other_card'
  | 'paypal'
  | 'apple_pay'
  | 'google_pay';

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  last4?: string;
  expiry_month?: number;
  expiry_year?: number;
  email?: string;
  is_default: boolean;
  brand?: string;
  card_holder_name?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethodsResponse {
  paymentMethods: PaymentMethod[];
}

export interface PaymentMethodResponse {
  paymentMethod: PaymentMethod;
}

export interface CreatePaymentMethodData {
  type: PaymentMethodType;
  last4?: string;
  expiry_month?: number;
  expiry_year?: number;
  email?: string;
  brand?: string;
  card_holder_name?: string;
  is_default?: boolean;
}

// GET /payments/methods - Get all payment methods
export const getPaymentMethods = async (): Promise<PaymentMethod[]> => {
  try {
    const token = await getToken();
    
    const response = await fetch(`${API_BASE}/payments/methods`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || 'Failed to fetch payment methods',
        response.status
      );
    }

    const result: PaymentMethodsResponse = await response.json();
    return result.paymentMethods;
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

// POST /payments/methods - Create new payment method
export const createPaymentMethod = async (data: CreatePaymentMethodData): Promise<PaymentMethod> => {
  try {
    const token = await getToken();
    
    const response = await fetch(`${API_BASE}/payments/methods`, {
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
        errorData.message || 'Failed to create payment method',
        response.status,
        errorData
      );
    }

    const result: PaymentMethodResponse = await response.json();
    return result.paymentMethod;
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

// PUT /payments/methods/:id/set-default - Set payment method as default
export const setDefaultPaymentMethod = async (id: string): Promise<PaymentMethod> => {
  try {
    const token = await getToken();
    
    const response = await fetch(`${API_BASE}/payments/methods/${id}/set-default`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || 'Failed to set default payment method',
        response.status
      );
    }

    const result: PaymentMethodResponse = await response.json();
    return result.paymentMethod;
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

// DELETE /payments/methods/:id - Delete payment method
export const deletePaymentMethod = async (id: string): Promise<void> => {
  try {
    const token = await getToken();
    
    const response = await fetch(`${API_BASE}/payments/methods/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || 'Failed to delete payment method',
        response.status
      );
    }
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







