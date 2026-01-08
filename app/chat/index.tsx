import { Conversation, fetchConversations } from '@/services/conversations';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ConversationsListScreen() {
  const router = useRouter();
  const { colorScheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isDark = colorScheme === 'dark';
  const themeColors = {
    background: isDark ? '#151718' : '#F9FAFB',
    surface: isDark ? '#1F2937' : '#FFFFFF',
    textPrimary: isDark ? '#ECEDEE' : '#1F2937',
    textSecondary: isDark ? '#9BA1A6' : '#6B7280',
    border: isDark ? '#374151' : '#E5E7EB',
    borderLight: isDark ? '#4B5563' : '#F3F4F6',
    icon: isDark ? '#9BA1A6' : '#374151',
  };

  const loadConversations = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchConversations();
      setConversations(data);
    } catch (err) {
      setError('Failed to load conversations');
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={[styles.conversationItem, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.borderLight }]}
      onPress={() => handleConversationPress(item.id)}
    >
      <View style={styles.avatarContainer}>
        {item.other_user_image ? (
          <Image source={{ uri: item.other_user_image }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: themeColors.borderLight }]}>
            <Ionicons name="person" size={24} color={themeColors.textSecondary} />
          </View>
        )}
        {item.unread_count > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {item.unread_count > 9 ? '9+' : item.unread_count}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={[styles.userName, { color: themeColors.textPrimary }, item.unread_count > 0 && styles.userNameBold]}>
            {item.other_user_name}
          </Text>
          <Text style={[styles.timeText, { color: themeColors.textSecondary }]}>{formatTime(item.last_message_at)}</Text>
        </View>
        <Text
          style={[styles.lastMessage, { color: themeColors.textSecondary }, item.unread_count > 0 && { color: themeColors.textPrimary, fontWeight: '500' }]}
          numberOfLines={1}
        >
          {item.last_message || 'No messages yet'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16), backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
          <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Messages</Text>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16), backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
        <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Messages</Text>
      </View>

      {error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadConversations}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color={themeColors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>No conversations yet</Text>
          <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
            Start chatting with suppliers by visiting their profile
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10B981']} />
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
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listContent: {
    paddingVertical: 8,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
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
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#10B981',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
  },
  userNameBold: {
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12,
  },
  lastMessage: {
    fontSize: 14,
  },
  lastMessageBold: {
    fontWeight: '500',
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


