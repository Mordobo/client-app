import { Conversation, fetchConversations } from '@/services/conversations';
import { useTheme } from '@/contexts/ThemeContext';
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
  const { colorScheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Exact colors from JSX
  const isDark = colorScheme === 'dark';
  const themeColors = {
    background: isDark ? '#1a1a2e' : '#F9FAFB',
    bgCard: isDark ? '#252542' : '#FFFFFF',
    textPrimary: isDark ? '#FFFFFF' : '#1F2937',
    textSecondary: isDark ? '#9ca3af' : '#6B7280',
    border: isDark ? '#374151' : '#E5E7EB',
    primary: '#3b82f6',
    secondary: '#10b981',
  };

  const loadConversations = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await fetchConversations();
      // Sort by most recent (last_message_at descending)
      const sortedData = [...data].sort((a, b) => {
        const dateA = new Date(a.last_message_at).getTime();
        const dateB = new Date(b.last_message_at).getTime();
        return dateB - dateA;
      });
      setConversations(sortedData);
    } catch (err) {
      console.error('[Chat] Error loading conversations:', err);
      
      // Provide more specific error messages
      let errorMessage = t('chat.failedToLoad');
      if (err instanceof Error) {
        // Check for specific error types
        if (err.message.includes('Network') || err.message.includes('connection')) {
          errorMessage = t('errors.connectionFailed') || 'Connection failed. Please check your internet.';
        } else if (err.message.includes('timeout') || err.message.includes('Timeout')) {
          errorMessage = t('errors.requestTimeout') || 'Request timed out. Please try again.';
        } else if (err.message.includes('401') || err.message.includes('403') || err.message.includes('Session')) {
          errorMessage = 'Session expired. Please log in again.';
        } else {
          // Use the error message if it's informative
          errorMessage = err.message || errorMessage;
        }
      }
      
      setError(errorMessage);
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      if (diffMins < 1) {
        return t('orders.today');
      }
      const locale = t('chat.messages') === 'Mensajes' ? 'es' : 'en';
      return locale === 'es' ? `Hace ${diffMins} min` : `${diffMins} min ago`;
    } else if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      const locale = t('chat.messages') === 'Mensajes' ? 'es' : 'en';
      return locale === 'es' ? 'Ayer' : 'Yesterday';
    } else if (diffDays < 7) {
      const locale = t('chat.messages') === 'Mensajes' ? 'es' : 'en';
      return locale === 'es' ? `Hace ${diffDays} días` : `${diffDays} days ago`;
    } else if (diffDays < 14) {
      const locale = t('chat.messages') === 'Mensajes' ? 'es' : 'en';
      return locale === 'es' ? 'Hace 1 semana' : '1 week ago';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const renderConversation = ({ item, index }: { item: Conversation; index: number }) => {
    const isOnline = false; // TODO: Get from backend when available
    // Border only on first 4 items (i < 4) as per JSX
    const showBorder = index < 4;
    
    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          { borderBottomColor: themeColors.border },
          !showBorder && styles.conversationItemNoBorder
        ]}
        onPress={() => handleConversationPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          {item.other_user_image ? (
            <Image source={{ uri: item.other_user_image }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: themeColors.bgCard }]}>
              <Text style={styles.avatarEmoji}>👨‍🔧</Text>
            </View>
          )}
          {isOnline && (
            <View style={[styles.onlineIndicator, { 
              backgroundColor: themeColors.secondary, 
              borderColor: themeColors.background 
            }]} />
          )}
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.userName, { color: themeColors.textPrimary }]}>
              {item.other_user_name}
            </Text>
            <Text style={[styles.timeText, { 
              color: item.unread_count > 0 ? themeColors.primary : themeColors.textSecondary 
            }]}>
              {formatTime(item.last_message_at)}
            </Text>
          </View>
          <View style={styles.lastMessageRow}>
            <Text
              style={[styles.lastMessage, { color: themeColors.textSecondary }]}
              numberOfLines={1}
            >
              {item.last_message || t('chat.noMessages')}
            </Text>
            {item.unread_count > 0 && (
              <View style={[
                styles.unreadBadge, 
                { backgroundColor: themeColors.primary },
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

  const estimatedItemSize = useMemo(() => 84, []);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={[styles.header, { 
          paddingTop: Math.max(insets.top + 20, 50),
          backgroundColor: themeColors.bgCard 
        }]}>
          <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>
            {t('chat.messages')}
          </Text>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header - Exact match to JSX: padding: '50px 20px 20px', backgroundColor: colors.bgCard */}
      <View style={[styles.header, { 
        paddingTop: Math.max(insets.top + 20, 50),
        backgroundColor: themeColors.bgCard 
      }]}>
        <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>
          {t('chat.messages')}
        </Text>
      </View>

      {error ? (
        <View style={styles.centerContainer}>
          <Text style={[styles.errorText, { color: '#EF4444' }]}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadConversations}>
            <Text style={styles.retryText}>{t('chat.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color={themeColors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>
            {t('chat.noMessages')}
          </Text>
          <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
            {t('chat.noMessagesDesc')}
          </Text>
        </View>
      ) : (
        <FlashList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          estimatedItemSize={estimatedItemSize}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[themeColors.primary]} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header: padding: '50px 20px 20px' from JSX (50px top, 20px horizontal, 20px bottom)
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    // paddingTop will be set dynamically with safe area
  },
  // Title: fontSize: '28px', fontWeight: '700' from JSX
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  // List: padding: '20px' from JSX
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  // Item: gap: '14px', padding: '14px 0' from JSX - gap must be exact
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14, // Exact gap from JSX
    paddingVertical: 14,
    paddingHorizontal: 0, // No horizontal padding on item itself
    borderBottomWidth: 1,
  },
  conversationItemNoBorder: {
    borderBottomWidth: 0,
  },
  avatarContainer: {
    position: 'relative',
  },
  // Avatar: width: '56px', height: '56px', borderRadius: '50%' from JSX
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
  },
  avatarEmoji: {
    fontSize: 24,
  },
  // Online indicator: width: '14px', height: '14px', bottom: '2px', right: '2px', border: '3px solid' from JSX
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
  },
  // Badge: minWidth: '20px', height: '20px', borderRadius: '50%', fontSize: '11px', fontWeight: '600' from JSX
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
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
  // Header row: marginBottom: '4px' from JSX
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  // Name: fontSize: '16px', fontWeight: '600' from JSX
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Time: fontSize: '12px' from JSX
  timeText: {
    fontSize: 12,
  },
  lastMessageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // Message: fontSize: '14px', maxWidth: '200px' from JSX
  lastMessage: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
    maxWidth: 200,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
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
