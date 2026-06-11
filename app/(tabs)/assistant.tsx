import { useAuth } from "@/contexts/AuthContext";
import { t } from "@/i18n";
import { Category, fetchCategories } from "@/services/categories";
import { getCategoryColor, getCategoryDisplayName, getCategoryEmoji } from "@/utils/categoryDisplay";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AssistantScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setCategoriesLoading(true);
        const data = await fetchCategories();
        if (!cancelled) setCategories(data.slice(0, 8));
      } catch (error) {
        if (!cancelled) setCategories([]);
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCategoryPress = (category: Category) => {
    if (category?.id) router.push(`/services/${category.id}`);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3B82F6" translucent={Platform.OS === "android"} />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>{t("home.hello", { name: user?.firstName || "Guest" })}</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="chatbubble-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Greeting Card */}
        <View style={styles.greetingCard}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={32} color="#10B981" />
          </View>
          <Text style={styles.greetingText}>{t("home.hello", { name: user?.firstName || "Guest" })}</Text>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9BA1A6" style={styles.searchIcon} />
          <TextInput style={styles.searchInput} placeholder={t("home.searchPlaceholder")} placeholderTextColor="#9BA1A6" value={searchQuery} onChangeText={setSearchQuery} />
        </View>

        {/* Suggestion Text */}
        <Text style={styles.suggestionText}>Try saying: "I need a plumber tomorrow morning"</Text>

        {/* Recommended Categories (from API) */}
        <View style={styles.categoriesContainer}>
          <Text style={styles.sectionTitle}>{t("home.recommendedForYou")}</Text>
          {categoriesLoading ?
            <ActivityIndicator size="small" color="#10B981" style={{ marginVertical: 16 }} />
          : <View style={styles.categoriesGrid}>
              {categories.map((category) => {
                const emoji = getCategoryEmoji(category);
                const color = getCategoryColor(category);
                return (
                  <TouchableOpacity key={category.id} style={styles.categoryItem} onPress={() => handleCategoryPress(category)}>
                    <View style={[styles.categoryIcon, { backgroundColor: color }]}>
                      <Text style={styles.categoryEmoji}>{emoji}</Text>
                    </View>
                    <Text style={styles.categoryText}>{getCategoryDisplayName(category, t)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          }
        </View>

        {/* Other Services Button */}
        <TouchableOpacity style={styles.otherServicesButton} onPress={() => router.push("/services/categories")}>
          <Text style={styles.otherServicesText}>{t("home.otherServices")}</Text>
          <Ionicons name="chevron-forward" size={20} color="#10B981" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#151718", // Hardcode dark background (assistant uses slightly different dark color)
  },
  header: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  headerIcons: {
    flexDirection: "row",
    gap: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: "#151718", // Hardcode dark background
  },
  greetingCard: {
    borderRadius: 12,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    marginTop: -12,
    marginBottom: 20,
    backgroundColor: "#1F2937", // Hardcode dark surface
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F0F9FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  greetingText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ECEDEE", // Hardcode primary text
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: "#1F2937", // Hardcode dark surface
    shadowColor: "#000",
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
    color: "#ECEDEE", // Hardcode primary text
  },
  suggestionText: {
    fontSize: 14,
    fontStyle: "italic",
    marginBottom: 24,
    textAlign: "center",
    color: "#9BA1A6", // Hardcode secondary text
  },
  categoriesContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: "#ECEDEE", // Hardcode primary text
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  categoryItem: {
    alignItems: "center",
    width: "18%",
    marginBottom: 16,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  categoryEmoji: {
    fontSize: 24,
    lineHeight: 28,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
    color: "#FFFFFF", // Hardcode white text
  },
  otherServicesButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 24,
    backgroundColor: "#1F2937", // Hardcode dark surface
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  otherServicesText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#10B981",
    marginRight: 8,
  },
});
