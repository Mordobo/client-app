import { t } from '@/i18n';
import { request } from './auth';

export interface Address {
  id: string;
  name: string;
  type: 'home' | 'office' | 'other';
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  postal_code?: string;
  country: string;
  is_default: boolean;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
}

export interface AddressesResponse {
  addresses: Address[];
}

export interface AddressResponse {
  address: Address;
}

export interface CreateAddressData {
  name: string;
  type: 'home' | 'office' | 'other';
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  postal_code?: string;
  country: string;
  is_default?: boolean;
  latitude?: number;
  longitude?: number;
}

export interface UpdateAddressData extends Partial<CreateAddressData> {
  id: string;
}

// GET /addresses - Get all addresses
export const getAddresses = async (): Promise<Address[]> => {
  try {
    const result = await request<AddressesResponse>(
      '/addresses',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      t('addresses.fetchFailed')
    );
    return result.addresses;
  } catch (error) {
    throw error;
  }
};

// POST /addresses - Create new address
export const createAddress = async (data: CreateAddressData): Promise<Address> => {
  try {
    const result = await request<AddressResponse>(
      '/addresses',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      },
      t('addresses.createFailed')
    );
    return result.address;
  } catch (error) {
    throw error;
  }
};

// PUT /addresses/:id - Update address
export const updateAddress = async (data: UpdateAddressData): Promise<Address> => {
  try {
    const { id, ...updateData } = data;
    const result = await request<AddressResponse>(
      `/addresses/${id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      },
      t('addresses.updateFailed')
    );
    return result.address;
  } catch (error) {
    throw error;
  }
};

// PUT /addresses/:id/set-default - Set address as default
export const setDefaultAddress = async (id: string): Promise<Address> => {
  try {
    const result = await request<AddressResponse>(
      `/addresses/${id}/set-default`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      t('addresses.setDefaultFailed')
    );
    return result.address;
  } catch (error) {
    throw error;
  }
};

// DELETE /addresses/:id - Delete address
export const deleteAddress = async (id: string): Promise<void> => {
  try {
    await request<void>(
      `/addresses/${id}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      t('addresses.deleteFailed')
    );
  } catch (error) {
    throw error;
  }
};
