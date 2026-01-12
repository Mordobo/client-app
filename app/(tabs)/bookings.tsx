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
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

type TabType = 'active' | 'completed' | 'cancelled';

interface BookingCardProps {
  order: Order;
  onPress: () => void;
  onMessagePress: () => void;
  colorScheme: 'light' | 'dark' | null;
}

function BookingCard({ order, onPress, onMessagePress, colorScheme }: BookingCardProps) {
  const isDark = colorScheme === 'dark';
  const themeColors = Colors[isDark ? 'dark' : 'light'];

  const getStatusInfo = () => {
    switch (order.status) {
      case 'accepted':
        return { label: t('orders.status.confirmed'), color: '#10B981' };
      case 'pending':
        return { label: t('orders.status.pending'), color: '#F59E0B' };
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
      const displayMinutes = minutes.toString().padStart(2, '0');
      
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
      const displayMinutes = minutes.toString().padStart(2, '0');
      
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
            {order.supplier_id ? 'Proveedor' : 'Sin proveedor asignado'}
          </Text>
          <Text style={[styles.serviceName, { color: isDark ? '#9ca3af' : '#6B7280' }]}>
            Servicio #{order.id.slice(0, 8)}
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
            ${order.total_amount.toFixed(0)}
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
        
        <TouchableOpacity
          style={[styles.actionButton, styles.detailsButton, { backgroundColor: '#3B82F6' }]}
          onPress={onPress}
        >
          <Text style={[styles.actionButtonText, { color: '#fff' }]}>
            {t('orders.viewDetails')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function BookingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
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

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      switch (activeTab) {
        case 'active':
          return ['pending', 'accepted', 'in_progress'].includes(order.status);
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
    const active = orders.filter(o => ['pending', 'accepted', 'in_progress'].includes(o.status)).length;
    const completed = orders.filter(o => o.status === 'completed').length;
    const cancelled = orders.filter(o => o.status === 'cancelled').length;
    return { active, completed, cancelled };
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

  const tabs = [
    { id: 'active' as TabType, label: t('orders.active'), count: tabCounts.active },
    { id: 'completed' as TabType, label: t('orders.completed'), count: tabCounts.completed },
    { id: 'cancelled' as TabType, label: t('orders.cancelled'), count: tabCounts.cancelled },
  ];

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1a1a2e' : '#F9FAFB' }]}>
      <View style={[
        styles.header,
        {
          paddingTop: Math.max(insets.top, 16),
          backgroundColor: isDark ? '#252542' : '#FFFFFF',
          borderBottomColor: isDark ? '#374151' : '#E5E7EB',
        }
      ]}>
        <Text style={[styles.title, { color: isDark ? '#fff' : '#1F2937' }]}>
          {t('orders.title')}
        </Text>
        
        <View style={styles.tabsContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                activeTab === tab.id && { backgroundColor: '#3B82F6' },
                activeTab !== tab.id && {
                  backgroundColor: 'transparent',
                  borderWidth: 1,
                  borderColor: isDark ? '#374151' : '#E5E7EB',
                }
              ]}
              onPress={() => handleTabPress(tab.id)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === tab.id ? '#fff' : (isDark ? '#fff' : '#1F2937') },
                  activeTab === tab.id && styles.tabTextActive
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
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={isDark ? '#fff' : '#3B82F6'}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {filteredOrders.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title={t('orders.noBookings')}
              description={t('orders.noBookingsDesc')}
            />
          ) : (
            filteredOrders.map((order) => (
              <BookingCard
                key={order.id}
                order={order}
                onPress={() => handleOrderPress(order.id)}
                onMessagePress={() => handleMessagePress(order)}
                colorScheme={colorScheme}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
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
  tabText: {
    fontSize: 13,
    fontWeight: '400',
  },
  tabTextActive: {
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
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
