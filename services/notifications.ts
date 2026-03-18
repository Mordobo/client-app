import { t } from '@/i18n';
import { request } from './auth';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  metadata?: {
    orderId?: string;
    conversationId?: string;
    supplierId?: string;
    quoteId?: string;
    reviewId?: string;
    paymentId?: string;
    [key: string]: unknown;
  };
}

export type NotificationType =
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'new_message'
  | 'rate_service'
  | 'offer'
  | 'payment_processed'
  | 'payment_received'
  | 'provider_on_way'
  | 'new_booking_request'
  | 'quote_received'
  | 'quote_approved'
  | 'new_review'
  | 'refund_issued';

export interface NotificationsResponse {
  notifications: Notification[];
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 0,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// GET /notifications - Fetch all notifications
export const fetchNotifications = async (): Promise<Notification[]> => {
  try {
    const data = await request<NotificationsResponse>(
      '/notifications',
      {
        method: 'GET',
      },
      t('errors.requestFailedStatus', { status: 0 })
    );
    if (!data.notifications) {
      throw new ApiError('Invalid response format: missing notifications', 500);
    }
    return data.notifications;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Network error. Please check your connection.', 0, error);
  }
};

// PATCH /notifications/:id/read - Mark notification as read
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    await request<void>(
      `/notifications/${notificationId}/read`,
      {
        method: 'PATCH',
      },
      t('errors.requestFailedStatus', { status: 0 })
    );
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Network error. Please check your connection.', 0, error);
  }
};

// PATCH /notifications/read-all - Mark all notifications as read
export const markAllNotificationsAsRead = async (): Promise<void> => {
  try {
    await request<void>(
      '/notifications/read-all',
      {
        method: 'PATCH',
      },
      t('errors.requestFailedStatus', { status: 0 })
    );
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Network error. Please check your connection.', 0, error);
  }
};

// GET /notifications/unread-count - Fetch unread count
export const fetchUnreadNotificationCount = async (): Promise<number> => {
  try {
    const data = await request<{ unreadCount: number }>(
      '/notifications/unread-count',
      {
        method: 'GET',
      },
      t('errors.requestFailedStatus', { status: 0 })
    );
    return data.unreadCount || 0;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Silently return 0 on error for unread count (polling shouldn't cause issues)
    return 0;
  }
};

/** Provider filter category (Jobs=purple, Payments=green, Reviews=yellow, System=blue) */
export type NotificationCategory = 'jobs' | 'payments' | 'reviews' | 'system';

/** Map API notification type to provider filter category */
export function getNotificationCategory(type: NotificationType): NotificationCategory {
  switch (type) {
    case 'booking_confirmed':
    case 'booking_cancelled':
    case 'provider_on_way':
    case 'new_booking_request':
    case 'quote_received':
    case 'quote_approved':
    case 'new_message':
      return 'jobs';
    case 'payment_processed':
    case 'payment_received':
    case 'refund_issued':
      return 'payments';
    case 'rate_service':
    case 'new_review':
      return 'reviews';
    case 'offer':
    default:
      return 'system';
  }
}

// DELETE /notifications/:id - Delete a single notification
export const deleteNotification = async (notificationId: string): Promise<void> => {
  try {
    await request<void>(
      `/notifications/${notificationId}`,
      { method: 'DELETE' },
      t('errors.requestFailedStatus', { status: 0 })
    );
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(t('errors.networkError'), 0, error);
  }
};

// DELETE /notifications/clear-all - Delete all notifications
export const deleteAllNotifications = async (): Promise<void> => {
  try {
    await request<void>(
      '/notifications/clear-all',
      { method: 'DELETE' },
      t('errors.requestFailedStatus', { status: 0 })
    );
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(t('errors.networkError'), 0, error);
  }
};
