import { useAuth } from "@/contexts/AuthContext";
import { t } from "@/i18n";
import { ApiError, createQuote, createQuoteFromConversation, fetchOrderDetail, updateQuote, CreateQuotePayload, QuoteLineItem, ClientAddress } from "@/services/orders";
import { fetchConversationClientAddress } from "@/services/conversations";
import { getProviderServices, ProviderService } from "@/services/providerServices";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BookingDateTimePicker } from "@/components/BookingDateTimePicker";
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

const COMMISSION_RATE = 0.15;

const VALIDITY_OPTIONS = [
  { label: "validity24h", hours: 24 },
  { label: "validity48h", hours: 48 },
  { label: "validity7d", hours: 168 },
  { label: "validity15d", hours: 360 },
] as const;

interface ServiceItem {
  id: string;
  name: string;
  price: number;
  checked: boolean;
  isCustom?: boolean;
}

const colors = {
  bg: "#12121A",
  card: "#1E1B2E",
  border: "rgba(61, 51, 112, 0.3)",
  borderLight: "rgba(61, 51, 112, 0.2)",
  purpleAccent: "rgba(139, 92, 246, 0.3)",
  purpleBg: "rgba(139, 92, 246, 0.1)",
  purpleSolid: "#8B5CF6",
  gradientStart: "#6366F1",
  gradientEnd: "#8B5CF6",
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.6)",
  textMuted: "rgba(255,255,255,0.4)",
  textMuted30: "rgba(255,255,255,0.3)",
  inputBg: "rgba(255,255,255,0.05)",
  chipBg: "rgba(255,255,255,0.05)",
  avatarBg: "rgba(61, 51, 112, 0.5)",
  green: "#22C55E",
};

