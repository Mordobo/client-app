import { Toast } from '@/components/Toast';
import { useTheme } from '@/contexts/ThemeContext';
import { t } from '@/i18n';
import {
  createPaymentMethod,
  deletePaymentMethod,
  getPaymentMethods,
  setDefaultPaymentMethod,
  type PaymentMethod as ApiPaymentMethod,
} from '@/services/payments';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

interface PaymentMethod {
  id: string;
  type: 'visa' | 'mastercard' | 'paypal';
  last4?: string;
  expiry?: string;
  email?: string;
  isDefault: boolean;
}

// Theme colors from preview (dark mode)
const darkColors = {
  bg: '#1a1a2e',
  bgCard: '#252542',
  bgInput: '#2d2d4a',
  primary: '#3b82f6',
  secondary: '#10b981',
  accent: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  textPrimary: '#ffffff',
  textSecondary: '#9ca3af',
  border: '#374151',
};

// Luhn algorithm for card validation
const validateCardNumber = (cardNumber: string): boolean => {
  const cleaned = cardNumber.replace(/\s+/g, '');
  if (cleaned.length < 13 || cleaned.length > 19) return false;
  
  let sum = 0;
  let isEven = false;
  
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
};

// Detect card brand from number
const detectCardBrand = (cardNumber: string): 'visa' | 'mastercard' | 'amex' | 'unknown' => {
  const cleaned = cardNumber.replace(/\s+/g, '');
  if (cleaned.startsWith('4')) return 'visa';
  if (cleaned.startsWith('5') || cleaned.startsWith('2')) return 'mastercard';
  if (cleaned.startsWith('3')) return 'amex';
  return 'unknown';
};

