import { t } from "@/i18n";
import {
    EXAMPLE_ACTIVE_JOB_ID,
    getExampleActiveJob,
    getProviderActiveJobs,
    type ProviderActiveJobDetail,
} from "@/services/providerDashboard";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CARD_BG = "#1E1B2E";
const CARD_BORDER = "rgba(61, 51, 112, 0.3)";
const SCREEN_BG = "#12121A";
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
    const fromList = jobs.find((j) => j.id === id) as
      | ProviderActiveJobDetail
      | undefined;
    if (fromList) return fromList;
    if (id === EXAMPLE_ACTIVE_JOB_ID) return getExampleActiveJob();
    return null;
  }, [id, jobs]);

  const goBack = useCallback(() => router.back(), [router]);

  const handleChat = useCallback(() => {
    if (!job) return;
    router.push(`/booking/chat/${job.orderId}`);
  }, [job, router]);

  const handleCall = useCallback(() => {
    if (!job?.clientPhone) return;
    const url = job.clientPhone.startsWith("+")
      ? `tel:${job.clientPhone}`
      : `tel:${job.clientPhone}`;
    Linking.openURL(url);
  }, [job]);

  const handleMarkAsCompleted = useCallback(() => {
    Alert.alert(
      t("providerDashboard.confirmCompleteTitle"),
      t("providerDashboard.confirmCompleteMessage"),
      [
        { text: t("providerDashboard.cancel"), style: "cancel" },
        {
          text: t("providerDashboard.confirm"),
          onPress: () => {
            queryClient.invalidateQueries({ queryKey: ["providerActiveJobs"] });
            goBack();
          },
        },
      ]
    );
  }, [goBack, queryClient]);

  if (isLoading && jobs.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  if (isError || !job) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>{t("providerDashboard.errors.activeJobsFailed")}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
          <Text style={styles.backBtnLabel}>←</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ratingLabel =
    job.clientRating != null && job.reviewCount != null
      ? t("providerDashboard.clientRatingReviews", {
          rating: String(job.clientRating),
          count: job.reviewCount,
        })
      : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={styles.title}>{t("providerDashboard.jobDetailTitle")}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Client card */}
        <View style={[styles.card, styles.section]}>
          <View style={styles.clientRow}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={28} color="rgba(255,255,255,0.6)" />
            </View>
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{job.clientName}</Text>
              {ratingLabel ? (
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color={YELLOW_STAR} />
                  <Text style={styles.clientMeta}>{ratingLabel}</Text>
                </View>
              ) : (
                <Text style={styles.clientMeta}>—</Text>
              )}
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={handleChat}
                activeOpacity={0.7}
              >
                <Ionicons name="chatbubble-outline" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={handleCall}
                activeOpacity={0.7}
              >
                <Ionicons name="call-outline" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Service card */}
        <View style={[styles.card, styles.section]}>
          <Text style={styles.sectionLabel}>{t("providerDashboard.serviceLabel")}</Text>
          <Text style={styles.sectionTitle}>{job.serviceName}</Text>
          {job.serviceDescription ? (
            <Text style={styles.sectionSub}>{job.serviceDescription}</Text>
          ) : null}
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t("providerDashboard.agreedPriceLabel")}</Text>
            <Text style={styles.price}>{formatCurrency(job.agreedPrice)}</Text>
          </View>
        </View>

        {/* Location card */}
        <View style={[styles.card, styles.section]}>
          <Text style={styles.sectionLabel}>{t("providerDashboard.locationLabel")}</Text>
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map-outline" size={48} color="rgba(255,255,255,0.3)" />
          </View>
          <Text style={styles.address}>{job.address}</Text>
          {job.addressLine2 ? (
            <Text style={styles.addressSub}>{job.addressLine2}</Text>
          ) : null}
        </View>

        {/* Mark as completed */}
        <TouchableOpacity
          style={styles.completeBtn}
          onPress={handleMarkAsCompleted}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text style={styles.completeBtnText}>{t("providerDashboard.markAsCompleted")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCREEN_BG,
    paddingHorizontal: 20,
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
    color: "rgba(255,255,255,0.6)",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 24,
    gap: 16,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
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
