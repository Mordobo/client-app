import type { Notification } from '@/services/notifications';
import { fetchOrderDetail, type OrderStatus } from '@/services/orders';
import type { UserMode } from '@/contexts/ModeContext';
import { canonicalNotificationType } from '@/utils/notificationTypeCanonical';

/** Order is past the “review quote on quote screen” phase for clients. */
const CLIENT_ORDER_DETAIL_FOR_QUOTE_NOTIFICATION: OrderStatus[] = [
  'pending_payment',
  'pending_for_provider',
  'accepted',
  'in_progress',
  'pending_review',
  'completed',
];

/** API may send camelCase or snake_case; metadata may rarely arrive as a JSON string. */
function coerceMetadata(notification: Notification): Record<string, unknown> {
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

function metaOrderId(m: Record<string, unknown>): string | undefined {
  const v = m.orderId ?? m.order_id ?? m.bookingId ?? m.booking_id;
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function metaConversationId(m: Record<string, unknown>): string | undefined {
  const v = m.conversationId ?? m.conversation_id;
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function syncHrefForNotification(notification: Notification, mode: UserMode): string | null {
  const metadata = coerceMetadata(notification);
  const typeKey = canonicalNotificationType(notification.type);
  const orderId = metaOrderId(metadata);
  const conversationId = metaConversationId(metadata);

  if (mode === 'client') {
    switch (typeKey) {
      case 'quote_received':
        return orderId ? `/booking/quote/${orderId}` : null;
      case 'booking_confirmed':
      case 'booking_cancelled':
      case 'payment_processed':
      case 'payment_received':
      case 'provider_on_way':
      case 'job_started':
      case 'refund_issued':
        return orderId ? `/orders/${orderId}` : null;
      case 'new_message':
        return conversationId ? `/chat/${conversationId}` : null;
      case 'rate_service':
        return orderId ? `/orders/rate/${orderId}` : null;
      case 'offer':
        return '/(tabs)/home';
      default:
        if (typeKey === 'job_pending_review' || typeKey === 'job_completed') {
          return orderId ? `/orders/rate/${orderId}` : null;
        }
        return null;
    }
  }

  switch (typeKey) {
    case 'booking_confirmed':
    case 'booking_cancelled':
    case 'provider_on_way':
    case 'quote_approved':
      return orderId ? `/(provider-tabs)/jobs/${orderId}` : null;
    case 'new_booking_request':
      return '/(provider-tabs)/requests';
    case 'new_message':
      return conversationId ? `/chat/${conversationId}` : null;
    case 'payment_processed':
    case 'payment_received':
    case 'refund_issued':
      return '/(provider-tabs)/earnings';
    case 'rate_service':
    case 'new_review':
      return '/(provider-tabs)/profile/reviews';
    case 'quote_received':
      return orderId ? `/(provider-tabs)/jobs/${orderId}` : null;
    case 'offer':
      return '/(provider-tabs)';
    default:
      return null;
  }
}

/**
 * Appends a one-time query param so target screens remount/refetch when opening from a notification
 * (avoids showing a stale instance of the same route).
 */
export function withNotificationNavRefresh(href: string): string {
  const bustable =
    href.includes('/orders/') ||
    href.includes('/booking/') ||
    href.includes('/chat/') ||
    href.includes('/(provider-tabs)/jobs/');
  if (!bustable) return href;
  const sep = href.includes('?') ? '&' : '?';
  return `${href}${sep}navRef=${Date.now()}`;
}

/**
 * Resolves a stack href for the content related to this notification (booking, chat, etc.).
 */
export async function resolveNotificationRelatedHref(
  notification: Notification,
  mode: UserMode,
): Promise<string | null> {
  const metadata = coerceMetadata(notification);
  const orderId = metaOrderId(metadata);
  const conversationId = metaConversationId(metadata);
  const typeKey = canonicalNotificationType(notification.type);

  if (typeKey === 'new_message' && !conversationId && orderId) {
    try {
      const detail = await fetchOrderDetail(orderId);
      if (detail.conversation_id) {
        return `/chat/${detail.conversation_id}`;
      }
    } catch {
      return null;
    }
    return null;
  }

  // “Quote received” is often still the persisted type after pay/confirm; quote payload may be gone.
  // Opening /booking/quote in that state shows a misleading “Quote not found” — order detail is correct.
  if (mode === 'client' && typeKey === 'quote_received' && orderId) {
    try {
      const detail = await fetchOrderDetail(orderId);
      const status = detail.order?.status;
      const noQuote = detail.quote == null;
      if (
        noQuote ||
        (status != null && CLIENT_ORDER_DETAIL_FOR_QUOTE_NOTIFICATION.includes(status))
      ) {
        return `/orders/${orderId}`;
      }
    } catch {
      // Fall through to sync href (quote screen); user still gets a concrete screen.
    }
  }

  return syncHrefForNotification(notification, mode);
}