// Card Icon Component with gradients
const CardIcon: React.FC<{ type: 'visa' | 'mastercard' | 'paypal' }> = ({ type }) => {
  const getGradientColors = () => {
    switch (type) {
      case 'visa':
        return ['#1A1F71', '#3b5998'];
      case 'mastercard':
        return ['#EB001B', '#F79E1B'];
      case 'paypal':
        return ['#003087', '#009cde'];
      default:
        return ['#374151', '#4B5563'];
    }
  };

  const getText = () => {
    switch (type) {
      case 'visa':
        return 'VISA';
      case 'mastercard':
        return 'MC';
      case 'paypal':
        return 'PP';
      default:
        return '';
    }
  };

  return (
    <View style={styles.cardIconContainer}>
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardIcon}
      >
        <Text style={styles.cardIconText}>{getText()}</Text>
      </LinearGradient>
    </View>
  );
};

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const { colorScheme } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  // Use dark colors for now to match preview exactly
  const colors = darkColors;

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
      type: apiMethod.type as 'visa' | 'mastercard' | 'paypal',
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

  const [newCard, setNewCard] = useState({
    cardNumber: '',
    expDate: '',
    cvv: '',
    cardHolder: '',
  });

  const formatCardNumber = (value: string): string => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts: string[] = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : value;
  };

  const formatExpDate = (value: string): string => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
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

  const handleAddCard = async () => {
    // Validate card number
    const cleanedCardNumber = newCard.cardNumber.replace(/\s+/g, '');
    if (cleanedCardNumber.length < 13 || cleanedCardNumber.length > 19) {
      setToastMessage(t('paymentMethods.invalidCardNumber'));
      setToastType('error');
      setToastVisible(true);
      return;
    }

    if (!validateCardNumber(cleanedCardNumber)) {
      setToastMessage(t('paymentMethods.invalidCardNumber'));
      setToastType('error');
      setToastVisible(true);
      return;
    }

    // Validate expiry date
    const [month, year] = newCard.expDate.split('/');
    if (!month || !year || month.length !== 2 || year.length !== 2) {
      setToastMessage(t('paymentMethods.invalidExpiry'));
      setToastType('error');
      setToastVisible(true);
      return;
    }

    const expMonth = parseInt(month, 10);
    const expYear = parseInt('20' + year, 10);
    const now = new Date();
    if (expMonth < 1 || expMonth > 12 || expYear < now.getFullYear() || 
        (expYear === now.getFullYear() && expMonth < now.getMonth() + 1)) {
      setToastMessage(t('paymentMethods.invalidExpiry'));
      setToastType('error');
      setToastVisible(true);
      return;
    }

    // Validate CVV
    if (newCard.cvv.length < 3 || newCard.cvv.length > 4) {
      setToastMessage(t('paymentMethods.invalidCVV'));
      setToastType('error');
      setToastVisible(true);
      return;
    }

    // Validate card holder
    if (!newCard.cardHolder.trim()) {
      setToastMessage(t('paymentMethods.invalidCardHolder'));
      setToastType('error');
      setToastVisible(true);
      return;
    }

    try {
      setLoading(true);

      const brand = detectCardBrand(cleanedCardNumber);
      const last4 = cleanedCardNumber.slice(-4);
      const [month, year] = newCard.expDate.split('/');
      const expiryMonth = parseInt(month, 10);
      const expiryYear = parseInt('20' + year, 10);

      // Create payment method via API
      await createPaymentMethod({
        type: brand === 'visa' ? 'visa' : brand === 'mastercard' ? 'mastercard' : 'visa',
        last4,
        expiry_month: expiryMonth,
        expiry_year: expiryYear,
        brand: brand === 'visa' ? 'Visa' : brand === 'mastercard' ? 'Mastercard' : 'Visa',
        card_holder_name: newCard.cardHolder,
        is_default: paymentMethods.length === 0,
      });

      // Reload payment methods
      await loadPaymentMethods();
      
      setShowAddCard(false);
      setNewCard({ cardNumber: '', expDate: '', cvv: '', cardHolder: '' });
      setToastMessage(t('paymentMethods.cardAdded'));
      setToastType('success');
      setToastVisible(true);
    } catch (error: any) {
      console.error('[PaymentMethods] Failed to add card:', error);
      const errorMessage = error?.data?.message || error?.message || t('paymentMethods.addCardFailed');
      setToastMessage(errorMessage);
      setToastType('error');
      setToastVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 20, 50) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('paymentMethods.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      {loadingMethods ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
                style={[
                  styles.cardItem,
                  selectedCardId === method.id && styles.cardItemSelected,
                ]}
                activeOpacity={0.7}
              >
                <CardIcon type={method.type} />
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
                <Text
                  style={[
                    styles.chevron,
                    selectedCardId === method.id && styles.chevronRotated,
                  ]}
                >
                  ›
                </Text>
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
          <TouchableOpacity
            onPress={() => setShowAddCard(true)}
            style={styles.addCardButton}
            activeOpacity={0.7}
          >
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
      <Modal
        visible={showAddCard}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddCard(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowAddCard(false)}
          >
            <View style={styles.modalContent}>
              <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                {/* Handle */}
                <View style={styles.modalHandle} />

                <Text style={styles.modalTitle}>{t('paymentMethods.addCard')}</Text>

                {/* Card Number */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{t('paymentMethods.cardNumber')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1234 5678 9012 3456"
                    placeholderTextColor={colors.textSecondary}
                    maxLength={19}
                    value={newCard.cardNumber}
                    onChangeText={(text) =>
                      setNewCard(prev => ({ ...prev, cardNumber: formatCardNumber(text) }))
                    }
                    keyboardType="numeric"
                  />
                </View>

                {/* Row: Expiry & CVV */}
                <View style={styles.inputRow}>
                  <View style={[styles.inputContainer, styles.inputHalf]}>
                    <Text style={styles.inputLabel}>{t('paymentMethods.expiryDate')}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="MM/YY"
                      placeholderTextColor={colors.textSecondary}
                      maxLength={5}
                      value={newCard.expDate}
                      onChangeText={(text) =>
                        setNewCard(prev => ({ ...prev, expDate: formatExpDate(text) }))
                      }
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={[styles.inputContainer, styles.inputHalf]}>
                    <Text style={styles.inputLabel}>{t('paymentMethods.cvv')}</Text>
                    <TextInput
                      style={[styles.input, styles.inputCVV]}
                      placeholder="•••"
                      placeholderTextColor={colors.textSecondary}
                      maxLength={4}
                      value={newCard.cvv}
                      onChangeText={(text) =>
                        setNewCard(prev => ({ ...prev, cvv: text.replace(/\D/g, '') }))
                      }
                      keyboardType="numeric"
                      secureTextEntry
                    />
                  </View>
                </View>

                {/* Card Holder */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{t('paymentMethods.cardHolder')}</Text>
                  <TextInput
                    style={[styles.input, styles.inputCardHolder]}
                    placeholder={t('paymentMethods.cardHolderPlaceholder')}
                    placeholderTextColor={colors.textSecondary}
                    value={newCard.cardHolder}
                    onChangeText={(text) =>
                      setNewCard(prev => ({ ...prev, cardHolder: text.toUpperCase() }))
                    }
                    autoCapitalize="characters"
                  />
                </View>

                {/* Buttons */}
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    onPress={() => {
                      setShowAddCard(false);
                      setNewCard({ cardNumber: '', expDate: '', cvv: '', cardHolder: '' });
                    }}
                    style={styles.modalButtonCancel}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalButtonTextCancel}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  {loading ? (
                    <View style={styles.modalButtonConfirm}>
                      <ActivityIndicator color="#FFFFFF" />
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={handleAddCard}
                      style={styles.modalButtonConfirm}
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={[colors.primary, colors.purple]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.modalButtonGradient}
                      >
                        <Text style={styles.modalButtonTextConfirm}>{t('paymentMethods.add')}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Security Note */}
                <View style={styles.securityNote}>
                  <Text style={styles.lockIcon}>🔒</Text>
                  <Text style={styles.securityNoteText}>{t('paymentMethods.sslEncryption')}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  backButton: {
    padding: 4,
  },
  backArrow: {
    color: '#ffffff',
    fontSize: 24,
  },
  title: {
    flex: 1,
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  securityBadge: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 14,
    paddingHorizontal: 16,
    backgroundColor: '#10b98115',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#10b98130',
  },
  shieldIcon: {
    fontSize: 20,
  },
  securityBadgeContent: {
    flex: 1,
  },
  securityBadgeTitle: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  securityBadgeText: {
    color: '#9ca3af',
    fontSize: 11,
  },
  sectionTitleContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  paymentMethodsContainer: {
    paddingHorizontal: 20,
  },
  cardItem: {
    backgroundColor: '#252542',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardItemSelected: {
    borderColor: '#3b82f6',
  },
  cardIconContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  cardIcon: {
    width: 56,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  cardDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardExpiry: {
    color: '#9ca3af',
    fontSize: 13,
  },
  defaultBadge: {
    backgroundColor: '#10b98120',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '600',
  },
  chevron: {
    color: '#9ca3af',
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
    backgroundColor: '#3b82f620',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionButtonDanger: {
    flex: 1,
    padding: 12,
    backgroundColor: '#ef444420',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionButtonTextPrimary: {
    color: '#3b82f6',
    fontSize: 13,
    fontWeight: '600',
  },
  actionButtonTextDanger: {
    color: '#ef4444',
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
    borderColor: '#374151',
  },
  addCardIcon: {
    width: 56,
    height: 40,
    backgroundColor: '#2d2d4a',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCardIconText: {
    color: '#3b82f6',
    fontSize: 24,
    fontWeight: '300',
  },
  addCardInfo: {
    flex: 1,
  },
  addCardTitle: {
    color: '#3b82f6',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  addCardSubtitle: {
    color: '#9ca3af',
    fontSize: 12,
  },
  acceptedSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    marginTop: 10,
  },
  acceptedTitle: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'center',
  },
  acceptedCards: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  acceptedCard: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#252542',
    borderRadius: 8,
  },
  acceptedCardText: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#374151',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inputHalf: {
    flex: 1,
  },
  inputLabel: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    padding: 16,
    backgroundColor: '#2d2d4a',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    color: '#ffffff',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 2,
  },
  inputCVV: {
    letterSpacing: 4,
  },
  inputCardHolder: {
    fontFamily: 'system',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButtonCancel: {
    flex: 1,
    padding: 18,
    backgroundColor: '#252542',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonConfirm: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  modalButtonGradient: {
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalButtonTextConfirm: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  lockIcon: {
    fontSize: 14,
  },
  securityNoteText: {
    color: '#9ca3af',
    fontSize: 11,
  },
  deleteModalContent: {
    width: '100%',
    backgroundColor: '#252542',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    margin: 20,
  },
  deleteIconContainer: {
    width: 60,
    height: 60,
    backgroundColor: '#ef444420',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  deleteIcon: {
    fontSize: 28,
  },
  deleteModalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  deleteModalText: {
    color: '#9ca3af',
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
  modalButtonDelete: {
    flex: 1,
    padding: 16,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonTextDelete: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

