import { API_BASE } from '@/utils/apiConfig';

export interface Supplier {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  business_name?: string;
  service_category?: string;
  bio?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  profile_image?: string;
  gallery?: string[];
  years_experience?: number;
  hourly_rate?: number;
  rating: number;
  total_reviews: number;
  verified: boolean;
  availability?: string;
  response_time_hours?: number;
  status: string;
  created_at: string;
  distance_km?: number; // Distance in kilometers (when near_me filter is used)
}

export interface SupplierService {
  id: string;
  supplier_id: string;
  category_id: string;
  category_name?: string;
  category_key?: string;
  price?: number;
  description?: string;
  active: boolean;
}

export interface Review {
  id: string;
  client_id: string;
  client_name?: string;
  supplier_id: string;
  rating: number;
  comment?: string;
  photos?: string[];
  helpful_count: number;
  created_at: string;
}

export interface SuppliersResponse {
  suppliers: Supplier[];
  total: number;
  limit: number;
  offset: number;
}

export interface SupplierProfileResponse {
  supplier: Supplier;
}

export interface SupplierServicesResponse {
  services: SupplierService[];
}

export interface SupplierReviewsResponse {
  reviews: Review[];
  total: number;
  average_rating: number;
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

export interface FetchSuppliersParams {
  category?: string;
  location?: string;
  rating?: number;
  query?: string; // Text search
  sort_by?: 'rating' | 'price' | 'distance' | 'reviews'; // Sort options
  available_today?: boolean; // Filter by availability
  near_me?: boolean; // Filter by proximity
  user_lat?: number; // User latitude for distance calculation
  user_lng?: number; // User longitude for distance calculation
  limit?: number;
  offset?: number;
}

// GET /suppliers - Fetch suppliers with filters
export const fetchSuppliers = async (
  params: FetchSuppliersParams = {}
): Promise<SuppliersResponse> => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.category) queryParams.append('category', params.category);
    if (params.location) queryParams.append('location', params.location);
    if (params.rating) queryParams.append('rating', params.rating.toString());
    if (params.query) queryParams.append('query', params.query);
    if (params.sort_by) queryParams.append('sort_by', params.sort_by);
    if (params.available_today) queryParams.append('available_today', 'true');
    if (params.near_me) queryParams.append('near_me', 'true');
    if (params.user_lat !== undefined) queryParams.append('user_lat', params.user_lat.toString());
    if (params.user_lng !== undefined) queryParams.append('user_lng', params.user_lng.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());

    const url = `${API_BASE}/suppliers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || 'Failed to fetch suppliers',
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

// GET /suppliers/:id - Fetch supplier profile
export const fetchSupplierProfile = async (
  supplierId: string
): Promise<Supplier> => {
  try {
    const response = await fetch(`${API_BASE}/suppliers/${supplierId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || 'Failed to fetch supplier profile',
        response.status
      );
    }

    const data: SupplierProfileResponse = await response.json();
    return data.supplier;
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

// GET /suppliers/:id/services - Fetch supplier services
export const fetchSupplierServices = async (
  supplierId: string
): Promise<SupplierService[]> => {
  try {
    const response = await fetch(`${API_BASE}/suppliers/${supplierId}/services`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || 'Failed to fetch supplier services',
        response.status
      );
    }

    const data: SupplierServicesResponse = await response.json();
    return data.services;
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

// GET /suppliers/:id/reviews - Fetch supplier reviews
export const fetchSupplierReviews = async (
  supplierId: string
): Promise<SupplierReviewsResponse> => {
  try {
    const response = await fetch(`${API_BASE}/suppliers/${supplierId}/reviews`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || 'Failed to fetch supplier reviews',
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

// GET /suppliers/:id/availability - Get supplier availability
export interface AvailabilitySlot {
  date: string; // ISO date string (YYYY-MM-DD)
  time: string; // Time in HH:MM format
  available: boolean;
}

export interface SupplierAvailabilityResponse {
  slots: AvailabilitySlot[];
  unavailable_dates: string[]; // Array of ISO date strings
}

export const fetchSupplierAvailability = async (
  supplierId: string,
  startDate?: string, // ISO date string
  endDate?: string // ISO date string
): Promise<SupplierAvailabilityResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('start_date', startDate);
    if (endDate) queryParams.append('end_date', endDate);

    const url = `${API_BASE}/suppliers/${supplierId}/availability${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || 'Failed to fetch supplier availability',
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






