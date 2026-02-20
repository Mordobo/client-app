import { Toast } from "@/components/Toast";
import { t } from "@/i18n";
import { fetchCategoriesTree, type CategoryTreeItem } from "@/services/categories";
import {
    getProviderProfile,
    updateProviderProfile,
    uploadProviderAvatar,
    type UpdateProviderProfilePayload,
} from "@/services/providers";
import { normalizePhoneInput, validatePhone } from "@/utils/phoneValidation";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Controller,
    useFieldArray,
    useForm,
    type SubmitHandler,
} from "react-hook-form";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";

const BACKGROUND = "#12121A";
const CARD_BG = "#1E1B2E";
const INPUT_BORDER = "rgba(61, 51, 112, 0.5)";
const BIO_MAX_LENGTH = 500;

const schema = z.object({
  displayName: z.string().min(1, "Required").max(255),
  categoryId: z.string().nullable(),
  specialties: z.array(z.string()),
  bio: z.string().max(BIO_MAX_LENGTH),
  phoneNumber: z.string().refine((val) => validatePhone(val).isValid, {
    message: t("providerDashboard.providerEditProfile.invalidPhone"),
  }),
  yearsExperience: z.union([z.string(), z.number()]).transform((v) => {
    const n = typeof v === "string" ? parseInt(v, 10) : v;
    return Number.isNaN(n) ? null : n;
  }),
});

type FormValues = z.infer<typeof schema>;

function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  return displayName.trim().slice(0, 2).toUpperCase() || "?";
}

/** Parent categories only (for first dropdown) */
function getParentCategoryOptions(tree: CategoryTreeItem[]): { id: string; name: string }[] {
  return (tree || []).map((c) => ({ id: c.id, name: c.name }));
}

/** Get subcategories for a parent (for second dropdown). Returns empty if parentId not in tree. */
function getSubcategoryOptions(tree: CategoryTreeItem[] | undefined, parentId: string | null): { id: string; name: string }[] {
  if (!tree || !parentId) return [];
  const parent = tree.find((c) => c.id === parentId);
  return (parent?.subcategories || []).map((s) => ({ id: s.id, name: s.name }));
}

/** Resolve which parent is selected from current categoryId (parent id or subcategory's parent) */
function getSelectedParentId(tree: CategoryTreeItem[] | undefined, categoryId: string | null): string | null {
  if (!tree || !categoryId) return null;
  const asParent = tree.find((c) => c.id === categoryId);
  if (asParent) return categoryId;
  for (const c of tree) {
    if ((c.subcategories || []).some((s) => s.id === categoryId)) return c.id;
  }
  return null;
}

