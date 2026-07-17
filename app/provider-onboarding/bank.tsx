import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { useThemeColors } from "@/hooks/useThemeColors";
import { t } from "@/i18n";
import { submitOnboardingStep } from "@/services/providers";
import { DOMINICAN_BANKS } from "@/constants/dominicanBanks";
import { formatAccountNumberDisplay, normalizeAccountNumber, validateAccountNumber } from "@/utils/accountNumberValidation";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TOTAL_STEPS = 8;

/** Dominican Republic banks for the dropdown - step 6 of onboarding */
const LOCAL_BANKS = DOMINICAN_BANKS;

type BankErrorKey = "errorClabeRequired" | "errorClabeLength" | "errorClabeInvalid";

function getClabeErrorKey(error: string | undefined): BankErrorKey | null {
  if (!error) return null;
  switch (error) {
    case "accountRequired":
      return "errorClabeRequired";
    case "accountLength":
      return "errorClabeLength";
    default:
      return null;
  }
}

export default function ProviderOnboardingBankScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const [selectedBank, setSelectedBank] = useState<{ id: string; name: string } | null>(null);
  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [clabeRaw, setClabeRaw] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [touched, setTouched] = useState({ clabe: false, accountHolder: false });

  const clabeDisplay = formatAccountNumberDisplay(clabeRaw);
  const clabeValidation = validateAccountNumber(normalizeAccountNumber(clabeRaw));
  const clabeErrorKey = getClabeErrorKey(clabeValidation.error);
  const clabeError = touched.clabe && !clabeValidation.isValid && clabeErrorKey ? t(`providerOnboarding.bank.${clabeErrorKey}`) : null;

  const accountHolderTrimmed = accountHolder.trim();
  const accountHolderError = touched.accountHolder && !accountHolderTrimmed ? t("providerOnboarding.bank.errorAccountHolderRequired") : null;

  const hasValidBankData = selectedBank !== null && clabeValidation.isValid && accountHolderTrimmed.length > 0;
  const canContinue = true;

  const handleClabeChange = useCallback((text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 20);
    setClabeRaw(digits);
  }, []);

  const handleBack = () => {
    router.back();
  };

  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setSaving(false);
    }, []),
  );

  const handleContinue = async () => {
    setSaving(true);
    try {
      if (hasValidBankData) {
        const clabe = normalizeAccountNumber(clabeRaw);
        await submitOnboardingStep(5, {
          bankName: selectedBank!.name,
          clabe,
          accountHolder: accountHolderTrimmed,
        });
      } else {
        await submitOnboardingStep(5, {});
      }
      router.push("/provider-onboarding/terms");
    } catch (e) {
      console.error("[Bank] submitOnboardingStep failed:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectBank = (bank: { id: string; name: string }) => {
    setSelectedBank(bank);
    setBankModalVisible(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.screenBackground }]}>
      <ProgressBar currentStep={5} totalSteps={TOTAL_STEPS} />

      <ScrollView style={[styles.scrollView, { backgroundColor: theme.screenBackground }]} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: theme.textPrimary }]}>{t("providerOnboarding.bank.title")}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{t("providerOnboarding.bank.subtitle")}</Text>

        <View style={styles.form}>
          {/* Bank dropdown */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{t("providerOnboarding.bank.bank")}</Text>
            <TouchableOpacity
              style={[styles.selectContainer, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
              onPress={() => setBankModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.selectText,
                  { color: selectedBank ? theme.textPrimary : theme.textTertiary },
                ]}
                numberOfLines={1}
              >
                {selectedBank ? selectedBank.name : t("providerOnboarding.bank.selectBank")}
              </Text>
              <View style={styles.selectIconWrapper}>
                <Ionicons name="chevron-down" size={16} color={theme.iconSecondary} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Account number / CLABE with input mask */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{t("providerOnboarding.bank.clabe")}</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, color: theme.textPrimary },
                clabeError ? styles.inputError : null,
              ]}
              placeholder={t("providerOnboarding.bank.clabePlaceholder")}
              placeholderTextColor={theme.textTertiary}
              value={clabeDisplay}
              onChangeText={handleClabeChange}
              onBlur={() => setTouched((p) => ({ ...p, clabe: true }))}
              keyboardType="numeric"
              maxLength={22}
            />
            <Text style={[styles.hint, { color: theme.textTertiary }]}>{t("providerOnboarding.bank.clabeHint")}</Text>
            {clabeError ?
              <Text style={styles.errorText}>{clabeError}</Text>
            : null}
          </View>

          {/* Account holder name (required) */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{t("providerOnboarding.bank.accountHolder")}</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, color: theme.textPrimary },
                accountHolderError ? styles.inputError : null,
              ]}
              placeholder={t("providerOnboarding.bank.accountHolderPlaceholder")}
              placeholderTextColor={theme.textTertiary}
              value={accountHolder}
              onChangeText={setAccountHolder}
              onBlur={() => setTouched((p) => ({ ...p, accountHolder: true }))}
              autoCapitalize="words"
            />
            <Text style={[styles.hint, { color: theme.textTertiary }]}>{t("providerOnboarding.bank.accountHolderHint")}</Text>
            {accountHolderError ?
              <Text style={styles.errorText}>{accountHolderError}</Text>
            : null}
          </View>

          {/* Informative card: Weekly payments */}
          <View style={[styles.paymentInfoCard, { backgroundColor: `${theme.primary}18`, borderColor: `${theme.primary}33` }]}>
            <Text style={styles.paymentIcon}>💳</Text>
            <View style={styles.paymentInfo}>
              <Text style={[styles.paymentTitle, { color: theme.textPrimary }]}>{t("providerOnboarding.bank.weeklyPayments")}</Text>
              <Text style={[styles.paymentDesc, { color: theme.textSecondary }]}>{t("providerOnboarding.bank.weeklyPaymentsDesc")}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.surfaceSecondary }]} onPress={handleBack} activeOpacity={0.7}>
          <Text style={[styles.backButtonText, { color: theme.textSecondary }]}>{t("providerOnboarding.bank.back")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.continueButton, (!canContinue || saving) && styles.continueButtonDisabled]} onPress={handleContinue} activeOpacity={0.8} disabled={!canContinue || saving}>
          <LinearGradient colors={canContinue && !saving ? ["#6366F1", "#8B5CF6"] : ["#4B5563", "#4B5563"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.continueButtonGradient}>
            {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={[styles.continueButtonText, (!canContinue || saving) && styles.continueButtonTextDisabled]}>{t("providerOnboarding.bank.continue")}</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Bank selection modal */}
      <Modal visible={bankModalVisible} transparent animationType="slide" onRequestClose={() => setBankModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setBankModalVisible(false)} />
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16, backgroundColor: theme.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{t("providerOnboarding.bank.selectBank")}</Text>
            <FlatList
              data={LOCAL_BANKS}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.bankOption, { borderBottomColor: theme.border }]} onPress={() => handleSelectBank(item)} activeOpacity={0.7}>
                  <Text style={[styles.bankOptionText, { color: theme.textPrimary }]}>{item.name}</Text>
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
    marginBottom: 4,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 12,
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
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  backButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "500",
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
