import { t } from "@/i18n";
import { request } from "./auth";

// ========== Provider profile (edit screen) ==========

export interface ProviderProfile {
  displayName: string;
  email: string;
  phoneNumber: string;
  categoryId: string | null;
  categoryName: string | null;
  bio: string;
  avatarUrl: string | null;
  yearsExperience: number | null;
  isEmailVerified: boolean;
}

/** All-time stats for provider profile stat cards (jobs, completion %, rating). */
export interface ProviderProfileStats {
  completedJobs: number;
  completionRatePercent: number;
  averageRating: number | null;
  reviewCount: number;
}

export interface UpdateProviderProfilePayload {
  displayName?: string;
  categoryId?: string | null;
  categoryName?: string;
  bio?: string;
  phoneNumber?: string;
  yearsExperience?: number | null;
}

/**
 * Get current provider profile (for edit form)
 */
export const getProviderProfile = async (): Promise<ProviderProfile> => {
  return request<ProviderProfile>(
    "/api/providers/profile",
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
    t("errors.getProviderProfileFailed"),
  );
};

export const getProviderProfileStats = async (): Promise<ProviderProfileStats> => {
  return request<ProviderProfileStats>(
    "/api/providers/profile/stats",
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
    t("errors.getProviderProfileStatsFailed"),
  );
};

/**
 * Update provider profile
 */
export const updateProviderProfile = async (
  payload: UpdateProviderProfilePayload,
): Promise<{ message: string }> => {
  return request<{ message: string }>(
    "/api/providers/profile",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    t("errors.updateProviderProfileFailed"),
  );
};

/**
 * Upload provider avatar (base64). Returns new avatar URL.
 */
export const uploadProviderAvatar = async (
  fileBase64: string,
  fileName?: string,
  mimeType?: string,
): Promise<{ message: string; avatarUrl: string }> => {
  return request<{ message: string; avatarUrl: string }>(
    "/api/providers/profile/avatar",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileBase64,
        fileName: fileName ?? "avatar.jpg",
        mimeType: mimeType ?? "image/jpeg",
      }),
    },
    t("errors.uploadProviderAvatarFailed"),
  );
};

/** Supplier status from backend. Only 'active' is allowed to access provider screens. */
export type ProviderAccountStatus = "pending" | "pending_verification" | "active" | "rejected" | "suspended";

export interface ProviderStatusResponse {
  isProvider: boolean;
  isVerified: boolean;
  onboardingCompleted: boolean;
  onboardingStep?: number; // Current step (0-7)
  /** Supplier account status. Must be 'active' to use provider tabs. */
  status?: ProviderAccountStatus;
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
  status: "pending" | "in_review" | "approved" | "rejected";
}

/**
 * Check if current user is a verified provider
 */
export const checkProviderStatus = async (): Promise<ProviderStatusResponse> => {
  try {
    return await request<ProviderStatusResponse>(
      "/api/providers/status",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
      t("errors.checkProviderStatusFailed"),
    );
  } catch (error) {
    // If endpoint doesn't exist yet, return default values
    console.warn("[Providers] Provider status endpoint not available:", error);
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
export const submitOnboardingStep = async (step: number, data: Partial<ProviderOnboardingData>): Promise<SubmitOnboardingResponse> => {
  return request<SubmitOnboardingResponse>(
    "/api/providers/onboarding",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        step,
        data,
      }),
    },
    t("errors.submitOnboardingFailed"),
  );
};

/**
 * Get current onboarding progress
 */
export const getOnboardingProgress = async (): Promise<{
  currentStep: number;
  completedSteps: number[];
  status: "pending" | "in_review" | "approved" | "rejected";
}> => {
  return request<{
    currentStep: number;
    completedSteps: number[];
    status: "pending" | "in_review" | "approved" | "rejected";
  }>(
    "/api/providers/onboarding/progress",
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
    t("errors.getOnboardingProgressFailed"),
  );
};

export type OnboardingDocumentType = "id_document" | "address_proof" | "certifications";

export interface OnboardingDocumentItem {
  documentType: OnboardingDocumentType;
  fileName: string;
  uploadedAt: string;
}

/**
 * Get list of uploaded onboarding documents (to show which have the green checkmark)
 */
export const getOnboardingDocuments = async (): Promise<{ documents: OnboardingDocumentItem[] }> => {
  return request<{ documents: OnboardingDocumentItem[] }>(
    "/api/providers/onboarding/documents",
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
    t("errors.getOnboardingDocumentsFailed"),
  );
};

/**
 * Upload an onboarding document (e.g. identificación oficial). Base64 from image picker.
 */
export const uploadOnboardingDocument = async (documentType: OnboardingDocumentType, fileBase64: string, fileName: string, mimeType?: string): Promise<{ message: string; documentType: string; uploadedAt: string }> => {
  return request<{ message: string; documentType: string; uploadedAt: string }>(
    "/api/providers/onboarding/documents",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        documentType,
        fileBase64,
        fileName,
        mimeType: mimeType ?? undefined,
      }),
    },
    t("errors.uploadOnboardingDocumentFailed"),
  );
};
