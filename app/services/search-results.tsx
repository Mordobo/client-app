import { ProviderCard } from '@/components/ProviderCard';
import { useTheme } from '@/contexts/ThemeContext';
import { t } from '@/i18n';
import { getAddresses } from '@/services/addresses';
import { ApiError, fetchSuppliers, Supplier } from '@/services/suppliers';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';

type FilterType = 'all' | 'near_me' | 'top_rated' | 'low_price' | 'available_today';

interface FilterOption {
  id: FilterType;
  label: string;
  sortBy?: 'rating' | 'price' | 'distance' | 'reviews';
  availableToday?: boolean;
  nearMe?: boolean;
}

const FILTERS: FilterOption[] = [
  { id: 'all', label: t('searchResults.all') },
  { id: 'near_me', label: t('searchResults.nearMe'), nearMe: true, sortBy: 'distance' },
  { id: 'top_rated', label: t('searchResults.topRated'), sortBy: 'rating' },
  { id: 'low_price', label: t('searchResults.lowPrice'), sortBy: 'price' },
  { id: 'available_today', label: t('searchResults.availableToday'), availableToday: true },
];

export default function SearchResultsScreen() {
  const router = useRouter();
  const { colorScheme } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ 
    query?: string; 
    category?: string;
  }>();

  const [searchQuery, setSearchQuery] = useState(params.query || '');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const LIMIT = 20;
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  const isDark = colorScheme === 'dark';
  const colors = {
    bg: isDark ? '#1a1a2e' : '#F9FAFB',
    bgCard: isDark ? '#252542' : '#FFFFFF',
    bgInput: isDark ? '#2d2d4a' : '#F3F4F6',
    primary: '#3b82f6',
    secondary: '#10b981',
    textPrimary: isDark ? '#FFFFFF' : '#1F2937',
    textSecondary: isDark ? '#9ca3af' : '#6B7280',
    border: isDark ? '#374151' : '#E5E7EB',
  };

  // Load user's default address for location
  useEffect(() => {
    loadUserLocation();
  }, []);

  const loadUserLocation = async () => {
    try {
      const addresses = await getAddresses();
      const defaultAddress = addresses.find((addr) => addr.is_default) || addresses[0];
      
      if (defaultAddress?.latitude && defaultAddress?.longitude) {
        setUserLocation({
          lat: defaultAddress.latitude,
          lng: defaultAddress.longitude,
        });
      }
    } catch (error) {
      console.error('[SearchResults] Failed to load user location:', error);
    }
  };

  // Load suppliers when filters or search change
  useEffect(() => {
    // Debounce search query
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      loadSuppliers(true);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, activeFilter, params.category]);

  const loadSuppliers = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setOffset(0);
        setSuppliers([]);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const filter = FILTERS.find((f) => f.id === activeFilter);
      const currentOffset = reset ? 0 : offset;

      const response = await fetchSuppliers({
        category: params.category,
        query: searchQuery.trim() || undefined,
        sort_by: filter?.sortBy,
        available_today: filter?.availableToday,
        near_me: filter?.nearMe && userLocation !== null,
        user_lat: filter?.nearMe && userLocation ? userLocation.lat : undefined,
        user_lng: filter?.nearMe && userLocation ? userLocation.lng : undefined,
        limit: LIMIT,
        offset: currentOffset,
      });

      if (reset) {
        setSuppliers(response.suppliers);
      } else {
        setSuppliers((prev) => [...prev, ...response.suppliers]);
      }

      setTotal(response.total);
      setOffset(currentOffset + response.suppliers.length);
      setHasMore(response.suppliers.length === LIMIT && currentOffset + response.suppliers.length < response.total);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t('errors.requestFailed'));
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleFilterPress = (filterId: FilterType) => {
    setActiveFilter(filterId);
  };

  const handleProviderPress = (supplierId: string) => {
    router.push(`/services/suppliers/${supplierId}`);
  };

  const handleBookPress = (supplierId: string) => {
    // Navigate to booking flow
    router.push(`/services/suppliers/${supplierId}`);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadSuppliers(false);
    }
  };

  const renderFilterPill = ({ item }: { item: FilterOption }) => {
    const isActive = activeFilter === item.id;
    return (
      <TouchableOpacity
        style={[
          styles.filterPill,
          {
            backgroundColor: isActive ? colors.primary : colors.bgCard,
            borderColor: isActive ? colors.primary : colors.border,
          },
        ]}
        onPress={() => handleFilterPress(item.id)}
      >
        <Text
          style={[
            styles.filterPillText,
            {
              color: isActive ? '#FFFFFF' : colors.textPrimary,
            },
          ]}
        >
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderProviderCard = ({ item }: { item: Supplier }) => (
    <ProviderCard
      supplier={item}
      onPress={() => handleProviderPress(item.id)}
      onBookPress={() => handleBookPress(item.id)}
    />
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    
    return (
      <View style={styles.emptyState}>
        <Ionicons name="search-outline" size={64} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.textPrimary }]}>
          {t('searchResults.noResults')}
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
          {t('searchResults.noResultsDesc')}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 16),
            backgroundColor: colors.bgCard,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.searchContainer}>
          <View style={[styles.searchInputContainer, { backgroundColor: colors.bgCard }]}>
            <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder={t('searchResults.searchPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity
            style={[styles.filtersButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              // TODO: Open advanced filters modal
            }}
          >
            <Ionicons name="options" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Pills */}
      <View style={styles.filtersContainer}>
        <FlatList
          data={FILTERS}
          renderItem={renderFilterPill}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        />
      </View>

      {/* Results Counter */}
      {!loading && (
        <View style={styles.resultsCounter}>
          <Text style={[styles.resultsText, { color: colors.textSecondary }]}>
            {total === 1
              ? t('searchResults.providerFound', { count: total })
              : t('searchResults.providersFound', { count: total })}
          </Text>
        </View>
      )}

      {/* Suppliers List */}
      {loading && suppliers.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {t('searchResults.loading')}
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: '#EF4444' }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => loadSuppliers(true)}
          >
            <Text style={styles.retryText}>{t('chat.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
          data={suppliers}
          renderItem={renderProviderCard}
          keyExtractor={(item) => item.id}
          estimatedItemSize={140}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#374151',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filtersButton: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersContainer: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  filtersContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '500',
  },
  resultsCounter: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  resultsText: {
    fontSize: 14,
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
