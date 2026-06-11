import { CardBrandMark } from '@/components/payment/CardBrandMark';
import { useThemeColors } from '@/hooks/useThemeColors';
import { createPaymentMethod, ApiError as PaymentApiError } from '@/services/payments';
import type { ThemeColors } from '@/utils/themeStyles';
import {
  detectCardNetwork,
  formatPanInput,
  getCvvLengthForNetwork,
  getFormattedPanMaxLength,
  getMaxPanDigits,
  mapCardNetworkToApiType,
} from '@/utils/cardNetwork';
import { validateCardNumber as validatePanLuhn, validateCVV } from '@/utils/cardValidation';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@/i18n';

const TEXT_ON_PRIMARY = '#ffffff';

function createAddCardModalStyles(theme: ThemeColors) {
  return StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      width: '100%',
      backgroundColor: theme.screenBackground,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    modalHandle: {
      width: 40,
      height: 4,
      backgroundColor: theme.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      color: theme.textPrimary,
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
      color: theme.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 8,
    },
    input: {
      width: '100%',
      padding: 16,
      backgroundColor: theme.surfaceSecondary,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      color: theme.textPrimary,
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
      backgroundColor: theme.card,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.cardBorder,
    },
    modalButtonConfirm: {
      flex: 1,
      borderRadius: 14,
      overflow: 'hidden',
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 15,
      elevation: 8,
    },
    modalButtonConfirmLoading: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 18,
      backgroundColor: theme.primary,
    },
    modalButtonGradient: {
      padding: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalButtonTextCancel: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.textPrimary,
    },
    modalButtonTextConfirm: {
      fontSize: 16,
      fontWeight: '700',
      color: TEXT_ON_PRIMARY,
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
      color: theme.textSecondary,
      fontSize: 11,
    },
    cardNumberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    cardNumberInputWrap: {
      flex: 1,
      minWidth: 0,
    },
  });
}

interface AddCardModalProps {
  visible: boolean;
  onClose: () => void;
  onCardAdded: () => void;
  isDefault?: boolean;
}

