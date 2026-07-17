import { useTheme } from "@/contexts/ThemeContext";
import { t } from "@/i18n";
import { ApiError, Category, CategoryTreeItem, fetchCategoriesTree } from "@/services/categories";
import { fetchSuppliers } from "@/services/suppliers";
import { getCategoryColor, getCategoryDisplayName, getCategoryEmoji } from "@/utils/categoryDisplay";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type ViewMode = "grid" | "list";

const hexToRgba = (hex: string, opacity: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/** Lowercase + strip accents so "jardineria" matches "Jardinería". */
const normalizeForSearch = (s: string): string =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

export default function CategoriesScreen() {
  const router = useRouter();
  const { colorScheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<CategoryTreeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [providerCounts, setProviderCounts] = useState<Record<string, number>>({});

  const isDark = colorScheme === "dark";
  // Dark theme colors matching the design exactly
  const bgColor = isDark ? "#1a1a2e" : "#F9FAFB";
  const cardBg = isDark ? "#252542" : "#FFFFFF";
  const textPrimary = isDark ? "#FFFFFF" : "#1F2937";
  const textSecondary = isDark ? "#9CA3AF" : "#6B7280";
  const borderColor = isDark ? "#374151" : "#E5E7EB";
  const primaryColor = "#3b82f6";
  const inputBg = isDark ? "#252542" : "#FFFFFF";

  // Load categories on mount
  React.useEffect(() => {
    loadCategories();
  }, []);

  // Filter categories by search; full list in API order (sort_order)
  const filteredCategories = useMemo(() => {
    const q = normalizeForSearch(searchQuery);
    if (!q) return categories;
    // Match against the SAME label shown to the user (getCategoryDisplayName, which is the
    // translated name_key) plus the raw name/name_key, and also against subcategory names so
    // searching a subcategory surfaces its parent category. Accent-insensitive. (MDB-453)
    const matchesQuery = (cat: Category): boolean =>
      normalizeForSearch(getCategoryDisplayName(cat, t)).includes(q) ||
      normalizeForSearch(cat.name).includes(q) ||
      (cat.name_key ? normalizeForSearch(cat.name_key).includes(q) : false);
    return categories.filter(
      (cat) => matchesQuery(cat) || (cat.subcategories ?? []).some((sub) => matchesQuery(sub)),
    );
  }, [searchQuery, categories]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCategoriesTree();
      setCategories(data);

      // Load provider counts for each category in parallel
      loadProviderCounts(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t("errors.connectionFailed"));
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
          const total = typeof response?.total === "number" ? response.total : 0;
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
      console.error("[Categories] Failed to load provider counts:", error);
      // Don't show error to user, just log it
    }
  };

  const handleCategoryPress = (category: Category) => {
    try {
      // Validate category ID before navigation
      if (!category?.id || typeof category.id !== "string") {
        console.error("[Categories] Invalid category ID:", category);
        return;
      }

      setSelectedCategory(category.id);
      // Navigate to category services screen
      router.push(`/services/${category.id}`).catch((navError) => {
        console.error("[Categories] Navigation error:", navError);
      });
    } catch (error) {
      console.error("[Categories] Error in handleCategoryPress:", error);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  // Render category card for grid view
  const renderGridItem = ({ item: category }: { item: Category }) => {
    // Validate category data before rendering
    if (!category || !category.id) {
      return null;
    }

    const isSelected = selectedCategory === category.id;
    const categoryColor = getCategoryColor(category);
    const iconBgColor = hexToRgba(categoryColor, 0.2);
    const emoji = getCategoryEmoji(category);
    const providerCount = providerCounts[category.id] ?? 0;

    return (
      <TouchableOpacity
        style={[
          styles.gridCard,
          {
            backgroundColor: cardBg,
            borderColor: isSelected ? primaryColor : "transparent",
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
        <Text style={[styles.gridCategoryName, { color: textPrimary }]} numberOfLines={2}>
          {getCategoryDisplayName(category, t)}
        </Text>

        {/* Provider Count */}
        {providerCount > 0 && <Text style={[styles.gridProviderCount, { color: textSecondary }]}>{providerCount === 1 ? t("categories.providerAvailable", { count: providerCount }) : t("categories.providersAvailable", { count: providerCount })}</Text>}
      </TouchableOpacity>
    );
  };

  // Render category row for list view
  const renderListItem = ({ item: category }: { item: Category }) => {
    // Validate category data before rendering
    if (!category || !category.id) {
      return null;
    }

    const isSelected = selectedCategory === category.id;
    const categoryColor = getCategoryColor(category);
    const iconBgColor = hexToRgba(categoryColor, 0.2);
    const emoji = getCategoryEmoji(category);
    const providerCount = providerCounts[category.id] ?? 0;

    return (
      <TouchableOpacity
        style={[
          styles.listCard,
          {
            backgroundColor: cardBg,
            borderColor: isSelected ? primaryColor : "transparent",
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
          <Text style={[styles.listCategoryName, { color: textPrimary }]} numberOfLines={1}>
            {getCategoryDisplayName(category, t)}
          </Text>
          {providerCount > 0 && <Text style={[styles.listProviderCount, { color: textSecondary }]}>{providerCount === 1 ? t("categories.providerAvailable", { count: providerCount }) : t("categories.providersAvailable", { count: providerCount })}</Text>}
        </View>

        {/* Arrow */}
        <Ionicons name="chevron-forward" size={18} color={textSecondary} style={styles.listArrow} />
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
      <Text style={[styles.emptyStateTitle, { color: textPrimary }]}>{t("categories.notFound")}</Text>
      <Text style={[styles.emptyStateMessage, { color: textSecondary }]}>{t("categories.noCategoriesMatch", { query: searchQuery })}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["top", "bottom"]}>
        <View style={[styles.centerContainer, { backgroundColor: bgColor }]}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["top", "bottom"]}>
        <View style={[styles.centerContainer, { backgroundColor: bgColor }]}>
          <Text style={[styles.errorText, { color: textPrimary }]}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadCategories}>
            <Text style={styles.retryText}>{t("chat.retry")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
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
        <Text style={[styles.headerTitle, { color: textPrimary }]}>{t("categories.title")}</Text>
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
          <Ionicons name="search" size={16} color={textSecondary} style={styles.searchIcon} />
          <TextInput style={[styles.searchInput, { color: textPrimary }]} placeholder={t("categories.searchCategoryPlaceholder")} placeholderTextColor={textSecondary} value={searchQuery} onChangeText={setSearchQuery} autoCapitalize="none" autoCorrect={false} />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color={textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories Count and View Toggle */}
      <View style={styles.viewToggleContainer}>
        <Text style={[styles.categoriesCount, { color: textSecondary }]}>{filteredCategories.length === 1 ? t("categories.availableOne", { count: filteredCategories.length }) : t("categories.available", { count: filteredCategories.length })}</Text>
        <View style={styles.toggleButtons}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              {
                backgroundColor: viewMode === "grid" ? primaryColor : cardBg,
              },
            ]}
            onPress={() => setViewMode("grid")}
          >
            <Text
              style={[
                styles.toggleButtonText,
                {
                  color: viewMode === "grid" ? "#FFFFFF" : textSecondary,
                },
              ]}
            >
              {t("categories.grid")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              {
                backgroundColor: viewMode === "list" ? primaryColor : cardBg,
              },
            ]}
            onPress={() => setViewMode("list")}
          >
            <Text
              style={[
                styles.toggleButtonText,
                {
                  color: viewMode === "list" ? "#FFFFFF" : textSecondary,
                },
              ]}
            >
              {t("categories.list")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Categories List/Grid - FlatList only (FlashList uses AutoLayoutView not available on web) */}
      {filteredCategories.length === 0 ?
        <View style={[styles.emptyStateContainer, { backgroundColor: bgColor }]}>{renderEmptyState()}</View>
      : <FlatList
          data={filteredCategories}
          renderItem={viewMode === "grid" ? renderGridItem : renderListItem}
          keyExtractor={(item) => item?.id || `category-${Math.random()}`}
          numColumns={viewMode === "grid" ? 3 : 1}
          key={viewMode === "grid" ? "grid" : "list"}
          style={{ flex: 1, backgroundColor: bgColor }}
          contentContainerStyle={[styles.listContent, { backgroundColor: bgColor }]}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={<View style={{ height: insets.bottom + 20, backgroundColor: bgColor }} />}
        />
      }
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  categoriesCount: {
    fontSize: 13,
  },
  toggleButtons: {
    flexDirection: "row",
    gap: 8,
  },
  toggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: "600",
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
    alignItems: "center",
    margin: 4,
    minHeight: 160,
    justifyContent: "center",
  },
  gridIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  gridIcon: {
    fontSize: 28,
    lineHeight: 28,
  },
  gridCategoryName: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
    lineHeight: 16,
  },
  gridProviderCount: {
    fontSize: 10,
    textAlign: "center",
    lineHeight: 14,
  },
  // List View Styles - Improved UI with icon on the left
  listCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    minHeight: 72,
  },
  listIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    flexShrink: 0,
  },
  listIcon: {
    fontSize: 24,
    lineHeight: 24,
  },
  listInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  listCategoryName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    lineHeight: 20,
  },
  listProviderCount: {
    fontSize: 12,
    lineHeight: 16,
  },
  listArrow: {
    marginLeft: 12,
    flexShrink: 0,
  },
  // Empty State
  emptyStateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 60,
  },
  emptyStateIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateMessage: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#10B981",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
