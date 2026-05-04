import { Toast } from '@/components/Toast';
import { AddCardModal } from '@/components/payment/AddCardModal';
import { CardBrandMark } from '@/components/payment/CardBrandMark';
import { useThemeColors } from '@/hooks/useThemeColors';
import { t } from '@/i18n';
import {
  deletePaymentMethod,
  getPaymentMethods,
  setDefaultPaymentMethod,
  type PaymentMethod as ApiPaymentMethod,
} from '@/services/payments';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ThemeColors } from '@/utils/themeStyles';
import { paymentMethodTypeToMarkVariant } from '@/utils/cardNetwork';

const SECONDARY_GREEN = '#10b981';
const DANGER_RED = '#ef4444';

function createPaymentMethodsStyles(theme: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.screenBackground,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 20,
      gap: 16,
      backgroundColor: theme.screenBackground,
    },
    backButton: {
      padding: 4,
    },
    backArrow: {
      fontSize: 24,
      color: theme.textPrimary,
    },
    title: {
      flex: 1,
      fontSize: 20,
      fontWeight: '600',
      color: theme.textPrimary,
    },
    placeholder: {
      width: 32,
    },
    content: {
      flex: 1,
      backgroundColor: theme.screenBackground,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.screenBackground,
    },
    securityBadge: {
      marginHorizontal: 20,
      marginBottom: 20,
      padding: 14,
      paddingHorizontal: 16,
      backgroundColor: `${SECONDARY_GREEN}18`,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: `${SECONDARY_GREEN}40`,
    },
    shieldIcon: {
      fontSize: 20,
    },
    securityBadgeContent: {
      flex: 1,
    },
    securityBadgeTitle: {
      color: SECONDARY_GREEN,
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 2,
    },
    securityBadgeText: {
      color: theme.textSecondary,
      fontSize: 11,
    },
    sectionTitleContainer: {
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    sectionTitle: {
      color: theme.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    paymentMethodsContainer: {
      paddingHorizontal: 20,
    },
    cardItem: {
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.cardBorder,
    },
    cardItemSelected: {
      borderWidth: 2,
      borderColor: theme.primary,
    },
    cardIconContainer: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 3,
    },
    cardInfo: {
      flex: 1,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    cardNumber: {
      color: theme.textPrimary,
      fontSize: 15,
      fontWeight: '600',
    },
    cardDetails: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    cardExpiry: {
      color: theme.textSecondary,
      fontSize: 13,
    },
    defaultBadge: {
      backgroundColor: `${SECONDARY_GREEN}25`,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    defaultBadgeText: {
      color: SECONDARY_GREEN,
      fontSize: 10,
      fontWeight: '600',
    },
    chevron: {
      color: theme.textSecondary,
      fontSize: 18,
    },
    chevronRotated: {
      transform: [{ rotate: '90deg' }],
    },
    expandedActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: -8,
      marginBottom: 16,
      paddingHorizontal: 4,
    },
    actionButtonPrimary: {
      flex: 1,
      padding: 12,
      backgroundColor: `${theme.primary}22`,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    actionButtonDanger: {
      flex: 1,
      padding: 12,
      backgroundColor: `${DANGER_RED}22`,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    actionButtonTextPrimary: {
      color: theme.primary,
      fontSize: 13,
      fontWeight: '600',
    },
    actionButtonTextDanger: {
      color: DANGER_RED,
      fontSize: 13,
      fontWeight: '600',
    },
    addCardButton: {
      backgroundColor: 'transparent',
      borderRadius: 14,
      padding: 20,
      paddingHorizontal: 16,
      marginBottom: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: theme.border,
    },
    addCardIcon: {
      width: 56,
      height: 40,
      backgroundColor: theme.surfaceSecondary,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addCardIconText: {
      color: theme.primary,
      fontSize: 24,
      fontWeight: '300',
    },
    addCardInfo: {
      flex: 1,
    },
    addCardTitle: {
      color: theme.primary,
      fontSize: 15,
      fontWeight: '600',
      marginBottom: 2,
    },
    addCardSubtitle: {
      color: theme.textSecondary,
      fontSize: 12,
    },
    acceptedSection: {
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      marginTop: 10,
    },
    acceptedTitle: {
      color: theme.textSecondary,
      fontSize: 12,
      marginBottom: 12,
      textAlign: 'center',
    },
    acceptedCards: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 12,
      flexWrap: 'wrap',
    },
    acceptedCard: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: theme.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.cardBorder,
    },
    acceptedCardText: {
      color: theme.textSecondary,
      fontSize: 11,
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    deleteModalContent: {
      width: '100%',
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      margin: 20,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.cardBorder,
    },
    deleteIconContainer: {
      width: 60,
      height: 60,
      backgroundColor: `${DANGER_RED}22`,
      borderRadius: 30,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    deleteIcon: {
      fontSize: 28,
    },
    deleteModalTitle: {
      color: theme.textPrimary,
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 8,
      textAlign: 'center',
    },
    deleteModalText: {
      color: theme.textSecondary,
      fontSize: 14,
      marginBottom: 24,
      textAlign: 'center',
      lineHeight: 20,
    },
    deleteModalButtons: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    modalButtonCancel: {
      flex: 1,
      padding: 18,
      backgroundColor: theme.surfaceSecondary,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalButtonTextCancel: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.textPrimary,
    },
    modalButtonDelete: {
      flex: 1,
      padding: 16,
      backgroundColor: DANGER_RED,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalButtonTextDelete: {
      fontSize: 15,
      fontWeight: '700',
      color: '#ffffff',
    },
  });
}

interface PaymentMethod {
  id: string;
  type: string;
  last4?: string;
  expiry?: string;
  email?: string;
  isDefault: boolean;
}

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  const styles = useMemo(() => createPaymentMethodsStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

  // Map API payment method to UI format
  const mapApiToUi = (apiMethod: ApiPaymentMethod): PaymentMethod => {
    const expiry = apiMethod.expiry_month && apiMethod.expiry_year
      ? `${String(apiMethod.expiry_month).padStart(2, '0')}/${String(apiMethod.expiry_year).slice(-2)}`
      : undefined;

    return {
      id: apiMethod.id,
      type: apiMethod.type,
      last4: apiMethod.last4,
      expiry,
      email: apiMethod.email,
      isDefault: apiMethod.is_default,
    };
  };

  // Load payment methods from API
  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoadingMethods(true);
      const apiMethods = await getPaymentMethods();
      const uiMethods = apiMethods.map(mapApiToUi);
      setPaymentMethods(uiMethods);
    } catch (error: any) {
      console.error('[PaymentMethods] Failed to load payment methods:', error);
      setToastMessage(error?.message || t('errors.requestFailed'));
      setToastType('error');
      setToastVisible(true);
    } finally {
      setLoadingMethods(false);
    }
  };


  const handleSetDefault = async (id: string) => {
    try {
      setLoading(true);
      await setDefaultPaymentMethod(id);
      await loadPaymentMethods(); // Reload to get updated data
      setSelectedCardId(null);
      setToastMessage(t('paymentMethods.setAsDefault'));
      setToastType('success');
      setToastVisible(true);
    } catch (error: any) {
      console.error('[PaymentMethods] Failed to set default:', error);
      setToastMessage(error?.message || t('errors.requestFailed'));
      setToastType('error');
      setToastVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      await deletePaymentMethod(id);
      await loadPaymentMethods(); // Reload to get updated data
      setShowDeleteConfirm(null);
      setSelectedCardId(null);
      setToastMessage(t('paymentMethods.deleted'));
      setToastType('success');
      setToastVisible(true);
    } catch (error: any) {
      console.error('[PaymentMethods] Failed to delete:', error);
      setToastMessage(error?.message || t('errors.requestFailed'));
      setToastType('error');
      setToastVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCardAdded = () => {
    setShowAddCard(false);
    loadPaymentMethods();
    setToastMessage(t('paymentMethods.cardAdded'));
    setToastType('success');
    setToastVisible(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('paymentMethods.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      {loadingMethods ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Security Badge */}
          <View style={styles.securityBadge}>
          <Text style={styles.shieldIcon}>🛡️</Text>
          <View style={styles.securityBadgeContent}>
            <Text style={styles.securityBadgeTitle}>{t('paymentMethods.securePayments')}</Text>
            <Text style={styles.securityBadgeText}>{t('paymentMethods.encryptedInfo')}</Text>
          </View>
        </View>

        {/* Section Title */}
        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitle}>{t('paymentMethods.savedCards')}</Text>
        </View>

        {/* Payment Methods List */}
        <View style={styles.paymentMethodsContainer}>
          {paymentMethods.map((method) => (
            <View key={method.id}>
              {/* Card Item */}
              <TouchableOpacity
                onPress={() => setSelectedCardId(selectedCardId === method.id ? null : method.id)}
                style={[styles.cardItem, selectedCardId === method.id && styles.cardItemSelected]}
                activeOpacity={0.7}
              >
                <View style={styles.cardIconContainer}>
                  <CardBrandMark variant={paymentMethodTypeToMarkVariant(method.type)} width={78} />
                </View>
                <View style={styles.cardInfo}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardNumber}>
                      {method.last4 ? `•••• •••• •••• ${method.last4}` : method.email}
                    </Text>
                  </View>
                  <View style={styles.cardDetails}>
                    {method.expiry && (
                      <Text style={styles.cardExpiry}>
                        {t('paymentMethods.expires')} {method.expiry}
                      </Text>
                    )}
                    {method.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>{t('paymentMethods.default')}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text style={[styles.chevron, selectedCardId === method.id && styles.chevronRotated]}>›</Text>
              </TouchableOpacity>

              {/* Expanded Actions */}
              {selectedCardId === method.id && (
                <View style={styles.expandedActions}>
                  {!method.isDefault && (
                    <TouchableOpacity
                      onPress={() => handleSetDefault(method.id)}
                      style={styles.actionButtonPrimary}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.actionButtonTextPrimary}>✓ {t('paymentMethods.setAsDefault')}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => setShowDeleteConfirm(method.id)}
                    style={styles.actionButtonDanger}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.actionButtonTextDanger}>🗑️ {t('paymentMethods.delete')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}

          {/* Add New Card Button */}
          <TouchableOpacity onPress={() => setShowAddCard(true)} style={styles.addCardButton} activeOpacity={0.7}>
            <View style={styles.addCardIcon}>
              <Text style={styles.addCardIconText}>+</Text>
            </View>
            <View style={styles.addCardInfo}>
              <Text style={styles.addCardTitle}>{t('paymentMethods.addNewCard')}</Text>
              <Text style={styles.addCardSubtitle}>{t('paymentMethods.creditOrDebit')}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Accepted Cards */}
        <View style={styles.acceptedSection}>
          <Text style={styles.acceptedTitle}>{t('paymentMethods.accepted')}</Text>
          <View style={styles.acceptedCards}>
            {['Visa', 'Mastercard', 'PayPal', 'Amex'].map((brand) => (
              <View key={brand} style={styles.acceptedCard}>
                <Text style={styles.acceptedCardText}>{brand}</Text>
              </View>
            ))}
          </View>
        </View>
        </ScrollView>
      )}

      {/* Add Card Modal */}
      <AddCardModal
        visible={showAddCard}
        onClose={() => setShowAddCard(false)}
        onCardAdded={handleCardAdded}
        isDefault={paymentMethods.length === 0}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteIconContainer}>
              <Text style={styles.deleteIcon}>🗑️</Text>
            </View>
            <Text style={styles.deleteModalTitle}>{t('paymentMethods.deleteCard')}</Text>
            <Text style={styles.deleteModalText}>{t('paymentMethods.deleteConfirm')}</Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                onPress={() => setShowDeleteConfirm(null)}
                style={styles.modalButtonCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonTextCancel}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
                style={styles.modalButtonDelete}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonTextDelete}>{t('paymentMethods.delete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast */}
      <Toast
        message={toastMessage}
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
        type={toastType}
        duration={toastType === 'error' ? 4000 : 3000}
      />
    </SafeAreaView>
  );
}

