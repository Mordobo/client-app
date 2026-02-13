import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { t } from "@/i18n";
import { submitOnboardingStep } from "@/services/providers";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TimePickerField = "start" | "end" | "lunchStart" | "lunchEnd" | null;

function parseTimeString(timeStr: string): Date {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return new Date();
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const isPM = (match[3] || "").toUpperCase() === "PM";
  if (isPM && hours !== 12) hours += 12;
  if (!isPM && hours === 12) hours = 0;
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function formatTimeToDisplay(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const isPM = hours >= 12;
  const h = hours % 12 || 12;
  const m = minutes.toString().padStart(2, "0");
  return `${h}:${m} ${isPM ? "PM" : "AM"}`;
}

/** Convert display time "08:00 AM" / "06:00 PM" to API format "08:00" / "18:00" (24h). */
function displayTimeToHHMM(display: string): string {
  const d = parseTimeString(display);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

const TOTAL_STEPS = 8;
const DAYS = ["L", "M", "X", "J", "V", "S", "D"];
const RADIUS_OPTIONS_KM = [5, 10, 15, 20, 25, 30];

export default function ProviderOnboardingAvailabilityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeDays, setActiveDays] = useState([0, 1, 2, 3, 4]);
  const [startTime, setStartTime] = useState("08:00 AM");
  const [endTime, setEndTime] = useState("06:00 PM");
  const [hasLunchBreak, setHasLunchBreak] = useState(false);
  const [lunchStart, setLunchStart] = useState("01:00 PM");
  const [lunchEnd, setLunchEnd] = useState("02:00 PM");
  const [radiusKm, setRadiusKm] = useState(15);
  const [showTimePicker, setShowTimePicker] = useState<TimePickerField>(null);

  const handleTimeChange = useCallback(
    (field: TimePickerField) => (_event: unknown, selectedDate?: Date) => {
      if (Platform.OS === "android") {
        setShowTimePicker(null);
        if (selectedDate && (_event as { type: string })?.type === "set") {
          const formatted = formatTimeToDisplay(selectedDate);
          if (field === "start") setStartTime(formatted);
          else if (field === "end") setEndTime(formatted);
          else if (field === "lunchStart") setLunchStart(formatted);
          else if (field === "lunchEnd") setLunchEnd(formatted);
        }
      } else {
        if (selectedDate) {
          const formatted = formatTimeToDisplay(selectedDate);
          if (field === "start") setStartTime(formatted);
          else if (field === "end") setEndTime(formatted);
          else if (field === "lunchStart") setLunchStart(formatted);
          else if (field === "lunchEnd") setLunchEnd(formatted);
        }
      }
    },
    [],
  );

  const openTimePicker = useCallback((field: TimePickerField) => {
    setShowTimePicker(field);
  }, []);

  const toggleDay = (index: number) => {
    if (activeDays.includes(index)) {
      setActiveDays(activeDays.filter((d) => d !== index));
    } else {
      setActiveDays([...activeDays, index].sort());
    }
  };

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
      await submitOnboardingStep(3, {
        availability: {
          days: activeDays,
          startTime: displayTimeToHHMM(startTime),
          endTime: displayTimeToHHMM(endTime),
          coverageRadius: radiusKm,
        },
      });
      router.push("/provider-onboarding/documents");
    } catch (e) {
      console.error("[Availability] submitOnboardingStep failed:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ProgressBar currentStep={3} totalSteps={TOTAL_STEPS} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t("providerOnboarding.availability.title")}</Text>
        <Text style={styles.subtitle}>{t("providerOnboarding.availability.subtitle")}</Text>

        <View style={styles.daysContainer}>
          {DAYS.map((day, index) => {
            const isActive = activeDays.includes(index);
            return (
              <TouchableOpacity key={day} style={[styles.dayButton, isActive && styles.dayButtonActive]} onPress={() => toggleDay(index)} activeOpacity={0.7} accessibilityState={{ selected: isActive }} accessibilityLabel={`${day}, ${isActive ? t("providerOnboarding.availability.daySelected") : t("providerOnboarding.availability.dayNotSelected")}`}>
                {isActive && <Ionicons name="checkmark-circle" size={14} color="#A78BFA" style={styles.dayCheck} />}
                <Text style={[styles.dayText, isActive && styles.dayTextActive]}>{day}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.scheduleCard} collapsable={false}>
          <Text style={styles.cardLabel}>{t("providerOnboarding.availability.schedule")}</Text>
          <View style={styles.timeRowWrapper}>
            <View style={styles.timeContainer}>
              <View style={styles.timeField}>
                <Text style={styles.timeLabel}>{t("providerOnboarding.availability.from")}</Text>
                <TouchableOpacity style={styles.timeValue} onPress={() => openTimePicker("start")} activeOpacity={0.7} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel={t("providerOnboarding.availability.from")}>
                  <Text style={styles.timeText}>{startTime}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.arrowWrapper}>
                <Text style={styles.arrow}>→</Text>
              </View>
              <View style={styles.timeField}>
                <Text style={styles.timeLabel}>{t("providerOnboarding.availability.to")}</Text>
                <TouchableOpacity style={styles.timeValue} onPress={() => openTimePicker("end")} activeOpacity={0.7} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel={t("providerOnboarding.availability.to")}>
                  <Text style={styles.timeText}>{endTime}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.lunchToggleRow}>
            <Text style={styles.lunchToggleLabel}>{t("providerOnboarding.availability.lunchBreak")}</Text>
            <Switch value={hasLunchBreak} onValueChange={setHasLunchBreak} trackColor={{ false: "rgba(255, 255, 255, 0.15)", true: "rgba(139, 92, 246, 0.5)" }} thumbColor={hasLunchBreak ? "#A78BFA" : "rgba(255, 255, 255, 0.5)"} accessibilityLabel={t("providerOnboarding.availability.lunchBreak")} />
          </View>
          {hasLunchBreak && (
            <View style={styles.lunchTimeRow}>
              <View style={styles.timeField}>
                <Text style={styles.timeLabel}>{t("providerOnboarding.availability.lunchFrom")}</Text>
                <TouchableOpacity style={styles.timeValue} onPress={() => openTimePicker("lunchStart")} activeOpacity={0.7} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel={t("providerOnboarding.availability.lunchFrom")}>
                  <Text style={styles.timeText}>{lunchStart}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.arrow}>→</Text>
              <View style={styles.timeField}>
                <Text style={styles.timeLabel}>{t("providerOnboarding.availability.lunchTo")}</Text>
                <TouchableOpacity style={styles.timeValue} onPress={() => openTimePicker("lunchEnd")} activeOpacity={0.7} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel={t("providerOnboarding.availability.lunchTo")}>
                  <Text style={styles.timeText}>{lunchEnd}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {showTimePicker !== null && (
            <>
              <DateTimePicker
                value={
                  showTimePicker === "start" ? parseTimeString(startTime)
                  : showTimePicker === "end" ?
                    parseTimeString(endTime)
                  : showTimePicker === "lunchStart" ?
                    parseTimeString(lunchStart)
                  : parseTimeString(lunchEnd)
                }
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleTimeChange(showTimePicker)}
                locale={Platform.OS === "ios" ? "es-ES" : undefined}
              />
              {Platform.OS === "ios" && (
                <View style={styles.iosTimePickerActions}>
                  <TouchableOpacity style={styles.iosTimePickerButton} onPress={() => setShowTimePicker(null)} activeOpacity={0.7}>
                    <Text style={styles.iosTimePickerButtonText}>{t("common.cancel")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.iosTimePickerButton, styles.iosTimePickerButtonPrimary]} onPress={() => setShowTimePicker(null)} activeOpacity={0.7}>
                    <Text style={[styles.iosTimePickerButtonText, styles.iosTimePickerButtonTextPrimary]}>{t("common.ok")}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.coverageCard}>
          <Text style={styles.cardLabel}>{t("providerOnboarding.availability.coverage")}</Text>
          <View style={styles.coverageContent}>
            <Ionicons name="location" size={24} color="#A78BFA" />
            <Text style={styles.radiusLabel}>{t("providerOnboarding.availability.radiusLabel")}</Text>
            <View style={styles.radiusOptions}>
              {RADIUS_OPTIONS_KM.map((km) => (
                <TouchableOpacity key={km} style={[styles.radiusChip, radiusKm === km && styles.radiusChipActive]} onPress={() => setRadiusKm(km)} activeOpacity={0.7}>
                  <Text style={[styles.radiusChipText, radiusKm === km && styles.radiusChipTextActive]}>{km} km</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>{t("providerOnboarding.availability.back")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue} activeOpacity={0.8} disabled={saving}>
          <LinearGradient colors={["#6366F1", "#8B5CF6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.continueButtonGradient}>
            {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.continueButtonText}>{t("providerOnboarding.availability.continue")}</Text>}
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
    marginBottom: 20,
  },
  daysContainer: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 20,
  },
  dayButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  dayButtonActive: {
    backgroundColor: "rgba(139, 92, 246, 0.2)",
    borderColor: "#A78BFA",
  },
  dayCheck: {
    position: "absolute",
    top: 4,
    right: 4,
  },
  dayText: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.4)",
  },
  dayTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  scheduleCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.7)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  timeRowWrapper: {
    minHeight: 56,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  timeField: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
    marginBottom: 4,
  },
  timeValue: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  timeText: {
    fontSize: 14,
    color: "#FFFFFF",
  },
  arrowWrapper: {
    justifyContent: "center",
    paddingTop: 22,
  },
  arrow: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.2)",
  },
  lunchToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  lunchToggleLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  lunchTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
  },
  coverageCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    flex: 1,
    minHeight: 96,
  },
  coverageContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    borderRadius: 8,
    padding: 16,
  },
  radiusLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 4,
    marginBottom: 12,
  },
  radiusOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  radiusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  radiusChipActive: {
    backgroundColor: "rgba(139, 92, 246, 0.4)",
    borderWidth: 1,
    borderColor: "#A78BFA",
  },
  radiusChipText: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
  },
  radiusChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  iosTimePickerActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 12,
  },
  iosTimePickerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  iosTimePickerButtonPrimary: {
    backgroundColor: "rgba(139, 92, 246, 0.6)",
  },
  iosTimePickerButtonText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 14,
    fontWeight: "600",
  },
  iosTimePickerButtonTextPrimary: {
    color: "#FFFFFF",
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
