import { ProviderCard } from '@/components/ProviderCard';
import { ApiError, CategoryWithSubcategories, fetchCategoryWithSubcategories } from '@/services/categories';
import { useTheme } from '@/contexts/ThemeContext';
import { getAddresses } from '@/services/addresses';
import { fetchSuppliers, Supplier } from '@/services/suppliers';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';

export default function CategoryDetailScreen() {
  const router = useRouter();
  const { colorScheme } = useTheme();
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const insets = useSafeAreaInsets();
  const [categoryData, setCategoryData] = useState<CategoryWithSubcategories | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'price' | 'distance'>('price');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // Use exact colors from JSX design
  const colors = {
    bg: '#1a1a2e',
    bgCard: '#252542',
    bgInput: '#2d2d4a',
    primary: '#3b82f6',
    secondary: '#10b981',
    accent: '#f59e0b',
    danger: '#ef4444',
    textSecondary: '#9ca3af',
    border: '#374151',
    textPrimary: '#FFFFFF',
  };

  useEffect(() => {
    if (categoryId) {
      loadUserLocation();
      loadData();
    }
  }, [categoryId, sortBy, selectedSubcategory]);

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
      console.error('[CategoryDetail] Failed to load user location:', error);
    }
  };

  const loadData = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/services/[categoryId]/index.tsx:70',message:'loadData entry',data:{categoryId,selectedSubcategory,sortBy},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    try {
      setLoading(true);
      setError(null);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/services/[categoryId]/index.tsx:75',message:'loadData before Promise.all',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const [catData, suppliersData] = await Promise.all([
        fetchCategoryWithSubcategories(categoryId),
        fetchSuppliers({ 
          category: selectedSubcategory || categoryId,
          sort_by: sortBy === 'distance' ? 'distance' : 'price',
          near_me: sortBy === 'distance' && userLocation !== null,
          user_lat: sortBy === 'distance' && userLocation ? userLocation.lat : undefined,
          user_lng: sortBy === 'distance' && userLocation ? userLocation.lng : undefined,
        }),
      ]);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/services/[categoryId]/index.tsx:87',message:'loadData after Promise.all',data:{hasCatData:!!catData,hasSuppliersData:!!suppliersData,suppliersLength:suppliersData?.suppliers?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      setCategoryData(catData);
      // Safely handle suppliers data - ensure it's always an array
      const suppliersList = Array.isArray(suppliersData?.suppliers) ? suppliersData.suppliers : [];
      setSuppliers(suppliersList);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/services/[categoryId]/index.tsx:92',message:'loadData success',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/services/[categoryId]/index.tsx:94',message:'loadData catch',data:{errorName:err instanceof Error?err.name:'unknown',errorMessage:err instanceof Error?err.message:String(err),isApiError:err instanceof ApiError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSupplierPress = (supplierId: string) => {
    router.push(`/services/suppliers/${supplierId}`);
  };

  const handleBookPress = (supplierId: string) => {
    router.push(`/services/suppliers/${supplierId}`);
  };

  const handleSubcategoryPress = (subcategoryId: string) => {
    setSelectedSubcategory(subcategoryId === selectedSubcategory ? null : subcategoryId);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
        </View>
      </View>
    );
  }

  if (error || !categoryData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error || 'Category not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.bgCard, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{categoryData.category.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Subcategories (if any) */}
      {categoryData.subcategories.length > 0 && (
        <View style={styles.subcategoriesSection}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Subcategories</Text>
          <FlatList
            data={categoryData.subcategories}
            renderItem={({ item }) => {
              const isSelected = selectedSubcategory === item.id;
              return (
                <TouchableOpacity
                  style={[
                    styles.subcategoryChip,
                    {
                      backgroundColor: isSelected ? colors.secondary : colors.bgCard,
                      borderColor: isSelected ? colors.secondary : colors.border,
                    },
                  ]}
                  onPress={() => handleSubcategoryPress(item.id)}
                >
                  <Text
                    style={[
                      styles.subcategoryText,
                      {
                        color: isSelected ? '#FFFFFF' : colors.textPrimary,
                      },
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subcategoriesContent}
          />
        </View>
      )}

      {/* Sort Options */}
      <View style={[styles.sortContainer, { backgroundColor: colors.bgCard, borderBottomColor: colors.border }]}>
        <Text style={[styles.sortLabel, { color: colors.textSecondary }]}>Sort by:</Text>
        <TouchableOpacity
          style={[
            styles.sortButton,
            { backgroundColor: '#374151' },
            sortBy === 'price' && styles.sortButtonActive,
          ]}
          onPress={() => setSortBy('price')}
        >
          <Text
            style={[
              styles.sortButtonText,
              { color: colors.textPrimary },
              sortBy === 'price' && styles.sortButtonTextActive,
            ]}
          >
            Price
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.sortButton,
            { backgroundColor: '#374151' },
            sortBy === 'distance' && styles.sortButtonActive,
          ]}
          onPress={() => setSortBy('distance')}
        >
          <Text
            style={[
              styles.sortButtonText,
              { color: colors.textPrimary },
              sortBy === 'distance' && styles.sortButtonTextActive,
            ]}
          >
            Distance
          </Text>
        </TouchableOpacity>
      </View>

      {/* Suppliers List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: '#EF4444' }]}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
          data={suppliers}
          renderItem={({ item }) => (
            <ProviderCard
              supplier={item}
              onPress={() => handleSupplierPress(item.id)}
              onBookPress={() => handleBookPress(item.id)}
            />
          )}
          keyExtractor={(item) => item.id}
          estimatedItemSize={140}
          contentContainerStyle={styles.suppliersSection}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No suppliers found for this category
              </Text>
            </View>
          )}
          ListFooterComponent={<View style={{ height: insets.bottom + 20 }} />}
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
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  subcategoriesSection: {
    paddingVertical: 16,
    paddingLeft: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  subcategoriesContent: {
    paddingRight: 20,
    gap: 8,
  },
  subcategoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  subcategoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  sortLabel: {
    fontSize: 14,
    marginRight: 12,
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  sortButtonActive: {
    backgroundColor: '#10b981',
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: '#FFFFFF',
  },
  suppliersSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
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




