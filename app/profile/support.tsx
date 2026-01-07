import { FAQAccordion, type FAQItem } from '@/components/FAQAccordion';
import { SearchBar } from '@/components/SearchBar';
import { t } from '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
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

interface FAQCategory {
  key: 'account' | 'bookings' | 'payments' | 'technical';
  title: string;
  items: FAQItem[];
}

export default function HelpCenterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');

  // Get FAQ data from translations
  const faqCategories: FAQCategory[] = useMemo(() => {
    const accountItems = t('helpCenter.faq.account.items') as FAQItem[];
    const bookingsItems = t('helpCenter.faq.bookings.items') as FAQItem[];
    const paymentsItems = t('helpCenter.faq.payments.items') as FAQItem[];
    const technicalItems = t('helpCenter.faq.technical.items') as FAQItem[];

    return [
      {
        key: 'account' as const,
        title: t('helpCenter.categories.account'),
        items: Array.isArray(accountItems) ? accountItems : [],
      },
      {
        key: 'bookings' as const,
        title: t('helpCenter.categories.bookings'),
        items: Array.isArray(bookingsItems) ? bookingsItems : [],
      },
      {
        key: 'payments' as const,
        title: t('helpCenter.categories.payments'),
        items: Array.isArray(paymentsItems) ? paymentsItems : [],
      },
      {
        key: 'technical' as const,
        title: t('helpCenter.categories.technical'),
        items: Array.isArray(technicalItems) ? technicalItems : [],
      },
    ];
  }, []);

  // Filter FAQs based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return faqCategories;
    }

    const query = searchQuery.toLowerCase();
    return faqCategories
      .map((category) => ({
        ...category,
        items: category.items.filter(
          (item) =>
            item.question.toLowerCase().includes(query) ||
            item.answer.toLowerCase().includes(query)
        ),
      }))
      .filter((category) => category.items.length > 0);
  }, [searchQuery, faqCategories]);

  const handleLiveChat = () => {
    // TODO: Implement live chat integration
    Alert.alert(
      t('helpCenter.liveChat'),
      'Live chat will be available soon. Please use email or phone support for now.'
    );
  };

  const handleEmailSupport = () => {
    const email = 'support@mordobo.com';
    const subject = encodeURIComponent('Support Request');
    const body = encodeURIComponent('Hello,\n\nI need help with:\n\n');
    const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;

    Linking.openURL(mailtoUrl).catch(() => {
      Alert.alert(t('common.error'), 'Could not open email client');
    });
  };

  const handlePhoneSupport = () => {
    const phoneNumber = '+1-800-MORDOBO'; // Replace with actual support number
    const phoneUrl = `tel:${phoneNumber}`;

    Linking.openURL(phoneUrl).catch(() => {
      Alert.alert(t('common.error'), 'Could not open phone dialer');
    });
  };

  const handleReportProblem = () => {
    const email = 'support@mordobo.com';
    const subject = encodeURIComponent('Problem Report');
    const body = encodeURIComponent(
      'Hello,\n\nI would like to report the following problem:\n\n[Please describe the problem here]\n\n'
    );
    const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;

    Linking.openURL(mailtoUrl).catch(() => {
      Alert.alert(t('common.error'), 'Could not open email client');
    });
  };

  const handleGiveFeedback = () => {
    const email = 'feedback@mordobo.com';
    const subject = encodeURIComponent('App Feedback');
    const body = encodeURIComponent(
      'Hello,\n\nI would like to share the following feedback:\n\n[Please share your feedback here]\n\n'
    );
    const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;

    Linking.openURL(mailtoUrl).catch(() => {
      Alert.alert(t('common.error'), 'Could not open email client');
    });
  };

  const handleOpenTerms = () => {
    Linking.openURL('https://mordobo.com/terms').catch(() => {
      Alert.alert(t('common.error'), 'Could not open Terms of Service');
    });
  };

  const handleOpenPrivacy = () => {
    Linking.openURL('https://mordobo.com/privacy').catch(() => {
      Alert.alert(t('common.error'), 'Could not open Privacy Policy');
    });
  };

  const handleAboutUs = () => {
    Alert.alert(
      t('helpCenter.aboutUs'),
      'Mordobo - Making at-home services easy. Version 1.0.0'
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('helpCenter.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('helpCenter.searchPlaceholder')}
          />
        </View>

        {/* FAQ Categories */}
        {filteredCategories.length > 0 ? (
          filteredCategories.map((category) => (
            <FAQAccordion
              key={category.key}
              items={category.items}
              categoryTitle={category.title}
            />
          ))
        ) : (
          <View style={styles.noResultsContainer}>
            <Ionicons name="search-outline" size={48} color="#9CA3AF" />
            <Text style={styles.noResultsText}>
              {t('helpCenter.noResults')}
            </Text>
          </View>
        )}

        {/* Contact Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('helpCenter.contactSupport')}
          </Text>
          <View style={styles.contactContainer}>
            <TouchableOpacity
              style={styles.contactItem}
              onPress={handleLiveChat}
            >
              <View style={styles.contactIconContainer}>
                <Ionicons name="chatbubbles-outline" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.contactText}>{t('helpCenter.liveChat')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactItem}
              onPress={handleEmailSupport}
            >
              <View style={styles.contactIconContainer}>
                <Ionicons name="mail-outline" size={24} color="#10B981" />
              </View>
              <Text style={styles.contactText}>
                {t('helpCenter.emailSupport')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactItem}
              onPress={handlePhoneSupport}
            >
              <View style={styles.contactIconContainer}>
                <Ionicons name="call-outline" size={24} color="#EF4444" />
              </View>
              <Text style={styles.contactText}>
                {t('helpCenter.phoneSupport')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('helpCenter.quickActions')}
          </Text>
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleReportProblem}
            >
              <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
              <Text style={styles.actionText}>
                {t('helpCenter.reportProblem')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleGiveFeedback}
            >
              <Ionicons name="star-outline" size={20} color="#F59E0B" />
              <Text style={styles.actionText}>
                {t('helpCenter.giveFeedback')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Legal Links Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('helpCenter.legal')}</Text>
          <View style={styles.linksContainer}>
            <TouchableOpacity
              style={styles.linkItem}
              onPress={handleOpenTerms}
            >
              <Ionicons
                name="document-text-outline"
                size={20}
                color="#6B7280"
              />
              <Text style={styles.linkText}>
                {t('helpCenter.termsOfService')}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkItem}
              onPress={handleOpenPrivacy}
            >
              <Ionicons name="shield-outline" size={20} color="#6B7280" />
              <Text style={styles.linkText}>
                {t('helpCenter.privacyPolicy')}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.linkItem, styles.linkItemLast]}
              onPress={handleAboutUs}
            >
              <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
              <Text style={styles.linkText}>{t('helpCenter.aboutUs')}</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  searchContainer: {
    marginBottom: 24,
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  noResultsText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  contactContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  contactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  linksContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  linkItemLast: {
    borderBottomWidth: 0,
  },
  linkText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
});