export default function CreateQuoteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    orderId,
    clientName,
    serviceName,
    conversationId,
    edit: editParam,
  } = useLocalSearchParams<{
    orderId?: string;
    clientName: string;
    serviceName?: string;
    conversationId: string;
    edit?: string;
  }>();

  const isEditMode = Boolean(orderId && editParam === "1");

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingQuote, setLoadingQuote] = useState(isEditMode);
  const [estimatedTime, setEstimatedTime] = useState("2");
  const [timeUnit, setTimeUnit] = useState<"hours" | "days">("hours");
  const [selectedValidity, setSelectedValidity] = useState(1);
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [serviceDate, setServiceDate] = useState<Date | null>(null);
  const [clientAddress, setClientAddress] = useState<ClientAddress | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(true);

  const formatAddress = useCallback((addr: ClientAddress): string => {
    const parts = [addr.name, addr.address_line1, addr.address_line2, addr.city, addr.state].filter(Boolean);
    return parts.join(", ");
  }, []);

  useEffect(() => {
    loadProviderServices();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingAddress(true);
        if (orderId) {
          const data = await fetchOrderDetail(orderId);
          if (!cancelled && data.clientAddress) {
            setClientAddress(data.clientAddress);
          }
          // If order already has an active quote, redirect to view it (avoids 409 on submit)
          if (!cancelled && !isEditMode && data.quote && data.order?.quote_id) {
            const status = data.quote.status;
            if (status === "draft" || status === "sent" || status === "pending") {
              if (conversationId) {
                router.replace(`/chat/${conversationId}`);
              } else {
                router.replace(`/booking/quote/${orderId}`);
              }
              return;
            }
          }
        } else if (conversationId) {
          const addr = await fetchConversationClientAddress(conversationId);
          if (!cancelled && addr) {
            setClientAddress(addr);
          }
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoadingAddress(false);
      }
    })();
    return () => { cancelled = true; };
  }, [orderId, conversationId, isEditMode, router]);

  useEffect(() => {
    if (!isEditMode || !orderId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingQuote(true);
        const data = await fetchOrderDetail(orderId);
        const q = data.quote;
        const order = data.order;
        if (cancelled || !q) return;
        const rawItems = Array.isArray(q.line_items)
          ? q.line_items
          : typeof q.line_items === "string"
            ? (() => {
                try {
                  const parsed = JSON.parse(q.line_items) as unknown;
                  return Array.isArray(parsed) ? parsed : [];
                } catch {
                  return [];
                }
              })()
            : [];
        const items: ServiceItem[] = rawItems.map(
          (item: { description?: string; amount?: number }, i: number) => ({
            id: `custom_${i}_${Date.now()}`,
            name: item.description ?? "",
            price: Number(item.amount ?? 0),
            checked: true,
            isCustom: true,
          })
        );
        setServices((prev) => (items.length > 0 ? items : prev));
        setNotes(q.notes?.trim() ?? "");
        setEstimatedTime(String(q.estimated_time ?? 2));
        const rawUnit = (q.estimated_time_unit ?? "hours") as string;
        setTimeUnit(rawUnit === "days" ? "days" : "hours");
        if (q.scheduled_at) setServiceDate(new Date(q.scheduled_at));
      } catch {
        if (!cancelled) setLoadingQuote(false);
      } finally {
        if (!cancelled) setLoadingQuote(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEditMode, orderId]);

  const loadProviderServices = useCallback(async () => {
    try {
      setLoadingServices(true);
      const result = await getProviderServices();
      const mapped: ServiceItem[] = result.services
        .filter((s) => s.isActive)
        .map((s) => ({
          id: s.id,
          name: s.name,
          price: s.price,
          checked: false,
        }));
      setServices(mapped);
    } catch {
      setServices([]);
    } finally {
      setLoadingServices(false);
    }
  }, []);

  const toggleService = useCallback((id: string) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, checked: !s.checked } : s))
    );
  }, []);

  const updatePrice = useCallback((id: string, price: string) => {
    const numPrice = parseFloat(price) || 0;
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, price: numPrice } : s))
    );
  }, []);

  const handleAddCustomItem = useCallback(() => {
    const name = newItemName.trim();
    const price = parseFloat(newItemPrice) || 0;
    if (!name || price <= 0) return;

    const newItem: ServiceItem = {
      id: `custom_${Date.now()}`,
      name,
      price,
      checked: true,
      isCustom: true,
    };
    setServices((prev) => [...prev, newItem]);
    setNewItemName("");
    setNewItemPrice("");
    setShowAddItemModal(false);
  }, [newItemName, newItemPrice]);

  const checkedServices = useMemo(
    () => services.filter((s) => s.checked),
    [services]
  );

  const subtotal = useMemo(
    () => checkedServices.reduce((sum, s) => sum + s.price, 0),
    [checkedServices]
  );

  const commission = useMemo(
    () => subtotal * COMMISSION_RATE,
    [subtotal]
  );

  const providerReceives = useMemo(
    () => subtotal - commission,
    [subtotal, commission]
  );

  const canSendQuote = useMemo(() => {
    if (checkedServices.length === 0) return false;
    const allHavePrice = checkedServices.every((s) => s.price > 0);
    if (!allHavePrice) return false;
    if (!serviceDate) return false;
    if (!clientAddress) return false;
    const estimated = parseInt(estimatedTime, 10) || 0;
    if (estimated <= 0) return false;
    return true;
  }, [checkedServices, serviceDate, clientAddress, estimatedTime]);

  const formatCurrency = useCallback((amount: number) => {
    return amount.toFixed(2);
  }, []);

  const getValidUntilDate = useCallback(() => {
    const hoursToAdd = VALIDITY_OPTIONS[selectedValidity].hours;
    const date = new Date();
    date.setHours(date.getHours() + hoursToAdd);
    return date.toISOString();
  }, [selectedValidity]);

  const handleSend = useCallback(
    async (isDraft: boolean) => {
      if (orderId) {
        // existing order: use createQuote
      } else if (!conversationId) {
        Alert.alert(t("common.error"), t("createQuote.noOrder"));
        return;
      }
      // else: no order but conversationId -> createQuoteFromConversation
      if (checkedServices.length === 0) {
        Alert.alert(t("common.error"), t("createQuote.servicesIncluded"));
        return;
      }

      setSending(true);
      try {
        const lineItems: QuoteLineItem[] = checkedServices.map((s) => ({
          description: s.name,
          amount: s.price,
        }));

        const estimatedNum = parseInt(estimatedTime, 10);
        const estimatedTimeValue = Number.isFinite(estimatedNum) && estimatedNum >= 0 ? estimatedNum : 0;
        const unit = timeUnit === "days" ? "days" : "hours";

        const payload: CreateQuotePayload = {
          line_items: lineItems,
          subtotal,
          tax: 0,
          total: subtotal,
          valid_until: getValidUntilDate(),
          estimated_time: estimatedTimeValue,
          estimated_time_unit: unit,
          notes: notes.trim() || undefined,
          commission_rate: COMMISSION_RATE,
          status: isDraft ? "draft" : "sent",
          scheduled_at: serviceDate?.toISOString(),
          address: clientAddress ? formatAddress(clientAddress) : undefined,
        };

        if (isEditMode && orderId) {
          payload.status = isDraft ? "draft" : "sent";
          await updateQuote(orderId, payload);
        } else if (orderId) {
          await createQuote(orderId, payload);
        } else {
          await createQuoteFromConversation(conversationId!, payload);
        }

        if (!isDraft && conversationId) {
          router.replace(`/chat/${conversationId}`);
        } else {
          Alert.alert(
            t("common.success"),
            isDraft ? t("createQuote.draftSaved") : t("createQuote.quoteSent"),
            [
              {
                text: t("common.ok"),
                onPress: () => {
                  if (isEditMode && orderId) {
                    router.replace(`/booking/quote/${orderId}`);
                  } else if (conversationId) {
                    router.replace(`/chat/${conversationId}`);
                  } else {
                    router.back();
                  }
                },
              },
            ]
          );
        }
      } catch (err: unknown) {
        const apiErr = err as { status?: number; data?: unknown; message?: string };
        const apiData = apiErr.data;
        const errStatus = typeof apiErr.status === "number" ? apiErr.status : 0;
        const errorCode = apiData && typeof apiData === "object" ? (apiData as { code?: string }).code : undefined;
        const existingOrderId = apiData && typeof apiData === "object" ? (apiData as { orderId?: string }).orderId : undefined;

        const isQuoteAlreadyActive = errorCode === "quote_already_active" || (errStatus === 409 && errorCode !== "active_order_exists");
        const isActiveOrderExists = errorCode === "active_order_exists";

        if (isActiveOrderExists) {
          Alert.alert(
            t("booking.activeOrderTitle"),
            t("booking.activeOrderExists"),
            [
              { text: t("common.cancel"), style: "cancel" },
              ...(existingOrderId
                ? [{
                    text: t("booking.viewExistingOrder"),
                    onPress: () => router.push(`/orders/${existingOrderId}`),
                  }]
                : []),
            ]
          );
        } else if (isQuoteAlreadyActive) {
          const buttons: Array<{ text: string; onPress?: () => void }> = [
            { text: t("common.cancel") },
            ...(orderId
              ? [{ text: t("chat.viewQuote"), onPress: () => router.replace(`/booking/quote/${orderId}`) }]
              : []),
            ...(conversationId
              ? [{ text: t("quote.chatBack"), onPress: () => router.replace(`/chat/${conversationId}`) }]
              : []),
          ];
          Alert.alert(
            t("createQuote.quoteExistsTitle"),
            t("createQuote.quoteExistsMessage"),
            buttons
          );
        } else {
          const message = typeof apiErr.message === "string" && apiErr.message
            ? apiErr.message
            : t("createQuote.sendFailed");
          Alert.alert(t("common.error"), message);
        }
      } finally {
        setSending(false);
      }
    },
    [
      orderId,
      conversationId,
      isEditMode,
      checkedServices,
      subtotal,
      estimatedTime,
      timeUnit,
      notes,
      selectedValidity,
      getValidUntilDate,
      serviceDate,
      clientAddress,
      formatAddress,
      router,
    ]
  );

  if (loadingServices || loadingQuote) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.purpleSolid} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerBtn}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textMuted} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditMode ? t("createQuote.editTitle") : t("createQuote.title")}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 60 : 0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Client Info Card */}
          <View style={styles.clientCard}>
            <View style={styles.clientAvatar}>
              <Text style={styles.clientAvatarText}>👩</Text>
            </View>
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>
                {clientName || t("chat.title")}
              </Text>
              <Text style={styles.clientRequest}>
                {t("createQuote.request", {
                  service: serviceName || "—",
                })}
              </Text>
            </View>
          </View>

          {/* Services Section */}
          <Text style={styles.sectionLabel}>
            {t("createQuote.servicesIncluded")}
          </Text>
          {services.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={[
                styles.serviceRow,
                service.checked && styles.serviceRowActive,
              ]}
              onPress={() => toggleService(service.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkbox,
                  service.checked && styles.checkboxActive,
                ]}
              >
                {service.checked && (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.serviceName} numberOfLines={1}>
                {service.name}
              </Text>
              <View style={styles.priceInputWrap}>
                <Text style={styles.currencySign}>$</Text>
                <TextInput
                  style={styles.priceInput}
                  value={String(service.price)}
                  onChangeText={(val) => updatePrice(service.id, val)}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
              </View>
            </TouchableOpacity>
          ))}

          {/* Add custom item */}
          <TouchableOpacity
            style={styles.addItemBtn}
            onPress={() => setShowAddItemModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.addItemText}>{t("createQuote.addItem")}</Text>
          </TouchableOpacity>

          {/* Service date & time - same calendar as client booking */}
          <Text style={styles.sectionLabel}>
            {t("createQuote.serviceDate")}
          </Text>
          <Text style={styles.serviceDateHint}>
            {t("createQuote.serviceDateHint")}
          </Text>
          {user?.id ? (
            <BookingDateTimePicker
              supplierId={user.id}
              value={serviceDate}
              onChange={setServiceDate}
              showProviderCard={false}
            />
          ) : (
            <View style={styles.addressDisplay}>
              <ActivityIndicator size="small" color={colors.purpleSolid} />
              <Text style={styles.addressEmpty}>{t("createQuote.serviceDatePlaceholder")}</Text>
            </View>
          )}

          {/* Service address (from client's saved address) */}
          <Text style={styles.sectionLabel}>
            {t("createQuote.serviceAddress")}
          </Text>
          <View style={styles.addressDisplay}>
            <Ionicons name="location-outline" size={18} color={colors.purpleSolid} style={styles.addressIcon} />
            {loadingAddress ? (
              <ActivityIndicator size="small" color={colors.purpleSolid} />
            ) : clientAddress ? (
              <View style={styles.addressTextWrap}>
                <Text style={styles.addressName}>{clientAddress.name}</Text>
                <Text style={styles.addressLine}>{formatAddress(clientAddress)}</Text>
              </View>
            ) : (
              <Text style={styles.addressEmpty}>{t("createQuote.noClientAddress")}</Text>
            )}
          </View>

          {/* Estimated Time */}
          <Text style={styles.sectionLabel}>
            {t("createQuote.estimatedTime")}
          </Text>
          <View style={styles.timeRow}>
            <Text style={styles.timeEmoji}>⏱️</Text>
            <View style={styles.timeInputs}>
              <TextInput
                style={styles.timeNumberInput}
                value={estimatedTime}
                onChangeText={setEstimatedTime}
                keyboardType="numeric"
                maxLength={3}
              />
              <TouchableOpacity
                style={[
                  styles.timeUnitBtn,
                  timeUnit === "hours" && styles.timeUnitBtnActive,
                ]}
                onPress={() => setTimeUnit("hours")}
              >
                <Text
                  style={[
                    styles.timeUnitText,
                    timeUnit === "hours" && styles.timeUnitTextActive,
                  ]}
                >
                  {t("createQuote.hours")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.timeUnitBtn,
                  timeUnit === "days" && styles.timeUnitBtnActive,
                ]}
                onPress={() => setTimeUnit("days")}
              >
                <Text
                  style={[
                    styles.timeUnitText,
                    timeUnit === "days" && styles.timeUnitTextActive,
                  ]}
                >
                  {t("createQuote.days")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Validity */}
          <Text style={styles.sectionLabel}>
            {t("createQuote.quoteValidity")}
          </Text>
          <View style={styles.validityRow}>
            {VALIDITY_OPTIONS.map((opt, idx) => (
              <TouchableOpacity
                key={opt.label}
                style={[
                  styles.validityChip,
                  selectedValidity === idx && styles.validityChipActive,
                ]}
                onPress={() => setSelectedValidity(idx)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.validityText,
                    selectedValidity === idx && styles.validityTextActive,
                  ]}
                >
                  {t(`createQuote.${opt.label}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Notes */}
          <Text style={styles.sectionLabel}>
            {t("createQuote.additionalNotes")}
          </Text>
          <TextInput
            style={styles.notesInput}
            placeholder={t("createQuote.notesPlaceholder")}
            placeholderTextColor={colors.textMuted30}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
            maxLength={500}
          />

          {/* Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {t("createQuote.subtotal")}
              </Text>
              <Text style={styles.summaryValue}>
                ${formatCurrency(subtotal)}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryRowBorder]}>
              <Text style={styles.summaryLabel}>
                {t("createQuote.platformCommission", {
                  percent: String(COMMISSION_RATE * 100),
                })}
              </Text>
              <Text style={styles.summaryCommission}>
                -${formatCurrency(commission)}
              </Text>
            </View>
            <View style={styles.summaryRowTotal}>
              <Text style={styles.summaryTotalLabel}>
                {t("createQuote.totalToCharge")}
              </Text>
              <Text style={styles.summaryTotalValue}>
                ${formatCurrency(subtotal)}
              </Text>
            </View>
            <Text style={styles.summaryReceive}>
              {t("createQuote.youWillReceive", {
                amount: formatCurrency(providerReceives),
              })}
            </Text>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={styles.draftBtn}
            onPress={() => handleSend(true)}
            disabled={sending}
            activeOpacity={0.7}
          >
            <Text style={styles.draftBtnText}>
              {t("createQuote.saveDraft")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (sending || !canSendQuote) && styles.sendBtnDisabled,
            ]}
            onPress={() => handleSend(false)}
            disabled={sending || !canSendQuote}
            activeOpacity={0.7}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.sendBtnText}>
                {t("createQuote.sendQuote")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Add Item Modal */}
      <Modal
        visible={showAddItemModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddItemModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {t("createQuote.addItemTitle")}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder={t("createQuote.itemName")}
              placeholderTextColor={colors.textMuted}
              value={newItemName}
              onChangeText={setNewItemName}
              autoFocus
            />
            <TextInput
              style={styles.modalInput}
              placeholder={t("createQuote.itemPrice")}
              placeholderTextColor={colors.textMuted}
              value={newItemPrice}
              onChangeText={setNewItemPrice}
              keyboardType="numeric"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowAddItemModal(false);
                  setNewItemName("");
                  setNewItemPrice("");
                }}
              >
                <Text style={styles.modalCancelText}>
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalAddBtn}
                onPress={handleAddCustomItem}
              >
                <Text style={styles.modalAddText}>
                  {t("createQuote.addItemButton")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: { flex: 1 },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.chipBg,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  clientCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  clientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.avatarBg,
    justifyContent: "center",
    alignItems: "center",
  },
  clientAvatarText: { fontSize: 20 },
  clientInfo: { flex: 1 },
  clientName: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  clientRequest: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 8,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 8,
  },
  serviceRowActive: {
    borderColor: colors.purpleAccent,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: colors.inputBg,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: {
    backgroundColor: colors.purpleSolid,
  },
  serviceName: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  priceInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  currencySign: {
    fontSize: 14,
    color: colors.textMuted,
  },
  priceInput: {
    width: 56,
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: "right",
    padding: 0,
  },
  addItemBtn: {
    width: "100%",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.purpleAccent,
    backgroundColor: colors.purpleBg,
    alignItems: "center",
    marginBottom: 16,
  },
  addItemText: {
    fontSize: 14,
    color: colors.purpleSolid,
  },
  serviceDateHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 8,
  },
  addressDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 16,
    minHeight: 48,
  },
  addressIcon: {
    marginTop: 2,
  },
  addressTextWrap: {
    flex: 1,
  },
  addressName: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  addressLine: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  addressEmpty: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 16,
  },
  timeEmoji: { fontSize: 18 },
  timeInputs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeNumberInput: {
    width: 48,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.inputBg,
    color: colors.textPrimary,
    fontSize: 14,
    textAlign: "center",
  },
  timeUnitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.inputBg,
  },
  timeUnitBtnActive: {
    backgroundColor: colors.purpleSolid,
  },
  timeUnitText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  timeUnitTextActive: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  validityRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  validityChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.chipBg,
    alignItems: "center",
  },
  validityChipActive: {
    backgroundColor: colors.purpleSolid,
  },
  validityText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  validityTextActive: {
    color: colors.textPrimary,
  },
  notesInput: {
    width: "100%",
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    color: colors.textPrimary,
    fontSize: 14,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.purpleBg,
    borderWidth: 1,
    borderColor: colors.purpleAccent,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryRowBorder: {
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  summaryCommission: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryRowTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.green,
  },
  summaryReceive: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  draftBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.chipBg,
    alignItems: "center",
  },
  draftBtnText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  sendBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.purpleSolid,
    alignItems: "center",
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 16,
  },
  modalInput: {
    width: "100%",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.inputBg,
    color: colors.textPrimary,
    fontSize: 14,
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.chipBg,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  modalAddBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.purpleSolid,
    alignItems: "center",
  },
  modalAddText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
});
