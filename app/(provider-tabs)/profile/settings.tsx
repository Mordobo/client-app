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

const BACKGROUND = "#12121A";
const CARD_BG = "#1E1B2E";
const CARD_BORDER = "rgba(61, 51, 112, 0.2)";
const SECTION_HEADER_COLOR = "rgba(255,255,255,0.4)";

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
                <Ionicons name={row.icon} size={20} color="#8B5CF6" />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{t(row.labelKey)}</Text>
                <Text style={styles.rowDesc}>{t(row.descKey)}</Text>
              </View>
              <Text style={styles.arrow}>→</Text>
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

  const accountRows: SettingsRow[] = [
    { icon: "person-outline", labelKey: "providerDashboard.providerSettings.editProfile", descKey: "providerDashboard.providerSettings.editProfileDesc" },
    { icon: "lock-closed-outline", labelKey: "providerDashboard.providerSettings.security", descKey: "providerDashboard.providerSettings.securityDesc" },
    { icon: "document-text-outline", labelKey: "providerDashboard.providerSettings.documents", descKey: "providerDashboard.providerSettings.documentsDesc" },
  ];
  const preferencesRows: SettingsRow[] = [
    { icon: "notifications-outline", labelKey: "providerDashboard.providerSettings.notifications", descKey: "providerDashboard.providerSettings.notificationsDesc", route: "/(provider-tabs)/profile/notification-preferences" },
    { icon: "language-outline", labelKey: "providerDashboard.providerSettings.language", descKey: "providerDashboard.providerSettings.languageDesc" },
    { icon: "moon-outline", labelKey: "providerDashboard.providerSettings.theme", descKey: "providerDashboard.providerSettings.themeDesc" },
  ];
  const businessRows: SettingsRow[] = [
    { icon: "card-outline", labelKey: "providerDashboard.providerSettings.paymentMethods", descKey: "providerDashboard.providerSettings.paymentMethodsDesc", route: "/(provider-tabs)/profile/payment-methods" },
    { icon: "location-outline", labelKey: "providerDashboard.providerSettings.serviceArea", descKey: "providerDashboard.providerSettings.serviceAreaDesc", route: "/(provider-tabs)/profile/service-area" },
    { icon: "stats-chart-outline", labelKey: "providerDashboard.providerSettings.statistics", descKey: "providerDashboard.providerSettings.statisticsDesc" },
  ];
  const supportRows: SettingsRow[] = [
    { icon: "help-circle-outline", labelKey: "providerDashboard.providerSettings.helpCenter", descKey: "providerDashboard.providerSettings.helpCenterDesc" },
    { icon: "chatbubble-outline", labelKey: "providerDashboard.providerSettings.contactSupport", descKey: "providerDashboard.providerSettings.contactSupportDesc" },
    { icon: "document-outline", labelKey: "providerDashboard.providerSettings.termsPrivacy", descKey: "providerDashboard.providerSettings.termsPrivacyDesc" },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
          accessibilityLabel={t("providerDashboard.providerSettings.back")}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={styles.title}>{t("providerDashboard.providerSettings.title")}</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <SettingsSection
          sectionTitleKey="providerDashboard.providerSettings.sectionAccount"
          rows={accountRows}
        />
        <SettingsSection
          sectionTitleKey="providerDashboard.providerSettings.sectionPreferences"
          rows={preferencesRows}
          onRowPress={(route) => router.push(route)}
        />
        <SettingsSection
          sectionTitleKey="providerDashboard.providerSettings.sectionBusiness"
          rows={businessRows}
          onRowPress={(route) => router.push(route)}
        />
        <SettingsSection
          sectionTitleKey="providerDashboard.providerSettings.sectionSupport"
          rows={supportRows}
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
    color: "#fff",
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
    color: SECTION_HEADER_COLOR,
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
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
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
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  rowDesc: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    marginTop: 2,
  },
  arrow: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 14,
  },
});
