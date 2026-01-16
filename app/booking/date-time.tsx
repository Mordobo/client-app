import {
  fetchSupplierAvailability,
  fetchSupplierProfile,
  fetchSupplierServices,
  Supplier,
  SupplierService,
  ApiError,
} from '@/services/suppliers';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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

interface AvailabilitySlot {
  date: string;
  time: string;
  available: boolean;
}

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

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
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date selection state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);

  // Time selection
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

  useEffect(() => {
    if (supplierId && serviceId) {
      loadData();
    }
  }, [supplierId, serviceId]);

  useEffect(() => {
    if (selectedDate && supplierId) {
      loadAvailabilityForDate(selectedDate);
    }
  }, [selectedDate, supplierId]);

  // Define updateDatesForMonth before it's used
  const updateDatesForMonth = useCallback((unavailableDatesList?: string[]) => {
    const datesToCheck = unavailableDatesList !== undefined ? unavailableDatesList : unavailableDates;
    
    // Get the first day of the current month view
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Generate 7 days starting from the first day of the month or today (whichever is later)
    const dates: Date[] = [];
    const startDate = firstDayOfMonth > today ? firstDayOfMonth : today;
    
    // If we're viewing a future month, start from the first day of that month
    const actualStartDate = firstDayOfMonth >= today ? firstDayOfMonth : today;
    
    let dateIndex = 0;
    let currentDate = new Date(actualStartDate);
    
    // Generate 7 available dates
    while (dates.length < 7 && dateIndex < 60) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Only add dates that are today or in the future (not past dates)
      if (currentDate >= today && !datesToCheck.includes(dateStr)) {
        dates.push(new Date(currentDate));
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
      dateIndex++;
    }
    
    setAvailableDates(dates);
    
    // If current selected date is not in the new list, select the first available
    if (dates.length > 0) {
      const isSelectedDateInList = selectedDate && dates.some(
        d => d.toDateString() === selectedDate.toDateString()
      );
      if (!isSelectedDateInList) {
        setSelectedDate(dates[0]);
      }
    }
  }, [currentMonth, unavailableDates, selectedDate]);

  // Update available dates when month changes
  useEffect(() => {
    updateDatesForMonth();
  }, [currentMonth, updateDatesForMonth]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [supplierData, servicesData] = await Promise.all([
        fetchSupplierProfile(supplierId!),
        fetchSupplierServices(supplierId!),
      ]);

      setSupplier(supplierData);
      const selectedService = servicesData.find(s => s.id === serviceId);
      setService(selectedService || null);

      if (!selectedService) {
        setError('Service not found');
        return;
      }

      // Load initial availability
      await loadAvailability();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAvailability = async () => {
    if (!supplierId) return;

    try {
      setLoadingAvailability(true);
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 60); // Next 60 days to cover month navigation

      const availability = await fetchSupplierAvailability(
        supplierId,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      setUnavailableDates(availability.unavailable_dates || []);

      // Initial dates will be set by updateDatesForMonth
      updateDatesForMonth(availability.unavailable_dates || []);
    } catch (err) {
      console.error('Error loading availability:', err);
      // Continue with default dates even if API fails
      setUnavailableDates([]);
      updateDatesForMonth([]);
    } finally {
      setLoadingAvailability(false);
    }
  };

  const loadAvailabilityForDate = async (date: Date) => {
    if (!supplierId) return;

    try {
      const dateStr = date.toISOString().split('T')[0];
      const availability = await fetchSupplierAvailability(
        supplierId,
        dateStr,
        dateStr
      );

      // Filter available times for selected date
      let availableSlots = availability.slots
        .filter(slot => slot.date === dateStr && slot.available)
        .map(slot => slot.time);

      // If no slots from API, use default time slots
      if (availableSlots.length === 0) {
        availableSlots = TIME_SLOTS;
      }

      // If selected date is today, filter out past hours
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDateOnly = new Date(date);
      selectedDateOnly.setHours(0, 0, 0, 0);
      
      if (selectedDateOnly.getTime() === today.getTime()) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        // Filter out times that have already passed today
        availableSlots = availableSlots.filter(time => {
          const [hours, minutes] = time.split(':').map(Number);
          const timeDate = new Date();
          timeDate.setHours(hours, minutes, 0, 0);
          
          // Only include times that are in the future (at least 1 hour from now)
          return timeDate > now;
        });
      }

      setAvailableTimes(availableSlots);
    } catch (err) {
      console.error('Error loading time slots:', err);
      // Default to all time slots if API fails, but still filter past hours if today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDateOnly = new Date(date);
      selectedDateOnly.setHours(0, 0, 0, 0);
      
      let defaultSlots = TIME_SLOTS;
      if (selectedDateOnly.getTime() === today.getTime()) {
        const now = new Date();
        defaultSlots = TIME_SLOTS.filter(time => {
          const [hours] = time.split(':').map(Number);
          const timeDate = new Date();
          timeDate.setHours(hours, 0, 0, 0);
          return timeDate > now;
        });
      }
      
      setAvailableTimes(defaultSlots);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      // Don't allow navigating to past months
      const today = new Date();
      const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const newMonthStart = new Date(newMonth.getFullYear(), newMonth.getMonth() - 1, 1);
      
      if (newMonthStart < currentMonthStart) {
        return; // Don't navigate to past months
      }
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  // Check if we can navigate to previous month
  const canNavigatePrev = () => {
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const viewMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    return viewMonthStart > currentMonthStart;
  };

  const formatMonthYear = (date: Date): string => {
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  const formatDayName = (date: Date): string => {
    return date.toLocaleDateString('es-ES', { weekday: 'short' });
  };

  const formatDayNumber = (date: Date): string => {
    return date.getDate().toString();
  };

  const isDateUnavailable = (date: Date): boolean => {
    const dateStr = date.toISOString().split('T')[0];
    return unavailableDates.includes(dateStr);
  };

  const isTimeAvailable = (time: string): boolean => {
    return availableTimes.includes(time);
  };

  const calculateEndTime = (startTime: string, duration: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const endHours = hours + duration;
    return `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const handleContinue = () => {
    if (!selectedDate || !selectedTime || !serviceId || !supplierId || !service) {
      Alert.alert(t('common.error'), t('booking.selectAllFields'));
      return;
    }

    // Get duration from service
    const serviceDuration = getServiceDurationHours(service);

    // Navigate to address selection with booking data
    const scheduledAt = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(':').map(Number);
    scheduledAt.setHours(hours, minutes, 0, 0);

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

  const canContinue = selectedDate && selectedTime;

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

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Provider Mini Card */}
        <View style={styles.providerCard}>
          <View style={styles.providerImageContainer}>
            {supplier.profile_image ? (
              <Image source={{ uri: supplier.profile_image }} style={styles.providerImage} />
            ) : (
              <Ionicons name="person" size={24} color={colors.textSecondary} />
            )}
          </View>
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>{supplier.full_name}</Text>
            <Text style={styles.serviceInfo}>
              {service.category_name || 'Service'} • ${service.price || 0}{t('supplier.perHour')}
            </Text>
          </View>
        </View>

        {/* Month Navigation */}
        <View style={styles.monthNavigation}>
          <TouchableOpacity
            onPress={() => navigateMonth('prev')}
            disabled={!canNavigatePrev()}
            style={!canNavigatePrev() && styles.monthNavButtonDisabled}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={canNavigatePrev() ? colors.textSecondary : colors.border}
            />
          </TouchableOpacity>
          <Text style={styles.monthText}>
            {formatMonthYear(currentMonth).charAt(0).toUpperCase() + formatMonthYear(currentMonth).slice(1)}
          </Text>
          <TouchableOpacity onPress={() => navigateMonth('next')}>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Date Selector - Horizontal Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateSelector}
        >
          {availableDates.map((date, index) => {
            const isSelected = selectedDate?.toDateString() === date.toDateString();
            const isUnavailable = isDateUnavailable(date);
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dateItem,
                  isSelected && styles.dateItemSelected,
                  isUnavailable && styles.dateItemUnavailable,
                ]}
                onPress={() => !isUnavailable && setSelectedDate(date)}
                disabled={isUnavailable}
              >
                <Text style={[
                  styles.dateDayName,
                  isSelected && styles.dateDayNameSelected,
                  isUnavailable && styles.dateDayNameUnavailable,
                ]}>
                  {formatDayName(date)}
                </Text>
                <Text style={[
                  styles.dateDayNumber,
                  isSelected && styles.dateDayNumberSelected,
                  isUnavailable && styles.dateDayNumberUnavailable,
                ]}>
                  {formatDayNumber(date)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Time Slots Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitleCentered}>{t('booking.availableTimes')}</Text>
          <View style={styles.timeGrid}>
            {TIME_SLOTS.map((time) => {
              const isSelected = selectedTime === time;
              const isAvailable = isTimeAvailable(time);
              
              return (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeSlot,
                    isSelected && styles.timeSlotSelected,
                    !isAvailable && styles.timeSlotUnavailable,
                  ]}
                  onPress={() => isAvailable && setSelectedTime(time)}
                  disabled={!isAvailable}
                >
                  <Text style={[
                    styles.timeSlotText,
                    isSelected && styles.timeSlotTextSelected,
                    !isAvailable && styles.timeSlotTextUnavailable,
                  ]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

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
  providerCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  providerImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 2,
  },
  serviceInfo: {
    fontSize: 13,
    color: colors.secondary,
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  monthNavButtonDisabled: {
    opacity: 0.3,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  dateSelector: {
    paddingHorizontal: 20,
    gap: 6,
    marginBottom: 24,
  },
  dateItem: {
    width: 56,
    paddingVertical: 12,
    paddingHorizontal: 4,
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    alignItems: 'center',
  },
  dateItemSelected: {
    backgroundColor: colors.primary,
  },
  dateItemUnavailable: {
    opacity: 0.3,
  },
  dateDayName: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  dateDayNameSelected: {
    color: colors.white,
  },
  dateDayNameUnavailable: {
    color: colors.textSecondary,
  },
  dateDayNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  dateDayNumberSelected: {
    color: colors.white,
  },
  dateDayNumberUnavailable: {
    color: colors.textSecondary,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 16,
  },
  sectionTitleCentered: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 16,
    textAlign: 'center',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeSlot: {
    width: '22%',
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: colors.bgCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSlotSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeSlotUnavailable: {
    opacity: 0.3,
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.white,
  },
  timeSlotTextSelected: {
    color: colors.white,
  },
  timeSlotTextUnavailable: {
    color: colors.textSecondary,
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
