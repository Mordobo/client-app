import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { t } from "@/i18n";
import { submitOnboardingStep } from "@/services/providers";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TOTAL_STEPS = 8;

const MIN_DURATION_HOURS = 1;
const MAX_DURATION_HOURS = 24;
const DURATION_STEP = 1;

interface Service {
  id: string;
  name: string;
  price: string;
  durationHours: number;
  active: boolean;
}

function createNewService(): Service {
  return {
    id: `service-${Date.now()}`,
    name: "",
    price: "",
    durationHours: 1,
    active: true,
  };
}

/** Allow only digits and one decimal point, max 2 decimal places (money format). */
function parseMoneyInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
  const [whole = "", decimals = ""] = cleaned.split(".");
  return decimals.length > 2 ? `${whole}.${decimals.slice(0, 2)}` : cleaned;
}

/** Format price with thousand separators (comma) for display. */
function formatPriceWithThousands(price: string): string {
  if (!price) return price;
  const [whole = "", decimals = ""] = price.split(".");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decimals ? `${withCommas}.${decimals}` : withCommas;
}

export default function ProviderOnboardingServicesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [services, setServices] = useState<Service[]>([]);

  const toggleService = useCallback((id: string) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s)));
  }, []);

  const updateServicePrice = useCallback((id: string, raw: string) => {
    const price = raw === "" ? "" : parseMoneyInput(raw);
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, price } : s)));
  }, []);

  const updateServiceName = useCallback((id: string, name: string) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  }, []);

  const updateServiceDuration = useCallback((id: string, durationHours: number) => {
    const hours = Math.round(durationHours);
    const clamped = Math.min(MAX_DURATION_HOURS, Math.max(MIN_DURATION_HOURS, hours));
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, durationHours: clamped } : s)));
  }, []);

  const durationStep = useCallback((id: string, delta: number) => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const next = s.durationHours + delta;
        const clamped = Math.min(MAX_DURATION_HOURS, Math.max(MIN_DURATION_HOURS, Math.round(next)));
        return { ...s, durationHours: clamped };
      }),
    );
  }, []);

  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setSaving(false);
    }, []),
  );

  const handleBack = () => {
    router.back();
  };

  const handleContinue = async () => {
    setSaving(true);
    try {
      await submitOnboardingStep(2, {});
      router.push("/provider-onboarding/availability");
    } catch (e) {
      console.error("[Services] submitOnboardingStep failed:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleAddService = useCallback(() => {
    setServices((prev) => [...prev, createNewService()]);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ProgressBar currentStep={2} totalSteps={TOTAL_STEPS} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t("providerOnboarding.services.title")}</Text>
        <Text style={styles.subtitle}>{t("providerOnboarding.services.subtitle")}</Text>
        <Text style={styles.optionalNote}>{t("providerOnboarding.services.optionalNote")}</Text>

        <View style={styles.servicesList}>
          {services.map((service) => (
            <View key={service.id} style={[styles.serviceCard, service.active && styles.serviceCardActive]}>
              <View style={styles.serviceHeader}>
                <View style={styles.serviceInfo}>
                  <TextInput style={styles.serviceNameInput} value={service.name} onChangeText={(name) => updateServiceName(service.id, name)} placeholder={t("providerOnboarding.services.newServiceName")} placeholderTextColor="rgba(255, 255, 255, 0.35)" />
                  <View style={styles.durationRow}>
                    <Text style={styles.durationLabel}>{t("providerOnboarding.services.duration")}</Text>
                    <View style={styles.durationStepper}>
                      <TouchableOpacity style={styles.durationBtn} onPress={() => durationStep(service.id, -DURATION_STEP)} activeOpacity={0.7}>
                        <Ionicons name="remove" size={16} color="rgba(255, 255, 255, 0.8)" />
                      </TouchableOpacity>
                      <TextInput
                        style={styles.durationInput}
                        value={String(service.durationHours)}
                        onChangeText={(text) => {
                          const cleaned = text.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
                          const parsed = parseFloat(cleaned) || 0;
                          updateServiceDuration(service.id, parsed);
                        }}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor="rgba(255, 255, 255, 0.35)"
                      />
                      <Text style={styles.durationUnit}>{service.durationHours === 1 ? t("providerOnboarding.services.durationUnit") : t("providerOnboarding.services.durationUnitPlural")}</Text>
                      <TouchableOpacity style={styles.durationBtn} onPress={() => durationStep(service.id, DURATION_STEP)} activeOpacity={0.7}>
                        <Ionicons name="add" size={16} color="rgba(255, 255, 255, 0.8)" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
                <TouchableOpacity onPress={() => toggleService(service.id)} activeOpacity={0.7} style={styles.checkboxTouchable}>
                  {service.active ?
                    <LinearGradient colors={["#6366F1", "#8B5CF6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.checkbox, styles.checkboxActive]}>
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    </LinearGradient>
                  : <View style={styles.checkbox} />}
                </TouchableOpacity>
              </View>
              <View style={styles.serviceFooter}>
                <LinearGradient colors={["#6366F1", "#EC4899"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.priceGradient}>
                  <Text style={styles.currencySymbol}>{t("providerOnboarding.services.currencySymbol")}</Text>
                  <TextInput style={styles.priceInput} value={formatPriceWithThousands(service.price)} onChangeText={(text) => updateServicePrice(service.id, text)} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="rgba(255, 255, 255, 0.6)" />
                </LinearGradient>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.addServiceButton} onPress={handleAddService} activeOpacity={0.7}>
            <Ionicons name="add" size={16} color="rgba(255, 255, 255, 0.4)" />
            <Text style={styles.addServiceText}>{t("providerOnboarding.services.addService")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>{t("providerOnboarding.services.back")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue} activeOpacity={0.8} disabled={saving}>
          <LinearGradient colors={["#6366F1", "#8B5CF6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.continueButtonGradient}>
            {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.continueButtonText}>{t("providerOnboarding.services.continue")}</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
    marginBottom: 8,
  },
  optionalNote: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.45)",
    fontStyle: "italic",
    marginBottom: 20,
  },
  servicesList: {
    gap: 10,
  },
  serviceCard: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  serviceCardActive: {
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    borderColor: "rgba(139, 92, 246, 0.3)",
  },
  serviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceNameInput: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
    marginBottom: 6,
    paddingVertical: 2,
    paddingHorizontal: 0,
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  durationLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
  },
  durationStepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  durationBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  durationInput: {
    width: 44,
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
    paddingVertical: 4,
    paddingHorizontal: 6,
    textAlign: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
  },
  durationUnit: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    minWidth: 24,
  },
  checkboxTouchable: {
    alignSelf: "flex-start",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: {
    backgroundColor: "transparent",
  },
  serviceFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 56,
    gap: 2,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  priceInput: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    padding: 0,
    minWidth: 48,
  },
  addServiceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  addServiceText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.4)",
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
});
