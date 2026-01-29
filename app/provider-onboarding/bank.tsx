import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { t } from "@/i18n";
import { formatClabeDisplay, normalizeClabe, validateClabe } from "@/utils/clabeValidation";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TOTAL_STEPS = 8;

/** Local banks (Mexico) for dropdown - step 6 of onboarding */
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

export default function ProviderOnboardingBankScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedBank, setSelectedBank] = useState<{ id: string; name: string } | null>(null);
  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [clabeRaw, setClabeRaw] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [touched, setTouched] = useState({ clabe: false, accountHolder: false });

  const clabeDisplay = formatClabeDisplay(clabeRaw);
  const clabeValidation = validateClabe(normalizeClabe(clabeRaw));
  const clabeErrorKey = getClabeErrorKey(clabeValidation.error);
  const clabeError = touched.clabe && !clabeValidation.isValid && clabeErrorKey ? t(`providerOnboarding.bank.${clabeErrorKey}`) : null;

  const accountHolderTrimmed = accountHolder.trim();
  const accountHolderError = touched.accountHolder && !accountHolderTrimmed ? t("providerOnboarding.bank.errorAccountHolderRequired") : null;

  const canContinue = selectedBank !== null && clabeValidation.isValid && accountHolderTrimmed.length > 0;

  const handleClabeChange = useCallback((text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 18);
    setClabeRaw(digits);
  }, []);

  const handleBack = () => {
    router.back();
  };

  const handleContinue = () => {
    setTouched({ clabe: true, accountHolder: true });
    if (!selectedBank) return;
    const clabe = normalizeClabe(clabeRaw);
    const validation = validateClabe(clabe);
    if (!validation.isValid || !accountHolderTrimmed) return;
    // TODO: persist securely (encrypt before sending to API)
    router.push("/provider-onboarding/terms");
  };

  const handleSelectBank = (bank: { id: string; name: string }) => {
    setSelectedBank(bank);
    setBankModalVisible(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ProgressBar currentStep={6} totalSteps={TOTAL_STEPS} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t("providerOnboarding.bank.title")}</Text>
        <Text style={styles.subtitle}>{t("providerOnboarding.bank.subtitle")}</Text>

        <View style={styles.form}>
          {/* Bank dropdown */}
          <View style={styles.field}>
            <Text style={styles.label}>{t("providerOnboarding.bank.bank")}</Text>
            <TouchableOpacity style={styles.selectContainer} onPress={() => setBankModalVisible(true)} activeOpacity={0.7}>
              <Text style={[styles.selectText, !selectedBank && styles.selectPlaceholder]} numberOfLines={1}>
                {selectedBank ? selectedBank.name : t("providerOnboarding.bank.selectBank")}
              </Text>
              <Ionicons name="chevron-down" size={16} color="rgba(255, 255, 255, 0.4)" style={styles.selectIcon} />
            </TouchableOpacity>
          </View>

          {/* Account number / CLABE with input mask */}
          <View style={styles.field}>
            <Text style={styles.label}>{t("providerOnboarding.bank.clabe")}</Text>
            <TextInput style={[styles.input, clabeError ? styles.inputError : null]} placeholder={t("providerOnboarding.bank.clabePlaceholder")} placeholderTextColor="rgba(255, 255, 255, 0.3)" value={clabeDisplay} onChangeText={handleClabeChange} onBlur={() => setTouched((p) => ({ ...p, clabe: true }))} keyboardType="numeric" maxLength={22} />
            <Text style={styles.hint}>{t("providerOnboarding.bank.clabeHint")}</Text>
            {clabeError ?
              <Text style={styles.errorText}>{clabeError}</Text>
            : null}
          </View>

          {/* Account holder name (required) */}
          <View style={styles.field}>
            <Text style={styles.label}>{t("providerOnboarding.bank.accountHolder")}</Text>
            <TextInput style={[styles.input, accountHolderError ? styles.inputError : null]} placeholder={t("providerOnboarding.bank.accountHolderPlaceholder")} placeholderTextColor="rgba(255, 255, 255, 0.3)" value={accountHolder} onChangeText={setAccountHolder} onBlur={() => setTouched((p) => ({ ...p, accountHolder: true }))} autoCapitalize="words" />
            <Text style={styles.hint}>{t("providerOnboarding.bank.accountHolderHint")}</Text>
            {accountHolderError ?
              <Text style={styles.errorText}>{accountHolderError}</Text>
            : null}
          </View>

          {/* Informative card: Weekly payments */}
          <View style={styles.paymentInfoCard}>
            <Text style={styles.paymentIcon}>💳</Text>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentTitle}>{t("providerOnboarding.bank.weeklyPayments")}</Text>
              <Text style={styles.paymentDesc}>{t("providerOnboarding.bank.weeklyPaymentsDesc")}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>{t("providerOnboarding.bank.back")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]} onPress={handleContinue} activeOpacity={0.8} disabled={!canContinue}>
          <LinearGradient colors={canContinue ? ["#6366F1", "#8B5CF6"] : ["#4B5563", "#4B5563"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.continueButtonGradient}>
            <Text style={[styles.continueButtonText, !canContinue && styles.continueButtonTextDisabled]}>{t("providerOnboarding.bank.continue")}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Bank selection modal */}
      <Modal visible={bankModalVisible} transparent animationType="slide" onRequestClose={() => setBankModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setBankModalVisible(false)} />
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t("providerOnboarding.bank.selectBank")}</Text>
            <FlatList
              data={LOCAL_BANKS}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.bankOption} onPress={() => handleSelectBank(item)} activeOpacity={0.7}>
                  <Text style={styles.bankOptionText}>{item.name}</Text>
                  {selectedBank?.id === item.id ?
                    <Ionicons name="checkmark" size={20} color="#8B5CF6" />
                  : null}
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
    backgroundColor: "#12121A",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
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
    color: "rgba(255, 255, 255, 0.7)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    color: "#FFFFFF",
    fontSize: 14,
  },
  inputError: {
    borderColor: "rgba(239, 68, 68, 0.5)",
  },
  hint: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.4)",
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
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  selectText: {
    flex: 1,
    fontSize: 14,
    color: "#FFFFFF",
  },
  selectPlaceholder: {
    color: "rgba(255, 255, 255, 0.3)",
  },
  selectIcon: {
    position: "absolute",
    right: 16,
    top: "50%",
    transform: [{ translateY: -8 }],
  },
  paymentInfoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.2)",
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
    color: "#FFFFFF",
    marginBottom: 4,
  },
  paymentDesc: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  backButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.7)",
  },
  continueButton: {
    flex: 2,
    borderRadius: 12,
    overflow: "hidden",
  },
  continueButtonDisabled: {
    opacity: 0.8,
  },
  continueButtonGradient: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  continueButtonTextDisabled: {
    color: "rgba(255, 255, 255, 0.6)",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1F2937",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: "70%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
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
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  bankOptionText: {
    fontSize: 15,
    color: "#FFFFFF",
  },
});