export function AddCardModal({ visible, onClose, onCardAdded, isDefault = false }: AddCardModalProps) {
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const styles = useMemo(() => createAddCardModalStyles(theme), [theme]);
  const confirmGradient = useMemo(() => [theme.primary, '#6d28d9'] as const, [theme.primary]);

  const [cardNumber, setCardNumber] = useState('');
  const [expDate, setExpDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [loading, setLoading] = useState(false);

  const panDigits = useMemo(() => cardNumber.replace(/\D/g, ''), [cardNumber]);
  const network = useMemo(() => detectCardNetwork(panDigits), [panDigits]);
  const formattedPanMaxLen = useMemo(() => getFormattedPanMaxLength(network), [network]);
  const cvvMaxLen = useMemo(() => getCvvLengthForNetwork(network === 'unknown' ? 'visa' : network), [network]);

  const handleCardNumberChange = useCallback((text: string) => {
    const rawDigits = text.replace(/\D/g, '');
    const net = detectCardNetwork(rawDigits);
    const maxDigits = getMaxPanDigits(net);
    const clipped = rawDigits.slice(0, maxDigits);
    setCardNumber(formatPanInput('', clipped));
  }, []);

  const formatExpDate = (value: string): string => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const handleAddCard = async () => {
    const cleanedCardNumber = panDigits;
    if (cleanedCardNumber.length < 13 || cleanedCardNumber.length > 19) {
      Alert.alert(t('common.error'), t('paymentMethods.invalidCardNumber'));
      return;
    }

    const luhn = validatePanLuhn(cleanedCardNumber);
    if (!luhn.isValid) {
      Alert.alert(t('common.error'), t('paymentMethods.invalidCardNumber'));
      return;
    }

    const [month, year] = expDate.split('/');
    if (!month || !year || month.length !== 2 || year.length !== 2) {
      Alert.alert(t('common.error'), t('paymentMethods.invalidExpiry'));
      return;
    }

    const expMonth = parseInt(month, 10);
    const expYear = parseInt('20' + year, 10);
    const now = new Date();
    if (
      expMonth < 1 ||
      expMonth > 12 ||
      expYear < now.getFullYear() ||
      (expYear === now.getFullYear() && expMonth < now.getMonth() + 1)
    ) {
      Alert.alert(t('common.error'), t('paymentMethods.invalidExpiry'));
      return;
    }

    const detected = detectCardNetwork(cleanedCardNumber);
    const cvvCheck = validateCVV(cvv, detected === 'unknown' ? 'visa' : detected);
    if (!cvvCheck.isValid) {
      Alert.alert(t('common.error'), t('paymentMethods.invalidCVV'));
      return;
    }

    if (!cardHolder.trim()) {
      Alert.alert(t('common.error'), t('paymentMethods.invalidCardHolder'));
      return;
    }

    try {
      setLoading(true);

      const apiType = mapCardNetworkToApiType(detected);
      const last4 = cleanedCardNumber.slice(-4);
      const expiryMonth = parseInt(month, 10);
      const expiryYear = parseInt('20' + year, 10);
      const brandLabel =
        detected === 'unknown'
          ? t('payment.cardNetworks.other_card')
          : t(`payment.cardNetworks.${detected}`);

      await createPaymentMethod({
        type: apiType,
        last4,
        expiry_month: expiryMonth,
        expiry_year: expiryYear,
        brand: brandLabel,
        card_holder_name: cardHolder.trim(),
        is_default: isDefault,
      });

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
    setCardNumber('');
    setExpDate('');
    setCvv('');
    setCardHolder('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleClose}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 24 }]}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHandle} />

              <Text style={styles.modalTitle}>{t('paymentMethods.addCard')}</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t('paymentMethods.cardNumber')}</Text>
                <View style={styles.cardNumberRow}>
                  <CardBrandMark variant={network === 'unknown' ? 'other_card' : network} width={54} />
                  <View style={styles.cardNumberInputWrap}>
                    <TextInput
                      style={styles.input}
                      placeholder="1234 5678 9012 3456"
                      placeholderTextColor={theme.textSecondary}
                      maxLength={formattedPanMaxLen}
                      value={cardNumber}
                      onChangeText={handleCardNumberChange}
                      keyboardType="numeric"
                      autoComplete="cc-number"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputContainer, styles.inputHalf]}>
                  <Text style={styles.inputLabel}>{t('paymentMethods.expiryDate')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="MM/YY"
                    placeholderTextColor={theme.textSecondary}
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
                    placeholder={cvvMaxLen === 4 ? '••••' : '•••'}
                    placeholderTextColor={theme.textSecondary}
                    maxLength={cvvMaxLen}
                    value={cvv}
                    onChangeText={(text) => setCvv(text.replace(/\D/g, '').slice(0, cvvMaxLen))}
                    keyboardType="numeric"
                    secureTextEntry
                    autoComplete="cc-csc"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t('paymentMethods.cardHolder')}</Text>
                <TextInput
                  style={[styles.input, styles.inputCardHolder]}
                  placeholder={t('paymentMethods.cardHolderPlaceholder')}
                  placeholderTextColor={theme.textSecondary}
                  value={cardHolder}
                  onChangeText={(text) => setCardHolder(text.toUpperCase())}
                  autoCapitalize="characters"
                  autoComplete="name"
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity onPress={handleClose} style={styles.modalButtonCancel} activeOpacity={0.7}>
                  <Text style={styles.modalButtonTextCancel}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                {loading ? (
                  <View style={[styles.modalButtonConfirm, styles.modalButtonConfirmLoading]}>
                    <ActivityIndicator color={TEXT_ON_PRIMARY} />
                  </View>
                ) : (
                  <TouchableOpacity onPress={handleAddCard} style={styles.modalButtonConfirm} activeOpacity={0.7}>
                    <LinearGradient
                      colors={confirmGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.modalButtonGradient}
                    >
                      <Text style={styles.modalButtonTextConfirm}>{t('paymentMethods.add')}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>

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
