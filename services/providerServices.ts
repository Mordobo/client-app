import { t } from "@/i18n";
import { request } from "./auth";

export interface ProviderService {
  id: string;
  supplierId: string;
  name: string;
  description: string | null;
  price: number;
  isActive: boolean;
  orderIndex: number;
  categoryId: string | null;
  categoryName: string | null;
  categoryKey: string | null;
  durationMinutes: number | null;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderServicesListResponse {
  services: ProviderService[];
  total: number;
  activeCount: number;
}

export const getProviderServices = async (
  search?: string
): Promise<ProviderServicesListResponse> => {
  const qs = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  return request<ProviderServicesListResponse>(
    `/api/providers/services${qs}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
    t("providerDashboard.providerServices.errors.listFailed")
  );
};

export const getProviderService = async (
  id: string
): Promise<{ service: ProviderService }> => {
  return request<{ service: ProviderService }>(
    `/api/providers/services/${id}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
    t("providerDashboard.providerServices.errors.listFailed")
  );
};

export interface CreateProviderServicePayload {
  name: string;
  description?: string;
  price: number;
  isActive?: boolean;
  categoryId?: string | null;
  durationMinutes?: number | null;
  icon?: string | null;
}

export const createProviderService = async (
  payload: CreateProviderServicePayload
): Promise<{ service: ProviderService }> => {
  return request<{ service: ProviderService }>(
    "/api/providers/services",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: payload.name.trim(),
        description: payload.description?.trim() ?? undefined,
        price: payload.price,
        isActive: payload.isActive ?? true,
        categoryId: payload.categoryId ?? undefined,
        durationMinutes: payload.durationMinutes ?? undefined,
        icon: payload.icon ?? undefined,
      }),
    },
    t("providerDashboard.providerServices.errors.createFailed")
  );
};

export interface UpdateProviderServicePayload {
  name?: string;
  description?: string;
  price?: number;
  isActive?: boolean;
  categoryId?: string | null;
  durationMinutes?: number | null;
  icon?: string | null;
}

export const updateProviderService = async (
  id: string,
  payload: UpdateProviderServicePayload
): Promise<{ service: ProviderService }> => {
  return request<{ service: ProviderService }>(
    `/api/providers/services/${id}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    t("providerDashboard.providerServices.errors.updateFailed")
  );
};

export const updateProviderServiceStatus = async (
  id: string,
  isActive: boolean
): Promise<{ isActive: boolean }> => {
  return request<{ isActive: boolean }>(
    `/api/providers/services/${id}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    },
    t("providerDashboard.providerServices.errors.updateStatusFailed")
  );
};

export const reorderProviderServices = async (
  order: Array<{ id: string; orderIndex: number }>
): Promise<{ message: string }> => {
  return request<{ message: string }>(
    "/api/providers/services/reorder",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order }),
    },
    t("providerDashboard.providerServices.errors.reorderFailed")
  );
};

export const deleteProviderService = async (
  id: string
): Promise<{ message: string }> => {
  return request<{ message: string }>(
    `/api/providers/services/${id}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    },
    t("providerDashboard.providerServices.errors.deleteFailed")
  );
};
