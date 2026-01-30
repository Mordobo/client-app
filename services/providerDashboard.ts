import { t } from "@/i18n";
import { request } from "./auth";

export interface ProviderDashboardStats {
  todayEarnings: number;
  weekEarnings: number;
  todayJobs: number;
  weekJobs: number;
  averageRating: number;
  reviewCount: number;
}

export interface ProviderDashboardRequest {
  id: string;
  clientId: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  scheduledAt: string | null;
  address: string;
  quoteTotal: number | null;
}

export interface ProviderDashboardScheduleItem {
  id: string;
  clientId: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  scheduledAt: string | null;
  address: string;
  status: string;
}

export const getDashboardStats = async (): Promise<ProviderDashboardStats> => {
  return request<ProviderDashboardStats>(
    "/api/providers/dashboard/stats",
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
    t("providerDashboard.errors.statsFailed"),
  );
};

export const getDashboardRequests = async (): Promise<{
  requests: ProviderDashboardRequest[];
  count: number;
}> => {
  return request<{ requests: ProviderDashboardRequest[]; count: number }>(
    "/api/providers/dashboard/requests",
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
    t("providerDashboard.errors.requestsFailed"),
  );
};

export const getDashboardSchedule = async (
  date?: string,
): Promise<{ schedule: ProviderDashboardScheduleItem[]; date: string }> => {
  const qs = date ? `?date=${encodeURIComponent(date)}` : "";
  return request<{ schedule: ProviderDashboardScheduleItem[]; date: string }>(
    `/api/providers/dashboard/schedule${qs}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
    t("providerDashboard.errors.scheduleFailed"),
  );
};

export const getAvailability = async (): Promise<{ isAvailable: boolean }> => {
  return request<{ isAvailable: boolean }>(
    "/api/providers/availability",
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
    t("providerDashboard.errors.availabilityFailed"),
  );
};

export const setAvailability = async (
  isAvailable: boolean,
): Promise<{ isAvailable: boolean }> => {
  return request<{ isAvailable: boolean }>(
    "/api/providers/availability",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable }),
    },
    t("providerDashboard.errors.availabilityUpdateFailed"),
  );
};

export const acceptOrder = async (orderId: string): Promise<{ order: { id: string; status: string }; message: string }> => {
  return request<{ order: { id: string; status: string }; message: string }>(
    `/api/providers/orders/${orderId}/accept`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    t("providerDashboard.errors.acceptFailed"),
  );
};

export const rejectOrder = async (orderId: string): Promise<{ order: { id: string; status: string }; message: string }> => {
  return request<{ order: { id: string; status: string }; message: string }>(
    `/api/providers/orders/${orderId}/reject`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    t("providerDashboard.errors.rejectFailed"),
  );
};
