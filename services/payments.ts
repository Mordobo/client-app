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









