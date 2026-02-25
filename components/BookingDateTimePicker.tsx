import { ProviderAvatar } from '@/components/ProviderAvatar';
import { fetchSupplierAvailability } from '@/services/suppliers';
import { Ionicons } from '@expo/vector-icons';
import { t } from '@/i18n';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

const colors = {
  bg: '#1a1a2e',
  bgCard: '#252542',
  primary: '#3b82f6',
  textSecondary: '#9ca3af',
  border: '#374151',
  white: '#ffffff',
};

export interface BookingDateTimePickerProviderCard {
  name: string;
  serviceInfo?: string;
  profileImage?: string | null;
}

interface BookingDateTimePickerProps {
  supplierId: string;
  value: Date | null;
  onChange: (date: Date) => void;
  showProviderCard?: boolean;
  providerCard?: BookingDateTimePickerProviderCard;
  minDate?: Date;
}

export function BookingDateTimePicker({
  supplierId,
  value,
  onChange,
  showProviderCard = false,
  providerCard,
  minDate = new Date(),
}: BookingDateTimePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(() => value || new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(() =>
    value ? new Date(value.getFullYear(), value.getMonth(), value.getDate()) : null
  );
  const [selectedTime, setSelectedTime] = useState<string | null>(() => {
    if (!value) return null;
    const h = value.getHours();
    const m = value.getMinutes();
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  });
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(true);

  const today = useCallback(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const updateDatesForMonth = useCallback(
    (unavailableList?: string[]) => {
      const list = unavailableList ?? unavailableDates;
      const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const actualStartDate = firstDayOfMonth >= today() ? firstDayOfMonth : today();
      const dates: Date[] = [];
      let currentDate = new Date(actualStartDate);
      let dateIndex = 0;
      while (dates.length < 7 && dateIndex < 60) {
        const dateStr = currentDate.toISOString().split('T')[0];
        if (currentDate >= today() && !list.includes(dateStr)) {
          dates.push(new Date(currentDate));
        }
        currentDate.setDate(currentDate.getDate() + 1);
        dateIndex++;
      }
      setAvailableDates(dates);
      if (dates.length > 0 && selectedDate) {
        const isInList = dates.some((d) => d.toDateString() === selectedDate.toDateString());
        if (!isInList) setSelectedDate(dates[0]);
      }
    },
    [currentMonth, unavailableDates, selectedDate, today]
  );

  useEffect(() => {
    if (!supplierId) {
      setLoadingAvailability(false);
      return;
    }
    let cancelled = false;
    const start = new Date(minDate);
    const end = new Date(minDate);
    end.setDate(end.getDate() + 60);
    fetchSupplierAvailability(
      supplierId,
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0]
    )
      .then((res) => {
        if (cancelled) return;
        setUnavailableDates(res.unavailable_dates || []);
        updateDatesForMonth(res.unavailable_dates || []);
      })
      .catch(() => {
        if (!cancelled) {
          setUnavailableDates([]);
          updateDatesForMonth([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingAvailability(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supplierId, minDate]);

  useEffect(() => {
    updateDatesForMonth();
  }, [currentMonth]);

  useEffect(() => {
    if (selectedDate && supplierId) {
      let cancelled = false;
      const dateStr = selectedDate.toISOString().split('T')[0];
      fetchSupplierAvailability(supplierId, dateStr, dateStr)
        .then((res) => {
          if (cancelled) return;
          let slots = (res.slots || [])
            .filter((s) => s.date === dateStr && s.available)
            .map((s) => s.time);
          if (slots.length === 0) slots = TIME_SLOTS;
          const selectedOnly = new Date(selectedDate);
          selectedOnly.setHours(0, 0, 0, 0);
          if (selectedOnly.getTime() === today().getTime()) {
            const now = new Date();
            slots = slots.filter((time) => {
              const [h, m] = time.split(':').map(Number);
              const tDate = new Date();
              tDate.setHours(h, m, 0, 0);
              return tDate > now;
            });
          }
          setAvailableTimes(slots);
        })
        .catch(() => {
          if (!cancelled) {
            let slots = TIME_SLOTS;
            const selectedOnly = new Date(selectedDate);
            selectedOnly.setHours(0, 0, 0, 0);
            if (selectedOnly.getTime() === today().getTime()) {
              const now = new Date();
              slots = TIME_SLOTS.filter((time) => {
                const [h] = time.split(':').map(Number);
                const tDate = new Date();
                tDate.setHours(h, 0, 0, 0);
                return tDate > now;
              });
            }
            setAvailableTimes(slots);
          }
        });
      return () => {
        cancelled = true;
      };
    }
  }, [selectedDate, supplierId, today]);

  useEffect(() => {
    if (value) {
      const dateOnly = new Date(value.getFullYear(), value.getMonth(), value.getDate());
      setSelectedDate(dateOnly);
      setCurrentMonth(dateOnly);
      setSelectedTime(
        `${value.getHours().toString().padStart(2, '0')}:${value.getMinutes().toString().padStart(2, '0')}`
      );
    } else {
      setSelectedTime(null);
    }
  }, [value?.getTime()]);

  const navigateMonth = useCallback(
    (direction: 'prev' | 'next') => {
      const newMonth = new Date(currentMonth);
      if (direction === 'prev') {
        const currentMonthStart = new Date(today().getFullYear(), today().getMonth(), 1);
        const newMonthStart = new Date(newMonth.getFullYear(), newMonth.getMonth() - 1, 1);
        if (newMonthStart < currentMonthStart) return;
        newMonth.setMonth(newMonth.getMonth() - 1);
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1);
      }
      setCurrentMonth(newMonth);
    },
    [currentMonth, today]
  );

  const canNavigatePrev = useCallback(() => {
    const currentMonthStart = new Date(today().getFullYear(), today().getMonth(), 1);
    const viewMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    return viewMonthStart > currentMonthStart;
  }, [currentMonth, today]);

  const formatMonthYear = (date: Date) =>
    date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const formatDayName = (date: Date) =>
    date.toLocaleDateString(undefined, { weekday: 'short' });
  const isDateUnavailable = (date: Date) =>
    unavailableDates.includes(date.toISOString().split('T')[0]);
  const isTimeAvailable = (time: string) => availableTimes.includes(time);

  const handleTimeSelect = useCallback(
    (time: string) => {
      if (!selectedDate || !isTimeAvailable(time)) return;
      const [hours, minutes] = time.split(':').map(Number);
      const combined = new Date(selectedDate);
      combined.setHours(hours, minutes, 0, 0);
      setSelectedTime(time);
      onChange(combined);
    },
    [selectedDate, onChange, isTimeAvailable]
  );

  if (loadingAvailability) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {showProviderCard && providerCard && (
        <View style={styles.providerCard}>
          <View style={styles.providerImageContainer}>
            <ProviderAvatar
              profileImage={providerCard.profileImage}
              size={48}
              rounded
              style={styles.providerImage}
            />
          </View>
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>{providerCard.name}</Text>
            {providerCard.serviceInfo ? (
              <Text style={styles.serviceInfo}>{providerCard.serviceInfo}</Text>
            ) : null}
          </View>
        </View>
      )}

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
          {formatMonthYear(currentMonth).charAt(0).toUpperCase() +
            formatMonthYear(currentMonth).slice(1)}
        </Text>
        <TouchableOpacity onPress={() => navigateMonth('next')}>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

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
              <Text
                style={[
                  styles.dateDayName,
                  isSelected && styles.dateDayNameSelected,
                  isUnavailable && styles.dateDayNameUnavailable,
                ]}
              >
                {formatDayName(date)}
              </Text>
              <Text
                style={[
                  styles.dateDayNumber,
                  isSelected && styles.dateDayNumberSelected,
                  isUnavailable && styles.dateDayNumberUnavailable,
                ]}
              >
                {date.getDate()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

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
                onPress={() => isAvailable && handleTimeSelect(time)}
                disabled={!isAvailable}
              >
                <Text
                  style={[
                    styles.timeSlotText,
                    isSelected && styles.timeSlotTextSelected,
                    !isAvailable && styles.timeSlotTextUnavailable,
                  ]}
                >
                  {time}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
  },
  loadingWrap: {
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  providerImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2d2d4a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  providerInfo: { flex: 1 },
  providerName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 2,
  },
  serviceInfo: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthNavButtonDisabled: { opacity: 0.3 },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  dateSelector: {
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
  dateItemUnavailable: { opacity: 0.3 },
  dateDayName: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  dateDayNameSelected: { color: colors.white },
  dateDayNameUnavailable: { color: colors.textSecondary },
  dateDayNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  dateDayNumberSelected: { color: colors.white },
  dateDayNumberUnavailable: { color: colors.textSecondary },
  section: {
    marginBottom: 0,
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
  timeSlotUnavailable: { opacity: 0.3 },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.white,
  },
  timeSlotTextSelected: { color: colors.white },
  timeSlotTextUnavailable: { color: colors.textSecondary },
});
