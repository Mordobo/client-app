import { Toast } from '@/components/Toast';
import { useThemeColors } from '@/hooks/useThemeColors';
import { t } from '@/i18n';
import {
  createAddress,
  deleteAddress,
  getAddresses,
  setDefaultAddress,
  updateAddress,
  type Address as ApiAddress,
} from '@/services/addresses';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface Address {
  id: string;
  name: string;
  type: 'home' | 'office' | 'other';
  fullAddress: string;
  isDefault: boolean;
}

// Get icon emoji by address type
const getAddressIcon = (type: 'home' | 'office' | 'other'): string => {
  switch (type) {
    case 'home':
      return '🏠';
    case 'office':
      return '🏢';
    case 'other':
      return '🏡';
    default:
      return '📍';
  }
};

// Format full address from API address
const formatFullAddress = (address: ApiAddress): string => {
  const parts: string[] = [];
  if (address.address_line1) parts.push(address.address_line1);
  if (address.address_line2) parts.push(address.address_line2);
  if (address.city) parts.push(address.city);
  if (address.state) parts.push(address.state);
  if (address.postal_code) parts.push(address.postal_code);
  return parts.join(', ');
};

// Map API address to UI format
const mapApiToUi = (apiAddress: ApiAddress): Address => {
  return {
    id: apiAddress.id,
    name: apiAddress.name,
    type: apiAddress.type,
    fullAddress: formatFullAddress(apiAddress),
    isDefault: apiAddress.is_default,
  };
};

const ADDRESS_MODAL_OVERLAY = 'rgba(0,0,0,0.65)' as const;

