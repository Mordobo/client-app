import { ProviderSubScreenHeader } from '@/components/provider/ProviderSubScreenHeader';
import { useThemeColors } from '@/hooks/useThemeColors';
import { t } from '@/i18n';
import type { LegalDocType } from '@/services/legal';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type DocRow = {
  docType: LegalDocType;
  icon: keyof typeof Ionicons.glyphMap;
  titleKey: string;
  subtitleKey: string;
};

export default function ProviderTermsPrivacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const goBackToConfiguration = useCallback(() => {
    router.replace('/(provider-tabs)/profile/settings' as never);
  }, [router]);

  const rows: DocRow[] = useMemo(
    () => [
      {
        docType: 'terms_of_service',
        icon: 'document-text-outline',
        titleKey: 'providerDashboard.providerLegal.termsOfServiceTitle',
        subtitleKey: 'providerDashboard.providerLegal.termsOfServiceSubtitle',
      },
      {
        docType: 'privacy_policy',
        icon: 'shield-checkmark-outline',
        titleKey: 'providerDashboard.providerLegal.privacyTitle',
        subtitleKey: 'providerDashboard.providerLegal.privacySubtitle',
      },
      {
        docType: 'cookie_policy',
        icon: 'cafe-outline',
        titleKey: 'providerDashboard.providerLegal.cookiesTitle',
        subtitleKey: 'providerDashboard.providerLegal.cookiesSubtitle',
      },
      {
        docType: 'provider_agreement',
        icon: 'briefcase-outline',
        titleKey: 'providerDashboard.providerLegal.providerAgreementTitle',
        subtitleKey: 'providerDashboard.providerLegal.providerAgreementSubtitle',
      },
    ],
    []
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <ProviderSubScreenHeader
        title={t('providerDashboard.providerSettings.termsPrivacy')}
        onBack={goBackToConfiguration}
        accessibilityLabelBack={t('providerDashboard.providerSettings.back')}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {rows.map((row) => (
          <TouchableOpacity
            key={row.docType}
            style={[styles.row, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() =>
              router.push(`/(provider-tabs)/profile/legal-document/${row.docType}` as never)
            }
            activeOpacity={0.75}
          >
            <View style={[styles.iconBox, { backgroundColor: `${colors.primary}20` }]}>
              <Ionicons name={row.icon} size={22} color={colors.primary} />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{t(row.titleKey)}</Text>
              <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>{t(row.subtitleKey)}</Text>
            </View>
            <Text style={[styles.arrow, { color: colors.textTertiary }]}>→</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 4,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  arrow: {
    fontSize: 14,
  },
});
