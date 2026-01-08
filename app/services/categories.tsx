import { ApiError, Category, fetchCategories } from '@/services/categories';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CategoriesScreen() {
  const router = useRouter();
  const { colorScheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const isDark = colorScheme === 'dark';
  const themeColors = {
    background: isDark ? '#151718' : '#F9FAFB',
    surface: isDark ? '#1F2937' : '#FFFFFF',
    textPrimary: isDark ? '#ECEDEE' : '#1F2937',
    textSecondary: isDark ? '#9BA1A6' : '#6B7280',
    border: isDark ? '#374151' : '#E5E7EB',
    icon: isDark ? '#9BA1A6' : '#374151',
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = categories.filter(cat =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCategories(filtered);
    } else {
      setFilteredCategories(categories);
    }
  }, [searchQuery, categories]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCategories();
      setCategories(data);
      setFilteredCategories(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load categories');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryPress = (category: Category) => {
    router.push(`/services/${category.id}`);
  };

  if (loading) {
    const themeColors = {
      background: isDark ? '#151718' : '#F9FAFB',
    };
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      </View>
    );
  }

  if (error) {
    const themeColors = {
      background: isDark ? '#151718' : '#F9FAFB',
      textPrimary: isDark ? '#ECEDEE' : '#1F2937',
    };
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={styles.centerContainer}>
          <Text style={[styles.errorText, { color: themeColors.textPrimary }]}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadCategories}>
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
        <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Categories</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: themeColors.surface }]}>
        <Ionicons name="search" size={20} color={themeColors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: themeColors.textPrimary }]}
          placeholder="Describe the service you need..."
          placeholderTextColor={themeColors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Categories Grid */}
        <View style={styles.categoriesGrid}>
          {filteredCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[styles.categoryCard, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}
              onPress={() => handleCategoryPress(category)}
            >
              <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
                <Ionicons name={category.icon as any} size={32} color="white" />
              </View>
              <Text style={[styles.categoryName, { color: themeColors.textPrimary }]}>{category.name}</Text>
              <Ionicons name="chevron-forward" size={20} color={themeColors.textSecondary} />
            </TouchableOpacity>
          ))}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  categoriesGrid: {
    flexDirection: 'column',
    gap: 12,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  categoryName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
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






