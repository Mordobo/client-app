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
  colors: import('@/utils/themeStyles').ThemeColors;
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
              <Text style={[styles.arrow, { color: colors.textTertiary }]}>→</Text>
            </Wrapper>
          );
        })}
      </View>
    </View>
  );
}

export default function ProviderSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const accountRows: SettingsRow[] = [
    { icon: "person-outline", labelKey: "providerDashboard.providerSettings.editProfile", descKey: "providerDashboard.providerSettings.editProfileDesc", route: "/(provider-tabs)/profile/edit" },
    { icon: "lock-closed-outline", labelKey: "providerDashboard.providerSettings.security", descKey: "providerDashboard.providerSettings.securityDesc", route: "/(provider-tabs)/profile/security" },
    { icon: "document-text-outline", labelKey: "providerDashboard.providerSettings.documents", descKey: "providerDashboard.providerSettings.documentsDesc", route: "/(provider-tabs)/profile/documents" },
  ];
  const preferencesRows: SettingsRow[] = [
    { icon: "notifications-outline", labelKey: "providerDashboard.providerSettings.notifications", descKey: "providerDashboard.providerSettings.notificationsDesc", route: "/(provider-tabs)/profile/notification-preferences" },
    { icon: "language-outline", labelKey: "providerDashboard.providerSettings.language", descKey: "providerDashboard.providerSettings.languageDesc", route: "/(provider-tabs)/profile/language" },
    { icon: "moon-outline", labelKey: "providerDashboard.providerSettings.theme", descKey: "providerDashboard.providerSettings.themeDesc", route: "/(provider-tabs)/profile/theme" },
  ];
  const businessRows: SettingsRow[] = [
    { icon: "card-outline", labelKey: "providerDashboard.providerSettings.paymentMethods", descKey: "providerDashboard.providerSettings.paymentMethodsDesc", route: "/(provider-tabs)/profile/payment-methods" },
    { icon: "location-outline", labelKey: "providerDashboard.providerSettings.serviceArea", descKey: "providerDashboard.providerSettings.serviceAreaDesc", route: "/(provider-tabs)/profile/service-area" },
    { icon: "stats-chart-outline", labelKey: "providerDashboard.providerSettings.statistics", descKey: "providerDashboard.providerSettings.statisticsDesc", route: "/(provider-tabs)/profile/statistics" },
  ];
  const supportRows: SettingsRow[] = [
    { icon: "help-circle-outline", labelKey: "providerDashboard.providerSettings.helpCenter", descKey: "providerDashboard.providerSettings.helpCenterDesc", route: "/(provider-tabs)/profile/help-center" },
    { icon: "chatbubble-ellipses-outline", labelKey: "providerDashboard.providerSettings.contactSupport", descKey: "providerDashboard.providerSettings.contactSupportDesc", route: "/(provider-tabs)/profile/contact-support" },
    { icon: "document-outline", labelKey: "providerDashboard.providerSettings.termsPrivacy", descKey: "providerDashboard.providerSettings.termsPrivacyDesc", route: "/(provider-tabs)/profile/terms-privacy" },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace("/(provider-tabs)/profile" as never)}
          activeOpacity={0.8}
          accessibilityLabel={t("providerDashboard.providerSettings.back")}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t("providerDashboard.providerSettings.title")}</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <SettingsSection
          sectionTitleKey="providerDashboard.providerSettings.sectionAccount"
          rows={accountRows}
          onRowPress={(route) => router.push(route as never)}
          colors={colors}
        />
        <SettingsSection
          sectionTitleKey="providerDashboard.providerSettings.sectionPreferences"
          rows={preferencesRows}
          onRowPress={(route) => router.push(route as never)}
          colors={colors}
        />
        <SettingsSection
          sectionTitleKey="providerDashboard.providerSettings.sectionBusiness"
          rows={businessRows}
          onRowPress={(route) => router.push(route as never)}
          colors={colors}
        />
        <SettingsSection
          sectionTitleKey="providerDashboard.providerSettings.sectionSupport"
          rows={supportRows}
          onRowPress={(route) => router.push(route as never)}
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
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  sectionRows: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
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
    fontSize: 14,
    fontWeight: "500",
  },
  rowDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  arrow: {
    fontSize: 14,
  },
});
