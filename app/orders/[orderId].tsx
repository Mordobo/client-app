import { t } from '@/i18n';
import { fetchOrderDetail, OrderDetailResponse } from '@/services/orders';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ProgressStep {
  id: string;
  label: string;
  completed: boolean;
  current: boolean;
  timestamp?: string;
}

export default function OrderDetailScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [orderDetail, setOrderDetail] = useState<OrderDetailResponse | null>(null);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState('1:24:30'); // TODO: Calculate from actual data

  useEffect(() => {
    if (orderId) {
      loadOrderDetail();
    }
  }, [orderId]);

  const loadOrderDetail = async () => {
    if (!orderId) return;

    try {
      setLoading(true);
      const data = await fetchOrderDetail(orderId);
      setOrderDetail(data);
    } catch (error) {
      console.error('[OrderDetail] Failed to load order:', error);
      Alert.alert(t('common.error'), t('errors.requestFailed'));
    } finally {
      setLoading(false);
    }
  };

  const getProgressSteps = (): ProgressStep[] => {
    if (!orderDetail?.order) return [];

    const order = orderDetail.order;
    const createdAt = new Date(order.created_at);
    const updatedAt = new Date(order.updated_at);

    // Format time as "HH:MM AM/PM"
    const formatTime = (date: Date) => {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes.toString().padStart(2, '0');
      return `${displayHours}:${displayMinutes} ${ampm}`;
    };

    const steps: ProgressStep[] = [
      {
        id: 'confirmed',
        label: t('orders.inProgress.bookingConfirmed'),
        completed: ['accepted', 'in_progress', 'completed'].includes(order.status),
        current: order.status === 'accepted',
        timestamp: formatTime(createdAt),
      },
      {
        id: 'on_way',
        label: t('orders.inProgress.providerOnWay'),
        completed: ['in_progress', 'completed'].includes(order.status),
        current: false,
        timestamp: order.status === 'in_progress' ? formatTime(updatedAt) : undefined,
      },
      {
        id: 'started',
        label: t('orders.inProgress.serviceStarted'),
        completed: order.status === 'completed',
        current: order.status === 'in_progress',
        timestamp: order.status === 'in_progress' ? formatTime(updatedAt) : undefined,
      },
      {
        id: 'completed',
        label: t('orders.inProgress.serviceCompleted'),
        completed: false,
        current: false,
        timestamp: undefined,
      },
    ];

    return steps;
  };

  const handleCall = () => {
    if (!orderDetail?.supplier?.phone_number) {
      Alert.alert(
        t('orders.inProgress.callProvider'),
        t('chat.phoneNumberNotAvailable')
      );
      return;
    }

    const phoneUrl = `tel:${orderDetail.supplier.phone_number.replace(/\s/g, '')}`;
    Linking.openURL(phoneUrl).catch(() => {
      Alert.alert(
        t('common.error'),
        t('chat.couldNotOpenDialer')
      );
    });
  };

  const handleChat = () => {
    if (!orderId) return;
    router.push(`/booking/chat/${orderId}`);
  };

  const handleCancel = () => {
    Alert.alert(
      t('orders.inProgress.cancelBooking'),
      '¿Estás seguro de que deseas cancelar esta reserva?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('orders.inProgress.cancelBooking'),
          style: 'destructive',
          onPress: () => {
            // TODO: Implement cancel booking
            Alert.alert(t('common.success'), 'Reserva cancelada');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      </View>
    );
  }

  if (!orderDetail) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{t('errors.requestFailed')}</Text>
        </View>
      </View>
    );
  }

  const { order, supplier } = orderDetail;
  const progressSteps = getProgressSteps();
  const isInProgress = order.status === 'in_progress';

  // If not in progress, show a simple detail view or redirect
  if (!isInProgress) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('orders.viewDetails')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView style={styles.content}>
          <Text style={styles.statusText}>
            {t(`orders.status.${order.status}`)}
          </Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Green Header Section */}
      <View style={[styles.greenHeader, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButtonGreen}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.greenHeaderTitle}>
          {t('orders.inProgress.title')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Service Status Section */}
      <View style={styles.greenSection}>
        <View style={styles.serviceIconContainer}>
          <Text style={styles.serviceIcon}>🧹</Text>
        </View>
        <Text style={styles.serviceStatusText}>
          {t('orders.inProgress.serviceInProgress')}
        </Text>
        <Text style={styles.estimatedTimeLabel}>
          {t('orders.inProgress.estimatedTimeRemaining')}
        </Text>
        <Text style={styles.estimatedTime}>{estimatedTimeRemaining}</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Provider Card */}
        <View style={styles.providerCard}>
          <View style={styles.providerImageContainer}>
            {supplier?.profile_image ? (
              <View style={styles.providerImage}>
                <Ionicons name="person" size={24} color="#9ca3af" />
              </View>
            ) : (
              <View style={styles.providerImage}>
                <Ionicons name="person" size={24} color="#9ca3af" />
              </View>
            )}
          </View>
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>
              {supplier?.full_name || 'Proveedor'}
            </Text>
            <View style={styles.locationRow}>
              <View style={styles.locationDot} />
              <Text style={styles.locationText}>
                {t('orders.inProgress.atYourLocation')}
              </Text>
            </View>
          </View>
          <View style={styles.providerActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleCall}
            >
              <Ionicons name="call" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.chatButton]}
              onPress={handleChat}
            >
              <Ionicons name="chatbubble" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress Timeline */}
        <View style={styles.progressSection}>
          <Text style={styles.progressTitle}>
            {t('orders.inProgress.progress')}
          </Text>
          {progressSteps.map((step, index) => (
            <View key={step.id} style={styles.timelineItem}>
              <View style={styles.timelineIndicator}>
                <View
                  style={[
                    styles.timelineCircle,
                    step.completed && styles.timelineCircleCompleted,
                    step.current && styles.timelineCircleCurrent,
                  ]}
                >
                  {step.completed && (
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  )}
                </View>
                {index < progressSteps.length - 1 && (
                  <View
                    style={[
                      styles.timelineLine,
                      step.completed && styles.timelineLineCompleted,
                    ]}
                  />
                )}
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>{step.label}</Text>
                {step.timestamp && (
                  <Text style={styles.timelineTime}>{step.timestamp}</Text>
                )}
                {!step.timestamp && !step.completed && (
                  <Text style={styles.timelineTime}>
                    {t('orders.inProgress.pending')}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Service Details Section */}
        {order.scheduled_at && (
          <View style={styles.detailsSection}>
            <Text style={styles.detailsTitle}>Detalles del servicio</Text>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color="#9ca3af" />
              <Text style={styles.detailText}>
                {new Date(order.scheduled_at).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
            {order.address && (
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={16} color="#9ca3af" />
                <Text style={styles.detailText}>{order.address}</Text>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtonsSection}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
          >
            <Text style={styles.cancelButtonText}>
              {t('orders.inProgress.cancelBooking')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.supportButton}
            onPress={() => router.push('/profile/support')}
          >
            <Text style={styles.supportButtonText}>
              {t('orders.inProgress.contactSupport')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
  },
  // Green Header
  greenHeader: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButtonGreen: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greenHeaderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    marginLeft: 16,
  },
  // Green Section with Service Status
  greenSection: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    alignItems: 'center',
  },
  serviceIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  serviceIcon: {
    fontSize: 36,
  },
  serviceStatusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  estimatedTimeLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  estimatedTime: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  // Provider Card
  providerCard: {
    backgroundColor: '#252542',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  providerImageContainer: {
    position: 'relative',
  },
  providerImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2d2d4a',
    borderWidth: 3,
    borderColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  locationText: {
    fontSize: 14,
    color: '#10b981',
  },
  providerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2d2d4a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatButton: {
    backgroundColor: '#3b82f6',
  },
  // Progress Timeline
  progressSection: {
    marginBottom: 20,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  timelineIndicator: {
    alignItems: 'center',
  },
  timelineCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#252542',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineCircleCompleted: {
    backgroundColor: '#10b981',
  },
  timelineCircleCurrent: {
    backgroundColor: '#3b82f6',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  timelineLine: {
    width: 2,
    height: 30,
    backgroundColor: '#252542',
    marginTop: 4,
  },
  timelineLineCompleted: {
    backgroundColor: '#10b981',
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 4,
  },
  timelineTime: {
    fontSize: 13,
    color: '#9ca3af',
  },
  // Details Section
  detailsSection: {
    backgroundColor: '#252542',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#9ca3af',
    flex: 1,
  },
  // Action Buttons
  actionButtonsSection: {
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  supportButton: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#252542',
    alignItems: 'center',
  },
  supportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  // Simple Header for non-in-progress orders
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#252542',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  statusText: {
    fontSize: 16,
    color: '#fff',
    padding: 20,
  },
});
