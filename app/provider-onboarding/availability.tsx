import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { t } from '@/i18n';
import { ProgressBar } from '@/components/onboarding/ProgressBar';

const TOTAL_STEPS = 8;
const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export default function ProviderOnboardingAvailabilityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeDays, setActiveDays] = useState([0, 1, 2, 3, 4]);
  const [startTime, setStartTime] = useState('08:00 AM');
  const [endTime, setEndTime] = useState('06:00 PM');

  const toggleDay = (index: number) => {
    if (activeDays.includes(index)) {
      setActiveDays(activeDays.filter(d => d !== index));
    } else {
      setActiveDays([...activeDays, index].sort());
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleContinue = () => {
    router.push('/provider-onboarding/documents');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ProgressBar currentStep={3} totalSteps={TOTAL_STEPS} />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>
          {t('providerOnboarding.availability.title')}
        </Text>
        <Text style={styles.subtitle}>
          {t('providerOnboarding.availability.subtitle')}
        </Text>

        <View style={styles.daysContainer}>
          {DAYS.map((day, index) => (
            <TouchableOpacity
              key={day}
              style={[
                styles.dayButton,
                activeDays.includes(index) && styles.dayButtonActive,
              ]}
              onPress={() => toggleDay(index)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayText,
                  activeDays.includes(index) && styles.dayTextActive,
                ]}
              >
                {day}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.scheduleCard}>
          <Text style={styles.cardLabel}>
            {t('providerOnboarding.availability.schedule')}
          </Text>
          <View style={styles.timeContainer}>
            <View style={styles.timeField}>
              <Text style={styles.timeLabel}>
                {t('providerOnboarding.availability.from')}
              </Text>
              <View style={styles.timeValue}>
                <Text style={styles.timeText}>{startTime}</Text>
              </View>
            </View>
            <Text style={styles.arrow}>→</Text>
            <View style={styles.timeField}>
              <Text style={styles.timeLabel}>
                {t('providerOnboarding.availability.to')}
              </Text>
              <View style={styles.timeValue}>
                <Text style={styles.timeText}>{endTime}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.coverageCard}>
          <Text style={styles.cardLabel}>
            {t('providerOnboarding.availability.coverage')}
          </Text>
          <View style={styles.coverageContent}>
            <Ionicons name="location" size={24} color="#A78BFA" />
            <Text style={styles.radiusText}>
              {t('providerOnboarding.availability.radius')} 15 km
            </Text>
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
            {t('providerOnboarding.availability.back')}
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
              {t('providerOnboarding.availability.continue')}
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
  daysContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 20,
  },
  dayButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonActive: {
    backgroundColor: 'transparent',
  },
  dayText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  dayTextActive: {
    color: '#FFFFFF',
  },
  scheduleCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeField: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 4,
  },
  timeValue: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  timeText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  arrow: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.2)',
    marginTop: 20,
  },
  coverageCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    flex: 1,
    minHeight: 96,
  },
  coverageContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 8,
    padding: 16,
  },
  radiusText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
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
