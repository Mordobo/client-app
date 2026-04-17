import { useThemeColors } from '@/hooks/useThemeColors';
import { getLocale, t } from '@/i18n';
import { fetchFaqs, flattenFaqsToItems, type FaqAudience, type FaqListItem } from '@/services/faqs';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export interface HelpCenterScrollContentProps {
  faqAudience: FaqAudience;
  showComplaintsRow: boolean;
  showInlineContactSection: boolean;
  onPressComplaints: () => void;
  /** When inline contact is hidden, show a single CTA row (e.g. navigate to provider contact support). */
  onPressMoreHelp?: () => void;
  moreHelpLabel?: string;
  moreHelpSubtitle?: string;
  bottomInset: number;
}

export function HelpCenterScrollContent({
  faqAudience,
  showComplaintsRow,
  showInlineContactSection,
  onPressComplaints,
  onPressMoreHelp,
  moreHelpLabel,
  moreHelpSubtitle,
  bottomInset,
}: HelpCenterScrollContentProps) {
  const colors = useThemeColors();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaqs, setExpandedFaqs] = useState<Set<string>>(new Set());

  const locale = getLocale();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['faqs', locale, faqAudience],
    queryFn: () => fetchFaqs(locale, faqAudience),
    staleTime: 5 * 60 * 1000,
  });

  const faqItems: FaqListItem[] = useMemo(() => {
    if (!data?.categories?.length) return [];
    return flattenFaqsToItems(data.categories);
  }, [data?.categories]);

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqItems;
    const query = searchQuery.toLowerCase();
    return faqItems.filter(
      (item) =>
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query)
    );
  }, [searchQuery, faqItems]);

  const toggleFaq = (id: string) => {
    setExpandedFaqs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleLiveChat = () => {
    Alert.alert(t('helpCenter.liveChat'), t('helpCenter.liveChatComingBody'));
  };

  const handleEmailSupport = () => {
    const email = t('helpCenter.emailAddress');
    const subject = encodeURIComponent(t('helpCenter.emailDefaultSubject'));
    const body = encodeURIComponent(t('helpCenter.emailDefaultBody'));
    const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;

    Linking.openURL(mailtoUrl).catch(() => {
      Alert.alert(t('common.error'), t('helpCenter.openEmailFailed'));
    });
  };

  const handlePhoneSupport = () => {
    const phoneNumber = t('helpCenter.phoneNumber').replace(/\s/g, '');
    const phoneUrl = `tel:${phoneNumber}`;

    Linking.openURL(phoneUrl).catch(() => {
      Alert.alert(t('common.error'), t('helpCenter.openPhoneFailed'));
    });
  };

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: 20 + bottomInset, backgroundColor: colors.background },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchInputContainer,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder={t('helpCenter.searchPlaceholder')}
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {t('helpCenter.frequentlyAskedQuestions')}
      </Text>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {t('common.loading')}
          </Text>
        </View>
      ) : isError ? (
        <View style={styles.noResultsContainer}>
          <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
            {error instanceof Error ? error.message : t('helpCenter.noResults')}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => refetch()}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>{t('chat.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : filteredFaqs.length > 0 ? (
        filteredFaqs.map((faq) => {
          const isExpanded = expandedFaqs.has(faq.id);
          return (
            <View key={faq.id} style={[styles.faqItem, { backgroundColor: colors.card }]}>
              <TouchableOpacity
                style={styles.faqHeader}
                onPress={() => toggleFaq(faq.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.faqIcon}>{faq.icon}</Text>
                <Text style={[styles.faqQuestion, { color: colors.textPrimary }]}>{faq.question}</Text>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-forward'}
                  size={20}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
              {isExpanded && (
                <View style={[styles.faqAnswerContainer, { borderTopColor: colors.cardBorder }]}>
                  <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>{faq.answer}</Text>
                </View>
              )}
            </View>
          );
        })
      ) : (
        <View style={styles.noResultsContainer}>
          <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
            {t('helpCenter.noResults')}
          </Text>
        </View>
      )}

      <Text style={[styles.sectionTitle, styles.contactSectionTitle, { color: colors.textSecondary }]}>
        {t('helpCenter.contact')}
      </Text>

      {showComplaintsRow && (
        <TouchableOpacity
          style={[styles.contactItem, { backgroundColor: colors.card }]}
          onPress={onPressComplaints}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('helpCenter.complaintsRowTitle')}
        >
          <View style={[styles.contactIconContainer, { backgroundColor: `${colors.primary}20` }]}>
            <Text style={styles.contactIcon}>📋</Text>
          </View>
          <View style={styles.contactTextContainer}>
            <Text style={[styles.contactTitle, { color: colors.textPrimary }]}>
              {t('helpCenter.complaintsRowTitle')}
            </Text>
            <Text style={[styles.contactSubtitle, { color: colors.textSecondary }]}>
              {t('helpCenter.complaintsRowSubtitle')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </TouchableOpacity>
      )}

      {!showInlineContactSection && onPressMoreHelp && moreHelpLabel ? (
        <TouchableOpacity
          style={[styles.contactItem, { backgroundColor: colors.card }]}
          onPress={onPressMoreHelp}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={moreHelpLabel}
        >
          <View style={[styles.contactIconContainer, { backgroundColor: `${colors.primary}20` }]}>
            <Text style={styles.contactIcon}>💬</Text>
          </View>
          <View style={styles.contactTextContainer}>
            <Text style={[styles.contactTitle, { color: colors.textPrimary }]}>{moreHelpLabel}</Text>
            {moreHelpSubtitle ? (
              <Text style={[styles.contactSubtitle, { color: colors.textSecondary }]}>
                {moreHelpSubtitle}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </TouchableOpacity>
      ) : null}

      {showInlineContactSection ? (
        <>
          <TouchableOpacity
            style={[styles.contactItem, { backgroundColor: colors.card }]}
            onPress={handleLiveChat}
            activeOpacity={0.7}
          >
            <View style={[styles.contactIconContainer, { backgroundColor: `${colors.primary}20` }]}>
              <Text style={styles.contactIcon}>💬</Text>
            </View>
            <View style={styles.contactTextContainer}>
              <Text style={[styles.contactTitle, { color: colors.textPrimary }]}>
                {t('helpCenter.liveChat')}
              </Text>
              <Text style={[styles.contactSubtitle, { color: colors.textSecondary }]}>
                {t('helpCenter.liveChatSubtitle')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.contactItem, { backgroundColor: colors.card }]}
            onPress={handleEmailSupport}
            activeOpacity={0.7}
          >
            <View style={[styles.contactIconContainer, { backgroundColor: `${colors.primary}20` }]}>
              <Text style={styles.contactIcon}>📧</Text>
            </View>
            <View style={styles.contactTextContainer}>
              <Text style={[styles.contactTitle, { color: colors.textPrimary }]}>
                {t('helpCenter.email')}
              </Text>
              <Text style={[styles.contactSubtitle, { color: colors.textSecondary }]}>
                {t('helpCenter.emailAddress')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.contactItem, { backgroundColor: colors.card }]}
            onPress={handlePhoneSupport}
            activeOpacity={0.7}
          >
            <View style={[styles.contactIconContainer, { backgroundColor: `${colors.primary}20` }]}>
              <Text style={styles.contactIcon}>📞</Text>
            </View>
            <View style={styles.contactTextContainer}>
              <Text style={[styles.contactTitle, { color: colors.textPrimary }]}>
                {t('helpCenter.phone')}
              </Text>
              <Text style={[styles.contactSubtitle, { color: colors.textSecondary }]}>
                {t('helpCenter.phoneNumber')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  searchContainer: {
    marginBottom: 24,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  contactSectionTitle: {
    marginTop: 24,
  },
  faqItem: {
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
  },
  faqIcon: {
    fontSize: 20,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
  },
  faqAnswerContainer: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingLeft: 50,
    borderTopWidth: 1,
    marginTop: 8,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  noResultsContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
  },
  retryButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  contactIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactIcon: {
    fontSize: 20,
  },
  contactTextContainer: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  contactSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
