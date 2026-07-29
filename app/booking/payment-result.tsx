import { useThemeColors } from '@/hooks/useThemeColors';
import { t } from '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ResultStatus = 'declined' | 'cancelled' | 'error';

/**
 * Landing screen for AZUL Payment Page returns. It is also the deep link entry
 * point on native (mordobo://booking/payment-result): approved payments are
 * forwarded to /booking/success/[orderId], the rest render here.
 */
export default function PaymentResultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();
  const { status, orderId, paymentId } = useLocalSearchParams<{
    status?: string;
    orderId?: string;
    paymentId?: string;
  }>();

  const isApproved = status === 'approved' && !!orderId;

  useEffect(() => {
    if (isApproved) {
      router.replace({
        pathname: '/booking/success/[orderId]',
        params: { orderId: orderId!, ...(paymentId ? { paymentId } : {}) },
      });
    }
  }, [isApproved, orderId, paymentId, router]);

  const resultStatus: ResultStatus =
    status === 'declined' || status === 'cancelled' ? status : 'error';

  const content = useMemo(() => {
    switch (resultStatus) {
      case 'declined':
        return {
          icon: 'close-circle' as const,
          color: '#ef4444',
          title: t('paymentResult.declinedTitle'),
          message: t('paymentResult.declinedMessage'),
        };
      case 'cancelled':
        return {
          icon: 'remove-circle' as const,
          color: '#f59e0b',
          title: t('paymentResult.cancelledTitle'),
          message: t('paymentResult.cancelledMessage'),
        };
      default:
        return {
          icon: 'alert-circle' as const,
          color: '#f59e0b',
          title: t('paymentResult.errorTitle'),
          message: t('paymentResult.errorMessage'),
        };
    }
  }, [resultStatus]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: themeColors.screenBackground,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 32,
        },
        title: {
          fontSize: 22,
          fontWeight: '700',
          color: themeColors.textPrimary,
          textAlign: 'center',
          marginTop: 20,
        },
        message: {
          fontSize: 15,
          lineHeight: 22,
          color: themeColors.textSecondary,
          textAlign: 'center',
          marginTop: 12,
          marginBottom: 32,
        },
        primaryButton: {
          backgroundColor: themeColors.primary,
          borderRadius: 14,
          paddingVertical: 16,
          paddingHorizontal: 32,
          alignSelf: 'stretch',
          alignItems: 'center',
        },
        primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
        secondaryButton: {
          marginTop: 14,
          paddingVertical: 12,
          alignSelf: 'stretch',
          alignItems: 'center',
        },
        secondaryButtonText: {
          color: themeColors.textSecondary,
          fontSize: 15,
          fontWeight: '600',
        },
      }),
    [themeColors]
  );

  if (isApproved) {
    // Redirecting to the success screen; avoid flashing the error UI.
    return <View style={styles.container} />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Ionicons name={content.icon} size={72} color={content.color} />
      <Text style={styles.title}>{content.title}</Text>
      <Text style={styles.message}>{content.message}</Text>
      <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/(tabs)/bookings')}>
        <Text style={styles.primaryButtonText}>{t('paymentResult.viewBookings')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace('/(tabs)/home')}>
        <Text style={styles.secondaryButtonText}>{t('paymentResult.goHome')}</Text>
      </TouchableOpacity>
    </View>
  );
}
