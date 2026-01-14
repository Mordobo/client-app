import { ApiError, fetchOrderDetail, OrderDetailResponse } from '@/services/orders';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !orderData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error || t('errors.requestFailed')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadOrderData}>
            <Text style={styles.retryButtonText}>{t('chat.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { order, supplier } = orderData;
  const reservationCode = generateReservationCode(order.id, order.created_at);
  const formattedDate = formatDate(order.scheduled_at);
  const formattedTime = formatTime(order.scheduled_at);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Icon with Animation */}
        <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
          <View style={styles.iconOuterCircle}>
            <View style={styles.iconInnerCircle}>
              <Ionicons name="checkmark" size={40} color={colors.white} />
            </View>
          </View>
        </Animated.View>

        {/* Success Message */}
        <Animated.View style={animatedContentStyle}>
          <Text style={styles.title}>{t('booking.reservationConfirmed')}</Text>
          <Text style={styles.subtitle}>{t('booking.reservationConfirmedMessage')}</Text>

          {/* Booking Info Card */}
          <View style={styles.detailsCard}>
            {/* Provider Info */}
            <View style={styles.providerInfo}>
              <View style={styles.providerAvatar}>
                {supplier?.profile_image ? (
                  <Image
                    source={{ uri: supplier.profile_image }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Ionicons name="person" size={24} color={colors.textSecondary} />
                )}
              </View>
              <View style={styles.providerText}>
                <Text style={styles.providerName}>
                  {supplier?.full_name || supplier?.business_name || 'Provider'}
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
                <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.detailLabel}>{t('booking.date')}</Text>
                <Text style={styles.detailValue}>{formattedDate}</Text>
              </View>

              {/* Time */}
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.detailLabel}>{t('booking.time')}</Text>
                <Text style={styles.detailValue}>{formattedTime}</Text>
              </View>

              {/* Location */}
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.detailLabel}>{t('booking.place')}</Text>
                <Text style={styles.detailValue}>
                  {order.address || t('addresses.namePlaceholder')}
                </Text>
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
    </SafeAreaView>
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
    padding: 30,
    paddingTop: 40,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 32,
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
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
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
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 18,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 18,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '500',
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
