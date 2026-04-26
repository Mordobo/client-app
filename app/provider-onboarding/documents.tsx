import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColors } from "@/hooks/useThemeColors";
import { t } from "@/i18n";
import { getOnboardingDocuments, submitOnboardingStep, type OnboardingDocumentType, uploadOnboardingDocument } from "@/services/providers";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TOTAL_STEPS = 8;

const DOC_ID_TO_TYPE: Record<string, OnboardingDocumentType> = {
  "1": "id_document",
  "2": "address_proof",
  "3": "certifications",
};

interface Document {
  id: string;
  name: string;
  desc: string;
  icon: string;
  status: "uploaded" | "pending" | "optional";
}

function buildInitialDocuments(): Document[] {
  return [
    { id: "1", name: t("providerOnboarding.documents.idDocument"), desc: t("providerOnboarding.documents.idDocumentDesc"), icon: "🪪", status: "pending" },
    { id: "2", name: t("providerOnboarding.documents.addressProof"), desc: t("providerOnboarding.documents.addressProofDesc"), icon: "🏠", status: "pending" },
    { id: "3", name: t("providerOnboarding.documents.certifications"), desc: t("providerOnboarding.documents.certificationsDesc"), icon: "📜", status: "optional" },
  ];
}

export default function ProviderOnboardingDocumentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [documents, setDocuments] = useState<Document[]>(buildInitialDocuments);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const refreshDocumentsFromApi = useCallback(async () => {
    try {
      const { documents: uploaded } = await getOnboardingDocuments();
      setDocuments((prev) =>
        prev.map((doc) => {
          const docType = DOC_ID_TO_TYPE[doc.id];
          const isUploaded = uploaded.some((u) => u.documentType === docType);
          return {
            ...doc,
            status:
              doc.status === "optional" ? "optional"
              : isUploaded ? "uploaded"
              : "pending",
          };
        }),
      );
    } catch {
      // Keep local state on error
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    refreshDocumentsFromApi();
  }, [refreshDocumentsFromApi]);

  const handleUpload = async (id: string) => {
    const documentType = DOC_ID_TO_TYPE[id];
    if (!documentType) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("common.error"), t("providerOnboarding.documents.permissionDenied"));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) return;

      const uri = result.assets[0].uri;
      const fileName = result.assets[0].fileName ?? `document_${documentType}.jpg`;
      setUploadingId(id);

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: "base64",
      } as { encoding: "base64" });

      await uploadOnboardingDocument(documentType, base64, fileName, "image/jpeg");

      setDocuments((prev) => prev.map((doc) => (doc.id === id ? { ...doc, status: "uploaded" as const } : doc)));
    } catch (err) {
      console.error("[Documents] Upload failed:", err);
      Alert.alert(t("common.error"), t("errors.uploadOnboardingDocumentFailed"));
    } finally {
      setUploadingId(null);
    }
  };

  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setSaving(false);
    }, []),
  );

  const handleBack = () => {
    router.back();
  };

  const handleContinue = async () => {
    setSaving(true);
    try {
      await submitOnboardingStep(4, {});
      router.push("/provider-onboarding/bank");
    } catch (e) {
      console.error("[Documents] submitOnboardingStep failed:", e);
    } finally {
      setSaving(false);
    }
  };

  const securityBg = isDark ? "rgba(251, 191, 36, 0.1)" : "rgba(245, 158, 11, 0.12)";
  const securityBorder = isDark ? "rgba(251, 191, 36, 0.2)" : "rgba(217, 119, 6, 0.35)";
  const securityTextColor = isDark ? "rgba(253, 230, 138, 0.95)" : "#92400E";

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.screenBackground }]}>
      <ProgressBar currentStep={4} totalSteps={TOTAL_STEPS} />

      <ScrollView style={[styles.scrollView, { backgroundColor: theme.screenBackground }]} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{t("providerOnboarding.documents.title")}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{t("providerOnboarding.documents.subtitle")}</Text>

        <View style={styles.documentsList}>
          {loadingDocs ?
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>{t("providerOnboarding.documents.loading")}</Text>
            </View>
          : null}
          {documents.map((doc) => (
            <View
              key={doc.id}
              style={[
                styles.documentCard,
                {
                  backgroundColor: isDark ? "rgba(255, 255, 255, 0.03)" : theme.surfaceSecondary,
                  borderColor: theme.border,
                },
                doc.status === "uploaded" && {
                  backgroundColor: isDark ? "rgba(34, 197, 94, 0.1)" : "rgba(34, 197, 94, 0.12)",
                  borderColor: isDark ? "rgba(34, 197, 94, 0.3)" : "rgba(22, 163, 74, 0.45)",
                },
              ]}
            >
              <View style={[styles.documentIcon, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : theme.surface }]}>
                <Text style={styles.documentIconText}>{doc.icon}</Text>
              </View>
              <View style={styles.documentInfo}>
                <Text style={[styles.documentName, { color: theme.textPrimary }]}>{doc.name}</Text>
                <Text style={[styles.documentDesc, { color: theme.textTertiary }]}>{doc.desc}</Text>
              </View>
              {doc.status === "uploaded" ?
                <View style={[styles.uploadedIcon, { backgroundColor: isDark ? "rgba(34, 197, 94, 0.2)" : "rgba(34, 197, 94, 0.18)" }]}>
                  <Ionicons name="checkmark" size={14} color="#22C55E" />
                </View>
              : <TouchableOpacity
                  style={[
                    styles.uploadButton,
                    { backgroundColor: isDark ? "rgba(139, 92, 246, 0.2)" : `${theme.primary}28` },
                    uploadingId === doc.id && styles.uploadButtonDisabled,
                  ]}
                  onPress={() => handleUpload(doc.id)}
                  activeOpacity={0.7}
                  disabled={uploadingId !== null}
                >
                  {uploadingId === doc.id ?
                    <ActivityIndicator size="small" color={theme.primary} />
                  : <Text style={[styles.uploadButtonText, { color: theme.primary }]}>{t("providerOnboarding.documents.upload")}</Text>}
                </TouchableOpacity>
              }
            </View>
          ))}
        </View>

        <View style={[styles.securityNote, { backgroundColor: securityBg, borderColor: securityBorder }]}>
          <Text style={styles.securityIcon}>🔒</Text>
          <Text style={[styles.securityText, { color: securityTextColor }]}>{t("providerOnboarding.documents.securityNote")}</Text>
        </View>
      </ScrollView>

      <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.surfaceSecondary }]} onPress={handleBack} activeOpacity={0.7}>
          <Text style={[styles.backButtonText, { color: theme.textSecondary }]}>{t("providerOnboarding.documents.back")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue} activeOpacity={0.8} disabled={saving}>
          <LinearGradient colors={["#6366F1", "#8B5CF6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.continueButtonGradient}>
            {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.continueButtonText}>{t("providerOnboarding.documents.continue")}</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontWeight: "700",
    marginBottom: 4,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 20,
  },
  documentsList: {
    gap: 12,
    marginBottom: 16,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 12,
  },
  documentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  documentIconText: {
    fontSize: 20,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  documentDesc: {
    fontSize: 12,
  },
  uploadedIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 44,
    minHeight: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadButtonDisabled: {
    opacity: 0.7,
  },
  uploadButtonText: {
    fontSize: 12,
    fontWeight: "500",
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  securityIcon: {
    fontSize: 18,
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  backButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  continueButton: {
    flex: 2,
    borderRadius: 12,
    overflow: "hidden",
  },
  continueButtonGradient: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
