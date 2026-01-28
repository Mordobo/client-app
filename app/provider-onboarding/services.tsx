import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { t } from '@/i18n';
import { ProgressBar } from '@/components/onboarding/ProgressBar';

const TOTAL_STEPS = 8;

interface Service {
  id: string;
  name: string;
  price: string;
  time: string;
  active: boolean;
}

export default function ProviderOnboardingServicesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [services, setServices] = useState<Service[]>([
    { id: '1', name: 'Reparación básica', price: '$25', time: '30 min', active: true },
    { id: '2', name: 'Instalación completa', price: '$80', time: '2 hrs', active: true },
    { id: '3', name: 'Mantenimiento preventivo', price: '$45', time: '1 hr', active: false },
  ]);

  const toggleService = (id: string) => {
    setServices(services.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  const handleBack = () => {
    router.back();
  };

  const handleContinue = () => {
    router.push('/provider-onboarding/availability');
  };

  const handleAddService = () => {
    // TODO: Open modal to add new service
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ProgressBar currentStep={2} totalSteps={TOTAL_STEPS} />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>
          {t('providerOnboarding.services.title')}
        </Text>
        <Text style={styles.subtitle}>
          {t('providerOnboarding.services.subtitle')}
        </Text>

        <View style={styles.servicesList}>
          {services.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={[
                styles.serviceCard,
                service.active && styles.serviceCardActive,
              ]}
              onPress={() => toggleService(service.id)}
              activeOpacity={0.7}
            >
              <View style={styles.serviceHeader}>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.serviceTime}>
                    {t('providerOnboarding.services.duration')} {service.time}
                  </Text>
                </View>
                <View
                  style={[
                    styles.checkbox,
                    service.active && styles.checkboxActive,
                  ]}
                >
                  {service.active && (
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  )}
                </View>
              </View>
              <View style={styles.serviceFooter}>
                <LinearGradient
                  colors={['#6366F1', '#EC4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.priceGradient}
                >
                  <Text style={styles.priceText}>{service.price}</Text>
                </LinearGradient>
                <TouchableOpacity>
                  <Text style={styles.editText}>
                    {t('providerOnboarding.services.edit')}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity
            style={styles.addServiceButton}
            onPress={handleAddService}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={16} color="rgba(255, 255, 255, 0.4)" />
            <Text style={styles.addServiceText}>
              {t('providerOnboarding.services.addService')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>
            {t('providerOnboarding.services.back')}
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
              {t('providerOnboarding.services.continue')}
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
  servicesList: {
    gap: 10,
  },
  serviceCard: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  serviceCardActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  serviceTime: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: 'transparent',
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceGradient: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  editText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  addServiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  addServiceText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
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
