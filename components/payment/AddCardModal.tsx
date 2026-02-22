import { createPaymentMethod, ApiError as PaymentApiError } from '@/services/payments';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { t } from '@/i18n';

// Theme colors matching the JSX design
const colors = {
  bg: '#1a1a2e',
  bgCard: '#252542',
  bgInput: '#2d2d4a',
  primary: '#3b82f6',
  secondary: '#10b981',
  purple: '#8b5cf6',
  textSecondary: '#9ca3af',
  border: '#374151',
  white: '#ffffff',
  danger: '#ef4444',
};

interface AddCardModalProps {
  visible: boolean;
  onClose: () => void;
  onCardAdded: () => void;
  isDefault?: boolean; // Whether to set as default when adding
}

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
const detectCardBrand = (cardNumber: string): 'visa' | 'mastercard' | 'amex' => {
  const cleaned = cardNumber.replace(/\s+/g, '');
  if (cleaned.startsWith('4')) return 'visa';
  if (cleaned.startsWith('5') || cleaned.startsWith('2')) return 'mastercard';
  if (cleaned.startsWith('3')) return 'amex';
  return 'visa'; // Default to visa
};

export function AddCardModal({ visible, onClose, onCardAdded, isDefault = false }: AddCardModalProps) {
  const insets = useSafeAreaInsets();
  const [cardNumber, setCardNumber] = useState('');
  const [expDate, setExpDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleAddCard = async () => {
    // Validate card number
    const cleanedCardNumber = cardNumber.replace(/\s+/g, '');
    if (cleanedCardNumber.length < 13 || cleanedCardNumber.length > 19) {
      Alert.alert(t('common.error'), t('paymentMethods.invalidCardNumber'));
      return;
    }

    if (!validateCardNumber(cleanedCardNumber)) {
      Alert.alert(t('common.error'), t('paymentMethods.invalidCardNumber'));
      return;
    }

    // Validate expiry date
    const [month, year] = expDate.split('/');
    if (!month || !year || month.length !== 2 || year.length !== 2) {
      Alert.alert(t('common.error'), t('paymentMethods.invalidExpiry'));
      return;
    }

    const expMonth = parseInt(month, 10);
    const expYear = parseInt('20' + year, 10);
    const now = new Date();
    if (expMonth < 1 || expMonth > 12 || expYear < now.getFullYear() || 
        (expYear === now.getFullYear() && expMonth < now.getMonth() + 1)) {
      Alert.alert(t('common.error'), t('paymentMethods.invalidExpiry'));
      return;
    }

    // Validate CVV
    if (cvv.length < 3 || cvv.length > 4) {
      Alert.alert(t('common.error'), t('paymentMethods.invalidCVV'));
      return;
    }

    // Validate card holder
    if (!cardHolder.trim()) {
      Alert.alert(t('common.error'), t('paymentMethods.invalidCardHolder'));
      return;
    }

    try {
      setLoading(true);

      const brand = detectCardBrand(cleanedCardNumber);
      const last4 = cleanedCardNumber.slice(-4);
      const expiryMonth = parseInt(month, 10);
      const expiryYear = parseInt('20' + year, 10);

      // Create payment method via API
      await createPaymentMethod({
        type: brand === 'visa' ? 'visa' : brand === 'mastercard' ? 'mastercard' : 'visa',
        last4,
        expiry_month: expiryMonth,
        expiry_year: expiryYear,
        brand: brand === 'visa' ? 'Visa' : brand === 'mastercard' ? 'Mastercard' : 'Visa',
        card_holder_name: cardHolder.trim(),
        is_default: isDefault, // Use the prop to determine if this should be default
      });

      // Reset form
      setCardNumber('');
      setExpDate('');
      setCvv('');
      setCardHolder('');

      Alert.alert(t('common.success'), t('paymentMethods.cardAdded'));
      onCardAdded();
    } catch (error) {
      if (error instanceof PaymentApiError) {
        Alert.alert(t('common.error'), error.message);
      } else {
        Alert.alert(t('common.error'), t('paymentMethods.addCardFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form when closing
    setCardNumber('');
    setExpDate('');
    setCvv('');
    setCardHolder('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleClose}
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
                  value={cardNumber}
                  onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                  keyboardType="numeric"
                  autoComplete="cc-number"
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
                    value={expDate}
                    onChangeText={(text) => setExpDate(formatExpDate(text))}
                    keyboardType="numeric"
                    autoComplete="cc-exp"
                  />
                </View>
                <View style={[styles.inputContainer, styles.inputHalf]}>
                  <Text style={styles.inputLabel}>{t('paymentMethods.cvv')}</Text>
                  <TextInput
                    style={[styles.input, styles.inputCVV]}
                    placeholder="•••"
                    placeholderTextColor={colors.textSecondary}
                    maxLength={4}
                    value={cvv}
                    onChangeText={(text) => setCvv(text.replace(/\D/g, ''))}
                    keyboardType="numeric"
                    secureTextEntry
                    autoComplete="cc-csc"
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
                  value={cardHolder}
                  onChangeText={(text) => setCardHolder(text.toUpperCase())}
                  autoCapitalize="characters"
                  autoComplete="name"
                />
              </View>

              {/* Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  onPress={handleClose}
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
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: colors.white,
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
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    padding: 16,
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    color: colors.white,
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
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonConfirm: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: colors.primary,
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
    color: colors.white,
  },
  modalButtonTextConfirm: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
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
    color: colors.textSecondary,
    fontSize: 11,
  },
});
