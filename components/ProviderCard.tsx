import { ProviderAvatar } from '@/components/ProviderAvatar';
import { useTheme } from '@/contexts/ThemeContext';
import { useFavorite } from '@/hooks/useFavorite';
import { t } from '@/i18n';
import { Supplier } from '@/services/suppliers';
import { getTranslatedServiceCategory } from '@/utils/categoryDisplay';
import { getThemeColors, type ThemeColors } from '@/utils/themeStyles';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ProviderCardProps {
  supplier: Supplier;
  onPress?: () => void;
  onBookPress?: () => void;
}

const BRAND = {
  primary: '#3B82F6',
  secondary: '#10B981',
  rating: '#D97706',
} as const;

function createStyles(theme: ThemeColors, isDark: boolean) {
  const availableBg = isDark ? 'rgba(16, 185, 129, 0.22)' : 'rgba(16, 185, 129, 0.18)';
  const availableFg = isDark ? BRAND.secondary : '#047857';
  const serviceCategory = isDark ? BRAND.secondary : '#047857';

  return StyleSheet.create({
    container: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.cardBorder,
    },
    content: {
      flexDirection: 'row',
      gap: 14,
    },
    imageContainer: {
      width: 80,
      height: 80,
      borderRadius: 14,
      backgroundColor: theme.surfaceSecondary,
      overflow: 'hidden',
    },
    image: {
      width: 80,
      height: 80,
      borderRadius: 14,
    },
    info: {
      flex: 1,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 4,
    },
    name: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.textPrimary,
      flex: 1,
    },
    favoriteButton: {
      padding: 4,
    },
    serviceContainer: {
      flexShrink: 1,
      minWidth: 0,
      marginBottom: 6,
    },
    service: {
      fontSize: 14,
      color: serviceCategory,
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 8,
    },
    ratingText: {
      fontSize: 13,
      color: BRAND.rating,
      fontWeight: '600',
    },
    distance: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap',
    },
    priceSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
      flexShrink: 1,
      minWidth: 0,
    },
    price: {
      fontSize: 18,
      fontWeight: '700',
      color: BRAND.primary,
      margin: 0,
      flexShrink: 0,
    },
    availableBadge: {
      backgroundColor: availableBg,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      flexShrink: 1,
    },
    availableText: {
      fontSize: 10,
      color: availableFg,
      fontWeight: '700',
    },
    bookButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: BRAND.primary,
      borderRadius: 8,
      flexShrink: 0,
      minWidth: 80,
    },
    bookButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });
}

export function ProviderCard({ supplier, onPress, onBookPress }: ProviderCardProps) {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const theme = useMemo(() => getThemeColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const { isFavorite, isLoading: isFavoriteLoading, toggleFavorite } = useFavorite(supplier?.id);

  if (!supplier?.id) {
    return null;
  }

  const ratingValue = typeof supplier.rating === 'number'
    ? supplier.rating
    : (typeof supplier.rating === 'string' ? parseFloat(supplier.rating) : 0);
  const safeRating = Number.isNaN(ratingValue) ? 0 : ratingValue;

  const handleFavoritePress = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    toggleFavorite();
  };

  const isAvailable = supplier.availability && typeof supplier.availability === 'string' && supplier.availability.trim() !== '';

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.content}>
        <View style={styles.imageContainer}>
          <ProviderAvatar
            profileImage={supplier.profile_image}
            size={80}
            rounded={false}
            style={styles.image}
          />
        </View>

        <View style={styles.info}>
          <View style={styles.headerRow}>
            <Text style={styles.name} numberOfLines={1}>{supplier.business_name?.trim() || supplier.full_name || 'Unknown'}</Text>
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={handleFavoritePress}
              disabled={isFavoriteLoading}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={18}
                color={isFavorite ? '#EF4444' : theme.icon}
              />
            </TouchableOpacity>
          </View>

          {supplier.service_category && (
            <View style={styles.serviceContainer}>
              <Text style={styles.service} numberOfLines={1}>
                {getTranslatedServiceCategory(supplier.service_category, t)}
              </Text>
            </View>
          )}

          <View style={styles.ratingRow}>
            <Text style={styles.ratingText}>
              ⭐ {safeRating.toFixed(1)} ({supplier.total_reviews || 0})
            </Text>
            {supplier.distance_km !== undefined && (
              <Text style={styles.distance}>📍 {supplier.distance_km.toFixed(1)} km</Text>
            )}
          </View>

          <View style={styles.footerRow}>
            <View style={styles.priceSection}>
              {supplier.hourly_rate && (
                <Text style={styles.price}>${supplier.hourly_rate}/hr</Text>
              )}
              {isAvailable && (
                <View style={styles.availableBadge}>
                  <Text style={styles.availableText}>{t('searchResults.available')}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.bookButton}
              onPress={(e) => {
                e.stopPropagation();
                onBookPress?.();
              }}
            >
              <Text style={styles.bookButtonText}>{t('searchResults.book')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
