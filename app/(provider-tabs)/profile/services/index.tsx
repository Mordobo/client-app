import { useThemeColors } from "@/hooks/useThemeColors";
import { t } from "@/i18n";
import {
    deleteProviderService,
    getProviderServices,
    type ProviderService,
    updateProviderServiceStatus,
} from "@/services/providerServices";
import { Ionicons } from "@expo/vector-icons";
import { PlatformFlashList } from "@/components/PlatformFlashList";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const QUERY_KEY = ["providerServices"] as const;

function formatPrice(price: number): string {
  return `$${Number(price).toFixed(0)}`;
}

function formatDuration(minutes: number | null): string {
  if (minutes == null || minutes <= 0) return "—";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}-${h + 1} hrs` : `${h} hr`;
}

export default function ProviderServicesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: [...QUERY_KEY, search.trim() || undefined],
    queryFn: () => getProviderServices(search.trim() || undefined),
    staleTime: 30_000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateProviderServiceStatus(id, isActive),
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const prev = queryClient.getQueryData<{ services: ProviderService[]; total: number; activeCount: number }>(
        [...QUERY_KEY, search.trim() || undefined]
      );
      if (prev) {
        queryClient.setQueryData([...QUERY_KEY, search.trim() || undefined], {
          ...prev,
          services: prev.services.map((s) =>
            s.id === id ? { ...s, isActive } : s
          ),
          activeCount: prev.activeCount + (isActive ? 1 : -1),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData([...QUERY_KEY, search.trim() || undefined], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProviderService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleAddNew = useCallback(() => {
    router.push("/(provider-tabs)/profile/services/add");
  }, [router]);

  const handleEdit = useCallback(
    (service: ProviderService) => {
      router.push({
        pathname: "/(provider-tabs)/profile/services/add",
        params: { id: service.id },
      });
    },
    [router]
  );

  const handleToggleStatus = useCallback(
    (service: ProviderService) => {
      const newActive = !service.isActive;
      updateStatusMutation.mutate({ id: service.id, isActive: newActive });
    },
    [updateStatusMutation]
  );

  const handleDelete = useCallback(
    (service: ProviderService) => {
      Alert.alert(
        t("providerDashboard.providerServices.deleteConfirmTitle"),
        t("providerDashboard.providerServices.deleteConfirmMessage"),
        [
          { text: t("providerDashboard.providerServices.cancel"), style: "cancel" },
          {
            text: t("providerDashboard.providerServices.delete"),
            style: "destructive",
            onPress: () => deleteMutation.mutate(service.id),
          },
        ]
      );
    },
    [deleteMutation]
  );

  const services = data?.services ?? [];

  const renderItem = useCallback(
    ({ item }: { item: ProviderService }) => (
      <View
        style={[
          styles.card,
          { opacity: item.isActive ? 1 : 0.6, backgroundColor: colors.card, borderColor: colors.cardBorder },
        ]}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <View style={styles.nameRow}>
              <Text style={[styles.serviceName, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.name}
              </Text>
              <View
                style={[
                  styles.badge,
                  item.isActive ? styles.badgeActive : [styles.badgePaused, { backgroundColor: colors.surfaceSecondary }],
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    item.isActive ? styles.badgeTextActive : [styles.badgeTextPaused, { color: colors.textTertiary }],
                  ]}
                >
                  {item.isActive ? t("providerDashboard.providerServices.active") : t("providerDashboard.providerServices.paused")}
                </Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                ⏱️ {formatDuration(item.durationMinutes)}
              </Text>
            </View>
          </View>
          <Text style={styles.price}>{formatPrice(item.price)}</Text>
        </View>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.surfaceSecondary }]}
            onPress={() => handleEdit(item)}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>
              {t("providerDashboard.providerServices.edit")}
            </Text>
          </TouchableOpacity>
          <View style={styles.toggleWrap}>
            <Switch
              value={item.isActive}
              onValueChange={() => handleToggleStatus(item)}
              disabled={updateStatusMutation.isPending}
              trackColor={{ false: colors.border, true: "rgba(34, 197, 94, 0.4)" }}
              thumbColor={item.isActive ? "#22C55E" : colors.icon}
            />
          </View>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color="#F87171" />
          </TouchableOpacity>
        </View>
      </View>
    ),
    [handleEdit, handleToggleStatus, handleDelete, updateStatusMutation.isPending, colors]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.surfaceSecondary }]}
            onPress={handleBack}
            activeOpacity={0.8}
            accessibilityLabel={t("providerDashboard.providerServices.addNew")}
          >
            <Ionicons name="arrow-back" size={22} color={colors.icon} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t("providerDashboard.providerServices.title")}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={handleAddNew}
          activeOpacity={0.8}
        >
          <Text style={[styles.addBtnText, { color: colors.primary }]}>+ {t("providerDashboard.providerServices.addNew")}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Ionicons name="search" size={18} color={colors.iconSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder={t("providerDashboard.providerServices.searchPlaceholder")}
            placeholderTextColor={colors.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        {data != null && (
          <Text style={[styles.countText, { color: colors.textSecondary }]}>
            {t("providerDashboard.providerServices.serviceCount", { count: data.total })}
          </Text>
        )}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : services.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            {t("providerDashboard.providerServices.emptyTitle")}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {t("providerDashboard.providerServices.emptySubtitle")}
          </Text>
          <TouchableOpacity
            style={[styles.emptyCta, { backgroundColor: `${colors.primary}26`, borderColor: `${colors.primary}66` }]}
            onPress={handleAddNew}
            activeOpacity={0.8}
          >
            <Text style={[styles.emptyCtaText, { color: colors.primary }]}>+ {t("providerDashboard.providerServices.addNew")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <PlatformFlashList
          data={services}
          renderItem={renderItem}
          estimatedItemSize={140}
          keyExtractor={(item) => item.id}
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "700" },
  addBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  addBtnText: { fontSize: 14, fontWeight: "500" },
  searchRow: { paddingHorizontal: 20, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  searchWrap: { flex: 1, flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  countText: { fontSize: 12 },
  listContent: { paddingHorizontal: 20, paddingTop: 4 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  cardLeft: { flex: 1, marginRight: 12 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  serviceName: { fontSize: 14, fontWeight: "500", flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeActive: { backgroundColor: "rgba(34, 197, 94, 0.15)" },
  badgePaused: {},
  badgeText: { fontSize: 10, fontWeight: "500" },
  badgeTextActive: { color: "#4ADE80" },
  badgeTextPaused: {},
  metaRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  metaText: { fontSize: 12 },
  price: { fontSize: 18, fontWeight: "700", color: "#4ADE80" },
  actionsRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  actionBtnText: { fontSize: 12, fontWeight: "500" },
  toggleWrap: { paddingVertical: 4, paddingHorizontal: 8, justifyContent: "center" },
  deleteBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "rgba(239, 68, 68, 0.1)", alignItems: "center", justifyContent: "center" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyWrap: { flex: 1, paddingHorizontal: 20, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: "center", marginBottom: 24 },
  emptyCta: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1 },
  emptyCtaText: { fontSize: 14, fontWeight: "500" },
});
