import {
  createPayment,
  getPaymentMethods,
  PaymentMethod,
  ApiError as PaymentApiError,
} from '@/services/payments';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@/i18n';
import { AddCardModal } from '@/components/payment/AddCardModal';

// Theme colors matching the JSX design
const colors = {
  bg: '#1a1a2e',
  bgCard: '#252542',
  bgInput: '#2d2d4a',
  primary: '#3b82f6',
  secondary: '#10b981',
  accent: '#f59e0b',
  danger: '#ef4444',
  textSecondary: '#9ca3af',
  border: '#374151',
  white: '#ffffff',
};

export default function PaymentScreen() {
  const router = useRouter();
  const { orderId, totalAmount } = useLocalSearchParams<{ orderId: string; totalAmount?: string }>();
  const insets = useSafeAreaInsets();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddCardModal, setShowAddCardModal] = useState(false);

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

    // Validate orderId is a valid UUID
    if (!orderId || orderId === 'new') {
      Alert.alert(
        t('common.error'),
        'Invalid order ID. Please go back and try again.'
      );
      return;
    }

    try {
      setProcessing(true);
      
      const selectedMethod = paymentMethods.find((m) => m.id === selectedMethodId);
      if (!selectedMethod) {
        throw new Error('Selected payment method not found');
      }

      // Map payment method type to provider
      const providerMap: Record<string, 'card' | 'apple_pay' | 'google_pay'> = {
        visa: 'card',
        mastercard: 'card',
        amex: 'card',
        paypal: 'card',
        apple_pay: 'apple_pay',
        google_pay: 'google_pay',
      };

      const provider = providerMap[selectedMethod.type] || 'card';

      await createPayment({
        order_id: orderId,
        amount: total,
        provider,
        payment_method_id: selectedMethodId,
      });

      router.push(`/booking/success/${orderId}`);
    } catch (err) {
      if (err instanceof PaymentApiError) {
        Alert.alert(t('common.error'), err.message);
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

  const getCardIcon = (type: string) => {
    switch (type) {
      case 'visa':
        return '💳';
      case 'mastercard':
        return '💳';
      case 'amex':
        return '💳';
      case 'paypal':
        return '🅿️';
      default:
        return '💳';
    }
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
      <View style={[styles.container, { paddingTop: insets.top }]}>
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
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('payment.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Total Amount */}
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>{t('payment.totalToPay')}</Text>
          <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
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
                    <Text style={styles.cardIcon}>{getCardIcon(method.type)}</Text>
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
      </ScrollView>

      {/* Confirm Button */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity
          style={[styles.confirmButton, processing && styles.confirmButtonDisabled]}
          onPress={handlePayment}
          disabled={processing || !selectedMethodId}
        >
          {processing ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.confirmButtonText}>
              {t('payment.confirmAndPay', { amount: total.toFixed(2) })}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.white,
  },
  content: {
    flex: 1,
  },
  totalContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  totalLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 42,
    fontWeight: '700',
    color: colors.white,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 16,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentMethodCardSelected: {
    backgroundColor: `${colors.primary}20`,
    borderColor: colors.primary,
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: colors.bgInput,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardIcon: {
    fontSize: 24,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 4,
  },
  paymentMethodSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  checkmarkContainer: {
    marginLeft: 12,
  },
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
  securityText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: colors.bg,
  },
  confirmButton: {
    backgroundColor: colors.secondary,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
