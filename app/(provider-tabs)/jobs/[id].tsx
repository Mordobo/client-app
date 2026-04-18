import { useThemeColors } from "@/hooks/useThemeColors";
import { t } from "@/i18n";
import { fetchOrderDetail } from "@/services/orders";
import { getProviderActiveJobs, startJob, type ProviderActiveJobDetail } from "@/services/providerDashboard";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const GREEN_PRICE = "#22C55E";
const GREEN_BUTTON = "#22C55E";
const YELLOW_STAR = "#EAB308";

function formatCurrency(value: number): string {
  const str = value % 1 === 0 ? String(value) : value.toFixed(2);
  return "$" + str.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export default function ProviderJobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const {
    data: jobs = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["providerActiveJobs"],
    queryFn: getProviderActiveJobs,
    staleTime: 60 * 1000,
  });

  const job = useMemo((): ProviderActiveJobDetail | null => {
    if (!id) return null;
    return (jobs.find((j) => j.id === id) as ProviderActiveJobDetail | undefined) ?? null;
  }, [id, jobs]);

  const [openingChat, setOpeningChat] = useState(false);
  const [startingJob, setStartingJob] = useState(false);

  const goBack = useCallback(() => router.back(), [router]);

  const handleChat = useCallback(async () => {
    if (!job || openingChat) return;
    setOpeningChat(true);
    try {
      const detail = await fetchOrderDetail(job.orderId);
      if (detail.conversation_id) {
        router.push(`/chat/${detail.conversation_id}`);
      } else {
        Alert.alert(t("common.error"), t("chat.conversationNotFound"));
      }
    } catch (err) {
      console.error("[ProviderJobDetail] Failed to open chat:", err);
      Alert.alert(t("common.error"), t("errors.requestFailed"));
    } finally {
      setOpeningChat(false);
    }
  }, [job, openingChat, router]);

  const handleCall = useCallback(() => {
    if (!job?.clientPhone) return;
    const url = job.clientPhone.startsWith("+") ? `tel:${job.clientPhone}` : `tel:${job.clientPhone}`;
    Linking.openURL(url);
  }, [job]);

  const handleStartJob = useCallback(async () => {
    if (!job || startingJob) return;
    const orderId = job.orderId;
    if (job.status !== "in_progress") {
      setStartingJob(true);
      try {
        await startJob(orderId);
        await queryClient.invalidateQueries({ queryKey: ["providerActiveJobs"] });
        router.push({ pathname: "/(provider-tabs)/jobs/in-progress", params: { id: orderId } });
      } catch (err) {
        console.error("[ProviderJobDetail] Start job failed:", err);
        Alert.alert(t("common.error"), t("providerDashboard.inProgress.errors.startJobFailed"));
      } finally {
        setStartingJob(false);
      }
    } else {
      router.push({ pathname: "/(provider-tabs)/jobs/in-progress", params: { id: orderId } });
    }
  }, [job, startingJob, queryClient, router]);

  const handleMarkAsCompleted = useCallback(() => {
    if (!job) return;
    router.push({ pathname: "/(provider-tabs)/jobs/complete", params: { id: job.orderId } });
  }, [job, router]);

  const handleRateClient = useCallback(() => {
    if (!job) return;
    router.push({ pathname: "/(provider-tabs)/jobs/rate-client", params: { id: job.orderId } });
  }, [job, router]);

  if (isLoading && jobs.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !job) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>{t("providerDashboard.errors.activeJobsFailed")}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
          <Text style={[styles.backBtnLabel, { color: colors.textSecondary }]}>←</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ratingLabel =
    job.clientRating != null && job.reviewCount != null ?
      t("providerDashboard.clientRatingReviews", {
        rating: String(job.clientRating),
        count: job.reviewCount,
      })
    : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t("providerDashboard.jobDetailTitle")}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Client card */}
        <View style={[styles.card, styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.clientRow}>
            <View style={[styles.avatar, { backgroundColor: colors.background }]}>
              <Ionicons name="person" size={28} color={colors.textSecondary} />
            </View>
            <View style={styles.clientInfo}>
              <Text style={[styles.clientName, { color: colors.textPrimary }]}>{job.clientName}</Text>
              {ratingLabel ?
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color={YELLOW_STAR} />
                  <Text style={[styles.clientMeta, { color: colors.textTertiary }]}>{ratingLabel}</Text>
                </View>
              : <Text style={[styles.clientMeta, { color: colors.textTertiary }]}>—</Text>}
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.iconBtn} onPress={handleChat} activeOpacity={0.7} disabled={openingChat}>
                {openingChat ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="chatbubble-outline" size={22} color="#FFFFFF" />
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={handleCall} activeOpacity={0.7}>
                <Ionicons name="call-outline" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Service card */}
        <View style={[styles.card, styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{t("providerDashboard.serviceLabel")}</Text>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{job.serviceName}</Text>
          {job.serviceDescription ?
            <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>{job.serviceDescription}</Text>
          : null}
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: colors.textTertiary }]}>{t("providerDashboard.agreedPriceLabel")}</Text>
            <Text style={[styles.price, { color: GREEN_PRICE }]}>{formatCurrency(job.agreedPrice)}</Text>
          </View>
        </View>

        {/* Client notes (additional instructions from client when booking) */}
        {job.orderNotes ? (
          <View style={[styles.card, styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{t("providerDashboard.clientNotesLabel")}</Text>
            <Text style={[styles.noteText, { color: colors.textSecondary }]}>{job.orderNotes}</Text>
          </View>
        ) : null}

        {/* Quote note (from provider when creating the quote) */}
        {job.quoteNote ? (
          <View style={[styles.card, styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{t("providerDashboard.quoteNoteLabel")}</Text>
            <Text style={[styles.noteText, { color: colors.textSecondary }]}>{job.quoteNote}</Text>
          </View>
        ) : null}

        {/* Location card */}
        <View style={[styles.card, styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{t("providerDashboard.locationLabel")}</Text>
          <View style={[styles.mapPlaceholder, { backgroundColor: colors.background }]}>
            <Ionicons name="map-outline" size={48} color={colors.textTertiary} />
          </View>
          <Text style={[styles.address, { color: colors.textPrimary }]}>{job.address}</Text>
          {job.addressLine2 ?
            <Text style={[styles.addressSub, { color: colors.textTertiary }]}>{job.addressLine2}</Text>
          : null}
        </View>

        {/* Work in progress: scheduled/accepted → start API; in_progress/on_way → timer/tasks. Hidden after job is submitted for review or fully closed. */}
        {(job.status === "scheduled" || job.status === "in_progress" || job.status === "on_way" || job.status === "pending") && (
          <TouchableOpacity
            style={[styles.inProgressBtn, { backgroundColor: colors.primary }, startingJob && styles.inProgressBtnDisabled]}
            onPress={handleStartJob}
            activeOpacity={0.8}
            disabled={startingJob}
          >
            {startingJob ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="play-circle" size={20} color="#FFFFFF" />
            )}
            <Text style={styles.completeBtnText}>
              {startingJob ? t("providerDashboard.inProgress.starting") : t("providerDashboard.inProgress.title")}
            </Text>
          </TouchableOpacity>
        )}
        {/* Mark as completed: only when job is already in_progress (started) */}
        {job.status === "in_progress" && (
          <TouchableOpacity style={[styles.completeBtn, { backgroundColor: GREEN_BUTTON }]} onPress={handleMarkAsCompleted} activeOpacity={0.8}>
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.completeBtnText}>{t("providerDashboard.markAsCompleted")}</Text>
          </TouchableOpacity>
        )}
        {(job.status === "pending_review" || job.status === "awaiting_provider_rating") && (
          <TouchableOpacity style={[styles.completeBtn, { backgroundColor: colors.primary }]} onPress={handleRateClient} activeOpacity={0.8}>
            <Ionicons name="star-outline" size={20} color="#FFFFFF" />
            <Text style={styles.completeBtnText}>{t("providerDashboard.rateClient.title")}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 14,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    paddingTop: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnLabel: {
    fontSize: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
    gap: 16,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
  },
  section: {
    padding: 16,
  },
  clientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(61, 51, 112, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  clientMeta: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(61, 51, 112, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  priceLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
  },
  price: {
    fontSize: 20,
    fontWeight: "700",
    color: GREEN_PRICE,
  },
  mapPlaceholder: {
    height: 128,
    borderRadius: 8,
    backgroundColor: "rgba(61, 51, 112, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  address: {
    fontSize: 14,
    color: "#FFFFFF",
  },
  addressSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    marginTop: 2,
  },
  noteText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 20,
  },
  inProgressBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#6366F1",
    paddingVertical: 16,
    borderRadius: 12,
  },
  inProgressBtnDisabled: {
    opacity: 0.7,
  },
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: GREEN_BUTTON,
    paddingVertical: 16,
    borderRadius: 12,
  },
  completeBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
