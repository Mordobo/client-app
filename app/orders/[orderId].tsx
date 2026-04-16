import { useColorScheme } from '@/hooks/use-color-scheme';
import { t } from '@/i18n';
import { getOrCreateConversation } from '@/services/conversations';
import { fetchOrderDetail, OrderDetailResponse, updateOrderStatus } from '@/services/orders';
import { ProviderAvatar } from '@/components/ProviderAvatar';
import { Ionicons } from '@expo/vector-icons';
import { getThemeColors, type ThemeColors } from '@/utils/themeStyles';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
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

function createOrderDetailStyles(theme: ThemeColors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.screenBackground,
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
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  providerCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  providerImageContainer: {
    position: 'relative',
  },
  providerImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.surfaceSecondary,
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
    color: theme.textPrimary,
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
    backgroundColor: theme.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatButton: {
    backgroundColor: '#3b82f6',
  },
  progressSection: {
    marginBottom: 20,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textPrimary,
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
    backgroundColor: theme.surfaceSecondary,
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
    backgroundColor: theme.border,
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
    color: theme.textPrimary,
    marginBottom: 4,
  },
  timelineTime: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  detailsSection: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textPrimary,
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
    color: theme.textSecondary,
    flex: 1,
  },
  actionButtonsSection: {
    gap: 12,
    marginTop: 20,
  },
  completePaymentButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  completePaymentButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButton: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  cancelButtonPressed: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#ef4444',
  },
  cancelButtonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  supportButton: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: theme.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  supportButtonPressed: {
    backgroundColor: theme.surfaceSecondary,
    opacity: 0.8,
  },
  supportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.cardBorder,
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
    color: theme.textPrimary,
  },
  statusText: {
    fontSize: 16,
    color: theme.textPrimary,
    padding: 20,
  },
  });
}

