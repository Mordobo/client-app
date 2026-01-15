import { Conversation, fetchConversations } from '@/services/conversations';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@/i18n';

export default function ConversationsListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchConversations();
      // Sort by most recent (last_message_at descending)
      // Handle null last_message_at by putting them at the end
      const sortedData = [...data].sort((a, b) => {
        // If both are null, maintain order
        if (!a.last_message_at && !b.last_message_at) {
          return 0;
        }
        // If a is null, put it after b
        if (!a.last_message_at) {
          return 1;
        }
        // If b is null, put it after a
        if (!b.last_message_at) {
          return -1;
        }
        // Both have dates, compare them
        const dateA = new Date(a.last_message_at).getTime();
        const dateB = new Date(b.last_message_at).getTime();
        // Check for invalid dates
        if (isNaN(dateA) || isNaN(dateB)) {
          return 0;
        }
        return dateB - dateA;
      });
      setConversations(sortedData);
    } catch (err) {
      setError(t('chat.failedToLoad'));
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadConversations();
  }, [loadConversations]);

  const handleConversationPress = (conversationId: string) => {
    router.push(`/chat/${conversationId}`);
  };

  const formatTime = (dateString: string | null) => {
    // Handle null or invalid dates
    if (!dateString) {
      const locale = t('chat.messages') === 'Mensajes' ? 'es' : 'en';
      return locale === 'es' ? 'Nuevo' : 'New';
    }
    
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      const locale = t('chat.messages') === 'Mensajes' ? 'es' : 'en';
      return locale === 'es' ? 'Nuevo' : 'New';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      // Less than 1 hour: show minutes
      if (diffMins < 1) {
        return t('orders.today');
      }
      // For Spanish: "Hace 5 min", for English: "5 min ago"
      const locale = t('chat.messages') === 'Mensajes' ? 'es' : 'en';
      return locale === 'es' ? `Hace ${diffMins} min` : `${diffMins} min ago`;
    } else if (diffDays === 0) {
      // Today: show time
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      // Yesterday
      const locale = t('chat.messages') === 'Mensajes' ? 'es' : 'en';
      return locale === 'es' ? 'Ayer' : 'Yesterday';
    } else if (diffDays < 7) {
      // This week: show days ago
      const locale = t('chat.messages') === 'Mensajes' ? 'es' : 'en';
      return locale === 'es' ? `Hace ${diffDays} días` : `${diffDays} days ago`;
    } else if (diffDays < 14) {
      // 1 week ago
      const locale = t('chat.messages') === 'Mensajes' ? 'es' : 'en';
      return locale === 'es' ? 'Hace 1 semana' : '1 week ago';
    } else {
      // Older: show date
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const renderConversation = ({ item, index }: { item: Conversation; index: number }) => {
    // For now, we'll show online status randomly or based on last activity
    // In a real app, this would come from the backend
    const isOnline = false; // TODO: Get from backend when available
    const isLastItem = index === conversations.length - 1;
    
    return (
      <TouchableOpacity
        style={[
          styles.conversationItem, 
          isLastItem && styles.conversationItemLast
        ]}
        onPress={() => handleConversationPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          {item.other_user_image ? (
            <Image source={{ uri: item.other_user_image }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarEmoji}>👨‍🔧</Text>
            </View>
          )}
          {isOnline && (
            <View style={styles.onlineIndicator} />
          )}
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.userName, item.unread_count > 0 && styles.userNameBold]}>
              {item.other_user_name}
            </Text>
            <Text style={[styles.timeText, item.unread_count > 0 && styles.timeTextUnread]}>
              {formatTime(item.last_message_at)}
            </Text>
          </View>
          <View style={styles.lastMessageRow}>
            <Text
              style={[
                styles.lastMessage,
                item.unread_count > 0 && styles.lastMessageUnread,
              ]}
              numberOfLines={1}
            >
              {item.last_message || t('chat.noMessages')}
            </Text>
            {item.unread_count > 0 && (
              <View style={[
                styles.unreadBadge, 
                item.unread_count < 10 && styles.unreadBadgeCircular
              ]}>
                <Text style={styles.unreadText}>
                  {item.unread_count > 9 ? '9+' : item.unread_count}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const estimatedItemSize = useMemo(() => 84, []); // 14px padding top + 14px padding bottom + 56px avatar = ~84px

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 50) }]}>
          <Text style={styles.headerTitle}>{t('chat.messages')}</Text>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { 
        paddingTop: Math.max(insets.top + 20, 50), 
      }]}>
        <Text style={styles.headerTitle}>{t('chat.messages')}</Text>
      </View>

      {error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadConversations}>
            <Text style={styles.retryText}>{t('chat.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyTitle}>{t('chat.noMessages')}</Text>
          <Text style={styles.emptySubtitle}>
            {t('chat.noMessagesDesc')}
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1, backgroundColor: '#1a1a2e' }}>
          <FlashList
            data={conversations}
            keyExtractor={(item) => item.id}
            renderItem={renderConversation}
            estimatedItemSize={estimatedItemSize}
            style={{ flex: 1, backgroundColor: '#1a1a2e' }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20, backgroundColor: '#1a1a2e' }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />
            }
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e', // Hardcode dark background like Home
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: '#252542', // Hardcode dark header
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF', // Hardcode white text
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1a1a2e', // Hardcode dark background
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e', // Hardcode dark background for list container
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 0,
    backgroundColor: '#1a1a2e', // Hardcode dark background for list
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#374151', // Hardcode dark border
    backgroundColor: '#1a1a2e', // Hardcode dark background for each item
  },
  conversationItemLast: {
    borderBottomWidth: 0,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#252542', // Hardcode dark header background
  },
  avatarEmoji: {
    fontSize: 24,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    backgroundColor: '#10b981', // Hardcode secondary color
    borderColor: '#1a1a2e', // Hardcode dark background
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    backgroundColor: '#3b82f6', // Hardcode primary color
  },
  unreadBadgeCircular: {
    width: 20,
    minWidth: 20,
    paddingHorizontal: 0,
    borderRadius: 10, // Keep circular shape
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF', // Hardcode white text
  },
  userNameBold: {
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12,
    textAlign: 'right',
    color: '#9ca3af', // Hardcode secondary text
  },
  timeTextUnread: {
    color: '#3b82f6', // Hardcode primary color for unread
  },
  lastMessageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
    maxWidth: 200,
    color: '#9ca3af', // Hardcode secondary text
  },
  lastMessageUnread: {
    color: '#FFFFFF', // Hardcode white text for unread
    fontWeight: '500',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    color: '#FFFFFF', // Hardcode white text
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
    color: '#9ca3af', // Hardcode secondary text
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    color: '#EF4444', // Hardcode error color
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});


