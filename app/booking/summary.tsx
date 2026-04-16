import { useAuth } from "@/contexts/AuthContext";
import { useThemeColors } from "@/hooks/useThemeColors";
import { getLocale, t } from "@/i18n";
import { ProviderAvatar } from "@/components/ProviderAvatar";
import { Address, getAddresses } from "@/services/addresses";
import { ApiError, fetchSupplierProfile, fetchSupplierServices, Supplier, SupplierService } from "@/services/suppliers";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function BookingSummaryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const themeColors = useThemeColors();
  const colors = useMemo(
    () => ({
      bg: themeColors.screenBackground,
      bgCard: themeColors.card,
      bgInput: themeColors.surfaceSecondary,
      primary: themeColors.primary,
      secondary: '#10b981',
      accent: '#f59e0b',
      danger: '#ef4444',
      purple: themeColors.primary,
      pink: '#ec4899',
      textPrimary: themeColors.textPrimary,
      textSecondary: themeColors.textSecondary,
      border: themeColors.border,
      cardBorder: themeColors.cardBorder,
      white: '#ffffff',
    }),
    [themeColors]
  );
  const styles = useMemo(
    () =>
      StyleSheet.create({
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
        backButton: { padding: 4 },
        headerTitle: {
          color: colors.textPrimary,
          fontSize: 20,
          fontWeight: "600",
        },
        keyboardAvoidingView: { flex: 1 },
        scrollView: { flex: 1, backgroundColor: colors.bg },
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
          borderWidth: 1,
          borderColor: colors.cardBorder,
        },
        cardTitle: {
          color: colors.textPrimary,
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
        avatarEmoji: { fontSize: 28 },
        providerInfo: { flex: 1 },
        providerNameRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: 4,
        },
        providerName: {
          color: colors.textPrimary,
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
          color: colors.textPrimary,
          fontSize: 14,
          textAlign: "right",
          maxWidth: 180,
        },
        addressValue: { flex: 1, textAlign: "right" },
        notesInput: {
          width: "100%",
          padding: 14,
          backgroundColor: colors.bgInput,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          color: colors.textPrimary,
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
          color: colors.textPrimary,
          fontSize: 14,
        },
        discountLabel: { color: colors.secondary },
        discountValue: { color: colors.secondary },
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
          color: colors.textPrimary,
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
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.08,
              shadowRadius: 4,
            },
            android: {
              elevation: 6,
            },
          }),
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
        ctaButtonEmoji: { fontSize: 20 },
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
      }),
    [colors]
  );
  const { supplierId, serviceId, scheduledAt, duration, addressId } = useLocalSearchParams<{
    supplierId: string;
    serviceId: string;
    scheduledAt: string;
    duration: string;
    addressId: string;
  }>();
  const insets = useSafeAreaInsets();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [service, setService] = useState<SupplierService | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);

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

  // Pricing: service has a fixed price (not per hour). No platform fee for direct booking.
  const calculatePricing = () => {
    if (!service) {
      return {
        serviceCost: 0,
        serviceFee: 0,
        discount: 0,
        total: 0,
      };
    }

    const serviceCost = Number(service.price) || 0;
    const serviceFee = 0;
    const subtotal = serviceCost;

    const discountPercent = appliedDiscount > 0 ? appliedDiscount : 0;
    const discount = subtotal * (discountPercent / 100);
    const total = Math.max(0, subtotal - discount);

    return {
      serviceCost,
      serviceFee,
      discount,
      total,
    };
  };

  const pricing = calculatePricing();

  const handleProceedToPayment = () => {
    if (!supplierId || !serviceId || !scheduledAt || !addressId || !address || !service) {
      Alert.alert(t("common.error"), t("booking.missingBookingData"));
      return;
    }

    const addressStr = formatAddress(address);
    let formattedScheduledAt = scheduledAt;
    try {
      const date = new Date(scheduledAt);
      if (!isNaN(date.getTime())) formattedScheduledAt = date.toISOString();
    } catch { /* keep original */ }

    router.push({
      pathname: "/booking/payment/[orderId]",
      params: {
        orderId: "new",
        totalAmount: pricing.total.toString(),
        serviceId,
        categoryId: service.category_id ?? "",
        supplierId,
        scheduledAt: formattedScheduledAt,
        address: addressStr,
        notes: additionalNotes.trim(),
      },
    });
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
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
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
              <Text style={styles.detailValue}>{service.name?.trim() || service.category_name || service.description || "Service"}</Text>
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

            {/* Duration (estimated job length; price is fixed, not per hour) */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t("booking.estimatedDuration")}</Text>
              <Text style={styles.detailValue}>
                {duration
                  ? `${duration} ${t("booking.hours")}`
                  : service.duration_minutes != null
                    ? service.duration_minutes >= 60
                      ? `${Math.round(service.duration_minutes / 60)} ${t("booking.hours")}`
                      : `${service.duration_minutes} ${t("booking.minutes")}`
                    : "—"}
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

            {/* Service cost (fixed price) */}
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>
                {service.name?.trim() || service.category_name || "Service"}
              </Text>
              <Text style={styles.priceValue}>${pricing.serviceCost.toFixed(2)}</Text>
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
        <TouchableOpacity style={styles.ctaButton} onPress={handleProceedToPayment}>
          <Text style={styles.ctaButtonEmoji}>💳</Text>
          <Text style={styles.ctaButtonText}>{t("booking.proceedToPayment")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
