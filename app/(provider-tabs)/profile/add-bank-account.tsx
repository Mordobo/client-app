import { useThemeColors } from "@/hooks/useThemeColors";
import { t } from "@/i18n";
import { ApiError } from "@/services/auth";
import { updateProviderPayoutBank } from "@/services/providerDashboard";
import { formatClabeDisplay, normalizeClabe, validateClabe } from "@/utils/clabeValidation";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Same list as provider onboarding bank step */
const LOCAL_BANKS: { id: string; name: string }[] = [
  { id: "002", name: "Banamex" },
  { id: "006", name: "Bancomext" },
  { id: "009", name: "Banobras" },
  { id: "012", name: "BBVA México" },
  { id: "014", name: "Santander" },
  { id: "019", name: "Banco Nacional de México" },
  { id: "021", name: "HSBC" },
  { id: "030", name: "Banco del Bajío" },
  { id: "032", name: "IXE" },
  { id: "036", name: "Banamex (Inbursa)" },
  { id: "037", name: "Banco Interacciones" },
  { id: "042", name: "Mifel" },
  { id: "044", name: "Scotiabank" },
  { id: "058", name: "Banregio" },
  { id: "059", name: "Banco Invex" },
  { id: "062", name: "Banorte" },
  { id: "072", name: "Banco Banorte" },
  { id: "102", name: "Bancoppel" },
  { id: "601", name: "Coppel" },
  { id: "646", name: "STP" },
  { id: "901", name: "CLABE (other)" },
];

type BankErrorKey = "errorClabeRequired" | "errorClabeLength" | "errorClabeInvalid";

function getClabeErrorKey(error: string | undefined): BankErrorKey | null {
  if (!error) return null;
  switch (error) {
    case "clabeRequired":
      return "errorClabeRequired";
    case "clabeLength":
      return "errorClabeLength";
    case "clabeInvalidChars":
    case "clabeChecksum":
      return "errorClabeInvalid";
    default:
      return null;
  }
}

