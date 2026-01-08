import { ApiError, CategoryWithSubcategories, fetchCategoryWithSubcategories } from '@/services/categories';
import { useTheme } from '@/contexts/ThemeContext';
import { getOrCreateConversation } from '@/services/conversations';
import { fetchSuppliers, Supplier } from '@/services/suppliers';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
  const [startingChatWith, setStartingChatWith] = useState<string | null>(null);
  
  const isDark = colorScheme === 'dark';
  const themeColors = {
    background: isDark ? '#151718' : '#F9FAFB',
    surface: isDark ? '#1F2937' : '#FFFFFF',
    textPrimary: isDark ? '#ECEDEE' : '#1F2937',
    textSecondary: isDark ? '#9BA1A6' : '#6B7280',
    border: isDark ? '#374151' : '#E5E7EB',
    borderLight: isDark ? '#4B5563' : '#F3F4F6',
  };

  useEffect(() => {
    if (categoryId) {
      loadData();
    }
  }, [categoryId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [catData, suppliersData] = await Promise.all([
        fetchCategoryWithSubcategories(categoryId),
        fetchSuppliers({ category: categoryId }),
      ]);
      
      setCategoryData(catData);
      setSuppliers(suppliersData.suppliers);
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

  const handleSupplierPress = (supplierId: string) => {
    router.push(`/services/suppliers/${supplierId}`);
  };

  const handleStartChat = async (supplierId: string) => {
    if (startingChatWith) return;
    
    setStartingChatWith(supplierId);
    try {
      const { conversation } = await getOrCreateConversation(supplierId);
      router.push(`/chat/${conversation.id}`);
    } catch (err) {
      console.error('Error starting chat:', err);
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
    } finally {
      setStartingChatWith(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      </View>
    );
  }

  if (error || !categoryData) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
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
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16), backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>{categoryData.category.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Subcategories (if any) */}
        {categoryData.subcategories.length > 0 && (
          <View style={styles.subcategoriesSection}>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Subcategories</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categoryData.subcategories.map((sub) => (
                <TouchableOpacity key={sub.id} style={[styles.subcategoryChip, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                  <Text style={[styles.subcategoryText, { color: themeColors.textPrimary }]}>{sub.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Sort Options */}
        <View style={[styles.sortContainer, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
          <Text style={[styles.sortLabel, { color: themeColors.textSecondary }]}>Sort by:</Text>
          <TouchableOpacity
            style={[styles.sortButton, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }, sortBy === 'price' && styles.sortButtonActive]}
            onPress={() => setSortBy('price')}
          >
            <Text style={[styles.sortButtonText, { color: themeColors.textPrimary }, sortBy === 'price' && styles.sortButtonTextActive]}>
              Price
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }, sortBy === 'distance' && styles.sortButtonActive]}
            onPress={() => setSortBy('distance')}
          >
            <Text style={[styles.sortButtonText, { color: themeColors.textPrimary }, sortBy === 'distance' && styles.sortButtonTextActive]}>
              Distance
            </Text>
          </TouchableOpacity>
        </View>

        {/* Suppliers List */}
        <View style={styles.suppliersSection}>
          {suppliers.map((supplier) => (
            <TouchableOpacity
              key={supplier.id}
              style={[styles.supplierCard, { backgroundColor: themeColors.surface }]}
              onPress={() => handleSupplierPress(supplier.id)}
            >
              <View style={styles.supplierHeader}>
                <Image
                  source={{ uri: supplier.profile_image || 'https://via.placeholder.com/100' }}
                  style={styles.supplierImage}
                />
                <View style={styles.supplierInfo}>
                  <Text style={[styles.supplierName, { color: themeColors.textPrimary }]}>{supplier.full_name}</Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={16} color="#F59E0B" />
                    <Text style={[styles.rating, { color: themeColors.textPrimary }]}>{Number(supplier.rating).toFixed(1)}</Text>
                    <Text style={[styles.reviewCount, { color: themeColors.textSecondary }]}>
                      ({supplier.total_reviews} reviews)
                    </Text>
                  </View>
                  {supplier.years_experience && (
                    <Text style={[styles.experience, { color: themeColors.textSecondary }]}>
                      {supplier.years_experience}+ years of experience
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.supplierFooter}>
                <TouchableOpacity
                  style={styles.viewDetailsButton}
                  onPress={() => handleSupplierPress(supplier.id)}
                >
                  <Text style={styles.viewDetailsText}>View Details</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.chatButton, { backgroundColor: isDark ? '#1F2937' : '#F0F9FF' }]}
                  onPress={() => handleStartChat(supplier.id)}
                  disabled={startingChatWith === supplier.id}
                >
                  {startingChatWith === supplier.id ? (
                    <ActivityIndicator size="small" color="#10B981" />
                  ) : (
                    <Ionicons name="chatbubble-outline" size={20} color="#10B981" />
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}

          {suppliers.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No suppliers found for this category</Text>
            </View>
          )}
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
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
  subcategoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
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
    backgroundColor: '#10B981',
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: '#FFFFFF',
  },
  suppliersSection: {
    padding: 20,
  },
  supplierCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  supplierHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  supplierImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  supplierInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  supplierName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 12,
    marginLeft: 4,
  },
  experience: {
    fontSize: 12,
  },
  supplierFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewDetailsButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  viewDetailsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  chatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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




