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

export type ProviderRequestStatusFilter = "new" | "pending" | "all";

export interface ProviderDashboardRequest {
  id: string;
  clientId: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  scheduledAt: string | null;
  address: string;
  quoteTotal: number | null;
  createdAt?: string | null;
  isUrgent?: boolean;
  /** Order status: 'pending' = can accept/decline, 'accepted' = scheduled */
  status?: string;
}

export interface ProviderRequestCounts {
  newCount: number;
  pendingCount: number;
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

export type ProviderActiveJobStatus = "in_progress" | "on_way" | "scheduled";

export interface ProviderActiveJob {
  id: string;
  orderId: string;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  serviceId: string;
  serviceName: string;
  status: ProviderActiveJobStatus;
  address: string;
  agreedPrice: number;
  scheduledAt: string | null;
  /** ETA in minutes from now (for on_way) or remaining minutes (for in_progress). Updated periodically. */
  etaMinutes?: number;
}

/** Extended job for detail screen (optional description, address line 2, client rating). */
export interface ProviderActiveJobDetail extends ProviderActiveJob {
  serviceDescription?: string;
  addressLine2?: string;
  clientRating?: number;
  reviewCount?: number;
}

export const EXAMPLE_ACTIVE_JOB_ID = "example-1";

/** Example active job for demo; matches design (Ana Martínez, Reparación de calentador, Av. Insurgentes). */
export function getExampleActiveJob(): ProviderActiveJobDetail {
  return {
    id: EXAMPLE_ACTIVE_JOB_ID,
    orderId: "example-order-1",
    clientId: "example-client-1",
    clientName: "Ana Martínez",
    clientPhone: "+525512345678",
    serviceId: "example-service-1",
    serviceName: "Reparación de calentador",
    status: "in_progress",
    address: "Av. Insurgentes Sur 234",
    agreedPrice: 450,
    scheduledAt: null,
    etaMinutes: 45,
    serviceDescription:
      "El calentador no enciende y hace ruidos extraños al intentar prender.",
    addressLine2: "Col. Roma Norte, CDMX",
    clientRating: 4.8,
    reviewCount: 23,
  };
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

export const getDashboardRequestCounts = async (): Promise<ProviderRequestCounts> => {
  return request<ProviderRequestCounts>(
    "/api/providers/dashboard/requests/counts",
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
    t("providerDashboard.errors.requestsFailed"),
  );
};

export const getDashboardRequests = async (
  status?: ProviderRequestStatusFilter,
): Promise<{ requests: ProviderDashboardRequest[]; count: number }> => {
  const qs = status && status !== "new" ? `?status=${encodeURIComponent(status)}` : "";
  return request<{ requests: ProviderDashboardRequest[]; count: number }>(
    `/api/providers/dashboard/requests${qs}`,
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

export const getProviderActiveJobs = async (): Promise<ProviderActiveJob[]> => {
  const res = await request<{ jobs: ProviderActiveJob[] }>(
    "/api/providers/dashboard/active-jobs",
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
    t("providerDashboard.errors.activeJobsFailed"),
  );
  return res?.jobs ?? [];
};

// ========== EARNINGS ==========
export type EarningsPeriod = "today" | "week" | "month" | "custom" | "all";
export type EarningsTransactionStatus = "completed" | "pending" | "processing";

export interface ProviderEarningsSummary {
  balance: number;
  todayEarnings: number;
  weekEarnings: number;
  monthEarnings: number;
  nextPayoutDate: string;
  totalJobs: number;
  averagePerJob: number;
  topServiceName: string | null;
}

export interface ProviderEarningsChartPoint {
  date: string;
  total: number;
}

export interface ProviderEarningsTransaction {
  id: string;
  orderId: string;
  date: string;
  clientName: string;
  serviceName: string;
  amount: number;
  status: EarningsTransactionStatus;
  type: "income" | "pending_income" | "withdrawal";
}

export interface ProviderEarningsTransactionsResponse {
  transactions: ProviderEarningsTransaction[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export const getEarningsSummary = async (
  params?: { period?: EarningsPeriod; from?: string; to?: string },
): Promise<ProviderEarningsSummary> => {
  const q = new URLSearchParams();
  if (params?.period) q.set("period", params.period);
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  const qs = q.toString();
  return request<ProviderEarningsSummary>(
    `/api/providers/dashboard/earnings/summary${qs ? `?${qs}` : ""}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
    t("providerDashboard.earnings.errors.summaryFailed"),
  );
};

export const getEarningsChart = async (
  period: "week" | "month" = "week",
): Promise<{ data: ProviderEarningsChartPoint[] }> => {
  return request<{ data: ProviderEarningsChartPoint[] }>(
    `/api/providers/dashboard/earnings/chart?period=${period}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
    t("providerDashboard.earnings.errors.chartFailed"),
  );
};

export const getEarningsTransactions = async (
  params?: {
    period?: EarningsPeriod;
    from?: string;
    to?: string;
    status?: "all" | EarningsTransactionStatus;
    page?: number;
    limit?: number;
  },
): Promise<ProviderEarningsTransactionsResponse> => {
  const q = new URLSearchParams();
  if (params?.period) q.set("period", params.period);
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  if (params?.status) q.set("status", params.status);
  if (params?.page != null) q.set("page", String(params.page));
  if (params?.limit != null) q.set("limit", String(params.limit));
  const qs = q.toString();
  return request<ProviderEarningsTransactionsResponse>(
    `/api/providers/dashboard/earnings/transactions${qs ? `?${qs}` : ""}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
    t("providerDashboard.earnings.errors.transactionsFailed"),
  );
};

export const exportEarnings = async (
  params?: { format?: "csv"; period?: EarningsPeriod; from?: string; to?: string },
): Promise<{ csv: string; filename: string }> => {
  const q = new URLSearchParams();
  q.set("format", params?.format ?? "csv");
  if (params?.period) q.set("period", params.period);
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  const qs = q.toString();
  return request<{ csv: string; filename: string }>(
    `/api/providers/dashboard/earnings/export?${qs}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
    t("providerDashboard.earnings.errors.exportFailed"),
  );
};
