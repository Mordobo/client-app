import { CLIENT_TIERS } from "@/constants/tiers";
import { useAuth } from "@/contexts/AuthContext";
import { getLocale, t } from "@/i18n";
import { ProviderAvatar } from "@/components/ProviderAvatar";
import { Address, getAddresses } from "@/services/addresses";
import { createOrder, ApiError as OrderApiError } from "@/services/orders";
import { ApiError, fetchSupplierProfile, fetchSupplierServices, Supplier, SupplierService } from "@/services/suppliers";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Theme colors matching the JSX design
const colors = {
  bg: "#1a1a2e",
  bgCard: "#252542",
  bgInput: "#2d2d4a",
  primary: "#3b82f6",
  secondary: "#10b981",
  accent: "#f59e0b",
  danger: "#ef4444",
  purple: "#8b5cf6",
  pink: "#ec4899",
  textSecondary: "#9ca3af",
  border: "#374151",
  white: "#ffffff",
};

export default function BookingSummaryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { supplierId, serviceId, scheduledAt, duration, addressId } = useLocalSearchParams<{
    supplierId: string;
    serviceId: string;
    scheduledAt: string;
    duration: string;
    addressId: string;
  }>();
  const insets = useSafeAreaInsets();
  const tierConfig = CLIENT_TIERS[user?.tier ?? "bronze"];

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [service, setService] = useState<SupplierService | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [creatingOrder, setCreatingOrder] = useState(false);

  useEffect(() => {
    if (supplierId && serviceId && scheduledAt && duration && addressId) {
      loadData();
    } else {
      setError(t("booking.missingBookingData"));
      setLoading(false);
    }
  }, [supplierId, serviceId, scheduledAt, duration, addressId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load supplier, service, and address in parallel
      const [supplierData, servicesData, addressesData] = await Promise.all([fetchSupplierProfile(supplierId), fetchSupplierServices(supplierId), getAddresses()]);

      setSupplier(supplierData);
      const selectedService = servicesData.find((s) => s.id === serviceId);
      setService(selectedService || null);

      const selectedAddress = addressesData.find((a) => a.id === addressId);
      setAddress(selectedAddress || null);

      if (!selectedService) {
        setError(t("booking.serviceNotFound"));
      }
      if (!selectedAddress) {
        setError(t("booking.addressNotFound"));
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t("errors.requestFailed"));
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const locale = getLocale() === "es" ? "es-ES" : "en-US";
      return date.toLocaleDateString(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const locale = getLocale() === "es" ? "es-ES" : "en-US";
      return date.toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return dateString;
    }
  };

  const formatAddress = (addr: Address): string => {
    const parts = [addr.name, addr.address_line1, addr.address_line2, addr.city, addr.state].filter(Boolean);
    return parts.join(", ");
  };

  // Calculate pricing
  const calculatePricing = () => {
    if (!service || !duration) {
      return {
        serviceCost: 0,
        travelFee: 5.0,
        platformFee: 5.0,
        discount: 0,
        total: 0,
      };
    }

    const durationHours = parseFloat(duration) || 2;
    const hourlyRate = service.price || 60;
    const serviceCost = hourlyRate * durationHours;
    const serviceFee = tierConfig.platformFee;
    const subtotal = serviceCost + serviceFee;

    const discountPercent = appliedDiscount > 0 ? appliedDiscount : 0;
    const discount = subtotal * (discountPercent / 100);
    const total = subtotal - discount;

    return {
      serviceCost,
      serviceFee,
      discount,
      total,
    };
  };

  const pricing = calculatePricing();

  const handleProceedToPayment = async () => {
    if (!supplierId || !serviceId || !scheduledAt || !duration || !addressId || !address || !service) {
      Alert.alert(t("common.error"), t("booking.missingBookingData"));
      return;
    }

    try {
      setCreatingOrder(true);

      // Format address string
      const addressString = formatAddress(address);

      // Ensure scheduled_at is in ISO format
      let formattedScheduledAt = scheduledAt;
      try {
        // If it's not already ISO format, convert it
        const date = new Date(scheduledAt);
        if (!isNaN(date.getTime())) {
          formattedScheduledAt = date.toISOString();
        }
      } catch (e) {
        console.warn("[BookingSummary] Could not format scheduled_at:", e);
      }

      // Prepare order data
      const orderData: {
        service_id: string;
        category_id?: string;
        supplier_id?: string;
        scheduled_at?: string;
        address?: string;
        notes?: string;
      } = {
        service_id: serviceId,
        supplier_id: supplierId,
        scheduled_at: formattedScheduledAt,
        address: addressString,
      };

      // Add optional fields only if they have values
      if (service.category_id) {
        orderData.category_id = service.category_id;
      }
      if (additionalNotes.trim()) {
        orderData.notes = additionalNotes.trim();
      }

      console.log("[BookingSummary] Creating order with data:", {
        ...orderData,
        // Don't log full address for privacy
        address: addressString ? `${addressString.substring(0, 20)}...` : undefined,
      });

      // Create order first with all required fields
      const order = await createOrder(orderData);

      console.log("[BookingSummary] Order created successfully:", order.id);

      // Navigate to payment screen with the created order ID
      router.push({
        pathname: "/booking/payment/[orderId]",
        params: {
          orderId: order.id,
          totalAmount: pricing.total.toString(),
        },
      });
    } catch (err: unknown) {
      const apiErr = err as { status?: number; data?: unknown; message?: string };
      const apiData = apiErr.data ?? (apiErr as { originalError?: unknown }).originalError;
      const errStatus = typeof apiErr.status === "number" ? apiErr.status : 0;
      const errorCode = apiData && typeof apiData === "object" ? (apiData as { code?: string }).code : undefined;
      const existingOrderId = apiData && typeof apiData === "object" ? (apiData as { orderId?: string }).orderId : undefined;

      // Handle duplicate active order (409)
      if (errorCode === "active_order_exists" || errStatus === 409) {
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
        return;
      }

      console.error("[BookingSummary] Failed to create order:", err);

      let errorMessage = t("booking.createBookingFailed");
      const rawMessage = typeof apiErr.message === "string" ? apiErr.message : "";

      if (err instanceof OrderApiError || errStatus > 0) {
        const isServiceFkError =
          /orders_service_id_fkey|supplier_services|foreign key.*service_id/i.test(rawMessage) ||
          (typeof apiData === "object" && apiData !== null &&
            /orders_service_id_fkey|supplier_services|foreign key/i.test(
              String((apiData as { message?: string; detail?: string }).message ?? (apiData as { detail?: string }).detail ?? "")
            ));

        if (isServiceFkError) {
          errorMessage = t("booking.createOrderServiceInvalid");
        } else if (apiData && typeof apiData === "object") {
          const errorData = apiData as {
            issues?: Array<{ path: string[]; message: string }>;
            message?: string;
            code?: string;
          };
          if (errorData.issues?.length) {
            const first = errorData.issues[0];
            errorMessage = `${first.path.join(".")}: ${first.message}`;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (rawMessage) {
            errorMessage = rawMessage;
          }
        } else if (rawMessage) {
          errorMessage = rawMessage;
        }
      }

      Alert.alert(t("common.error"), errorMessage);
    } finally {
      setCreatingOrder(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (error || !supplier || !service || !address) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error || t("booking.missingBookingData")}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryText}>{t("common.ok")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const formattedDate = formatDate(scheduledAt);
  const formattedTime = formatTime(scheduledAt);
  const addressString = formatAddress(address);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("booking.confirmReservation")}</Text>
      </View>

      <KeyboardAvoidingView style={styles.keyboardAvoidingView} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={insets.top}>
        <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]} showsVerticalScrollIndicator={false} bounces={false} keyboardShouldPersistTaps="handled">
          {/* Provider Card */}
          <View style={styles.card}>
            <View style={styles.providerRow}>
              <View style={styles.providerAvatar}>
                <ProviderAvatar
                  profileImage={supplier.profile_image}
                  size={48}
                  rounded
                  style={styles.avatarImage}
                />
              </View>
              <View style={styles.providerInfo}>
                <View style={styles.providerNameRow}>
                  <Text style={styles.providerName}>{supplier.business_name?.trim() || supplier.full_name}</Text>
                  {supplier.verified && <Text style={styles.verifiedCheckmark}>✓</Text>}
                </View>
                <Text style={styles.ratingText}>
                  ⭐ {Number(supplier.rating || 0).toFixed(1)} ({supplier.total_reviews || 0} {t("supplier.reviewsCount")})
                </Text>
              </View>
            </View>
          </View>

          {/* Service Details Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t("booking.serviceDetails")}</Text>

            {/* Service */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t("booking.service")}</Text>
              <Text style={styles.detailValue}>{service.category_name || service.description || "Service"}</Text>
            </View>

            {/* Date */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t("booking.date")}</Text>
              <Text style={styles.detailValue}>{formattedDate}</Text>
            </View>

            {/* Time */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t("booking.time")}</Text>
              <Text style={styles.detailValue}>{formattedTime}</Text>
            </View>

            {/* Duration */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t("booking.estimatedDuration")}</Text>
              <Text style={styles.detailValue}>
                {duration} {t("booking.hours")}
              </Text>
            </View>

            {/* Address */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t("booking.address")}</Text>
              <Text style={[styles.detailValue, styles.addressValue]}>{addressString}</Text>
            </View>
          </View>

          {/* Additional Notes Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t("booking.additionalNotes")}</Text>
            <TextInput style={styles.notesInput} placeholder={t("booking.notesPlaceholder")} placeholderTextColor={colors.textSecondary} value={additionalNotes} onChangeText={setAdditionalNotes} multiline numberOfLines={4} />
          </View>

          {/* Payment Summary Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t("booking.paymentSummary")}</Text>

            {/* Service Cost */}
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>
                {service.category_name || "Service"} ({duration} {t("booking.hours")} x ${service.price || 60}/hr)
              </Text>
              <Text style={styles.priceValue}>${pricing.serviceCost.toFixed(2)}</Text>
            </View>

            {/* Platform Fee */}
            <View style={styles.priceRow}>
              <View>
                <Text style={styles.priceLabel}>{t("booking.travelFee")}</Text>
                {tierConfig.key !== "bronze" && (
                  <Text style={[styles.priceLabel, { color: tierConfig.color, fontSize: 11 }]}>
                    {t("booking.tierFeeLabel", { tier: t(tierConfig.i18nKey) })}
                  </Text>
                )}
              </View>
              <Text style={[styles.priceValue, pricing.serviceFee === 0 && { color: "#10b981" }]}>
                {pricing.serviceFee === 0 ? "$0.00" : `$${pricing.serviceFee.toFixed(2)}`}
              </Text>
            </View>

            {/* Discount */}
            {pricing.discount > 0 && (
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, styles.discountLabel]}>
                  {t("booking.discount")} ({appliedDiscount}% OFF)
                </Text>
                <Text style={[styles.priceValue, styles.discountValue]}>-${pricing.discount.toFixed(2)}</Text>
              </View>
            )}

            {/* Divider */}
            <View style={styles.divider} />

            {/* Total */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t("booking.total")}</Text>
              <Text style={styles.totalValue}>${pricing.total.toFixed(2)}</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* CTA Button - Fixed at bottom */}
      <View style={[styles.ctaContainer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={[styles.ctaButton, creatingOrder && styles.ctaButtonDisabled]} onPress={handleProceedToPayment} disabled={creatingOrder}>
          {creatingOrder ?
            <ActivityIndicator size="small" color={colors.white} />
          : <>
              <Text style={styles.ctaButtonEmoji}>💳</Text>
              <Text style={styles.ctaButtonText}>{t("booking.proceedToPayment")}</Text>
            </>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
    backgroundColor: colors.bg,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "600",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    padding: 0,
    paddingBottom: 20,
    backgroundColor: colors.bg,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  cardTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  providerRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  providerAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.bgInput,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarEmoji: {
    fontSize: 28,
  },
  providerInfo: {
    flex: 1,
  },
  providerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  providerName: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "600",
  },
  verifiedCheckmark: {
    color: colors.secondary,
    fontSize: 18,
  },
  ratingText: {
    color: colors.accent,
    fontSize: 14,
    marginTop: 4,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  detailLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  detailValue: {
    color: colors.white,
    fontSize: 14,
    textAlign: "right",
    maxWidth: 180,
  },
  addressValue: {
    flex: 1,
    textAlign: "right",
  },
  notesInput: {
    width: "100%",
    padding: 14,
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    color: colors.white,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  priceLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  priceValue: {
    color: colors.white,
    fontSize: 14,
  },
  discountLabel: {
    color: colors.secondary,
  },
  discountValue: {
    color: colors.secondary,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 12,
    marginBottom: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  totalValue: {
    color: colors.secondary,
    fontSize: 24,
    fontWeight: "700",
  },
  ctaContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  ctaButton: {
    width: "100%",
    padding: 18,
    backgroundColor: colors.primary,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaButtonDisabled: {
    opacity: 0.6,
  },
  ctaButtonEmoji: {
    fontSize: 20,
  },
  ctaButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  errorText: {
    color: colors.danger,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
});
