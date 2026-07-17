import { t } from "@/i18n";
import { request } from "./auth";
import { getProviderServices } from "./providerServices";
import { coerceSupplierProfileImage } from "./suppliers";

export interface ProviderDashboardStats {
  todayEarnings: number;
  weekEarnings: number;
  todayJobs: number;
  weekJobs: number;
  averageRating: number;
  reviewCount: number;
}

export type ProviderRequestStatusFilter = "new" | "pending" | "all";

/** Keys the API may use for the amount shown on request cards (quote flow vs direct catalog booking). */
const DASHBOARD_REQUEST_AMOUNT_KEYS = [
  "quoteTotal",
  "quote_total",
  "totalAmount",
  "total_amount",
  "agreedPrice",
  "agreed_price",
  "displayTotal",
  "display_total",
  "amount",
  "servicePrice",
  "service_price",
  "estimatedTotal",
  "estimated_total",
  /** Catalog / direct-hire payloads often expose the listed service fee as `price`. */
  "price",
  "basePrice",
  "base_price",
  "requestedAmount",
  "requested_amount",
] as const;

/** Nested objects where the backend may attach totals for direct catalog requests (MDB-387). */
const DASHBOARD_REQUEST_AMOUNT_NESTED = [
  "metadata",
  "service",
  "order",
  "quote",
  "requestedService",
  "catalogService",
  "booking",
] as const;

const MAX_AMOUNT_NEST_DEPTH = 4;

function coerceFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sumLineItemsTotal(raw: Record<string, unknown>): number | null {
  const li = raw.line_items ?? raw.lineItems;
  if (!Array.isArray(li) || li.length === 0) return null;
  let sum = 0;
  for (const row of li) {
    if (!isPlainRecord(row)) return null;
    const a = coerceFiniteNumber(row.amount ?? row.price);
    if (a == null) return null;
    sum += a;
  }
  return sum;
}

function pickAmountFromRecord(raw: Record<string, unknown>, depth = 0): number | null {
  if (depth > MAX_AMOUNT_NEST_DEPTH) return null;
  for (const key of DASHBOARD_REQUEST_AMOUNT_KEYS) {
    const n = coerceFiniteNumber(raw[key]);
    if (n != null) return n;
  }
  const lineSum = sumLineItemsTotal(raw);
  if (lineSum != null) return lineSum;
  if (depth >= MAX_AMOUNT_NEST_DEPTH) return null;
  for (const key of DASHBOARD_REQUEST_AMOUNT_NESTED) {
    const nested = raw[key];
    if (!isPlainRecord(nested)) continue;
    const inner = pickAmountFromRecord(nested, depth + 1);
    if (inner != null) return inner;
  }
  return null;
}

function resolveDashboardRequestServiceId(item: ProviderDashboardRequest, raw: Record<string, unknown>): string {
  const a = typeof raw.serviceId === "string" ? raw.serviceId.trim() : "";
  const b = typeof raw.service_id === "string" ? raw.service_id.trim() : "";
  const c = typeof item.serviceId === "string" ? item.serviceId.trim() : "";
  if (a || b || c) return a || b || c;
  const meta = raw.metadata;
  if (isPlainRecord(meta)) {
    const m1 = typeof meta.serviceId === "string" ? meta.serviceId.trim() : "";
    const m2 = typeof meta.service_id === "string" ? meta.service_id.trim() : "";
    if (m1 || m2) return m1 || m2;
  }
  const svc = raw.service;
  if (isPlainRecord(svc)) {
    const sid = typeof svc.id === "string" ? svc.id.trim() : "";
    if (sid) return sid;
  }
  return "";
}

function isMissingRequestAmount(quoteTotal: number | null | undefined): boolean {
  return quoteTotal == null || !Number.isFinite(quoteTotal);
}

