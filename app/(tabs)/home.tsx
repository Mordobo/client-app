import { CategoryCard } from '@/components/CategoryCard';
import { TopProviderCard } from '@/components/TopProviderCard';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n';
import { Category, fetchCategories } from '@/services/categories';
import { Supplier, fetchSuppliers } from '@/services/suppliers';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

// Category mapping based on design specs - using emojis as per design
const CATEGORY_CONFIG: Record<string, { emoji: string; color: string }> = {
  cleaning: { emoji: '🧹', color: '#3B82F6' }, // blue
  plumbing: { emoji: '🔧', color: '#10B981' }, // green
  electrical: { emoji: '⚡', color: '#F59E0B' }, // orange
  painting: { emoji: '🎨', color: '#8B5CF6' }, // purple
  'air-conditioning': { emoji: '❄️', color: '#EC4899' }, // pink
  gardening: { emoji: '🪴', color: '#10B981' }, // green
  locksmith: { emoji: '🔒', color: '#EF4444' }, // red
  moving: { emoji: '📦', color: '#F59E0B' }, // orange
};

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<Category[]>([]);
  const [topProviders, setTopProviders] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('Piantini, Santo Domingo');

  useEffect(() => {
    loadCategories();
    loadTopProviders();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await fetchCategories();
      if (data && data.length > 0) {
        // Filter and map to show only the 8 specified categories
        const categoryMap = new Map<string, Category>();
        data.forEach((cat) => {
          const key = cat.name_key?.toLowerCase() || cat.name.toLowerCase();
          if (CATEGORY_CONFIG[key]) {
            categoryMap.set(key, cat);
          }
        });

        // Ensure we have the 8 categories in order
        const orderedCategories: Category[] = [];
        const categoryOrder = [
          'cleaning',
          'plumbing',
          'electrical',
          'painting',
          'air-conditioning',
          'gardening',
          'locksmith',
          'moving',
        ];

        categoryOrder.forEach((key) => {
          const cat = categoryMap.get(key);
          if (cat) {
            orderedCategories.push(cat);
          }
        });

        // If we don't have all 8, fill with available ones
        if (orderedCategories.length < 8) {
          data.forEach((cat) => {
            if (orderedCategories.length < 8 && !orderedCategories.find((c) => c.id === cat.id)) {
              orderedCategories.push(cat);
            }
          });
        }

        setCategories(orderedCategories.slice(0, 8));
      } else {
        console.warn('[Home] No categories returned from API');
        setCategories([]);
      }
    } catch (error) {
      console.error('[Home] Failed to load categories:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTopProviders = async () => {
    try {
      setProvidersLoading(true);
      const response = await fetchSuppliers({
        limit: 10,
        offset: 0,
      });
      if (response && response.suppliers) {
        // Sort by rating and take top 5
        const sorted = [...response.suppliers]
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
          .slice(0, 5);
        setTopProviders(sorted);
      }
    } catch (error) {
      console.error('[Home] Failed to load top providers:', error);
      setTopProviders([]);
    } finally {
      setProvidersLoading(false);
    }
  };

  const handleCategoryPress = (categoryId: string) => {
    router.push(`/services/${categoryId}`);
  };

  const handleViewAllCategories = () => {
    router.push('/services/categories');
  };

  const handleViewAllProviders = () => {
    router.push('/services/categories');
  };

  const handleSearchPress = () => {
    if (searchQuery.trim()) {
      router.push({
        pathname: '/services/categories',
        params: { search: searchQuery.trim() },
      });
    } else {
      router.push('/services/categories');
    }
  };

  const handleProviderPress = (supplierId: string) => {
    router.push(`/services/suppliers/${supplierId}`);
  };

  const getCategoryConfig = (category: Category) => {
    const key = category.name_key?.toLowerCase() || category.name.toLowerCase();
    return CATEGORY_CONFIG[key] || { emoji: '📋', color: '#6B7280' };
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#252542" />
      
      {/* Header with Location, Notifications and Search */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.header}>
          <View style={styles.locationSection}>
            <Text style={styles.locationLabel}>{t('home.locationLabel')}</Text>
            <TouchableOpacity style={styles.locationButton}>
              <Text style={styles.locationText}>{location}</Text>
              <Ionicons name="chevron-down" size={16} color="#9CA3AF" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <View style={styles.notificationIconContainer}>
              <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('home.searchPlaceholder')}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchPress}
            returnKeyType="search"
          />
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Categories Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('home.categories')}</Text>
            <TouchableOpacity onPress={handleViewAllCategories}>
              <Text style={styles.viewAllText}>{t('home.viewAll')}</Text>
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <ActivityIndicator size="small" color="#3B82F6" style={{ marginVertical: 20 }} />
          ) : categories.length > 0 ? (
            <View style={styles.categoriesGrid}>
              {categories.map((category) => {
                const config = getCategoryConfig(category);
                return (
                  <CategoryCard
                    key={category.id}
                    name={category.name}
                    emoji={config.emoji}
                    color={config.color}
                    onPress={() => handleCategoryPress(category.id)}
                  />
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>{t('home.noCategories')}</Text>
            </View>
          )}
        </View>

        {/* Promo Banner */}
        <View style={styles.promoSection}>
          <LinearGradient
            colors={['#3B82F6', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.promoBanner}
          >
            <Text style={styles.promoLabel}>{t('home.promoLabel')}</Text>
            <Text style={styles.promoDiscount}>{t('home.promoDiscount')}</Text>
            <Text style={styles.promoDescription}>{t('home.promoDescription')}</Text>
            <TouchableOpacity style={styles.promoButton}>
              <Text style={styles.promoButtonText}>{t('home.promoButton')}</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Top Providers Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('home.topProviders')}</Text>
            <TouchableOpacity onPress={handleViewAllProviders}>
              <Text style={styles.viewAllText}>{t('home.viewAll')}</Text>
            </TouchableOpacity>
          </View>
          
          {providersLoading ? (
            <ActivityIndicator size="small" color="#3B82F6" style={{ marginVertical: 20 }} />
          ) : topProviders.length > 0 ? (
            <View style={styles.providersList}>
              {topProviders.map((item) => (
                <TopProviderCard
                  key={item.id}
                  id={item.id}
                  name={item.full_name}
                  profileImage={item.profile_image}
                  serviceCategory={item.service_category}
                  rating={item.rating}
                  reviewCount={item.total_reviews}
                  hourlyRate={item.hourly_rate}
                  onPress={() => handleProviderPress(item.id)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>{t('home.noProviders')}</Text>
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
    backgroundColor: '#1a1a2e',
  },
  headerContainer: {
    backgroundColor: '#252542',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  locationSection: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  notificationButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2d2d4a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d4a',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollContent: {
    paddingBottom: 100, // Space for bottom navbar
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  promoSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  promoBanner: {
    borderRadius: 16,
    padding: 20,
    minHeight: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 4,
    opacity: 0.9,
  },
  promoDiscount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  promoDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
    opacity: 0.9,
  },
  promoButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  promoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  providersList: {
    gap: 0,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
