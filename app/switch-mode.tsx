import { useMode } from "@/contexts/ModeContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColors } from "@/hooks/useThemeColors";
import type { ThemeColors } from "@/utils/themeStyles";
import { t } from "@/i18n";
import { checkProviderStatus } from "@/services/providers";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const GRADIENT_START = "#6366F1";
const GRADIENT_END = "#8B5CF6";

type TargetMode = "client" | "provider";

function createSwitchModeStyles(colors: ThemeColors, amberBg: string, amberBorder: string) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 16,
      paddingBottom: 20,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    scroll: {
      flex: 1,
      backgroundColor: colors.screenBackground,
    },
    scrollContent: {
      paddingHorizontal: 20,
    },
    iconsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
      gap: 16,
    },
    modeIconBox: {
      alignItems: "center",
      gap: 8,
    },
    modeIconLabel: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: "600",
    },
    modeIconLabelInactive: {
      color: colors.textTertiary,
      fontSize: 13,
      fontWeight: "500",
    },
    arrowBox: {
      padding: 8,
    },
    currentModeText: {
      color: colors.textSecondary,
      fontSize: 13,
      textAlign: "center",
      marginBottom: 24,
    },
    title: {
      color: colors.textPrimary,
      fontSize: 22,
      fontWeight: "700",
      textAlign: "center",
      marginBottom: 12,
    },
    description: {
      color: colors.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      textAlign: "center",
      marginBottom: 24,
    },
    grid: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 20,
    },
    gridColumn: {
      flex: 1,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      backgroundColor: colors.card,
      borderColor: colors.cardBorder,
    },
    gridColumnTitle: {
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 12,
      textAlign: "center",
      color: colors.textPrimary,
    },
    gridItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },
    gridItemText: {
      fontSize: 13,
      flex: 1,
      color: colors.textPrimary,
    },
    infoBanner: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      padding: 14,
      borderRadius: 12,
      backgroundColor: amberBg,
      borderWidth: 1,
      borderColor: amberBorder,
      marginBottom: 24,
    },
    infoBannerText: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 13,
      lineHeight: 20,
    },
    primaryButtonWrap: {
      marginBottom: 12,
      borderRadius: 14,
      overflow: "hidden",
    },
    primaryButton: {
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 52,
    },
    primaryButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600",
    },
  });
}

