import { Toast } from "@/components/Toast";
import { useThemeColors } from "@/hooks/useThemeColors";
import { t } from "@/i18n";
import { ApiError } from "@/services/auth";
import {
    createProviderService,
    getProviderService,
    updateProviderService,
} from "@/services/providerServices";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import {
    ActivityIndicator,
    Dimensions,
    Keyboard,
    KeyboardAvoidingView,
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

const QUERY_KEY = ["providerServices"] as const;

const schema = z.object({
  name: z.string().min(1, "Required").max(255),
  description: z.string().max(1000).optional(),
  price: z.string().min(1, "Required").refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, "Invalid price"),
  durationMinutes: z.string().optional().transform((v) => {
    if (!v?.trim()) return undefined;
    const n = parseInt(v, 10);
    return Number.isNaN(n) || n <= 0 ? undefined : n;
  }),
});

type FormValues = z.infer<typeof schema>;

/** Header (outside KAV) + small fudge for nav / status bar on iOS. */
const IOS_KEYBOARD_OFFSET_EXTRA = 56;

/** Gap between the bottom of the focused input and the top of the keyboard (px). */
const KEYBOARD_GAP_PX = 14;

export default function ProviderServiceAddScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const scrollRef = useRef<ScrollView>(null);
  const durationInputRef = useRef<TextInput>(null);
  const scrollYRef = useRef(0);
  const keyboardHeightRef = useRef(0);
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ id?: string }>();
  const serviceId = params.id;
  const isEdit = Boolean(serviceId);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const { data: serviceData, isLoading: serviceLoading } = useQuery({
    queryKey: ["providerService", serviceId],
    queryFn: () => getProviderService(serviceId!),
    enabled: isEdit && Boolean(serviceId),
    staleTime: 0,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      durationMinutes: "",
    },
  });

  useEffect(() => {
    if (serviceData?.service) {
      const s = serviceData.service;
      reset({
        name: s.name,
        description: s.description ?? "",
        price: String(s.price),
        durationMinutes: s.durationMinutes != null ? String(s.durationMinutes) : "",
      });
    }
  }, [serviceData, reset]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillChangeFrame" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (e) => {
      keyboardHeightRef.current = e.endCoordinates.height;
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      keyboardHeightRef.current = 0;
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  }, []);

  const onSubmit: SubmitHandler<FormValues> = useCallback(
    async (values) => {
      try {
        const price = Number(values.price);
        const durationMinutes = values.durationMinutes
          ? Number(values.durationMinutes)
          : undefined;
        if (isEdit && serviceId) {
          await updateProviderService(serviceId, {
            name: values.name.trim(),
            description: values.description?.trim() || undefined,
            price,
            durationMinutes: durationMinutes ?? undefined,
          });
          showToast(t("providerDashboard.providerServices.updateSuccess"));
        } else {
          await createProviderService({
            name: values.name.trim(),
            description: values.description?.trim() || undefined,
            price,
            durationMinutes: durationMinutes ?? undefined,
          });
          showToast(t("providerDashboard.providerServices.createSuccess"));
        }
        queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        setTimeout(() => router.back(), 800);
      } catch (err) {
        const message =
          err instanceof ApiError && err.message
            ? err.message
            : isEdit
              ? t("providerDashboard.providerServices.errors.updateFailed")
              : t("providerDashboard.providerServices.errors.createFailed");
        showToast(message, "error");
      }
    },
    [isEdit, serviceId, queryClient, router, showToast]
  );

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  /** Scroll only enough so the duration input sits just above the keyboard (no scrollToEnd). */
  const nudgeDurationAboveKeyboard = useCallback(() => {
    const attempt = () => {
      const kh = keyboardHeightRef.current;
      if (kh <= 0) return;
      const windowH = Dimensions.get("window").height;
      const keyboardTop = windowH - kh;
      durationInputRef.current?.measureInWindow((_x, inputY, _w, inputH) => {
        const inputBottom = inputY + inputH;
        const targetBottom = keyboardTop - KEYBOARD_GAP_PX;
        const overlap = inputBottom - targetBottom;
        if (overlap <= 0) return;
        const nextY = Math.max(0, scrollYRef.current + overlap);
        scrollYRef.current = nextY;
        scrollRef.current?.scrollTo({ y: nextY, animated: true });
      });
    };
    requestAnimationFrame(attempt);
    setTimeout(attempt, 80);
    setTimeout(attempt, 220);
  }, []);

  if (isEdit && serviceLoading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.surfaceSecondary }]}
          onPress={handleBack}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color={colors.icon} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {isEdit ? t("providerDashboard.providerServices.edit") : t("providerDashboard.providerServices.addNew")}
        </Text>
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          <Text style={styles.saveBtnText}>
            {t("providerDashboard.providerServices.save")}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={
          Platform.OS === "ios" ? insets.top + IOS_KEYBOARD_OFFSET_EXTRA : insets.top
        }
      >
        <ScrollView
          ref={scrollRef}
          style={[styles.scroll, { backgroundColor: colors.background }]}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScroll={(e) => {
            scrollYRef.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
        >
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t("providerDashboard.providerServices.formName")}
            </Text>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary },
                    errors.name && styles.inputError,
                  ]}
                  placeholder={t("providerDashboard.providerServices.formName")}
                  placeholderTextColor={colors.textTertiary}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="words"
                />
              )}
            />
            {errors.name && (
              <Text style={styles.errorText}>{errors.name.message}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t("providerDashboard.providerServices.formDescription")}
            </Text>
            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary },
                  ]}
                  placeholder={t("providerDashboard.providerServices.formDescription")}
                  placeholderTextColor={colors.textTertiary}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  multiline
                  numberOfLines={3}
                />
              )}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t("providerDashboard.providerServices.formPrice")}
            </Text>
            <Controller
              control={control}
              name="price"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary },
                    errors.price && styles.inputError,
                  ]}
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="decimal-pad"
                />
              )}
            />
            {errors.price && (
              <Text style={styles.errorText}>{errors.price.message}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t("providerDashboard.providerServices.formDuration")}
            </Text>
            <Controller
              control={control}
              name="durationMinutes"
              render={({ field: { onChange, onBlur, value, ref: fieldRef } }) => (
                <TextInput
                  ref={(node) => {
                    durationInputRef.current = node;
                    fieldRef(node);
                  }}
                  style={[
                    styles.input,
                    { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary },
                  ]}
                  placeholder="30"
                  placeholderTextColor={colors.textTertiary}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  onFocus={nudgeDurationAboveKeyboard}
                  keyboardType="number-pad"
                />
              )}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: "center", alignItems: "center" },
  keyboard: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "700" },
  saveBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  saveBtnText: { fontSize: 14, fontWeight: "500", color: "#22C55E" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24 },
  field: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: "500", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  inputError: { borderColor: "rgba(239, 68, 68, 0.5)" },
  textArea: { minHeight: 88, textAlignVertical: "top" },
  errorText: { fontSize: 12, color: "#F87171", marginTop: 4 },
});
