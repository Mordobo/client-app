import { t } from "@/i18n";
import { ApiError } from "@/services/auth";
import {
  completeJob,
  getJobCompletionData,
  type JobCompletionData,
  type JobCompletionLineItem,
} from "@/services/providerDashboard";
import { clearSession, getSessionOrderId } from "@/utils/jobWorkSession";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as FileSystem from "expo-file-system/legacy";
import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SCREEN_BG = "#12121A";
const CARD_BG = "#1E1B2E";
const CARD_BORDER = "rgba(61, 51, 112, 0.3)";
const GREEN = "#22C55E";
const PURPLE_START = "#6366F1";
const PURPLE_END = "#8B5CF6";
const YELLOW_TEXT = "#FACC15";
const YELLOW_BG = "rgba(234, 179, 8, 0.15)";
const GREEN_TEXT = "#4ADE80";
const GREEN_BADGE_BG = "rgba(34, 197, 94, 0.15)";
const SUCCESS_BG = "rgba(34, 197, 94, 0.1)";
const SUCCESS_BORDER = "rgba(34, 197, 94, 0.3)";

function formatCurrency(value: number): string {
  const str = value % 1 === 0 ? String(value) : value.toFixed(2);
  return "$" + str.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return t("providerDashboard.completeJob.durationMinutes", { minutes: String(minutes) });
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return t("providerDashboard.completeJob.durationHours", {
    hours: String(hours),
    minutes: String(mins),
  });
}

async function uriToBase64(uri: string): Promise<string> {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        resolve(dataUrl.split(",")[1] || dataUrl);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  return FileSystem.readAsStringAsync(uri, {
    encoding: "base64",
  } as { encoding: "base64" });
}

