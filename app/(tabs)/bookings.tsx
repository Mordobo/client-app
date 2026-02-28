import { EmptyState } from '@/components/EmptyState';
import { t, getLocale } from '@/i18n';
import { fetchOrders, Order, OrderStatus } from '@/services/orders';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/theme';

type TabType = 'active' | 'completed' | 'cancelled';

interface BookingCardProps {
  order: Order;
  onPress: () => void;
  onMessagePress: () => void;
  onReviewQuote?: () => void;
  onPayPress?: () => void;
  colorScheme: 'light' | 'dark' | null;
}

function BookingCard({ order, onPress, onMessagePress, onReviewQuote, onPayPress, colorScheme }: BookingCardProps) {
  // Force dark mode for this screen (Bookings screen is always dark)
  const isDark = true;
  const themeColors = Colors[isDark ? 'dark' : 'light'];

  const getStatusInfo = () => {
    switch (order.status) {
      case 'accepted':
        return { label: t('orders.status.confirmed'), color: '#10B981' };
      case 'pending':
        return { label: t('orders.status.pending'), color: '#F59E0B' };
      case 'pending_payment':
        return { label: t('orders.status.pending_payment'), color: '#F59E0B' };
      case 'quoted':
        return { label: t('orders.status.quoteReceived'), color: '#8B5CF6' };
      case 'in_progress':
        return { label: t('orders.status.inProgress'), color: '#3B82F6' };
      case 'completed':
        return { label: t('orders.status.completed'), color: '#10B981' };
      case 'cancelled':
        return { label: t('orders.status.cancelled'), color: '#EF4444' };
      default:
        return { label: t('orders.status.pending'), color: '#F59E0B' };
    }
  };

  const getTimeInfo = () => {
    if (!order.scheduled_at) return '';
    
    const scheduledDate = new Date(order.scheduled_at);
    const now = new Date();
    const diffTime = scheduledDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return t('orders.daysAgo', { days: Math.abs(diffDays) });
    } else if (diffDays === 0) {
      return t('orders.today');
    } else if (diffDays === 1) {
      return t('orders.tomorrow');
    } else {
      return t('orders.inDays', { days: diffDays });
    }
  };

  const formatDateTime = () => {
    if (!order.scheduled_at) return '';
    
    const date = new Date(order.scheduled_at);
    const locale = getLocale();
    
    if (locale === 'es') {
      const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      
      const dayName = days[date.getDay()];
      const day = date.getDate();
      const month = months[date.getMonth()];
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
      
      return `${dayName}, ${day} ${month} • ${displayHours}:${displayMinutes} ${ampm}`;
    } else {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      
      const dayName = days[date.getDay()];
      const day = date.getDate();
      const month = months[date.getMonth()];
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
      
      return `${dayName}, ${day} ${month} • ${displayHours}:${displayMinutes} ${ampm}`;
    }
  };

  const statusInfo = getStatusInfo();
  const timeInfo = getTimeInfo();
  const dateTime = formatDateTime();

  return (
    <View style={[
      styles.bookingCard,
      { backgroundColor: isDark ? '#252542' : '#FFFFFF' },
      order.status === 'accepted' && { borderColor: '#10B98140', borderWidth: 1 }
    ]}>
      <View style={styles.bookingHeader}>
        <View style={[
          styles.statusBadge,
          { backgroundColor: `${statusInfo.color}20` }
        ]}>
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
        </View>
        {timeInfo && (
          <Text style={[styles.timeText, { color: isDark ? '#9ca3af' : '#6B7280' }]}>
            {timeInfo}
          </Text>
        )}
      </View>

      <View style={styles.bookingContent}>
        <View style={[
          styles.providerImage,
          { backgroundColor: isDark ? '#2d2d4a' : '#E5E7EB' }
        ]}>
          <Ionicons name="person" size={24} color={isDark ? '#9ca3af' : '#6B7280'} />
        </View>
        
        <View style={styles.bookingInfo}>
          <Text style={[styles.providerName, { color: isDark ? '#fff' : '#1F2937' }]}>
            {order.supplier_name || order.business_name || (order.supplier_id ? t('orders.provider') : t('orders.noProvider'))}
          </Text>
          <Text style={[styles.serviceName, { color: isDark ? '#9ca3af' : '#6B7280' }]}>
            {order.service_name || `${t('orders.service')} #${order.id.slice(0, 8)}`}
          </Text>
          {dateTime && (
            <View style={styles.dateTimeRow}>
              <Ionicons name="calendar-outline" size={14} color={isDark ? '#9ca3af' : '#6B7280'} />
              <Text style={[styles.dateTime, { color: isDark ? '#9ca3af' : '#6B7280' }]}>
                {dateTime}
              </Text>
            </View>
          )}
        </View>

        {order.total_amount && (
          <Text style={[styles.price, { color: '#F59E0B' }]}>
            ${typeof order.total_amount === 'number' ? order.total_amount.toFixed(0) : parseFloat(order.total_amount).toFixed(0)}
          </Text>
        )}
      </View>

      <View style={styles.bookingActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.messageButton, { backgroundColor: isDark ? '#2d2d4a' : '#F3F4F6' }]}
          onPress={onMessagePress}
        >
          <Ionicons name="chatbubble-outline" size={16} color={isDark ? '#fff' : '#1F2937'} />
          <Text style={[styles.actionButtonText, { color: isDark ? '#fff' : '#1F2937' }]}>
            {t('orders.message')}
          </Text>
        </TouchableOpacity>
        
        {order.status === 'quoted' && onReviewQuote ? (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#8B5CF6' }]}
            onPress={onReviewQuote}
          >
            <Ionicons name="document-text-outline" size={16} color="#fff" />
            <Text style={[styles.actionButtonText, { color: '#fff' }]}>
              {t('orders.reviewQuote')}
            </Text>
          </TouchableOpacity>
        ) : order.status === 'pending_payment' && onPayPress ? (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#10B981' }]}
            onPress={onPayPress}
          >
            <Ionicons name="card-outline" size={16} color="#fff" />
            <Text style={[styles.actionButtonText, { color: '#fff' }]}>
              {t('orders.completePayment')}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.detailsButton, { backgroundColor: '#3B82F6' }]}
            onPress={onPress}
          >
            <Text style={[styles.actionButtonText, { color: '#fff' }]}>
              {t('orders.viewDetails')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function BookingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  // Default to light theme if colorScheme is undefined or null
  const isDark = colorScheme === 'dark';
  const themeColors = Colors[isDark ? 'dark' : 'light'];

  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await fetchOrders();
      setOrders(data);
    } catch (error) {
      console.error('[Bookings] Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  }, []);

  // "Active" = only paid reservations (pending = waiting provider accept, accepted, in_progress). Unpaid (quoted, pending_payment) go to "Pending payment".
  const paidReservationStatuses = ['pending', 'accepted', 'in_progress'];
  const unpaidStatuses = ['quoted', 'pending_payment'];

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      switch (activeTab) {
        case 'active':
          return paidReservationStatuses.includes(order.status);
        case 'completed':
          return order.status === 'completed';
        case 'cancelled':
          return order.status === 'cancelled';
        default:
          return true;
      }
    });
  }, [orders, activeTab]);

  const tabCounts = useMemo(() => {
    const active = orders.filter(o => paidReservationStatuses.includes(o.status)).length;
    const completed = orders.filter(o => o.status === 'completed').length;
    const cancelled = orders.filter(o => o.status === 'cancelled').length;
    const pendingPaymentCount = orders.filter(o => unpaidStatuses.includes(o.status)).length;
    return { active, completed, cancelled, pendingPaymentCount };
  }, [orders]);

  const handleTabPress = (tab: TabType) => {
    setActiveTab(tab);
  };

  const handleOrderPress = (orderId: string) => {
    router.push(`/orders/${orderId}`);
  };

  const handleMessagePress = (order: Order) => {
    if (order.supplier_id) {
      router.push(`/booking/chat/${order.id}`);
    }
  };

  const handleReviewQuote = (orderId: string) => {
    router.push(`/booking/quote/${orderId}`);
  };

  const handlePayPress = (order: Order) => {
    const total = order.total_amount ?? 0;
    router.push({
      pathname: `/booking/payment/${order.id}`,
      params: { totalAmount: String(total) },
    });
  };

  const tabs = [
    { id: 'active' as TabType, label: t('orders.active'), count: tabCounts.active },
    { id: 'completed' as TabType, label: t('orders.completed'), count: tabCounts.completed },
    { id: 'cancelled' as TabType, label: t('orders.cancelled'), count: tabCounts.cancelled },
  ];

  const ordersPendingPayment = useMemo(
    () => orders.filter(o => unpaidStatuses.includes(o.status)),
    [orders],
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>
          {t('orders.title')}
        </Text>
        
        <View style={styles.tabsContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                activeTab === tab.id && styles.tabActive,
                activeTab !== tab.id && styles.tabInactive,
              ]}
              onPress={() => handleTabPress(tab.id)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.id ? styles.tabTextActive : styles.tabTextInactive,
                ]}
              >
                {tab.label} ({tab.count})
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#fff"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {ordersPendingPayment.length > 0 && (
            <View style={styles.pendingPaymentSection}>
              <Text style={styles.pendingPaymentTitle}>{t('orders.pendingPaymentSection')}</Text>
              <Text style={styles.pendingPaymentSubtitle}>{t('orders.pendingPaymentSectionSubtitle')}</Text>
              {ordersPendingPayment.map((order) => (
                <BookingCard
                  key={order.id}
                  order={order}
                  onPress={() => handleOrderPress(order.id)}
                  onMessagePress={() => handleMessagePress(order)}
                  onReviewQuote={order.status === 'quoted' ? () => handleReviewQuote(order.id) : undefined}
                  onPayPress={order.status === 'pending_payment' ? () => handlePayPress(order) : undefined}
                  colorScheme={colorScheme}
                />
              ))}
            </View>
          )}
          {filteredOrders.length === 0 && ordersPendingPayment.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title={t('orders.noBookings')}
              description={t('orders.noBookingsDesc')}
            />
          ) : filteredOrders.length === 0 ? null : (
            <>
              {ordersPendingPayment.length > 0 && <View style={styles.sectionDivider} />}
              <Text style={styles.reservationsSectionTitle}>{t('orders.reservationsSection')}</Text>
              {filteredOrders.map((order) => (
                <BookingCard
                  key={order.id}
                  order={order}
                  onPress={() => handleOrderPress(order.id)}
                  onMessagePress={() => handleMessagePress(order)}
                  onReviewQuote={order.status === 'quoted' ? () => handleReviewQuote(order.id) : undefined}
                  onPayPress={order.status === 'pending_payment' ? () => handlePayPress(order) : undefined}
                  colorScheme={colorScheme}
                />
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e', // Hardcode dark background like Home
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#252542',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
    color: '#FFFFFF',
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: '#3B82F6',
  },
  tabInactive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#374151',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '400',
  },
  tabTextActive: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tabTextInactive: {
    fontWeight: '400',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  pendingPaymentSection: {
    marginBottom: 16,
  },
  pendingPaymentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F59E0B',
    marginBottom: 4,
  },
  pendingPaymentSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 12,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 16,
  },
  reservationsSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  bookingCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12,
  },
  bookingContent: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
  },
  providerImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 14,
    marginBottom: 4,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateTime: {
    fontSize: 13,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
  },
  bookingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  messageButton: {
    // Styles handled inline
  },
  detailsButton: {
    // Styles handled inline
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
