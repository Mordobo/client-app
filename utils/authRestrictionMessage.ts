import { t } from '@/i18n';
import type { ApiError } from '@/services/auth';

function restrictionCodeFromData(data: unknown): string {
  if (typeof data !== 'object' || data === null || !('code' in data)) return '';
  return String((data as { code: unknown }).code)
    .trim()
    .toLowerCase();
}

function restrictionMessageFromError(error: ApiError): string {
  const data = error.data;
  if (typeof data === 'object' && data !== null && 'message' in data) {
    const m = (data as { message: unknown }).message;
    if (m != null && String(m).trim() !== '') return String(m);
  }
  return error.message || '';
}

function accountStatusFromPayload(data: unknown): string {
  if (typeof data !== 'object' || data === null || !('account_status' in data)) return '';
  return String((data as { account_status: unknown }).account_status)
    .trim()
    .toLowerCase();
}

/**
 * Maps API 403 account restriction to localized copy.
 * Prefers `account_status` from the API (ground truth from DB), then `code`, then message keywords.
 */
export function translatedAuthRestrictionMessage(error: ApiError): string | null {
  if (error.status !== 403) return null;
  const st = accountStatusFromPayload(error.data);
  if (st === 'banned') return t('errors.accountBanned');
  if (st === 'deleted') return t('errors.accountDeleted');
  if (st === 'suspended') return t('errors.accountSuspended');

  const code = restrictionCodeFromData(error.data);
  const text = restrictionMessageFromError(error).toLowerCase();

  if (code === 'account_banned' || text.includes('been banned')) {
    return t('errors.accountBanned');
  }
  if (code === 'account_deleted' || text.includes('no longer available')) {
    return t('errors.accountDeleted');
  }
  if (code === 'account_suspended' || text.includes('been suspended')) {
    return t('errors.accountSuspended');
  }
  return null;
}
