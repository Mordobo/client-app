import { EmptyState } from '@/components/EmptyState';
import { useTheme } from '@/contexts/ThemeContext';
import { t } from '@/i18n';
import {
  ApiError,
  FavoriteSupplier,
  fetchFavorites,
  removeFavorite,
} from '@/services/favorites';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Theme colors from JSX design (dark mode)
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

export default function FavoritesScreen() {
  const router = useRouter();
  const { colorScheme } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  // Use dark colors to match JSX design exactly
  const colors = darkColors;

  const [favorites, setFavorites] = useState<FavoriteSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const data = await fetchFavorites();
      setFavorites(data.favorites || []);
    } catch (error) {
      console.error('[Favorites] Error loading favorites:', error);
      if (error instanceof ApiError) {
        Alert.alert(t('common.error'), error.message);
      } else {
        Alert.alert(t('common.error'), t('favorites.loadError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  }, []);

  const handleRemoveFavorite = async (supplierId: string, supplierName: string) => {
    // Confirm removal
    Alert.alert(
      t('favorites.removeTitle'),
      `${t('favorites.removeMessage')} ${supplierName}?`,
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('favorites.remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              setRemovingId(supplierId);
              await removeFavorite(supplierId);
              
              // Animate removal
              setFavorites((prev) => prev.filter((f) => f.id !== supplierId));
              
              // Show success message
              Alert.alert(t('common.success'), t('favorites.removed'));
            } catch (error) {
              console.error('[Favorites] Error removing favorite:', error);
              if (error instanceof ApiError) {
                Alert.alert(t('common.error'), error.message);
              } else {
                Alert.alert(t('common.error'), t('favorites.removeError'));
              }
            } finally {
              setRemovingId(null);
            }
          },
        },
      ]
    );
  };

  const handleCardPress = (supplierId: string) => {
    router.push(`/services/suppliers/${supplierId}`);
  };

  const handleBookPress = (supplierId: string) => {
    // Navigate to supplier detail where user can start booking
    router.push(`/services/suppliers/${supplierId}`);
  };

  const formatPrice = (hourlyRate?: number): string => {
    if (!hourlyRate) return '$0/hr';
    return `$${hourlyRate}/hr`;
  };

  const getServiceName = (supplier: FavoriteSupplier): string => {
    // Try to get service category name, fallback to service_category field
    return supplier.service_category || t('favorites.service');
  };

  const formatRating = (rating: number | string | null | undefined): string => {
    // Convert rating to number safely
    const ratingValue = typeof rating === 'number' 
      ? rating 
      : (typeof rating === 'string' ? parseFloat(rating) : 0);
    const safeRating = isNaN(ratingValue) ? 0 : ratingValue;
    return safeRating.toFixed(1);
  };

  if (loading && favorites.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('profile.favorites')}</Text>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header - Exact match to JSX: padding: '50px 20px 20px', display: 'flex', gap: '16px' */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.favorites')}</Text>
      </View>

      {favorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="heart-outline"
            title={t('favorites.emptyTitle')}
            description={t('favorites.emptyDescription')}
          />
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => router.push('/services/categories')}
          >
            <Text style={styles.exploreButtonText}>
              {t('favorites.exploreProviders')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {favorites.map((provider) => (
            <View
              key={provider.id}
              style={[
                styles.providerCard,
                { backgroundColor: colors.bgCard },
                removingId === provider.id && styles.removingCard,
              ]}
            >
              {/* Card Content - Exact match to JSX layout */}
              <View style={styles.cardContent}>
                {/* Photo on the left - Exact match: width: '64px', height: '64px', borderRadius: '50%' */}
                <TouchableOpacity
                  onPress={() => handleCardPress(provider.id)}
                  activeOpacity={0.7}
                >
                  {provider.profile_image ? (
                    <Image
                      source={{ uri: provider.profile_image }}
                      style={styles.providerPhoto}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.providerPhoto, { backgroundColor: colors.bgInput }]}>
                      <Ionicons name="person" size={28} color={colors.textSecondary} />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Info in the middle */}
                <View style={styles.providerInfo}>
                  <Text style={styles.providerName}>{provider.full_name}</Text>
                  <Text style={[styles.providerService, { color: colors.secondary }]}>
                    {getServiceName(provider)}
                  </Text>
                  <View style={styles.ratingContainer}>
                    <Text style={[styles.rating, { color: colors.accent }]}>
                      ⭐ {formatRating(provider.rating)} ({provider.total_reviews || 0})
                    </Text>
                    <Text style={[styles.jobsCount, { color: colors.textSecondary }]}>
                      • {provider.jobs_with_user || 0} {t('favorites.jobs')}
                    </Text>
                  </View>
                </View>

                {/* Heart and price on the right - Exact match to JSX */}
                <View style={styles.rightSection}>
                  <TouchableOpacity
                    onPress={() => handleRemoveFavorite(provider.id, provider.full_name)}
                    disabled={removingId === provider.id}
                    style={styles.heartButton}
                  >
                    <Text style={styles.heartIcon}>❤️</Text>
                  </TouchableOpacity>
                  <Text style={[styles.price, { color: colors.textPrimary }]}>
                    {formatPrice(provider.hourly_rate)}
                  </Text>
                </View>
              </View>

              {/* Book button below - Exact match: width: '100%', padding: '12px' */}
              <TouchableOpacity
                style={[styles.bookButton, { backgroundColor: colors.primary }]}
                onPress={() => handleBookPress(provider.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.bookButtonText}>{t('favorites.book')}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header - Exact match: padding: '50px 20px 20px', display: 'flex', gap: '16px'
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    padding: 4,
  },
  // Title - Exact match: fontSize: '20px', fontWeight: '600'
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff', // Hardcode white to match JSX
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Space for bottom nav
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  exploreButton: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#3b82f6', // Hardcode primary color
    borderRadius: 12,
  },
  exploreButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  // Provider Card - Exact match: backgroundColor: bgCard, borderRadius: '16px', padding: '16px', marginBottom: '12px'
  providerCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  removingCard: {
    opacity: 0.5,
  },
  // Card Content - Exact match: display: 'flex', gap: '14px', marginBottom: '12px'
  cardContent: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 12,
  },
  // Photo - Exact match: width: '64px', height: '64px', borderRadius: '50%'
  providerPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerInfo: {
    flex: 1,
  },
  // Name - Exact match: fontSize: '16px', fontWeight: '600'
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff', // Hardcode white
    marginBottom: 4,
  },
  // Service - Exact match: fontSize: '14px', color: secondary
  providerService: {
    fontSize: 14,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // Rating - Exact match: fontSize: '13px', color: accent
  rating: {
    fontSize: 13,
  },
  // Jobs count - Exact match: fontSize: '12px', color: textSecondary
  jobsCount: {
    fontSize: 12,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  heartButton: {
    padding: 4,
  },
  // Heart - Exact match: fontSize: '20px', color: danger
  heartIcon: {
    fontSize: 20,
  },
  // Price - Exact match: fontSize: '14px', fontWeight: '600', marginTop: '8px'
  price: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  // Book Button - Exact match: width: '100%', padding: '12px', borderRadius: '10px'
  bookButton: {
    width: '100%',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookButtonText: {
    color: '#ffffff', // Hardcode white
    fontSize: 14,
    fontWeight: '600',
  },
});
