import { t } from '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const I18N = 'providerDashboard.providerSettings.statisticsScreen';
const BACKGROUND = '#12121A';
const CARD_BG = '#1E1B2E';
const CARD_BORDER = 'rgba(61, 51, 112, 0.2)';
const SECTION_HEADER_COLOR = 'rgba(255,255,255,0.4)';
const ACCENT = '#8B5CF6';

type Period = 'week' | 'month' | 'year';

interface StatCard {
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: string;
  value: string;
  color: string;
}

export default function ProviderStatisticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>('month');

  const periodOptions: { key: Period; label: string }[] = [
    { key: 'week', label: t(`${I18N}.periodWeek`) },
    { key: 'month', label: t(`${I18N}.periodMonth`) },
    { key: 'year', label: t(`${I18N}.periodYear`) },
  ];

  const overviewCards: StatCard[] = [
    { icon: 'briefcase-outline', labelKey: `${I18N}.totalJobs`, value: '0', color: '#3B82F6' },
    { icon: 'checkmark-circle-outline', labelKey: `${I18N}.completedJobs`, value: '0', color: '#22C55E' },
    { icon: 'star-outline', labelKey: `${I18N}.avgRating`, value: '—', color: '#F59E0B' },
    { icon: 'wallet-outline', labelKey: `${I18N}.totalEarnings`, value: '$0', color: '#8B5CF6' },
  ];

  const performanceCards: StatCard[] = [
    { icon: 'people-outline', labelKey: `${I18N}.repeatClients`, value: '0', color: '#EC4899' },
    { icon: 'timer-outline', labelKey: `${I18N}.responseTime`, value: `— ${t(`${I18N}.minutes`)}`, color: '#14B8A6' },
    { icon: 'trending-up-outline', labelKey: `${I18N}.completionRate`, value: '—%', color: '#F97316' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={styles.title}>{t(`${I18N}.title`)}</Text>
      </View>

      {/* Period Selector */}
      <View style={styles.periodContainer}>
        {periodOptions.map((opt) => {
          const isActive = opt.key === period;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.periodButton, isActive && styles.periodButtonActive]}
              activeOpacity={0.8}
              onPress={() => setPeriod(opt.key)}
            >
              <Text style={[styles.periodText, isActive && styles.periodTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Overview Section */}
        <Text style={styles.sectionTitle}>{t(`${I18N}.sectionOverview`)}</Text>
        <View style={styles.cardsGrid}>
          {overviewCards.map((card, idx) => (
            <View key={idx} style={styles.statCard}>
              <View style={[styles.statIconBox, { backgroundColor: `${card.color}20` }]}>
                <Ionicons name={card.icon} size={22} color={card.color} />
              </View>
              <Text style={styles.statValue}>{card.value}</Text>
              <Text style={styles.statLabel}>{t(card.labelKey)}</Text>
            </View>
          ))}
        </View>

        {/* Performance Section */}
        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>{t(`${I18N}.sectionPerformance`)}</Text>
        <View style={styles.performanceList}>
          {performanceCards.map((card, idx) => (
            <View key={idx} style={styles.performanceCard}>
              <View style={[styles.perfIconBox, { backgroundColor: `${card.color}20` }]}>
                <Ionicons name={card.icon} size={20} color={card.color} />
              </View>
              <View style={styles.perfText}>
                <Text style={styles.perfLabel}>{t(card.labelKey)}</Text>
              </View>
              <Text style={styles.perfValue}>{card.value}</Text>
            </View>
          ))}
        </View>

        {/* Empty-state hint */}
        <View style={styles.hintContainer}>
          <Ionicons name="information-circle-outline" size={18} color="rgba(255,255,255,0.3)" />
          <Text style={styles.hintText}>{t(`${I18N}.noDataDesc`)}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 12,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  periodContainer: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 20,
    backgroundColor: CARD_BG, borderRadius: 12, padding: 4,
    borderWidth: 1, borderColor: CARD_BORDER,
  },
  periodButton: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: ACCENT,
  },
  periodText: {
    color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '600',
  },
  periodTextActive: { color: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 12, color: SECTION_HEADER_COLOR,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
  },
  cardsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  statCard: {
    width: '48%', flexGrow: 1, flexBasis: '45%',
    backgroundColor: CARD_BG, borderRadius: 14,
    borderWidth: 1, borderColor: CARD_BORDER,
    padding: 16, alignItems: 'center',
  },
  statIconBox: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  statValue: {
    color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 4,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center',
  },
  performanceList: { gap: 10 },
  performanceCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: 12, backgroundColor: CARD_BG,
    borderWidth: 1, borderColor: CARD_BORDER,
  },
  perfIconBox: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  perfText: { flex: 1 },
  perfLabel: { color: '#fff', fontSize: 14, fontWeight: '500' },
  perfValue: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hintContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 24, paddingHorizontal: 4,
  },
  hintText: {
    color: 'rgba(255,255,255,0.3)', fontSize: 13, flex: 1, lineHeight: 18,
  },
});
