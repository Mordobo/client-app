import { API_BASE } from '@/utils/apiConfig';
import { createApiHeaders } from '../utils/apiHeaders';

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
  console.log('[Categories API] fetchCategories() called');
  console.log('[Categories API] API_BASE:', API_BASE);
  try {
    const url = `${API_BASE}/services/categories`;
    console.log('[Categories API] Fetching from URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: createApiHeaders(),
    });
    console.log('[Categories API] Response received - Status:', response.status, 'OK:', response.ok);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Categories API] Request failed -', 'Status:', response.status, 'Error:', errorData);
      throw new ApiError(
        errorData.message || 'Failed to fetch categories',
        response.status
      );
    }

    const data: CategoriesResponse = await response.json();
    console.log('[Categories API] Data received -', 'Has categories:', !!data.categories, 'Length:', data.categories?.length);
    
    // Validate response structure to prevent crashes
    if (!data || typeof data !== 'object') {
      console.error('[Categories API] Invalid response structure:', data);
      throw new ApiError('Invalid response format from server', 500);
    }
    
    // Ensure categories is always an array
    const categories = Array.isArray(data.categories) ? data.categories : [];
    console.log('[Categories API] Returning', categories.length, 'categories');
    return categories;
  } catch (error) {
    console.error('[Categories API] Error in fetchCategories:',  {
      name: error instanceof Error ? error.name : 'unknown',
      message: error instanceof Error ? error.message : String(error)
    });
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
  console.log('[Categories API] fetchCategoryWithSubcategories() called - ID:', categoryId);
  try {
    const url = `${API_BASE}/services/categories/${categoryId}`;
    console.log('[Categories API] Fetching from URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: createApiHeaders(),
    });
    console.log('[Categories API] Response received - Status:', response.status, 'OK:', response.ok);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Categories API] Request failed -', 'Status:', response.status, 'Error:', errorData);
      throw new ApiError(
        errorData.message || 'Failed to fetch category',
        response.status
      );
    }

    const data: CategoryWithSubcategories = await response.json();
    console.log('[Categories API] Data received -', {
      hasCategory: !!data.category,
      hasSubcategories: !!data.subcategories,
      subcategoriesLength: data.subcategories?.length
    });
    
    // Validate response structure to prevent crashes
    if (!data || typeof data !== 'object') {
      console.error('[Categories API] Invalid response structure:', data);
      throw new ApiError('Invalid response format from server', 500);
    }
    
    if (!data.category) {
      console.error('[Categories API] Category not found in response for ID:', categoryId);
      throw new ApiError('Category not found in response', 404);
    }
    
    // Ensure subcategories is always an array
    const result = {
      category: data.category,
      subcategories: Array.isArray(data.subcategories) ? data.subcategories : [],
    };
    console.log('[Categories API] Returning category:', result.category.id);
    return result;
  } catch (error) {
    console.error('[Categories API] Error in fetchCategoryWithSubcategories:', {
      name: error instanceof Error ? error.name : 'unknown',
      message: error instanceof Error ? error.message : String(error)
    });
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
