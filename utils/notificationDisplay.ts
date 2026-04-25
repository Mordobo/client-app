import { getLocale, t } from '@/i18n';
import type { Notification, NotificationType } from '@/services/notifications';
import { canonicalNotificationType } from '@/utils/notificationTypeCanonical';

export type NotificationViewerRole = 'client' | 'provider';

function metadataRecord(notification: Notification): Record<string, unknown> {
  const raw = notification.metadata;
  if (raw == null) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

function pickString(m: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = m[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

function pickNumber(m: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const k of keys) {
    const v = m[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim()) {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

function formatRefundCurrency(amount: number): string {
  const locale = getLocale() === 'es' ? 'es-MX' : 'en-US';
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'MXN' }).format(amount);
}

function formatNotificationMoney(m: Record<string, unknown>): string {
  const n = pickNumber(m, 'amount', 'totalAmount', 'total_amount', 'paymentAmount', 'paidAmount', 'price', 'total');
  if (n == null) return '';
  const locale = getLocale() === 'es' ? 'es-MX' : 'en-US';
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'MXN' }).format(n);
}

function normalizeInferKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\u00a0/g, ' ')
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ');
}

/** When type is missing or unknown, map common English API titles to our notification types. */
function inferNotificationTypeFromEnglishTitle(title: string | undefined): string | null {
  if (!title?.trim()) return null;
  const k = normalizeInferKey(title);
  const map: Record<string, string> = {
    'new paid booking': 'payment_received',
    'payment received': 'payment_received',
    'nueva reserva pagada': 'payment_received',
    'pago recibido': 'payment_received',
    'booking confirmed': 'booking_confirmed',
    'reserva confirmada': 'booking_confirmed',
    'booking cancelled': 'booking_cancelled',
    'reserva cancelada': 'booking_cancelled',
    'payment processed': 'payment_processed',
    'pago procesado': 'payment_processed',
    'new quote': 'quote_received',
    'quote received': 'quote_received',
    'nueva cotización': 'quote_received',
    'new message': 'new_message',
    'nuevo mensaje': 'new_message',
    'new review': 'new_review',
    'nueva reseña': 'new_review',
    'rate your service': 'rate_service',
    'provider on the way': 'provider_on_way',
    'new booking request': 'new_booking_request',
    'quote approved': 'quote_approved',
    'cotización aprobada': 'quote_approved',
    'refund issued': 'refund_issued',
    'refund recorded': 'refund_issued',
    'reembolso emitido': 'refund_issued',
  };
  return map[k] ?? null;
}

/** Infer type from API message body when title is missing or not in the title map (namespaced types). */
function inferNotificationTypeFromMessageBody(message: string | undefined): string | null {
  if (!message?.trim()) return null;
  const m = normalizeInferKey(message);

  if (
    /\bhas cancelled their booking\b/.test(m) ||
    /\bcancelled their booking\b/.test(m) ||
    /\bcanceló su reserva\b/.test(m) ||
    /\bcancelo su reserva\b/.test(m)
  ) {
    return 'booking_cancelled';
  }
  if (
    /\bhas booked and paid\b/.test(m) ||
    /\bbooked and paid\b/.test(m) ||
    /\breservó y pagó\b/.test(m) ||
    /\breservo y pago\b/.test(m)
  ) {
    return 'payment_received';
  }
  if (/\bhas paid\b/.test(m) && /\baccept the booking\b/.test(m)) {
    return 'payment_received';
  }
  if (
    /\bleft a \d+-star review\b/.test(m) ||
    /\bdejó una reseña\b/.test(m) ||
    /\b\d+\s*estrellas\b/.test(m)
  ) {
    return 'new_review';
  }
  if (/^[^:]+:\s*\S/.test(m) && m.length <= 500) {
    return 'new_message';
  }
  return null;
}

