import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
    ConversationDetail,
    fetchConversation,
    fetchConversationMessages,
    Message,
    sendConversationMessage,
} from '@/services/conversations';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const POLLING_INTERVAL = 5000; // 5 seconds

export default function ChatScreen() {
  const router = useRouter();
  const { colorScheme } = useTheme();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const flatListRef = useRef<FlatList>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const isDark = colorScheme === 'dark';
  const themeColors = {
    background: isDark ? '#151718' : '#F9FAFB',
    surface: isDark ? '#1F2937' : '#FFFFFF',
    textPrimary: isDark ? '#ECEDEE' : '#1F2937',
    textSecondary: isDark ? '#9BA1A6' : '#6B7280',
    border: isDark ? '#374151' : '#E5E7EB',
    borderLight: isDark ? '#4B5563' : '#F3F4F6',
    inputBg: isDark ? '#151718' : '#F3F4F6',
  };

  const loadMessages = useCallback(async (showLoading = true) => {
    if (!conversationId) return;
    
    try {
      if (showLoading) setError(null);
      const msgs = await fetchConversationMessages(conversationId);
      setMessages(msgs);
    } catch (err) {
      if (showLoading) setError('Failed to load messages');
      console.error('Error loading messages:', err);
    }
  }, [conversationId]);

  const loadConversation = useCallback(async () => {
    if (!conversationId) return;
    
    try {
      const conv = await fetchConversation(conversationId);
      setConversation(conv);
    } catch (err) {
      setError('Failed to load conversation');
      console.error('Error loading conversation:', err);
    }
  }, [conversationId]);

  useEffect(() => {
    const initChat = async () => {
      setLoading(true);
      await Promise.all([loadConversation(), loadMessages()]);
      setLoading(false);
    };

    initChat();

    // Start polling
    pollingRef.current = setInterval(() => {
      loadMessages(false);
    }, POLLING_INTERVAL);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [loadConversation, loadMessages]);

  const handleSend = async () => {
    if (!messageText.trim() || !conversationId || sending) return;

    const text = messageText.trim();
    setMessageText('');
    setSending(true);

    try {
      const newMessage = await sendConversationMessage(conversationId, text);
      setMessages((prev) => [...prev, newMessage]);
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.error('Error sending message:', err);
      setMessageText(text); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isMyMessage = (message: Message) => {
    return message.sender_id === user?.id;
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMine = isMyMessage(item);
    const showDate = index === 0 || 
      new Date(item.created_at).toDateString() !== new Date(messages[index - 1].created_at).toDateString();

    return (
      <View>
        {showDate && (
          <View style={styles.dateContainer}>
            <Text style={[styles.dateText, { color: themeColors.textSecondary, backgroundColor: themeColors.borderLight }]}>
              {new Date(item.created_at).toLocaleDateString([], {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
        )}
        <View style={[styles.messageBubbleContainer, isMine && styles.myMessageContainer]}>
          <View style={[styles.messageBubble, isMine ? styles.myMessage : [styles.theirMessage, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]]}>
            <Text style={[styles.messageText, { color: isMine ? '#FFFFFF' : themeColors.textPrimary }]}>
              {item.content}
            </Text>
            <Text style={[styles.messageTime, { color: isMine ? 'rgba(255, 255, 255, 0.7)' : themeColors.textSecondary }]}>
              {formatMessageTime(item.created_at)}
              {isMine && item.read && (
                <Text style={styles.readIndicator}> ✓✓</Text>
              )}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      </View>
    );
  }

  const otherUserName = user?.id === conversation?.client_id 
    ? conversation?.supplier_name 
    : conversation?.client_name;

  const otherUserImage = user?.id === conversation?.client_id
    ? conversation?.supplier_image
    : null;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12), backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themeColors.textPrimary} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          {otherUserImage ? (
            <Image source={{ uri: otherUserImage }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatarPlaceholder, { backgroundColor: themeColors.borderLight }]}>
              <Ionicons name="person" size={20} color={themeColors.textSecondary} />
            </View>
          )}
          <View>
            <Text style={[styles.headerName, { color: themeColors.textPrimary }]}>{otherUserName || 'Chat'}</Text>
            {conversation?.order_id && (
              <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>Order related</Text>
            )}
          </View>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadMessages()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons name="chatbubble-outline" size={48} color={themeColors.textSecondary} />
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No messages yet</Text>
            <Text style={[styles.emptySubtext, { color: themeColors.textSecondary }]}>Send a message to start the conversation</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Input */}
        <View style={[styles.inputContainer, { backgroundColor: themeColors.surface, borderTopColor: themeColors.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: themeColors.inputBg, color: themeColors.textPrimary }]}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type a message..."
            placeholderTextColor={themeColors.textSecondary}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!messageText.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!messageText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dateContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateText: {
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageBubbleContainer: {
    flexDirection: 'row',
    marginVertical: 2,
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  myMessage: {
    backgroundColor: '#10B981',
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  readIndicator: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
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


