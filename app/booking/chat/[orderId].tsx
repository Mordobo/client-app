import { useAuth } from '@/contexts/AuthContext';
import { ApiError, fetchMessages, Message, sendMessage } from '@/services/messages';
import { fetchOrderDetail } from '@/services/orders';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Linking,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@/i18n';

const POLLING_INTERVAL = 5000; // 5 seconds

// Colors from JSX design
const colors = {
  bg: '#1a1a2e',
  bgCard: '#252542',
  bgInput: '#2d2d4a',
  primary: '#3b82f6',
  secondary: '#10b981',
  textSecondary: '#9ca3af',
  border: '#374151',
};

export default function ChatScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [providerName, setProviderName] = useState<string>('Provider');
  const [providerImage, setProviderImage] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadMessages = useCallback(async (showLoading = true) => {
    if (!orderId) return;
    
    try {
      if (showLoading) setError(null);
      const data = await fetchMessages(orderId);
      setMessages(data.reverse());
    } catch (err) {
      if (showLoading) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load messages');
        }
      }
      console.error('Error loading messages:', err);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) {
      const initChat = async () => {
        setLoading(true);
        
        // Load order details to get provider info
        try {
          const orderDetails = await fetchOrderDetail(orderId);
          // Use supplier object if available (has more complete info)
          if (orderDetails.supplier) {
            setProviderName(orderDetails.supplier.full_name || orderDetails.supplier.business_name || 'Provider');
            setProviderImage(orderDetails.supplier.profile_image || null);
          } else if (orderDetails.order) {
            // Fallback to order fields if supplier object not available
            setProviderName(orderDetails.order.supplier_name || orderDetails.order.business_name || 'Provider');
            setProviderImage(null);
          }
        } catch (err) {
          console.error('Error loading order details:', err);
          // Continue anyway with default provider name
        }
        
        await loadMessages();
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
    }
  }, [orderId, loadMessages]);

  // Handle keyboard show/hide to scroll to bottom and reset position
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        // Force layout update when keyboard hides to reset position
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 100);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const handleSend = async () => {
    if (!messageText.trim() || !orderId || sending) return;

    const text = messageText.trim();
    setMessageText('');
    setSending(true);

    try {
      const newMessage = await sendMessage(orderId, { content: text });
      setMessages((prev) => [...prev, newMessage]);
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.error('Error sending message:', err);
      setMessageText(text); // Restore message on error
      if (err instanceof ApiError) {
        Alert.alert(t('common.error'), err.message);
      }
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateDivider = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return t('chat.today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('chat.yesterday');
    } else {
      return date.toLocaleDateString([], {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const isMyMessage = (message: Message) => {
    return message.sender_type === 'client' && message.sender_id === user?.id;
  };

  const handleCall = () => {
    // For booking chat, we don't have supplier phone directly
    // This would need to be fetched from order details
    Alert.alert(
      t('chat.callProvider'),
      t('chat.phoneNumberNotAvailable')
    );
  };

  const handleAttachImage = async () => {
    console.log('[Booking Chat] handleAttachImage called', { orderId, sending });
    
    if (sending) {
      console.log('[Booking Chat] Already sending, ignoring attach request');
      return;
    }
    
    try {
      console.log('[Booking Chat] Requesting media library permissions...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('[Booking Chat] Permission status:', status);
      if (status !== 'granted') {
        Alert.alert(
          t('common.error'),
          t('chat.imagePermissionDenied')
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        
        try {
          let imageDataUri: string;
          
          if (Platform.OS === 'web' && uri.startsWith('blob:')) {
            const response = await fetch(uri);
            const blob = await response.blob();
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve, reject) => {
              reader.onloadend = () => {
                const base64 = reader.result as string;
                const base64Data = base64.split(',')[1] || base64;
                resolve(base64Data);
              };
              reader.onerror = reject;
            });
            reader.readAsDataURL(blob);
            const base64Data = await base64Promise;
            imageDataUri = `data:image/jpeg;base64,${base64Data}`;
          } else if (uri.startsWith('data:')) {
            imageDataUri = uri;
          } else {
            if (typeof FileSystem === 'undefined') {
              throw new Error('FileSystem is not available');
            }
            const base64 = await FileSystem.readAsStringAsync(uri, {
              encoding: 'base64',
            } as { encoding: 'base64' });
            imageDataUri = `data:image/jpeg;base64,${base64}`;
          }
          
          // Send image as message
          if (!orderId || sending) return;
          
          setSending(true);
          try {
            // Send image data URI as content (backend may need to be updated to handle this)
            const newMessage = await sendMessage(orderId, { content: imageDataUri });
            setMessages((prev) => [...prev, newMessage]);
            
            // Scroll to bottom
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          } catch (err) {
            console.error('Error sending image:', err);
            Alert.alert(
              t('common.error'),
              t('chat.imageSelectionFailed')
            );
          } finally {
            setSending(false);
          }
        } catch (error) {
          console.error('Error converting image to base64:', error);
          Alert.alert(t('common.error'), t('chat.imageSelectionFailed'));
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('common.error'), t('chat.imageSelectionFailed'));
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMine = isMyMessage(item);
    const showDate = index === 0 || 
      new Date(item.created_at).toDateString() !== new Date(messages[index - 1].created_at).toDateString();

    return (
      <View>
        {showDate && (
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>
              {formatDateDivider(item.created_at)}
            </Text>
          </View>
        )}
        <View style={[styles.messageBubbleContainer, isMine && styles.myMessageContainer]}>
          <View style={[styles.messageBubble, isMine ? styles.myMessage : styles.theirMessage]}>
            <Text style={styles.messageText}>
              {item.content}
            </Text>
            <Text style={[styles.messageTime, isMine && styles.myMessageTime]}>
              {formatMessageTime(item.created_at)}
            </Text>
          </View>
        </View>
      </View>
    );
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

  return (
    <View style={styles.container}>
      {/* Header - Exact match to JSX: padding: '50px 20px 16px', backgroundColor: colors.bgCard */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        {providerImage ? (
          <Image source={{ uri: providerImage }} style={styles.headerAvatar} />
        ) : (
          <View style={styles.headerAvatarPlaceholder}>
            <Text style={styles.headerAvatarEmoji}>🧑‍🔧</Text>
          </View>
        )}
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{providerName}</Text>
          <View style={styles.statusContainer}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>{t('chat.online')}</Text>
          </View>
        </View>

        <TouchableOpacity onPress={handleCall} style={styles.callButton}>
          <Ionicons name="call" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 80 : 0}
        enabled={Platform.OS === 'ios'}
      >
        {error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadMessages()}>
              <Text style={styles.retryText}>{t('chat.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons name="chatbubble-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>{t('chat.noMessages')}</Text>
            <Text style={styles.emptySubtext}>{t('chat.noMessagesDesc')}</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            onLayout={() => {
              if (!keyboardVisible) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
          />
        )}

        {/* Input Area - Exact match to JSX */}
        <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity 
            style={styles.attachButton}
            onPress={handleAttachImage}
            disabled={sending}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="attach-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={messageText}
            onChangeText={setMessageText}
            placeholder={t('chat.messagePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={1000}
            onFocus={() => {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!messageText.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!messageText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
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
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  // Header - Exact match to JSX
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.bgCard,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  headerAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bgInput,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarEmoji: {
    fontSize: 20,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
  },
  statusText: {
    fontSize: 12,
    color: colors.secondary,
  },
  callButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  messagesList: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  // Date Divider - Exact match to JSX: backgroundColor: #252542
  dateContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    fontSize: 12,
    color: colors.textSecondary,
    backgroundColor: colors.bgCard,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  // Message Bubbles - Exact match to JSX border radius
  messageBubbleContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  // User message: borderRadius: '16px 16px 4px 16px'
  myMessage: {
    backgroundColor: colors.primary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 16,
  },
  // Provider message: borderRadius: '16px 16px 16px 4px'
  theirMessage: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
    color: colors.textSecondary,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  // Input Area - Exact match to JSX
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 16,
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bgInput,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderRadius: 24, // Exact match to JSX: borderRadius: '24px'
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#FFFFFF',
    backgroundColor: colors.bgInput,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22, // Circular
    backgroundColor: colors.primary, // Primary color
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
    color: '#FFFFFF',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.primary,
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
