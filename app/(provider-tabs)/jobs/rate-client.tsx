import { useThemeColors } from "@/hooks/useThemeColors";
import { t } from "@/i18n";
import { ApiError } from "@/services/auth";
import {
  rateClient,
  getJobCompletionData,
} from "@/services/providerDashboard";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CARD_BORDER_LIGHT = "rgba(61, 51, 112, 0.2)";
const PURPLE_GRADIENT_START = "#6366F1";
const PURPLE_GRADIENT_END = "#8B5CF6";
const YELLOW_STAR = "#FACC15";
const AMBER_BG = "rgba(251, 191, 36, 0.1)";
const AMBER_BORDER = "rgba(251, 191, 36, 0.2)";
const AMBER_TEXT = "#FDE68A";

const TAG_KEYS = [
  "tagPunctual",
  "tagFriendly",
  "tagCommunicative",
  "tagGoodTreatment",
  "tagCleanFacilities",
  "tagRecommendable",
] as const;

function getRatingLabel(rating: number): string {
  switch (rating) {
    case 5: return t("providerDashboard.rateClient.excellent");
    case 4: return t("providerDashboard.rateClient.veryGood");
    case 3: return t("providerDashboard.rateClient.normal");
    case 2: return t("providerDashboard.rateClient.couldImprove");
    case 1: return t("providerDashboard.rateClient.badExperience");
    default: return "";
  }
}

