import { t } from '@/i18n';
import { request } from '@/services/auth';

export type ComplaintType = 'complaint' | 'claim' | 'suggestion';

export interface ComplaintRecord {
  id: string;
  type: ComplaintType;
  subject: string;
  description: string;
  submitterType: string;
  submitterId: string;
  orderId: string | null;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
}

export interface ComplaintMessage {
  id: string;
  complaintSuggestionId: string;
  senderType: string;
  senderId: string;
  messageText: string;
  createdAt: string;
}

export interface ListComplaintsResponse {
  data: ComplaintRecord[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface CreateComplaintPayload {
  type: ComplaintType;
  subject: string;
  description: string;
  order_id?: string | null;
  submitter_type?: 'client' | 'provider';
}

export async function listComplaints(page = 1, limit = 20): Promise<ListComplaintsResponse> {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  return request<ListComplaintsResponse>(
    `/complaints?${qs.toString()}`,
    { method: 'GET', headers: { 'Content-Type': 'application/json' } },
    t('complaints.loadError')
  );
}

export async function createComplaint(
  payload: CreateComplaintPayload
): Promise<{ complaint: ComplaintRecord }> {
  return request<{ complaint: ComplaintRecord }>(
    '/complaints',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: payload.type,
        subject: payload.subject.trim(),
        description: payload.description.trim(),
        order_id: payload.order_id?.trim() || undefined,
        submitter_type: payload.submitter_type,
      }),
    },
    t('complaints.submitError')
  );
}

export async function getComplaintMessages(complaintId: string): Promise<{ data: ComplaintMessage[] }> {
  return request<{ data: ComplaintMessage[] }>(
    `/complaints/${encodeURIComponent(complaintId)}/messages`,
    { method: 'GET', headers: { 'Content-Type': 'application/json' } },
    t('complaints.loadError')
  );
}

export async function sendComplaintReply(
  complaintId: string,
  message: string
): Promise<{ data: ComplaintMessage[] }> {
  return request<{ data: ComplaintMessage[] }>(
    `/complaints/${encodeURIComponent(complaintId)}/messages`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message.trim() }),
    },
    t('complaints.replyError')
  );
}
