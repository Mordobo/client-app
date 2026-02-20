import { ModeSwitch } from "@/components/common/ModeSwitch";
import { useMode } from "@/contexts/ModeContext";
import { t } from "@/i18n";
import { getPortfolio } from "@/services/portfolio";
import { getProviderProfile } from "@/services/providers";
import { getDashboardStats } from "@/services/providerDashboard";
import { getProfileImageUrl } from "@/utils/profileImage";
import { getProviderServices } from "@/services/providerServices";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BACKGROUND = "#12121A";
const CARD_BG = "#1E1B2E";
const CARD_BORDER = "rgba(61, 51, 112, 0.3)";
const GRADIENT_COLORS = ["#6366F1", "#8B5CF6", "#EC4899"] as const;

/** Get initials from a display name string (e.g. "Business Name" → "BN", "Angelo Rivas" → "AR"). */
function getInitialsFromDisplayName(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0].charAt(0).toUpperCase();
    const last = parts[parts.length - 1].charAt(0).toUpperCase();
    return first && last ? `${first}${last}` : first || last || "?";
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length === 1) {
    return parts[0].toUpperCase();
  }
  return "?";
}

export default function ProviderProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode } = useMode();

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
    isRefetching,
  } = useQuery({
    queryKey: ["providerDashboardStats"],
    queryFn: getDashboardStats,
    staleTime: 60_000,
  });

  const { data: servicesData } = useQuery({
    queryKey: ["providerServices"],
    queryFn: () => getProviderServices(),
    staleTime: 60_000,
  });
  const activeServicesCount = servicesData?.activeCount ?? 0;

  const { data: portfolioData } = useQuery({
    queryKey: ["providerPortfolio"],
    queryFn: getPortfolio,
    staleTime: 60_000,
  });
  const portfolioPhotoCount = portfolioData?.stats?.totalPhotos ?? 0;

  const { data: providerProfile, refetch: refetchProviderProfile } = useQuery({
    queryKey: ["providerProfile"],
    queryFn: getProviderProfile,
    staleTime: 60_000,
  });
  const providerAvatarUrl = getProfileImageUrl(providerProfile?.avatarUrl ?? null) ?? null;
  const displayName = (providerProfile?.displayName ?? "").trim() || "—";
  const initials = getInitialsFromDisplayName(displayName);
  const categoryName = (providerProfile?.categoryName ?? "").trim() || null;
  const bio = (providerProfile?.bio ?? "").trim() || null;

  useFocusEffect(
    useCallback(() => {
      refetchProviderProfile();
    }, [refetchProviderProfile])
  );

  const onRefresh = useCallback(() => {
    refetchStats();
  }, [refetchStats]);

  const isVerified = false; // TODO: from API when provider verification exists

  const handleEditProfile = useCallback(() => {
    router.push("/(provider-tabs)/profile/edit");
  }, [router]);

  const handleShareProfile = useCallback(async () => {
    try {
      await Share.share({
        message: displayName,
        url: "https://mordobo.com/profile", // TODO: real profile URL when available
        title: displayName,
      });
    } catch (e) {
      // User cancelled or share failed
    }
  }, [displayName]);

  type MenuItem = {
    icon: keyof typeof Ionicons.glyphMap;
    labelKey: string;
    descKey: string;
    descParams?: Record<string, string | number>;
    href: string | null;
  };

  const menuItems: MenuItem[] = [
    {
      icon: "construct-outline",
      labelKey: "providerDashboard.providerProfile.myServices",
      descKey: "providerDashboard.providerProfile.myServicesDesc",
      descParams: { count: activeServicesCount },
      href: "/(provider-tabs)/profile/services",
    },
    {
      icon: "calendar-outline",
      labelKey: "providerDashboard.providerProfile.availability",
      descKey: "providerDashboard.providerProfile.availabilityDesc",
      href: "/(provider-tabs)/profile/availability",
    },
    {
      icon: "images-outline",
      labelKey: "providerDashboard.providerProfile.portfolio",
      descKey: "providerDashboard.providerProfile.portfolioDesc",
      descParams: { count: portfolioPhotoCount },
      href: "/(provider-tabs)/profile/portfolio",
    },
    {
      icon: "star-outline",
      labelKey: "providerDashboard.providerProfile.reviews",
      descKey: "providerDashboard.providerProfile.reviewsDesc",
      descParams: {
        rating: stats?.averageRating?.toFixed(1) ?? "0",
        count: stats?.reviewCount ?? 0,
      },
      href: "/(provider-tabs)/profile/reviews",
    },
    {
      icon: "settings-outline",
      labelKey: "providerDashboard.providerProfile.configuration",
      descKey: "providerDashboard.providerProfile.configurationDesc",
      href: "/(provider-tabs)/profile/settings",
    },
  ];

  const completionPercent = 85; // TODO: from API when profile completion endpoint exists
  const completedLabel = `${completionPercent}%`; // Job completion rate or profile completion

  const statValues: Array<{ value: string; labelKey: string }> = [
    {
      value: String(stats?.weekJobs ?? stats?.todayJobs ?? 0),
      labelKey: "providerDashboard.providerProfile.statJobs",
    },
    {
      value: completedLabel,
      labelKey: "providerDashboard.providerProfile.statCompleted",
    },
    {
      value: stats?.averageRating?.toFixed(1) ?? "0",
      labelKey: "providerDashboard.providerProfile.statRating",
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={isRefetching && !statsLoading} onRefresh={onRefresh} tintColor="#8B5CF6" />}>
        {/* Header with gradient and avatar */}
        <View style={styles.headerWrapper}>
          <LinearGradient colors={[...GRADIENT_COLORS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientHeader} />
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.editButton} onPress={handleEditProfile} activeOpacity={0.8}>
              <Text style={styles.editButtonText}>{t("providerDashboard.providerProfile.editProfile")} ✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareButton} onPress={handleShareProfile} activeOpacity={0.8} accessibilityLabel={t("providerDashboard.providerProfile.shareProfile")} accessibilityRole="button">
              <Ionicons name="share-outline" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.avatarRow}>
            <View style={styles.avatarWrapper}>
              {providerAvatarUrl ? (
                <Image source={{ uri: providerAvatarUrl }} style={styles.avatar} contentFit="contain" />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}
              {isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
              )}
            </View>
            <View style={styles.modeSwitchWrap}>
              <ModeSwitch
                variant="pill"
                currentMode={mode}
                onModeChange={(newMode) => {
                  if (newMode === "client") {
                    router.push({ pathname: "/switch-mode", params: { target: "client" } });
                  }
                }}
                size="small"
                showLabels={true}
              />
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {/* Name and category */}
          <View style={styles.nameRow}>
            <View style={styles.nameAndBadge}>
              <Text style={styles.displayName}>{displayName}</Text>
              {isVerified && (
                <View style={styles.verifiedPill}>
                  <Text style={styles.verifiedPillText}>{t("providerDashboard.providerProfile.verified")}</Text>
                </View>
              )}
            </View>
            <Text style={styles.category}>
              {categoryName || t("providerDashboard.providerProfile.categoryPlaceholder")}
            </Text>
          </View>

          {/* Stats */}
          {statsLoading ?
            <View style={styles.statsRow}>
              <ActivityIndicator size="small" color="#8B5CF6" />
            </View>
          : <View style={styles.statsRow}>
              {statValues.map((stat, idx) => (
                <View key={idx} style={styles.statCard}>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>
                    {t(stat.labelKey)}
                    {idx === 2 ? " ⭐" : ""}
                  </Text>
                </View>
              ))}
            </View>
          }

          {/* Bio */}
          <View style={styles.bioCard}>
            <Text style={styles.bioLabel}>{t("providerDashboard.providerProfile.aboutMe")}</Text>
            <Text style={styles.bioText}>
              {bio || t("providerDashboard.providerProfile.bioPlaceholder")}
            </Text>
          </View>

          {/* Menu options */}
          <View style={styles.menuList}>
            {menuItems.map((item, idx) => (
              <TouchableOpacity key={idx} style={styles.menuItem} onPress={() => (item.href ? router.push(item.href as never) : undefined)} activeOpacity={0.7} disabled={!item.href}>
                <View style={styles.menuIconBox}>
                  <Ionicons name={item.icon} size={20} color="#8B5CF6" />
                </View>
                <View style={styles.menuTextWrap}>
                  <Text style={styles.menuLabel}>{t(item.labelKey)}</Text>
                  <Text style={styles.menuDesc}>{t(item.descKey, item.descParams)}</Text>
                </View>
                {item.href && <Text style={styles.menuArrow}>→</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  headerWrapper: {
    position: "relative",
    height: 128,
  },
  gradientHeader: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 128,
  },
  headerActions: {
    position: "absolute",
    top: 16,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  editButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarRow: {
    position: "absolute",
    bottom: -48,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  avatarWrapper: {
    width: 96,
    height: 96,
    borderRadius: 16,
    backgroundColor: CARD_BG,
    borderWidth: 4,
    borderColor: BACKGROUND,
    overflow: "hidden",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CARD_BG,
  },
  avatarInitials: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 32,
    fontWeight: "600",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#22C55E",
    borderWidth: 3,
    borderColor: BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 64,
  },
  nameRow: {
    marginBottom: 20,
  },
  nameAndBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  displayName: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  verifiedPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(34, 197, 94, 0.15)",
  },
  verifiedPillText: {
    color: "#4ADE80",
    fontSize: 10,
    fontWeight: "500",
  },
  category: {
    color: "#A78BFA",
    fontSize: 14,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    alignItems: "center",
  },
  statValue: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    marginTop: 2,
  },
  bioCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    marginBottom: 20,
  },
  bioLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  bioText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    lineHeight: 22,
  },
  menuList: {
    gap: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  menuTextWrap: {
    flex: 1,
  },
  menuLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  menuDesc: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    marginTop: 2,
  },
  menuArrow: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 14,
  },
  modeSwitchWrap: {
    alignItems: "flex-end",
  },
});
