import { t } from '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const I18N = 'providerDashboard.providerSettings.documentsScreen';
const BACKGROUND = '#12121A';
const CARD_BG = '#1E1B2E';
const CARD_BORDER = 'rgba(61, 51, 112, 0.2)';
const SECTION_HEADER_COLOR = 'rgba(255,255,255,0.4)';
const ACCENT = '#8B5CF6';

export default function ProviderDocumentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={styles.title}>{t(`${I18N}.title`)}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Empty state */}
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="document-text-outline" size={48} color={ACCENT} />
          </View>
          <Text style={styles.emptyTitle}>{t(`${I18N}.noDocuments`)}</Text>
          <Text style={styles.emptyDesc}>{t(`${I18N}.noDocumentsDesc`)}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 20,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, flexGrow: 1 },
  emptyContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60,
  },
  emptyIconBox: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: {
    color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 8, textAlign: 'center',
  },
  emptyDesc: {
    color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center',
    paddingHorizontal: 40, lineHeight: 20,
  },
});