function refundDisplay(notification: Notification, viewerRole: NotificationViewerRole): { title: string; message: string } {
  const m = metadataRecord(notification);
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

function typedDisplay(
  notification: Notification,
  viewerRole: NotificationViewerRole,
  type: string,
  m: Record<string, unknown>,
): { title: string; message: string } | null {
  const supplierName =
    pickString(m, 'supplierName', 'supplier_name', 'providerName', 'provider_name', 'businessName', 'business_name') ??
    t('notifications.fallbackSupplier');
  const clientName =
    pickString(m, 'clientName', 'client_name', 'customerName', 'customer_name', 'userName', 'user_name') ??
    t('notifications.fallbackClient');
  const serviceName = pickString(m, 'serviceName', 'service_name', 'service') ?? '';
  const amountStr = formatNotificationMoney(m);
  const stars = pickNumber(m, 'stars', 'rating', 'starRating', 'reviewRating');
  const starsLabel = stars != null && Number.isFinite(stars) ? String(Math.round(stars)) : '';

  switch (type) {
    case 'booking_confirmed': {
      if (viewerRole === 'client') {
        return {
          title: t('notifications.types.booking_confirmed.clientTitle'),
          message: serviceName
            ? t('notifications.types.booking_confirmed.clientMessageWithService', {
                supplierName,
                serviceName,
              })
            : t('notifications.types.booking_confirmed.clientMessage', { supplierName }),
        };
      }
      return {
        title: t('notifications.types.booking_confirmed.providerTitle'),
        message: t('notifications.types.booking_confirmed.providerMessage', { clientName }),
      };
    }
    case 'booking_cancelled': {
      if (viewerRole === 'client') {
        return {
          title: t('notifications.types.booking_cancelled.clientTitle'),
          message: t('notifications.types.booking_cancelled.clientMessage', { supplierName }),
        };
      }
      return {
        title: t('notifications.types.booking_cancelled.providerTitle'),
        message: t('notifications.types.booking_cancelled.providerMessage', { clientName }),
      };
    }
    case 'payment_processed': {
      if (viewerRole !== 'client') return null;
      return {
        title: t('notifications.types.payment_processed.clientTitle'),
        message: amountStr
          ? serviceName
            ? t('notifications.types.payment_processed.clientMessageWithService', { amount: amountStr, serviceName })
            : t('notifications.types.payment_processed.clientMessage', { amount: amountStr })
          : t('notifications.types.payment_processed.clientMessageNoAmount', { serviceName }),
      };
    }
    case 'payment_received': {
      if (viewerRole === 'provider') {
        const hasMeta = !!(pickString(m, 'clientName', 'client_name') && (amountStr || serviceName));
        return {
          title: t('notifications.types.payment_received.providerTitle'),
          message: hasMeta
            ? t('notifications.types.payment_received.providerMessage', {
                clientName,
                amount: amountStr,
                serviceName,
              })
            : notification.message,
        };
      }
      return {
        title: t('notifications.types.payment_received.clientTitle'),
        message: amountStr
          ? serviceName
            ? t('notifications.types.payment_received.clientMessageWithService', { amount: amountStr, serviceName })
            : t('notifications.types.payment_received.clientMessage', { amount: amountStr })
          : notification.message,
      };
    }
    case 'provider_on_way': {
      if (viewerRole !== 'client') return null;
      return {
        title: t('notifications.types.provider_on_way.clientTitle'),
        message: serviceName
          ? t('notifications.types.provider_on_way.clientMessageWithService', { supplierName, serviceName })
          : t('notifications.types.provider_on_way.clientMessage', { supplierName }),
      };
    }
    case 'quote_received': {
      if (viewerRole === 'client') {
        return {
          title: t('notifications.types.quote_received.clientTitle'),
          message: t('notifications.types.quote_received.clientMessage', { supplierName, serviceName }),
        };
      }
      return {
        title: t('notifications.types.quote_received.providerTitle'),
        message: serviceName
          ? t('notifications.types.quote_received.providerMessageWithService', { clientName, serviceName })
          : t('notifications.types.quote_received.providerMessage', { clientName }),
      };
    }
    case 'quote_approved': {
      if (viewerRole === 'client') {
        return {
          title: t('notifications.types.quote_approved.clientTitle'),
          message: t('notifications.types.quote_approved.clientMessage', { supplierName }),
        };
      }
      return {
        title: t('notifications.types.quote_approved.providerTitle'),
        message: t('notifications.types.quote_approved.providerMessage', { clientName }),
      };
    }
    case 'new_booking_request': {
      if (viewerRole !== 'provider') return null;
      return {
        title: t('notifications.types.new_booking_request.providerTitle'),
        message: serviceName
          ? t('notifications.types.new_booking_request.providerMessageWithService', { clientName, serviceName })
          : t('notifications.types.new_booking_request.providerMessage', { clientName }),
      };
    }
    case 'new_review': {
      if (viewerRole !== 'provider') return null;
      const serviceLabel = serviceName || t('notifications.fallbackServiceShort');
      return {
        title: t('notifications.types.new_review.providerTitle'),
        message: starsLabel
          ? t('notifications.types.new_review.providerMessage', {
              clientName,
              stars: starsLabel,
              serviceName: serviceLabel,
            })
          : t('notifications.types.new_review.providerMessageNoStars', {
              clientName,
              serviceName: serviceLabel,
            }),
      };
    }
    case 'rate_service': {
      if (viewerRole !== 'client') return null;
      return {
        title: t('notifications.types.rate_service.clientTitle'),
        message: t('notifications.types.rate_service.clientMessage', { supplierName }),
      };
    }
    case 'offer': {
      if (viewerRole === 'client') {
        return {
          title: t('notifications.types.offer.clientTitle'),
          message: t('notifications.types.offer.clientMessage'),
        };
      }
      return {
        title: t('notifications.types.offer.providerTitle'),
        message: t('notifications.types.offer.providerMessage'),
      };
    }
    case 'new_message': {
      const preview = pickString(m, 'preview', 'messagePreview', 'snippet', 'body');
      return {
        title: t('notifications.types.new_message.title'),
        message: preview ?? notification.message,
      };
    }
    case 'job_pending_review':
    case 'job_completed': {
      if (viewerRole === 'client') {
        return {
          title: t('notifications.types.job_review.clientTitle'),
          message: t('notifications.types.job_review.clientMessage', { supplierName }),
        };
      }
      return {
        title: t('notifications.types.job_review.providerTitle'),
        message: t('notifications.types.job_review.providerMessage', { clientName }),
      };
    }
    default:
      return null;
  }
}

/**
 * Localized title/body per notification type and role; uses metadata when present, otherwise API strings.
 */
export function getLocalizedNotificationDisplay(
  notification: Notification,
  viewerRole: NotificationViewerRole,
): { title: string; message: string } {
  if (canonicalNotificationType(notification.type) === 'refund_issued') {
    return refundDisplay(notification, viewerRole);
  }

  /** Prefer API user_type so supplier-targeted rows use provider copy even if app mode is wrong. */
  const roleForTemplate: NotificationViewerRole =
    notification.user_type === 'supplier'
      ? 'provider'
      : notification.user_type === 'client'
        ? 'client'
        : viewerRole;

  const m = metadataRecord(notification);
  let typeKey = canonicalNotificationType(notification.type);
  let localized = typedDisplay(notification, roleForTemplate, typeKey, m);
  if (!localized) {
    const inferred =
      inferNotificationTypeFromEnglishTitle(notification.title) ??
      inferNotificationTypeFromMessageBody(notification.message);
    if (inferred) {
      localized = typedDisplay(notification, roleForTemplate, inferred, m);
    }
  }
  if (localized) return localized;

  return { title: notification.title, message: notification.message };
}

/**
 * Relative time for notification lists (full phrases, locale-aware).
 */
export function formatNotificationRelativeTime(dateString: string, variant: 'full' | 'compact' = 'full'): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (variant === 'compact') {
    if (diffMins < 1) return t('notifications.relative.justNow');
    if (diffMins < 60) return t('notifications.relative.compactMinutes', { count: diffMins });
    if (diffHours < 24) return t('notifications.relative.compactHours', { count: diffHours });
    if (diffDays === 1) return t('notifications.relative.yesterdayShort');
    if (diffDays < 7) {
      const locale = getLocale() === 'es' ? 'es-ES' : 'en-US';
      return date.toLocaleDateString(locale, { weekday: 'short' });
    }
    const locale = getLocale() === 'es' ? 'es-ES' : 'en-US';
    return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  }

  if (diffMins < 1) return t('notifications.relative.lessThanMinute');
  if (diffMins < 60) return t('notifications.relative.minutesAgo', { count: diffMins });
  if (diffHours < 24) {
    if (diffHours === 1) return t('notifications.relative.oneHourAgo');
    return t('notifications.relative.hoursAgo', { count: diffHours });
  }
  if (diffDays === 1) {
    const locale = getLocale() === 'es' ? 'es-ES' : 'en-US';
    const timePart = date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
    return t('notifications.relative.yesterdayAt', { time: timePart });
  }
  const locale = getLocale() === 'es' ? 'es-ES' : 'en-US';
  const datePart = date.toLocaleDateString(locale, { day: 'numeric', month: 'numeric' });
  const timePart = date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
  return t('notifications.relative.dateAt', { date: datePart, time: timePart });
}

/** Section header for grouped notifications (older than yesterday). */
export function formatNotificationSectionDateLabel(d: Date): string {
  const locale = getLocale() === 'es' ? 'es-ES' : 'en-US';
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
}
