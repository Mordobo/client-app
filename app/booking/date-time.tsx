import {
  BookingDateTimePicker,
  type BookingDateTimePickerProviderCard,
} from '@/components/BookingDateTimePicker';
import {
  fetchSupplierProfile,
  fetchSupplierServices,
  Supplier,
  SupplierService,
  ApiError,
} from '@/services/suppliers';
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

// Get service duration in hours from service description or category
const getServiceDurationHours = (service: SupplierService | null): number => {
  if (!service) return 2; // Default 2 hours
  
  // Try to extract duration from description (e.g., "2-3 hours", "1-2 hrs")
  if (service.description) {
    const durationMatch = service.description.match(/(\d+)[-\s](\d+)\s*(hr|hour|h)/i);
    if (durationMatch) {
      // Use the average of the range
      return Math.ceil((parseInt(durationMatch[1]) + parseInt(durationMatch[2])) / 2);
    }
    const singleDurationMatch = service.description.match(/(\d+)\s*(hr|hour|h)/i);
    if (singleDurationMatch) {
      return parseInt(singleDurationMatch[1]);
    }
  }
  
  // Default durations based on service category
  const defaultDurations: Record<string, number> = {
    cleaning: 2,
    'deep-cleaning': 4,
    'office-cleaning': 3,
    plumbing: 2,
    electrical: 2,
    painting: 5,
  };
  
  return defaultDurations[service.category_key || ''] || 2;
};

export default function BookingDateTimeScreen() {
  const router = useRouter();
  const { supplierId, serviceId } = useLocalSearchParams<{ supplierId: string; serviceId: string }>();
  const insets = useSafeAreaInsets();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [service, setService] = useState<SupplierService | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);

  useEffect(() => {
    console.log('[BookingDateTime] Component mounted with params:', { supplierId, serviceId });
    
    if (!supplierId || !serviceId) {
      console.error('[BookingDateTime] Missing required params:', { supplierId, serviceId });
      setError('Missing required booking information');
      setLoading(false);
      return;
    }
    
    loadData();
  }, [supplierId, serviceId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[BookingDateTime] Loading supplier and services data...');

      const [supplierData, servicesData] = await Promise.all([
        fetchSupplierProfile(supplierId!),
        fetchSupplierServices(supplierId!),
      ]);

      console.log('[BookingDateTime] Data loaded successfully:', {
        supplier: supplierData.full_name,
        servicesCount: servicesData.length
      });

      setSupplier(supplierData);
      const selectedService = servicesData.find(s => s.id === serviceId);
      setService(selectedService || null);

      if (!selectedService) {
        console.error('[BookingDateTime] Service not found with id:', serviceId);
        setError('Service not found');
        return;
      }

      console.log('[BookingDateTime] Selected service:', selectedService.name || selectedService.category_name);
    } catch (err) {
      console.error('[BookingDateTime] Error loading data:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (!scheduledAt || !serviceId || !supplierId || !service) {
      Alert.alert(t('common.error'), t('booking.selectAllFields'));
      return;
    }
    const serviceDuration = getServiceDurationHours(service);
    router.push({
      pathname: '/booking/address',
      params: {
        supplierId,
        serviceId,
        scheduledAt: scheduledAt.toISOString(),
        duration: serviceDuration.toString(),
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

  if (error || !supplier || !service) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error || 'Data not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryText}>{t('common.ok')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const canContinue = !!scheduledAt;
  const providerCardInfo: BookingDateTimePickerProviderCard | undefined = supplier && service
    ? {
        name: supplier.business_name?.trim() || supplier.full_name,
        serviceInfo: `${service.name?.trim() || service.category_name || 'Service'} • $${service.price || 0}${t('supplier.perHour')}`,
        profileImage: supplier.profile_image,
      }
    : undefined;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('booking.selectDateTime')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        <BookingDateTimePicker
          supplierId={supplierId!}
          value={scheduledAt}
          onChange={setScheduledAt}
          showProviderCard={true}
          providerCard={providerCardInfo}
        />

        {/* Service Duration Info (Read-only) */}
        {service && (
          <View style={styles.section}>
            <Text style={styles.sectionTitleCentered}>{t('booking.estimatedDuration')}</Text>
            <View style={styles.durationInfoCard}>
              <Ionicons name="time-outline" size={20} color={colors.secondary} />
              <Text style={styles.durationInfoText}>
                {getServiceDurationHours(service)} {getServiceDurationHours(service) === 1 ? 'hora' : 'horas'}
              </Text>
            </View>
          </View>
        )}

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
        >
          <Text style={styles.continueButtonText}>{t('booking.continue')}</Text>
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
  section: {
    paddingHorizontal: 0,
    marginBottom: 24,
  },
  sectionTitleCentered: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 16,
    textAlign: 'center',
  },
  durationInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  durationInfoText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.secondary,
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
