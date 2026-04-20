import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColors } from "@/hooks/useThemeColors";
import { t } from "@/i18n";
import { ApiError } from "@/services/auth";
import { submitOnboardingStep } from "@/services/providers";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TOTAL_STEPS = 8;

interface Term {
  id: string;
  text: string;
  checked: boolean;
}

export default function ProviderOnboardingTermsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const themed = useMemo(
    () => ({
      screen: colors.screenBackground,
      title: colors.textPrimary,
      subtitle: colors.textSecondary,
      termsBoxBg: isDark ? "rgba(255, 255, 255, 0.03)" : colors.surfaceSecondary,
      termsBoxBorder: isDark ? "rgba(255, 255, 255, 0.06)" : colors.border,
      termTitle: colors.textPrimary,
      termDesc: colors.textSecondary,
      checkboxRowBg: isDark ? "rgba(255, 255, 255, 0.03)" : colors.surfaceSecondary,
      checkboxEmptyBg: isDark ? "rgba(255, 255, 255, 0.1)" : colors.surfaceSecondary,
      checkboxEmptyBorder: colors.border,
      checkboxText: colors.textPrimary,
      backBtnBg: isDark ? "rgba(255, 255, 255, 0.05)" : colors.surfaceSecondary,
      backBtnText: colors.textSecondary,
    }),
    [colors, isDark],
  );
  const [terms, setTerms] = useState<Term[]>([
    { id: "1", text: t("providerOnboarding.terms.acceptTerms"), checked: true },
    { id: "2", text: t("providerOnboarding.terms.acceptPrivacy"), checked: true },
    { id: "3", text: t("providerOnboarding.terms.acceptNotifications"), checked: false },
  ]);

  const toggleTerm = (id: string) => {
    setTerms(terms.map((t) => (t.id === id ? { ...t, checked: !t.checked } : t)));
  };

  const [saving, setSaving] = useState(false);
  const canContinue = terms[0].checked && terms[1].checked;

  useFocusEffect(
    useCallback(() => {
      setSaving(false);
    }, []),
  );

  const handleBack = () => {
    router.back();
  };

  const handleAccept = async () => {
    if (!canContinue) return;
    setSaving(true);
    try {
      await submitOnboardingStep(6, {});
      router.push("/provider-onboarding/verification");
    } catch (e) {
      console.error("[Terms] submitOnboardingStep failed:", e);
      const message =
        e instanceof ApiError && e.message.trim().length > 0
          ? e.message
          : t("providerOnboarding.terms.saveError");
      Alert.alert(t("common.error"), message, [{ text: t("common.ok") }]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: themed.screen }]}>
      <ProgressBar currentStep={6} totalSteps={TOTAL_STEPS} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: themed.title }]}>{t("providerOnboarding.terms.title")}</Text>
        <Text style={[styles.subtitle, { color: themed.subtitle }]}>{t("providerOnboarding.terms.subtitle")}</Text>

        <View style={[styles.termsContent, { backgroundColor: themed.termsBoxBg, borderColor: themed.termsBoxBorder }]}>
          <View style={styles.termsContentInner}>
            <View style={styles.termItem}>
              <Text style={[styles.termTitle, { color: themed.termTitle }]}>{t("providerOnboarding.terms.term1")}</Text>
              <Text style={[styles.termDesc, { color: themed.termDesc }]} includeFontPadding={Platform.OS === "android" ? false : undefined}>
                {t("providerOnboarding.terms.term1Desc")}
              </Text>
            </View>
            <View style={styles.termItem}>
              <Text style={[styles.termTitle, { color: themed.termTitle }]}>{t("providerOnboarding.terms.term2")}</Text>
              <Text style={[styles.termDesc, { color: themed.termDesc }]} includeFontPadding={Platform.OS === "android" ? false : undefined}>
                {t("providerOnboarding.terms.term2Desc")}
              </Text>
            </View>
            <View style={styles.termItem}>
              <Text style={[styles.termTitle, { color: themed.termTitle }]}>{t("providerOnboarding.terms.term3")}</Text>
              <Text style={[styles.termDesc, { color: themed.termDesc }]} includeFontPadding={Platform.OS === "android" ? false : undefined}>
                {t("providerOnboarding.terms.term3Desc")}
              </Text>
            </View>
            <View style={styles.termItem}>
              <Text style={[styles.termTitle, { color: themed.termTitle }]}>{t("providerOnboarding.terms.term4")}</Text>
              <Text style={[styles.termDesc, { color: themed.termDesc }]} includeFontPadding={Platform.OS === "android" ? false : undefined}>
                {t("providerOnboarding.terms.term4Desc")}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.checkboxesContainer}>
          {terms.map((term) => (
            <TouchableOpacity
              key={term.id}
              style={[styles.checkboxItem, { backgroundColor: themed.checkboxRowBg }]}
              onPress={() => toggleTerm(term.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkbox,
                  { backgroundColor: term.checked ? "#8B5CF6" : themed.checkboxEmptyBg, borderWidth: term.checked ? 0 : 1, borderColor: themed.checkboxEmptyBorder },
                ]}
              >
                {term.checked && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
              </View>
              <Text style={[styles.checkboxText, { color: themed.checkboxText }]}>{term.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: themed.backBtnBg }]} onPress={handleBack} activeOpacity={0.7}>
          <Text style={[styles.backButtonText, { color: themed.backBtnText }]}>{t("providerOnboarding.terms.back")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.acceptButton, (!canContinue || saving) && styles.acceptButtonDisabled]} onPress={handleAccept} disabled={!canContinue || saving} activeOpacity={0.8}>
          <LinearGradient colors={canContinue && !saving ? ["#6366F1", "#8B5CF6"] : ["#4B5563", "#4B5563"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.acceptButtonGradient}>
            {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.acceptButtonText}>{t("providerOnboarding.terms.accept")}</Text>}
          </LinearGradient>
        </TouchableOpacity>
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
    marginBottom: 16,
  },
  termsContent: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  termsContentInner: {
    gap: 12,
  },
  termItem: {
    marginBottom: 8,
  },
  termTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  termDesc: {
    fontSize: 12,
    lineHeight: 18,
    flexShrink: 0,
  },
  checkboxesContainer: {
    gap: 8,
  },
  checkboxItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxText: {
    flex: 1,
    fontSize: 12,
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
  acceptButton: {
    flex: 2,
    borderRadius: 12,
    overflow: "hidden",
  },
  acceptButtonDisabled: {
    opacity: 0.5,
  },
  acceptButtonGradient: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
