import { StarRating } from "@/components/StarRating";
import { useThemeColors } from "@/hooks/useThemeColors";
import { t } from "@/i18n";
import { ApiError } from "@/services/auth";
import {
    getProviderReviews,
    respondToReview,
    type ProviderReview,
    type ProviderReviewsFilter,
    type ProviderReviewsSort,
} from "@/services/reviews";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const QUERY_KEY = ["providerReviews"] as const;
const COMMENT_TRUNCATE = 120;

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays === 0) return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return t("providerDashboard.timeAgoDays", { count: 1 });
    if (diffDays < 7) return t("providerDashboard.timeAgoDays", { count: diffDays });
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

function getInitials(name: string | null): string {
  if (!name || !name.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}

const FILTERS: { key: ProviderReviewsFilter; labelKey: string }[] = [
  { key: "all", labelKey: "providerDashboard.providerReviews.filterAll" },
  { key: "recent", labelKey: "providerDashboard.providerReviews.filterRecent" },
  { key: "positive", labelKey: "providerDashboard.providerReviews.filterPositive" },
  { key: "needs_response", labelKey: "providerDashboard.providerReviews.filterNeedsResponse" },
];

const SORTS: { key: ProviderReviewsSort; labelKey: string }[] = [
  { key: "recent", labelKey: "providerDashboard.providerReviews.sortRecent" },
  { key: "highest_rating", labelKey: "providerDashboard.providerReviews.sortHighest" },
  { key: "lowest_rating", labelKey: "providerDashboard.providerReviews.sortLowest" },
];

export default function ProviderReviewsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<ProviderReviewsFilter>("all");
  const [sort, setSort] = useState<ProviderReviewsSort>("recent");
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [expandedCommentId, setExpandedCommentId] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const {
    data,
    isLoading,
    isError,
    error,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: [...QUERY_KEY, filter, sort],
    queryFn: async () => {
      const res = await getProviderReviews({ filter, sort, page: 1, limit: 20 });
      return { ...res, nextPage: 2 };
    },
    staleTime: 60_000,
    retry: (failureCount, err) => {
      if (err instanceof ApiError && err.sessionExpired) return false;
      return failureCount < 2;
    },
  });

  const isSessionExpired = isError && error instanceof ApiError && error.sessionExpired;

  const allReviews = data?.reviews ?? [];
  const stats = data?.stats;
  const hasMore = data?.hasMore ?? false;

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || !data) return;
    const nextPage = (data as { nextPage?: number }).nextPage ?? 2;
    setIsLoadingMore(true);
    getProviderReviews({ filter, sort, page: nextPage, limit: 20 })
      .then((nextRes) => {
        queryClient.setQueryData([...QUERY_KEY, filter, sort], (prev: typeof data) => {
          if (!prev) return prev;
          return {
            ...prev,
            reviews: [...(prev.reviews ?? []), ...(nextRes.reviews ?? [])],
            hasMore: nextRes.hasMore,
            nextPage: nextPage + 1,
          };
        });
      })
      .finally(() => setIsLoadingMore(false));
  }, [data, filter, sort, hasMore, isLoadingMore, queryClient]);

  const respondMutation = useMutation({
    mutationFn: ({ reviewId, response }: { reviewId: string; response: string }) =>
      respondToReview(reviewId, response),
    onMutate: async ({ reviewId, response }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const prev = queryClient.getQueryData<typeof data>([...QUERY_KEY, filter, sort]);
      if (prev?.reviews) {
        queryClient.setQueryData([...QUERY_KEY, filter, sort], {
          ...prev,
          reviews: prev.reviews.map((r) =>
            r.id === reviewId
              ? { ...r, provider_response: response, response_date: new Date().toISOString() }
              : r
          ),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData([...QUERY_KEY, filter, sort], context.prev);
      }
    },
    onSettled: () => {
      setReplyingId(null);
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const onRefresh = useCallback(() => refetch(), [refetch]);
  const handleBack = useCallback(() => router.back(), [router]);

  const handleReplyPress = useCallback((review: ProviderReview) => {
    setReplyingId(review.id);
    setReplyText(review.provider_response ?? "");
  }, []);

  const handleSendReply = useCallback(() => {
    if (!replyingId || !replyText.trim()) return;
    respondMutation.mutate({ reviewId: replyingId, response: replyText.trim() });
  }, [replyingId, replyText, respondMutation]);

  const handleCancelReply = useCallback(() => {
    setReplyingId(null);
    setReplyText("");
  }, []);

  const toggleCommentExpand = useCallback((id: string) => {
    setExpandedCommentId((prev) => (prev === id ? null : id));
  }, []);

  const maxDistribution = useMemo(() => {
    if (!stats?.distribution) return 1;
    const d = stats.distribution;
    return Math.max(1, d[5], d[4], d[3], d[2], d[1]);
  }, [stats?.distribution]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t("providerDashboard.providerReviews.title")}</Text>
        </View>
      </View>

      {isSessionExpired ? (
        <View style={styles.centered}>
          <Text style={[styles.redirectingText, { color: colors.textSecondary }]}>{t("common.redirecting")}</Text>
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 12 }} />
        </View>
      ) : isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlashList
          data={allReviews}
          keyExtractor={(item) => item.id}
          estimatedItemSize={180}
          ListHeaderComponent={
            <>
              {/* Summary card */}
              {stats && (
                <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.ratingBig, { color: colors.textPrimary }]}>{stats.averageRating.toFixed(1)}</Text>
                    <View style={styles.summaryRight}>
                      <View style={styles.starsRow}>
                        <StarRating rating={Math.round(stats.averageRating)} size={18} />
                      </View>
                      <Text style={[styles.totalReviews, { color: colors.textTertiary }]}>
                        {t("providerDashboard.providerReviews.totalReviews", { count: stats.totalCount })}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.responseRateLabel, { color: colors.textTertiary }]}>
                    {t("providerDashboard.providerReviews.responseRate")}{" "}
                    <Text style={[styles.responseRateValue, { color: colors.primary }]}>
                      {t("providerDashboard.providerReviews.responseRateValue", { percent: stats.responseRate })}
                    </Text>
                  </Text>
                </View>
              )}

              {/* Distribution */}
              {stats && stats.totalCount > 0 && (
                <View style={[styles.distributionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  {([5, 4, 3, 2, 1] as const).map((star) => {
                    const count = stats.distribution[star];
                    const widthPercent = maxDistribution > 0 ? (count / maxDistribution) * 100 : 0;
                    return (
                      <View key={star} style={styles.distributionRow}>
                        <Text style={[styles.distributionLabel, { color: colors.textSecondary }]}>{star} ★</Text>
                        <View style={styles.barBg}>
                          <View style={[styles.barFill, { width: `${widthPercent}%`, backgroundColor: colors.primary }]} />
                        </View>
                        <Text style={[styles.distributionCount, { color: colors.textTertiary }]}>{count}</Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Filter tabs */}
              <View style={styles.filterRow}>
                {FILTERS.map((f) => (
                  <TouchableOpacity
                    key={f.key}
                    style={[styles.filterPill, { backgroundColor: filter === f.key ? colors.primary : colors.card }]}
                    onPress={() => setFilter(f.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.filterPillText, { color: filter === f.key ? colors.textOnDark : colors.textTertiary }]}>
                      {t(f.labelKey)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Sort */}
              <View style={styles.sortRow}>
                {SORTS.map((s) => (
                  <TouchableOpacity
                    key={s.key}
                    style={[styles.sortPill, sort === s.key && { backgroundColor: `${colors.primary}4D`, borderWidth: 1, borderColor: colors.primary }]}
                    onPress={() => setSort(s.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.sortPillText, { color: sort === s.key ? colors.primary : colors.textTertiary }]}>
                      {t(s.labelKey)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {allReviews.length === 0 && (
                <View style={styles.emptyWrap}>
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t("providerDashboard.providerReviews.emptyTitle")}</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>{t("providerDashboard.providerReviews.emptySubtitle")}</Text>
                </View>
              )}
            </>
          }
          ListHeaderComponentStyle={styles.listHeaderStyle}
          renderItem={({ item }: { item: ProviderReview }) => (
            <View style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.reviewHeader}>
                {item.client_avatar ? (
                  <Image source={{ uri: item.client_avatar }} style={styles.avatar} contentFit="cover" />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: `${colors.primary}40` }]}>
                    <Text style={[styles.avatarInitials, { color: colors.primary }]}>{getInitials(item.client_name)}</Text>
                  </View>
                )}
                <View style={styles.reviewMeta}>
                  <Text style={[styles.clientName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {item.client_name || "—"}
                  </Text>
                  <Text style={[styles.reviewDate, { color: colors.textTertiary }]}>{formatDate(item.created_at)}</Text>
                  <StarRating rating={item.rating} size={14} />
                </View>
              </View>
              {item.comment ? (
                <View style={styles.commentWrap}>
                  <Text style={[styles.commentText, { color: colors.textSecondary }]} numberOfLines={expandedCommentId === item.id ? undefined : 3}>
                    {item.comment}
                  </Text>
                  {item.comment.length > COMMENT_TRUNCATE && (
                    <TouchableOpacity onPress={() => toggleCommentExpand(item.id)} style={styles.readMoreBtn}>
                      <Text style={[styles.readMoreText, { color: colors.primary }]}>
                        {expandedCommentId === item.id
                          ? t("providerDashboard.providerReviews.readLess")
                          : t("providerDashboard.providerReviews.readMore")}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null}
              {item.provider_response ? (
                <View style={[styles.responseWrap, { borderTopColor: colors.cardBorder }]}>
                  <Text style={[styles.responseLabel, { color: colors.textTertiary }]}>{t("providerDashboard.providerReviews.reply")}:</Text>
                  <Text style={[styles.responseText, { color: colors.textSecondary }]}>{item.provider_response}</Text>
                </View>
              ) : replyingId !== item.id ? (
                <TouchableOpacity
                  style={[styles.replyBtn, { backgroundColor: `${colors.primary}26` }]}
                  onPress={() => handleReplyPress(item)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
                  <Text style={[styles.replyBtnText, { color: colors.primary }]}>{t("providerDashboard.providerReviews.reply")}</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.replyInputWrap}>
                  <TextInput
                    style={[styles.replyInput, { backgroundColor: colors.background, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                    placeholder={t("providerDashboard.providerReviews.replyPlaceholder")}
                    placeholderTextColor={colors.textTertiary}
                    value={replyText}
                    onChangeText={setReplyText}
                    multiline
                    maxLength={2000}
                  />
                  <View style={styles.replyActions}>
                    <TouchableOpacity style={styles.replyCancelBtn} onPress={handleCancelReply} activeOpacity={0.8}>
                      <Text style={[styles.replyCancelText, { color: colors.textSecondary }]}>{t("providerDashboard.providerReviews.cancel")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.replySendBtn, { backgroundColor: colors.primary }, !replyText.trim() && styles.replySendBtnDisabled]}
                      onPress={handleSendReply}
                      disabled={!replyText.trim() || respondMutation.isPending}
                      activeOpacity={0.8}
                    >
                      {respondMutation.isPending ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.replySendText}>{t("providerDashboard.providerReviews.sendReply")}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
          onEndReached={hasMore && !isLoadingMore ? loadMore : undefined}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isLoading}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontWeight: "700" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  redirectingText: { fontSize: 14 },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  summaryRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  ratingBig: { fontSize: 32, fontWeight: "700", marginRight: 16 },
  summaryRight: { flex: 1 },
  starsRow: { marginBottom: 4 },
  totalReviews: { fontSize: 12 },
  responseRateLabel: { fontSize: 12 },
  responseRateValue: { fontSize: 12, fontWeight: "600" },
  distributionCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  distributionRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  distributionLabel: { width: 28, fontSize: 12 },
  barBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginHorizontal: 8,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
  distributionCount: { width: 24, fontSize: 12, textAlign: "right" },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  filterPillText: { fontSize: 12, fontWeight: "500" },
  sortRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  sortPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sortPillText: { fontSize: 11, fontWeight: "500" },
  listHeaderStyle: { paddingHorizontal: 20, paddingTop: 4 },
  listContent: { paddingHorizontal: 20 },
  emptyWrap: { paddingVertical: 32, alignItems: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: "center" },
  reviewCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  reviewHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: { fontSize: 14, fontWeight: "600" },
  reviewMeta: { flex: 1, marginLeft: 12 },
  clientName: { fontSize: 14, fontWeight: "600", marginBottom: 2 },
  reviewDate: { fontSize: 11, marginBottom: 4 },
  commentWrap: { marginBottom: 10 },
  commentText: { fontSize: 13, lineHeight: 20 },
  readMoreBtn: { marginTop: 4 },
  readMoreText: { fontSize: 12, fontWeight: "500" },
  responseWrap: {
    paddingTop: 10,
    borderTopWidth: 1,
  },
  responseLabel: { fontSize: 11, marginBottom: 4 },
  responseText: { fontSize: 13, lineHeight: 20 },
  replyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  replyBtnText: { fontSize: 13, fontWeight: "500" },
  replyInputWrap: { marginTop: 8 },
  replyInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
  },
  replyActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  replyCancelBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  replyCancelText: { fontSize: 14, color: "rgba(255,255,255,0.6)" },
  replySendBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  replySendBtnDisabled: { opacity: 0.5 },
  replySendText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  footerLoader: { paddingVertical: 16, alignItems: "center" },
});
