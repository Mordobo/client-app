import { getLocale, t } from '@/i18n';
import type { Notification } from '@/services/notifications';

function formatRefundCurrency(amount: number): string {
  const locale = getLocale() === 'es' ? 'es-MX' : 'en-US';
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'MXN' }).format(amount);
}

export type NotificationViewerRole = 'client' | 'provider';

/**
 * Localized title/body for known types; others pass through API strings.
 */
export function getLocalizedNotificationDisplay(
  notification: Notification,
  viewerRole: NotificationViewerRole,
): { title: string; message: string } {
  if (notification.type !== 'refund_issued') {
    return { title: notification.title, message: notification.message };
  }

  const m = notification.metadata ?? {};
  const rawAmount = m.refundAmount;
  const amountNum = typeof rawAmount === 'number' ? rawAmount : Number(rawAmount);
  const amountStr = Number.isFinite(amountNum) ? formatRefundCurrency(amountNum) : '';
  const reason = typeof m.reason === 'string' ? m.reason : '';
  const serviceName =
    typeof m.serviceName === 'string' && m.serviceName.trim().length > 0
      ? m.serviceName.trim()
      : t('notifications.refundServiceFallback');

  const refundRole: NotificationViewerRole =
    notification.user_type === 'supplier' ? 'provider' : viewerRole;

  if (refundRole === 'provider') {
    return {
      title: t('notifications.refundIssuedProviderTitle'),
      message: t('notifications.refundIssuedProviderMessage', {
        amount: amountStr,
        serviceName,
        reason,
      }),
    };
  }

  return {
    title: t('notifications.refundIssuedClientTitle'),
    message: t('notifications.refundIssuedClientMessage', {
      amount: amountStr,
      serviceName,
      reason,
    }),
  };
}

