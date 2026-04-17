import { ProviderSubScreenHeader } from '@/components/provider/ProviderSubScreenHeader';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getLocale, t } from '@/i18n';
import { fetchLegalDocument, isLegalDocType, type LegalDocType } from '@/services/legal';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { enUS, es as esLocale } from 'date-fns/locale';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

function wrapLegalHtml(body: string, background: string, foreground: string, link: string): string {
  const safeBody = body || '<p></p>';
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<style>
  body { margin:0; padding:16px; font-family:-apple-system,BlinkMacSystemFont,sans-serif;
    background:${background}; color:${foreground}; font-size:16px; line-height:1.5; }
  a { color:${link}; }
  img { max-width:100%; height:auto; }
</style>
</head>
<body>${safeBody}</body>
</html>`;
}

function titleForDoc(docType: LegalDocType): string {
  switch (docType) {
    case 'terms_of_service':
      return t('providerDashboard.providerLegal.termsOfServiceTitle');
    case 'privacy_policy':
      return t('providerDashboard.providerLegal.privacyTitle');
    case 'cookie_policy':
      return t('providerDashboard.providerLegal.cookiesTitle');
    case 'provider_agreement':
      return t('providerDashboard.providerLegal.providerAgreementTitle');
    default:
      return t('providerDashboard.providerSettings.termsPrivacy');
  }
}

export default function ProviderLegalDocumentScreen() {
  const { docType: rawDoc } = useLocalSearchParams<{ docType: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const appLocale = getLocale();

  const goBackToTermsList = useCallback(() => {
    router.replace('/(provider-tabs)/profile/terms-privacy' as never);
  }, [router]);

  const docType = typeof rawDoc === 'string' ? rawDoc : '';
  const valid = isLegalDocType(docType);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['legalDocument', docType, appLocale],
    queryFn: () => fetchLegalDocument(docType as LegalDocType, appLocale),
    enabled: valid,
  });

  const updatedLabel = useMemo(() => {
    if (!data?.updatedAt) return null;
    try {
      const d = parseISO(String(data.updatedAt));
      const loc = appLocale === 'es' ? esLocale : enUS;
      return format(d, 'PPP', { locale: loc });
    } catch {
      return null;
    }
  }, [data?.updatedAt, appLocale]);

  const html = useMemo(() => {
    if (!data?.bodyHtml) return wrapLegalHtml('<p></p>', colors.background, colors.textPrimary, colors.primary);
    return wrapLegalHtml(data.bodyHtml, colors.background, colors.textPrimary, colors.primary);
  }, [data?.bodyHtml, colors.background, colors.textPrimary, colors.primary]);

  if (!valid) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <ProviderSubScreenHeader
          title={t('providerDashboard.providerSettings.termsPrivacy')}
          onBack={goBackToTermsList}
          accessibilityLabelBack={t('providerDashboard.providerSettings.back')}
        />
        <Text style={{ color: colors.textSecondary, paddingHorizontal: 20 }}>
          {t('providerDashboard.providerLegal.loadError')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <ProviderSubScreenHeader
        title={titleForDoc(docType)}
        onBack={goBackToTermsList}
        accessibilityLabelBack={t('providerDashboard.providerSettings.back')}
      />
      {updatedLabel ? (
        <Text style={[styles.meta, { color: colors.textTertiary }]}>
          {t('providerDashboard.providerLegal.lastUpdated', { date: updatedLabel })}
        </Text>
      ) : null}
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loaderText, { color: colors.textSecondary }]}>{t('common.loading')}</Text>
        </View>
      ) : isError ? (
        <View style={styles.loader}>
          <Text style={[styles.loaderText, { color: colors.textSecondary }]}>
            {error instanceof Error ? error.message : t('providerDashboard.providerLegal.loadError')}
          </Text>
        </View>
      ) : (
        <WebView
          style={styles.webview}
          originWhitelist={['*']}
          source={{ html }}
          setSupportMultipleWindows={false}
          nestedScrollEnabled
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
  },
  meta: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    fontSize: 12,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  loaderText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
