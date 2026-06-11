import { t } from '@/i18n';
import { RegisterResponseUser, request } from './auth';

export interface UpdateProfilePayload {
  fullName?: string;
  email?: string;
  phoneNumber?: string; // Old format: combined phone number (for backward compatibility)
  phoneExtension?: string; // New format: phone extension (e.g., +1, +34)
  phoneNumberOnly?: string; // New format: phone number without extension
  address?: string;
  profileImage?: string;
  country?: string;
  gender?: 'male' | 'female';
  dateOfBirth?: string; // ISO date string (YYYY-MM-DD)
}

export interface UpdateProfileResponse {
  message: string;
  user: RegisterResponseUser;
}

export interface GetProfileResponse {
  user: RegisterResponseUser;
}

/**
 * Update user profile
 */
export const updateProfile = async (
  payload: UpdateProfilePayload
): Promise<UpdateProfileResponse> => {
  const body: Record<string, unknown> = {};

  if (payload.fullName !== undefined) {
    body.full_name = payload.fullName.trim();
  }
  if (payload.email !== undefined) {
    body.email = payload.email.trim().toLowerCase();
  }
  // New format: send phoneExtension and phoneNumber separately
  if (payload.phoneExtension !== undefined && payload.phoneNumberOnly !== undefined) {
    body.phoneExtension = payload.phoneExtension;
    body.phoneNumber = payload.phoneNumberOnly;
  } else if (payload.phoneNumber !== undefined) {
    // Old format: send combined phone_number (backward compatibility)
    body.phone_number = payload.phoneNumber.trim();
  }
  if (payload.address !== undefined) {
    body.address = payload.address.trim();
  }
  if (payload.profileImage !== undefined) {
    body.profile_image = payload.profileImage;
  }
  if (payload.country !== undefined) {
    body.country = payload.country;
  }
  if (payload.gender !== undefined) {
    body.gender = payload.gender;
  }
  if (payload.dateOfBirth !== undefined) {
    body.date_of_birth = payload.dateOfBirth;
  }

  return request<UpdateProfileResponse>(
    '/auth/profile',
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
    t('errors.updateProfileFailed')
  );
};

/**
 * Get current user profile
 */
export const getProfile = async (): Promise<GetProfileResponse> => {
  return request<GetProfileResponse>(
    '/auth/profile',
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    },
    t('errors.getProfileFailed')
  );
};
