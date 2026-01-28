import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { t } from '@/i18n';
import { ProgressBar } from '@/components/onboarding/ProgressBar';

const TOTAL_STEPS = 8;

interface Term {
  id: string;
  text: string;
  checked: boolean;
}

export default function ProviderOnboardingTermsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [terms, setTerms] = useState<Term[]>([
    { id: '1', text: t('providerOnboarding.terms.acceptTerms'), checked: true },
    { id: '2', text: t('providerOnboarding.terms.acceptPrivacy'), checked: true },
    { id: '3', text: t('providerOnboarding.terms.acceptNotifications'), checked: false },
  ]);

  const toggleTerm = (id: string) => {
    setTerms(terms.map(t => t.id === id ? { ...t, checked: !t.checked } : t));
  };

  const handleBack = () => {
    router.back();
  };

  const handleAccept = () => {
    // TODO: Submit onboarding data
    router.push('/provider-onboarding/verification');
  };

  const canContinue = terms[0].checked && terms[1].checked;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ProgressBar currentStep={6} totalSteps={TOTAL_STEPS} />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>
          {t('providerOnboarding.terms.title')}
        </Text>
        <Text style={styles.subtitle}>
          {t('providerOnboarding.terms.subtitle')}
        </Text>

        <ScrollView
          style={styles.termsContent}
          contentContainerStyle={styles.termsContentInner}
        >
          <View style={styles.termItem}>
            <Text style={styles.termTitle}>
              {t('providerOnboarding.terms.term1')}
            </Text>
            <Text style={styles.termDesc}>
              {t('providerOnboarding.terms.term1Desc')}
            </Text>
          </View>
          <View style={styles.termItem}>
            <Text style={styles.termTitle}>
              {t('providerOnboarding.terms.term2')}
            </Text>
            <Text style={styles.termDesc}>
              {t('providerOnboarding.terms.term2Desc')}
            </Text>
          </View>
          <View style={styles.termItem}>
            <Text style={styles.termTitle}>
              {t('providerOnboarding.terms.term3')}
            </Text>
            <Text style={styles.termDesc}>
              {t('providerOnboarding.terms.term3Desc')}
            </Text>
          </View>
          <View style={styles.termItem}>
            <Text style={styles.termTitle}>
              {t('providerOnboarding.terms.term4')}
            </Text>
            <Text style={styles.termDesc}>
              {t('providerOnboarding.terms.term4Desc')}
            </Text>
          </View>
        </ScrollView>

        <View style={styles.checkboxesContainer}>
          {terms.map((term) => (
            <TouchableOpacity
              key={term.id}
              style={styles.checkboxItem}
              onPress={() => toggleTerm(term.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkbox,
                  term.checked && styles.checkboxChecked,
                ]}
              >
                {term.checked && (
                  <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.checkboxText}>{term.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>
            {t('providerOnboarding.terms.back')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.acceptButton, !canContinue && styles.acceptButtonDisabled]}
          onPress={handleAccept}
          disabled={!canContinue}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={canContinue ? ['#6366F1', '#8B5CF6'] : ['#4B5563', '#4B5563']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.acceptButtonGradient}
          >
            <Text style={styles.acceptButtonText}>
              {t('providerOnboarding.terms.accept')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#12121A',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 16,
  },
  termsContent: {
    maxHeight: 200,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  termsContentInner: {
    gap: 12,
  },
  termItem: {
    marginBottom: 8,
  },
  termTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  termDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 18,
  },
  checkboxesContainer: {
    gap: 8,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: 'transparent',
  },
  checkboxText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  backButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  acceptButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  acceptButtonDisabled: {
    opacity: 0.5,
  },
  acceptButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