/** When the dashboard API omits totals for direct catalog hires, use the provider's listed service price. */
async function enrichRequestsWithCatalogPrice(requests: ProviderDashboardRequest[]): Promise<ProviderDashboardRequest[]> {
  const needsCatalog = requests.some((r) => {
    if (!isMissingRequestAmount(r.quoteTotal)) return false;
    const raw = r as unknown as Record<string, unknown>;
    return !!resolveDashboardRequestServiceId(r, raw);
  });
  if (!needsCatalog) return requests;

  try {
    const { services } = await getProviderServices();
    const priceByServiceId = new Map<string, number>();
    for (const s of services) {
      priceByServiceId.set(s.id, s.price);
    }
    return requests.map((r) => {
      if (!isMissingRequestAmount(r.quoteTotal)) return r;
      const raw = r as unknown as Record<string, unknown>;
      const sid = resolveDashboardRequestServiceId(r, raw);
      if (!sid) return r;
      const listed = priceByServiceId.get(sid);
      if (listed == null || !Number.isFinite(listed)) return r;
      return { ...r, serviceId: sid, quoteTotal: listed };
    });
  } catch {
    return requests;
  }
}

/** Merge alternate API shapes (snake_case, direct-booking totals) into `quoteTotal` for list UIs. */
function normalizeProviderDashboardRequest(item: ProviderDashboardRequest): ProviderDashboardRequest {
  const raw = item as unknown as Record<string, unknown>;
  const serviceId = resolveDashboardRequestServiceId(item, raw);
  const base: ProviderDashboardRequest = { ...item, serviceId };

  const existing = coerceFiniteNumber(raw.quoteTotal ?? raw.quote_total);
  if (existing != null) return { ...base, quoteTotal: existing };

  const resolved = pickAmountFromRecord(raw);
  if (resolved != null) return { ...base, quoteTotal: resolved };

  return base;
}

