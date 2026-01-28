import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { t } from '@/i18n';
import { ProgressBar } from '@/components/onboarding/ProgressBar';

const TOTAL_STEPS = 8;

interface Document {
  id: string;
  name: string;
  desc: string;
  icon: string;
  status: 'uploaded' | 'pending' | 'optional';
}

export default function ProviderOnboardingDocumentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [documents, setDocuments] = useState<Document[]>([
    { id: '1', name: t('providerOnboarding.documents.idDocument'), desc: t('providerOnboarding.documents.idDocumentDesc'), icon: '🪪', status: 'uploaded' },
    { id: '2', name: t('providerOnboarding.documents.addressProof'), desc: t('providerOnboarding.documents.addressProofDesc'), icon: '🏠', status: 'pending' },
    { id: '3', name: t('providerOnboarding.documents.certifications'), desc: t('providerOnboarding.documents.certificationsDesc'), icon: '📜', status: 'optional' },
  ]);

  const handleUpload = (id: string) => {
    // TODO: Implement file upload
    console.log('Upload document:', id);
  };

  const handleBack = () => {
    router.back();
  };

  const handleContinue = () => {
    router.push('/provider-onboarding/bank');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ProgressBar currentStep={4} totalSteps={TOTAL_STEPS} />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>
          {t('providerOnboarding.documents.title')}
        </Text>
        <Text style={styles.subtitle}>
          {t('providerOnboarding.documents.subtitle')}
        </Text>

        <View style={styles.documentsList}>
          {documents.map((doc) => (
            <View
              key={doc.id}
              style={[
                styles.documentCard,
                doc.status === 'uploaded' && styles.documentCardUploaded,
              ]}
            >
              <View style={styles.documentIcon}>
                <Text style={styles.documentIconText}>{doc.icon}</Text>
              </View>
              <View style={styles.documentInfo}>
                <Text style={styles.documentName}>{doc.name}</Text>
                <Text style={styles.documentDesc}>{doc.desc}</Text>
              </View>
              {doc.status === 'uploaded' ? (
                <View style={styles.uploadedIcon}>
                  <Ionicons name="checkmark" size={14} color="#22C55E" />
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => handleUpload(doc.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.uploadButtonText}>
                    {t('providerOnboarding.documents.upload')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        <View style={styles.securityNote}>
          <Text style={styles.securityIcon}>🔒</Text>
          <Text style={styles.securityText}>
            {t('providerOnboarding.documents.securityNote')}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>
            {t('providerOnboarding.documents.back')}
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
              {t('providerOnboarding.documents.continue')}
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
  documentsList: {
    gap: 12,
    marginBottom: 16,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  documentCardUploaded: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentIconText: {
    fontSize: 20,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  documentDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  uploadedIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  uploadButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#A78BFA',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  securityIcon: {
    fontSize: 18,
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(251, 191, 36, 0.8)',
    lineHeight: 18,
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
