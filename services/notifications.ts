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
    [key: string]: unknown;
  };
}

export type NotificationType =
  | 'booking_confirmed'
  | 'new_message'
  | 'rate_service'
  | 'offer'
  | 'payment_processed'
  | 'provider_on_way';

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
