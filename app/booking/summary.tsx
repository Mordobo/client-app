import {
  fetchSupplierProfile,
  Supplier,
  SupplierService,
  fetchSupplierServices,
  ApiError,
} from '@/services/suppliers';
import { getAddresses, Address } from '@/services/addresses';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t, getLocale } from '@/i18n';

// Theme colors matching the JSX design
const colors = {
  bg: '#1a1a2e',
  bgCard: '#252542',
  bgInput: '#2d2d4a',
  primary: '#3b82f6',
  secondary: '#10b981',
  accent: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  textSecondary: '#9ca3af',
  border: '#374151',
  white: '#ffffff',
};

export default function BookingSummaryScreen() {
  const router = useRouter();
  const {
    supplierId,
    serviceId,
    scheduledAt,
    duration,
    addressId,
  } = useLocalSearchParams<{
    supplierId: string;
    serviceId: string;
    scheduledAt: string;
    duration: string;
    addressId: string;
  }>();
  const insets = useSafeAreaInsets();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [service, setService] = useState<SupplierService | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(20); // Percentage discount (demo: 20% as per JSX)

  useEffect(() => {
    if (supplierId && serviceId && scheduledAt && duration && addressId) {
      loadData();
    } else {
      setError(t('booking.missingBookingData'));
      setLoading(false);
    }
  }, [supplierId, serviceId, scheduledAt, duration, addressId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load supplier, service, and address in parallel
      const [supplierData, servicesData, addressesData] = await Promise.all([
        fetchSupplierProfile(supplierId),
        fetchSupplierServices(supplierId),
        getAddresses(),
      ]);

      setSupplier(supplierData);
      const selectedService = servicesData.find((s) => s.id === serviceId);
      setService(selectedService || null);

      const selectedAddress = addressesData.find((a) => a.id === addressId);
      setAddress(selectedAddress || null);

      if (!selectedService) {
        setError(t('booking.serviceNotFound'));
      }
      if (!selectedAddress) {
        setError(t('booking.addressNotFound'));
      }
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

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const locale = getLocale() === 'es' ? 'es-ES' : 'en-US';
      return date.toLocaleDateString(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const locale = getLocale() === 'es' ? 'es-ES' : 'en-US';
      return date.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateString;
    }
  };

  const formatAddress = (addr: Address): string => {
    const parts = [
      addr.name,
      addr.address_line1,
      addr.address_line2,
      addr.city,
      addr.state,
    ].filter(Boolean);
    return parts.join(', ');
  };

  // Calculate pricing
  const calculatePricing = () => {
    if (!service || !duration) {
      return {
        serviceCost: 0,
        travelFee: 5.0,
        platformFee: 5.0,
        discount: 0,
        total: 0,
      };
    }

    const durationHours = parseFloat(duration) || 2;
    const hourlyRate = service.price || 60; // Default $60/hr
    const serviceCost = hourlyRate * durationHours;
    const serviceFee = 5.0;
    const subtotal = serviceCost + serviceFee;

    // Apply discount if promo code is applied (20% for demo)
    const discountPercent = appliedDiscount > 0 ? appliedDiscount : 0;
    const discount = subtotal * (discountPercent / 100);
    const total = subtotal - discount;

    return {
      serviceCost,
      serviceFee,
      discount,
      total,
    };
  };

  const pricing = calculatePricing();


  const handleProceedToPayment = () => {
    if (!supplierId || !serviceId || !scheduledAt || !duration || !addressId) {
      Alert.alert(t('common.error'), t('booking.missingBookingData'));
      return;
    }

    // Navigate to payment screen with all booking data
    router.push({
      pathname: '/booking/payment/[orderId]',
      params: {
        orderId: 'new', // Will be created after payment
        supplierId,
        serviceId,
        scheduledAt,
        duration,
        addressId,
        notes: additionalNotes,
        totalAmount: pricing.total.toString(),
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (error || !supplier || !service || !address) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>
            {error || t('booking.missingBookingData')}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryText}>{t('common.ok')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const formattedDate = formatDate(scheduledAt);
  const formattedTime = formatTime(scheduledAt);
  const addressString = formatAddress(address);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 50) }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t('booking.confirmReservation')}
          </Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Provider Card */}
          <View style={styles.card}>
            <View style={styles.providerRow}>
              <View style={styles.providerAvatar}>
                {supplier.profile_image ? (
                  <Image
                    source={{ uri: supplier.profile_image }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarEmoji}>👨‍🔧</Text>
                )}
              </View>
              <View style={styles.providerInfo}>
                <View style={styles.providerNameRow}>
                  <Text style={styles.providerName}>
                    {supplier.full_name || supplier.business_name}
                  </Text>
                  {supplier.verified && (
                    <Text style={styles.verifiedCheckmark}>✓</Text>
                  )}
                </View>
                <Text style={styles.ratingText}>
                  ⭐ {Number(supplier.rating || 0).toFixed(1)} ({supplier.total_reviews || 0}{' '}
                  {t('supplier.reviewsCount')})
                </Text>
              </View>
            </View>
          </View>

          {/* Service Details Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {t('booking.serviceDetails')}
            </Text>

            {/* Service */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('booking.service')}</Text>
              <Text style={styles.detailValue}>
                {service.category_name || service.description || 'Service'}
              </Text>
            </View>

            {/* Date */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('booking.date')}</Text>
              <Text style={styles.detailValue}>{formattedDate}</Text>
            </View>

            {/* Time */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('booking.time')}</Text>
              <Text style={styles.detailValue}>{formattedTime}</Text>
            </View>

            {/* Duration */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                {t('booking.estimatedDuration')}
              </Text>
              <Text style={styles.detailValue}>
                {duration} {t('booking.hours')}
              </Text>
            </View>

            {/* Address */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('booking.address')}</Text>
              <Text style={[styles.detailValue, styles.addressValue]}>
                {addressString}
              </Text>
            </View>
          </View>

          {/* Additional Notes Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {t('booking.additionalNotes')}
            </Text>
            <TextInput
              style={styles.notesInput}
              placeholder={t('booking.notesPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={additionalNotes}
              onChangeText={setAdditionalNotes}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Payment Summary Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('booking.paymentSummary')}</Text>

            {/* Service Cost */}
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>
                {service.category_name || 'Service'} ({duration}{' '}
                {t('booking.hours')} x ${service.price || 60}/hr)
              </Text>
              <Text style={styles.priceValue}>
                ${pricing.serviceCost.toFixed(2)}
              </Text>
            </View>

            {/* Service Fee */}
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>
                {t('booking.travelFee')}
              </Text>
              <Text style={styles.priceValue}>
                ${pricing.serviceFee.toFixed(2)}
              </Text>
            </View>

            {/* Discount */}
            {pricing.discount > 0 && (
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, styles.discountLabel]}>
                  {t('booking.discount')} ({appliedDiscount}% OFF)
                </Text>
                <Text style={[styles.priceValue, styles.discountValue]}>
                  -${pricing.discount.toFixed(2)}
                </Text>
              </View>
            )}

            {/* Divider */}
            <View style={styles.divider} />

            {/* Total */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('booking.total')}</Text>
              <Text style={styles.totalValue}>
                ${pricing.total.toFixed(2)}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* CTA Button */}
        <View
          style={[
            styles.ctaContainer,
            { paddingBottom: insets.bottom + 16 },
          ]}
        >
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleProceedToPayment}
          >
            <Text style={styles.ctaButtonEmoji}>💳</Text>
            <Text style={styles.ctaButtonText}>
              {t('booking.proceedToPayment')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
    backgroundColor: colors.bg,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    padding: 0,
    paddingBottom: 100,
    backgroundColor: colors.bg,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  cardTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  providerRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  providerAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.bgInput,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarEmoji: {
    fontSize: 28,
  },
  providerInfo: {
    flex: 1,
  },
  providerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  providerName: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  verifiedCheckmark: {
    color: colors.secondary,
    fontSize: 18,
  },
  ratingText: {
    color: colors.accent,
    fontSize: 14,
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  detailValue: {
    color: colors.white,
    fontSize: 14,
    textAlign: 'right',
    maxWidth: 180,
  },
  addressValue: {
    flex: 1,
    textAlign: 'right',
  },
  notesInput: {
    width: '100%',
    padding: 14,
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    color: colors.white,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  priceLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  priceValue: {
    color: colors.white,
    fontSize: 14,
  },
  discountLabel: {
    color: colors.secondary,
  },
  discountValue: {
    color: colors.secondary,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 12,
    marginBottom: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  totalValue: {
    color: colors.secondary,
    fontSize: 24,
    fontWeight: '700',
  },
  ctaContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
  },
  ctaButton: {
    width: '100%',
    padding: 18,
    backgroundColor: colors.primary,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaButtonEmoji: {
    fontSize: 20,
  },
  ctaButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: colors.danger,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
