import { Toast } from '@/components/Toast';
import { useTheme } from '@/contexts/ThemeContext';
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
import React, { useEffect, useState } from 'react';
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

interface Address {
  id: string;
  name: string;
  type: 'home' | 'office' | 'other';
  fullAddress: string;
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

export default function MyAddressesScreen() {
  const router = useRouter();
  const { colorScheme } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  // Use dark colors for now to match preview exactly
  const colors = darkColors;

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
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('addresses.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      {loadingAddresses ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Address Cards */}
          {addresses.map((address) => (
            <View key={address.id} style={styles.addressCard}>
              <View style={styles.addressIconContainer}>
                <Text style={styles.addressIcon}>{getAddressIcon(address.type)}</Text>
              </View>
              <View style={styles.addressInfo}>
                <View style={styles.addressHeader}>
                  <Text style={styles.addressName}>{address.name}</Text>
                  {address.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>{t('addresses.default')}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.addressText} numberOfLines={2}>
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
            style={styles.addAddressButton}
            activeOpacity={0.7}
          >
            <View style={styles.addAddressIconContainer}>
              <Text style={styles.addAddressIcon}>+</Text>
            </View>
            <Text style={styles.addAddressText}>{t('addresses.addAddress')}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Add/Edit Address Modal */}
      <Modal
        visible={showAddEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
          keyboardVerticalOffset={0}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowAddEditModal(false)}
          >
            <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
              <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                {/* Handle */}
                <View style={styles.modalHandle} />

                <Text style={styles.modalTitle}>
                  {editingAddress ? t('addresses.editAddress') : t('addresses.addAddress')}
                </Text>

                <ScrollView
                  style={styles.modalScrollView}
                  contentContainerStyle={styles.modalScrollContent}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Address Name */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>{t('addresses.name')}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder={t('addresses.namePlaceholder')}
                      placeholderTextColor={colors.textSecondary}
                      value={formData.name}
                      onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
                    />
                  </View>

                  {/* Address Type */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>{t('addresses.type')}</Text>
                    <View style={styles.typeButtons}>
                      {(['home', 'office', 'other'] as const).map((type) => (
                        <TouchableOpacity
                          key={type}
                          onPress={() => setFormData((prev) => ({ ...prev, type }))}
                          style={[
                            styles.typeButton,
                            formData.type === type && styles.typeButtonActive,
                          ]}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.typeButtonIcon}>{getAddressIcon(type)}</Text>
                          <Text
                            style={[
                              styles.typeButtonText,
                              formData.type === type && styles.typeButtonTextActive,
                            ]}
                          >
                            {t(`addresses.type${type.charAt(0).toUpperCase() + type.slice(1)}`)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Address Line 1 */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>{t('addresses.addressLine1')}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder={t('addresses.addressLine1Placeholder')}
                      placeholderTextColor={colors.textSecondary}
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
                    <Text style={styles.inputLabel}>{t('addresses.addressLine2')} (Optional)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder={t('addresses.addressLine2Placeholder')}
                      placeholderTextColor={colors.textSecondary}
                      value={formData.address_line2}
                      onChangeText={(text) =>
                        setFormData((prev) => ({ ...prev, address_line2: text }))
                      }
                    />
                  </View>

                  {/* City */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>{t('addresses.city')}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder={t('addresses.cityPlaceholder')}
                      placeholderTextColor={colors.textSecondary}
                      value={formData.city}
                      onChangeText={(text) => setFormData((prev) => ({ ...prev, city: text }))}
                    />
                  </View>

                  {/* State and Postal Code Row */}
                  <View style={styles.inputRow}>
                    <View style={[styles.inputContainer, styles.inputHalf]}>
                      <Text style={styles.inputLabel}>{t('addresses.state')}</Text>
                      <TextInput
                        style={styles.input}
                        placeholder={t('addresses.statePlaceholder')}
                        placeholderTextColor={colors.textSecondary}
                        value={formData.state}
                        onChangeText={(text) => setFormData((prev) => ({ ...prev, state: text }))}
                      />
                    </View>
                    <View style={[styles.inputContainer, styles.inputHalf]}>
                      <Text style={styles.inputLabel}>{t('addresses.postalCode')}</Text>
                      <TextInput
                        style={styles.input}
                        placeholder={t('addresses.postalCodePlaceholder')}
                        placeholderTextColor={colors.textSecondary}
                        value={formData.postal_code}
                        onChangeText={(text) =>
                          setFormData((prev) => ({ ...prev, postal_code: text }))
                        }
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
                          formData.is_default && styles.checkboxChecked,
                        ]}
                      >
                        {formData.is_default && (
                          <Ionicons name="checkmark" size={16} color={colors.textPrimary} />
                        )}
                      </View>
                      <Text style={styles.defaultToggleText}>{t('addresses.setAsDefault')}</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>

                {/* Buttons - Fixed at bottom */}
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    onPress={() => {
                      setShowAddEditModal(false);
                      setEditingAddress(null);
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
            <Text style={styles.deleteModalTitle}>{t('addresses.deleteAddress')}</Text>
            <Text style={styles.deleteModalText}>{t('addresses.deleteConfirm')}</Text>
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
    maxHeight: '90%',
  },
  modalScrollView: {
    flex: 1,
    maxHeight: 500,
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
    fontSize: 15,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    padding: 14,
    backgroundColor: '#252542',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  typeButtonActive: {
    backgroundColor: '#3b82f620',
    borderColor: '#3b82f6',
  },
  typeButtonIcon: {
    fontSize: 20,
  },
  typeButtonText: {
    color: '#ffffff',
    fontSize: 14,
  },
  typeButtonTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
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
    borderColor: '#374151',
    backgroundColor: '#2d2d4a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  defaultToggleText: {
    color: '#ffffff',
    fontSize: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
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
    padding: 18,
    backgroundColor: '#3b82f6',
    borderRadius: 14,
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