export default function OrderDetailScreen() {
  const router = useRouter();
  const { orderId, navRef } = useLocalSearchParams<{ orderId: string; navRef?: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const themeColors = useMemo(() => getThemeColors(colorScheme === 'dark'), [colorScheme]);
  const styles = useMemo(() => createOrderDetailStyles(themeColors), [themeColors]);
  const [loading, setLoading] = useState(true);
  const [orderDetail, setOrderDetail] = useState<OrderDetailResponse | null>(null);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState('1:24:30'); // TODO: Calculate from actual data
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;
    setOrderDetail(null);
    setLoading(true);

    (async () => {
      try {
        const data = await fetchOrderDetail(orderId);
        if (!cancelled) {
          setOrderDetail(data);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('[OrderDetail] Failed to load order:', error);
          Alert.alert(t('common.error'), t('errors.requestFailed'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderId, navRef]);

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

  const handleChat = async () => {
    if (!orderId) return;
    if (orderDetail?.conversation_id) {
      router.push(`/chat/${orderDetail.conversation_id}`);
      return;
    }
    const supplierId = orderDetail?.order?.supplier_id;
    if (!supplierId) return;
    try {
      const { conversation } = await getOrCreateConversation(supplierId, orderId);
      router.push(`/chat/${conversation.id}`);
    } catch (err) {
      console.error('[OrderDetail] Failed to open chat:', err);
      Alert.alert(t('common.error'), t('errors.requestFailed'));
    }
  };

  const handleCancel = async () => {
    console.log('[OrderDetail] ====== handleCancel CALLED ======');
    console.log('[OrderDetail] orderId:', orderId);
    console.log('[OrderDetail] orderDetail:', orderDetail);
    console.log('[OrderDetail] orderStatus:', orderDetail?.order?.status);
    
    if (!orderId) {
      console.error('[OrderDetail] No orderId available');
      Alert.alert(t('common.error'), 'No se pudo identificar la reserva.');
      return;
    }

    if (!orderDetail?.order) {
      console.error('[OrderDetail] No order detail available');
      Alert.alert(t('common.error'), 'No se pudo cargar la información de la reserva.');
      return;
    }

    const order = orderDetail.order;
    
    // Check if order can be cancelled
    if (order.status === 'completed') {
      Alert.alert(
        t('common.error'),
        'No se puede cancelar una reserva que ya ha sido completada.'
      );
      return;
    }

    if (order.status === 'cancelled') {
      Alert.alert(
        t('common.error'),
        'Esta reserva ya ha sido cancelada.'
      );
      return;
    }

    console.log('[OrderDetail] Showing confirmation alert...');
    
    // Use window.confirm for web, Alert.alert for native
    const performCancellation = async () => {
      console.log('[OrderDetail] ====== User confirmed cancellation ======');
      try {
        setCancelling(true);
        console.log('[OrderDetail] Calling updateOrderStatus...', { orderId, status: 'cancelled' });
        
        const updatedOrder = await updateOrderStatus(orderId, 'cancelled');
        console.log('[OrderDetail] Order status updated successfully:', updatedOrder);
        
        // Reload order detail to get updated status
        console.log('[OrderDetail] Reloading order detail...');
        await loadOrderDetail();
        
        console.log('[OrderDetail] Showing success alert...');
        
        if (Platform.OS === 'web') {
          window.alert('Reserva cancelada exitosamente.');
          console.log('[OrderDetail] Navigating back to bookings list');
          router.back();
        } else {
          Alert.alert(
            t('common.success'),
            'Reserva cancelada exitosamente.',
            [
              {
                text: t('common.ok'),
                onPress: () => {
                  console.log('[OrderDetail] Navigating back to bookings list');
                  router.back();
                },
              },
            ]
          );
        }
      } catch (error) {
        console.error('[OrderDetail] ====== ERROR cancelling order ======');
        console.error('[OrderDetail] Error:', error);
        
        let errorMessage = 'No se pudo cancelar la reserva. Por favor, intenta nuevamente.';
        
        if (error instanceof Error) {
          errorMessage = error.message;
          console.error('[OrderDetail] Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack
          });
        }
        
        if (Platform.OS === 'web') {
          window.alert(errorMessage);
        } else {
          Alert.alert(
            t('common.error'),
            errorMessage
          );
        }
      } finally {
        setCancelling(false);
        console.log('[OrderDetail] Cancellation process finished');
      }
    };

    if (Platform.OS === 'web') {
      // Use window.confirm for web
      const confirmed = window.confirm('¿Estás seguro de que deseas cancelar esta reserva?');
      console.log('[OrderDetail] User confirmation result:', confirmed);
      if (confirmed) {
        await performCancellation();
      } else {
        console.log('[OrderDetail] User cancelled the action');
      }
    } else {
      // Use Alert.alert for native
      Alert.alert(
        t('orders.inProgress.cancelBooking'),
        '¿Estás seguro de que deseas cancelar esta reserva?',
        [
          { 
            text: t('common.cancel'), 
            style: 'cancel',
            onPress: () => {
              console.log('[OrderDetail] User cancelled the action');
            }
          },
          {
            text: t('orders.inProgress.cancelBooking'),
            style: 'destructive',
            onPress: performCancellation,
          },
        ],
        { cancelable: true }
      );
    }
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

  // If not in progress, show a simple detail view
  if (!isInProgress) {
    const canCancel = order.status !== 'completed' && order.status !== 'cancelled';
    const isPendingReview = order.status === 'pending_review';

    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={themeColors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('orders.viewDetails')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView 
          style={styles.content}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
        >
          <View style={styles.detailsSection}>
            <Text style={styles.detailsTitle}>Estado</Text>
            <Text style={styles.statusText}>
              {t(`orders.status.${order.status}`)}
            </Text>
          </View>

          {order.scheduled_at && (
            <View style={styles.detailsSection}>
              <Text style={styles.detailsTitle}>Detalles del servicio</Text>
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={16} color={themeColors.iconSecondary} />
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
                  <Ionicons name="location-outline" size={16} color={themeColors.iconSecondary} />
                  <Text style={styles.detailText}>{order.address}</Text>
                </View>
              )}
            </View>
          )}

          {orderDetail.quote?.notes ? (
            <View style={styles.detailsSection}>
              <Text style={styles.detailsTitle}>{t('orders.quoteNoteLabel')}</Text>
              <Text style={styles.detailText}>{orderDetail.quote.notes}</Text>
            </View>
          ) : null}

          {order.status === 'pending_payment' && (
            <View style={styles.actionButtonsSection} pointerEvents="box-none">
              <Pressable
                style={({ pressed }) => [styles.completePaymentButton, pressed && { opacity: 0.9 }]}
                onPress={() =>
                  router.push({
                    pathname: `/booking/payment/${orderId}`,
                    params: { totalAmount: String(order.total_amount ?? orderDetail.quote?.total ?? 0) },
                  })
                }
              >
                <Text style={styles.completePaymentButtonText}>{t('orders.completePayment')}</Text>
              </Pressable>
            </View>
          )}

          {isPendingReview && (
            <View style={styles.actionButtonsSection} pointerEvents="box-none">
              <Pressable
                style={({ pressed }) => [styles.completePaymentButton, pressed && { opacity: 0.9 }]}
                onPress={() => router.push(`/orders/rate/${orderId}`)}
              >
                <Text style={styles.completePaymentButtonText}>{t('rating.title')}</Text>
              </Pressable>
            </View>
          )}

          {canCancel && (
            <View style={styles.actionButtonsSection} pointerEvents="box-none">
              <Pressable
                style={({ pressed }) => [
                  styles.cancelButton, 
                  cancelling && styles.cancelButtonDisabled,
                  pressed && styles.cancelButtonPressed
                ]}
                onPress={() => {
                  console.log('[OrderDetail] ====== Cancel button PRESSED (simple view) ======');
                  handleCancel();
                }}
                disabled={cancelling}
                testID="cancel-booking-button-simple"
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <Text style={styles.cancelButtonText}>
                    {t('orders.inProgress.cancelBooking')}
                  </Text>
                )}
              </Pressable>
            </View>
          )}
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
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        {/* Provider Card */}
        <View style={styles.providerCard}>
          <View style={styles.providerImageContainer}>
            <ProviderAvatar
              profileImage={supplier?.profile_image}
              size={48}
              rounded
              style={styles.providerImage}
            />
          </View>
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>
              {supplier?.business_name?.trim() || supplier?.full_name || 'Proveedor'}
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
              <Ionicons name="calendar-outline" size={16} color={themeColors.iconSecondary} />
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
                <Ionicons name="location-outline" size={16} color={themeColors.iconSecondary} />
                <Text style={styles.detailText}>{order.address}</Text>
              </View>
            )}
          </View>
        )}

        {orderDetail.quote?.notes ? (
          <View style={styles.detailsSection}>
            <Text style={styles.detailsTitle}>{t('orders.quoteNoteLabel')}</Text>
            <Text style={styles.detailText}>{orderDetail.quote.notes}</Text>
          </View>
        ) : null}

        {/* Action Buttons */}
        <View style={styles.actionButtonsSection} pointerEvents="box-none">
          {order.status !== 'completed' && order.status !== 'cancelled' && (
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton, 
                cancelling && styles.cancelButtonDisabled,
                pressed && styles.cancelButtonPressed
              ]}
              onPress={() => {
                console.log('[OrderDetail] ====== Cancel button PRESSED ======');
                handleCancel();
              }}
              disabled={cancelling}
              testID="cancel-booking-button"
            >
              {cancelling ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <Text style={styles.cancelButtonText}>
                  {t('orders.inProgress.cancelBooking')}
                </Text>
              )}
            </Pressable>
          )}
          <Pressable
            style={({ pressed }) => [
              styles.supportButton,
              pressed && styles.supportButtonPressed
            ]}
            onPress={() => router.push('/account/support')}
          >
            <Text style={styles.supportButtonText}>
              {t('orders.inProgress.contactSupport')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
