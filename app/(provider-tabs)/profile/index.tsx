import { ModeSwitch } from "@/components/common/ModeSwitch";
import { ProfileFooter } from "@/components/profile/ProfileFooter";
import { useAuth } from "@/contexts/AuthContext";
import { useMode } from "@/contexts/ModeContext";
import { useThemeColors } from "@/hooks/useThemeColors";
import { t } from "@/i18n";
import { getPortfolio } from "@/services/portfolio";
import { getProviderProfile, getProviderProfileStats, providerProfileQueryKey } from "@/services/providers";
import { getProviderServices } from "@/services/providerServices";
import { getDisplayNameInitials } from "@/utils/displayNameInitials";
import { getProfileImageUrl } from "@/utils/profileImage";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const GRADIENT_COLORS = ["#6366F1", "#8B5CF6", "#EC4899"] as const;

export default function ProviderProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { user } = useAuth();
  const { mode } = useMode();
  const scrollViewRef = useRef<ScrollView>(null);

  const {
    data: profileStats,
    isLoading: profileStatsLoading,
    refetch: refetchProfileStats,
    isRefetching: profileStatsRefetching,
  } = useQuery({
    queryKey: ["providerProfileStats"],
    queryFn: getProviderProfileStats,
    staleTime: 30_000,
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
    queryKey: providerProfileQueryKey(user?.id),
    queryFn: getProviderProfile,
    staleTime: 60_000,
    enabled: !!user?.id,
  });
  const providerAvatarUrl = getProfileImageUrl(providerProfile?.avatarUrl ?? null) ?? null;
  const [avatarError, setAvatarError] = useState(false);
  const displayName = (providerProfile?.displayName ?? "").trim() || "—";
  const initials = getDisplayNameInitials(displayName);
  const categoryName = (providerProfile?.categoryName ?? "").trim() || null;
  const bio = (providerProfile?.bio ?? "").trim() || null;

  useFocusEffect(
    useCallback(() => {
      setAvatarError(false);
      void refetchProviderProfile();
      void refetchProfileStats();
      // Scroll to top when Profile tab is pressed (e.g. from nested route or another tab)
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, [refetchProviderProfile, refetchProfileStats]),
  );

  const onRefresh = useCallback(() => {
    void Promise.all([refetchProfileStats(), refetchProviderProfile()]);
  }, [refetchProfileStats, refetchProviderProfile]);

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
    descParams?: Record<string, string | number | undefined>;
    href: string | null;
  };

  const menuItems: MenuItem[] = useMemo(
    () => [
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
          rating:
            profileStats?.averageRating != null && (profileStats.reviewCount ?? 0) > 0
              ? profileStats.averageRating.toFixed(1)
              : t("providerDashboard.providerProfile.statRatingEmpty"),
          count: profileStats?.reviewCount ?? 0,
        },
        href: "/(provider-tabs)/profile/reviews",
      },
      {
        icon: "settings-outline",
        labelKey: "providerDashboard.providerProfile.configuration",
        descKey: "providerDashboard.providerProfile.configurationDesc",
        href: "/(provider-tabs)/profile/settings",
      },
    ],
    [activeServicesCount, portfolioPhotoCount, profileStats],
  );

  const statValues = useMemo(() => {
    const completed = profileStats?.completedJobs ?? 0;
    const pct = profileStats?.completionRatePercent ?? 0;
    const avgRating = profileStats?.averageRating;
    const reviewCount = profileStats?.reviewCount ?? 0;
    const ratingValue =
      reviewCount > 0 && avgRating != null ? avgRating.toFixed(1) : t("providerDashboard.providerProfile.statRatingEmpty");
    return [
      { value: String(completed), labelKey: "providerDashboard.providerProfile.statJobs" as const },
      { value: `${pct}%`, labelKey: "providerDashboard.providerProfile.statCompleted" as const },
      { value: ratingValue, labelKey: "providerDashboard.providerProfile.statRating" as const },
    ];
  }, [profileStats]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <ScrollView ref={scrollViewRef} style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={profileStatsRefetching && !profileStatsLoading} onRefresh={onRefresh} tintColor={colors.primary} />}>
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
            <View style={[styles.avatarWrapper, { backgroundColor: colors.card, borderColor: colors.background }]}>
              {providerAvatarUrl && !avatarError ?
                <Image source={{ uri: providerAvatarUrl }} style={styles.avatar} contentFit="cover" cachePolicy="disk" onError={() => setAvatarError(true)} />
              : <View style={[styles.avatarPlaceholder, { backgroundColor: colors.card }]}>
                  <Text style={[styles.avatarInitials, { color: colors.textOnDark }]}>{initials}</Text>
                </View>
              }
              {isVerified && (
                <View style={[styles.verifiedBadge, { borderColor: colors.background }]}>
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
              <Text style={[styles.displayName, { color: colors.textPrimary }]}>{displayName}</Text>
              {isVerified && (
                <View style={styles.verifiedPill}>
                  <Text style={styles.verifiedPillText}>{t("providerDashboard.providerProfile.verified")}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.category, { color: colors.textSecondary }]}>{categoryName || t("providerDashboard.providerProfile.categoryPlaceholder")}</Text>
          </View>

          {/* Stats */}
          {profileStatsLoading ?
            <View style={styles.statsRow}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          : <View style={styles.statsRow}>
              {statValues.map((stat, idx) => (
                <View key={idx} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stat.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
                    {t(stat.labelKey)}
                    {idx === 2 ? " ⭐" : ""}
                  </Text>
                </View>
              ))}
            </View>
          }

          {/* Bio */}
          <View style={[styles.bioCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.bioLabel, { color: colors.textTertiary }]}>{t("providerDashboard.providerProfile.aboutMe")}</Text>
            <Text style={[styles.bioText, { color: colors.textOnDark }]}>{bio || t("providerDashboard.providerProfile.bioPlaceholder")}</Text>
          </View>

          {/* Menu options */}
          <View style={styles.menuList}>
            {menuItems.map((item, idx) => (
              <TouchableOpacity key={idx} style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => (item.href ? router.push(item.href as never) : undefined)} activeOpacity={0.7} disabled={!item.href}>
                <View style={styles.menuIconBox}>
                  <Ionicons name={item.icon} size={20} color={colors.primary} />
                </View>
                <View style={styles.menuTextWrap}>
                  <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>{t(item.labelKey)}</Text>
                  <Text style={[styles.menuDesc, { color: colors.textTertiary }]}>{t(item.descKey, item.descParams)}</Text>
                </View>
                {item.href && <Text style={[styles.menuArrow, { color: colors.textTertiary }]}>→</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* App version label and logout button — same layout/behavior as Client profile */}
        <ProfileFooter />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
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
    borderWidth: 4,
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
  },
  avatarInitials: {
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
    borderWidth: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  bioCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  bioLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  bioText: {
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
    borderWidth: 1,
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
    fontSize: 14,
    fontWeight: "500",
  },
  menuDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  menuArrow: {
    fontSize: 14,
  },
  modeSwitchWrap: {
    alignItems: "flex-end",
  },
});
