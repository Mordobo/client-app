import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColors } from "@/hooks/useThemeColors";
import { t } from "@/i18n";
import { fetchCategoriesTree, type CategoryTreeItem, type Subcategory } from "@/services/categories";
import { ApiError } from "@/services/auth";
import { submitOnboardingStep } from "@/services/providers";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TOTAL_STEPS = 8;
const MIN_DESCRIPTION_LENGTH = 25;

export interface CategoryOption {
  id: string;
  name: string;
  icon: string;
}

export interface SubcategoryOption {
  id: string;
  name: string;
  icon: string;
  parentId: string;
}

const ICON_NAME_TO_EMOJI: Record<string, string> = {
  wrench: "🔧",
  construct: "🔧",
  sparkles: "✨",
  scissors: "✂️",
  flash: "⚡",
  car: "🚗",
  truck: "🚚",
  leaf: "🌿",
  paw: "🐾",
  calendar: "📅",
  heart: "❤️",
  book: "📚",
  briefcase: "💼",
  cog: "⚙️",
  home: "🏠",
  ellipsis: "📦",
  laptop: "💻",
};

function iconToEmoji(icon: string | undefined): string {
  if (!icon || !icon.trim()) return "📦";
  const key = icon.trim().toLowerCase();
  if (ICON_NAME_TO_EMOJI[key]) return ICON_NAME_TO_EMOJI[key];
  if (icon.length <= 2) return icon;
  return "📦";
}

function getCategoryOptions(tree: CategoryTreeItem[] | undefined): CategoryOption[] {
  if (!tree || tree.length === 0) return [];
  return tree.map((c) => ({
    id: c.id,
    name: c.name,
    icon: iconToEmoji(c.icon),
  }));
}

function getSubcategoryOptions(tree: CategoryTreeItem[] | undefined, parentId: string): SubcategoryOption[] {
  if (!tree) return [];
  const parent = tree.find((c) => c.id === parentId);
  if (!parent?.subcategories) return [];
  return parent.subcategories.map((s: Subcategory) => ({
    id: s.id,
    name: s.name,
    icon: iconToEmoji(s.icon),
    parentId: s.category_id,
  }));
}

export default function ProviderOnboardingBusinessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [businessName, setBusinessName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryOption | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<SubcategoryOption | null>(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [subcategoryModalVisible, setSubcategoryModalVisible] = useState(false);
  const [description, setDescription] = useState("");

  const { data: categoriesTree, isLoading: categoriesLoading } = useQuery({
    queryKey: ["provider-onboarding-categories-tree"],
    queryFn: fetchCategoriesTree,
    staleTime: 5 * 60 * 1000,
  });

  const categoryOptions = useMemo(() => getCategoryOptions(categoriesTree), [categoriesTree]);
  const subcategoryOptions = useMemo(
    () => (selectedCategory ? getSubcategoryOptions(categoriesTree, selectedCategory.id) : []),
    [categoriesTree, selectedCategory],
  );

  const handleBack = () => {
    router.back();
  };

  const hasSubcategories = subcategoryOptions.length > 0;
  const canContinue =
    businessName.trim().length > 0 &&
    selectedCategory !== null &&
    (!hasSubcategories || selectedSubcategory !== null) &&
    description.trim().length >= MIN_DESCRIPTION_LENGTH;

  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setSaving(false);
    }, []),
  );

  const handleContinue = useCallback(async () => {
    if (!businessName.trim() || !selectedCategory || description.trim().length < MIN_DESCRIPTION_LENGTH) {
      return;
    }
    setSaving(true);
    try {
      const categoryId = (selectedSubcategory?.id ?? selectedCategory.id).trim();
      await submitOnboardingStep(1, {
        businessName: businessName.trim(),
        ...(categoryId.length > 0 ? { categoryId } : {}),
        description: description.trim(),
      });
      router.push("/provider-onboarding/services");
    } catch (e) {
      console.error("[Business] submitOnboardingStep failed:", e);
      const message = e instanceof ApiError ? e.message : t("errors.submitOnboardingFailed");
      Alert.alert(t("common.error"), message, [{ text: t("common.ok") }]);
    } finally {
      setSaving(false);
    }
  }, [businessName, description, router, selectedCategory, selectedSubcategory]);

  const handleSelectCategory = (option: CategoryOption) => {
    setSelectedCategory(option);
    setSelectedSubcategory(null);
    setCategoryModalVisible(false);
  };

  const handleSelectSubcategory = (option: SubcategoryOption) => {
    setSelectedSubcategory(option);
    setSubcategoryModalVisible(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.screenBackground }]}>
      <ProgressBar currentStep={1} totalSteps={TOTAL_STEPS} />

      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.screenBackground }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: theme.textPrimary }]}>{t("providerOnboarding.business.title")}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{t("providerOnboarding.business.subtitle")}</Text>

        <View style={styles.form}>
          {/* Business Name */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{t("providerOnboarding.business.businessName")}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, color: theme.textPrimary }]}
              placeholder={t("providerOnboarding.business.businessNamePlaceholder")}
              placeholderTextColor={theme.textTertiary}
              value={businessName}
              onChangeText={setBusinessName}
            />
          </View>

          {/* Category dropdown */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{t("providerOnboarding.business.category")}</Text>
            <TouchableOpacity
              style={[styles.selectContainer, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
              onPress={() => !categoriesLoading && setCategoryModalVisible(true)}
              activeOpacity={0.7}
              disabled={categoriesLoading}
            >
              {categoriesLoading ?
                <View style={styles.selectLoading}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={{ fontSize: 14, color: theme.textTertiary }}>{t("providerOnboarding.business.selectCategory")}</Text>
                </View>
              : <>
                  <Text
                    style={[styles.selectText, { color: selectedCategory ? theme.textPrimary : theme.textTertiary }]}
                    numberOfLines={1}
                  >
                    {selectedCategory ? `${selectedCategory.icon} ${selectedCategory.name}` : t("providerOnboarding.business.selectCategory")}
                  </Text>
                  <View style={styles.selectIconWrap}>
                    <Ionicons name="chevron-down" size={16} color={theme.iconSecondary} />
                  </View>
                </>
              }
            </TouchableOpacity>

            <Modal visible={categoryModalVisible} animationType="slide" transparent onRequestClose={() => setCategoryModalVisible(false)}>
              <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCategoryModalVisible(false)}>
                <View
                  style={[styles.modalContent, { paddingBottom: insets.bottom + 16, backgroundColor: theme.card }]}
                  onStartShouldSetResponder={() => true}
                >
                  <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{t("providerOnboarding.business.categoryModalTitle")}</Text>
                    <TouchableOpacity onPress={() => setCategoryModalVisible(false)} style={styles.modalCloseButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                      <Ionicons name="close" size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={categoryOptions}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.categoryItem,
                          selectedCategory?.id === item.id && {
                            backgroundColor: isDark ? "rgba(139, 92, 246, 0.15)" : `${theme.primary}22`,
                          },
                        ]}
                        onPress={() => handleSelectCategory(item)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.categoryIcon}>{item.icon}</Text>
                        <Text
                          style={[
                            styles.categoryName,
                            { color: theme.textPrimary },
                            selectedCategory?.id === item.id && styles.categoryNameSelected,
                          ]}
                        >
                          {item.name}
                        </Text>
                        {selectedCategory?.id === item.id && <Ionicons name="checkmark-circle" size={22} color="#8B5CF6" />}
                      </TouchableOpacity>
                    )}
                    style={styles.categoryList}
                    contentContainerStyle={styles.categoryListContent}
                    showsVerticalScrollIndicator
                  />
                </View>
              </TouchableOpacity>
            </Modal>
          </View>

          {/* Subcategory dropdown — visible only when parent category has subcategories */}
          {selectedCategory && hasSubcategories && (
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>{t("providerOnboarding.business.subcategory")}</Text>
              <TouchableOpacity
                style={[styles.selectContainer, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
                onPress={() => setSubcategoryModalVisible(true)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.selectText, { color: selectedSubcategory ? theme.textPrimary : theme.textTertiary }]}
                  numberOfLines={1}
                >
                  {selectedSubcategory ? `${selectedSubcategory.icon} ${selectedSubcategory.name}` : t("providerOnboarding.business.selectSubcategory")}
                </Text>
                <View style={styles.selectIconWrap}>
                  <Ionicons name="chevron-down" size={16} color={theme.iconSecondary} />
                </View>
              </TouchableOpacity>

              <Modal visible={subcategoryModalVisible} animationType="slide" transparent onRequestClose={() => setSubcategoryModalVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSubcategoryModalVisible(false)}>
                  <View
                    style={[styles.modalContent, { paddingBottom: insets.bottom + 16, backgroundColor: theme.card }]}
                    onStartShouldSetResponder={() => true}
                  >
                    <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                      <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{t("providerOnboarding.business.subcategoryModalTitle")}</Text>
                      <TouchableOpacity onPress={() => setSubcategoryModalVisible(false)} style={styles.modalCloseButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                        <Ionicons name="close" size={24} color={theme.textPrimary} />
                      </TouchableOpacity>
                    </View>
                    <FlatList
                      data={subcategoryOptions}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[
                            styles.categoryItem,
                            selectedSubcategory?.id === item.id && {
                              backgroundColor: isDark ? "rgba(139, 92, 246, 0.15)" : `${theme.primary}22`,
                            },
                          ]}
                          onPress={() => handleSelectSubcategory(item)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.categoryIcon}>{item.icon}</Text>
                          <Text
                            style={[
                              styles.categoryName,
                              { color: theme.textPrimary },
                              selectedSubcategory?.id === item.id && styles.categoryNameSelected,
                            ]}
                          >
                            {item.name}
                          </Text>
                          {selectedSubcategory?.id === item.id && <Ionicons name="checkmark-circle" size={22} color="#8B5CF6" />}
                        </TouchableOpacity>
                      )}
                      style={styles.categoryList}
                      contentContainerStyle={styles.categoryListContent}
                      showsVerticalScrollIndicator
                    />
                  </View>
                </TouchableOpacity>
              </Modal>
            </View>
          )}

          {/* Description */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{t("providerOnboarding.business.description")}</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, color: theme.textPrimary }]}
              placeholder={t("providerOnboarding.business.descriptionPlaceholder")}
              placeholderTextColor={theme.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.surfaceSecondary }]} onPress={handleBack} activeOpacity={0.7}>
          <Text style={[styles.backButtonText, { color: theme.textSecondary }]}>{t("providerOnboarding.business.back")}</Text>
        </TouchableOpacity>
        <Pressable
          style={styles.continueButton}
          onPress={handleContinue}
          disabled={!canContinue || saving}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canContinue || saving }}
        >
          <LinearGradient
            pointerEvents="none"
            colors={canContinue && !saving ? ["#6366F1", "#8B5CF6"] : ["#4B5563", "#4B5563"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.continueButtonGradient, (!canContinue || saving) && styles.continueButtonDisabled]}
          >
            {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={[styles.continueButtonText, (!canContinue || saving) && styles.continueButtonTextDisabled]}>{t("providerOnboarding.business.continue")}</Text>}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 20,
  },
  form: {
    gap: 16,
  },
  field: {
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
  },
  selectContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 48,
  },
  selectText: {
    flex: 1,
    fontSize: 14,
  },
  selectLoading: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  selectIconWrap: {
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    minWidth: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalCloseButton: {
    padding: 4,
  },
  categoryList: {
    maxHeight: 400,
  },
  categoryListContent: {
    paddingVertical: 12,
    paddingBottom: 24,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 12,
    borderRadius: 12,
  },
  categoryIcon: {
    fontSize: 22,
  },
  categoryName: {
    flex: 1,
    fontSize: 16,
  },
  categoryNameSelected: {
    fontWeight: "600",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  backButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  continueButton: {
    flex: 2,
    borderRadius: 12,
    overflow: "hidden",
  },
  continueButtonGradient: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  continueButtonTextDisabled: {
    color: "rgba(255, 255, 255, 0.7)",
  },
});
