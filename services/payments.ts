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
}

// POST /payments - Create payment
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
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || 'Failed to create payment',
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
// PAYMENT METHODS
// ============================================

export interface PaymentMethod {
  id: string;
  type: 'visa' | 'mastercard' | 'amex' | 'paypal' | 'apple_pay' | 'google_pay';
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
  type: 'visa' | 'mastercard' | 'amex' | 'paypal' | 'apple_pay' | 'google_pay';
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









