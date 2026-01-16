import { getAddresses, createAddress, Address } from '@/services/addresses';
import { ApiError } from '@/services/orders';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@/i18n';

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

export default function BookingAddressScreen() {
  const router = useRouter();
  const { supplierId, serviceId, scheduledAt, duration } = useLocalSearchParams<{
    supplierId: string;
    serviceId: string;
    scheduledAt: string;
    duration: string;
  }>();
  const insets = useSafeAreaInsets();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'home' as 'home' | 'office' | 'other',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'DO',
    is_default: false,
  });

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      setError(null);
      const addressesData = await getAddresses();
      setAddresses(addressesData);
      
      // Select default address if available
      const defaultAddress = addressesData.find(addr => addr.is_default);
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
      } else if (addressesData.length > 0) {
        setSelectedAddressId(addressesData[0].id);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load addresses');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: Address): string => {
    const parts: string[] = [];
    if (address.address_line1) parts.push(address.address_line1);
    if (address.address_line2) parts.push(address.address_line2);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.postal_code) parts.push(address.postal_code);
    return parts.join(', ');
  };

  const getAddressIcon = (type: string): string => {
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
    setShowAddModal(true);
  };

  const handleSaveAddress = async () => {
    // Validate required fields
    if (!formData.name.trim()) {
      Alert.alert(t('common.error'), t('addresses.nameRequired'));
      return;
    }

    if (!formData.address_line1.trim()) {
      Alert.alert(t('common.error'), t('addresses.addressRequired'));
      return;
    }

    if (!formData.city.trim()) {
      Alert.alert(t('common.error'), t('addresses.cityRequired'));
      return;
    }

    try {
      setSavingAddress(true);
      const newAddress = await createAddress(formData);
      
      // Reload addresses
      await loadAddresses();
      
      // Select the newly created address
      setSelectedAddressId(newAddress.id);
      
      // Close modal
      setShowAddModal(false);
      
      Alert.alert(t('common.success'), t('addresses.created'));
    } catch (err: any) {
      console.error('[BookingAddress] Failed to save address:', err);
      const errorMessage = err?.data?.message || err?.message || t('addresses.saveFailed');
      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setSavingAddress(false);
    }
  };

  const handleContinue = async () => {
    if (!selectedAddressId || !supplierId || !serviceId || !scheduledAt) {
      Alert.alert(t('common.error'), t('booking.selectAddress'));
      return;
    }

    const selectedAddress = addresses.find(addr => addr.id === selectedAddressId);
    if (!selectedAddress) {
      Alert.alert(t('common.error'), t('booking.addressNotFound'));
      return;
    }

    // Navigate to booking summary screen
    router.push({
      pathname: '/booking/summary',
      params: {
        supplierId,
        serviceId,
        scheduledAt,
        duration,
        addressId: selectedAddressId,
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

  if (error && addresses.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadAddresses}>
            <Text style={styles.retryText}>{t('common.ok')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const canContinue = selectedAddressId && addresses.length > 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('booking.serviceAddress')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Map Placeholder */}
        <View style={styles.mapContainer}>
          <LinearGradient
            colors={[`${colors.primary}20`, `${colors.purple}20`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.mapContent}>
            <Text style={styles.mapPin}>📍</Text>
            <Text style={styles.mapText}>{t('booking.locationMap')}</Text>
          </View>
        </View>

        {/* Saved Addresses Section */}
        <View style={styles.addressesSection}>
          <Text style={styles.sectionTitle}>{t('booking.savedAddresses')}</Text>
          
          {addresses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="location-outline" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>{t('booking.noAddressesSaved')}</Text>
              <Text style={styles.emptySubtext}>{t('booking.addAddressToContinue')}</Text>
            </View>
          ) : (
            <>
              {addresses.map((address) => {
                const isSelected = selectedAddressId === address.id;
                return (
                  <TouchableOpacity
                    key={address.id}
                    style={[
                      styles.addressCard,
                      isSelected && styles.addressCardSelected,
                    ]}
                    onPress={() => setSelectedAddressId(address.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.addressIconContainer}>
                      <Text style={styles.addressIcon}>{getAddressIcon(address.type)}</Text>
                    </View>
                    <View style={styles.addressInfo}>
                      <View style={styles.addressHeader}>
                        <Text style={styles.addressName}>{address.name}</Text>
                        {address.is_default && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>{t('addresses.default')}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.addressText} numberOfLines={2}>
                        {formatAddress(address)}
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={styles.checkboxContainer}>
                        <Ionicons name="checkmark" size={14} color={colors.white} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </>
          )}
          
          {/* Add New Address Button */}
          <TouchableOpacity
            style={styles.addNewButton}
            onPress={handleAddNew}
            activeOpacity={0.7}
          >
            <View style={styles.addNewIconContainer}>
              <Text style={styles.addNewIcon}>+</Text>
            </View>
            <Text style={styles.addNewButtonText}>{t('booking.addNewAddress')}</Text>
          </TouchableOpacity>
        </View>

        {/* Spacer for bottom button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Continue Button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !canContinue && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!canContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>{t('booking.continue')}</Text>
        </TouchableOpacity>
      </View>

      {/* Add Address Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
          keyboardVerticalOffset={0}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowAddModal(false)}
          >
            <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
              <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                {/* Handle */}
                <View style={styles.modalHandle} />

                <Text style={styles.modalTitle}>{t('addresses.addAddress')}</Text>

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
                        <Ionicons name="checkmark" size={16} color={colors.white} />
                      )}
                    </View>
                    <Text style={styles.defaultToggleText}>{t('addresses.setAsDefault')}</Text>
                  </TouchableOpacity>
                </ScrollView>

                {/* Buttons - Fixed at bottom */}
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    onPress={() => setShowAddModal(false)}
                    style={styles.modalButtonCancel}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalButtonTextCancel}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  {savingAddress ? (
                    <View style={styles.modalButtonConfirm}>
                      <ActivityIndicator color="#FFFFFF" />
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={handleSaveAddress}
                      style={styles.modalButtonConfirm}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.modalButtonTextConfirm}>{t('addresses.add')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
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
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 24,
    color: colors.white,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  mapContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    height: 180,
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  mapContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  mapPin: {
    fontSize: 48,
  },
  mapText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  addressesSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 16,
  },
  addressCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  addressCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}20`,
  },
  addressIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  defaultBadge: {
    backgroundColor: `${colors.secondary}20`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.secondary,
  },
  addressText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  checkboxContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    marginTop: 0,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 14,
  },
  addNewIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addNewIcon: {
    fontSize: 24,
    color: colors.primary,
  },
  addNewButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  addAddressButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addAddressButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: colors.bg,
  },
  continueButton: {
    width: '100%',
    paddingVertical: 18,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: colors.bgCard,
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  errorText: {
    fontSize: 16,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
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
    paddingTop: 24,
    paddingHorizontal: 20,
    maxHeight: '90%',
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
  modalScrollView: {
    flex: 1,
    maxHeight: 500,
  },
  modalScrollContent: {
    paddingBottom: 16,
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
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    color: colors.white,
    fontSize: 15,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    padding: 14,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  typeButtonActive: {
    backgroundColor: `${colors.primary}20`,
    borderColor: colors.primary,
  },
  typeButtonIcon: {
    fontSize: 20,
  },
  typeButtonText: {
    color: colors.white,
    fontSize: 14,
  },
  typeButtonTextActive: {
    color: colors.primary,
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
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  defaultToggleText: {
    color: colors.white,
    fontSize: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
    padding: 18,
    backgroundColor: colors.primary,
    borderRadius: 14,
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
});
