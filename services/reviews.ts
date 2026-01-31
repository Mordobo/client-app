import { t } from '@/i18n';
import { API_BASE } from '@/utils/apiConfig';
import { request } from './auth';
import { getToken } from '../utils/userStorage';

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

// Provider-side: review with client info and response
export interface ProviderReview {
  id: string;
  order_id: string | null;
  client_id: string;
  supplier_id: string;
  rating: number;
  comment: string | null;
  photos: string[] | null;
  helpful_count: number;
  created_at: string;
  provider_response: string | null;
  response_date: string | null;
  client_name: string | null;
  client_avatar: string | null;
}

export interface ProviderReviewsStats {
  averageRating: number;
  totalCount: number;
  responseRate: number;
  distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
}

export type ProviderReviewsFilter = 'all' | 'recent' | 'positive' | 'needs_response';
export type ProviderReviewsSort = 'recent' | 'highest_rating' | 'lowest_rating';

export interface GetProviderReviewsParams {
  filter?: ProviderReviewsFilter;
  sort?: ProviderReviewsSort;
  page?: number;
  limit?: number;
}

export interface GetProviderReviewsResponse {
  reviews: ProviderReview[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  stats: ProviderReviewsStats;
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

// GET /api/providers/reviews - List reviews for current provider
export const getProviderReviews = async (
  params?: GetProviderReviewsParams
): Promise<GetProviderReviewsResponse> => {
  const q = new URLSearchParams();
  if (params?.filter) q.set('filter', params.filter);
  if (params?.sort) q.set('sort', params.sort);
  if (params?.page != null) q.set('page', String(params.page));
  if (params?.limit != null) q.set('limit', String(params.limit));
  const qs = q.toString();
  return request<GetProviderReviewsResponse>(
    `/api/providers/reviews${qs ? `?${qs}` : ''}`,
    { method: 'GET', headers: { 'Content-Type': 'application/json' } },
    t('providerDashboard.providerReviews.errors.fetchFailed')
  );
};

// POST /api/providers/reviews/:id/respond - Provider responds to a review
export const respondToReview = async (
  reviewId: string,
  response: string
): Promise<{ review: { id: string; provider_response: string; response_date: string }; message: string }> => {
  return request<{ review: { id: string; provider_response: string; response_date: string }; message: string }>(
    `/api/providers/reviews/${encodeURIComponent(reviewId)}/respond`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: response.trim() }),
    },
    t('providerDashboard.providerReviews.errors.respondFailed')
  );
};






