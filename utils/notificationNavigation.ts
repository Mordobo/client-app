import type { Notification } from '@/services/notifications';
import { fetchOrderDetail } from '@/services/orders';
import type { UserMode } from '@/contexts/ModeContext';

function syncHrefForNotification(notification: Notification, mode: UserMode): string | null {
  const metadata = notification.metadata || {};
  const type = notification.type as string;

  if (mode === 'client') {
    switch (notification.type) {
      case 'quote_received':
        return metadata.orderId ? `/booking/quote/${metadata.orderId}` : null;
      case 'booking_confirmed':
      case 'booking_cancelled':
      case 'payment_processed':
      case 'provider_on_way':
      case 'refund_issued':
        return metadata.orderId ? `/orders/${metadata.orderId}` : null;
      case 'new_message':
        return metadata.conversationId ? `/chat/${metadata.conversationId}` : null;
      case 'rate_service':
        return metadata.orderId ? `/orders/rate/${metadata.orderId}` : null;
      case 'offer':
        return '/(tabs)/home';
      default:
        if (type === 'job_pending_review' || type === 'job_completed') {
          return metadata.orderId ? `/orders/rate/${metadata.orderId}` : null;
        }
        return null;
    }
  }

  switch (notification.type) {
    case 'booking_confirmed':
    case 'booking_cancelled':
    case 'provider_on_way':
    case 'quote_approved':
      return metadata.orderId ? `/(provider-tabs)/jobs/${metadata.orderId}` : null;
    case 'new_booking_request':
      return '/(provider-tabs)/requests';
    case 'new_message':
      return metadata.conversationId ? `/chat/${metadata.conversationId}` : null;
    case 'payment_processed':
    case 'payment_received':
    case 'refund_issued':
      return '/(provider-tabs)/earnings';
    case 'rate_service':
    case 'new_review':
      return '/(provider-tabs)/profile/reviews';
    case 'quote_received':
      return metadata.orderId ? `/(provider-tabs)/jobs/${metadata.orderId}` : null;
    case 'offer':
      return '/(provider-tabs)';
    default:
      return null;
  }
}

/**
 * Resolves a stack href for the content related to this notification (booking, chat, etc.).
 */
export async function resolveNotificationRelatedHref(
  notification: Notification,
  mode: UserMode
): Promise<string | null> {
  const metadata = notification.metadata || {};
  if (notification.type === 'new_message' && !metadata.conversationId && metadata.orderId) {
    try {
      const detail = await fetchOrderDetail(metadata.orderId);
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
