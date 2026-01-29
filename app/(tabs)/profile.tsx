import { ModeSwitch } from "@/components/common/ModeSwitch";
import { Toast } from "@/components/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { useMode } from "@/contexts/ModeContext";
import { t } from "@/i18n";
import { ApiError } from "@/services/auth";
import { fetchOrders } from "@/services/orders";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface UserStats {
  services: number;
  reviews: number;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { mode, setMode } = useMode();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<UserStats>({ services: 0, reviews: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("success");

  const loadStats = useCallback(async () => {
    try {
      const ordersData = await fetchOrders();

      setStats({
        services: Array.isArray(ordersData) ? ordersData.length : 0,
        reviews: 0, // TODO: Get from reviews endpoint when available
      });
    } catch (error) {
      console.error("Error loading stats:", error);
      // Keep default values on error
      setStats({ services: 0, reviews: 0 });
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleLogout = () => {
    const performLogout = async () => {
      try {
        console.log("[Profile] ========== LOGOUT BUTTON PRESSED ==========");

        // Perform logout (clears user state and storage)
        await logout();

        console.log("[Profile] Logout function completed, navigating...");

        // Use a small delay to ensure state has updated
        // Then navigate to auth root which will redirect to welcome
        setTimeout(() => {
          try {
            console.log("[Profile] Attempting navigation to /(auth)...");

            // Navigate to auth root - the index will redirect to welcome
            router.replace("/(auth)");

            console.log("[Profile] Navigation completed");
          } catch (navError) {
            console.error("[Profile] Navigation error:", navError);
            // Try alternative navigation
            try {
              router.replace("/(auth)/welcome");
            } catch (altNavError) {
              console.error("[Profile] Alternative navigation also failed:", altNavError);
            }
          }
        }, 100);
      } catch (error) {
        console.error("[Profile] Logout error:", error);
        // Even if logout fails, try to navigate
        try {
          router.replace("/(auth)");
        } catch (navError) {
          console.error("[Profile] Navigation error after logout failure:", navError);
          Alert.alert(t("common.error"), t("profile.logoutError"));
        }
      }
    };

    // Handle Alert differently on web vs mobile
    if (Platform.OS === "web") {
      const confirmed = window.confirm(`${t("profile.logout")}\n\n${t("profile.logoutConfirm")}`);
      if (confirmed) {
        performLogout();
      } else {
      }
    } else {
      Alert.alert(t("profile.logout"), t("profile.logoutConfirm"), [
        {
          text: t("common.cancel"),
          style: "cancel",
        },
        {
          text: t("profile.logout"),
          style: "destructive",
          onPress: performLogout,
        },
      ]);
    }
  };

  const menuItems = [
    { icon: "👤", label: t("profile.editProfile"), route: "/profile/edit" },
    { icon: "📍", label: t("profile.myAddresses"), route: "/profile/my-addresses" },
    { icon: "💳", label: t("profile.paymentMethods"), route: "/profile/payment-methods" },
    { icon: "❤️", label: t("profile.favorites"), route: "/profile/favorites" },
    { icon: "🔔", label: t("profile.notifications"), route: "/profile/settings" },
    { icon: "❓", label: t("profile.helpCenter"), route: "/profile/support" },
  ];

  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : "";

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {/* Header - Exact match to JSX: padding: '50px 20px 30px', backgroundColor: colors.bgCard */}
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + 20,
            },
          ]}
        >
          <View style={styles.profileHeader}>
            {/* Avatar - Exact match: width: '80px', height: '80px', borderRadius: '50%', border: '3px solid primary' */}
            <View style={styles.avatarContainer}>
              {user?.avatar ?
                <Image source={{ uri: user.avatar }} style={styles.avatarImage} contentFit="cover" />
              : <Ionicons name="person" size={40} color="#3b82f6" />}
            </View>
            <View style={styles.profileInfo}>
              {/* Name - Exact match: fontSize: '22px', fontWeight: '700' */}
              <Text style={styles.userName}>{fullName || t("profile.guest")}</Text>
              {/* Email - Exact match: fontSize: '14px', color: textSecondary */}
              <Text style={styles.userEmail}>{user?.email || ""}</Text>
              {/* Badge - Exact match: backgroundColor: secondary20, padding: '4px 10px', borderRadius: '12px' */}
              <View style={styles.badge}>
                <Text style={styles.badgeText}>⭐ {t("profile.goldClient")}</Text>
              </View>
            </View>
          </View>

          {/* Mode Switch - Prominently displayed in profile header */}
          <View style={styles.modeSwitchContainer}>
            <Text style={styles.modeSwitchLabel}>{t("mode.switchMode")}</Text>
            <View style={{ alignItems: "center", width: "100%" }}>
              <ModeSwitch
                variant="pill"
                currentMode={mode}
                onModeChange={async (newMode) => {
                  try {
                    // setMode will throw if backend sync fails
                    const result = await setMode(newMode);

                    // Check if onboarding is needed
                    if (result.needsOnboarding) {
                      // Navigate to onboarding
                      router.push("/provider-onboarding");
                      return;
                    }

                    // Only show success if no error was thrown and we didn't navigate to onboarding
                    setToastMessage(t("mode.modeChanged"));
                    setToastType("success");
                    setToastVisible(true);
                  } catch (error: unknown) {
                    console.error("[Profile] Failed to change mode:", error);
                    // Extract error message from ApiError
                    let errorMessage = t("errors.updateSettingsFailed");
                    if (error instanceof ApiError) {
                      errorMessage = error.message;
                      // If the error has a data object with a message, prefer that
                      if (error.data && typeof error.data === "object" && "message" in error.data) {
                        errorMessage = String(error.data.message);
                      }
                    } else if (error instanceof Error) {
                      errorMessage = error.message;
                    }
                    setToastMessage(errorMessage);
                    setToastType("error");
                    setToastVisible(true);
                  }
                }}
                size="medium"
                showLabels={true}
              />
            </View>
          </View>
        </View>

        {/* Stats Cards - Exact match: display: 'flex', padding: '20px', gap: '12px', marginTop: '-10px' */}
        <View style={[styles.statsContainer, { marginTop: -10 }]}>
          {[
            { value: loadingStats ? "..." : stats.services.toString(), label: t("profile.services") },
            { value: loadingStats ? "..." : stats.reviews.toString(), label: t("profile.reviews") },
          ].map((stat, i) => (
            <View key={i} style={styles.statCard}>
              {/* Value - Exact match: color: primary, fontSize: '20px', fontWeight: '700' */}
              <Text style={styles.statValue}>{stat.value}</Text>
              {/* Label - Exact match: color: textSecondary, fontSize: '12px' */}
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Menu Items - Exact match: padding: '0 20px' */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.menuItem, i === menuItems.length - 1 && styles.menuItemLast]}
              onPress={() => {
                if (item.route) {
                  router.push(item.route as any);
                }
              }}
              activeOpacity={0.7}
            >
              {/* Icon - Exact match: fontSize: '20px' */}
              <Text style={styles.menuIcon}>{item.icon}</Text>
              {/* Label - Exact match: fontSize: '15px', flex: 1 */}
              <Text style={styles.menuLabel}>{item.label}</Text>
              {/* Chevron - Exact match: color: textSecondary, fontSize: '16px' */}
              <Text style={styles.menuChevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button - Exact match: padding: '20px', backgroundColor: danger20, borderRadius: '12px' */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => {
              handleLogout();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutIcon}>🚪</Text>
            <Text style={styles.logoutText}>{t("profile.logout")}</Text>
          </TouchableOpacity>
        </View>

        {/* Version - From requirements */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version 2.0.1</Text>
        </View>
      </ScrollView>

      {/* Toast for mode change notifications */}
      <Toast message={toastMessage} visible={toastVisible} onHide={() => setToastVisible(false)} type={toastType} duration={toastType === "error" ? 4000 : 3000} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e", // Hardcode dark background like Home
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for bottom nav
  },
  // Header: padding: '50px 20px 30px' from JSX
  header: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    backgroundColor: "#252542", // Hardcode dark header
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  // Avatar: width: '80px', height: '80px', borderRadius: '50%', border: '3px solid primary' from JSX
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "#3b82f6", // Hardcode primary color
    backgroundColor: "#2d2d4a", // Hardcode dark input background
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  profileInfo: {
    flex: 1,
  },
  // Name: fontSize: '22px', fontWeight: '700' from JSX
  userName: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
    color: "#FFFFFF", // Hardcode white text
  },
  // Email: fontSize: '14px' from JSX
  userEmail: {
    fontSize: 14,
    marginBottom: 8,
    color: "#9ca3af", // Hardcode secondary text
  },
  // Badge: padding: '4px 10px', borderRadius: '12px' from JSX
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: "flex-start",
    backgroundColor: "#10b98120", // Hardcode secondary20
  },
  badgeText: {
    fontSize: 12,
    color: "#10b981", // Hardcode secondary color
  },
  // Mode Switch Container
  modeSwitchContainer: {
    marginTop: 24,
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 20,
  },
  modeSwitchLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF", // Hardcode white text
    textAlign: "center",
    marginBottom: 4,
  },
  // Stats: display: 'flex', padding: '20px', gap: '12px' from JSX
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  // Stat Card: flex: 1, backgroundColor: bgCard, borderRadius: '12px', padding: '16px', textAlign: 'center' from JSX
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    backgroundColor: "#252542", // Hardcode dark card background
  },
  // Value: color: primary, fontSize: '20px', fontWeight: '700' from JSX
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
    color: "#3b82f6", // Hardcode primary color
  },
  // Label: fontSize: '12px' from JSX
  statLabel: {
    fontSize: 12,
    color: "#9ca3af", // Hardcode secondary text
  },
  // Menu: padding: '0 20px' from JSX
  menuContainer: {
    paddingHorizontal: 20,
  },
  // Menu Item: display: 'flex', gap: '14px', padding: '16px 0' from JSX
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#374151", // Hardcode dark border
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIcon: {
    fontSize: 20,
  },
  // Label: fontSize: '15px', flex: 1 from JSX
  menuLabel: {
    fontSize: 15,
    flex: 1,
    color: "#FFFFFF", // Hardcode white text
  },
  // Chevron: fontSize: '16px' from JSX
  menuChevron: {
    fontSize: 16,
    color: "#9ca3af", // Hardcode secondary text
  },
  // Logout: padding: '20px' from JSX
  logoutContainer: {
    padding: 20,
  },
  // Logout Button: padding: '16px', borderRadius: '12px', display: 'flex', gap: '8px' from JSX
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
    backgroundColor: "#ef444420", // Hardcode danger20
  },
  logoutIcon: {
    fontSize: 20,
  },
  // Logout Text: fontSize: '15px', fontWeight: '600' from JSX
  logoutText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ef4444", // Hardcode danger color
  },
  versionContainer: {
    alignItems: "center",
    paddingVertical: 16,
  },
  versionText: {
    fontSize: 12,
    color: "#9ca3af", // Hardcode secondary text
  },
});