export interface ProviderDashboardRequest {
  id: string;
  clientId: string;
  clientName: string;
  clientProfileImage?: string;
  serviceId: string;
  serviceName: string;
  scheduledAt: string | null;
  address: string;
  /** Best-effort total for the card; may come from quote or order total for direct hires. */
  quoteTotal: number | null;
  createdAt?: string | null;
  isUrgent?: boolean;
  /** Order status: 'pending_for_provider' = can accept/decline, 'pending_for_client' = quote sent waiting for client, 'accepted' = scheduled */
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

export type ProviderActiveJobStatus =
  | "pending"
  | "in_progress"
  | "on_way"
  | "scheduled"
  | "pending_review"
  /** Order is completed (e.g. client rated) but provider has not submitted provider_client_ratings yet */
  | "awaiting_provider_rating";

export interface ProviderActiveJob {
  id: string;
  orderId: string;
  clientId: string;
  clientName: string;
  clientProfileImage?: string;
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

/** Extended job for detail screen (optional description, address line 2, client rating, quote note). */
export interface ProviderActiveJobDetail extends ProviderActiveJob {
  serviceDescription?: string;
  addressLine2?: string;
  clientRating?: number;
  reviewCount?: number;
  /** Note from the quote (additional specs or comments from provider). */
  quoteNote?: string;
  /** Notes from the client when booking (additional instructions). */
  orderNotes?: string;
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

export type ProviderStatisticsPeriod = "week" | "month" | "year";

export interface ProviderStatisticsResponse {
  period: ProviderStatisticsPeriod;
  totalJobs: number;
  completedJobs: number;
  averageRating: number | null;
  reviewCountInPeriod: number;
  totalEarnings: number;
  repeatClients: number;
  averageResponseMinutes: number | null;
  completionRatePercent: number | null;
  hasEverCompletedJob: boolean;
}

export const getProviderStatistics = async (period: ProviderStatisticsPeriod): Promise<ProviderStatisticsResponse> => {
  const qs = new URLSearchParams({ period });
  return request<ProviderStatisticsResponse>(
    `/api/providers/dashboard/statistics?${qs.toString()}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
    t("providerDashboard.providerSettings.statisticsScreen.loadFailed"),
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

export const getDashboardRequests = async (status?: ProviderRequestStatusFilter): Promise<{ requests: ProviderDashboardRequest[]; count: number }> => {
  const qs = status && status !== "new" ? `?status=${encodeURIComponent(status)}` : "";
  const res = await request<{ requests: ProviderDashboardRequest[]; count: number }>(
    `/api/providers/dashboard/requests${qs}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
    t("providerDashboard.errors.requestsFailed"),
  );
  const normalized = (res.requests ?? []).map(normalizeProviderDashboardRequest);
  const requests = await enrichRequestsWithCatalogPrice(normalized);
  return { ...res, requests, count: res.count ?? requests.length };
};

export const getDashboardSchedule = async (date?: string): Promise<{ schedule: ProviderDashboardScheduleItem[]; date: string }> => {
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

export const setAvailability = async (isAvailable: boolean): Promise<{ isAvailable: boolean }> => {
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

// ========== PROVIDER SCHEDULE CONFIG (Availability screen) ==========
export interface TimeSlot {
  start: string; // "08:00"
  end: string; // "18:00"
}

export type WeeklyScheduleConfig = Record<string, TimeSlot[]>;

export interface BlockedDateItem {
  id?: string;
  startDate: string;
  endDate: string;
  label?: string;
}

/** Service area (map base, zones, distance pricing) returned with schedule-config. */
export interface ProviderScheduleServiceArea {
  baseAddress: string;
  latitude: number | null;
  longitude: number | null;
  zones: {
    id: string;
    name: string;
    enabled: boolean;
    latitude?: number | null;
    longitude?: number | null;
  }[];
  distanceChargeEnabled: boolean;
  distanceChargeAfterKm: number;
  distanceChargeRatePerKm: number;
}

export interface ProviderScheduleConfigResponse {
  scheduleConfig: WeeklyScheduleConfig;
  bufferMinutes: number;
  maxJobsPerDay: number;
  coverageRadiusKm: number | null;
  blockedDates: BlockedDateItem[];
  serviceArea?: ProviderScheduleServiceArea;
}

export const getProviderScheduleConfig = async (): Promise<ProviderScheduleConfigResponse> => {
  return request<ProviderScheduleConfigResponse>(
    "/api/providers/schedule-config",
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
    t("providerDashboard.availabilityConfig.errors.loadFailed"),
  );
};

export const putProviderScheduleConfig = async (payload: {
  scheduleConfig: WeeklyScheduleConfig;
  bufferMinutes?: number;
  maxJobsPerDay?: number;
  coverageRadiusKm?: number;
  blockedDates?: BlockedDateItem[];
  serviceArea?: ProviderScheduleServiceArea;
}): Promise<ProviderScheduleConfigResponse> => {
  return request<ProviderScheduleConfigResponse>(
    "/api/providers/schedule-config",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    t("providerDashboard.availabilityConfig.errors.saveFailed"),
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

/** Cancel an order already accepted by the client (provider cancels the scheduled request). */
export const cancelOrderByProvider = async (
  orderId: string
): Promise<{ order: { id: string; status: string }; message: string }> => {
  return request<{ order: { id: string; status: string }; message: string }>(
    `/api/providers/orders/${orderId}/cancel`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    t("providerDashboard.errors.cancelFailed"),
  );
};

// ========== COMPLETE JOB ==========

export interface JobCompletionLineItem {
  description: string;
  amount: number;
  isExtra?: boolean;
}

export interface JobCompletionData {
  order: {
    id: string;
    status: string;
    startedAt: string | null;
    serviceName: string;
    serviceDescription: string;
    address: string;
    workSummary: string;
    workPhotos: string[];
  };
  client: {
    id: string;
    fullName: string;
    profile_image?: string;
  };
  lineItems: JobCompletionLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  /** Effective commission 0..1 for this job. */
  commissionRate: number;
  /** Present when API returns extended pricing (preferred for UI). */
  commissionPercent?: number;
  estimatedPlatformFee?: number;
  feeAppliesAt?: "withdrawal";
  durationMinutes: number;
}

export interface CompleteJobPayload {
  work_summary: string;
  work_photos: string[];
}

export interface CompleteJobResponse {
  order: {
    id: string;
    status: string;
    completedAt: string;
    workSummary: string;
    workPhotos: string[];
  };
  lineItems: JobCompletionLineItem[];
  subtotal: number;
  total: number;
}

export const getJobCompletionData = async (orderId: string): Promise<JobCompletionData> => {
  const data = await request<JobCompletionData>(
    `/api/providers/orders/${orderId}/completion-data`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
    t("providerDashboard.completeJob.errors.loadFailed"),
  );
  const raw = data as unknown as Record<string, unknown>;
  const rawClient =
    raw.client && typeof raw.client === "object" && !Array.isArray(raw.client)
      ? (raw.client as Record<string, unknown>)
      : null;
  const profileImage = coerceSupplierProfileImage(rawClient ?? raw);
  if (!profileImage) return data;
  return {
    ...data,
    client: {
      ...data.client,
      profile_image: profileImage,
    },
  };
};

export const completeJob = async (orderId: string, data: CompleteJobPayload): Promise<CompleteJobResponse> => {
  return request<CompleteJobResponse>(
    `/api/providers/orders/${orderId}/complete`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
    t("providerDashboard.completeJob.errors.completeFailed"),
  );
};

// ========== JOB IN-PROGRESS ==========

export type JobTaskStatus = "completed" | "in_progress" | "pending";

export interface JobTask {
  id: string;
  description: string;
  status: JobTaskStatus;
  sortOrder: number;
}

export interface JobInProgressData {
  order: {
    id: string;
    status: string;
    startedAt: string | null;
    serviceName: string;
    serviceDescription: string;
    address: string;
    estimatedDurationMinutes: number;
  };
  client: {
    id: string;
    fullName: string;
    phone: string | null;
    profile_image?: string;
  };
  tasks: JobTask[];
  agreedPrice: number;
  conversationId: string | null;
}

export const getJobInProgressData = async (orderId: string): Promise<JobInProgressData> => {
  const data = await request<JobInProgressData>(
    `/api/providers/orders/${orderId}/in-progress`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
    t("providerDashboard.inProgress.errors.loadFailed"),
  );
  const raw = data as unknown as Record<string, unknown>;
  const rawClient =
    raw.client && typeof raw.client === "object" && !Array.isArray(raw.client)
      ? (raw.client as Record<string, unknown>)
      : null;
  const profileImage = coerceSupplierProfileImage(rawClient ?? raw);
  if (!profileImage) return data;
  return {
    ...data,
    client: {
      ...data.client,
      profile_image: profileImage,
    },
  };
};

export const updateJobTask = async (
  orderId: string,
  taskId: string,
  status: JobTaskStatus,
): Promise<{ task: JobTask }> => {
  return request<{ task: JobTask }>(
    `/api/providers/orders/${orderId}/tasks/${taskId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
    t("providerDashboard.inProgress.errors.updateTaskFailed"),
  );
};

export const startJob = async (orderId: string): Promise<{ order: { id: string; status: string; startedAt: string } }> => {
  return request<{ order: { id: string; status: string; startedAt: string } }>(
    `/api/providers/orders/${orderId}/start`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    t("providerDashboard.inProgress.errors.startJobFailed"),
  );
};

// ========== INVOICE ==========

export interface InvoiceLineItem {
  name: string;
  quantity: number;
  price: number;
}

export interface InvoiceServiceDetails {
  serviceName: string;
  serviceDescription: string;
  address: string;
  scheduledAt: string | null;
  completedAt: string | null;
  workSummary: string;
  orderNotes: string;
}

/** From GET …/invoice when API includes platform commission breakdown. */
export interface InvoicePlatformCommission {
  commissionRate: number;
  commissionPercent: number;
  estimatedPlatformFee: number;
  estimatedNetToProvider: number;
  feeAppliesAt: "withdrawal";
}

export interface InvoiceData {
  invoiceNumber: string;
  createdAt: string;
  provider: {
    name: string;
    taxId: string | null;
  };
  client: {
    name: string;
    email: string | null;
  };
  /** Service and order details (address, dates, work summary, notes). Optional for backward compatibility. */
  service?: InvoiceServiceDetails;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  platformCommission?: InvoicePlatformCommission;
  payment: {
    status: "paid" | "pending" | "unpaid";
    method: string | null;
    cardLast4: string | null;
    paidAt: string | null;
  };
  orderId: string;
}

export const getJobInvoice = async (orderId: string): Promise<InvoiceData> => {
  return request<InvoiceData>(
    `/api/providers/orders/${orderId}/invoice`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
    t("providerDashboard.invoice.errors.loadFailed"),
  );
};

export const sendInvoiceEmail = async (orderId: string): Promise<{ sent: boolean }> => {
  return request<{ sent: boolean }>(
    `/api/providers/orders/${orderId}/invoice/email`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    t("providerDashboard.invoice.errors.emailFailed"),
  );
};

// ========== RATE CLIENT ==========

export interface RateClientPayload {
  rating: number;
  tags: string[];
  comment: string;
  privateNote: string;
}

export interface RateClientResponse {
  id: string;
  rating: number;
  tags: string[];
  comment: string;
}

export const rateClient = async (orderId: string, payload: RateClientPayload): Promise<RateClientResponse> => {
  return request<RateClientResponse>(
    `/api/providers/orders/${orderId}/rate-client`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    t("providerDashboard.rateClient.errors.sendFailed"),
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
  const jobs = res?.jobs ?? [];
  return jobs.map((job) => {
    const profileImage = coerceSupplierProfileImage(job as unknown as Record<string, unknown>);
    if (!profileImage) return job;
    return {
      ...job,
      clientProfileImage: profileImage,
    };
  });
};

// ========== PAYMENT METHODS (BANK ACCOUNTS) ==========
export interface ProviderBankAccount {
  id: string;
  bankName: string;
  maskedClabe: string;
  primary: boolean;
}

export const getProviderBankAccounts = async (): Promise<ProviderBankAccount[]> => {
  const res = await request<{ accounts: ProviderBankAccount[] }>(
    "/api/providers/bank-accounts",
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
    t("providerDashboard.paymentMethods.errors.bankAccountsFailed"),
  );
  return res?.accounts ?? [];
};

export interface UpdateProviderPayoutBankPayload {
  bankName: string;
  /** 18-digit CLABE (digits only) */
  clabe: string;
  accountHolder: string;
}

export const updateProviderPayoutBank = async (
  payload: UpdateProviderPayoutBankPayload,
): Promise<{ message: string }> => {
  return request<{ message: string }>(
    "/api/providers/bank-accounts",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bankName: payload.bankName.trim(),
        clabe: payload.clabe,
        accountHolder: payload.accountHolder.trim(),
      }),
    },
    t("providerDashboard.paymentMethods.errors.bankUpdateFailed"),
  );
};

// ========== EARNINGS ==========
export type EarningsPeriod = "today" | "week" | "month" | "custom" | "all";
export type EarningsTransactionStatus = "completed" | "pending" | "processing" | "refunded";

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
  type: "income" | "pending_income" | "withdrawal" | "refund";
  refundReason?: string | null;
}

export interface ProviderEarningsTransactionsResponse {
  transactions: ProviderEarningsTransaction[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export const getEarningsSummary = async (params?: { period?: EarningsPeriod; from?: string; to?: string }): Promise<ProviderEarningsSummary> => {
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

export const getEarningsChart = async (period: "week" | "month" = "week"): Promise<{ data: ProviderEarningsChartPoint[] }> => {
  return request<{ data: ProviderEarningsChartPoint[] }>(
    `/api/providers/dashboard/earnings/chart?period=${period}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
    t("providerDashboard.earnings.errors.chartFailed"),
  );
};

export const getEarningsTransactions = async (params?: { period?: EarningsPeriod; from?: string; to?: string; status?: "all" | EarningsTransactionStatus | "refunded"; page?: number; limit?: number }): Promise<ProviderEarningsTransactionsResponse> => {
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

export const exportEarnings = async (params?: { format?: "csv"; period?: EarningsPeriod; from?: string; to?: string }): Promise<{ csv: string; filename: string }> => {
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

// ===== Payouts / withdrawals (MDB-452) =====
export type PayoutStatus = "requested" | "processing" | "paid" | "failed";

export interface ProviderPayout {
  id: string;
  amountGross: number;
  commissionRate: number;
  commissionAmount: number;
  amountNet: number;
  currency: string;
  status: PayoutStatus;
  reference: string | null;
  failureReason: string | null;
  requestedAt: string;
  processedAt: string | null;
}

/** Request a withdrawal of (part of) the available balance. Net = gross - commission. */
export const requestWithdrawal = async (amount: number): Promise<{ payout: ProviderPayout }> => {
  return request<{ payout: ProviderPayout }>(
    "/api/providers/dashboard/earnings/withdraw",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    },
    t("providerDashboard.earnings.errors.withdrawFailed"),
  );
};

/** Provider's payout history. */
export const getProviderPayouts = async (): Promise<{ payouts: ProviderPayout[] }> => {
  return request<{ payouts: ProviderPayout[] }>(
    "/api/providers/dashboard/earnings/payouts",
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
    t("providerDashboard.earnings.errors.payoutsFailed"),
  );
};
