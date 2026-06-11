import { StarRating } from '@/components/StarRating';
import { useThemeColors } from '@/hooks/useThemeColors';
import { t } from '@/i18n';
import { fetchOrderDetail } from '@/services/orders';
import { createReview, ApiError, type ReviewTipAmountUsd } from '@/services/reviews';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ACCENT = '#3b82f6';

const TIP_AMOUNT_OPTIONS: readonly ReviewTipAmountUsd[] = [0, 5, 10, 15];

function tipAmountLabel(amount: ReviewTipAmountUsd): string {
  switch (amount) {
    case 0:
      return t('rating.tipNone');
    case 5:
      return t('rating.tip5');
    case 10:
      return t('rating.tip10');
    case 15:
      return t('rating.tip15');
    default: {
      const _exhaustive: never = amount;
      return _exhaustive;
    }
  }
}

function formatScheduledAt(scheduledAt: string | undefined): string {
  if (!scheduledAt) return '';
  const d = new Date(scheduledAt);
  return d.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function RateExperienceScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const colors = useThemeColors();
  const { orderId } = useLocalSearchParams<{ orderId: string; navRef?: string }>();
  const insets = useSafeAreaInsets();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [tipAmount, setTipAmount] = useState<ReviewTipAmountUsd>(0);
  const [submitting, setSubmitting] = useState(false);
  const [orderDetail, setOrderDetail] = useState<Awaited<ReturnType<typeof fetchOrderDetail>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchOrderDetail(orderId);
      setOrderDetail(data);
    } catch {
      setError(t('errors.requestFailed'));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const order = orderDetail?.order;
  const supplierId = order?.supplier_id ?? orderDetail?.supplier?.id;
  const providerName =
    order?.supplier_name ??
    order?.business_name ??
    orderDetail?.supplier?.business_name?.trim() ??
    orderDetail?.supplier?.full_name ??
    t('orders.provider');
  const serviceName = order?.service_name ?? '';
  const scheduledLabel = formatScheduledAt(order?.scheduled_at);

  const handleSubmit = useCallback(async () => {
    if (rating === 0) {
      Alert.alert(t('common.error'), t('rating.tapToRate'));
      return;
    }
    if (!supplierId) {
      Alert.alert(t('common.error'), t('orders.noProvider'));
      return;
    }

    try {
      setSubmitting(true);
      await createReview({
        order_id: orderId,
        supplier_id: supplierId,
        rating,
        comment: comment.trim() || undefined,
        tip_amount: tipAmount,
      });

      queryClient.invalidateQueries({ queryKey: ['providerProfileStats'] });
      queryClient.invalidateQueries({ queryKey: ['provider-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['providerDashboardStats'] });

      Alert.alert(t('common.success'), t('rating.reviewSubmitted'), [
        { text: t('common.ok'), onPress: () => router.push('/(tabs)/home') },
      ]);
    } catch (err) {
      const isAlreadyReviewed =
        err instanceof ApiError &&
        (err.statusCode === 409 || err.data?.code === 'already_reviewed');
      const isOrderNotReady =
        err instanceof ApiError &&
        (err.statusCode === 400 || err.statusCode === 422) &&
        err.data?.code === 'invalid_order_status';
      if (isAlreadyReviewed) {
        Alert.alert(t('common.success'), t('rating.alreadyReviewed'), [
          { text: t('common.ok'), onPress: () => router.push('/(tabs)/home') },
        ]);
      } else if (isOrderNotReady) {
        Alert.alert(t('common.error'), t('rating.errors.orderNotReady'));
      } else {
        Alert.alert(t('common.error'), t('errors.requestFailed'));
      }
    } finally {
      setSubmitting(false);
    }
  }, [orderId, supplierId, rating, comment, tipAmount, router, queryClient]);

  const handleSkip = useCallback(() => {
    router.push('/(tabs)/home');
  }, [router]);

  const themed = useMemo(
    () => ({
      screenBg: colors.screenBackground,
      headerBg: colors.card,
      headerBorder: colors.cardBorder,
      cardBg: colors.card,
      cardBorder: colors.cardBorder,
      textPrimary: colors.textPrimary,
      textSecondary: colors.textSecondary,
      sectionMuted: colors.textSecondary,
      inputBg: colors.surfaceSecondary,
      inputBorder: colors.border,
      footerBg: colors.screenBackground,
    }),
    [colors],
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top, backgroundColor: themed.screenBg }]}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={[styles.container, { backgroundColor: themed.screenBg }]}>
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + 12,
              paddingBottom: 14,
              backgroundColor: themed.headerBg,
              borderBottomWidth: 1,
              borderBottomColor: themed.headerBorder,
            },
          ]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={themed.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themed.textPrimary }]}>{t('rating.title')}</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: colors.textPrimary }]}>{error ?? t('errors.requestFailed')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadOrder}>
            <Text style={styles.retryText}>{t('chat.retry')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const alreadyReviewed = Boolean(orderDetail?.client_has_reviewed);
  if (alreadyReviewed) {
    return (
      <View style={[styles.container, { backgroundColor: themed.screenBg }]}>
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + 12,
              paddingBottom: 14,
              backgroundColor: themed.headerBg,
              borderBottomWidth: 1,
              borderBottomColor: themed.headerBorder,
            },
          ]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={themed.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themed.textPrimary }]}>{t('rating.title')}</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={[styles.centered, { flex: 1 }]}>
          <View style={[styles.card, { backgroundColor: themed.cardBg, borderColor: themed.cardBorder }]}>
            <Ionicons name="checkmark-circle" size={56} color={ACCENT} style={{ marginBottom: 16 }} />
            <Text style={[styles.serviceTitle, { color: themed.textPrimary }]}>{t('rating.alreadyReviewed')}</Text>
          </View>
          <TouchableOpacity
            style={[styles.submitButton, { marginTop: 24, paddingVertical: 16 }]}
            onPress={() => router.push('/(tabs)/home')}
            activeOpacity={0.8}
          >
            <Text style={styles.submitButtonText}>{t('common.goToHome')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themed.screenBg }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
            paddingBottom: 14,
            backgroundColor: themed.headerBg,
            borderBottomWidth: 1,
            borderBottomColor: themed.headerBorder,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themed.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themed.textPrimary }]}>{t('rating.title')}</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: themed.cardBg, borderColor: themed.cardBorder }]}>
          <Text style={[styles.serviceTitle, { color: themed.textPrimary }]}>{serviceName || t('orders.service')}</Text>
          <Text style={[styles.providerName, { color: themed.textSecondary }]}>{providerName}</Text>
          {scheduledLabel ? <Text style={[styles.serviceDate, { color: themed.textSecondary }]}>{scheduledLabel}</Text> : null}
        </View>

        <Text style={[styles.sectionQuestion, { color: themed.textPrimary }]}>{t('rating.howWasService')}</Text>
        <View style={[styles.card, { backgroundColor: themed.cardBg, borderColor: themed.cardBorder }]}>
          <StarRating
            rating={rating}
            size={40}
            interactive
            onRatingChange={setRating}
          />
          <Text style={[styles.ratingHint, { color: themed.textSecondary }]}>{t('rating.tapToRate')}</Text>
        </View>

        <Text style={[styles.sectionLabel, { color: themed.sectionMuted }]}>{t('rating.shareExperience')}</Text>
        <TextInput
          style={[
            styles.commentInput,
            {
              backgroundColor: themed.inputBg,
              borderColor: themed.inputBorder,
              color: themed.textPrimary,
            },
          ]}
          placeholder={t('rating.placeholder')}
          placeholderTextColor={colors.textTertiary}
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        <Text style={[styles.sectionLabel, { color: themed.sectionMuted }]}>{t('rating.tipSection')}</Text>
        <View style={styles.tipRow}>
          {TIP_AMOUNT_OPTIONS.map((amount) => {
            const selected = tipAmount === amount;
            return (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.tipChip,
                  {
                    borderColor: selected ? ACCENT : themed.inputBorder,
                    backgroundColor: selected ? ACCENT : themed.inputBg,
                  },
                ]}
                onPress={() => setTipAmount(amount)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={tipAmountLabel(amount)}
              >
                <Text
                  style={[
                    styles.tipChipText,
                    selected ? styles.tipChipTextSelected : { color: themed.textPrimary },
                  ]}
                >
                  {tipAmountLabel(amount)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.photoButton, { borderColor: themed.inputBorder }]}
          activeOpacity={0.8}
        >
          <Ionicons name="camera-outline" size={24} color={ACCENT} />
          <Text style={styles.photoButtonText}>{t('rating.uploadPhotos')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(insets.bottom, 12) + 8,
            backgroundColor: themed.footerBg,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.submitButton, (rating === 0 || submitting) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={rating === 0 || submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>{t('rating.submitReview')}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip} activeOpacity={0.7}>
          <Text style={[styles.skipButtonText, { color: colors.primary }]}>{t('rating.skip')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerPlaceholder: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  sectionQuestion: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  providerName: {
    fontSize: 15,
    marginBottom: 4,
  },
  serviceDate: {
    fontSize: 13,
  },
  ratingHint: {
    fontSize: 14,
    marginTop: 12,
  },
  commentInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    borderWidth: 1,
    minHeight: 120,
    width: '100%',
  },
  tipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  tipChip: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
  },
  tipChipText: {
    fontSize: 15,
    fontWeight: '600',
  },
  tipChipTextSelected: {
    color: '#FFFFFF',
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginTop: 8,
    marginBottom: 24,
  },
  photoButtonText: {
    fontSize: 16,
    color: ACCENT,
    fontWeight: '500',
    marginLeft: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: ACCENT,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 6,
  },
  submitButton: {
    backgroundColor: ACCENT,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
