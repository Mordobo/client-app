import { ApiError, Category, fetchCategories } from '@/services/categories';
import { fetchSuppliers } from '@/services/suppliers';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { t } from '@/i18n';

type ViewMode = 'grid' | 'list';

// Helper to convert hex color to rgba with opacity
const hexToRgba = (hex: string, opacity: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Map category name_key or icon names to emojis (matching design)
const CATEGORY_EMOJI_MAP: Record<string, string> = {
  // By name_key
  cleaning: '🧹',
  limpieza: '🧹',
  plumbing: '🔧',
  plomeria: '🔧',
  electrical: '⚡',
  electrico: '⚡',
  painting: '🎨',
  pintura: '🎨',
  'air-conditioning': '❄️',
  'a/c': '❄️',
  gardening: '🪴',
  jardin: '🪴',
  locksmith: '🔒',
  cerrajero: '🔒',
  moving: '📦',
  mudanza: '📦',
  carpentry: '🪚',
  carpinteria: '🪚',
  masonry: '🧱',
  albanileria: '🧱',
  fumigation: '🪲',
  fumigacion: '🪲',
  waterproofing: '💧',
  impermeabilizacion: '💧',
  'tv-installation': '📺',
  'instalacion-tv': '📺',
  'internet-networks': '📡',
  'internet-redes': '📡',
  security: '🛡️',
  seguridad: '🛡️',
  pools: '🏊',
  piscinas: '🏊',
  // By icon name (Ionicons)
  sparkles: '🧹',
  construct: '🔧',
  flash: '⚡',
  brush: '🎨',
  car: '🚗',
  leaf: '🪴',
  home: '🏠',
  cube: '📦',
  settings: '⚙️',
  cut: '✂️',
  paw: '🐾',
  flower: '🌺',
};

// Get emoji for category
const getCategoryEmoji = (category: Category): string => {
  // First try name_key
  if (category.name_key) {
    const key = category.name_key.toLowerCase();
    if (CATEGORY_EMOJI_MAP[key]) {
      return CATEGORY_EMOJI_MAP[key];
    }
  }
  // Then try icon name
  if (category.icon) {
    const iconKey = category.icon.toLowerCase();
    if (CATEGORY_EMOJI_MAP[iconKey]) {
      return CATEGORY_EMOJI_MAP[iconKey];
    }
    // If icon is already an emoji (contains emoji characters), return it
    if (/[\u{1F300}-\u{1F9FF}]/u.test(category.icon)) {
      return category.icon;
    }
  }
  // Fallback to default
  return '📋';
};

export default function CategoriesScreen() {
  const router = useRouter();
  const { colorScheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [providerCounts, setProviderCounts] = useState<Record<string, number>>({});

  const isDark = colorScheme === 'dark';
  // Dark theme colors matching the design exactly
  const bgColor = isDark ? '#1a1a2e' : '#F9FAFB';
  const cardBg = isDark ? '#252542' : '#FFFFFF';
  const textPrimary = isDark ? '#FFFFFF' : '#1F2937';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
  const borderColor = isDark ? '#374151' : '#E5E7EB';
  const primaryColor = '#3b82f6';
  const inputBg = isDark ? '#252542' : '#FFFFFF';

  // Load categories on mount
  React.useEffect(() => {
    loadCategories();
  }, []);

  // Filter categories based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return categories;
    }
    return categories.filter((cat) =>
      cat.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, categories]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCategories();
      setCategories(data);
      
      // Load provider counts for each category in parallel
      loadProviderCounts(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t('errors.connectionFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const loadProviderCounts = async (categoriesData: Category[]) => {
    try {
      // Fetch counts for all categories in parallel
      const countPromises = categoriesData.map(async (category) => {
        try {
          const response = await fetchSuppliers({
            category: category.id,
            limit: 1, // We only need the total count
          });
          // Safely extract total count
          const total = typeof response?.total === 'number' ? response.total : 0;
          return { categoryId: category.id, count: total };
        } catch (error) {
          console.error(`[Categories] Failed to load count for category ${category.id}:`, error);
          return { categoryId: category.id, count: 0 };
        }
      });

      const counts = await Promise.all(countPromises);
      const countsMap: Record<string, number> = {};
      counts.forEach(({ categoryId, count }) => {
        countsMap[categoryId] = count;
      });
      setProviderCounts(countsMap);
    } catch (error) {
      console.error('[Categories] Failed to load provider counts:', error);
      // Don't show error to user, just log it
    }
  };

  const handleCategoryPress = (category: Category) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/services/categories.tsx:188',message:'handleCategoryPress entry',data:{categoryId:category.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    try {
      // Validate category ID before navigation
      if (!category?.id || typeof category.id !== 'string') {
        console.error('[Categories] Invalid category ID:', category);
        return;
      }
      
      setSelectedCategory(category.id);
      // Navigate to category services screen
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/services/categories.tsx:192',message:'handleCategoryPress before push',data:{route:`/services/${category.id}`},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      router.push(`/services/${category.id}`).catch((navError) => {
        console.error('[Categories] Navigation error:', navError);
      });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/services/categories.tsx:194',message:'handleCategoryPress after push',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/services/categories.tsx:197',message:'handleCategoryPress catch',data:{errorName:error instanceof Error?error.name:'unknown',errorMessage:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      console.error('[Categories] Error in handleCategoryPress:', error);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // Render category card for grid view
  const renderGridItem = ({ item: category }: { item: Category }) => {
    const isSelected = selectedCategory === category.id;
    const iconBgColor = hexToRgba(category.color, 0.2);
    const emoji = getCategoryEmoji(category);
    const providerCount = providerCounts[category.id] ?? 0;

    return (
      <TouchableOpacity
        style={[
          styles.gridCard,
          {
            backgroundColor: cardBg,
            borderColor: isSelected ? primaryColor : 'transparent',
            borderWidth: isSelected ? 2 : 0,
          },
        ]}
        onPress={() => handleCategoryPress(category)}
        activeOpacity={0.7}
      >
        {/* Icon Container */}
        <View
          style={[
            styles.gridIconContainer,
            {
              backgroundColor: iconBgColor,
            },
          ]}
        >
          <Text style={styles.gridIcon}>{emoji}</Text>
        </View>

        {/* Category Name */}
        <Text
          style={[styles.gridCategoryName, { color: textPrimary }]}
          numberOfLines={2}
        >
          {category.name}
        </Text>

        {/* Provider Count */}
        {providerCount > 0 && (
          <Text style={[styles.gridProviderCount, { color: textSecondary }]}>
            {providerCount === 1
              ? t('categories.providerAvailable', { count: providerCount })
              : t('categories.providersAvailable', { count: providerCount })}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  // Render category row for list view
  const renderListItem = ({ item: category }: { item: Category }) => {
    const isSelected = selectedCategory === category.id;
    const iconBgColor = hexToRgba(category.color, 0.2);
    const emoji = getCategoryEmoji(category);
    const providerCount = providerCounts[category.id] ?? 0;

    return (
      <TouchableOpacity
        style={[
          styles.listCard,
          {
            backgroundColor: cardBg,
            borderColor: isSelected ? primaryColor : 'transparent',
            borderWidth: isSelected ? 2 : 0,
          },
        ]}
        onPress={() => handleCategoryPress(category)}
        activeOpacity={0.7}
      >
        {/* Icon Container */}
        <View
          style={[
            styles.listIconContainer,
            {
              backgroundColor: iconBgColor,
            },
          ]}
        >
          <Text style={styles.listIcon}>{emoji}</Text>
        </View>

        {/* Category Info */}
        <View style={styles.listInfo}>
          <Text
            style={[styles.listCategoryName, { color: textPrimary }]}
            numberOfLines={1}
          >
            {category.name}
          </Text>
          {providerCount > 0 && (
            <Text style={[styles.listProviderCount, { color: textSecondary }]}>
              {providerCount === 1
                ? t('categories.providerAvailable', { count: providerCount })
                : t('categories.providersAvailable', { count: providerCount })}
            </Text>
          )}
        </View>

        {/* Arrow */}
        <View
          style={[
            styles.listArrowContainer,
            {
              backgroundColor: isDark ? '#2d2d4a' : '#F3F4F6',
            },
          ]}
        >
          <Ionicons name="chevron-forward" size={16} color={textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  // Empty state component
  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <View
        style={[
          styles.emptyStateIconContainer,
          {
            backgroundColor: cardBg,
          },
        ]}
      >
        <Ionicons name="search-outline" size={36} color={textSecondary} />
      </View>
      <Text style={[styles.emptyStateTitle, { color: textPrimary }]}>
        {t('categories.notFound')}
      </Text>
      <Text style={[styles.emptyStateMessage, { color: textSecondary }]}>
        {t('categories.noCategoriesMatch', { query: searchQuery })}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <View style={styles.centerContainer}>
          <Text style={[styles.errorText, { color: textPrimary }]}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadCategories}>
            <Text style={styles.retryText}>{t('chat.retry')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[
            styles.backButton,
            {
              backgroundColor: cardBg,
            },
          ]}
        >
          <Ionicons name="arrow-back" size={20} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>
          {t('categories.title')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchInputContainer,
            {
              backgroundColor: inputBg,
              borderColor: borderColor,
            },
          ]}
        >
          <Ionicons
            name="search"
            size={16}
            color={textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, { color: textPrimary }]}
            placeholder={t('categories.searchCategoryPlaceholder')}
            placeholderTextColor={textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color={textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories Count and View Toggle */}
      <View style={styles.viewToggleContainer}>
        <Text style={[styles.categoriesCount, { color: textSecondary }]}>
          {filteredCategories.length === 1
            ? t('categories.availableOne', { count: filteredCategories.length })
            : t('categories.available', { count: filteredCategories.length })}
        </Text>
        <View style={styles.toggleButtons}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              {
                backgroundColor: viewMode === 'grid' ? primaryColor : cardBg,
              },
            ]}
            onPress={() => setViewMode('grid')}
          >
            <Text
              style={[
                styles.toggleButtonText,
                {
                  color: viewMode === 'grid' ? '#FFFFFF' : textSecondary,
                },
              ]}
            >
              {t('categories.grid')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              {
                backgroundColor: viewMode === 'list' ? primaryColor : cardBg,
              },
            ]}
            onPress={() => setViewMode('list')}
          >
            <Text
              style={[
                styles.toggleButtonText,
                {
                  color: viewMode === 'list' ? '#FFFFFF' : textSecondary,
                },
              ]}
            >
              {t('categories.list')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Categories List/Grid */}
      {filteredCategories.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlashList
          data={filteredCategories}
          renderItem={viewMode === 'grid' ? renderGridItem : renderListItem}
          keyExtractor={(item) => item.id}
          numColumns={viewMode === 'grid' ? 3 : 1}
          estimatedItemSize={viewMode === 'grid' ? 160 : 80}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={<View style={{ height: 100 + insets.bottom }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  clearButton: {
    marginLeft: 8,
  },
  viewToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  categoriesCount: {
    fontSize: 13,
  },
  toggleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  // Grid View Styles - Matching design exactly
  gridCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    margin: 4,
    minHeight: 160,
    justifyContent: 'center',
  },
  gridIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gridIcon: {
    fontSize: 28,
    lineHeight: 28,
  },
  gridCategoryName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 16,
  },
  gridProviderCount: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
  },
  // List View Styles
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    minHeight: 80,
  },
  listIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  listIcon: {
    fontSize: 24,
  },
  listInfo: {
    flex: 1,
  },
  listCategoryName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  listProviderCount: {
    fontSize: 12,
  },
  listArrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  // Empty State
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
  },
  emptyStateIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
