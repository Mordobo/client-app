import type { Notification } from '@/services/notifications';
import { fetchOrderDetail } from '@/services/orders';
import type { UserMode } from '@/contexts/ModeContext';

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
  const v = m.orderId ?? m.order_id;
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function metaConversationId(m: Record<string, unknown>): string | undefined {
  const v = m.conversationId ?? m.conversation_id;
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function syncHrefForNotification(notification: Notification, mode: UserMode): string | null {
  const metadata = coerceMetadata(notification);
  const type = notification.type as string;
  const orderId = metaOrderId(metadata);
  const conversationId = metaConversationId(metadata);

  if (mode === 'client') {
    switch (notification.type) {
      case 'quote_received':
        return orderId ? `/booking/quote/${orderId}` : null;
      case 'booking_confirmed':
      case 'booking_cancelled':
      case 'payment_processed':
      case 'payment_received':
      case 'provider_on_way':
      case 'refund_issued':
        return orderId ? `/orders/${orderId}` : null;
      case 'new_message':
        return conversationId ? `/chat/${conversationId}` : null;
      case 'rate_service':
        return orderId ? `/orders/rate/${orderId}` : null;
      case 'offer':
        return '/(tabs)/home';
      default:
        if (type === 'job_pending_review' || type === 'job_completed') {
          return orderId ? `/orders/rate/${orderId}` : null;
        }
        return null;
    }
  }

  switch (notification.type) {
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

  if (notification.type === 'new_message' && !conversationId && orderId) {
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
  return syncHrefForNotification(notification, mode);
}
