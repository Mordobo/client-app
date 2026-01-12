import { t } from '@/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FAQItem {
  icon: string;
  question: string;
  answer: string;
}

export default function HelpCenterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaqs, setExpandedFaqs] = useState<Set<number>>(new Set());

  // Theme colors matching JSX design
  const themeColors = {
    bg: isDark ? '#1a1a2e' : '#F9FAFB',
    bgCard: isDark ? '#252542' : '#FFFFFF',
    bgInput: isDark ? '#2d2d4a' : '#F3F4F6',
    primary: '#3b82f6',
    secondary: '#10b981',
    accent: '#f59e0b',
    danger: '#ef4444',
    textPrimary: isDark ? '#FFFFFF' : '#1F2937',
    textSecondary: isDark ? '#9ca3af' : '#6B7280',
    border: isDark ? '#374151' : '#E5E7EB',
    primary20: `${isDark ? '#3b82f6' : '#3b82f6'}20`,
  };

  // FAQ items from translations
  const faqItems: FAQItem[] = useMemo(
    () => [
      {
        icon: '📅',
        question: t('helpCenter.faqs.howToBook.question'),
        answer: t('helpCenter.faqs.howToBook.answer'),
      },
      {
        icon: '💳',
        question: t('helpCenter.faqs.howPaymentWorks.question'),
        answer: t('helpCenter.faqs.howPaymentWorks.answer'),
      },
      {
        icon: '❌',
        question: t('helpCenter.faqs.canCancel.question'),
        answer: t('helpCenter.faqs.canCancel.answer'),
      },
      {
        icon: '⭐',
        question: t('helpCenter.faqs.howToRate.question'),
        answer: t('helpCenter.faqs.howToRate.answer'),
      },
      {
        icon: '🔒',
        question: t('helpCenter.faqs.dataSecure.question'),
        answer: t('helpCenter.faqs.dataSecure.answer'),
      },
      {
        icon: '💰',
        question: t('helpCenter.faqs.howRefundsWork.question'),
        answer: t('helpCenter.faqs.howRefundsWork.answer'),
      },
    ],
    []
  );

  // Filter FAQs based on search query
  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) {
      return faqItems;
    }

    const query = searchQuery.toLowerCase();
    return faqItems.filter(
      (item) =>
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query)
    );
  }, [searchQuery, faqItems]);

  const toggleFaq = (index: number) => {
    const newExpanded = new Set(expandedFaqs);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedFaqs(newExpanded);
  };

  const handleLiveChat = () => {
    // TODO: Implement live chat integration
    Alert.alert(
      t('helpCenter.liveChat'),
      'Live chat will be available soon. Please use email or phone support for now.'
    );
  };

  const handleEmailSupport = () => {
    const email = t('helpCenter.emailAddress');
    const subject = encodeURIComponent('Support Request');
    const body = encodeURIComponent('Hello,\n\nI need help with:\n\n');
    const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;

    Linking.openURL(mailtoUrl).catch(() => {
      Alert.alert(t('common.error'), 'Could not open email client');
    });
  };

  const handlePhoneSupport = () => {
    const phoneNumber = t('helpCenter.phoneNumber').replace(/\s/g, '');
    const phoneUrl = `tel:${phoneNumber}`;

    Linking.openURL(phoneUrl).catch(() => {
      Alert.alert(t('common.error'), 'Could not open phone dialer');
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
      {/* Header - Exact match to JSX: padding: '50px 20px 20px', display: 'flex', alignItems: 'center', gap: '16px' */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top + 16, 50),
            paddingHorizontal: 20,
            paddingBottom: 20,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={themeColors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>
          {t('helpCenter.title')}
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar - Exact match to JSX */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchInputContainer, { backgroundColor: themeColors.bgCard, borderColor: themeColors.border }]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[styles.searchInput, { color: themeColors.textPrimary }]}
              placeholder={t('helpCenter.searchPlaceholder')}
              placeholderTextColor={themeColors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* FAQs Section - Exact match to JSX */}
        <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>
          {t('helpCenter.frequentlyAskedQuestions')}
        </Text>

        {filteredFaqs.length > 0 ? (
          filteredFaqs.map((faq, index) => {
            const originalIndex = faqItems.indexOf(faq);
            const isExpanded = expandedFaqs.has(originalIndex);
            return (
              <View
                key={index}
                style={[
                  styles.faqItem,
                  { backgroundColor: themeColors.bgCard },
                ]}
              >
                <TouchableOpacity
                  style={styles.faqHeader}
                  onPress={() => toggleFaq(originalIndex)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.faqIcon}>{faq.icon}</Text>
                  <Text
                    style={[
                      styles.faqQuestion,
                      { color: themeColors.textPrimary },
                    ]}
                  >
                    {faq.question}
                  </Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-forward'}
                    size={20}
                    color={themeColors.textSecondary}
                  />
                </TouchableOpacity>
                {isExpanded && (
                  <View
                    style={[
                      styles.faqAnswerContainer,
                      { borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : themeColors.border },
                    ]}
                  >
                    <Text
                      style={[
                        styles.faqAnswer,
                        { color: themeColors.textSecondary },
                      ]}
                    >
                      {faq.answer}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <View style={styles.noResultsContainer}>
            <Text style={[styles.noResultsText, { color: themeColors.textSecondary }]}>
              {t('helpCenter.noResults')}
            </Text>
          </View>
        )}

        {/* Contact Section - Exact match to JSX */}
        <Text
          style={[
            styles.sectionTitle,
            styles.contactSectionTitle,
            { color: themeColors.textSecondary },
          ]}
        >
          {t('helpCenter.contact')}
        </Text>

        {/* Live Chat */}
        <TouchableOpacity
          style={[
            styles.contactItem,
            { backgroundColor: themeColors.bgCard },
          ]}
          onPress={handleLiveChat}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.contactIconContainer,
              { backgroundColor: themeColors.primary20 },
            ]}
          >
            <Text style={styles.contactIcon}>💬</Text>
          </View>
          <View style={styles.contactTextContainer}>
            <Text
              style={[
                styles.contactTitle,
                { color: themeColors.textPrimary },
              ]}
            >
              {t('helpCenter.liveChat')}
            </Text>
            <Text
              style={[
                styles.contactSubtitle,
                { color: themeColors.textSecondary },
              ]}
            >
              {t('helpCenter.liveChatSubtitle')}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={themeColors.textSecondary}
          />
        </TouchableOpacity>

        {/* Email */}
        <TouchableOpacity
          style={[
            styles.contactItem,
            { backgroundColor: themeColors.bgCard },
          ]}
          onPress={handleEmailSupport}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.contactIconContainer,
              { backgroundColor: themeColors.primary20 },
            ]}
          >
            <Text style={styles.contactIcon}>📧</Text>
          </View>
          <View style={styles.contactTextContainer}>
            <Text
              style={[
                styles.contactTitle,
                { color: themeColors.textPrimary },
              ]}
            >
              {t('helpCenter.email')}
            </Text>
            <Text
              style={[
                styles.contactSubtitle,
                { color: themeColors.textSecondary },
              ]}
            >
              {t('helpCenter.emailAddress')}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={themeColors.textSecondary}
          />
        </TouchableOpacity>

        {/* Phone */}
        <TouchableOpacity
          style={[
            styles.contactItem,
            { backgroundColor: themeColors.bgCard },
          ]}
          onPress={handlePhoneSupport}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.contactIconContainer,
              { backgroundColor: themeColors.primary20 },
            ]}
          >
            <Text style={styles.contactIcon}>📞</Text>
          </View>
          <View style={styles.contactTextContainer}>
            <Text
              style={[
                styles.contactTitle,
                { color: themeColors.textPrimary },
              ]}
            >
              {t('helpCenter.phone')}
            </Text>
            <Text
              style={[
                styles.contactSubtitle,
                { color: themeColors.textSecondary },
              ]}
            >
              {t('helpCenter.phoneNumber')}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={themeColors.textSecondary}
          />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 32,
  },
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
    paddingLeft: 50, // Align with icon
    borderTopWidth: 1,
    marginTop: 8,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
  },
  noResultsContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
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
