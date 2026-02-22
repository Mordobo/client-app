import { t } from '@/i18n';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaqs, setExpandedFaqs] = useState<Set<number>>(new Set());

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
    <View style={styles.container}>
      {/* Header - Exact match to JSX: padding: '50px 20px 20px', display: 'flex', alignItems: 'center', gap: '16px' */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 16,
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
            color="#FFFFFF"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('helpCenter.title')}
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={[styles.scrollView, { backgroundColor: '#1a1a2e' }]}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20, backgroundColor: '#1a1a2e' },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar - Exact match to JSX */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder={t('helpCenter.searchPlaceholder')}
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* FAQs Section - Exact match to JSX */}
        <Text style={styles.sectionTitle}>
          {t('helpCenter.frequentlyAskedQuestions')}
        </Text>

        {filteredFaqs.length > 0 ? (
          filteredFaqs.map((faq, index) => {
            const originalIndex = faqItems.indexOf(faq);
            const isExpanded = expandedFaqs.has(originalIndex);
            return (
              <View
                key={index}
                style={styles.faqItem}
              >
                <TouchableOpacity
                  style={styles.faqHeader}
                  onPress={() => toggleFaq(originalIndex)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.faqIcon}>{faq.icon}</Text>
                  <Text style={styles.faqQuestion}>
                    {faq.question}
                  </Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-forward'}
                    size={20}
                    color="#9ca3af"
                  />
                </TouchableOpacity>
                {isExpanded && (
                  <View style={styles.faqAnswerContainer}>
                    <Text style={styles.faqAnswer}>
                      {faq.answer}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsText}>
              {t('helpCenter.noResults')}
            </Text>
          </View>
        )}

        {/* Contact Section - Exact match to JSX */}
        <Text style={[styles.sectionTitle, styles.contactSectionTitle]}>
          {t('helpCenter.contact')}
        </Text>

        {/* Live Chat */}
        <TouchableOpacity
          style={styles.contactItem}
          onPress={handleLiveChat}
          activeOpacity={0.7}
        >
          <View style={styles.contactIconContainer}>
            <Text style={styles.contactIcon}>💬</Text>
          </View>
          <View style={styles.contactTextContainer}>
            <Text style={styles.contactTitle}>
              {t('helpCenter.liveChat')}
            </Text>
            <Text style={styles.contactSubtitle}>
              {t('helpCenter.liveChatSubtitle')}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color="#9ca3af"
          />
        </TouchableOpacity>

        {/* Email */}
        <TouchableOpacity
          style={styles.contactItem}
          onPress={handleEmailSupport}
          activeOpacity={0.7}
        >
          <View style={styles.contactIconContainer}>
            <Text style={styles.contactIcon}>📧</Text>
          </View>
          <View style={styles.contactTextContainer}>
            <Text style={styles.contactTitle}>
              {t('helpCenter.email')}
            </Text>
            <Text style={styles.contactSubtitle}>
              {t('helpCenter.emailAddress')}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color="#9ca3af"
          />
        </TouchableOpacity>

        {/* Phone */}
        <TouchableOpacity
          style={styles.contactItem}
          onPress={handlePhoneSupport}
          activeOpacity={0.7}
        >
          <View style={styles.contactIconContainer}>
            <Text style={styles.contactIcon}>📞</Text>
          </View>
          <View style={styles.contactTextContainer}>
            <Text style={styles.contactTitle}>
              {t('helpCenter.phone')}
            </Text>
            <Text style={styles.contactSubtitle}>
              {t('helpCenter.phoneNumber')}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color="#9ca3af"
          />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e', // Hardcode dark background like Home
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#252542', // Hardcode dark header
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF', // Hardcode white text
  },
  headerPlaceholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#1a1a2e', // Hardcode dark background
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: '#1a1a2e', // Hardcode dark background
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
    backgroundColor: '#252542', // Hardcode dark card
    borderColor: '#374151', // Hardcode dark border
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
    color: '#FFFFFF', // Hardcode white text
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 16,
    letterSpacing: 0.5,
    color: '#9ca3af', // Hardcode secondary text
  },
  contactSectionTitle: {
    marginTop: 24,
  },
  faqItem: {
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    backgroundColor: '#252542', // Hardcode dark card
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
    color: '#FFFFFF', // Hardcode white text
  },
  faqAnswerContainer: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingLeft: 50, // Align with icon
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)', // Hardcode dark border
    marginTop: 8,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
    color: '#9ca3af', // Hardcode secondary text
  },
  noResultsContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#9ca3af', // Hardcode secondary text
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    backgroundColor: '#252542', // Hardcode dark card
  },
  contactIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f620', // Hardcode primary20
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
    color: '#FFFFFF', // Hardcode white text
  },
  contactSubtitle: {
    fontSize: 12,
    marginTop: 2,
    color: '#9ca3af', // Hardcode secondary text
  },
});