export default function SwitchModeScreen() {
  const { target = "client" } = useLocalSearchParams<{ target?: string }>();
  const targetMode: TargetMode = target === "provider" ? "provider" : "client";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const colorScheme = useColorScheme();
  const amberBanner = useMemo(() => {
    const isDark = colorScheme === "dark";
    return {
      bg: isDark ? "rgba(245, 158, 11, 0.15)" : "rgba(245, 158, 11, 0.2)",
      border: isDark ? "rgba(245, 158, 11, 0.4)" : "rgba(217, 119, 6, 0.4)",
    };
  }, [colorScheme]);
  const styles = useMemo(
    () => createSwitchModeStyles(colors, amberBanner.bg, amberBanner.border),
    [colors, amberBanner.bg, amberBanner.border]
  );
  const { setMode } = useMode();
  const [switching, setSwitching] = useState(false);

  const handleSwitchToClient = useCallback(async () => {
    try {
      setSwitching(true);
      await setMode("client");
      router.replace("/(tabs)");
    } catch (e) {
      console.error("[SwitchMode] Switch to client failed:", e);
      setSwitching(false);
    }
  }, [setMode, router]);

  const handleSwitchToProvider = useCallback(async () => {
    try {
      setSwitching(true);
      const result = await setMode("provider");
      const status = await checkProviderStatus();
      if (result.needsOnboarding || !status.onboardingCompleted) {
        if (status.onboardingCompleted && !status.isVerified) {
          router.replace("/provider-onboarding/verification");
        } else {
          router.replace("/provider-onboarding");
        }
        return;
      }
      if (!status.isVerified) {
        router.replace("/provider-onboarding/verification");
        return;
      }
      router.replace("/(provider-tabs)");
    } catch (e) {
      console.error("[SwitchMode] Switch to provider failed:", e);
      setSwitching(false);
    }
  }, [setMode, router]);

  const handleConfirm = useCallback(() => {
    if (targetMode === "client") handleSwitchToClient();
    else handleSwitchToProvider();
  }, [targetMode, handleSwitchToClient, handleSwitchToProvider]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const isToProvider = targetMode === "provider";
  const bottomInset = insets.bottom || (Platform.OS === "android" ? 40 : 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: bottomInset, backgroundColor: colors.screenBackground }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.8}
          accessibilityLabel={t("common.back")}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={colors.icon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("mode.switchMode")}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(bottomInset, 24) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Visual: two modes with swap arrow */}
        <View style={styles.iconsRow}>
          <View style={styles.modeIconBox}>
            <Ionicons
              name="person"
              size={32}
              color={isToProvider ? colors.textTertiary : colors.primary}
            />
            <Text
              style={
                isToProvider ? styles.modeIconLabelInactive : styles.modeIconLabel
              }
            >
              {t("mode.client")}
            </Text>
          </View>
          <View style={styles.arrowBox}>
            <Ionicons name="swap-horizontal" size={28} color={colors.icon} />
          </View>
          <View style={styles.modeIconBox}>
            <Ionicons
              name="briefcase"
              size={32}
              color={isToProvider ? colors.primary : colors.textTertiary}
            />
            <Text
              style={
                isToProvider ? styles.modeIconLabel : styles.modeIconLabelInactive
              }
            >
              {t("mode.provider")}
            </Text>
          </View>
        </View>

        <Text style={styles.currentModeText}>
          {isToProvider
            ? t("mode.currentModeIndicatorClient")
            : t("mode.currentModeIndicator")}
        </Text>

        <Text style={styles.title}>
          {isToProvider
            ? t("mode.switchToProviderQuestion")
            : t("mode.switchToClientQuestion")}
        </Text>
        <Text style={styles.description}>
          {isToProvider
            ? t("mode.switchDescriptionProvider")
            : t("mode.switchDescription")}
        </Text>

        <View style={styles.grid}>
          <View style={styles.gridColumn}>
            <Text style={styles.gridColumnTitle}>{t("mode.asProvider")}</Text>
            <View style={styles.gridItem}>
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              <Text style={styles.gridItemText}>{t("mode.providerOfferServices")}</Text>
            </View>
            <View style={styles.gridItem}>
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              <Text style={styles.gridItemText}>{t("mode.providerReceivePayments")}</Text>
            </View>
            <View style={styles.gridItem}>
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              <Text style={styles.gridItemText}>{t("mode.providerManageSchedule")}</Text>
            </View>
          </View>
          <View style={styles.gridColumn}>
            <Text style={styles.gridColumnTitle}>{t("mode.asClient")}</Text>
            <View style={styles.gridItem}>
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              <Text style={styles.gridItemText}>{t("mode.clientHireServices")}</Text>
            </View>
            <View style={styles.gridItem}>
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              <Text style={styles.gridItemText}>{t("mode.clientMakePayments")}</Text>
            </View>
            <View style={styles.gridItem}>
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              <Text style={styles.gridItemText}>{t("mode.clientLeaveReviews")}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={22} color="#F59E0B" />
          <Text style={styles.infoBannerText}>{t("mode.infoBanner")}</Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButtonWrap}
          onPress={handleConfirm}
          activeOpacity={0.9}
          disabled={switching}
        >
          <LinearGradient
            colors={[GRADIENT_START, GRADIENT_END]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryButton}
          >
            {switching ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isToProvider
                  ? t("mode.switchToProviderButton")
                  : t("mode.switchToClientButton")}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