export default function MyAddressesScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = Dimensions.get('screen');

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [apiAddresses, setApiAddresses] = useState<ApiAddress[]>([]); // Store full API data
  const [loading, setLoading] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

  const [formData, setFormData] = useState({
    name: '',
    type: 'home' as 'home' | 'office' | 'other',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'DO', // Default to Dominican Republic
    is_default: false,
  });

  const modalScrollRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // Load addresses from API
  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      setLoadingAddresses(true);
      const apiAddressesData = await getAddresses();
      const uiAddresses = apiAddressesData.map(mapApiToUi);
      setApiAddresses(apiAddressesData); // Store full API data
      setAddresses(uiAddresses);
    } catch (error: any) {
      console.error('[MyAddresses] Failed to load addresses:', error);
      setToastMessage(error?.message || t('errors.requestFailed'));
      setToastType('error');
      setToastVisible(true);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      setLoading(true);
      await setDefaultAddress(id);
      await loadAddresses(); // Reload to get updated data
      setToastMessage(t('addresses.setAsDefault'));
      setToastType('success');
      setToastVisible(true);
    } catch (error: any) {
      console.error('[MyAddresses] Failed to set default:', error);
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
      await deleteAddress(id);
      await loadAddresses(); // Reload to get updated data
      setShowDeleteConfirm(null);
      setToastMessage(t('addresses.deleted'));
      setToastType('success');
      setToastVisible(true);
    } catch (error: any) {
      console.error('[MyAddresses] Failed to delete:', error);
      setToastMessage(error?.message || t('errors.requestFailed'));
      setToastType('error');
      setToastVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (address: Address) => {
    // Find the full API address from stored data
    const fullAddress = apiAddresses.find((a) => a.id === address.id);
    if (fullAddress) {
      setFormData({
        name: fullAddress.name,
        type: fullAddress.type,
        address_line1: fullAddress.address_line1,
        address_line2: fullAddress.address_line2 || '',
        city: fullAddress.city,
        state: fullAddress.state || '',
        postal_code: fullAddress.postal_code || '',
        country: fullAddress.country,
        is_default: fullAddress.is_default,
      });
      setEditingAddress(address);
      setShowAddEditModal(true);
    }
  };

  const handleAddNew = () => {
    setFormData({
      name: '',
      type: 'home',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'DO',
      is_default: addresses.length === 0, // First address is default
    });
    setEditingAddress(null);
    setShowAddEditModal(true);
  };

  const handleSaveAddress = async () => {
    // Validate required fields
    if (!formData.name.trim()) {
      setToastMessage(t('addresses.nameRequired'));
      setToastType('error');
      setToastVisible(true);
      return;
    }

    if (!formData.address_line1.trim()) {
      setToastMessage(t('addresses.addressRequired'));
      setToastType('error');
      setToastVisible(true);
      return;
    }

    if (!formData.city.trim()) {
      setToastMessage(t('addresses.cityRequired'));
      setToastType('error');
      setToastVisible(true);
      return;
    }

    try {
      setLoading(true);

      if (editingAddress) {
        // Update existing address
        await updateAddress({
          id: editingAddress.id,
          ...formData,
        });
        setToastMessage(t('addresses.updated'));
      } else {
        // Create new address
        await createAddress(formData);
        setToastMessage(t('addresses.created'));
      }

      // Reload addresses
      await loadAddresses();

      setShowAddEditModal(false);
      setEditingAddress(null);
      setToastType('success');
      setToastVisible(true);
    } catch (error: any) {
      console.error('[MyAddresses] Failed to save address:', error);
      const errorMessage = error?.data?.message || error?.message || t('addresses.saveFailed');
      setToastMessage(errorMessage);
      setToastType('error');
      setToastVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backArrow, { color: colors.textPrimary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('addresses.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      {loadingAddresses ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView 
          style={[styles.content, { backgroundColor: colors.background }]} 
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Address Cards */}
          {addresses.map((address) => (
            <View key={address.id} style={[styles.addressCard, { backgroundColor: colors.card }]}>
              <View style={[styles.addressIconContainer, { backgroundColor: colors.surfaceSecondary }]}>
                <Text style={styles.addressIcon}>{getAddressIcon(address.type)}</Text>
              </View>
              <View style={styles.addressInfo}>
                <View style={styles.addressHeader}>
                  <Text style={[styles.addressName, { color: colors.textPrimary }]}>{address.name}</Text>
                  {address.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>{t('addresses.default')}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.addressText, { color: colors.textSecondary }]} numberOfLines={2}>
                  {address.fullAddress}
                </Text>
              </View>
              <View style={styles.addressActions}>
                <TouchableOpacity
                  onPress={() => handleEdit(address)}
                  style={styles.actionButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.editIcon}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowDeleteConfirm(address.id)}
                  style={styles.actionButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteIcon}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Add New Address Button */}
          <TouchableOpacity
            onPress={handleAddNew}
            style={[styles.addAddressButton, { backgroundColor: colors.primary, borderColor: colors.primary }]}
            activeOpacity={0.7}
          >
            <View style={[styles.addAddressIconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={[styles.addAddressIcon, { color: '#FFFFFF' }]}>+</Text>
            </View>
            <Text style={[styles.addAddressText, { color: '#FFFFFF' }]}>{t('addresses.addAddress')}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Add/Edit Address Modal */}
      <Modal
        visible={showAddEditModal}
        transparent
        animationType="slide"
        statusBarTranslucent={Platform.OS === 'android'}
        presentationStyle="overFullScreen"
        onRequestClose={() => setShowAddEditModal(false)}
      >
        <View
          style={[
            styles.modalOverlay,
            {
              width: screenW,
              minHeight: screenH,
              backgroundColor: ADDRESS_MODAL_OVERLAY,
            },
            Platform.OS === 'android' && keyboardHeight > 0 && { paddingBottom: keyboardHeight },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setShowAddEditModal(false)}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardView}
            pointerEvents="box-none"
          >
            <View style={[styles.modalContent, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 }]}>
                {/* Handle */}
                <View style={[styles.modalHandle, { backgroundColor: colors.textTertiary }]} />

                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  {editingAddress ? t('addresses.editAddress') : t('addresses.addAddress')}
                </Text>

                <ScrollView
                  ref={modalScrollRef}
                  style={styles.modalScrollView}
                  contentContainerStyle={styles.modalScrollContent}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Address Name */}
                  <View style={styles.inputContainer}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('addresses.name')}</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.textPrimary }]}
                      placeholder={t('addresses.namePlaceholder')}
                      placeholderTextColor={colors.textTertiary}
                      value={formData.name}
                      onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
                    />
                  </View>

                  {/* Address Type */}
                  <View style={styles.inputContainer}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('addresses.type')}</Text>
                    <View style={styles.typeButtons}>
                      {(['home', 'office', 'other'] as const).map((type) => {
                        const selected = formData.type === type;
                        return (
                          <TouchableOpacity
                            key={type}
                            onPress={() => setFormData((prev) => ({ ...prev, type }))}
                            style={[
                              styles.typeButton,
                              {
                                backgroundColor: selected ? `${colors.primary}18` : colors.surfaceSecondary,
                                borderColor: selected ? colors.primary : colors.border,
                              },
                            ]}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.typeButtonIcon}>{getAddressIcon(type)}</Text>
                            <Text
                              style={[
                                styles.typeButtonText,
                                { color: selected ? colors.primary : colors.textPrimary, fontWeight: selected ? '600' : '500' },
                              ]}
                            >
                              {t(`addresses.type${type.charAt(0).toUpperCase() + type.slice(1)}`)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Address Line 1 */}
                  <View style={styles.inputContainer}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('addresses.addressLine1')}</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.textPrimary }]}
                      placeholder={t('addresses.addressLine1Placeholder')}
                      placeholderTextColor={colors.textTertiary}
                      value={formData.address_line1}
                      onChangeText={(text) =>
                        setFormData((prev) => ({ ...prev, address_line1: text }))
                      }
                      multiline
                      numberOfLines={2}
                    />
                  </View>

                  {/* Address Line 2 (Optional) */}
                  <View style={styles.inputContainer}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('addresses.addressLine2')} (Optional)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.textPrimary }]}
                      placeholder={t('addresses.addressLine2Placeholder')}
                      placeholderTextColor={colors.textTertiary}
                      value={formData.address_line2}
                      onChangeText={(text) =>
                        setFormData((prev) => ({ ...prev, address_line2: text }))
                      }
                    />
                  </View>

                  {/* City */}
                  <View style={styles.inputContainer}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('addresses.city')}</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.textPrimary }]}
                      placeholder={t('addresses.cityPlaceholder')}
                      placeholderTextColor={colors.textTertiary}
                      value={formData.city}
                      onChangeText={(text) => setFormData((prev) => ({ ...prev, city: text }))}
                    />
                  </View>

                  {/* State and Postal Code Row */}
                  <View style={styles.inputRow}>
                    <View style={[styles.inputContainer, styles.inputHalf]}>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('addresses.state')}</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.textPrimary }]}
                        placeholder={t('addresses.statePlaceholder')}
                        placeholderTextColor={colors.textTertiary}
                        value={formData.state}
                        onChangeText={(text) => setFormData((prev) => ({ ...prev, state: text }))}
                        onFocus={() => setTimeout(() => modalScrollRef.current?.scrollToEnd({ animated: true }), 150)}
                      />
                    </View>
                    <View style={[styles.inputContainer, styles.inputHalf]}>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('addresses.postalCode')}</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.textPrimary }]}
                        placeholder={t('addresses.postalCodePlaceholder')}
                        placeholderTextColor={colors.textTertiary}
                        value={formData.postal_code}
                        onChangeText={(text) =>
                          setFormData((prev) => ({ ...prev, postal_code: text }))
                        }
                        onFocus={() => setTimeout(() => modalScrollRef.current?.scrollToEnd({ animated: true }), 150)}
                      />
                    </View>
                  </View>

                  {/* Set as Default */}
                  {!editingAddress?.isDefault && (
                    <TouchableOpacity
                      onPress={() =>
                        setFormData((prev) => ({ ...prev, is_default: !prev.is_default }))
                      }
                      style={styles.defaultToggle}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          {
                            borderColor: colors.border,
                            backgroundColor: formData.is_default ? colors.primary : colors.surfaceSecondary,
                          },
                          formData.is_default && { borderColor: colors.primary },
                        ]}
                      >
                        {formData.is_default && (
                          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        )}
                      </View>
                      <Text style={[styles.defaultToggleText, { color: colors.textPrimary }]}>{t('addresses.setAsDefault')}</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>

                {/* Buttons - Fixed at bottom */}
                <View style={[styles.modalButtons, { borderTopColor: colors.border }]}>
                  <TouchableOpacity
                    onPress={() => {
                      setShowAddEditModal(false);
                      setEditingAddress(null);
                    }}
                    style={[styles.modalButtonCancel, { backgroundColor: colors.surfaceSecondary }]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.modalButtonTextCancel, { color: colors.textPrimary }]}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  {loading ? (
                    <View style={styles.modalButtonConfirm}>
                      <ActivityIndicator color="#FFFFFF" />
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={handleSaveAddress}
                      style={styles.modalButtonConfirm}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.modalButtonTextConfirm}>
                        {editingAddress ? t('common.save') : t('addresses.add')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.deleteModalContent, { backgroundColor: colors.card }]}>
            <View style={styles.deleteIconContainer}>
              <Text style={styles.deleteIcon}>🗑️</Text>
            </View>
            <Text style={[styles.deleteModalTitle, { color: colors.textPrimary }]}>{t('addresses.deleteAddress')}</Text>
            <Text style={[styles.deleteModalText, { color: colors.textSecondary }]}>{t('addresses.deleteConfirm')}</Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                onPress={() => setShowDeleteConfirm(null)}
                style={[styles.modalButtonCancel, { backgroundColor: colors.surfaceSecondary }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalButtonTextCancel, { color: colors.textPrimary }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
                style={styles.modalButtonDelete}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonTextDelete}>{t('addresses.delete')}</Text>
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
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressCard: {
    backgroundColor: '#252542',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  addressIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#2d2d4a',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  addressIcon: {
    fontSize: 24,
  },
  addressInfo: {
    flex: 1,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  addressName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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
  addressText: {
    color: '#9ca3af',
    fontSize: 13,
    lineHeight: 18,
  },
  addressActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  actionButton: {
    padding: 4,
  },
  editIcon: {
    fontSize: 18,
    color: '#9ca3af',
  },
  deleteIcon: {
    fontSize: 18,
    color: '#ef4444',
  },
  addAddressButton: {
    backgroundColor: '#252542',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#374151',
  },
  addAddressIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#2d2d4a',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAddressIcon: {
    color: '#3b82f6',
    fontSize: 24,
  },
  addAddressText: {
    color: '#3b82f6',
    fontSize: 15,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalKeyboardView: {
    width: '100%',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
    maxHeight: '92%',
    minHeight: 400,
  },
  modalScrollView: {
    flexGrow: 0,
    flexShrink: 1,
  },
  modalScrollContent: {
    paddingBottom: 16,
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
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    fontSize: 15,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  typeButtonIcon: {
    fontSize: 20,
  },
  typeButtonText: {
    fontSize: 14,
  },
  defaultToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultToggleText: {
    fontSize: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  modalButtonCancel: {
    flex: 1,
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonConfirm: {
    flex: 1,
    padding: 18,
    backgroundColor: '#3b82f6',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextConfirm: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
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
});
