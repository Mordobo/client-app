import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n';
import { fetchConversation, fetchConversations } from '@/services/conversations';
import { ApiError, approveQuote, fetchOrderDetail, OrderDetailResponse, rejectQuote, withdrawQuote } from '@/services/orders';
import { cancelOrderByProvider } from '@/services/providerDashboard';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
  return {
    ...quote,
    line_items: lineItems,
    subtotal: Number(quote.subtotal ?? 0),
    tax: Number(quote.tax ?? 0),
    total: Number(quote.total ?? 0),
  };
}

export default function QuoteScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const insets = useSafeAreaInsets();
  const [orderData, setOrderData] = useState<OrderDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quote = useMemo(
    () => normalizeQuote(orderData?.quote ?? null),
    [orderData?.quote]
  );

  useEffect(() => {
    if (orderId) {
      loadData();
    }
  }, [orderId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchOrderDetail(orderId);
      setOrderData(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load quote');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setApproving(true);
      await approveQuote(orderId);
      router.push(`/booking/payment/${orderId}`);
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.message);
      } else {
        alert('Failed to approve quote');
      }
    } finally {
      setApproving(false);
    }
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

  const handleWithdrawQuote = () => {
    Alert.alert(
      t('quote.withdrawQuote'),
      t('quote.withdrawConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('quote.withdrawQuote'),
          style: 'destructive',
          onPress: async () => {
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
          },
        },
      ]
    );
  };

  const handleCancelRequest = () => {
    Alert.alert(
      t('quote.cancelRequest'),
      t('quote.cancelRequestConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('quote.cancelRequest'),
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelling(true);
              await cancelOrderByProvider(orderId);
              await redirectToClientChat();
            } catch (err) {
              if (err instanceof ApiError) {
                Alert.alert(t('common.error'), err.message);
              } else {
                Alert.alert(t('common.error'), t('quote.cancelRequestFailed'));
              }
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

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

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      </View>
    );
  }

  if (error || !orderData?.quote || !quote) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error || 'Quote not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const order = orderData.order;
  const isSupplier = user?.id === order.supplier_id;
  const isClient = !isSupplier;
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isClient ? t('quote.title') : t('chat.viewQuote')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Order number & parties */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('quote.orderNumber')} {order.id.slice(0, 8).toUpperCase()}</Text>
          {clientDisplayName ? (
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color="#6B7280" />
              <Text style={styles.infoLabel}>{t('quote.clientName')}</Text>
              <Text style={styles.infoValue}>{clientDisplayName}</Text>
            </View>
          ) : null}
          {providerDisplayName ? (
            <View style={styles.infoRow}>
              <Ionicons name="briefcase-outline" size={20} color="#6B7280" />
              <Text style={styles.infoLabel}>{t('quote.providerName')}</Text>
              <Text style={styles.infoValue}>{providerDisplayName}</Text>
            </View>
          ) : null}
        </View>

        {/* Service address */}
        {(address || serviceDate || durationText) ? (
          <View style={styles.section}>
            {address ? (
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={20} color="#6B7280" />
                <Text style={styles.infoLabel}>{t('quote.serviceAddress')}</Text>
                <Text style={styles.infoValue}>{address}</Text>
              </View>
            ) : null}
            {serviceDate ? (
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                <Text style={styles.infoLabel}>{t('quote.dateTime')}</Text>
                <Text style={styles.infoValue}>
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
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={20} color="#6B7280" />
                <Text style={styles.infoLabel}>{t('quote.estimatedDuration')}</Text>
                <Text style={styles.infoValue}>{durationText}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Notes */}
        {displayNotes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('quote.notes')}</Text>
            <Text style={styles.description}>{displayNotes}</Text>
          </View>
        ) : null}

        {/* Service Info */}
        <View style={styles.section}>
          <View style={styles.serviceHeader}>
            <Ionicons name="brush-outline" size={24} color="#3B82F6" />
            <Text style={styles.serviceTitle}>{order.service_name || t('orders.service')}</Text>
          </View>
          {quote.description ? (
            <Text style={styles.description}>{quote.description}</Text>
          ) : null}
        </View>

        {/* Line Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('quote.lineItems')}</Text>
          {quote.line_items.map((item, index) => (
            <View key={index} style={styles.lineItem}>
              <Text style={styles.lineItemName}>{item.description}</Text>
              <Text style={styles.lineItemPrice}>${Number(item.amount ?? 0).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Total */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('quote.subtotal')}</Text>
            <Text style={styles.totalValue}>${quote.subtotal.toFixed(2)}</Text>
          </View>
          {quote.tax > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('quote.tax')}</Text>
              <Text style={styles.totalValue}>${quote.tax.toFixed(2)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>{t('quote.total')}</Text>
            <Text style={styles.grandTotalValue}>${quote.total.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        {isClient && order.status === 'quoted' && (
          <>
            <TouchableOpacity
              style={styles.approveButton}
              onPress={handleApprove}
              disabled={approving || rejecting}
            >
              {approving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.approveButtonText}>{t('quote.approveAndPay')}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={handleReject}
              disabled={approving || rejecting}
            >
              {rejecting ? (
                <ActivityIndicator size="small" color="#6B7280" />
              ) : (
                <Text style={styles.rejectButtonText}>{t('quote.reject')}</Text>
              )}
            </TouchableOpacity>
          </>
        )}
        {isSupplier && (order.status === 'quoted' || order.status === 'pending') && (
          <>
            {order.status === 'quoted' && (
              <TouchableOpacity
                style={styles.approveButton}
                onPress={handleEditQuote}
                disabled={withdrawing}
              >
                <Text style={styles.approveButtonText}>{t('quote.editQuote')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={handleWithdrawQuote}
              disabled={withdrawing}
            >
              {withdrawing ? (
                <ActivityIndicator size="small" color="#6B7280" />
              ) : (
                <Text style={styles.rejectButtonText}>{t('quote.withdrawQuote')}</Text>
              )}
            </TouchableOpacity>
          </>
        )}
        {isSupplier && (order.status === 'accepted' || order.status === 'in_progress') && (
          <TouchableOpacity
            style={styles.rejectButton}
            onPress={handleCancelRequest}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator size="small" color="#6B7280" />
            ) : (
              <Text style={styles.rejectButtonText}>{t('quote.cancelRequest')}</Text>
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.chatBackButton} onPress={handleChatBack}>
          <Text style={styles.chatBackText}>{t('quote.chatBack')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 8,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 12,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  lineItemName: {
    fontSize: 14,
    color: '#374151',
  },
  lineItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
    minWidth: 100,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    marginLeft: 8,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateTimeText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  totalSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  totalValue: {
    fontSize: 14,
    color: '#1F2937',
  },
  grandTotalRow: {
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
    marginTop: 8,
    paddingTop: 12,
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10B981',
  },
  actions: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  approveButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  rejectButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rejectButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  chatBackButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chatBackText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});





