import { StarRating } from '@/components/StarRating';
import { t } from '@/i18n';
import { fetchOrderDetail } from '@/services/orders';
import { createReview, ApiError } from '@/services/reviews';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BACKGROUND = '#1a1a2e';
const HEADER_BG = '#252542';
const CARD_BG = '#252542';
const CARD_BORDER = '#374151';
const ACCENT = '#3b82f6';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#9ca3af';
const SECTION_HEADER = '#9ca3af';

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
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom || (Platform.OS === 'android' ? 40 : 0);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
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
    } catch (e) {
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
  const providerName = order?.supplier_name ?? order?.business_name ?? orderDetail?.supplier?.business_name?.trim() ?? orderDetail?.supplier?.full_name ?? t('orders.provider');
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
      if (isAlreadyReviewed) {
        Alert.alert(t('common.success'), t('rating.alreadyReviewed'), [
          { text: t('common.ok'), onPress: () => router.push('/(tabs)/home') },
        ]);
      } else {
        Alert.alert(t('common.error'), t('errors.requestFailed'));
      }
    } finally {
      setSubmitting(false);
    }
  }, [orderId, supplierId, rating, comment, router, queryClient]);

  const handleSkip = useCallback(() => {
    router.push('/(tabs)/home');
  }, [router]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: bottomInset }]}>
        <View style={[styles.header, { paddingTop: insets.top + 16, paddingBottom: 20 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('rating.title')}</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? t('errors.requestFailed')}</Text>
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
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: bottomInset }]}>
        <View style={[styles.header, { paddingTop: insets.top + 16, paddingBottom: 20 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('rating.title')}</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={[styles.centered, { flex: 1 }]}>
          <View style={styles.card}>
            <Ionicons name="checkmark-circle" size={56} color={ACCENT} style={{ marginBottom: 16 }} />
            <Text style={styles.serviceTitle}>{t('rating.alreadyReviewed')}</Text>
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
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: bottomInset }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, paddingBottom: 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('rating.title')}</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(bottomInset, 24) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.serviceTitle}>{serviceName || t('orders.service')}</Text>
          <Text style={styles.providerName}>{providerName}</Text>
          {scheduledLabel ? <Text style={styles.serviceDate}>{scheduledLabel}</Text> : null}
        </View>

        <Text style={styles.sectionQuestion}>{t('rating.howWasService')}</Text>
        <View style={styles.card}>
          <StarRating
            rating={rating}
            size={40}
            interactive
            onRatingChange={setRating}
          />
          <Text style={styles.ratingHint}>{t('rating.tapToRate')}</Text>
        </View>

        <Text style={styles.sectionLabel}>{t('rating.shareExperience')}</Text>
        <View style={styles.card}>
          <TextInput
            style={styles.commentInput}
            placeholder={t('rating.placeholder')}
            placeholderTextColor={TEXT_SECONDARY}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity style={styles.photoButton} activeOpacity={0.8}>
          <Ionicons name="camera-outline" size={24} color={ACCENT} />
          <Text style={styles.photoButtonText}>{t('rating.uploadPhotos')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(bottomInset, 16) }]}>
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
          <Text style={styles.skipButtonText}>{t('rating.skip')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
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
    backgroundColor: HEADER_BG,
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
    color: TEXT_PRIMARY,
  },
  headerPlaceholder: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  sectionQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: SECTION_HEADER,
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 12,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 4,
    textAlign: 'center',
  },
  providerName: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    marginBottom: 4,
  },
  serviceDate: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  ratingHint: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginTop: 12,
  },
  commentInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: TEXT_PRIMARY,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    minHeight: 120,
    width: '100%',
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: CARD_BORDER,
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
    paddingTop: 12,
    gap: 8,
    backgroundColor: BACKGROUND,
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
    color: TEXT_SECONDARY,
    fontSize: 15,
    fontWeight: '500',
  },
});
