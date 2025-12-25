import { Platform } from 'react-native';
import { createApiHeaders } from '../utils/apiHeaders';

// API base URL configuration
const getApiUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
  
  // Android emulator uses 10.0.2.2 instead of localhost
  if (Platform.OS === 'android' && /localhost/i.test(envUrl)) {
    return envUrl.replace(/localhost/gi, '10.0.2.2');
  }
  
  return envUrl;
};

const API_BASE = getApiUrl();

export interface Category {
  id: string;
  name: string;
  name_key: string;
  icon: string;
  color: string;
  sort_order?: number;
  parent_id?: string | null;
}

export interface CategoryWithSubcategories {
  category: Category;
  subcategories: Category[];
}

export interface CategoriesResponse {
  categories: Category[];
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

// GET /services/categories - Fetch all parent categories
export const fetchCategories = async (): Promise<Category[]> => {
  try {
    const response = await fetch(`${API_BASE}/services/categories`, {
      method: 'GET',
      headers: createApiHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || 'Failed to fetch categories',
        response.status
      );
    }

    const data: CategoriesResponse = await response.json();
    return data.categories;
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

// GET /services/categories/:id - Fetch category with subcategories
export const fetchCategoryWithSubcategories = async (
  categoryId: string
): Promise<CategoryWithSubcategories> => {
  try {
    const response = await fetch(`${API_BASE}/services/categories/${categoryId}`, {
      method: 'GET',
      headers: createApiHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || 'Failed to fetch category',
        response.status
      );
    }

    const data: CategoryWithSubcategories = await response.json();
    return data;
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






