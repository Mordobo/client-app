import { ProviderSubScreenHeader } from '@/components/provider/ProviderSubScreenHeader';
import { useThemeColors } from '@/hooks/useThemeColors';
import { t } from '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProviderContactSupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const goBackToConfiguration = useCallback(() => {
    router.replace('/(provider-tabs)/profile/settings' as never);
  }, [router]);

  const handleLiveChat = useCallback(() => {
    Alert.alert(t('helpCenter.liveChat'), t('helpCenter.liveChatComingBody'));
  }, []);

  const handleEmailSupport = useCallback(() => {
    const email = t('helpCenter.emailAddress');
    const subject = encodeURIComponent(t('helpCenter.emailDefaultSubject'));
    const body = encodeURIComponent(t('helpCenter.emailDefaultBody'));
    const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;
    Linking.openURL(mailtoUrl).catch(() => {
      Alert.alert(t('common.error'), t('helpCenter.openEmailFailed'));
    });
  }, []);

  const handlePhoneSupport = useCallback(() => {
    const phoneNumber = t('helpCenter.phoneNumber').replace(/\s/g, '');
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert(t('common.error'), t('helpCenter.openPhoneFailed'));
    });
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <ProviderSubScreenHeader
        title={t('providerDashboard.providerSettings.contactSupport')}
        onBack={goBackToConfiguration}
        accessibilityLabelBack={t('providerDashboard.providerSettings.back')}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
          {t('providerDashboard.providerSupportScreens.chatSection')}
        </Text>
        <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.statusTitle, { color: colors.textPrimary }]}>
              {t('providerDashboard.providerSupportScreens.statusOnline')}
            </Text>
          </View>
          <Text style={[styles.statusHint, { color: colors.textSecondary }]}>
            {t('providerDashboard.providerSupportScreens.chatHoursHint')}
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={handleLiveChat}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>{t('providerDashboard.providerSupportScreens.startChat')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionLabel, styles.sectionSpaced, { color: colors.textTertiary }]}>
          {t('helpCenter.contact')}
        </Text>

        <TouchableOpacity
          style={[styles.row, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={handleEmailSupport}
          activeOpacity={0.75}
        >
          <View style={[styles.iconBox, { backgroundColor: `${colors.primary}20` }]}>
            <Text style={styles.emoji}>📧</Text>
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{t('helpCenter.email')}</Text>
            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>{t('helpCenter.emailAddress')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.row, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={handlePhoneSupport}
          activeOpacity={0.75}
        >
          <View style={[styles.iconBox, { backgroundColor: `${colors.primary}20` }]}>
            <Text style={styles.emoji}>📞</Text>
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{t('helpCenter.phone')}</Text>
            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>{t('helpCenter.phoneNumber')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </TouchableOpacity>

        <Text style={[styles.sectionLabel, styles.sectionSpaced, { color: colors.textTertiary }]}>
          {t('providerDashboard.providerSupportScreens.formalRequests')}
        </Text>
        <TouchableOpacity
          style={[styles.row, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => router.push('/account/complaints')}
          activeOpacity={0.75}
        >
          <View style={[styles.iconBox, { backgroundColor: `${colors.primary}20` }]}>
            <Text style={styles.emoji}>📋</Text>
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
              {t('helpCenter.complaintsRowTitle')}
            </Text>
            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
              {t('helpCenter.complaintsRowSubtitle')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </TouchableOpacity>
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
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  sectionSpaced: {
    marginTop: 24,
  },
  statusCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 20,
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
});
