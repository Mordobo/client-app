import { useThemeColors } from "@/hooks/useThemeColors";
import { t } from "@/i18n";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ThemeColors } from "@/utils/themeStyles";

type SettingsRow = {
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: string;
  descKey: string;
  route?: string;
};

function SettingsSection({
  sectionTitleKey,
  rows,
  onRowPress,
  colors,
}: {
  sectionTitleKey: string;
  rows: SettingsRow[];
  onRowPress?: (route: string) => void;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{t(sectionTitleKey)}</Text>
      <View style={styles.sectionRows}>
        {rows.map((row, idx) => {
          const Wrapper = row.route ? TouchableOpacity : View;
          const wrapperProps = row.route
            ? { onPress: () => onRowPress?.(row.route!), activeOpacity: 0.8 }
            : {};
          return (
            <Wrapper key={idx} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} {...wrapperProps}>
              <View style={styles.iconBox}>
                <Ionicons name={row.icon} size={20} color={colors.primary} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{t(row.labelKey)}</Text>
                <Text style={[styles.rowDesc, { color: colors.textTertiary }]}>{t(row.descKey)}</Text>
              </View>
              {row.route ? (
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              ) : null}
            </Wrapper>
          );
        })}
      </View>
    </View>
  );
}

export default function ClientConfigurationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  // Account: Edit Profile + Security only (Documents excluded for client)
  const accountRows: SettingsRow[] = [
    {
      icon: "person-outline",
      labelKey: "providerDashboard.providerSettings.editProfile",
      descKey: "providerDashboard.providerSettings.editProfileDesc",
      route: "/account/edit",
    },
    {
      icon: "lock-closed-outline",
      labelKey: "providerDashboard.providerSettings.security",
      descKey: "providerDashboard.providerSettings.securityDesc",
      route: "/account/security",
    },
  ];

  const preferencesRows: SettingsRow[] = [
    {
      icon: "notifications-outline",
      labelKey: "providerDashboard.providerSettings.notifications",
      descKey: "providerDashboard.providerSettings.notificationsDesc",
      route: "/account/notification-preferences",
    },
    {
      icon: "language-outline",
      labelKey: "providerDashboard.providerSettings.language",
      descKey: "providerDashboard.providerSettings.languageDesc",
      route: "/account/language",
    },
    {
      icon: "moon-outline",
      labelKey: "providerDashboard.providerSettings.theme",
      descKey: "providerDashboard.providerSettings.themeDesc",
      route: "/account/theme",
    },
  ];

  const supportRows: SettingsRow[] = [
    {
      icon: "help-circle-outline",
      labelKey: "providerDashboard.providerSettings.helpCenter",
      descKey: "providerDashboard.providerSettings.helpCenterDesc",
      route: "/account/support",
    },
    {
      icon: "document-outline",
      labelKey: "providerDashboard.providerSettings.termsPrivacy",
      descKey: "providerDashboard.providerSettings.termsPrivacyDesc",
      route: "/account/support",
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 16,
            paddingBottom: 20,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityLabel={t("providerDashboard.providerSettings.back")}
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t("providerDashboard.providerSettings.title")}</Text>
        <View style={styles.headerPlaceholder} />
      </View>
      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <SettingsSection
          sectionTitleKey="providerDashboard.providerSettings.sectionAccount"
          rows={accountRows}
          onRowPress={(route) => router.push(route as any)}
          colors={colors}
        />
        <SettingsSection
          sectionTitleKey="providerDashboard.providerSettings.sectionPreferences"
          rows={preferencesRows}
          onRowPress={(route) => router.push(route as any)}
          colors={colors}
        />
        <SettingsSection
          sectionTitleKey="providerDashboard.providerSettings.sectionSupport"
          rows={supportRows}
          onRowPress={(route) => router.push(route as any)}
          colors={colors}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 4,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  headerPlaceholder: {
    width: 32,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  sectionRows: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  rowDesc: {
    fontSize: 12,
    marginTop: 2,
  },
});
