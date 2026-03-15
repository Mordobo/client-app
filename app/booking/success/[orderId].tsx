import { ProviderAvatar } from '@/components/ProviderAvatar';
import { ApiError, fetchOrderDetail, OrderDetailResponse } from '@/services/orders';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@/i18n';

// Colors matching the JSX design
const colors = {
  bg: '#1a1a2e',
  bgCard: '#252542',
  bgInput: '#2d2d4a',
  primary: '#3b82f6',
  secondary: '#10b981',
  textSecondary: '#9ca3af',
  border: '#374151',
  white: '#ffffff',
};

// Format date to match design: "Mié, 15 Enero"
const formatDate = (dateString?: string): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    
    return `${dayName}, ${day} ${month}`;
  } catch {
    return '';
  }
};

// Format time: "10:00 AM"
const formatTime = (dateString?: string): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    
    return `${displayHours}:${displayMinutes} ${ampm}`;
  } catch {
    return '';
  }
};

// Generate reservation code: #MRD-YYYY-MMDD
const generateReservationCode = (orderId: string, createdAt: string): string => {
  try {
    const date = new Date(createdAt);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    // Use last 4 chars of orderId as suffix
    const suffix = orderId.slice(-4).toUpperCase();
    
    return `#MRD-${year}-${month}${day}-${suffix}`;
  } catch {
    return `#MRD-${new Date().getFullYear()}-${orderId.slice(-8).toUpperCase()}`;
  }
};

export default function BookingSuccessScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const insets = useSafeAreaInsets();
  const [orderData, setOrderData] = useState<OrderDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (orderId) {
      loadOrderData();
    }
  }, [orderId]);

  useEffect(() => {
    // Animate on mount
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadOrderData = async () => {
    if (!orderId || orderId === 'new') {
      setError('Invalid order ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchOrderDetail(orderId);
      setOrderData(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t('errors.requestFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const animatedIconStyle = {
    transform: [{ scale: scaleAnim }],
    opacity: opacityAnim,
  };

  const animatedContentStyle = {
    opacity: opacityAnim,
  };

  const handleViewBookings = () => {
    router.push('/(tabs)/bookings');
  };

  const handleBackToHome = () => {
    router.push('/(tabs)/home');
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
        </View>
      </View>
    );
  }

  if (error || !orderData) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error || t('errors.requestFailed')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadOrderData}>
            <Text style={styles.retryButtonText}>{t('chat.retry')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const { order, supplier } = orderData;
  const reservationCode = generateReservationCode(order.id, order.created_at);
  const formattedDate = formatDate(order.scheduled_at);
  const formattedTime = formatTime(order.scheduled_at);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: 24, paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Icon with Animation */}
        <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
          <View style={styles.iconOuterCircle}>
            <View style={styles.iconInnerCircle}>
              <Ionicons name="checkmark" size={40} color={colors.white} />
            </View>
          </View>
          <Text style={styles.pendingBadge}>{t('booking.awaitingProvider')}</Text>
        </Animated.View>

        {/* Success Message */}
        <Animated.View style={[styles.contentContainer, animatedContentStyle]}>
          <Text style={styles.title}>{t('booking.reservationConfirmed')}</Text>
          <Text style={styles.subtitle}>{t('booking.reservationConfirmedMessage')}</Text>

          {/* Booking Info Card */}
          <View style={styles.detailsCard}>
            {/* Provider Info */}
            <View style={styles.providerInfo}>
              <View style={styles.providerAvatar}>
                <ProviderAvatar
                  profileImage={supplier?.profile_image}
                  size={48}
                  rounded
                  style={styles.avatarImage}
                />
              </View>
              <View style={styles.providerText}>
                <Text style={styles.providerName}>
                  {supplier?.business_name?.trim() || supplier?.full_name || 'Provider'}
                </Text>
                <Text style={styles.serviceName}>
                  {orderData.quote?.line_items?.[0]?.description || 'Service'}
                </Text>
              </View>
            </View>

            {/* Details */}
            <View style={styles.detailsDivider} />
            <View style={styles.detailsList}>
              {/* Date */}
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} style={styles.detailIcon} />
                <Text style={styles.detailLabel}>{t('booking.date')}</Text>
                <View style={styles.detailValueWrap}>
                  <Text style={styles.detailValue}>{formattedDate}</Text>
                </View>
              </View>

              {/* Time */}
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={18} color={colors.textSecondary} style={styles.detailIcon} />
                <Text style={styles.detailLabel}>{t('booking.time')}</Text>
                <View style={styles.detailValueWrap}>
                  <Text style={styles.detailValue}>{formattedTime}</Text>
                </View>
              </View>

              {/* Location */}
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={18} color={colors.textSecondary} style={styles.detailIcon} />
                <Text style={styles.detailLabel}>{t('booking.place')}</Text>
                <View style={styles.detailValueWrap}>
                  <Text style={styles.detailValue}>
                    {order.address || t('addresses.namePlaceholder')}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Reservation Code */}
          <Text style={styles.codeLabel}>
            {t('booking.reservationCode')}:{' '}
            <Text style={styles.codeValue}>{reservationCode}</Text>
          </Text>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleViewBookings}
            >
              <Text style={styles.primaryButtonText}>
                {t('booking.viewMyBookings')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleBackToHome}
            >
              <Text style={styles.secondaryButtonText}>
                {t('booking.backToHome')}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    width: '100%',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  pendingBadge: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
    color: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  iconOuterCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${colors.secondary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInnerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  detailsCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  providerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  providerText: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 2,
  },
  serviceName: {
    fontSize: 14,
    color: colors.secondary,
  },
  detailsDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 16,
  },
  detailsList: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  detailIcon: {
    marginTop: 2,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    minWidth: 56,
  },
  detailValueWrap: {
    flex: 1,
    minWidth: 0,
  },
  detailValue: {
    fontSize: 14,
    color: colors.white,
    fontWeight: '500',
  },
  codeLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  codeValue: {
    color: colors.primary,
    fontWeight: '600',
  },
  actions: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    alignItems: 'stretch',
    gap: 12,
    paddingHorizontal: 0,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
