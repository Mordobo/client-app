import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColors } from "@/hooks/useThemeColors";
import { t } from "@/i18n";
import { ProviderAvatar } from "@/components/ProviderAvatar";
import {
  getJobInProgressData,
  startJob,
  updateJobTask,
  type JobInProgressData,
  type JobTask,
  type JobTaskStatus,
} from "@/services/providerDashboard";
import { fetchOrderDetail } from "@/services/orders";
import {
  addSessionNote,
  addSessionPhoto,
  getSessionNoteCount,
  getSessionPhotoCount,
} from "@/utils/jobWorkSession";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated as RNAnimated,
  AppState,
  AppStateStatus,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CARD_BG = "#1E1B2E";
const CARD_BORDER = "rgba(61, 51, 112, 0.3)";
const CARD_BORDER_LIGHT = "rgba(61, 51, 112, 0.2)";
const PURPLE_GRADIENT_START = "#6366F1";
const PURPLE_GRADIENT_END = "#8B5CF6";
const PURPLE_LIGHT = "rgba(139, 92, 246, 0.3)";
const PURPLE_BG = "rgba(139, 92, 246, 0.1)";
const PURPLE_BANNER = "rgba(139, 92, 246, 0.2)";
const PURPLE_TEXT = "#C4B5FD";
const GREEN_BUTTON = "#22C55E";
const GREEN_LIGHT = "rgba(34, 197, 94, 0.2)";

function formatElapsedTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function PulseDot({ isLight }: { isLight?: boolean }) {
  const opacity = useRef(new RNAnimated.Value(0.6)).current;
  useEffect(() => {
    const anim = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        RNAnimated.timing(opacity, { toValue: 0.5, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  return (
    <RNAnimated.View
      style={[
        styles.pulseDotBase,
        { backgroundColor: isLight ? "#7C3AED" : PURPLE_TEXT, opacity },
      ]}
    />
  );
}

export default function InProgressScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = useThemeColors();
  const isLight = colorScheme === "light";

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<JobInProgressData | null>(null);
  const [tasks, setTasks] = useState<JobTask[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [openingChat, setOpeningChat] = useState(false);
  const [sessionPhotoCount, setSessionPhotoCount] = useState(0);
  const [sessionNoteCount, setSessionNoteCount] = useState(0);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [extraChargeModalVisible, setExtraChargeModalVisible] = useState(false);
  const [extendTimeModalVisible, setExtendTimeModalVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<string | null>(null);

  const recalcElapsed = useCallback(() => {
    const start = startedAtRef.current;
    if (!start) return;
    const startMs = new Date(start).getTime();
    const now = Date.now();
    setElapsedSeconds(Math.max(0, Math.floor((now - startMs) / 1000)));
  }, []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        let result = await getJobInProgressData(id);
        if (cancelled) return;
        const needsStart =
          result.order.status !== "in_progress" && !result.order.startedAt;
        if (needsStart) {
          try {
            const startRes = await startJob(id);
            if (cancelled) return;
            result = await getJobInProgressData(id);
            if (cancelled) return;
          } catch (startErr) {
            console.error("[InProgress] Start job failed:", startErr);
            if (!cancelled) {
              Alert.alert(
                t("common.error"),
                t("providerDashboard.inProgress.errors.startJobFailed"),
              );
            }
          }
        }
        if (cancelled) return;
        setData(result);
        setTasks(result.tasks);
        if (result.order.startedAt) {
          startedAtRef.current = result.order.startedAt;
          const start = new Date(result.order.startedAt).getTime();
          const now = Date.now();
          setElapsedSeconds(Math.max(0, Math.floor((now - start) / 1000)));
        }
        setSessionPhotoCount(getSessionPhotoCount(id));
        setSessionNoteCount(getSessionNoteCount(id));
      } catch (err) {
        console.error("[InProgress] Failed to load data:", err);
        if (!cancelled) {
          Alert.alert(t("common.error"), t("providerDashboard.inProgress.errors.loadFailed"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!data?.order.startedAt) return;
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [data?.order.startedAt]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") recalcElapsed();
    });
    return () => sub.remove();
  }, [recalcElapsed]);

  const completedCount = useMemo(() => tasks.filter((t) => t.status === "completed").length, [tasks]);
  const progressPercent = useMemo(() => {
    if (tasks.length === 0) return 0;
    return Math.round((completedCount / tasks.length) * 100);
  }, [completedCount, tasks.length]);

  const estimatedMinutes = data?.order.estimatedDurationMinutes ?? 120;
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const timeProgress = useMemo(() => {
    if (estimatedMinutes <= 0) return progressPercent;
    return Math.min(100, Math.round((elapsedMinutes / estimatedMinutes) * 100));
  }, [elapsedMinutes, estimatedMinutes, progressPercent]);

  const displayProgress = Math.max(progressPercent, timeProgress);

  const handleToggleTask = useCallback(async (task: JobTask) => {
    if (!id) return;
    const nextStatus: JobTaskStatus =
      task.status === "pending" ? "in_progress" :
      task.status === "in_progress" ? "completed" :
      "completed";

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)),
    );

    try {
      await updateJobTask(id, task.id, nextStatus);
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)),
      );
    }
  }, [id]);

  const handleChat = useCallback(async () => {
    if (!data || openingChat) return;
    setOpeningChat(true);
    try {
      if (data.conversationId) {
        router.push(`/chat/${data.conversationId}`);
      } else {
        const detail = await fetchOrderDetail(data.order.id);
        if (detail.conversation_id) {
          router.push(`/chat/${detail.conversation_id}`);
        } else {
          Alert.alert(t("common.error"), t("chat.conversationNotFound"));
        }
      }
    } catch {
      Alert.alert(t("common.error"), t("chat.conversationNotFound"));
    } finally {
      setOpeningChat(false);
    }
  }, [data, openingChat, router]);

  const handleCall = useCallback(() => {
    if (!data?.client.phone) return;
    Linking.openURL(`tel:${data.client.phone}`);
  }, [data]);

  const handleMarkAsCompleted = useCallback(() => {
    if (!id) return;
    router.push({ pathname: "/(provider-tabs)/jobs/complete", params: { id } });
  }, [id, router]);

  const goBack = useCallback(() => router.back(), [router]);

  const handleTakePhoto = useCallback(async () => {
    if (!id) return;
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t("common.error"),
          t("providerDashboard.inProgress.errors.cameraPermission"),
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (result.canceled || !result.assets[0]) return;
      addSessionPhoto(id, result.assets[0].uri);
      setSessionPhotoCount((c) => c + 1);
    } catch (err) {
      console.error("[InProgress] Take photo error:", err);
      Alert.alert(t("common.error"), t("providerDashboard.inProgress.errors.photoFailed"));
    }
  }, [id]);

  const handleAddNote = useCallback(() => setNoteModalVisible(true), []);
  const handleSaveNote = useCallback(() => {
    const trimmed = noteText.trim();
    if (trimmed && id) {
      addSessionNote(id, trimmed);
      setSessionNoteCount((c) => c + 1);
      setNoteText("");
      setNoteModalVisible(false);
    } else {
      setNoteModalVisible(false);
    }
  }, [id, noteText]);

  const handleExtraCharge = useCallback(() => setExtraChargeModalVisible(true), []);
  const handleExtendTime = useCallback(() => setExtendTimeModalVisible(true), []);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={PURPLE_GRADIENT_END} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>{t("providerDashboard.inProgress.errors.loadFailed")}</Text>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.surfaceSecondary }]} onPress={goBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.icon} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom, backgroundColor: colors.background }]}>
      {/* Status Banner */}
      <View
        style={[
          styles.banner,
          { paddingTop: insets.top + 24 },
          isLight ? { backgroundColor: "rgba(139, 92, 246, 0.12)" } : null,
        ]}
      >
        <View style={styles.bannerStatusRow}>
          <PulseDot isLight={isLight} />
          <Text style={[styles.bannerStatusText, { color: isLight ? "#5B21B6" : PURPLE_TEXT }]}>
            {t("providerDashboard.inProgress.title")}
          </Text>
        </View>
        <View style={styles.bannerTimerRow}>
          <View>
            <Text style={[styles.bannerElapsedLabel, { color: colors.textSecondary }]}>
              {t("providerDashboard.inProgress.elapsedTime")}
            </Text>
            <Text style={[styles.bannerTimer, { color: colors.textPrimary }]}>{formatElapsedTime(elapsedSeconds)}</Text>
          </View>
          <View style={styles.timerCircle}>
            <Text style={styles.timerEmoji}>⏱️</Text>
          </View>
        </View>
        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
              {t("providerDashboard.inProgress.estimatedProgress")}
            </Text>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>{displayProgress}%</Text>
          </View>
          <View style={[styles.progressBarBg, { backgroundColor: isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.1)" }]}>
            <LinearGradient
              colors={[PURPLE_GRADIENT_START, PURPLE_GRADIENT_END]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBarFill, { width: `${displayProgress}%` }]}
            />
          </View>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Client Info */}
        <View style={[styles.clientCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <ProviderAvatar
            profileImage={data.client.profile_image}
            size={44}
            rounded
            style={styles.clientAvatar}
          />
          <View style={styles.clientInfo}>
            <Text style={[styles.clientName, { color: colors.textPrimary }]}>{data.client.fullName}</Text>
            <Text style={[styles.clientService, { color: colors.textSecondary }]}>{data.order.serviceName}</Text>
          </View>
          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={handleChat}
            activeOpacity={0.7}
            disabled={openingChat}
          >
            {openingChat ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.actionEmoji}>💬</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionIconBtn} onPress={handleCall} activeOpacity={0.7}>
            <Text style={styles.actionEmoji}>📞</Text>
          </TouchableOpacity>
        </View>

        {/* Task Checklist */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t("providerDashboard.inProgress.taskList")}</Text>
        <View style={styles.taskList}>
          {tasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={[
                styles.taskItem,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
                task.status === "in_progress" && styles.taskItemActive,
              ]}
              onPress={() => handleToggleTask(task)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.taskCheckCircle,
                  task.status === "completed" && styles.taskCheckCompleted,
                  task.status === "in_progress" && styles.taskCheckInProgress,
                ]}
              >
                {task.status === "completed" && (
                  <Text style={styles.taskCheckmark}>✓</Text>
                )}
                {task.status === "in_progress" && <View style={styles.taskPulseDot} />}
                {task.status === "pending" && <View style={styles.taskPendingDot} />}
              </View>
              <Text
                style={[
                  styles.taskText,
                  { color: colors.textSecondary },
                  task.status === "completed" && [styles.taskTextCompleted, { color: colors.textTertiary }],
                  task.status === "in_progress" && [styles.taskTextActive, { color: colors.textPrimary }],
                ]}
              >
                {task.description}
              </Text>
              {task.status === "in_progress" && (
                <View style={styles.taskBadge}>
                  <Text style={[styles.taskBadgeText, { color: isLight ? "#5B21B6" : PURPLE_TEXT }]}>
                    {t("providerDashboard.inProgress.taskInProgress")}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t("providerDashboard.inProgress.quickActions")}</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={handleTakePhoto}
            activeOpacity={0.7}
          >
            <Text style={styles.quickActionIcon}>📷</Text>
            <View style={styles.quickActionLabelWrap}>
              <Text style={[styles.quickActionLabel, { color: colors.textPrimary }]}>{t("providerDashboard.inProgress.takePhoto")}</Text>
              {sessionPhotoCount > 0 && (
                <Text style={styles.quickActionBadge}>{sessionPhotoCount}</Text>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={handleAddNote}
            activeOpacity={0.7}
          >
            <Text style={styles.quickActionIcon}>📝</Text>
            <View style={styles.quickActionLabelWrap}>
              <Text style={[styles.quickActionLabel, { color: colors.textPrimary }]}>{t("providerDashboard.inProgress.addNote")}</Text>
              {sessionNoteCount > 0 && (
                <Text style={styles.quickActionBadge}>{sessionNoteCount}</Text>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={handleExtraCharge}
            activeOpacity={0.7}
          >
            <Text style={styles.quickActionIcon}>💰</Text>
            <Text style={[styles.quickActionLabel, { color: colors.textPrimary }]}>{t("providerDashboard.inProgress.extraCharge")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={handleExtendTime}
            activeOpacity={0.7}
          >
            <Text style={styles.quickActionIcon}>⏰</Text>
            <Text style={[styles.quickActionLabel, { color: colors.textPrimary }]}>{t("providerDashboard.inProgress.extendTime")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Add Note Modal */}
      <Modal visible={noteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t("providerDashboard.inProgress.addNote")}</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  color: colors.textPrimary,
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
              placeholder={t("providerDashboard.inProgress.notePlaceholder")}
              placeholderTextColor={colors.textTertiary}
              value={noteText}
              onChangeText={setNoteText}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtnSecondary, { backgroundColor: colors.surfaceSecondary }]}
                onPress={() => { setNoteModalVisible(false); setNoteText(""); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalBtnSecondaryText, { color: colors.textSecondary }]}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnPrimary} onPress={handleSaveNote} activeOpacity={0.7}>
                <Text style={styles.modalBtnPrimaryText}>{t("common.save")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Extra Charge Modal (placeholder) */}
      <Modal visible={extraChargeModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t("providerDashboard.inProgress.extraCharge")}</Text>
            <Text style={[styles.modalPlaceholderText, { color: colors.textSecondary }]}>{t("providerDashboard.inProgress.comingSoon")}</Text>
            <TouchableOpacity style={styles.modalBtnPrimary} onPress={() => setExtraChargeModalVisible(false)} activeOpacity={0.7}>
              <Text style={styles.modalBtnPrimaryText}>{t("common.ok")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Extend Time Modal (placeholder) */}
      <Modal visible={extendTimeModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t("providerDashboard.inProgress.extendTime")}</Text>
            <Text style={[styles.modalPlaceholderText, { color: colors.textSecondary }]}>{t("providerDashboard.inProgress.comingSoon")}</Text>
            <TouchableOpacity style={styles.modalBtnPrimary} onPress={() => setExtendTimeModalVisible(false)} activeOpacity={0.7}>
              <Text style={styles.modalBtnPrimaryText}>{t("common.ok")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bottom Action */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity style={styles.completeBtn} onPress={handleMarkAsCompleted} activeOpacity={0.8}>
          <Text style={styles.completeBtnText}>✓ {t("providerDashboard.inProgress.markAsCompleted")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Banner
  banner: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: PURPLE_BANNER,
  },
  bannerStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  pulseDotBase: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: PURPLE_TEXT,
  },
  bannerStatusText: {
    fontSize: 14,
    fontWeight: "500",
    color: PURPLE_TEXT,
  },
  bannerTimerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bannerElapsedLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
  },
  bannerTimer: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  timerCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: PURPLE_LIGHT,
    borderWidth: 3,
    borderColor: "rgba(139, 92, 246, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  timerEmoji: {
    fontSize: 28,
  },
  progressSection: {
    marginTop: 12,
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: PURPLE_GRADIENT_START,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },

  // Client Card
  clientCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    marginBottom: 16,
  },
  clientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(61, 51, 112, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  clientService: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionEmoji: {
    fontSize: 16,
  },

  // Section Label
  sectionLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },

  // Task List
  taskList: {
    gap: 8,
    marginBottom: 16,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER_LIGHT,
  },
  taskItemActive: {
    backgroundColor: PURPLE_BG,
    borderColor: PURPLE_LIGHT,
  },
  taskCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  taskCheckCompleted: {
    backgroundColor: GREEN_LIGHT,
  },
  taskCheckInProgress: {
    backgroundColor: PURPLE_LIGHT,
  },
  taskCheckmark: {
    fontSize: 12,
    color: "#4ADE80",
  },
  taskPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PURPLE_TEXT,
  },
  taskPendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  taskText: {
    flex: 1,
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
  },
  taskTextCompleted: {
    color: "rgba(255,255,255,0.4)",
    textDecorationLine: "line-through",
  },
  taskTextActive: {
    color: "#FFFFFF",
  },
  taskBadge: {
    backgroundColor: "rgba(139, 92, 246, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  taskBadgeText: {
    fontSize: 10,
    fontWeight: "500",
    color: PURPLE_TEXT,
  },

  // Quick Actions
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  quickActionBtn: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER_LIGHT,
  },
  quickActionIcon: {
    fontSize: 18,
  },
  quickActionLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
  quickActionLabelWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  quickActionBadge: {
    fontSize: 11,
    fontWeight: "600",
    color: PURPLE_TEXT,
    backgroundColor: PURPLE_BG,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER_LIGHT,
    padding: 12,
    fontSize: 14,
    color: "#FFFFFF",
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  modalPlaceholderText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-end",
  },
  modalBtnSecondary: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  modalBtnSecondaryText: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255,255,255,0.8)",
  },
  modalBtnPrimary: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: PURPLE_GRADIENT_END,
  },
  modalBtnPrimaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  completeBtn: {
    backgroundColor: GREEN_BUTTON,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  completeBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
