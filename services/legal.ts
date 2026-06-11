import { API_BASE } from '@/utils/apiConfig';

export const LEGAL_DOC_TYPES = [
  'terms_of_service',
  'privacy_policy',
  'cookie_policy',
  'provider_agreement',
] as const;

export type LegalDocType = (typeof LEGAL_DOC_TYPES)[number];

export function isLegalDocType(value: string): value is LegalDocType {
  return (LEGAL_DOC_TYPES as readonly string[]).includes(value);
}

export interface LegalDocumentPayload {
  docType: string;
  bodyHtml: string;
  updatedAt: string;
}

export async function fetchLegalDocument(
  docType: LegalDocType,
  locale: 'en' | 'es'
): Promise<LegalDocumentPayload> {
  const url = `${API_BASE}/api/content/legal/${encodeURIComponent(docType)}?locale=${locale}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => ({}));
    const message =
      body &&
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof (body as { message: unknown }).message === 'string'
        ? (body as { message: string }).message
        : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return (await response.json()) as LegalDocumentPayload;
}
