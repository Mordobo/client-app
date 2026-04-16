import { ProviderAvatar } from '@/components/ProviderAvatar';
import { useThemeColors } from '@/hooks/useThemeColors';
import { t } from '@/i18n';
import { Conversation, fetchConversations } from '@/services/conversations';
import { Ionicons } from '@expo/vector-icons';
import { PlatformFlashList } from '@/components/PlatformFlashList';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ConversationsListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.screenBackground,
        },
        header: {
          paddingHorizontal: 20,
          paddingBottom: 20,
          backgroundColor: colors.card,
        },
        headerTitle: {
          fontSize: 28,
          fontWeight: '700',
          color: colors.textPrimary,
        },
        centerContainer: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
          backgroundColor: colors.screenBackground,
        },
        listWrapper: {
          flex: 1,
          backgroundColor: colors.screenBackground,
        },
        listContent: {
          paddingHorizontal: 20,
          paddingVertical: 20,
          backgroundColor: colors.screenBackground,
        },
        conversationItem: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.cardBorder,
          backgroundColor: colors.screenBackground,
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
          backgroundColor: colors.surfaceSecondary,
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
          backgroundColor: '#10b981',
          borderColor: colors.screenBackground,
        },
        unreadBadge: {
          minWidth: 20,
          height: 20,
          borderRadius: 10,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 6,
          backgroundColor: colors.primary,
        },
        unreadBadgeCircular: {
          width: 20,
          minWidth: 20,
          paddingHorizontal: 0,
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
          color: colors.textPrimary,
        },
        userNameBold: {
          fontWeight: '600',
        },
        timeText: {
          fontSize: 12,
          textAlign: 'right',
          color: colors.textTertiary,
        },
        timeTextUnread: {
          color: colors.primary,
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
          color: colors.textTertiary,
        },
        lastMessageUnread: {
          color: colors.textPrimary,
          fontWeight: '500',
        },
        emptyTitle: {
          fontSize: 18,
          fontWeight: '600',
          marginTop: 16,
          color: colors.textPrimary,
        },
        emptySubtitle: {
          fontSize: 14,
          textAlign: 'center',
          marginTop: 8,
          paddingHorizontal: 40,
          color: colors.textTertiary,
        },
        errorText: {
          fontSize: 16,
          textAlign: 'center',
          marginBottom: 16,
          color: '#EF4444',
        },
        retryButton: {
          backgroundColor: colors.primary,
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
      }),
    [colors]
  );
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchConversations('client');
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

  // Refetch when returning from chat so unread count and list stay in sync (MDB-160 / MDB-244)
  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations])
  );

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
    const isOnline = false;
    const isLastItem = index === conversations.length - 1;
    
    return (
      <TouchableOpacity
        style={[styles.conversationItem, isLastItem && styles.conversationItemLast]}
        onPress={() => handleConversationPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <ProviderAvatar
            profileImage={item.other_user_image}
            size={56}
            rounded
            style={styles.avatar}
          />
          {isOnline && <View style={styles.onlineIndicator} />}
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
              style={[styles.lastMessage, item.unread_count > 0 && styles.lastMessageUnread]}
              numberOfLines={1}
            >
              {item.last_message || t('chat.noMessages')}
            </Text>
            {item.unread_count > 0 && (
              <View style={[styles.unreadBadge, item.unread_count < 10 && styles.unreadBadgeCircular]}>
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
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.headerTitle}>{t('chat.messages')}</Text>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
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
          <Ionicons name="chatbubbles-outline" size={64} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>{t('chat.noMessages')}</Text>
          <Text style={styles.emptySubtitle}>{t('chat.noMessagesDesc')}</Text>
        </View>
      ) : (
        <View style={styles.listWrapper}>
          <PlatformFlashList
            data={conversations}
            keyExtractor={(item) => item.id}
            renderItem={renderConversation}
            estimatedItemSize={estimatedItemSize}
            style={styles.listWrapper}
            contentContainerStyle={[styles.listContent, { paddingBottom: 20 + insets.bottom }]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
            }
          />
        </View>
      )}
    </View>
  );
}

