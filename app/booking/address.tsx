import { getAddresses, Address } from '@/services/addresses';
import { createOrder, ApiError } from '@/services/orders';
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
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      default:
        return '📍';
    }
  };

  const handleContinue = async () => {
    if (!selectedAddressId || !supplierId || !serviceId || !scheduledAt) {
      Alert.alert(t('common.error'), 'Please select an address');
      return;
    }

    const selectedAddress = addresses.find(addr => addr.id === selectedAddressId);
    if (!selectedAddress) {
      Alert.alert(t('common.error'), 'Selected address not found');
      return;
    }

    try {
      setCreatingOrder(true);
      const addressString = formatAddress(selectedAddress);
      
      const order = await createOrder({
        supplier_id: supplierId,
        service_id: serviceId,
        scheduled_at: scheduledAt,
        address: addressString,
        notes: `Duration: ${duration} hours`,
      });

      // Navigate to booking success or scheduled screen
      router.replace(`/booking/scheduled/${order.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        Alert.alert(t('common.error'), err.message);
      } else {
        Alert.alert(t('common.error'), 'Failed to create booking');
      }
    } finally {
      setCreatingOrder(false);
    }
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
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('addresses.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {addresses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No addresses found</Text>
            <Text style={styles.emptySubtext}>Please add an address first</Text>
            <TouchableOpacity
              style={styles.addAddressButton}
              onPress={() => router.push('/profile/my-addresses')}
            >
              <Text style={styles.addAddressButtonText}>{t('addresses.addAddress')}</Text>
            </TouchableOpacity>
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
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
            
            <TouchableOpacity
              style={styles.addNewButton}
              onPress={() => router.push('/profile/my-addresses')}
            >
              <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
              <Text style={styles.addNewButtonText}>{t('addresses.addAddress')}</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Spacer for bottom button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Continue Button */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!canContinue || creatingOrder) && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!canContinue || creatingOrder}
        >
          {creatingOrder ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.continueButtonText}>{t('booking.continue')}</Text>
          )}
        </TouchableOpacity>
      </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
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
  scrollView: {
    flex: 1,
  },
  addressCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  defaultBadge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.white,
  },
  addressText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
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
    padding: 20,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
});
