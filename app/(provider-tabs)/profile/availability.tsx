import { Toast } from "@/components/Toast";
import { t } from "@/i18n";
import {
    getProviderScheduleConfig,
    putProviderScheduleConfig,
    type BlockedDateItem,
    type WeeklyScheduleConfig,
} from "@/services/providerDashboard";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const isWeb = Platform.OS === "web";

const BACKGROUND = "#12121A";
const CARD_BG = "#1E1B2E";
const CARD_BORDER = "rgba(61, 51, 112, 0.3)";
const PURPLE_GRADIENT = ["#6366F1", "#8B5CF6"] as const;

const DAY_KEYS = ["dayMon", "dayTue", "dayWed", "dayThu", "dayFri", "daySat", "daySun"] as const;

function parseHHMM(hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

function formatToHHMM(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatToDisplay(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const isPM = h >= 12;
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${isPM ? "PM" : "AM"}`;
}

function roundTo15(date: Date): Date {
  const m = date.getMinutes();
  const r = Math.round(m / 15) * 15;
  const d = new Date(date);
  d.setMinutes(r === 60 ? 0 : r);
  if (r === 60) d.setHours(date.getHours() + 1);
  return d;
}

function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function ProviderAvailabilityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{ message: string } | null>(null);
  const [timePicker, setTimePicker] = useState<{
    dayIndex: number;
    slotIndex: number;
    field: "start" | "end";
  } | null>(null);
  const [blockedDateModal, setBlockedDateModal] = useState(false);
  const [blockedStart, setBlockedStart] = useState(new Date());
  const [blockedEnd, setBlockedEnd] = useState(new Date());
  const [blockedLabel, setBlockedLabel] = useState("");
  const [blockedDatePickerField, setBlockedDatePickerField] = useState<"start" | "end" | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["providerScheduleConfig"],
    queryFn: getProviderScheduleConfig,
    staleTime: 60_000,
  });

  const [scheduleConfig, setScheduleConfig] = useState<WeeklyScheduleConfig>({});
  const [bufferMinutes, setBufferMinutes] = useState(0);
  const [maxJobsPerDay, setMaxJobsPerDay] = useState(10);
  const [blockedDates, setBlockedDates] = useState<BlockedDateItem[]>([]);
  const [coverageRadiusKm, setCoverageRadiusKm] = useState(15);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (!data) return;
    setScheduleConfig(data.scheduleConfig ?? {});
    setBufferMinutes(data.bufferMinutes ?? 0);
    setMaxJobsPerDay(data.maxJobsPerDay ?? 10);
    setBlockedDates(data.blockedDates ?? []);
    setCoverageRadiusKm(data.coverageRadiusKm ?? 15);
  }, [data]);

  const activeDays = useMemo(() => {
    const days: number[] = [];
    for (let d = 0; d <= 6; d++) {
      const slots = scheduleConfig[String(d)];
      if (slots && slots.length > 0) days.push(d);
    }
    return days;
  }, [scheduleConfig]);

  const toggleDay = useCallback(
    (dayIndex: number) => {
      setScheduleConfig((prev) => {
        const next = { ...prev };
        const key = String(dayIndex);
        const slots = next[key];
        if (slots && slots.length > 0) {
          next[key] = [];
        } else {
          next[key] = [{ start: "08:00", end: "18:00" }];
        }
        return next;
      });
    },
    [],
  );

  const setSlotTime = useCallback(
    (dayIndex: number, slotIndex: number, field: "start" | "end", value: string) => {
      setScheduleConfig((prev) => {
        const key = String(dayIndex);
        const slots = [...(prev[key] ?? [{ start: "08:00", end: "18:00" }])];
        if (!slots[slotIndex]) slots[slotIndex] = { start: "08:00", end: "18:00" };
        slots[slotIndex] = { ...slots[slotIndex], [field]: value };
        return { ...prev, [key]: slots };
      });
    },
    [],
  );

  const addTimeSlot = useCallback((dayIndex: number) => {
    setScheduleConfig((prev) => {
      const key = String(dayIndex);
      const slots = [...(prev[key] ?? [])];
      slots.push({ start: "14:00", end: "18:00" });
      return { ...prev, [key]: slots };
    });
  }, []);

  const removeTimeSlot = useCallback((dayIndex: number, slotIndex: number) => {
    setScheduleConfig((prev) => {
      const key = String(dayIndex);
      const slots = (prev[key] ?? []).filter((_, i) => i !== slotIndex);
      return { ...prev, [key]: slots };
    });
  }, []);

  const addBlockedDate = useCallback(() => {
    const startStr = blockedStart.toISOString().slice(0, 10);
    const endStr = blockedEnd.toISOString().slice(0, 10);
    if (startStr > endStr) {
      setToast({ message: t("providerDashboard.availabilityConfig.errors.saveFailed") });
      return;
    }
    setBlockedDates((prev) => [...prev, { startDate: startStr, endDate: endStr, label: blockedLabel.trim() || undefined }]);
    setBlockedDateModal(false);
    setBlockedLabel("");
    setBlockedDatePickerField(null);
  }, [blockedStart, blockedEnd, blockedLabel]);

  const removeBlockedDate = useCallback((index: number) => {
    setBlockedDates((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await putProviderScheduleConfig({
        scheduleConfig,
        bufferMinutes,
        maxJobsPerDay,
        coverageRadiusKm,
        blockedDates,
      });
      queryClient.invalidateQueries({ queryKey: ["providerScheduleConfig"] });
      setToast({ message: t("providerDashboard.availabilityConfig.saveSuccess") });
    } catch (e) {
      setToast({ message: t("providerDashboard.availabilityConfig.errors.saveFailed") });
    } finally {
      setSaving(false);
    }
  }, [scheduleConfig, bufferMinutes, maxJobsPerDay, coverageRadiusKm, blockedDates, queryClient]);

  const handleBack = useCallback(() => router.back(), [router]);

  if (isLoading || !data) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("providerDashboard.availabilityConfig.title")}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Back header with Save */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} accessibilityLabel={t("common.back")}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("providerDashboard.availabilityConfig.title")}</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
          accessibilityLabel={t("providerDashboard.availabilityConfig.save")}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#22C55E" />
          ) : (
            <Text style={styles.saveButtonText}>{t("providerDashboard.availabilityConfig.save")}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Work days */}
        <Text style={styles.sectionLabel}>{t("providerDashboard.availabilityConfig.workDays")}</Text>
        <View style={styles.daysRow}>
          {DAY_KEYS.map((key, idx) => {
            const isActive = activeDays.includes(idx);
            return (
              <TouchableOpacity
                key={key}
                onPress={() => toggleDay(idx)}
                activeOpacity={0.7}
                style={[styles.dayButtonWrap, !isActive && styles.dayButton]}
              >
                {isActive ? (
                  <LinearGradient
                    colors={PURPLE_GRADIENT}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.dayButton, styles.dayButtonActive]}
                  >
                    <Text style={[styles.dayButtonText, styles.dayButtonTextActive]}>
                      {t(`providerDashboard.availabilityConfig.${key}`)}
                    </Text>
                  </LinearGradient>
                ) : (
                  <Text style={styles.dayButtonText}>
                    {t(`providerDashboard.availabilityConfig.${key}`)}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Schedule per day (first active day as template for simplicity; full UI would expand per day) */}
        <Text style={styles.sectionLabel}>{t("providerDashboard.availabilityConfig.schedule")}</Text>
        <View style={styles.card}>
          {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
            const slots = scheduleConfig[String(dayIndex)] ?? [];
            if (slots.length === 0) return null;
            return (
              <View key={dayIndex} style={styles.dayScheduleBlock}>
                <Text style={styles.dayScheduleLabel}>
                  {t(`providerDashboard.availabilityConfig.${DAY_KEYS[dayIndex]}`)}
                </Text>
                {slots.map((slot, slotIndex) => (
                  <View key={slotIndex} style={styles.timeRow}>
                    <View style={styles.timeField}>
                      <Text style={styles.timeFieldLabel}>{t("providerDashboard.availabilityConfig.start")}</Text>
                      <TouchableOpacity
                        style={styles.timeValue}
                        onPress={() => setTimePicker({ dayIndex, slotIndex, field: "start" })}
                      >
                        <Text style={styles.timeValueText}>{formatToDisplay(slot.start)}</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.timeArrow}>→</Text>
                    <View style={styles.timeField}>
                      <Text style={styles.timeFieldLabel}>{t("providerDashboard.availabilityConfig.end")}</Text>
                      <TouchableOpacity
                        style={styles.timeValue}
                        onPress={() => setTimePicker({ dayIndex, slotIndex, field: "end" })}
                      >
                        <Text style={styles.timeValueText}>{formatToDisplay(slot.end)}</Text>
                      </TouchableOpacity>
                    </View>
                    {slots.length > 1 && (
                      <TouchableOpacity
                        style={styles.removeSlotButton}
                        onPress={() => removeTimeSlot(dayIndex, slotIndex)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                <TouchableOpacity style={styles.addSlotButton} onPress={() => addTimeSlot(dayIndex)}>
                  <Ionicons name="add" size={18} color="#A78BFA" />
                  <Text style={styles.addSlotText}>{t("providerDashboard.availabilityConfig.addTimeSlot")}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Buffer & Max jobs */}
        <Text style={styles.sectionLabel}>{t("providerDashboard.availabilityConfig.bufferTime")}</Text>
        <View style={styles.card}>
          <View style={styles.bufferRow}>
            <Text style={styles.bufferLabel}>
              {t("providerDashboard.availabilityConfig.bufferMinutes", { minutes: bufferMinutes })}
            </Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => setBufferMinutes((m) => Math.max(0, m - 15))}
              >
                <Text style={styles.stepperText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{bufferMinutes}</Text>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => setBufferMinutes((m) => Math.min(480, m + 15))}
              >
                <Text style={styles.stepperText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>{t("providerDashboard.availabilityConfig.maxJobsPerDay")}</Text>
        <View style={styles.card}>
          <View style={styles.bufferRow}>
            <Text style={styles.bufferLabel}>{maxJobsPerDay}</Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => setMaxJobsPerDay((n) => Math.max(1, n - 1))}
              >
                <Text style={styles.stepperText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{maxJobsPerDay}</Text>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => setMaxJobsPerDay((n) => Math.min(50, n + 1))}
              >
                <Text style={styles.stepperText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Coverage area - design: map placeholder + −/+ buttons, radio editable */}
        <Text style={styles.sectionLabel}>{t("providerDashboard.availabilityConfig.coverage")}</Text>
        <View style={styles.card}>
          <View style={styles.coverageMapPlaceholder}>
            <View style={styles.coverageMapCircle}>
              <View style={styles.coverageMapDot} />
            </View>
            <View style={styles.coverageRadiusButtons}>
              <TouchableOpacity
                style={styles.coverageRadiusButton}
                onPress={() => setCoverageRadiusKm((km) => Math.max(5, km - 5))}
                activeOpacity={0.7}
              >
                <Text style={styles.coverageRadiusButtonText}>−</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.coverageRadiusButton}
                onPress={() => setCoverageRadiusKm((km) => Math.min(100, km + 5))}
                activeOpacity={0.7}
              >
                <Text style={styles.coverageRadiusButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.coverageRow}>
            <Text style={styles.coverageLabel}>
              {t("providerDashboard.availabilityConfig.coverageRadius")}
            </Text>
            <Text style={styles.coverageValue}>{coverageRadiusKm} km</Text>
          </View>
        </View>

        {/* Blocked dates */}
        <Text style={styles.sectionLabel}>{t("providerDashboard.availabilityConfig.specialDays")}</Text>
        <View style={styles.card}>
          {blockedDates.map((bd, idx) => (
            <View key={idx} style={styles.blockedRow}>
              <View style={styles.blockedInfo}>
                <Text style={styles.blockedEmoji}>🏖️</Text>
                <View>
                  <Text style={styles.blockedTitle}>
                    {bd.label || t("providerDashboard.availabilityConfig.specialDays")}
                  </Text>
                  <Text style={styles.blockedDateRangeText}>
                    {bd.startDate} – {bd.endDate}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => removeBlockedDate(idx)}>
                <Text style={styles.deleteBlocked}>{t("providerDashboard.availabilityConfig.deleteBlocked")}</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            style={styles.addBlockedButton}
            onPress={() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              const nextWeek = new Date(tomorrow);
              nextWeek.setDate(nextWeek.getDate() + 6);
              setBlockedStart(tomorrow);
              setBlockedEnd(nextWeek);
              setBlockedDateModal(true);
            }}
          >
            <Text style={styles.addBlockedText}>
              + {t("providerDashboard.availabilityConfig.addBlockedDates")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Time picker modal */}
      {timePicker && (
        <>
          <DateTimePicker
            value={roundTo15(
              timePicker.field === "start"
                ? parseHHMM((scheduleConfig[String(timePicker.dayIndex)] ?? [])[timePicker.slotIndex]?.start ?? "08:00")
                : parseHHMM((scheduleConfig[String(timePicker.dayIndex)] ?? [])[timePicker.slotIndex]?.end ?? "18:00"),
            )}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            minuteInterval={15}
            onChange={(_, date) => {
              if (Platform.OS === "android") setTimePicker(null);
              if (date) {
                const value = formatToHHMM(roundTo15(date));
                setSlotTime(timePicker.dayIndex, timePicker.slotIndex, timePicker.field, value);
              }
            }}
          />
          {Platform.OS === "ios" && (
            <View style={styles.iosTimeActions}>
              <TouchableOpacity style={styles.iosTimeButton} onPress={() => setTimePicker(null)}>
                <Text style={styles.iosTimeButtonText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iosTimeButton, styles.iosTimeButtonPrimary]} onPress={() => setTimePicker(null)}>
                <Text style={[styles.iosTimeButtonText, styles.iosTimeButtonTextPrimary]}>{t("common.ok")}</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Blocked date modal - Start date & End date */}
      <Modal visible={blockedDateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("providerDashboard.availabilityConfig.addBlockedDates")}</Text>

            <Text style={styles.modalLabel}>{t("providerDashboard.availabilityConfig.startDateLabel")}</Text>
            {isWeb ? (
              <View style={styles.modalDateField}>
                {React.createElement("input", {
                  type: "date",
                  value: blockedStart.toISOString().slice(0, 10),
                  min: new Date().toISOString().slice(0, 10),
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                    const val = e.target.value;
                    const d = val ? new Date(val) : blockedStart;
                    setBlockedStart(d);
                    if (blockedEnd < d) setBlockedEnd(new Date(d));
                  },
                  style: styles.webDateInput as React.CSSProperties,
                })}
              </View>
            ) : (
              <TouchableOpacity
                style={styles.modalDateField}
                onPress={() => setBlockedDatePickerField("start")}
                activeOpacity={0.7}
              >
                <Text style={styles.modalDateFieldText}>{formatDateForDisplay(blockedStart)}</Text>
                <Ionicons name="calendar-outline" size={20} color="#A78BFA" />
              </TouchableOpacity>
            )}
            {!isWeb && Platform.OS === "ios" && blockedDatePickerField === "start" && (
              <>
                <DateTimePicker
                  value={blockedStart}
                  mode="date"
                  display="spinner"
                  minimumDate={new Date()}
                  onChange={(_, d) => {
                    if (d) {
                      setBlockedStart(d);
                      if (blockedEnd < d) setBlockedEnd(new Date(d));
                    }
                  }}
                />
                <TouchableOpacity style={styles.modalPickerDone} onPress={() => setBlockedDatePickerField(null)}>
                  <Text style={styles.modalPickerDoneText}>{t("common.ok")}</Text>
                </TouchableOpacity>
              </>
            )}

            <Text style={[styles.modalLabel, styles.modalLabelSpaced]}>{t("providerDashboard.availabilityConfig.endDateLabel")}</Text>
            {isWeb ? (
              <View style={styles.modalDateField}>
                {React.createElement("input", {
                  type: "date",
                  value: blockedEnd.toISOString().slice(0, 10),
                  min: blockedStart.toISOString().slice(0, 10),
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                    const val = e.target.value;
                    if (val) setBlockedEnd(new Date(val));
                  },
                  style: styles.webDateInput as React.CSSProperties,
                })}
              </View>
            ) : (
              <TouchableOpacity
                style={styles.modalDateField}
                onPress={() => setBlockedDatePickerField("end")}
                activeOpacity={0.7}
              >
                <Text style={styles.modalDateFieldText}>{formatDateForDisplay(blockedEnd)}</Text>
                <Ionicons name="calendar-outline" size={20} color="#A78BFA" />
              </TouchableOpacity>
            )}
            {!isWeb && Platform.OS === "ios" && blockedDatePickerField === "end" && (
              <>
                <DateTimePicker
                  value={blockedEnd}
                  mode="date"
                  display="spinner"
                  minimumDate={blockedStart}
                  onChange={(_, d) => {
                    if (d) setBlockedEnd(d);
                  }}
                />
                <TouchableOpacity style={styles.modalPickerDone} onPress={() => setBlockedDatePickerField(null)}>
                  <Text style={styles.modalPickerDoneText}>{t("common.ok")}</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setBlockedDateModal(false);
                  setBlockedDatePickerField(null);
                }}
              >
                <Text style={styles.modalButtonText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary]} onPress={addBlockedDate}>
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>{t("common.ok")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Android: date picker outside Modal so native dialog appears on top */}
      {!isWeb && Platform.OS === "android" && blockedDateModal && blockedDatePickerField === "start" && (
        <DateTimePicker
          value={blockedStart}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(_, d) => {
            if (d) {
              setBlockedStart(d);
              if (blockedEnd < d) setBlockedEnd(new Date(d));
            }
            setBlockedDatePickerField(null);
          }}
        />
      )}
      {!isWeb && Platform.OS === "android" && blockedDateModal && blockedDatePickerField === "end" && (
        <DateTimePicker
          value={blockedEnd}
          mode="date"
          display="default"
          minimumDate={blockedStart}
          onChange={(_, d) => {
            if (d) setBlockedEnd(d);
            setBlockedDatePickerField(null);
          }}
        />
      )}

      {toast && (
        <Toast message={toast.message} onHide={() => setToast(null)} />
      )}
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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(61, 51, 112, 0.2)",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  saveButton: {
    minWidth: 72,
    alignItems: "flex-end",
  },
  saveButtonText: {
    color: "#22C55E",
    fontSize: 14,
    fontWeight: "600",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 20,
  },
  daysRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  dayButtonWrap: {
    flex: 1,
  },
  dayButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  dayButtonActive: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.4)",
  },
  dayButtonTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  dayScheduleBlock: {
    marginBottom: 16,
  },
  dayScheduleLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    marginBottom: 12,
  },
  timeField: {
    flex: 1,
  },
  timeFieldLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    marginBottom: 4,
  },
  timeValue: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  timeValueText: {
    fontSize: 14,
    color: "#fff",
  },
  timeArrow: {
    fontSize: 16,
    color: "rgba(255,255,255,0.2)",
    paddingBottom: 12,
  },
  removeSlotButton: {
    padding: 8,
    justifyContent: "center",
  },
  addSlotButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  addSlotText: {
    color: "#A78BFA",
    fontSize: 14,
    fontWeight: "500",
  },
  bufferRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bufferLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperText: {
    fontSize: 18,
    color: "rgba(255,255,255,0.7)",
  },
  stepperValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    minWidth: 24,
    textAlign: "center",
  },
  coverageMapPlaceholder: {
    height: 112,
    borderRadius: 12,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  coverageMapCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "rgba(168, 85, 247, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  coverageMapDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#A78BFA",
  },
  coverageRadiusButtons: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    gap: 4,
  },
  coverageRadiusButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  coverageRadiusButtonText: {
    fontSize: 16,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "600",
  },
  coverageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  coverageLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
  },
  coverageValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#A78BFA",
  },
  blockedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  blockedInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  blockedEmoji: {
    fontSize: 20,
  },
  blockedTitle: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "500",
  },
  blockedDateRangeText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    marginTop: 2,
  },
  deleteBlocked: {
    fontSize: 12,
    color: "#EF4444",
  },
  addBlockedButton: {
    paddingVertical: 10,
    alignItems: "center",
  },
  addBlockedText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#A78BFA",
  },
  iosTimeActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: CARD_BG,
  },
  iosTimeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  iosTimeButtonPrimary: {
    backgroundColor: "rgba(139, 92, 246, 0.6)",
  },
  iosTimeButtonText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontWeight: "600",
  },
  iosTimeButtonTextPrimary: {
    color: "#fff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginTop: 12,
    marginBottom: 4,
  },
  modalLabelSpaced: {
    marginTop: 20,
  },
  modalDateField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  modalDateFieldText: {
    fontSize: 15,
    color: "#fff",
  },
  modalPickerDone: {
    alignSelf: "flex-end",
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(139, 92, 246, 0.6)",
  },
  modalPickerDoneText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  webDateInput: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: CARD_BORDER,
    color: "#fff",
    fontSize: 15,
    outlineStyle: "none",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  modalButtonPrimary: {
    backgroundColor: "rgba(139, 92, 246, 0.6)",
  },
  modalButtonText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontWeight: "600",
  },
  modalButtonTextPrimary: {
    color: "#fff",
  },
});
