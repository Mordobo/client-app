import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { t } from "@/i18n";
import { fetchCategories, type Category } from "@/services/categories";
import { submitOnboardingStep } from "@/services/providers";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TOTAL_STEPS = 8;
const MIN_DESCRIPTION_LENGTH = 25;

export interface CategoryOption {
  id: string;
  name: string;
  icon: string;
}

/** Map API icon names (e.g. wrench, sparkles) to emoji for display */
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

function getCategoryOptions(apiCategories: Category[] | undefined): CategoryOption[] {
  if (apiCategories && apiCategories.length > 0) {
    return apiCategories.map((c) => ({
      id: c.id,
      name: c.name,
      icon: iconToEmoji(c.icon),
    }));
  }
  return [];
}

export default function ProviderOnboardingBusinessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [businessName, setBusinessName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryOption | null>(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [description, setDescription] = useState("");

  const { data: apiCategories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["provider-onboarding-categories"],
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000,
  });

  const categoryOptions = useMemo(() => getCategoryOptions(apiCategories), [apiCategories]);

  const handleBack = () => {
    router.back();
  };

  const canContinue = businessName.trim().length > 0 && selectedCategory !== null && description.trim().length >= MIN_DESCRIPTION_LENGTH;

  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    if (!canContinue) return;
    setSaving(true);
    try {
      await submitOnboardingStep(1, {
        businessName: businessName.trim(),
        categoryId: selectedCategory?.id,
        description: description.trim(),
      });
      router.push("/provider-onboarding/services");
    } catch (e) {
      console.error("[Business] submitOnboardingStep failed:", e);
      setSaving(false);
    }
  };

  const handleSelectCategory = (option: CategoryOption) => {
    setSelectedCategory(option);
    setCategoryModalVisible(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ProgressBar currentStep={1} totalSteps={TOTAL_STEPS} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t("providerOnboarding.business.title")}</Text>
        <Text style={styles.subtitle}>{t("providerOnboarding.business.subtitle")}</Text>

        <View style={styles.form}>
          {/* Business Name */}
          <View style={styles.field}>
            <Text style={styles.label}>{t("providerOnboarding.business.businessName")}</Text>
            <TextInput style={styles.input} placeholder={t("providerOnboarding.business.businessNamePlaceholder")} placeholderTextColor="rgba(255, 255, 255, 0.3)" value={businessName} onChangeText={setBusinessName} />
          </View>

          {/* Category dropdown */}
          <View style={styles.field}>
            <Text style={styles.label}>{t("providerOnboarding.business.category")}</Text>
            <TouchableOpacity style={styles.selectContainer} onPress={() => !categoriesLoading && setCategoryModalVisible(true)} activeOpacity={0.7} disabled={categoriesLoading}>
              {categoriesLoading ?
                <View style={styles.selectLoading}>
                  <ActivityIndicator size="small" color="rgba(255, 255, 255, 0.6)" />
                  <Text style={styles.selectPlaceholder}>{t("providerOnboarding.business.selectCategory")}</Text>
                </View>
              : <>
                  <Text style={[styles.selectText, !selectedCategory && styles.selectPlaceholder]} numberOfLines={1}>
                    {selectedCategory ? `${selectedCategory.icon} ${selectedCategory.name}` : t("providerOnboarding.business.selectCategory")}
                  </Text>
                  <View style={styles.selectIconWrap}>
                    <Ionicons name="chevron-down" size={16} color="rgba(255, 255, 255, 0.4)" />
                  </View>
                </>
              }
            </TouchableOpacity>

            <Modal visible={categoryModalVisible} animationType="slide" transparent onRequestClose={() => setCategoryModalVisible(false)}>
              <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCategoryModalVisible(false)}>
                <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]} onStartShouldSetResponder={() => true}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{t("providerOnboarding.business.categoryModalTitle")}</Text>
                    <TouchableOpacity onPress={() => setCategoryModalVisible(false)} style={styles.modalCloseButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                      <Ionicons name="close" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={categoryOptions}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity style={[styles.categoryItem, selectedCategory?.id === item.id && styles.categoryItemSelected]} onPress={() => handleSelectCategory(item)} activeOpacity={0.7}>
                        <Text style={styles.categoryIcon}>{item.icon}</Text>
                        <Text style={[styles.categoryName, selectedCategory?.id === item.id && styles.categoryNameSelected]}>{item.name}</Text>
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

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>{t("providerOnboarding.business.description")}</Text>
            <TextInput style={[styles.input, styles.textArea]} placeholder={t("providerOnboarding.business.descriptionPlaceholder")} placeholderTextColor="rgba(255, 255, 255, 0.3)" value={description} onChangeText={setDescription} multiline numberOfLines={3} textAlignVertical="top" />
          </View>
        </View>
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>{t("providerOnboarding.business.back")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue} activeOpacity={0.8} disabled={!canContinue || saving}>
          <LinearGradient colors={canContinue && !saving ? ["#6366F1", "#8B5CF6"] : ["#4B5563", "#4B5563"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.continueButtonGradient, (!canContinue || saving) && styles.continueButtonDisabled]}>
            {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={[styles.continueButtonText, (!canContinue || saving) && styles.continueButtonTextDisabled]}>{t("providerOnboarding.business.continue")}</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#12121A",
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
    color: "#FFFFFF",
    marginBottom: 4,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
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
    color: "rgba(255, 255, 255, 0.7)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    color: "#FFFFFF",
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
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    minHeight: 48,
  },
  selectText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
  },
  selectPlaceholder: {
    color: "rgba(255, 255, 255, 0.3)",
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
    backgroundColor: "#12121A",
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
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
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
  categoryItemSelected: {
    backgroundColor: "rgba(139, 92, 246, 0.15)",
  },
  categoryIcon: {
    fontSize: 22,
  },
  categoryName: {
    flex: 1,
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
  },
  categoryNameSelected: {
    color: "#FFFFFF",
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
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.7)",
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