export default function ProviderAddBankAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const queryClient = useQueryClient();

  const [selectedBank, setSelectedBank] = useState<{ id: string; name: string } | null>(null);
  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [clabeRaw, setClabeRaw] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [touched, setTouched] = useState({ clabe: false, accountHolder: false });
  const [saving, setSaving] = useState(false);

  const clabeDisplay = formatClabeDisplay(clabeRaw);
  const clabeValidation = validateClabe(normalizeClabe(clabeRaw));
  const clabeErrorKey = getClabeErrorKey(clabeValidation.error);
  const clabeError =
    touched.clabe && !clabeValidation.isValid && clabeErrorKey
      ? t(`providerOnboarding.bank.${clabeErrorKey}`)
      : null;

  const accountHolderTrimmed = accountHolder.trim();
  const accountHolderError =
    touched.accountHolder && !accountHolderTrimmed
      ? t("providerOnboarding.bank.errorAccountHolderRequired")
      : null;

  const hasValidBankData = selectedBank !== null && clabeValidation.isValid && accountHolderTrimmed.length > 0;
  const canSave = hasValidBankData && !saving;

  const handleClabeChange = useCallback((text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 18);
    setClabeRaw(digits);
  }, []);

  const handleSave = async () => {
    if (!hasValidBankData || !selectedBank) return;
    setSaving(true);
    try {
      await updateProviderPayoutBank({
        bankName: selectedBank.name,
        clabe: normalizeClabe(clabeRaw),
        accountHolder: accountHolderTrimmed,
      });
      await queryClient.invalidateQueries({ queryKey: ["provider-bank-accounts"] });
      Alert.alert(t("common.success"), t("providerDashboard.paymentMethods.bankUpdated"), [
        { text: t("common.ok"), onPress: () => router.back() },
      ]);
    } catch (e) {
      const message =
        e instanceof ApiError && e.message.trim().length > 0
          ? e.message
          : t("providerDashboard.paymentMethods.errors.bankUpdateFailed");
      Alert.alert(t("common.error"), message, [{ text: t("common.ok") }]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]}
          onPress={() => router.back()}
          activeOpacity={0.8}
          accessibilityLabel={t("providerDashboard.providerSettings.back")}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={colors.icon} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {t("providerDashboard.paymentMethods.addBankTitle")}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t("providerDashboard.paymentMethods.addBankSubtitle")}
        </Text>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t("providerOnboarding.bank.bank")}</Text>
            <TouchableOpacity
              style={[styles.selectContainer, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
              onPress={() => setBankModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.selectText, { color: selectedBank ? colors.textPrimary : colors.textTertiary }]}
                numberOfLines={1}
              >
                {selectedBank ? selectedBank.name : t("providerOnboarding.bank.selectBank")}
              </Text>
              <View style={styles.selectIconWrapper}>
                <Ionicons name="chevron-down" size={16} color={colors.iconSecondary} />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t("providerOnboarding.bank.clabe")}</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.textPrimary },
                clabeError ? styles.inputError : null,
              ]}
              placeholder={t("providerOnboarding.bank.clabePlaceholder")}
              placeholderTextColor={colors.textTertiary}
              value={clabeDisplay}
              onChangeText={handleClabeChange}
              onBlur={() => setTouched((p) => ({ ...p, clabe: true }))}
              keyboardType="numeric"
              maxLength={22}
            />
            <Text style={[styles.hint, { color: colors.textTertiary }]}>{t("providerOnboarding.bank.clabeHint")}</Text>
            {clabeError ? <Text style={styles.errorText}>{clabeError}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t("providerOnboarding.bank.accountHolder")}
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.textPrimary },
                accountHolderError ? styles.inputError : null,
              ]}
              placeholder={t("providerOnboarding.bank.accountHolderPlaceholder")}
              placeholderTextColor={colors.textTertiary}
              value={accountHolder}
              onChangeText={setAccountHolder}
              onBlur={() => setTouched((p) => ({ ...p, accountHolder: true }))}
              autoCapitalize="words"
            />
            <Text style={[styles.hint, { color: colors.textTertiary }]}>
              {t("providerOnboarding.bank.accountHolderHint")}
            </Text>
            {accountHolderError ? <Text style={styles.errorText}>{accountHolderError}</Text> : null}
          </View>

          <View style={[styles.paymentInfoCard, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}33` }]}>
            <Text style={styles.paymentIcon}>💳</Text>
            <View style={styles.paymentInfo}>
              <Text style={[styles.paymentTitle, { color: colors.textPrimary }]}>
                {t("providerOnboarding.bank.weeklyPayments")}
              </Text>
              <Text style={[styles.paymentDesc, { color: colors.textSecondary }]}>
                {t("providerOnboarding.bank.weeklyPaymentsDesc")}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          onPress={handleSave}
          activeOpacity={0.8}
          disabled={!canSave}
        >
          <LinearGradient
            colors={canSave ? ["#6366F1", "#8B5CF6"] : ["#4B5563", "#4B5563"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveButtonGradient}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={[styles.saveButtonText, !canSave && styles.saveButtonTextDisabled]}>
                {t("providerDashboard.paymentMethods.saveBank")}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <Modal visible={bankModalVisible} transparent animationType="slide" onRequestClose={() => setBankModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setBankModalVisible(false)} />
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16, backgroundColor: colors.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t("providerOnboarding.bank.selectBank")}</Text>
            <FlatList
              data={LOCAL_BANKS}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.bankOption, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setSelectedBank(item);
                    setBankModalVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.bankOptionText, { color: colors.textPrimary }]}>{item.name}</Text>
                  {selectedBank?.id === item.id ? <Ionicons name="checkmark" size={20} color="#8B5CF6" /> : null}
                </TouchableOpacity>
              )}
              style={styles.bankList}
            />
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  form: {
    gap: 16,
  },
  field: {
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
  },
  inputError: {
    borderColor: "rgba(239, 68, 68, 0.5)",
  },
  hint: {
    fontSize: 11,
    marginTop: 4,
    marginLeft: 2,
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 4,
    marginLeft: 2,
  },
  selectContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingRight: 40,
    borderRadius: 12,
    borderWidth: 1,
  },
  selectText: {
    flex: 1,
    fontSize: 14,
  },
  selectIconWrapper: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  paymentInfoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  paymentIcon: {
    fontSize: 18,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  paymentDesc: {
    fontSize: 12,
  },
  buttonContainer: {
    paddingHorizontal: 20,
  },
  saveButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  saveButtonDisabled: {
    opacity: 0.85,
  },
  saveButtonGradient: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  saveButtonTextDisabled: {
    color: "rgba(255, 255, 255, 0.6)",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: "70%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  bankList: {
    maxHeight: 320,
  },
  bankOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  bankOptionText: {
    fontSize: 15,
  },
});