export default function CompleteJobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<JobCompletionData | null>(null);
  const [workSummary, setWorkSummary] = useState("");
  const [photos, setPhotos] = useState<{ uri: string; base64?: string }[]>([]);

  const sessionMergedRef = useRef(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await getJobCompletionData(id);
        if (cancelled) return;
        setData(result);
        if (result.order.workSummary) {
          setWorkSummary(result.order.workSummary);
        }
      } catch (err) {
        console.error("[CompleteJob] Failed to load data:", err);
        if (!cancelled) {
          Alert.alert(t("common.error"), t("providerDashboard.completeJob.errors.loadFailed"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!id || !data || sessionMergedRef.current) return;
    const { photos: sessionPhotos, notes: sessionNotes } = getSessionOrderId(id);
    sessionMergedRef.current = true;
    if (sessionNotes.length) {
      const noteBlock = sessionNotes.join("\n\n");
      setWorkSummary((prev) => (prev ? `${noteBlock}\n\n${prev}` : noteBlock));
    }
    if (sessionPhotos.length === 0) return;
    let cancelled = false;
    (async () => {
      const withBase64: { uri: string; base64?: string }[] = [];
      for (const uri of sessionPhotos) {
        if (cancelled) return;
        try {
          const base64 = await uriToBase64(uri);
          if (cancelled) return;
          withBase64.push({ uri, base64 });
        } catch {
          withBase64.push({ uri });
        }
      }
      if (!cancelled) setPhotos((prev) => [...withBase64, ...prev].slice(0, 10));
    })();
    return () => { cancelled = true; };
  }, [id, data]);

  const durationLabel = useMemo(() => {
    if (!data) return "";
    return formatDuration(data.durationMinutes);
  }, [data]);

  const subtotal = useMemo(() => {
    if (!data) return 0;
    return data.lineItems.reduce((sum, item) => sum + item.amount, 0);
  }, [data]);

  const pickPhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("common.error"), "Permission to access photos is required.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 10 - photos.length,
      });
      if (result.canceled || !result.assets.length) return;

      const newPhotos: { uri: string; base64?: string }[] = [];
      for (const asset of result.assets) {
        try {
          const manipulated = await ImageManipulator.manipulateAsync(
            asset.uri,
            [{ resize: { width: 1200 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
          );
          const base64 = await uriToBase64(manipulated.uri);
          newPhotos.push({ uri: manipulated.uri, base64 });
        } catch {
          newPhotos.push({ uri: asset.uri });
        }
      }
      setPhotos((prev) => [...prev, ...newPhotos].slice(0, 10));
    } catch (err) {
      console.error("[CompleteJob] Photo pick error:", err);
    }
  }, [photos.length]);

  const takePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("common.error"), "Permission to access camera is required.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });
      if (result.canceled || !result.assets.length) return;

      const asset = result.assets[0];
      try {
        const manipulated = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1200 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
        );
        const base64 = await uriToBase64(manipulated.uri);
        setPhotos((prev) => [...prev, { uri: manipulated.uri, base64 }].slice(0, 10));
      } catch {
        setPhotos((prev) => [...prev, { uri: asset.uri }].slice(0, 10));
      }
    } catch (err) {
      console.error("[CompleteJob] Camera error:", err);
    }
  }, []);

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handlePhotoAction = useCallback(() => {
    Alert.alert(
      t("providerDashboard.completeJob.addPhoto"),
      "",
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: "Camera", onPress: takePhoto },
        { text: "Gallery", onPress: pickPhoto },
      ],
    );
  }, [takePhoto, pickPhoto]);

  const handleSubmit = useCallback(async () => {
    if (!id || submitting) return;
    setSubmitting(true);
    try {
      const base64Photos = photos
        .map((p) => p.base64)
        .filter((b): b is string => !!b);

      await completeJob(id, {
        work_summary: workSummary,
        work_photos: base64Photos,
      });

      clearSession(id);
      queryClient.invalidateQueries({ queryKey: ["providerActiveJobs"] });
      queryClient.invalidateQueries({ queryKey: ["providerDashboardStats"] });

      Alert.alert(
        t("common.success"),
        t("providerDashboard.completeJob.pendingReviewSuccess"),
        [{ text: t("common.ok"), onPress: () => router.replace({ pathname: "/(provider-tabs)/jobs/invoice", params: { id } }) }],
      );
    } catch (err) {
      const apiData = err instanceof ApiError ? err.data : undefined;
      const code = apiData && typeof apiData === "object" && "code" in apiData ? (apiData as { code: string }).code : undefined;
      if (code === "invalid_status") {
        queryClient.invalidateQueries({ queryKey: ["providerActiveJobs"] });
        queryClient.invalidateQueries({ queryKey: ["providerDashboardStats"] });
        router.push({ pathname: "/(provider-tabs)/jobs/invoice", params: { id } });
        return;
      }
      console.error("[CompleteJob] Submit error:", err);
      Alert.alert(t("common.error"), t("providerDashboard.completeJob.errors.completeFailed"));
    } finally {
      setSubmitting(false);
    }
  }, [id, submitting, photos, workSummary, queryClient, router]);

  const goBack = useCallback(() => router.back(), [router]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={PURPLE_END} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>{t("providerDashboard.completeJob.errors.loadFailed")}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>
    );
  }

  if (data.order.status === "completed") {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("providerDashboard.completeJob.title")}</Text>
        </View>
        <View style={[styles.centered, styles.flexGrow]}>
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={48} color={GREEN} style={styles.successIcon} />
            <Text style={styles.successTitle}>{t("providerDashboard.completeJob.alreadyCompleted")}</Text>
          </View>
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={() => router.push({ pathname: "/(provider-tabs)/jobs/invoice", params: { id: id! } })}
            activeOpacity={0.8}
          >
            <Text style={styles.submitBtnText}>{t("providerDashboard.completeJob.viewInvoice")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (data.order.status === "pending_review") {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("providerDashboard.completeJob.title")}</Text>
        </View>
        <View style={[styles.centered, styles.flexGrow]}>
          <View style={styles.successCard}>
            <Ionicons name="time" size={48} color={PURPLE_END} style={styles.successIcon} />
            <Text style={styles.successTitle}>{t("providerDashboard.completeJob.waitingForClientReview")}</Text>
            <Text style={styles.successSubtitle}>{t("providerDashboard.completeJob.waitingForClientReviewDesc")}</Text>
          </View>
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={() => router.push({ pathname: "/(provider-tabs)/jobs/invoice", params: { id: id! } })}
            activeOpacity={0.8}
          >
            <Text style={styles.submitBtnText}>{t("providerDashboard.completeJob.viewInvoice")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("providerDashboard.completeJob.title")}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Success Card */}
        <View style={styles.successCard}>
          <Ionicons name="checkmark-circle" size={48} color={GREEN} style={styles.successIcon} />
          <Text style={styles.successTitle}>{t("providerDashboard.completeJob.jobCompleted")}</Text>
          <Text style={styles.successDuration}>
            {t("providerDashboard.completeJob.totalDuration", { duration: durationLabel })}
          </Text>
        </View>

        {/* Work Photos Section */}
        <Text style={styles.sectionLabel}>
          {t("providerDashboard.completeJob.workPhotos")}
        </Text>
        <View style={styles.photosGrid}>
          {photos.map((photo, idx) => (
            <View key={`photo-${idx}`} style={styles.photoWrapper}>
              <Image source={{ uri: photo.uri }} style={styles.photoImage} contentFit="cover" />
              <TouchableOpacity
                style={styles.photoDeleteBtn}
                onPress={() => removePhoto(idx)}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={22} color="#FF4444" />
              </TouchableOpacity>
            </View>
          ))}
          {photos.length === 0 && (
            <>
              <TouchableOpacity style={styles.photoPlaceholder} onPress={handlePhotoAction} activeOpacity={0.7}>
                <Ionicons name="camera" size={28} color="rgba(139, 92, 246, 0.5)" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoPlaceholder} onPress={handlePhotoAction} activeOpacity={0.7}>
                <Ionicons name="camera" size={28} color="rgba(139, 92, 246, 0.5)" />
              </TouchableOpacity>
            </>
          )}
          {photos.length < 10 && (
            <TouchableOpacity style={styles.addPhotoBtn} onPress={handlePhotoAction} activeOpacity={0.7}>
              <Ionicons name="add" size={28} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
          )}
        </View>

        {/* Work Summary */}
        <Text style={styles.sectionLabel}>
          {t("providerDashboard.completeJob.workSummary")}
        </Text>
        <TextInput
          style={styles.textArea}
          placeholder={t("providerDashboard.completeJob.workSummaryPlaceholder")}
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={workSummary}
          onChangeText={setWorkSummary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Final Breakdown */}
        <Text style={styles.sectionLabel}>
          {t("providerDashboard.completeJob.finalBreakdown")}
        </Text>
        <BreakdownCard
          lineItems={data.lineItems}
          subtotal={subtotal}
          total={data.total}
          discount={data.total < subtotal ? { amount: subtotal - data.total } : undefined}
        />
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.8}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>
              {t("providerDashboard.completeJob.generateInvoice")}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cashBtn} activeOpacity={0.7}>
          <Text style={styles.cashBtnText}>
            {t("providerDashboard.completeJob.requestCashPayment")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface BreakdownCardProps {
  lineItems: JobCompletionLineItem[];
  subtotal: number;
  total: number;
  discount?: { amount: number };
}

const BreakdownCard = React.memo(function BreakdownCard({
  lineItems,
  subtotal,
  total,
  discount,
}: BreakdownCardProps) {
  return (
    <View style={styles.breakdownCard}>
      <View style={styles.breakdownItems}>
        {lineItems.map((item, idx) => (
          <View key={`item-${idx}`} style={styles.breakdownRow}>
            <View style={styles.breakdownLabelRow}>
              <Text style={styles.breakdownItemName}>{item.description}</Text>
              {item.isExtra && (
                <View style={styles.extraBadge}>
                  <Text style={styles.extraBadgeText}>
                    {t("providerDashboard.completeJob.extra")}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.breakdownItemPrice}>{formatCurrency(item.amount)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.breakdownDivider} />

      <View style={styles.breakdownRow}>
        <Text style={styles.breakdownSubLabel}>
          {t("providerDashboard.completeJob.subtotal")}
        </Text>
        <Text style={styles.breakdownSubValue}>{formatCurrency(subtotal)}</Text>
      </View>

      {discount && discount.amount > 0 && (
        <View style={styles.breakdownRow}>
          <View style={styles.breakdownLabelRow}>
            <Text style={styles.breakdownSubLabel}>
              {t("providerDashboard.completeJob.discount")}
            </Text>
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>
                -{Math.round((discount.amount / subtotal) * 100)}%
              </Text>
            </View>
          </View>
          <Text style={styles.discountAmount}>-{formatCurrency(discount.amount)}</Text>
        </View>
      )}

      <View style={styles.totalDivider} />

      <View style={styles.breakdownRow}>
        <Text style={styles.totalLabel}>
          {t("providerDashboard.completeJob.total")}
        </Text>
        <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  flexGrow: {
    flex: 1,
  },
  errorText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },

  // Success card
  successCard: {
    backgroundColor: SUCCESS_BG,
    borderWidth: 1,
    borderColor: SUCCESS_BORDER,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  successIcon: {
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  successSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 16,
  },
  successDuration: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },

  // Photos grid
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  photoWrapper: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  photoImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  photoDeleteBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 11,
  },
  photoPlaceholder: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoBtn: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.1)",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },

  // Text area
  textArea: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: "rgba(61, 51, 112, 0.2)",
    borderRadius: 12,
    padding: 12,
    color: "#FFFFFF",
    fontSize: 14,
    minHeight: 90,
    marginBottom: 20,
  },

  // Breakdown card
  breakdownCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  breakdownItems: {
    gap: 8,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  breakdownLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  breakdownItemName: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
  breakdownItemPrice: {
    fontSize: 14,
    color: "#FFFFFF",
  },
  extraBadge: {
    backgroundColor: YELLOW_BG,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  extraBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: YELLOW_TEXT,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginVertical: 12,
  },
  breakdownSubLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
  },
  breakdownSubValue: {
    fontSize: 14,
    color: "#FFFFFF",
  },
  discountBadge: {
    backgroundColor: GREEN_BADGE_BG,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: GREEN_TEXT,
  },
  discountAmount: {
    fontSize: 14,
    color: GREEN_TEXT,
  },
  totalDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  totalValue: {
    fontSize: 24,
    fontWeight: "700",
    color: GREEN,
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
  },
  submitBtn: {
    backgroundColor: PURPLE_START,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  cashBtn: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cashBtnText: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255,255,255,0.6)",
  },
});
