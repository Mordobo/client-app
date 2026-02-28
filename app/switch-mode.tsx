import { useMode } from "@/contexts/ModeContext";
import { t } from "@/i18n";
import { checkProviderStatus } from "@/services/providers";
import { CommonActions } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const BACKGROUND = "#12121A";
const CARD_BG = "#1E1B2E";
const CARD_BORDER = "rgba(61, 51, 112, 0.3)";
const GRADIENT_START = "#6366F1";
const GRADIENT_END = "#8B5CF6";
const AMBER_BG = "rgba(245, 158, 11, 0.15)";
const AMBER_BORDER = "rgba(245, 158, 11, 0.4)";

type TargetMode = "client" | "provider";

export default function SwitchModeScreen() {
  const { target = "client" } = useLocalSearchParams<{ target?: string }>();
  const targetMode: TargetMode = target === "provider" ? "provider" : "client";
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { setMode } = useMode();
  const [switching, setSwitching] = useState(false);

  const resetTo = useCallback((routeName: string) => {
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: routeName }] })
    );
  }, [navigation]);

  const handleSwitchToClient = useCallback(async () => {
    try {
      setSwitching(true);
      await setMode("client");
      resetTo("(tabs)");
    } catch (e) {
      console.error("[SwitchMode] Switch to client failed:", e);
      setSwitching(false);
    }
  }, [setMode, resetTo]);

  const handleSwitchToProvider = useCallback(async () => {
    try {
      setSwitching(true);
      const result = await setMode("provider");
      const status = await checkProviderStatus();
      if (result.needsOnboarding || !status.onboardingCompleted) {
        if (status.onboardingCompleted && !status.isVerified) {
          resetTo("provider-onboarding/verification");
        } else {
          resetTo("provider-onboarding");
        }
        return;
      }
      if (!status.isVerified) {
        resetTo("provider-onboarding/verification");
        return;
      }
      resetTo("(provider-tabs)");
    } catch (e) {
      console.error("[SwitchMode] Switch to provider failed:", e);
      setSwitching(false);
    }
  }, [setMode, resetTo]);

  const handleConfirm = useCallback(() => {
    if (targetMode === "client") handleSwitchToClient();
    else handleSwitchToProvider();
  }, [targetMode, handleSwitchToClient, handleSwitchToProvider]);

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  const isToProvider = targetMode === "provider";

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleCancel}
          activeOpacity={0.8}
          accessibilityLabel={t("common.back")}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("mode.switchMode")}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Visual: two modes with swap arrow */}
        <View style={styles.iconsRow}>
          <View style={styles.modeIconBox}>
            <Ionicons
              name="person"
              size={32}
              color={isToProvider ? "rgba(255,255,255,0.5)" : "#8B5CF6"}
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
            <Ionicons name="swap-horizontal" size={28} color="rgba(255,255,255,0.5)" />
          </View>
          <View style={styles.modeIconBox}>
            <Ionicons
              name="briefcase"
              size={32}
              color={isToProvider ? "#8B5CF6" : "rgba(255,255,255,0.5)"}
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
              <Ionicons name="checkmark-circle" size={18} color="#8B5CF6" />
              <Text style={styles.gridItemText}>{t("mode.providerOfferServices")}</Text>
            </View>
            <View style={styles.gridItem}>
              <Ionicons name="checkmark-circle" size={18} color="#8B5CF6" />
              <Text style={styles.gridItemText}>{t("mode.providerReceivePayments")}</Text>
            </View>
            <View style={styles.gridItem}>
              <Ionicons name="checkmark-circle" size={18} color="#8B5CF6" />
              <Text style={styles.gridItemText}>{t("mode.providerManageSchedule")}</Text>
            </View>
          </View>
          <View style={styles.gridColumn}>
            <Text style={styles.gridColumnTitle}>{t("mode.asClient")}</Text>
            <View style={styles.gridItem}>
              <Ionicons name="checkmark-circle" size={18} color="#8B5CF6" />
              <Text style={styles.gridItemText}>{t("mode.clientHireServices")}</Text>
            </View>
            <View style={styles.gridItem}>
              <Ionicons name="checkmark-circle" size={18} color="#8B5CF6" />
              <Text style={styles.gridItemText}>{t("mode.clientMakePayments")}</Text>
            </View>
            <View style={styles.gridItem}>
              <Ionicons name="checkmark-circle" size={18} color="#8B5CF6" />
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

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          activeOpacity={0.8}
          disabled={switching}
        >
          <Text style={styles.cancelButtonText}>{t("common.cancel")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
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
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  scroll: {
    flex: 1,
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
    color: "#A78BFA",
    fontSize: 13,
    fontWeight: "600",
  },
  modeIconLabelInactive: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    fontWeight: "500",
  },
  arrowBox: {
    padding: 8,
  },
  currentModeText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 24,
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  description: {
    color: "rgba(255,255,255,0.7)",
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
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  gridColumnTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  gridItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  gridItemText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    flex: 1,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: AMBER_BG,
    borderWidth: 1,
    borderColor: AMBER_BORDER,
    marginBottom: 24,
  },
  infoBannerText: {
    flex: 1,
    color: "rgba(255,255,255,0.9)",
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
  cancelButton: {
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 15,
    fontWeight: "500",
  },
});
