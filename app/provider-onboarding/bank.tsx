import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { t } from '@/i18n';
import { ProgressBar } from '@/components/onboarding/ProgressBar';

const TOTAL_STEPS = 8;

export default function ProviderOnboardingBankScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [bankName, setBankName] = useState('');
  const [clabe, setClabe] = useState('');
  const [accountHolder, setAccountHolder] = useState('');

  const handleBack = () => {
    router.back();
  };

  const handleContinue = () => {
    router.push('/provider-onboarding/terms');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ProgressBar currentStep={5} totalSteps={TOTAL_STEPS} />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>
          {t('providerOnboarding.bank.title')}
        </Text>
        <Text style={styles.subtitle}>
          {t('providerOnboarding.bank.subtitle')}
        </Text>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>
              {t('providerOnboarding.bank.bank')}
            </Text>
            <View style={styles.selectContainer}>
              <TextInput
                style={styles.select}
                placeholder={t('providerOnboarding.bank.selectBank')}
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                value={bankName}
                onChangeText={setBankName}
                editable={false}
              />
              <Ionicons
                name="chevron-down"
                size={16}
                color="rgba(255, 255, 255, 0.4)"
                style={styles.selectIcon}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              {t('providerOnboarding.bank.clabe')}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={t('providerOnboarding.bank.clabePlaceholder')}
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              value={clabe}
              onChangeText={setClabe}
              keyboardType="numeric"
              maxLength={18}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              {t('providerOnboarding.bank.accountHolder')}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={t('providerOnboarding.bank.accountHolderPlaceholder')}
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              value={accountHolder}
              onChangeText={setAccountHolder}
            />
          </View>

          <View style={styles.paymentInfoCard}>
            <Text style={styles.paymentIcon}>💳</Text>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentTitle}>
                {t('providerOnboarding.bank.weeklyPayments')}
              </Text>
              <Text style={styles.paymentDesc}>
                {t('providerOnboarding.bank.weeklyPaymentsDesc')}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>
            {t('providerOnboarding.bank.back')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueButtonGradient}
          >
            <Text style={styles.continueButtonText}>
              {t('providerOnboarding.bank.continue')}
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
    marginBottom: 20,
  },
  form: {
    gap: 16,
  },
  field: {
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    color: '#FFFFFF',
    fontSize: 14,
  },
  selectContainer: {
    position: 'relative',
  },
  select: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingRight: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    color: '#FFFFFF',
    fontSize: 14,
  },
  selectIcon: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -8 }],
  },
  paymentInfoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  paymentIcon: {
    fontSize: 18,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  paymentDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
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
  continueButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  continueButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
