import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { useThemeColors } from '@/hooks/useThemeColors';
import { t } from '@/i18n';
import { fetchConversation, fetchConversations } from '@/services/conversations';
import { ApiError, fetchOrderDetail, OrderDetailResponse, rejectQuote, withdrawQuote } from '@/services/orders';
import { cancelOrderByProvider } from '@/services/providerDashboard';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function normalizeQuote(quote: OrderDetailResponse['quote']) {
  if (!quote) return null;
  let lineItems: { description: string; amount: number }[] = [];
  if (Array.isArray(quote.line_items)) {
    lineItems = quote.line_items;
  } else if (typeof quote.line_items === 'string') {
    try {
      const parsed = JSON.parse(quote.line_items) as unknown;
      lineItems = Array.isArray(parsed) ? parsed : [];
    } catch {
      lineItems = [];
    }
  }
  const storedSubtotal = Number(quote.subtotal ?? 0);
  const storedTax = Number(quote.tax ?? 0);
  const storedTotal = Number(quote.total ?? 0);
  const totalFromLineItems = lineItems.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
  const taxFromStored = storedTax;
  // Use line_items sum as source of truth for total when present, so edited duration/amounts are reflected (fixes quote total desync)
  const displaySubtotal = lineItems.length > 0 ? totalFromLineItems : storedSubtotal;
  const displayTotal = lineItems.length > 0 ? totalFromLineItems + taxFromStored : storedTotal;
  return {
    ...quote,
    line_items: lineItems,
    subtotal: displaySubtotal,
    tax: taxFromStored,
    total: displayTotal,
  };
}

