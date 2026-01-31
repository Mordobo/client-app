import { t } from "@/i18n";
import { getLocale } from "@/i18n";
import {
  getDashboardSchedule,
  type ProviderDashboardScheduleItem,
} from "@/services/providerDashboard";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import {
  addWeeks,
  format,
  parseISO,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { enUS, es } from "date-fns/locale";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DAY_KEYS = [
  "scheduleDaySun",
  "scheduleDayMon",
  "scheduleDayTue",
  "scheduleDayWed",
  "scheduleDayThu",
  "scheduleDayFri",
  "scheduleDaySat",
] as const;

const dateFnsLocale = getLocale() === "es" ? es : enUS;

function getDisplayStatus(
  status: string,
): "pending" | "confirmed" {
  return status === "in_progress" ? "confirmed" : "pending";
}

function formatTime(isoDate: string | null): string {
  if (!isoDate) return "";
  try {
    return format(parseISO(isoDate), "h:mm a", { locale: dateFnsLocale });
  } catch {
    return "";
  }
}

export default function ProviderScheduleScreen() {
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const dateStr = useMemo(
    () => format(selectedDate, "yyyy-MM-dd"),
    [selectedDate],
  );

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["providerSchedule", dateStr],
    queryFn: () => getDashboardSchedule(dateStr),
  });

  const schedule = data?.schedule ?? [];
  const weekStart = useMemo(
    () => startOfWeek(selectedDate, { weekStartsOn: 0 }),
    [selectedDate],
  );
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const goPrevWeek = useCallback(() => {
    setSelectedDate((d) => subWeeks(d, 1));
  }, []);
  const goNextWeek = useCallback(() => {
    setSelectedDate((d) => addWeeks(d, 1));
  }, []);

  const onBlockSlot = useCallback(() => {
    // TODO: open block-slot modal when API is ready
  }, []);

  const monthYearLabel = format(selectedDate, "MMMM yyyy", {
    locale: dateFnsLocale,
  });
  const dayDetailLabel = format(selectedDate, "EEEE d", {
    locale: dateFnsLocale,
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {t("providerDashboard.scheduleScreenTitle")}
        </Text>
        <TouchableOpacity
          style={styles.blockButton}
          onPress={onBlockSlot}
          activeOpacity={0.8}
        >
          <Text style={styles.blockButtonText}>
            + {t("providerDashboard.blockSlot")}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekNav}>
        <TouchableOpacity
          onPress={goPrevWeek}
          hitSlop={12}
          style={styles.weekNavButton}
        >
          <Text style={styles.weekNavArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.weekNavLabel}>{monthYearLabel}</Text>
        <TouchableOpacity
          onPress={goNextWeek}
          hitSlop={12}
          style={styles.weekNavButton}
        >
          <Text style={styles.weekNavArrow}>→</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {weekDates.map((d) => {
          const dayKey = DAY_KEYS[d.getDay()];
          const dateNum = d.getDate();
          const isSelected =
            format(d, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
          return (
            <TouchableOpacity
              key={d.toISOString()}
              style={styles.dayCell}
              onPress={() => setSelectedDate(d)}
              activeOpacity={0.7}
            >
              <Text style={styles.dayLabel}>
                {t(`providerDashboard.${dayKey}`)}
              </Text>
              {isSelected ? (
                <LinearGradient
                  colors={["#6366F1", "#8B5CF6"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.dayNumWrapGradient}
                >
                  <Text style={styles.dayNumToday}>{dateNum}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.dayNumWrap}>
                  <Text style={styles.dayNum}>{dateNum}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 24 + insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isLoading}
            onRefresh={() => refetch()}
            tintColor="rgba(139, 92, 246, 0.8)"
          />
        }
      >
        <Text style={styles.sectionLabel}>{dayDetailLabel}</Text>

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color="#8B5CF6" />
          </View>
        ) : schedule.length === 0 ? (
          <Text style={styles.emptyText}>
            {t("providerDashboard.noAppointmentsDay")}
          </Text>
        ) : (
          schedule.map((item) => (
            <ScheduleItemCard key={item.id} item={item} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function ScheduleItemCard({ item }: { item: ProviderDashboardScheduleItem }) {
  const displayStatus = getDisplayStatus(item.status);
  const isPending = displayStatus === "pending";

  return (
    <View style={styles.itemRow}>
      <View style={styles.itemTimeWrap}>
        <Text style={styles.itemTime}>{formatTime(item.scheduledAt)}</Text>
      </View>
      <View
        style={[
          styles.card,
          isPending && styles.cardPending,
        ]}
      >
        <View style={styles.cardRow}>
          <View style={styles.cardMain}>
            <Text style={styles.cardClient}>{item.clientName}</Text>
            <Text style={styles.cardService}>{item.serviceName}</Text>
          </View>
          <View
            style={[
              styles.badge,
              isPending ? styles.badgePending : styles.badgeConfirmed,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                isPending ? styles.badgeTextPending : styles.badgeTextConfirmed,
              ]}
            >
              {isPending
                ? t("providerDashboard.appointmentPending")
                : t("providerDashboard.appointmentConfirmed")}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#12121A",
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  blockButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(139, 92, 246, 0.15)",
  },
  blockButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#A78BFA",
  },
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  weekNavButton: {
    padding: 8,
  },
  weekNavArrow: {
    fontSize: 16,
    color: "rgba(255,255,255,0.4)",
  },
  weekNavLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  dayCell: {
    alignItems: "center",
    flex: 1,
  },
  dayLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    marginBottom: 8,
  },
  dayNumWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumWrapGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNum: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255,255,255,0.6)",
  },
  dayNumToday: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  loadingWrap: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 16,
  },
  itemTimeWrap: {
    width: 64,
    alignItems: "flex-end",
  },
  itemTime: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
  },
  card: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#1E1B2E",
    borderWidth: 1,
    borderColor: "rgba(61, 51, 112, 0.3)",
  },
  cardPending: {
    borderColor: "rgba(251, 191, 36, 0.3)",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardMain: {
    flex: 1,
  },
  cardClient: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  cardService: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgePending: {
    backgroundColor: "rgba(234, 179, 8, 0.15)",
  },
  badgeConfirmed: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "500",
  },
  badgeTextPending: {
    color: "#FACC15",
  },
  badgeTextConfirmed: {
    color: "#22C55E",
  },
});
