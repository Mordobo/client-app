import { request, ApiError as AuthApiError } from './auth';
import { t } from '@/i18n';
import { Supplier } from './suppliers';

export interface FavoriteSupplier extends Supplier {
  favorite_id: string;
  favorited_at: string;
  jobs_with_user: number;
}

export interface FavoritesResponse {
  favorites: FavoriteSupplier[];
  total: number;
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

// GET /favorites - Get user's favorite suppliers
export const fetchFavorites = async (): Promise<FavoritesResponse> => {
  try {
    const data = await request<FavoritesResponse>(
      '/favorites',
      {
        method: 'GET',
      },
      t('errors.requestFailed')
    );
    return data;
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

// POST /favorites - Add supplier to favorites
export const addFavorite = async (supplierId: string): Promise<{ favorite: { id: string } }> => {
  try {
    const result = await request<{ favorite: { id: string } }>(
      '/favorites',
      {
        method: 'POST',
        body: JSON.stringify({ supplier_id: supplierId }),
      },
      t('errors.requestFailed')
    );
    return result;
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

// DELETE /favorites/:supplierId - Remove supplier from favorites
export const removeFavorite = async (supplierId: string): Promise<void> => {
  try {
    await request<void>(
      `/favorites/${supplierId}`,
      {
        method: 'DELETE',
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
