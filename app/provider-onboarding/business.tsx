import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { t } from '@/i18n';
import { ProgressBar } from '@/components/onboarding/ProgressBar';

const TOTAL_STEPS = 8;

export default function ProviderOnboardingBusinessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  const handleBack = () => {
    router.back();
  };

  const handleContinue = () => {
    // TODO: Save data and navigate to next step
    router.push('/provider-onboarding/services');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ProgressBar currentStep={1} totalSteps={TOTAL_STEPS} />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>
          {t('providerOnboarding.business.title')}
        </Text>
        <Text style={styles.subtitle}>
          {t('providerOnboarding.business.subtitle')}
        </Text>

        <View style={styles.form}>
          {/* Business Name */}
          <View style={styles.field}>
            <Text style={styles.label}>
              {t('providerOnboarding.business.businessName')}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={t('providerOnboarding.business.businessNamePlaceholder')}
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              value={businessName}
              onChangeText={setBusinessName}
            />
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={styles.label}>
              {t('providerOnboarding.business.category')}
            </Text>
            <View style={styles.selectContainer}>
              <TextInput
                style={styles.select}
                placeholder={t('providerOnboarding.business.selectCategory')}
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                value={category}
                onChangeText={setCategory}
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

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>
              {t('providerOnboarding.business.description')}
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t('providerOnboarding.business.descriptionPlaceholder')}
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>
            {t('providerOnboarding.business.back')}
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
              {t('providerOnboarding.business.continue')}
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
  textArea: {
    height: 80,
    paddingTop: 12,
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
