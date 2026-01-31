import { t } from "@/i18n";
import {
    deleteProviderService,
    getProviderServices,
    type ProviderService,
    updateProviderServiceStatus,
} from "@/services/providerServices";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
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

const BACKGROUND = "#12121A";
const CARD_BG = "#1E1B2E";
const CARD_BORDER = "rgba(61, 51, 112, 0.3)";
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
          { opacity: item.isActive ? 1 : 0.6 },
        ]}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <View style={styles.nameRow}>
              <Text style={styles.serviceName} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={[styles.badge, item.isActive ? styles.badgeActive : styles.badgePaused]}>
                <Text style={[styles.badgeText, item.isActive ? styles.badgeTextActive : styles.badgeTextPaused]}>
                  {item.isActive ? t("providerDashboard.providerServices.active") : t("providerDashboard.providerServices.paused")}
                </Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                ⏱️ {formatDuration(item.durationMinutes)}
              </Text>
            </View>
          </View>
          <Text style={styles.price}>{formatPrice(item.price)}</Text>
        </View>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleEdit(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnText}>
              {t("providerDashboard.providerServices.edit")}
            </Text>
          </TouchableOpacity>
          <View style={styles.toggleWrap}>
            <Switch
              value={item.isActive}
              onValueChange={() => handleToggleStatus(item)}
              disabled={updateStatusMutation.isPending}
              trackColor={{ false: "rgba(255,255,255,0.2)", true: "rgba(34, 197, 94, 0.4)" }}
              thumbColor={item.isActive ? "#22C55E" : "rgba(255,255,255,0.5)"}
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
    [handleEdit, handleToggleStatus, handleDelete, updateStatusMutation.isPending]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            activeOpacity={0.8}
            accessibilityLabel={t("providerDashboard.providerServices.addNew")}
          >
            <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          <Text style={styles.title}>{t("providerDashboard.providerServices.title")}</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={handleAddNew}
          activeOpacity={0.8}
        >
          <Text style={styles.addBtnText}>+ {t("providerDashboard.providerServices.addNew")}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color="rgba(255,255,255,0.4)" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t("providerDashboard.providerServices.searchPlaceholder")}
            placeholderTextColor="rgba(255,255,255,0.35)"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        {data != null && (
          <Text style={styles.countText}>
            {t("providerDashboard.providerServices.serviceCount", { count: data.total })}
          </Text>
        )}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : services.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>
            {t("providerDashboard.providerServices.emptyTitle")}
          </Text>
          <Text style={styles.emptySubtitle}>
            {t("providerDashboard.providerServices.emptySubtitle")}
          </Text>
          <TouchableOpacity
            style={styles.emptyCta}
            onPress={handleAddNew}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyCtaText}>+ {t("providerDashboard.providerServices.addNew")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
          data={services}
          renderItem={renderItem}
          estimatedItemSize={140}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isLoading}
              onRefresh={onRefresh}
              tintColor="#8B5CF6"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "700", color: "#fff" },
  addBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  addBtnText: { fontSize: 14, fontWeight: "500", color: "#A78BFA" },
  searchRow: { paddingHorizontal: 20, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  searchWrap: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_BORDER, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: "#fff", paddingVertical: 0 },
  countText: { fontSize: 12, color: "rgba(255,255,255,0.5)" },
  listContent: { paddingHorizontal: 20, paddingTop: 4 },
  card: { padding: 16, borderRadius: 12, backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_BORDER, marginBottom: 12 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  cardLeft: { flex: 1, marginRight: 12 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  serviceName: { fontSize: 14, fontWeight: "500", color: "#fff", flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeActive: { backgroundColor: "rgba(34, 197, 94, 0.15)" },
  badgePaused: { backgroundColor: "rgba(255,255,255,0.05)" },
  badgeText: { fontSize: 10, fontWeight: "500" },
  badgeTextActive: { color: "#4ADE80" },
  badgeTextPaused: { color: "rgba(255,255,255,0.4)" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  metaText: { fontSize: 12, color: "rgba(255,255,255,0.4)" },
  price: { fontSize: 18, fontWeight: "700", color: "#4ADE80" },
  actionsRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center" },
  actionBtnText: { fontSize: 12, fontWeight: "500", color: "rgba(255,255,255,0.6)" },
  toggleWrap: { paddingVertical: 4, paddingHorizontal: 8, justifyContent: "center" },
  deleteBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "rgba(239, 68, 68, 0.1)", alignItems: "center", justifyContent: "center" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyWrap: { flex: 1, paddingHorizontal: 20, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#fff", marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: "rgba(255,255,255,0.5)", textAlign: "center", marginBottom: 24 },
  emptyCta: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: "rgba(139, 92, 246, 0.2)", borderWidth: 1, borderColor: "rgba(139, 92, 246, 0.4)" },
  emptyCtaText: { fontSize: 14, fontWeight: "500", color: "#A78BFA" },
});
