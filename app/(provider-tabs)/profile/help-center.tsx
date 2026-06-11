import { HelpCenterScrollContent } from '@/components/help/HelpCenterScrollContent';
import { ProviderSubScreenHeader } from '@/components/provider/ProviderSubScreenHeader';
import { useThemeColors } from '@/hooks/useThemeColors';
import { t } from '@/i18n';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProviderHelpCenterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const goContact = useCallback(() => {
    router.push('/(provider-tabs)/profile/contact-support');
  }, [router]);

  const goBackToConfiguration = useCallback(() => {
    router.replace('/(provider-tabs)/profile/settings' as never);
  }, [router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <ProviderSubScreenHeader
        title={t('helpCenter.title')}
        onBack={goBackToConfiguration}
        accessibilityLabelBack={t('providerDashboard.providerSettings.back')}
      />
      <HelpCenterScrollContent
        faqAudience="provider"
        showComplaintsRow={false}
        showInlineContactSection={false}
        onPressComplaints={() => router.push('/account/complaints')}
        onPressMoreHelp={goContact}
        moreHelpLabel={t('providerDashboard.providerSupportScreens.helpCenterMoreHelpTitle')}
        moreHelpSubtitle={t('providerDashboard.providerSupportScreens.helpCenterMoreHelpSubtitle')}
        bottomInset={insets.bottom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
