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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'services/categories.ts:35',message:'fetchCategories entry',data:{apiBase:API_BASE},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    const url = `${API_BASE}/services/categories`;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'services/categories.ts:40',message:'fetchCategories before fetch',data:{url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const response = await fetch(url, {
      method: 'GET',
      headers: createApiHeaders(),
    });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'services/categories.ts:47',message:'fetchCategories after fetch',data:{ok:response.ok,status:response.status,statusText:response.statusText},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'services/categories.ts:52',message:'fetchCategories error response',data:{status:response.status,errorData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      throw new ApiError(
        errorData.message || 'Failed to fetch categories',
        response.status
      );
    }

    const data: CategoriesResponse = await response.json();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'services/categories.ts:60',message:'fetchCategories success',data:{hasCategories:!!data.categories,categoriesLength:data.categories?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    // Validate response structure to prevent crashes
    if (!data || typeof data !== 'object') {
      throw new ApiError('Invalid response format from server', 500);
    }
    
    // Ensure categories is always an array
    return Array.isArray(data.categories) ? data.categories : [];
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'services/categories.ts:65',message:'fetchCategories catch',data:{errorName:error instanceof Error?error.name:'unknown',errorMessage:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'services/categories.ts:65',message:'fetchCategoryWithSubcategories entry',data:{categoryId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    const url = `${API_BASE}/services/categories/${categoryId}`;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'services/categories.ts:70',message:'fetchCategoryWithSubcategories before fetch',data:{url}},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const response = await fetch(url, {
      method: 'GET',
      headers: createApiHeaders(),
    });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'services/categories.ts:77',message:'fetchCategoryWithSubcategories after fetch',data:{ok:response.ok,status:response.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'services/categories.ts:82',message:'fetchCategoryWithSubcategories error response',data:{status:response.status,errorData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      throw new ApiError(
        errorData.message || 'Failed to fetch category',
        response.status
      );
    }

    const data: CategoryWithSubcategories = await response.json();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'services/categories.ts:89',message:'fetchCategoryWithSubcategories success',data:{hasCategory:!!data.category,hasSubcategories:!!data.subcategories,subcategoriesLength:data.subcategories?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    // Validate response structure to prevent crashes
    if (!data || typeof data !== 'object') {
      throw new ApiError('Invalid response format from server', 500);
    }
    
    if (!data.category) {
      throw new ApiError('Category not found in response', 404);
    }
    
    // Ensure subcategories is always an array
    return {
      category: data.category,
      subcategories: Array.isArray(data.subcategories) ? data.subcategories : [],
    };
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'services/categories.ts:94',message:'fetchCategoryWithSubcategories catch',data:{errorName:error instanceof Error?error.name:'unknown',errorMessage:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
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






