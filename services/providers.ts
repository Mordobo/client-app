import { t } from '@/i18n';
import { API_BASE, request } from './auth';

export interface ProviderStatusResponse {
  isProvider: boolean;
  isVerified: boolean;
  onboardingCompleted: boolean;
  onboardingStep?: number; // Current step (0-7)
}

export interface ProviderOnboardingData {
  // Step 1: Business Info
  businessName?: string;
  categoryId?: string;
  description?: string;
  
  // Step 2: Services (will be handled separately)
  // Step 3: Availability
  availability?: {
    days: number[]; // 0-6 (Monday-Sunday)
    startTime?: string; // HH:MM format
    endTime?: string; // HH:MM format
    coverageRadius?: number; // in km
  };
  
  // Step 4: Documents (will be handled separately via file upload)
  // Step 5: Bank Account
  bankName?: string;
  clabe?: string; // CLABE Interbancaria
  accountHolder?: string;
  
  // Step 6: Terms (handled client-side)
  // Step 7: Verification (handled by backend)
}

export interface SubmitOnboardingResponse {
  message: string;
  onboardingStep: number;
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
}

/**
 * Check if current user is a verified provider
 */
export const checkProviderStatus = async (): Promise<ProviderStatusResponse> => {
  try {
    return await request<ProviderStatusResponse>(
      '/api/providers/status',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      t('errors.checkProviderStatusFailed')
    );
  } catch (error) {
    // If endpoint doesn't exist yet, return default values
    console.warn('[Providers] Provider status endpoint not available:', error);
    return {
      isProvider: false,
      isVerified: false,
      onboardingCompleted: false,
    };
  }
};

/**
 * Submit onboarding data for a specific step
 */
export const submitOnboardingStep = async (
  step: number,
  data: Partial<ProviderOnboardingData>
): Promise<SubmitOnboardingResponse> => {
  return request<SubmitOnboardingResponse>(
    '/api/providers/onboarding',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        step,
        data,
      }),
    },
    t('errors.submitOnboardingFailed')
  );
};

/**
 * Get current onboarding progress
 */
export const getOnboardingProgress = async (): Promise<{
  currentStep: number;
  completedSteps: number[];
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
}> => {
  return request<{
    currentStep: number;
    completedSteps: number[];
    status: 'pending' | 'in_review' | 'approved' | 'rejected';
  }>(
    '/api/providers/onboarding/progress',
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    },
    t('errors.getOnboardingProgressFailed')
  );
};
