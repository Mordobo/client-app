import { CategoryCard } from '@/components/CategoryCard';
import { SearchBar } from '@/components/SearchBar';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n';
import { Category, fetchCategories } from '@/services/categories';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await fetchCategories();
      if (data && data.length > 0) {
        setCategories(data.slice(0, 9)); // Show 9 categories in 3x3 grid
      } else {
        console.warn('[Home] No categories returned from API');
        setCategories([]);
      }
    } catch (error) {
      console.error('[Home] Failed to load categories:', error);
      // Set empty array on error to prevent showing loading indefinitely
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryPress = (categoryId: string) => {
    router.push(`/services/${categoryId}`);
  };

  const handleOtherServices = () => {
    router.push('/services/categories');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={{ uri: user?.profileImage || 'https://via.placeholder.com/40' }}
            style={styles.avatar}
          />
          <Text style={styles.greeting}>{t('home.hello', { name: user?.firstName || 'Guest' })}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="chatbubble-outline" size={24} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchSection}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="What do you need today?"
          />
        </View>

        {/* Recommended Categories */}
        <View style={styles.categoriesContainer}>
          <Text style={styles.sectionTitle}>Recommended for you</Text>
          
          {loading ? (
            <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 20 }} />
          ) : categories.length > 0 ? (
            <View style={styles.categoriesGrid}>
              {categories.map((category) => (
                <CategoryCard
                  key={category.id}
                  name={category.name}
                  icon={category.icon}
                  color={category.color}
                  onPress={() => handleCategoryPress(category.id)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No services available at the moment</Text>
            </View>
          )}
        </View>

        {/* Other Services Button */}
        <TouchableOpacity style={styles.otherServicesButton} onPress={handleOtherServices}>
          <Text style={styles.otherServicesText}>OTHER SERVICES</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerRight: {
    flexDirection: 'row',
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  otherServicesButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    marginHorizontal: 20,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 24,
  },
  otherServicesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
