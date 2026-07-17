import { Toast } from "@/components/Toast";
import { useThemeColors } from "@/hooks/useThemeColors";
import { t } from "@/i18n";
import {
    createPortfolioProject,
    getPortfolioProject,
    updatePortfolioProject,
    uploadPortfolioImage,
} from "@/services/portfolio";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as FileSystem from "expo-file-system/legacy";
import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";

const MAX_IMAGES = 10;

const schema = z.object({
  title: z.string().min(1, "Required").max(255),
  description: z.string().max(2000).optional(),
  categoryTag: z.string().max(255).optional(),
  isBeforeAfter: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

async function uriToBase64(uri: string): Promise<string> {
  if (Platform.OS === "web" && uri.startsWith("blob:")) {
    const res = await fetch(uri);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1] || dataUrl;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  return FileSystem.readAsStringAsync(uri, {
    encoding: "base64",
  } as { encoding: "base64" });
}

export default function PortfolioAddScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ id?: string }>();
  const projectId = params.id;
  const isEdit = Boolean(projectId);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [selectedUris, setSelectedUris] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const { data: projectData, isLoading: projectLoading } = useQuery({
    queryKey: ["providerPortfolioProject", projectId],
    queryFn: () => getPortfolioProject(projectId!),
    enabled: isEdit && Boolean(projectId),
    staleTime: 0,
  });

  const project = projectData?.project;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      categoryTag: "",
      isBeforeAfter: false,
    },
  });

  useEffect(() => {
    if (project) {
      reset({
        title: project.title,
        description: project.description ?? "",
        categoryTag: project.categoryTag ?? "",
        isBeforeAfter: project.isBeforeAfter ?? false,
      });
    }
  }, [project, reset]);

  const pickImages = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("common.error"), "Permission to access photos is required.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (result.canceled || !result.assets.length) return;
      const current = selectedUris;
      const newUris = result.assets.map((a) => a.uri).filter(Boolean);
      const combined = [...current, ...newUris].slice(0, MAX_IMAGES);
      setSelectedUris(combined);
    } catch {
      setToast({ message: t("providerDashboard.portfolio.errors.uploadFailed"), type: 'error' });
    }
  }, [selectedUris]);

  const removeSelectedUri = useCallback((index: number) => {
    setSelectedUris((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const onSubmit: SubmitHandler<FormValues> = useCallback(
    async (values) => {
      Keyboard.dismiss();

      const showError = (message: string) => {
        if (isMountedRef.current) {
          setUploading(false);
          setToast({ message, type: 'error' });
        }
      };

      const showSuccessAndBack = (message: string) => {
        if (!isMountedRef.current) return;
        setUploading(false);
        setToast({ message, type: 'success' });
        queryClient.invalidateQueries({ queryKey: ["providerPortfolio"] });
        setTimeout(() => {
          if (isMountedRef.current) router.back();
        }, 800);
      };

      try {
        if (isEdit && projectId) {
          await updatePortfolioProject(projectId, {
            title: values.title.trim(),
            description: values.description?.trim() || undefined,
            categoryTag: values.categoryTag?.trim() || undefined,
            isBeforeAfter: values.isBeforeAfter,
          });
          if (selectedUris.length > 0 && isMountedRef.current) {
            setUploading(true);
            for (let i = 0; i < selectedUris.length; i++) {
              if (!isMountedRef.current) break;
              const uri = selectedUris[i];
              const manipulated = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 1200 } }],
                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
              );
              const base64 = await uriToBase64(manipulated.uri);
              await uploadPortfolioImage(projectId, base64, "image.jpg", "image/jpeg");
            }
          }
          showSuccessAndBack(t("providerDashboard.portfolio.updateSuccess"));
        } else {
          const data = await createPortfolioProject({
            title: values.title.trim(),
            description: values.description?.trim() || undefined,
            categoryTag: values.categoryTag?.trim() || undefined,
            isBeforeAfter: values.isBeforeAfter,
          });
          const created = data?.project;
          if (!created?.id) {
            showError(t("providerDashboard.portfolio.errors.createFailed"));
            return;
          }
          // The project row is already persisted. Upload images in a separate
          // try/catch so a storage failure doesn't make the user think nothing
          // was saved (and re-create duplicates on retry) — MDB-441.
          let imagesFailed = false;
          if (selectedUris.length > 0 && isMountedRef.current) {
            setUploading(true);
            try {
              for (let i = 0; i < selectedUris.length; i++) {
                if (!isMountedRef.current) break;
                const uri = selectedUris[i];
                const manipulated = await ImageManipulator.manipulateAsync(
                  uri,
                  [{ resize: { width: 1200 } }],
                  { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                );
                const base64 = await uriToBase64(manipulated.uri);
                await uploadPortfolioImage(created.id, base64, "image.jpg", "image/jpeg");
              }
            } catch {
              imagesFailed = true;
            }
          }
          if (imagesFailed) {
            if (isMountedRef.current) {
              setUploading(false);
              setToast({ message: t("providerDashboard.portfolio.savedImagesFailed"), type: 'error' });
              queryClient.invalidateQueries({ queryKey: ["providerPortfolio"] });
              setTimeout(() => {
                if (isMountedRef.current) router.back();
              }, 1200);
            }
          } else {
            showSuccessAndBack(t("providerDashboard.portfolio.createSuccess"));
          }
        }
      } catch {
        try {
          showError(
            isEdit
              ? t("providerDashboard.portfolio.errors.updateFailed")
              : t("providerDashboard.portfolio.errors.createFailed")
          );
        } catch {
          if (isMountedRef.current) {
            setUploading(false);
            setToast({ message: t("providerDashboard.portfolio.errors.createFailed"), type: 'error' });
          }
        }
      }
    },
    [isEdit, projectId, selectedUris, queryClient, router]
  );

  const existingImageCount = project?.images?.length ?? 0;
  const totalNew = selectedUris.length + (isEdit ? existingImageCount : 0);
  const canAddMore = totalNew < MAX_IMAGES;

  if (isEdit && projectLoading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]}
          onPress={() => router.back()}
          accessibilityLabel={t("common.back")}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={22} color={colors.icon} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {isEdit
            ? t("providerDashboard.portfolio.editProject")
            : t("providerDashboard.portfolio.addProject")}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top + 60}
      >
        <ScrollView
          style={[styles.scroll, { backgroundColor: colors.background }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {t("providerDashboard.portfolio.titleLabel")}
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary }, errors.title && styles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholderTextColor={colors.textTertiary}
                  placeholder=""
                  autoCapitalize="words"
                />
                {errors.title && (
                  <Text style={styles.errorText}>{errors.title.message}</Text>
                )}
              </View>
            )}
          />

          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {t("providerDashboard.portfolio.descriptionLabel")}
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary }, errors.description && styles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholderTextColor={colors.textTertiary}
                  placeholder=""
                  multiline
                  numberOfLines={4}
                />
              </View>
            )}
          />

          <Controller
            control={control}
            name="categoryTag"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {t("providerDashboard.portfolio.categoryLabel")}
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary }, errors.categoryTag && styles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholderTextColor={colors.textTertiary}
                  placeholder=""
                />
              </View>
            )}
          />

          <Controller
            control={control}
            name="isBeforeAfter"
            render={({ field: { onChange, value } }) => (
              <View style={styles.switchRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {t("providerDashboard.portfolio.beforeAfterLabel")}
                </Text>
                <Switch
                  value={value}
                  onValueChange={onChange}
                  trackColor={{ false: colors.border, true: `${colors.primary}80` }}
                  thumbColor={value ? colors.primary : colors.iconSecondary}
                />
              </View>
            )}
          />

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t("providerDashboard.portfolio.selectPhotos")} ({totalNew}/{MAX_IMAGES})
            </Text>
            {isEdit && existingImageCount > 0 && (
              <Text style={[styles.hint, { color: colors.textTertiary }]}>
                {t("providerDashboard.portfolio.existingImagesHint", {
                  count: existingImageCount,
                })}
              </Text>
            )}
            <View style={styles.thumbRow}>
              {selectedUris.map((uri, index) => (
                <View key={`${uri}-${index}`} style={styles.thumbWrap}>
                  <Image source={{ uri }} style={[styles.thumb, { backgroundColor: colors.card }]} contentFit="cover" />
                  <TouchableOpacity
                    style={styles.thumbRemove}
                    onPress={() => removeSelectedUri(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {canAddMore && (
                <TouchableOpacity
                  style={[styles.thumbAdd, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}
                  onPress={pickImages}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={28} color={colors.icon} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.submitButton, (isSubmitting || uploading) && styles.submitDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting || uploading}
              activeOpacity={0.8}
            >
              {(isSubmitting || uploading) ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {t("providerDashboard.portfolio.save")}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
              disabled={isSubmitting || uploading}
              activeOpacity={0.8}
            >
              <Text style={[styles.cancelButtonText, { color: colors.primary }]}>
                {t("providerDashboard.portfolio.cancel")}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {toast && (
        <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerRight: {
    width: 40,
  },
  keyboard: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  inputError: {
    borderColor: "#F87171",
  },
  errorText: {
    fontSize: 12,
    color: "#F87171",
    marginTop: 4,
  },
  hint: {
    fontSize: 12,
    marginBottom: 8,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  thumbRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  thumbWrap: {
    position: "relative",
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
  },
  thumbRemove: {
    position: "absolute",
    top: -4,
    right: -4,
  },
  thumbAdd: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    marginTop: 24,
    gap: 12,
  },
  submitButton: {
    backgroundColor: "#6366F1",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  submitDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
