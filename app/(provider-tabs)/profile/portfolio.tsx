import { Toast } from "@/components/Toast";
import { useThemeColors } from "@/hooks/useThemeColors";
import { t } from "@/i18n";
import {
    deletePortfolioProject,
    getPortfolio,
    getPortfolioProject,
    type PortfolioProject,
} from "@/services/portfolio";
import { getProfileImageUrl } from "@/utils/profileImage";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PURPLE_GRADIENT = ["#6366F1", "#8B5CF6"] as const;

type FilterKey = "all" | "installations" | "repairs" | "beforeAfter";

function formatStat(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
}

export default function ProviderPortfolioScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [detailProjectId, setDetailProjectId] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["providerPortfolio"],
    queryFn: getPortfolio,
    staleTime: 60_000,
  });

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ["providerPortfolioProject", detailProjectId],
    queryFn: () => getPortfolioProject(detailProjectId!),
    enabled: !!detailProjectId,
    staleTime: 0,
  });

  const projects = data?.projects ?? [];
  const stats = data?.stats ?? { totalPhotos: 0, totalViews: 0, totalLikes: 0 };

  const filteredProjects = useMemo(() => {
    if (filter === "all") return projects;
    if (filter === "beforeAfter") return projects.filter((p) => p.isBeforeAfter);
    if (filter === "installations")
      return projects.filter(
        (p) => p.categoryTag?.toLowerCase().includes("instal") ?? false
      );
    if (filter === "repairs")
      return projects.filter(
        (p) => p.categoryTag?.toLowerCase().includes("repar") ?? false
      );
    return projects;
  }, [projects, filter]);

  const handleAdd = useCallback(() => {
    router.push("/(provider-tabs)/profile/portfolio-add");
  }, [router]);

  const handleOpenDetail = useCallback((projectId: string) => {
    setDetailProjectId(projectId);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailProjectId(null);
  }, []);

  const handleEdit = useCallback(
    (projectId: string) => {
      setDetailProjectId(null);
      router.push({
        pathname: "/(provider-tabs)/profile/portfolio-add",
        params: { id: projectId },
      });
    },
    [router]
  );

  const handleDelete = useCallback(
    (project: PortfolioProject) => {
      Alert.alert(
        t("providerDashboard.portfolio.deleteProject"),
        t("providerDashboard.portfolio.deleteProjectConfirm"),
        [
          { text: t("providerDashboard.portfolio.cancel"), style: "cancel" },
          {
            text: t("providerDashboard.portfolio.delete"),
            style: "destructive",
            onPress: async () => {
              try {
                await deletePortfolioProject(project.id);
                setDetailProjectId(null);
                await queryClient.invalidateQueries({ queryKey: ["providerPortfolio"] });
                setToast({ message: t("providerDashboard.portfolio.deleteSuccess"), type: 'success' });
              } catch {
                setToast({ message: t("providerDashboard.portfolio.errors.deleteFailed"), type: 'error' });
              }
            },
          },
        ]
      );
    },
    [queryClient]
  );

  const statRows: Array<{ value: string; labelKey: string }> = [
    { value: formatStat(stats.totalPhotos), labelKey: "providerDashboard.portfolio.statPhotos" },
    { value: formatStat(stats.totalViews), labelKey: "providerDashboard.portfolio.statViews" },
    { value: formatStat(stats.totalLikes), labelKey: "providerDashboard.portfolio.statLikes" },
  ];

  const filterOptions: Array<{ key: FilterKey; labelKey: string }> = [
    { key: "all", labelKey: "providerDashboard.portfolio.filterAll" },
    { key: "installations", labelKey: "providerDashboard.portfolio.filterInstallations" },
    { key: "repairs", labelKey: "providerDashboard.portfolio.filterRepairs" },
    { key: "beforeAfter", labelKey: "providerDashboard.portfolio.filterBeforeAfter" },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Back header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]}
          onPress={() => router.back()}
          accessibilityLabel={t("common.back")}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={22} color={colors.icon} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t("providerDashboard.portfolio.title")}</Text>
        <TouchableOpacity onPress={handleAdd} style={styles.addButton} activeOpacity={0.8}>
          <Text style={styles.addButtonText}>+ {t("providerDashboard.portfolio.addButton")}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          {statRows.map((row, idx) => (
            <View key={idx} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{row.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t(row.labelKey)}</Text>
            </View>
          ))}
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
          style={styles.filtersScroll}
        >
          {filterOptions.map((opt) =>
            filter === opt.key ? (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setFilter(opt.key)}
                activeOpacity={0.8}
                style={styles.filterPillTouchable}
              >
                <LinearGradient
                  colors={[...PURPLE_GRADIENT]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.filterPillGradient}
                >
                  <Text style={styles.filterPillTextActive}>
                    {t(opt.labelKey)}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                key={opt.key}
                style={[styles.filterPill, { backgroundColor: colors.surfaceSecondary }]}
                onPress={() => setFilter(opt.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterPillText, { color: colors.textSecondary }]}>{t(opt.labelKey)}</Text>
              </TouchableOpacity>
            )
          )}
        </ScrollView>

        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#8B5CF6" />
          </View>
        ) : filteredProjects.length === 0 ? (
          /* Empty state */
          <View style={[styles.uploadCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={styles.uploadEmoji}>📷</Text>
            <Text style={[styles.uploadTitle, { color: colors.textPrimary }]}>
              {t("providerDashboard.portfolio.uploadTitle")}
            </Text>
            <Text style={[styles.uploadSubtitle, { color: colors.textSecondary }]}>
              {t("providerDashboard.portfolio.uploadSubtitle")}
            </Text>
            <TouchableOpacity
              style={styles.selectPhotosButton}
              onPress={handleAdd}
              activeOpacity={0.8}
            >
              <Text style={styles.selectPhotosButtonText}>
                {t("providerDashboard.portfolio.selectPhotos")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Grid */
          <View style={styles.grid}>
            {filteredProjects.map((project) => {
              const normalizedCover = getProfileImageUrl(project.coverImageUrl);
              const showImage = normalizedCover && !failedImages.has(project.id);
              return (
              <TouchableOpacity
                key={project.id}
                style={styles.gridItem}
                onPress={() => handleOpenDetail(project.id)}
                activeOpacity={0.9}
              >
                <View style={[styles.gridImageWrap, { backgroundColor: colors.card }]}>
                  {showImage ? (
                    <Image
                      source={{ uri: normalizedCover }}
                      style={styles.gridImage}
                      contentFit="cover"
                      cachePolicy="disk"
                      onError={() => setFailedImages((prev) => new Set(prev).add(project.id))}
                    />
                  ) : (
                    <View style={styles.gridPlaceholder}>
                      <Text style={styles.gridPlaceholderEmoji}>📸</Text>
                    </View>
                  )}
                  {project.isBeforeAfter && (
                    <View style={styles.beforeAfterBadge}>
                      <Text style={styles.beforeAfterBadgeText}>
                        {t("providerDashboard.portfolio.beforeAfterBadge")}
                      </Text>
                    </View>
                  )}
                  <View style={styles.likesBadge}>
                    <Text style={styles.likesBadgeText}>❤️ {project.likeCount}</Text>
                  </View>
                </View>
              </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Upload prompt (when there are projects) */}
        {!isLoading && projects.length > 0 && (
          <View style={[styles.uploadCard, styles.uploadCardDashed, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={styles.uploadEmoji}>📷</Text>
            <Text style={[styles.uploadTitle, { color: colors.textPrimary }]}>
              {t("providerDashboard.portfolio.uploadTitle")}
            </Text>
            <Text style={[styles.uploadSubtitle, { color: colors.textSecondary }]}>
              {t("providerDashboard.portfolio.uploadSubtitle")}
            </Text>
            <TouchableOpacity
              style={styles.selectPhotosButton}
              onPress={handleAdd}
              activeOpacity={0.8}
            >
              <Text style={styles.selectPhotosButtonText}>
                {t("providerDashboard.portfolio.selectPhotos")}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tip */}
        <View style={styles.tipCard}>
          <Text style={styles.tipEmoji}>💡</Text>
          <Text style={styles.tipText}>
            {t("providerDashboard.portfolio.tipTitle")}
          </Text>
        </View>
      </ScrollView>

      {/* Detail modal — fixed height so ScrollView can scroll and show all photos */}
      <Modal
        visible={!!detailProjectId}
        animationType="slide"
        transparent
        onRequestClose={handleCloseDetail}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                paddingTop: insets.top + 8,
                height: Dimensions.get("window").height * 0.9,
                backgroundColor: colors.background,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleCloseDetail} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {t("providerDashboard.portfolio.projectDetail")}
              </Text>
              <View style={styles.modalHeaderRight} />
            </View>
            {detailLoading || !detailData?.project ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#8B5CF6" />
              </View>
            ) : (
              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.detailGallery}>
                  {detailData.project.images.length === 0 ? (
                    <View style={[styles.detailPlaceholder, { backgroundColor: colors.card }]}>
                      <Text style={styles.detailPlaceholderEmoji}>📸</Text>
                    </View>
                  ) : (
                    detailData.project.images.map((img) => {
                      const normalizedUrl = getProfileImageUrl(img.url);
                      return normalizedUrl ? (
                        <Image
                          key={img.id}
                          source={{ uri: normalizedUrl }}
                          style={[styles.detailImage, { backgroundColor: colors.card }]}
                          contentFit="cover"
                          cachePolicy="disk"
                        />
                      ) : (
                        <View key={img.id} style={[styles.detailPlaceholder, { backgroundColor: colors.card }]}>
                          <Text style={styles.detailPlaceholderEmoji}>📸</Text>
                        </View>
                      );
                    })
                  )}
                </View>
                <Text style={[styles.detailTitle, { color: colors.textPrimary }]}>{detailData.project.title}</Text>
                {detailData.project.description ? (
                  <Text style={[styles.detailDescription, { color: colors.textSecondary }]}>
                    {detailData.project.description}
                  </Text>
                ) : null}
                {detailData.project.categoryTag ? (
                  <View style={styles.detailTag}>
                    <Text style={styles.detailTagText}>
                      {detailData.project.categoryTag}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.detailActions}>
                  <TouchableOpacity
                    style={[styles.detailActionButton, { backgroundColor: colors.surfaceSecondary }]}
                    onPress={() => handleEdit(detailData.project.id)}
                  >
                    <Ionicons name="pencil-outline" size={20} color="#A78BFA" />
                    <Text style={[styles.detailActionText, { color: colors.primary }]}>
                      {t("providerDashboard.portfolio.editProject")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.detailActionButton, styles.detailActionDelete, { backgroundColor: colors.surfaceSecondary }]}
                    onPress={() => handleDelete(detailData.project)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#F87171" />
                    <Text style={[styles.detailActionText, styles.detailActionDeleteText]}>
                      {t("providerDashboard.portfolio.deleteProject")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onHide={() => setToast(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backButton: {
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
    color: "#fff",
  },
  addButton: {},
  addButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#A78BFA",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  statValue: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  statLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    marginTop: 2,
  },
  filtersScroll: {
    marginHorizontal: -20,
  },
  filtersRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterPillTouchable: {
    borderRadius: 999,
    overflow: "hidden",
  },
  filterPillGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.5)",
  },
  filterPillTextActive: {
    fontSize: 12,
    fontWeight: "500",
    color: "#fff",
  },
  loadingRow: {
    paddingVertical: 40,
    alignItems: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  gridItem: {
    width: "47%",
    aspectRatio: 1,
  },
  gridImageWrap: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  gridPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(61, 51, 112, 0.3)",
  },
  gridPlaceholderEmoji: {
    fontSize: 32,
    opacity: 0.5,
  },
  beforeAfterBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "rgba(139, 92, 246, 0.8)",
  },
  beforeAfterBadgeText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#fff",
  },
  likesBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  likesBadgeText: {
    fontSize: 10,
    color: "#fff",
  },
  uploadCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: 16,
  },
  uploadCardDashed: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(61, 51, 112, 0.5)",
  },
  uploadEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#fff",
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    marginBottom: 12,
  },
  selectPhotosButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: PURPLE_GRADIENT[0],
  },
  selectPhotosButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#fff",
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.2)",
  },
  tipEmoji: {
    fontSize: 18,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: "rgba(251, 191, 36, 0.9)",
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  modalHeaderRight: {
    width: 40,
  },
  modalLoading: {
    paddingVertical: 48,
    alignItems: "center",
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    flexGrow: 1,
  },
  detailGallery: {
    marginBottom: 16,
  },
  detailImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
  },
  detailPlaceholder: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  detailPlaceholderEmoji: {
    fontSize: 48,
    opacity: 0.4,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  detailDescription: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 22,
    marginBottom: 12,
  },
  detailTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(139, 92, 246, 0.2)",
    marginBottom: 20,
  },
  detailTagText: {
    fontSize: 12,
    color: "#C4B5FD",
  },
  detailActions: {
    gap: 8,
  },
  detailActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  detailActionDelete: {},
  detailActionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#A78BFA",
  },
  detailActionDeleteText: {
    color: "#F87171",
  },
});