export default function QuoteScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { mode } = useMode();
  const themeColors = useThemeColors();
  const clientColors = useMemo(
    () => ({
      bg: themeColors.background,
      bgCard: themeColors.card,
      primary: '#3b82f6',
      secondary: '#10b981',
      textPrimary: themeColors.textPrimary,
      textSecondary: themeColors.textSecondary,
      border: themeColors.border,
      iconMuted: themeColors.textTertiary,
    }),
    [themeColors]
  );
  const providerColors = useMemo(
    () => ({
      bg: themeColors.background,
      bgCard: themeColors.card,
      border: themeColors.cardBorder,
      primary: themeColors.primary,
      secondary: '#22C55E',
      textPrimary: themeColors.textPrimary,
      textSecondary: themeColors.textSecondary,
      iconMuted: themeColors.textTertiary,
    }),
    [themeColors]
  );
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: themeColors.background },
        centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingBottom: 16,
          backgroundColor: themeColors.card,
          borderBottomWidth: 1,
          borderBottomColor: themeColors.border,
        },
        backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
        headerTitle: { fontSize: 18, fontWeight: '600', color: themeColors.textPrimary },
        content: { flex: 1 },
        section: { backgroundColor: themeColors.card, padding: 20, marginBottom: 8 },
        serviceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
        serviceTitle: { fontSize: 18, fontWeight: '600', color: themeColors.textPrimary, marginLeft: 12 },
        description: { fontSize: 14, color: themeColors.textSecondary, lineHeight: 20 },
        sectionTitle: { fontSize: 16, fontWeight: '600', color: themeColors.textPrimary, marginBottom: 12 },
        lineItem: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: themeColors.borderLight,
        },
        lineItemName: { fontSize: 14, color: themeColors.textSecondary },
        lineItemPrice: { fontSize: 14, fontWeight: '600', color: themeColors.textPrimary },
        infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
        infoLabel: { fontSize: 12, color: themeColors.textSecondary, marginLeft: 8, minWidth: 100 },
        infoValue: { flex: 1, fontSize: 14, color: themeColors.textPrimary, marginLeft: 8 },
        dateTimeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
        dateTimeText: { fontSize: 14, color: themeColors.textSecondary, marginLeft: 8 },
        totalSection: { backgroundColor: themeColors.card, padding: 20, marginBottom: 8 },
        totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
        totalLabel: { fontSize: 14, color: themeColors.textSecondary },
        totalValue: { fontSize: 14, color: themeColors.textPrimary },
        grandTotalRow: {
          borderTopWidth: 2,
          borderTopColor: themeColors.border,
          marginTop: 8,
          paddingTop: 12,
        },
        grandTotalLabel: { fontSize: 18, fontWeight: '600', color: themeColors.textPrimary },
        grandTotalValue: { fontSize: 18, fontWeight: '600', color: '#10B981' },
        actions: {
          padding: 20,
          backgroundColor: themeColors.card,
          borderTopWidth: 1,
          borderTopColor: themeColors.border,
        },
        approveButton: {
          backgroundColor: themeColors.primary,
          paddingVertical: 16,
          borderRadius: 8,
          alignItems: 'center',
          marginBottom: 12,
        },
        approveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
        rejectButton: {
          backgroundColor: themeColors.card,
          paddingVertical: 16,
          borderRadius: 8,
          alignItems: 'center',
          marginBottom: 12,
          borderWidth: 1,
          borderColor: themeColors.border,
        },
        rejectButtonText: { color: themeColors.textSecondary, fontSize: 16, fontWeight: '600' },
        chatBackButton: {
          backgroundColor: themeColors.card,
          paddingVertical: 16,
          borderRadius: 8,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: themeColors.border,
        },
        chatBackText: { color: themeColors.textSecondary, fontSize: 16, fontWeight: '600' },
        errorText: { fontSize: 16, color: '#EF4444', textAlign: 'center', marginBottom: 16 },
        retryButton: { backgroundColor: '#10B981', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
        retryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
        withdrawModalOverlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        },
        withdrawModalCard: { width: '100%', maxWidth: 340, borderRadius: 12, padding: 24 },
        withdrawModalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
        withdrawModalMessage: { fontSize: 14, lineHeight: 20, marginBottom: 24 },
        withdrawModalActions: { flexDirection: 'row', gap: 12 },
        withdrawModalButton: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
        withdrawModalButtonCancel: { backgroundColor: themeColors.surfaceSecondary },
        withdrawModalButtonCancelText: { fontSize: 16, fontWeight: '600', color: themeColors.textPrimary },
        withdrawModalButtonConfirm: { backgroundColor: '#DC2626' },
        withdrawModalButtonConfirmText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
      }),
    [themeColors]
  );
  const clientStyles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: clientColors.bg },
        centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingBottom: 16,
          backgroundColor: clientColors.bgCard,
          borderBottomWidth: 1,
          borderBottomColor: clientColors.border,
        },
        headerTitle: { fontSize: 18, fontWeight: '600', color: clientColors.textPrimary },
        section: { backgroundColor: clientColors.bgCard, padding: 20, marginBottom: 8 },
        serviceTitle: { fontSize: 18, fontWeight: '600', color: clientColors.textPrimary, marginLeft: 12 },
        description: { fontSize: 14, color: clientColors.textSecondary, lineHeight: 20 },
        sectionTitle: { fontSize: 16, fontWeight: '600', color: clientColors.textPrimary, marginBottom: 12 },
        lineItem: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: clientColors.border,
        },
        lineItemName: { fontSize: 14, color: clientColors.textSecondary },
        lineItemPrice: { fontSize: 14, fontWeight: '600', color: clientColors.textPrimary },
        infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
        infoLabel: { fontSize: 12, color: clientColors.textSecondary, marginLeft: 8, minWidth: 100 },
        infoValue: { flex: 1, fontSize: 14, color: clientColors.textPrimary, marginLeft: 8 },
        dateTimeText: { fontSize: 14, color: clientColors.textSecondary, marginLeft: 8 },
        totalSection: { backgroundColor: clientColors.bgCard, padding: 20, marginBottom: 8 },
        totalLabel: { fontSize: 14, color: clientColors.textSecondary },
        totalValue: { fontSize: 14, color: clientColors.textPrimary },
        grandTotalRow: {
          borderTopWidth: 2,
          borderTopColor: clientColors.border,
          marginTop: 8,
          paddingTop: 12,
        },
        grandTotalLabel: { fontSize: 18, fontWeight: '600', color: clientColors.textPrimary },
        grandTotalValue: { fontSize: 18, fontWeight: '600', color: clientColors.secondary },
        actions: {
          padding: 20,
          backgroundColor: clientColors.bgCard,
          borderTopWidth: 1,
          borderTopColor: clientColors.border,
        },
        approveButton: {
          paddingVertical: 16,
          borderRadius: 8,
          alignItems: 'center',
          marginBottom: 12,
          backgroundColor: clientColors.primary,
        },
        approveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
        rejectButton: {
          paddingVertical: 16,
          borderRadius: 8,
          alignItems: 'center',
          marginBottom: 12,
          borderWidth: 1,
          borderColor: clientColors.border,
        },
        rejectButtonText: { color: clientColors.textSecondary, fontSize: 16, fontWeight: '600' },
        chatBackButton: {
          paddingVertical: 16,
          borderRadius: 8,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: clientColors.border,
        },
        chatBackText: { color: clientColors.textSecondary, fontSize: 16, fontWeight: '600' },
        chatButton: {
          paddingVertical: 16,
          borderRadius: 8,
          alignItems: 'center',
          backgroundColor: clientColors.secondary,
        },
        chatButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
      }),
    [clientColors]
  );
  const providerStyles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: providerColors.bg },
        centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingBottom: 16,
          backgroundColor: providerColors.bgCard,
          borderBottomWidth: 1,
          borderBottomColor: providerColors.border,
        },
        headerTitle: { fontSize: 18, fontWeight: '600', color: providerColors.textPrimary },
        section: { backgroundColor: providerColors.bgCard, padding: 20, marginBottom: 8 },
        serviceTitle: { fontSize: 18, fontWeight: '600', color: providerColors.textPrimary, marginLeft: 12 },
        description: { fontSize: 14, color: providerColors.textSecondary, lineHeight: 20 },
        sectionTitle: { fontSize: 16, fontWeight: '600', color: providerColors.textPrimary, marginBottom: 12 },
        lineItem: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: providerColors.border,
        },
        lineItemName: { fontSize: 14, color: providerColors.textSecondary },
        lineItemPrice: { fontSize: 14, fontWeight: '600', color: providerColors.textPrimary },
        infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
        infoLabel: { fontSize: 12, color: providerColors.textSecondary, marginLeft: 8, minWidth: 100 },
        infoValue: { flex: 1, fontSize: 14, color: providerColors.textPrimary, marginLeft: 8 },
        dateTimeText: { fontSize: 14, color: providerColors.textSecondary, marginLeft: 8 },
        totalSection: { backgroundColor: providerColors.bgCard, padding: 20, marginBottom: 8 },
        totalLabel: { fontSize: 14, color: providerColors.textSecondary },
        totalValue: { fontSize: 14, color: providerColors.textPrimary },
        grandTotalRow: {
          borderTopWidth: 2,
          borderTopColor: providerColors.border,
          marginTop: 8,
          paddingTop: 12,
        },
        grandTotalLabel: { fontSize: 18, fontWeight: '600', color: providerColors.textPrimary },
        grandTotalValue: { fontSize: 18, fontWeight: '600', color: providerColors.secondary },
        actions: {
          padding: 20,
          backgroundColor: providerColors.bgCard,
          borderTopWidth: 1,
          borderTopColor: providerColors.border,
        },
        approveButton: {
          paddingVertical: 16,
          borderRadius: 8,
          alignItems: 'center',
          marginBottom: 12,
          backgroundColor: providerColors.primary,
        },
        approveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
        rejectButton: {
          paddingVertical: 16,
          borderRadius: 8,
          alignItems: 'center',
          marginBottom: 12,
          borderWidth: 1,
          borderColor: providerColors.border,
        },
        rejectButtonText: { color: providerColors.textSecondary, fontSize: 16, fontWeight: '600' },
        chatBackButton: {
          paddingVertical: 16,
          borderRadius: 8,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: providerColors.border,
        },
        chatBackText: { color: providerColors.textSecondary, fontSize: 16, fontWeight: '600' },
        chatButton: {
          paddingVertical: 16,
          borderRadius: 8,
          alignItems: 'center',
          backgroundColor: providerColors.secondary,
        },
        chatButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
      }),
    [providerColors]
  );
  const params = useLocalSearchParams<{ orderId: string | string[]; navRef?: string | string[] }>();
  const orderId = typeof params.orderId === 'string' ? params.orderId : Array.isArray(params.orderId) ? params.orderId[0] : undefined;
  const navRef =
    typeof params.navRef === 'string' ? params.navRef : Array.isArray(params.navRef) ? params.navRef[0] : undefined;
  const insets = useSafeAreaInsets();
  const [orderData, setOrderData] = useState<OrderDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quote = useMemo(
    () => normalizeQuote(orderData?.quote ?? null),
    [orderData?.quote]
  );

  const loadData = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      setError(t('quote.notFound'));
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await fetchOrderDetail(orderId);
      setOrderData(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t('errors.requestFailed'));
      }
    } finally {
      setLoading(false);
    }
  }, [orderId, navRef]);

  useEffect(() => {
    if (orderId) {
      loadData();
    } else {
      setLoading(false);
      setError(t('quote.notFound'));
    }
  }, [orderId, navRef, loadData]);

  // Go to payment without approving first; order is confirmed only after successful payment
  const handleGoToPayment = () => {
    const total = quote?.total ?? orderData?.order?.total_amount ?? 0;
    router.push({
      pathname: `/booking/payment/${orderId}`,
      params: { totalAmount: String(total) },
    });
  };

  /** Find a client conversation for this order from provider inbox. Exclude conversations where other_user_name matches the given name (self-chat). */
  const findConversationByOrderId = useCallback(
    async (excludeOtherUserName?: string): Promise<string | null> => {
      try {
        const list = await fetchConversations('provider');
        const withOrder = list.filter((c) => c.order_id === orderId);
        const normalizedExclude = (excludeOtherUserName ?? '').trim().toLowerCase();
        const match = normalizedExclude
          ? withOrder.find((c) => (c.other_user_name?.trim() ?? '').toLowerCase() !== normalizedExclude)
          : withOrder[0];
        return match?.id ?? (normalizedExclude ? null : withOrder[0]?.id ?? null);
      } catch {
        return null;
      }
    },
    [orderId]
  );

  /** Returns true if this conversation is provider talking to themselves (self-chat). Also true when client is the same entity as the supplier (e.g. same name as order's supplier). */
  const isSelfChat = useCallback(
    (
      conv: { client_name?: string | null; supplier_name?: string | null },
      orderSupplierName?: string | null
    ) => {
      const a = (conv.client_name ?? '').trim().toLowerCase();
      const b = (conv.supplier_name ?? '').trim().toLowerCase();
      const sameNames = a.length > 0 && b.length > 0 && a === b;
      const clientIsSupplier =
        orderSupplierName && a === (orderSupplierName ?? '').trim().toLowerCase();
      return sameNames || !!clientIsSupplier;
    },
    []
  );

  /** Resolves the chat destination for this order: /chat/:id with the real client (e.g. Moises), or messages. Never /booking/chat or self-chat. Prefers provider inbox and validates each conv; also matches by order client name. */
  const resolveClientChatDestination = useCallback(async (): Promise<'/chat/${string}' | '/(provider-tabs)/messages'> => {
    const useConversation = (id: string) => `/chat/${id}` as `/chat/${string}`;

    try {
      const [list, data] = await Promise.all([
        fetchConversations('provider'),
        fetchOrderDetail(orderId),
      ]);
      const clientName = data.client?.full_name?.trim();
      const orderSupplierName =
        (data.supplier?.business_name ?? data.supplier?.full_name ?? '').trim() || null;
      const clientNameLower = (clientName ?? '').toLowerCase();
      const supplierNameLower = (orderSupplierName ?? '').toLowerCase();

      // If the order's client is the same person as the supplier (self-order), never open a chat — go to messages.
      if (clientNameLower && supplierNameLower && clientNameLower === supplierNameLower) {
        return '/(provider-tabs)/messages';
      }

      const matchesOrderClient = (c: { other_user_name?: string | null }) => {
        const other = (c.other_user_name?.trim() ?? '').toLowerCase();
        if (!other || !clientNameLower) return false;
        return other === clientNameLower || other.startsWith(clientNameLower + ' ') || clientNameLower.startsWith(other + ' ');
      };
      const withClientName = clientNameLower ? list.filter(matchesOrderClient) : [];

      for (const c of withClientName) {
        try {
          const conv = await fetchConversation(c.id);
          if (!isSelfChat(conv, orderSupplierName)) return useConversation(c.id);
        } catch {
          // skip
        }
      }

      // When list is empty (e.g. token has userType "client" but we requested as=supplier), use order's conversation_id only if it's not self-chat
      const convIdFromOrder = data.conversation_id ?? orderData?.conversation_id;
      if (convIdFromOrder) {
        try {
          const conv = await fetchConversation(convIdFromOrder);
          if (!isSelfChat(conv, orderSupplierName)) return useConversation(convIdFromOrder);
        } catch {
          // skip
        }
      }

      return '/(provider-tabs)/messages';
    } catch (e) {
      const fallbackId = await findConversationByOrderId();
      if (fallbackId) return useConversation(fallbackId);
      return '/(provider-tabs)/messages';
    }
  }, [orderId, orderData?.conversation_id, findConversationByOrderId, isSelfChat]);

  const handleChatBack = useCallback(async () => {
    const path = await resolveClientChatDestination();
    router.push(path);
  }, [resolveClientChatDestination, router]);

  const redirectToClientChat = useCallback(async () => {
    const path = await resolveClientChatDestination();
    router.replace(path);
  }, [resolveClientChatDestination, router]);

  const handleReject = () => {
    Alert.alert(
      t('quote.reject'),
      t('quote.rejectConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('quote.reject'),
          style: 'destructive',
          onPress: async () => {
            try {
              setRejecting(true);
              await rejectQuote(orderId);
              await redirectToClientChat();
            } catch (err) {
              if (err instanceof ApiError) {
                Alert.alert(t('common.error'), err.message);
              } else {
                Alert.alert(t('common.error'), t('quote.rejectFailed'));
              }
            } finally {
              setRejecting(false);
            }
          },
        },
      ]
    );
  };

  const runWithdrawQuote = useCallback(async () => {
    setShowWithdrawConfirm(false);
    if (!orderId) {
      Alert.alert(t('common.error'), t('quote.notFound'));
      return;
    }
    try {
      setWithdrawing(true);
      await withdrawQuote(orderId);
      await redirectToClientChat();
    } catch (err) {
      if (err instanceof ApiError) {
        Alert.alert(t('common.error'), err.message);
      } else {
        Alert.alert(t('common.error'), t('quote.withdrawFailed'));
      }
    } finally {
      setWithdrawing(false);
    }
  }, [orderId, redirectToClientChat]);

  const handleWithdrawQuotePress = useCallback(() => {
    setShowWithdrawConfirm(true);
  }, []);

  const runCancelRequest = useCallback(async () => {
    setShowCancelConfirm(false);
    if (!orderId) {
      Alert.alert(t('common.error'), t('quote.notFound'));
      return;
    }
    try {
      setCancelling(true);
      await cancelOrderByProvider(orderId);
      await redirectToClientChat();
    } catch (err) {
      if (err instanceof ApiError) {
        Alert.alert(t('common.error'), err.message);
        if (err.status === 404) {
          loadData();
        }
      } else {
        Alert.alert(t('common.error'), t('quote.cancelRequestFailed'));
      }
    } finally {
      setCancelling(false);
    }
  }, [orderId, redirectToClientChat, loadData]);

  const handleCancelRequestPress = useCallback(() => {
    setShowCancelConfirm(true);
  }, []);

  const handleEditQuote = () => {
    router.push({
      pathname: '/chat/create-quote',
      params: {
        orderId,
        clientName: orderData?.client?.full_name ?? '',
        serviceName: order?.service_name ?? '',
        conversationId: '', // not used when orderId present
        edit: '1',
      },
    });
  };

  const loadingTheme = mode === 'client' ? clientStyles : mode === 'provider' ? providerStyles : null;

  if (loading) {
    return (
      <View style={[styles.container, loadingTheme?.container]}>
        <View style={[styles.centerContainer, loadingTheme?.centerContainer]}>
          <ActivityIndicator
            size="large"
            color={mode === 'client' ? clientColors.secondary : mode === 'provider' ? providerColors.secondary : '#10B981'}
          />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, loadingTheme?.container]}>
        <View style={[styles.centerContainer, loadingTheme?.centerContainer]}>
          <Text style={[styles.errorText, loadingTheme?.errorText]}>{error}</Text>
          <TouchableOpacity style={[styles.retryButton, loadingTheme?.retryButton]} onPress={loadData}>
            <Text style={[styles.retryText, loadingTheme?.retryText]}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (orderData?.order && (!orderData.quote || !quote)) {
    return (
      <View style={[styles.container, loadingTheme?.container]}>
        <View style={[styles.centerContainer, loadingTheme?.centerContainer]}>
          <Text style={[styles.errorText, loadingTheme?.errorText, { color: themeColors.textSecondary }]}>
            {t('quote.orderNoQuoteSummary')}
          </Text>
          {orderId ? (
            <TouchableOpacity
              style={[styles.retryButton, loadingTheme?.retryButton, { marginBottom: 12 }]}
              onPress={() =>
                router.replace(
                  mode === 'provider' ? `/(provider-tabs)/jobs/${orderId}` : `/orders/${orderId}`
                )
              }
            >
              <Text style={[styles.retryText, loadingTheme?.retryText]}>{t('quote.viewBooking')}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={[styles.retryButton, loadingTheme?.retryButton]} onPress={loadData}>
            <Text style={[styles.retryText, loadingTheme?.retryText]}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!orderData?.quote || !quote) {
    return (
      <View style={[styles.container, loadingTheme?.container]}>
        <View style={[styles.centerContainer, loadingTheme?.centerContainer]}>
          <Text style={[styles.errorText, loadingTheme?.errorText]}>{t('quote.notFound')}</Text>
          <TouchableOpacity style={[styles.retryButton, loadingTheme?.retryButton]} onPress={loadData}>
            <Text style={[styles.retryText, loadingTheme?.retryText]}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const order = orderData.order;
  const isSupplier = user?.id === order.supplier_id;
  const isClient = !isSupplier;
  const theme = isClient ? clientStyles : isSupplier ? providerStyles : null;
  const { supplier, client } = orderData;
  const serviceDate = quote.scheduled_at || order.scheduled_at;
  const clientAddr = orderData.clientAddress;
  const formattedClientAddr = clientAddr
    ? [clientAddr.name, clientAddr.address_line1, clientAddr.address_line2, clientAddr.city, clientAddr.state].filter(Boolean).join(', ')
    : null;
  const address = order.address?.trim() || formattedClientAddr;
  const displayNotes = (quote.notes || order.notes)?.trim() || null;
  const providerDisplayName = supplier?.business_name?.trim() || supplier?.full_name || '';
  const clientDisplayName = client?.full_name || '';

  const durationText =
    quote.estimated_time != null && quote.estimated_time > 0 && quote.estimated_time_unit
      ? `${quote.estimated_time} ${quote.estimated_time_unit === 'days' ? t('createQuote.days') : t('createQuote.hours')}`
      : null;

  const iconColor = isClient ? clientColors.iconMuted : isSupplier ? providerColors.iconMuted : '#6B7280';
  const serviceIconColor = isClient ? clientColors.primary : isSupplier ? providerColors.primary : '#3B82F6';
  const headerTextColor = isClient ? clientColors.textPrimary : isSupplier ? providerColors.textPrimary : '#1F2937';

  const confirmModalBg = isClient ? clientColors.bgCard : isSupplier ? providerColors.bgCard : '#FFFFFF';
  const confirmModalText = isClient ? clientColors.textPrimary : isSupplier ? providerColors.textPrimary : '#1F2937';
  const confirmModalMuted = isClient ? clientColors.textSecondary : isSupplier ? providerColors.textSecondary : '#6B7280';

  return (
    <View style={[styles.container, theme?.container]}>
      <Modal
        visible={showWithdrawConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWithdrawConfirm(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.withdrawModalOverlay}
          onPress={() => setShowWithdrawConfirm(false)}
        >
          <View style={[styles.withdrawModalCard, { backgroundColor: confirmModalBg }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.withdrawModalTitle, { color: confirmModalText }]}>{t('quote.withdrawQuote')}</Text>
            <Text style={[styles.withdrawModalMessage, { color: confirmModalMuted }]}>{t('quote.withdrawConfirm')}</Text>
            <View style={styles.withdrawModalActions}>
              <TouchableOpacity
                style={[styles.withdrawModalButton, styles.withdrawModalButtonCancel]}
                onPress={() => setShowWithdrawConfirm(false)}
              >
                <Text style={[styles.withdrawModalButtonCancelText, { color: confirmModalMuted }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.withdrawModalButton, styles.withdrawModalButtonConfirm]}
                onPress={() => runWithdrawQuote()}
              >
                <Text style={styles.withdrawModalButtonConfirmText}>{t('quote.withdrawQuote')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
      <Modal
        visible={showCancelConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelConfirm(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.withdrawModalOverlay}
          onPress={() => setShowCancelConfirm(false)}
        >
          <View style={[styles.withdrawModalCard, { backgroundColor: confirmModalBg }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.withdrawModalTitle, { color: confirmModalText }]}>{t('quote.cancelRequest')}</Text>
            <Text style={[styles.withdrawModalMessage, { color: confirmModalMuted }]}>{t('quote.cancelRequestConfirm')}</Text>
            <View style={styles.withdrawModalActions}>
              <TouchableOpacity
                style={[styles.withdrawModalButton, styles.withdrawModalButtonCancel]}
                onPress={() => setShowCancelConfirm(false)}
              >
                <Text style={[styles.withdrawModalButtonCancelText, { color: confirmModalMuted }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.withdrawModalButton, styles.withdrawModalButtonConfirm]}
                onPress={() => runCancelRequest()}
              >
                <Text style={styles.withdrawModalButtonConfirmText}>{t('quote.cancelRequest')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
      {/* Header */}
      <View style={[styles.header, theme?.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, theme?.backButton]}>
          <Ionicons name="arrow-back" size={24} color={headerTextColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, theme?.headerTitle]}>
          {isClient ? t('quote.title') : t('chat.viewQuote')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={[styles.content, theme?.content]} 
        contentContainerStyle={{ paddingBottom: insets.bottom + 20, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Order number & parties */}
        <View style={[styles.section, theme?.section]}>
          <Text style={[styles.sectionTitle, theme?.sectionTitle]}>{t('quote.orderNumber')} {order.id.slice(0, 8).toUpperCase()}</Text>
          {clientDisplayName ? (
            <View style={[styles.infoRow, theme?.infoRow]}>
              <Ionicons name="person-outline" size={20} color={iconColor} />
              <Text style={[styles.infoLabel, theme?.infoLabel]}>{t('quote.clientName')}</Text>
              <Text style={[styles.infoValue, theme?.infoValue]}>{clientDisplayName}</Text>
            </View>
          ) : null}
          {providerDisplayName ? (
            <View style={[styles.infoRow, theme?.infoRow]}>
              <Ionicons name="briefcase-outline" size={20} color={iconColor} />
              <Text style={[styles.infoLabel, theme?.infoLabel]}>{t('quote.providerName')}</Text>
              <Text style={[styles.infoValue, theme?.infoValue]}>{providerDisplayName}</Text>
            </View>
          ) : null}
        </View>

        {/* Service address */}
        {(address || serviceDate || durationText) ? (
          <View style={[styles.section, theme?.section]}>
            {address ? (
              <View style={[styles.infoRow, theme?.infoRow]}>
                <Ionicons name="location-outline" size={20} color={iconColor} />
                <Text style={[styles.infoLabel, theme?.infoLabel]}>{t('quote.serviceAddress')}</Text>
                <Text style={[styles.infoValue, theme?.infoValue]}>{address}</Text>
              </View>
            ) : null}
            {serviceDate ? (
              <View style={[styles.infoRow, theme?.infoRow]}>
                <Ionicons name="calendar-outline" size={20} color={iconColor} />
                <Text style={[styles.infoLabel, theme?.infoLabel]}>{t('quote.dateTime')}</Text>
                <Text style={[styles.infoValue, theme?.infoValue]}>
                  {new Date(serviceDate).toLocaleDateString(undefined, {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            ) : null}
            {durationText ? (
              <View style={[styles.infoRow, theme?.infoRow]}>
                <Ionicons name="time-outline" size={20} color={iconColor} />
                <Text style={[styles.infoLabel, theme?.infoLabel]}>{t('quote.estimatedDuration')}</Text>
                <Text style={[styles.infoValue, theme?.infoValue]}>{durationText}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Notes */}
        {displayNotes ? (
          <View style={[styles.section, theme?.section]}>
            <Text style={[styles.sectionTitle, theme?.sectionTitle]}>{t('quote.notes')}</Text>
            <Text style={[styles.description, theme?.description]}>{displayNotes}</Text>
          </View>
        ) : null}

        {/* Service Info */}
        <View style={[styles.section, theme?.section]}>
          <View style={[styles.serviceHeader, theme?.serviceHeader]}>
            <Ionicons name="brush-outline" size={24} color={serviceIconColor} />
            <Text style={[styles.serviceTitle, theme?.serviceTitle]}>{order.service_name || t('orders.service')}</Text>
          </View>
          {quote.description ? (
            <Text style={[styles.description, theme?.description]}>{quote.description}</Text>
          ) : null}
        </View>

        {/* Line Items */}
        <View style={[styles.section, theme?.section]}>
          <Text style={[styles.sectionTitle, theme?.sectionTitle]}>{t('quote.lineItems')}</Text>
          {quote.line_items.map((item, index) => (
            <View key={index} style={[styles.lineItem, theme?.lineItem]}>
              <Text style={[styles.lineItemName, theme?.lineItemName]}>{item.description}</Text>
              <Text style={[styles.lineItemPrice, theme?.lineItemPrice]}>${Number(item.amount ?? 0).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Total */}
        <View style={[styles.totalSection, theme?.totalSection]}>
          <View style={[styles.totalRow, theme?.totalRow]}>
            <Text style={[styles.totalLabel, theme?.totalLabel]}>{t('quote.subtotal')}</Text>
            <Text style={[styles.totalValue, theme?.totalValue]}>${quote.subtotal.toFixed(2)}</Text>
          </View>
          {quote.tax > 0 && (
            <View style={[styles.totalRow, theme?.totalRow]}>
              <Text style={[styles.totalLabel, theme?.totalLabel]}>{t('quote.tax')}</Text>
              <Text style={[styles.totalValue, theme?.totalValue]}>${quote.tax.toFixed(2)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grandTotalRow, theme?.totalRow, theme?.grandTotalRow]}>
            <Text style={[styles.grandTotalLabel, theme?.grandTotalLabel]}>{t('quote.total')}</Text>
            <Text style={[styles.grandTotalValue, theme?.grandTotalValue]}>${quote.total.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={[styles.actions, theme?.actions, { paddingBottom: 20 + insets.bottom }]}>
        {isClient && order.status === 'pending_for_client' && (
          <>
            <TouchableOpacity
              style={[styles.approveButton, theme?.approveButton]}
              onPress={handleGoToPayment}
              disabled={rejecting}
            >
              <Text style={[styles.approveButtonText, theme?.approveButtonText]}>{t('quote.goToPayment')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rejectButton, theme?.rejectButton]}
              onPress={handleReject}
              disabled={rejecting}
            >
              {rejecting ? (
                <ActivityIndicator size="small" color={isClient ? clientColors.textSecondary : isSupplier ? providerColors.textSecondary : '#6B7280'} />
              ) : (
                <Text style={[styles.rejectButtonText, theme?.rejectButtonText]}>{t('quote.reject')}</Text>
              )}
            </TouchableOpacity>
          </>
        )}
        {isClient && order.status === 'pending_payment' && (
          <TouchableOpacity
            style={[styles.approveButton, theme?.approveButton]}
            onPress={() => router.push({
              pathname: `/booking/payment/${orderId}`,
              params: { totalAmount: String(quote?.total ?? order.total_amount ?? 0) },
            })}
          >
            <Text style={[styles.approveButtonText, theme?.approveButtonText]}>{t('orders.completePayment')}</Text>
          </TouchableOpacity>
        )}
        {isSupplier && (order.status === 'pending_for_client' || order.status === 'pending_for_provider') && (
          <>
            {order.status === 'pending_for_client' && (
              <TouchableOpacity
                style={[styles.approveButton, theme?.approveButton]}
                onPress={handleEditQuote}
                disabled={withdrawing}
              >
                <Text style={[styles.approveButtonText, theme?.approveButtonText]}>{t('quote.editQuote')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.rejectButton, theme?.rejectButton]}
              onPress={handleWithdrawQuotePress}
              disabled={withdrawing}
            >
              {withdrawing ? (
                <ActivityIndicator size="small" color={isClient ? clientColors.textSecondary : isSupplier ? providerColors.textSecondary : '#6B7280'} />
              ) : (
                <Text style={[styles.rejectButtonText, theme?.rejectButtonText]}>{t('quote.withdrawQuote')}</Text>
              )}
            </TouchableOpacity>
          </>
        )}
        {isSupplier && (order.status === 'accepted' || order.status === 'in_progress') && (
          <TouchableOpacity
            style={[styles.rejectButton, theme?.rejectButton]}
            onPress={handleCancelRequestPress}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator size="small" color={isClient ? clientColors.textSecondary : isSupplier ? providerColors.textSecondary : '#6B7280'} />
            ) : (
              <Text style={[styles.rejectButtonText, theme?.rejectButtonText]}>{t('quote.cancelRequest')}</Text>
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.chatBackButton, theme?.chatBackButton]} onPress={handleChatBack}>
          <Text style={[styles.chatBackText, theme?.chatBackText]}>{t('quote.chatBack')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
