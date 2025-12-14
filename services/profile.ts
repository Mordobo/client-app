import { t } from '@/i18n';
import { RegisterResponseUser, request } from './auth';

export interface UpdateProfilePayload {
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  profileImage?: string;
  country?: string;
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
  if (payload.phoneNumber !== undefined) {
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
