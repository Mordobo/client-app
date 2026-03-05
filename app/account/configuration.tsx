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

// Client design tokens (aligned with profile, support, edit)
const BACKGROUND = "#1a1a2e";
const HEADER_BG = "#252542";
const CARD_BG = "#252542";
const CARD_BORDER = "#374151";
const SECTION_HEADER_COLOR = "#9ca3af";
const PRIMARY = "#3b82f6";
const PRIMARY_20 = "#3b82f620";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "#9ca3af";

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
}: {
  sectionTitleKey: string;
  rows: SettingsRow[];
  onRowPress?: (route: string) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t(sectionTitleKey)}</Text>
      <View style={styles.sectionRows}>
        {rows.map((row, idx) => {
          const Wrapper = row.route ? TouchableOpacity : View;
          const wrapperProps = row.route
            ? { onPress: () => onRowPress?.(row.route!), activeOpacity: 0.8 }
            : {};
          return (
            <Wrapper key={idx} style={styles.row} {...wrapperProps}>
              <View style={styles.iconBox}>
                <Ionicons name={row.icon} size={20} color={PRIMARY} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{t(row.labelKey)}</Text>
                <Text style={styles.rowDesc}>{t(row.descKey)}</Text>
              </View>
              {row.route ? (
                <Ionicons name="chevron-forward" size={20} color={TEXT_SECONDARY} />
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
      icon: "chatbubble-outline",
      labelKey: "providerDashboard.providerSettings.contactSupport",
      descKey: "providerDashboard.providerSettings.contactSupportDesc",
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
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 16,
            paddingBottom: 20,
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
          <Ionicons name="arrow-back" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.title}>{t("providerDashboard.providerSettings.title")}</Text>
        <View style={styles.headerPlaceholder} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <SettingsSection
          sectionTitleKey="providerDashboard.providerSettings.sectionAccount"
          rows={accountRows}
          onRowPress={(route) => router.push(route as any)}
        />
        <SettingsSection
          sectionTitleKey="providerDashboard.providerSettings.sectionPreferences"
          rows={preferencesRows}
          onRowPress={(route) => router.push(route as any)}
        />
        <SettingsSection
          sectionTitleKey="providerDashboard.providerSettings.sectionSupport"
          rows={supportRows}
          onRowPress={(route) => router.push(route as any)}
        />
      </ScrollView>
    </View>
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
    gap: 16,
    paddingHorizontal: 20,
    backgroundColor: HEADER_BG,
  },
  backButton: {
    padding: 4,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    color: TEXT_PRIMARY,
  },
  headerPlaceholder: {
    width: 32,
  },
  scroll: {
    flex: 1,
    backgroundColor: BACKGROUND,
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
    color: SECTION_HEADER_COLOR,
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
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: PRIMARY_20,
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
    color: TEXT_PRIMARY,
  },
  rowDesc: {
    fontSize: 12,
    marginTop: 2,
    color: TEXT_SECONDARY,
  },
});
