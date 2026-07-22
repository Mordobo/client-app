import { useThemeColors } from '@/hooks/useThemeColors';
import {
  createPayment,
  bookAndPay,
  getPaymentMethods,
  PaymentMethod,
  ApiError as PaymentApiError,
} from '@/services/payments';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@/i18n';
import { AddCardModal } from '@/components/payment/AddCardModal';
import { CardBrandMark } from '@/components/payment/CardBrandMark';
import { PaymentComplianceBadges } from '@/components/payment/PaymentComplianceBadges';
import { paymentMethodTypeToMarkVariant } from '@/utils/cardNetwork';
import { formatDop } from '@/constants/merchant';

export default function PaymentScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const colors = useMemo(
    () => ({
      bg: themeColors.screenBackground,
      bgCard: themeColors.card,
      bgInput: themeColors.surfaceSecondary,
      primary: themeColors.primary,
      secondary: '#10b981',
      accent: '#f59e0b',
      danger: '#ef4444',
      textPrimary: themeColors.textPrimary,
      textSecondary: themeColors.textSecondary,
      border: themeColors.border,
      cardBorder: themeColors.cardBorder,
      white: '#ffffff',
    }),
    [themeColors]
  );
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.bg },
        centerContainer: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 16,
        },
        backButton: {
          width: 40,
          height: 40,
          alignItems: 'center',
          justifyContent: 'center',
        },
        headerTitle: { fontSize: 20, fontWeight: '600', color: colors.textPrimary },
        content: { flex: 1 },
        totalContainer: { alignItems: 'center', paddingVertical: 20 },
        totalLabel: { fontSize: 14, color: colors.textSecondary, marginBottom: 8 },
        totalAmount: { fontSize: 42, fontWeight: '700', color: colors.textPrimary },
        section: { paddingHorizontal: 20, marginBottom: 20 },
        sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 16 },
        emptyState: { padding: 20, alignItems: 'center' },
        emptyStateText: { color: colors.textSecondary, fontSize: 14 },
        paymentMethodCard: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.bgCard,
          borderRadius: 14,
          padding: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: colors.cardBorder,
        },
        paymentMethodCardSelected: {
          borderWidth: 2,
          backgroundColor: `${colors.primary}20`,
          borderColor: colors.primary,
        },
        cardIconContainer: {
          width: 48,
          height: 48,
          backgroundColor: 'transparent',
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 14,
        },
        paymentMethodInfo: { flex: 1 },
        paymentMethodLabel: {
          fontSize: 15,
          fontWeight: '600',
          color: colors.textPrimary,
          marginBottom: 4,
        },
        paymentMethodSubtitle: { fontSize: 13, color: colors.textSecondary },
        checkmarkContainer: { marginLeft: 12 },
        addCardButton: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.bgCard,
          borderRadius: 14,
          padding: 16,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: colors.border,
        },
        addCardText: {
          fontSize: 15,
          fontWeight: '500',
          color: colors.primary,
          marginLeft: 14,
        },
        securityContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 20,
          paddingVertical: 20,
          gap: 10,
        },
        securityText: { fontSize: 12, color: colors.textSecondary },
        complianceBlock: {
          paddingHorizontal: 20,
          paddingBottom: 8,
        },
        consentRow: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 10,
          paddingHorizontal: 20,
          paddingVertical: 14,
          marginHorizontal: 20,
          marginBottom: 8,
          borderRadius: 12,
          backgroundColor: colors.bgCard,
          borderWidth: 1,
          borderColor: colors.border,
        },
        checkbox: {
          width: 24,
          height: 24,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 1,
        },
        checkboxChecked: { backgroundColor: colors.primary },
        consentText: { flex: 1, color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
        consentLink: { color: colors.primary, fontWeight: '700' },
        extraPolicyLinks: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 20,
          paddingBottom: 12,
        },
        policyDot: { color: colors.textSecondary, fontSize: 12 },
        currencyNote: { color: colors.textSecondary, fontSize: 12, marginTop: 6 },
        footer: {
          paddingHorizontal: 20,
          paddingTop: 20,
          backgroundColor: colors.bg,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.08,
              shadowRadius: 4,
            },
            android: {
              elevation: 6,
            },
          }),
        },
        confirmButton: {
          backgroundColor: colors.secondary,
          borderRadius: 14,
          paddingVertical: 18,
          alignItems: 'center',
        },
        confirmButtonDisabled: { opacity: 0.5 },
        confirmButtonText: {
          color: colors.white,
          fontSize: 16,
          fontWeight: '700',
        },
      }),
    [colors]
  );
  const {
    orderId,
    totalAmount,
    serviceId,
    categoryId,
    supplierId,
    scheduledAt,
    address,
    notes,
  } = useLocalSearchParams<{
    orderId: string;
    totalAmount?: string;
    serviceId?: string;
    categoryId?: string;
    supplierId?: string;
    scheduledAt?: string;
    address?: string;
    notes?: string;
  }>();

  const isNewBooking = orderId === 'new';
  const insets = useSafeAreaInsets();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const total = totalAmount ? parseFloat(totalAmount) : 125.0;

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const methods = await getPaymentMethods();
      setPaymentMethods(methods);
      
      // Select default method if available
      const defaultMethod = methods.find((m) => m.is_default);
      if (defaultMethod) {
        setSelectedMethodId(defaultMethod.id);
      } else if (methods.length > 0) {
        setSelectedMethodId(methods[0].id);
      }
    } catch (error) {
      console.error('[Payment] Failed to load payment methods:', error);
      // Continue with empty list - user can add a card
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedMethodId) {
      Alert.alert(t('common.error'), t('payment.selectPaymentMethod'));
      return;
    }

    try {
      setProcessing(true);

      const selectedMethod = paymentMethods.find((m) => m.id === selectedMethodId);
      if (!selectedMethod) throw new Error('Selected payment method not found');

      const provider: 'card' | 'apple_pay' | 'google_pay' =
        selectedMethod.type === 'apple_pay'
          ? 'apple_pay'
          : selectedMethod.type === 'google_pay'
            ? 'google_pay'
            : 'card';

      if (isNewBooking) {
        if (!serviceId || !supplierId) {
          Alert.alert(t('common.error'), t('booking.missingBookingData'));
          return;
        }
        const result = await bookAndPay({
          service_id: serviceId,
          category_id: categoryId || undefined,
          supplier_id: supplierId,
          scheduled_at: scheduledAt || undefined,
          address: address || undefined,
          notes: notes || undefined,
          amount: total,
          provider,
          payment_method_id: selectedMethodId,
          terms_accepted: true,
        });
        router.push({
          pathname: '/booking/success/[orderId]',
          params: { orderId: result.order.id, paymentId: result.payment.id },
        });
      } else {
        if (!orderId) {
          Alert.alert(t('common.error'), t('booking.missingBookingData'));
          return;
        }
        const payment = await createPayment({
          order_id: orderId,
          amount: total,
          provider,
          payment_method_id: selectedMethodId,
          terms_accepted: true,
        });
        router.push({
          pathname: '/booking/success/[orderId]',
          params: { orderId, paymentId: payment.id },
        });
      }
    } catch (err) {
      if (err instanceof PaymentApiError) {
        const data = err.originalError as { code?: string } | undefined;
        const message =
          data?.code === 'quote_not_approved'
            ? t('payment.errorQuoteNotApproved')
            : data?.code === 'already_paid_or_confirmed'
              ? t('payment.errorAlreadyPaid')
              : err.message;
        Alert.alert(t('common.error'), message);
      } else {
        Alert.alert(t('common.error'), t('payment.paymentFailed'));
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleCardAdded = () => {
    setShowAddCardModal(false);
    loadPaymentMethods();
    // After adding a card, if it's the first one, select it automatically
    setTimeout(() => {
      loadPaymentMethods().then(() => {
        // The new card will be selected if it's the only one or if it's set as default
      });
    }, 500);
  };

  const formatExpiry = (month?: number, year?: number) => {
    if (!month || !year) return '';
    const monthStr = month.toString().padStart(2, '0');
    const yearStr = year.toString().slice(-2);
    return `${monthStr}/${yearStr}`;
  };

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    if (method.type === 'paypal') {
      return `PayPal •••• ${method.email || 'email'}`;
    }
    if (method.last4) {
      return `${method.brand || method.type.toUpperCase()} •••• ${method.last4}`;
    }
    return method.brand || method.type.toUpperCase();
  };

  const getPaymentMethodSubtitle = (method: PaymentMethod) => {
    if (method.type === 'paypal') {
      return t('payment.connected');
    }
    if (method.expiry_month && method.expiry_year) {
      return `${t('payment.expires')} ${formatExpiry(method.expiry_month, method.expiry_year)}`;
    }
    return '';
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('payment.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Total Amount */}
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>{t('payment.totalToPay')}</Text>
          <Text style={styles.totalAmount}>{formatDop(total)}</Text>
          <Text style={styles.currencyNote}>{t('payment.currencyProcessedInDop')}</Text>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('payment.selectPaymentMethod')}</Text>
          
          {paymentMethods.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>{t('payment.noPaymentMethods')}</Text>
            </View>
          ) : (
            paymentMethods.map((method) => {
              const isSelected = selectedMethodId === method.id;
              return (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentMethodCard,
                    isSelected && styles.paymentMethodCardSelected,
                  ]}
                  onPress={() => setSelectedMethodId(method.id)}
                >
                  <View style={styles.cardIconContainer}>
                    <CardBrandMark variant={paymentMethodTypeToMarkVariant(method.type)} width={60} />
                  </View>
                  <View style={styles.paymentMethodInfo}>
                    <Text style={styles.paymentMethodLabel}>
                      {getPaymentMethodLabel(method)}
                    </Text>
                    <Text style={styles.paymentMethodSubtitle}>
                      {getPaymentMethodSubtitle(method)}
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={styles.checkmarkContainer}>
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}

          {/* Add New Card */}
          <TouchableOpacity
            style={styles.addCardButton}
            onPress={() => setShowAddCardModal(true)}
          >
            <View style={styles.cardIconContainer}>
              <Ionicons name="add" size={24} color={colors.primary} />
            </View>
            <Text style={styles.addCardText}>{t('payment.addNewCard')}</Text>
          </TouchableOpacity>
        </View>

        {/* Security Info */}
        <View style={styles.securityContainer}>
          <Ionicons name="lock-closed" size={16} color={colors.textSecondary} />
          <Text style={styles.securityText}>{t('payment.securePayment')}</Text>
        </View>

        <View style={styles.complianceBlock}>
          <PaymentComplianceBadges appearance="light" showContact />
        </View>

        <TouchableOpacity
          accessibilityRole="checkbox"
          accessibilityState={{ checked: termsAccepted }}
          style={styles.consentRow}
          onPress={() => setTermsAccepted((value) => !value)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
            {termsAccepted ? <Ionicons name="checkmark" size={17} color="#FFFFFF" /> : null}
          </View>
          <Text style={styles.consentText}>
            {t('payment.acceptLegalPrefix')}{' '}
            <Text style={styles.consentLink} onPress={() => router.push('/terms')}>
              {t('payment.termsAndConditions')}
            </Text>
            {', '}
            <Text style={styles.consentLink} onPress={() => router.push('/privacy')}>
              {t('payment.privacyPolicy')}
            </Text>
            {' '}
            <Text>{t('common.and')}</Text>
            {' '}
            <Text style={styles.consentLink} onPress={() => router.push('/refunds')}>
              {t('payment.refundPolicy')}
            </Text>
            .
          </Text>
        </TouchableOpacity>
        <View style={styles.extraPolicyLinks}>
          <Text style={styles.consentLink} onPress={() => router.push('/service-catalog')}>
            {t('compliance.linkServices')}
          </Text>
          <Text style={styles.policyDot}>·</Text>
          <Text style={styles.consentLink} onPress={() => router.push('/delivery')}>
            {t('compliance.linkDelivery')}
          </Text>
          <Text style={styles.policyDot}>·</Text>
          <Text style={styles.consentLink} onPress={() => router.push('/payment-security')}>
            {t('compliance.linkSecurity')}
          </Text>
          <Text style={styles.policyDot}>·</Text>
          <Text style={styles.consentLink} onPress={() => router.push('/receipt-sample')}>
            {t('compliance.linkReceiptSample')}
          </Text>
        </View>
      </ScrollView>

      {/* Confirm Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={[styles.confirmButton, (processing || !selectedMethodId || !termsAccepted) && styles.confirmButtonDisabled]}
          onPress={handlePayment}
          disabled={processing || !selectedMethodId || !termsAccepted}
        >
          {processing ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.confirmButtonText}>
              {t('payment.confirmAndPayAmount', { amount: formatDop(total) })}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Add Card Modal */}
      <AddCardModal
        visible={showAddCardModal}
        onClose={() => setShowAddCardModal(false)}
        onCardAdded={handleCardAdded}
        isDefault={paymentMethods.length === 0}
      />
    </View>
  );
}