export default function ProviderEditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [subcategoryModalVisible, setSubcategoryModalVisible] = useState(false);
  const [specialtyModalVisible, setSpecialtyModalVisible] = useState(false);
  const [newSpecialtyText, setNewSpecialtyText] = useState("");

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["providerProfile"],
    queryFn: getProviderProfile,
    staleTime: 0,
  });

  const { data: categoriesTree } = useQuery({
    queryKey: ["categoriesTree"],
    queryFn: fetchCategoriesTree,
    staleTime: 5 * 60 * 1000,
  });

  const parentCategoryOptions = useMemo(
    () => (categoriesTree ? getParentCategoryOptions(categoriesTree) : []),
    [categoriesTree],
  );

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { isDirty, errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: "",
      categoryId: null,
      specialties: [] as string[],
      bio: "",
      phoneNumber: "",
      yearsExperience: null as number | null,
    },
  });

  const { fields: specialtyFields, append: appendSpecialty, remove: removeSpecialty } = useFieldArray({
    control,
    name: "specialties",
  });

  const selectedCategoryId = watch("categoryId");
  const selectedParentId = useMemo(
    () => getSelectedParentId(categoriesTree ?? undefined, selectedCategoryId),
    [categoriesTree, selectedCategoryId],
  );
  const subcategoryOptions = useMemo(
    () => getSubcategoryOptions(categoriesTree ?? undefined, selectedParentId),
    [categoriesTree, selectedParentId],
  );
  const selectedParentLabel = selectedParentId
    ? parentCategoryOptions.find((o) => o.id === selectedParentId)?.name ?? ""
    : "";
  const selectedSubcategoryLabel = selectedCategoryId && subcategoryOptions.some((s) => s.id === selectedCategoryId)
    ? subcategoryOptions.find((o) => o.id === selectedCategoryId)?.name ?? ""
    : "";

  const bioValue = watch("bio");
  const bioLength = typeof bioValue === "string" ? bioValue.length : 0;

  // Resolve categoryId from categoryName when onboarding saved only the name (e.g. parent category)
  const resolvedCategoryId = useMemo(() => {
    if (profile?.categoryId) return profile.categoryId;
    if (!profile?.categoryName || !categoriesTree?.length) return null;
    const name = profile.categoryName.trim();
    for (const c of categoriesTree) {
      if (c.name === name) return c.id;
      for (const s of c.subcategories || []) {
        if (s.name === name) return s.id;
      }
    }
    return null;
  }, [profile?.categoryId, profile?.categoryName, categoriesTree]);

  useEffect(() => {
    if (!profile) return;
    reset({
      displayName: profile.displayName || "",
      categoryId: resolvedCategoryId,
      specialties: (profile as { specialties?: string[] }).specialties ?? [],
      bio: profile.bio || "",
      phoneNumber: normalizePhoneInput(profile.phoneNumber || ""),
      yearsExperience: profile.yearsExperience ?? null,
    });
    if (profile.avatarUrl) setAvatarUri(profile.avatarUrl);
  }, [profile, resolvedCategoryId, reset]);

  const handleBack = useCallback(() => {
    if (isDirty) {
      Alert.alert(
        t("providerDashboard.providerEditProfile.unsavedChanges"),
        t("providerDashboard.providerEditProfile.unsavedChangesMessage"),
        [
          { text: t("providerDashboard.providerEditProfile.cancel"), style: "cancel" },
          { text: t("common.discard"), style: "destructive", onPress: () => router.back() },
        ],
      );
    } else {
      router.back();
    }
  }, [isDirty, router]);


  const pickImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("common.error"), "Permission to access photos is required.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets[0]) return;
      const uri = result.assets[0].uri;
      const compressed = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 400, height: 400 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
      );
      setUploadingAvatar(true);
      const base64 = await (async (): Promise<string> => {
        if (Platform.OS === "web" && compressed.uri.startsWith("blob:")) {
          const res = await fetch(compressed.uri);
          const blob = await res.blob();
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const dataUrl = reader.result as string;
              const base64Data = dataUrl.split(",")[1] || dataUrl;
              resolve(base64Data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
        const fs = await import("expo-file-system");
        return fs.default.readAsStringAsync(compressed.uri, { encoding: fs.EncodingType.Base64 });
      })();
      const { avatarUrl } = await uploadProviderAvatar(base64, "avatar.jpg", "image/jpeg");
      setAvatarUri(avatarUrl);
      await queryClient.invalidateQueries({ queryKey: ["providerProfile"] });
    } catch (e) {
      console.error("[ProviderEditProfile] Avatar upload failed:", e);
      Alert.alert(t("common.error"), t("errors.uploadProviderAvatarFailed"));
    } finally {
      setUploadingAvatar(false);
    }
  }, [queryClient]);

  const handleAddSpecialty = useCallback(() => {
    const trimmed = newSpecialtyText.trim();
    if (trimmed) {
      appendSpecialty(trimmed);
      setNewSpecialtyText("");
      setSpecialtyModalVisible(false);
    }
  }, [newSpecialtyText, appendSpecialty]);

  const onSubmit: SubmitHandler<FormValues> = useCallback(
    async (data) => {
      try {
        const payload: UpdateProviderProfilePayload = {
          displayName: data.displayName.trim(),
          categoryId: data.categoryId || null,
          bio: data.bio.trim(),
          phoneNumber: data.phoneNumber.trim() || undefined,
          yearsExperience: data.yearsExperience ?? undefined,
        };
        await updateProviderProfile(payload);
        await queryClient.invalidateQueries({ queryKey: ["providerProfile"] });
        setToastMessage(t("providerDashboard.providerEditProfile.saveSuccess"));
        setToastVisible(true);
        setTimeout(() => router.back(), 1500);
      } catch (e) {
        console.error("[ProviderEditProfile] Update failed:", e);
        Alert.alert(t("common.error"), t("errors.updateProviderProfileFailed"));
      }
    },
    [queryClient, router],
  );

  if (profileLoading && !profile) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Toast
        message={toastMessage}
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
        type="success"
        duration={2000}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Back header with Save */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton} accessibilityLabel={t("common.back")}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("providerDashboard.providerEditProfile.title")}</Text>
          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={!isDirty}
            style={[styles.saveButtonHeader, !isDirty && styles.saveButtonHeaderDisabled]}
          >
            <Text style={[styles.saveButtonText, !isDirty && styles.saveButtonTextDisabled]}>
              {t("providerDashboard.providerEditProfile.save")}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickImage} style={styles.avatarWrap} activeOpacity={0.8} disabled={uploadingAvatar}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} contentFit="cover" />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>
                    {getInitials(watch("displayName") || "")}
                  </Text>
                </View>
              )}
              {uploadingAvatar ? (
                <View style={styles.cameraOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              ) : (
                <View style={styles.cameraOverlay}>
                  <Text style={styles.cameraEmoji}>📷</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>{t("providerDashboard.providerEditProfile.displayName")}</Text>
              <Controller
                control={control}
                name="displayName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.displayName && styles.inputError]}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholderTextColor="rgba(255,255,255,0.3)"
                  />
                )}
              />
              {errors.displayName && (
                <Text style={styles.errorText}>{errors.displayName.message}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t("providerDashboard.providerEditProfile.category")}</Text>
              <Controller
                control={control}
                name="categoryId"
                render={({ field: { onChange } }) => (
                  <>
                    <TouchableOpacity
                      style={styles.input}
                      onPress={() => setCategoryModalVisible(true)}
                    >
                      <Text style={selectedParentLabel ? styles.inputText : styles.inputPlaceholder}>
                        {selectedParentLabel || t("providerDashboard.providerEditProfile.selectCategory")}
                      </Text>
                      <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.5)" />
                    </TouchableOpacity>
                    <Modal
                      visible={categoryModalVisible}
                      transparent
                      animationType="slide"
                      onRequestClose={() => setCategoryModalVisible(false)}
                    >
                      <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setCategoryModalVisible(false)}
                      >
                        <View style={[styles.modalContent, { paddingBottom: insets.bottom + 24 }]} onStartShouldSetResponder={() => true}>
                          <ScrollView>
                            {parentCategoryOptions.map((opt) => (
                              <TouchableOpacity
                                key={opt.id}
                                style={styles.modalOption}
                                onPress={() => {
                                  onChange(opt.id);
                                  setCategoryModalVisible(false);
                                }}
                              >
                                <Text style={styles.modalOptionText}>{opt.name}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      </TouchableOpacity>
                    </Modal>
                  </>
                )}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t("providerDashboard.providerEditProfile.subcategory")}</Text>
              <Controller
                control={control}
                name="categoryId"
                render={({ field: { onChange } }) => (
                  <>
                    <TouchableOpacity
                      style={[styles.input, !selectedParentId && styles.inputDisabled]}
                      onPress={() => selectedParentId && setSubcategoryModalVisible(true)}
                      disabled={!selectedParentId}
                    >
                      <Text style={selectedSubcategoryLabel ? styles.inputText : styles.inputPlaceholder}>
                        {selectedSubcategoryLabel || t("providerDashboard.providerEditProfile.selectSubcategory")}
                      </Text>
                      <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.5)" />
                    </TouchableOpacity>
                    <Modal
                      visible={subcategoryModalVisible}
                      transparent
                      animationType="slide"
                      onRequestClose={() => setSubcategoryModalVisible(false)}
                    >
                      <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setSubcategoryModalVisible(false)}
                      >
                        <View style={[styles.modalContent, { paddingBottom: insets.bottom + 24 }]} onStartShouldSetResponder={() => true}>
                          <ScrollView>
                            {subcategoryOptions.map((opt) => (
                              <TouchableOpacity
                                key={opt.id}
                                style={styles.modalOption}
                                onPress={() => {
                                  onChange(opt.id);
                                  setSubcategoryModalVisible(false);
                                }}
                              >
                                <Text style={styles.modalOptionText}>{opt.name}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      </TouchableOpacity>
                    </Modal>
                  </>
                )}
              />
            </View>

            {/* Especialidades */}
            <View style={styles.field}>
              <Text style={styles.label}>{t("providerDashboard.providerEditProfile.specialties")}</Text>
              <View style={styles.specialtiesRow}>
                {specialtyFields.map((field, index) => (
                  <View key={field.id} style={styles.specialtyPill}>
                    <Text style={styles.specialtyPillText}>{watch(`specialties.${index}`)}</Text>
                    <TouchableOpacity
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => removeSpecialty(index)}
                      style={styles.specialtyPillRemove}
                    >
                      <Text style={styles.specialtyPillRemoveText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.specialtyAddButton}
                  onPress={() => setSpecialtyModalVisible(true)}
                >
                  <Text style={styles.specialtyAddButtonText}>
                    + {t("providerDashboard.providerEditProfile.addSpecialty")}
                  </Text>
                </TouchableOpacity>
              </View>
              <Modal
                visible={specialtyModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => {
                  setSpecialtyModalVisible(false);
                  setNewSpecialtyText("");
                }}
              >
                <TouchableOpacity
                  style={styles.modalOverlay}
                  activeOpacity={1}
                  onPress={() => {
                    setSpecialtyModalVisible(false);
                    setNewSpecialtyText("");
                  }}
                >
                  <TouchableOpacity
                    style={styles.specialtyModalContent}
                    activeOpacity={1}
                    onPress={() => {}}
                  >
                    <Text style={styles.specialtyModalTitle}>
                      {t("providerDashboard.providerEditProfile.addSpecialtyModalTitle")}
                    </Text>
                    <TextInput
                      style={styles.specialtyModalInput}
                      value={newSpecialtyText}
                      onChangeText={setNewSpecialtyText}
                      placeholder="ej. Emergencias"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      autoFocus
                    />
                    <View style={styles.specialtyModalActions}>
                      <TouchableOpacity
                        style={styles.specialtyModalButton}
                        onPress={() => {
                          setSpecialtyModalVisible(false);
                          setNewSpecialtyText("");
                        }}
                      >
                        <Text style={styles.specialtyModalButtonText}>
                          {t("common.cancel")}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.specialtyModalButton, styles.specialtyModalButtonPrimary]}
                        onPress={handleAddSpecialty}
                      >
                        <Text style={[styles.specialtyModalButtonText, styles.specialtyModalButtonTextPrimary]}>
                          {t("common.save")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                </TouchableOpacity>
              </Modal>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t("providerDashboard.providerEditProfile.bio")}</Text>
              <Controller
                control={control}
                name="bio"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, styles.textArea, errors.bio && styles.inputError]}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    multiline
                    numberOfLines={4}
                    maxLength={BIO_MAX_LENGTH}
                  />
                )}
              />
              <Text style={styles.charCount}>
                {t("providerDashboard.providerEditProfile.bioCharCount", {
                  current: bioLength,
                  max: BIO_MAX_LENGTH,
                })}
              </Text>
              {errors.bio && <Text style={styles.errorText}>{errors.bio.message}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t("providerDashboard.providerEditProfile.contactPhone")}</Text>
              <Controller
                control={control}
                name="phoneNumber"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.phoneNumber && styles.inputError]}
                    onBlur={onBlur}
                    onChangeText={(text) => onChange(normalizePhoneInput(text))}
                    value={value}
                    placeholder="+52 55 1234 5678"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="phone-pad"
                    maxLength={15}
                  />
                )}
              />
              {errors.phoneNumber && (
                <Text style={styles.errorText}>{errors.phoneNumber.message}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t("providerDashboard.providerEditProfile.yearsExperience")}</Text>
              <Controller
                control={control}
                name="yearsExperience"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.yearsExperience && styles.inputError]}
                    onBlur={onBlur}
                    onChangeText={(v) => onChange(v === "" ? null : v)}
                    value={value == null ? "" : String(value)}
                    placeholder="10"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="number-pad"
                  />
                )}
              />
              {errors.yearsExperience && (
                <Text style={styles.errorText}>{errors.yearsExperience.message}</Text>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  saveButtonHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  saveButtonHeaderDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: "#4ADE80",
    fontSize: 14,
    fontWeight: "500",
  },
  saveButtonTextDisabled: {
    color: "rgba(255,255,255,0.4)",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 16,
    backgroundColor: CARD_BG,
    borderWidth: 2,
    borderColor: INPUT_BORDER,
    overflow: "hidden",
    position: "relative",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CARD_BG,
  },
  avatarInitials: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 32,
    fontWeight: "600",
  },
  cameraOverlay: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#6366F1",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraEmoji: {
    fontSize: 14,
  },
  form: {
    gap: 16,
  },
  field: {
    marginBottom: 4,
  },
  label: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  input: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 14,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inputText: {
    color: "#fff",
    fontSize: 14,
    flex: 1,
  },
  inputPlaceholder: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 14,
    flex: 1,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  inputError: {
    borderColor: "#EF4444",
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  charCount: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 12,
    textAlign: "right",
    marginTop: 4,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "60%",
  },
  modalOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  modalOptionText: {
    color: "#fff",
    fontSize: 16,
  },
  specialtiesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  specialtyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 6,
    borderRadius: 999,
    backgroundColor: "rgba(139, 92, 246, 0.2)",
  },
  specialtyPillText: {
    color: "#C4B5FD",
    fontSize: 12,
    fontWeight: "500",
  },
  specialtyPillRemove: {
    padding: 2,
  },
  specialtyPillRemoveText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 16,
    fontWeight: "600",
  },
  specialtyAddButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  specialtyAddButtonText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    fontWeight: "500",
  },
  specialtyModalContent: {
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 16,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
  },
  specialtyModalTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  specialtyModalInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 14,
    marginBottom: 16,
  },
  specialtyModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  specialtyModalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  specialtyModalButtonPrimary: {
    backgroundColor: "#8B5CF6",
  },
  specialtyModalButtonText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "500",
  },
  specialtyModalButtonTextPrimary: {
    color: "#fff",
  },
});