export default function RateClientScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const footerBottom = Math.max(insets.bottom, 12);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [clientData, setClientData] = useState<{ fullName: string; serviceName: string } | null>(null);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [privateNote, setPrivateNote] = useState("");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getJobCompletionData(id);
        if (cancelled) return;
        setClientData({
          fullName: data.client.fullName,
          serviceName: data.order.serviceName,
        });
        setOrderStatus(data.order.status ?? null);
      } catch (err) {
        console.error("[RateClient] Failed to load client data:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const canRate =
    orderStatus === "completed" || orderStatus === "pending_review";

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!id || submitting || !canRate) return;
    setSubmitting(true);
    try {
      await rateClient(id, {
        rating,
        tags: selectedTags,
        comment,
        privateNote,
      });

      queryClient.invalidateQueries({ queryKey: ["providerActiveJobs"] });
      queryClient.invalidateQueries({ queryKey: ["providerDashboardStats"] });

      router.replace("/(provider-tabs)/jobs");
      Alert.alert(t("common.success"), t("providerDashboard.rateClient.ratingSent"), [{ text: t("common.ok") }]);
    } catch (err) {
      console.error("[RateClient] Submit error:", err);
      let message = t("providerDashboard.rateClient.errors.sendFailed");
      const isAlreadyRated =
        err instanceof ApiError && err.data && typeof err.data === "object" && "code" in err.data
          ? (err.data as { code: string }).code === "already_rated"
          : false;
      if (err instanceof ApiError && err.data && typeof err.data === "object" && "code" in err.data) {
        const code = (err.data as { code: string }).code;
        if (code === "invalid_status") message = t("providerDashboard.rateClient.errors.orderNotCompleted");
        else if (code === "already_rated") message = t("providerDashboard.rateClient.errors.alreadyRated");
      }
      if (isAlreadyRated) {
        router.replace("/(provider-tabs)/jobs");
        Alert.alert(t("common.success"), message, [{ text: t("common.ok") }]);
      } else {
        Alert.alert(t("common.error"), message);
      }
    } finally {
      setSubmitting(false);
    }
  }, [id, submitting, canRate, rating, selectedTags, comment, privateNote, queryClient, router]);

  const handleSkip = useCallback(() => {
    router.replace("/(provider-tabs)/jobs");
  }, [router]);

  const goBack = useCallback(() => router.back(), [router]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t("providerDashboard.rateClient.title")}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Client Avatar & Info */}
        <View style={styles.clientSection}>
          <View style={[styles.clientAvatarLarge, { backgroundColor: colors.card }]}>
            <Ionicons name="person" size={40} color={colors.textSecondary} />
          </View>
          <Text style={[styles.clientNameLarge, { color: colors.textPrimary }]}>{clientData?.fullName ?? "—"}</Text>
          <Text style={[styles.clientServiceLabel, { color: colors.textTertiary }]}>{clientData?.serviceName ?? ""}</Text>
        </View>

        {/* Star Rating */}
        <Text style={styles.ratingQuestion}>{t("providerDashboard.rateClient.howWasExperience")}</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
              <Text style={[styles.starIcon, star <= rating ? styles.starActive : styles.starInactive]}>
                ⭐
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.ratingLabel}>{getRatingLabel(rating)}</Text>

        {/* Quick Tags */}
        <Text style={styles.sectionLabel}>{t("providerDashboard.rateClient.quickTags")}</Text>
        <View style={styles.tagsWrap}>
          {TAG_KEYS.map((tagKey) => {
            const label = t(`providerDashboard.rateClient.${tagKey}`);
            const selected = selectedTags.includes(tagKey);
            return (
              <TouchableOpacity
                key={tagKey}
                style={[styles.tagChip, { backgroundColor: selected ? colors.primary : colors.background }, selected && styles.tagChipSelected]}
                onPress={() => toggleTag(tagKey)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tagText, { color: selected ? colors.textOnDark : colors.textTertiary }, selected && styles.tagTextSelected]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Comment */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{t("providerDashboard.rateClient.comment")}</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary }]}
          placeholder={t("providerDashboard.rateClient.commentPlaceholder")}
          placeholderTextColor={colors.textTertiary}
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* Private Note */}
        <View style={styles.privateNoteCard}>
          <View style={styles.privateNoteHeader}>
            <Text style={styles.lockEmoji}>🔒</Text>
            <Text style={styles.privateNoteTitle}>{t("providerDashboard.rateClient.privateNote")}</Text>
          </View>
          <TextInput
            style={styles.privateNoteInput}
            placeholder={t("providerDashboard.rateClient.privateNotePlaceholder")}
            placeholderTextColor="rgba(251, 191, 36, 0.4)"
            value={privateNote}
            onChangeText={setPrivateNote}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={[styles.footer, { paddingBottom: footerBottom }]}>
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary }, (submitting || !canRate) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.8}
          disabled={submitting || !canRate}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>{t("providerDashboard.rateClient.sendRating")}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipBtnText}>{t("providerDashboard.rateClient.skip")}</Text>
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
    paddingBottom: 20,
  },

  // Client Section
  clientSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  clientAvatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(61, 51, 112, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  clientNameLarge: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  clientServiceLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
  },

  // Stars
  ratingQuestion: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
  },
  starIcon: {
    fontSize: 30,
  },
  starActive: {
    opacity: 1,
  },
  starInactive: {
    opacity: 0.2,
  },
  ratingLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    marginBottom: 24,
  },

  // Section Label
  sectionLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },

  // Tags
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  tagChipSelected: {
    backgroundColor: PURPLE_GRADIENT_START,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.5)",
  },
  tagTextSelected: {
    color: "#FFFFFF",
  },

  // Text Area
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    marginBottom: 16,
  },

  // Private Note
  privateNoteCard: {
    backgroundColor: AMBER_BG,
    borderWidth: 1,
    borderColor: AMBER_BORDER,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  privateNoteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  lockEmoji: {
    fontSize: 18,
  },
  privateNoteTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: AMBER_TEXT,
  },
  privateNoteInput: {
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 8,
    padding: 12,
    color: AMBER_TEXT,
    fontSize: 14,
    minHeight: 60,
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
  },
  submitBtn: {
    backgroundColor: PURPLE_GRADIENT_START,
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
  skipBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255,255,255,0.4)",
  },
});
