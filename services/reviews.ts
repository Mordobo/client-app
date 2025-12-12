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

export interface Review {
  id: string;
  order_id?: string;
  client_id: string;
  supplier_id: string;
  rating: number;
  comment?: string;
  photos?: string[];
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

export interface ReviewResponse {
  review: Review;
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

interface CreateReviewData {
  order_id?: string;
  supplier_id: string;
  rating: number;
  comment?: string;
  photos?: string[];
}

// POST /reviews - Create review
export const createReview = async (data: CreateReviewData): Promise<Review> => {
  try {
    const token = await getToken();
    
    const response = await fetch(`${API_BASE}/reviews`, {
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
        errorData.message || 'Failed to create review',
        response.status
      );
    }

    const result: ReviewResponse = await response.json();
    return result.review;
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





