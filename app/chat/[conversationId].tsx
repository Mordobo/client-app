import { useAuth } from '@/contexts/AuthContext';
import {
    ConversationDetail,
    fetchConversation,
    fetchConversationMessages,
    Message,
    sendConversationMessage,
} from '@/services/conversations';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const handleImagePicker = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('common.error'),
          t('chat.imagePickerPermissionDenied')
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        
        try {
          let dataUri: string;
          
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
            dataUri = `data:image/jpeg;base64,${base64Data}`;
          } else if (uri.startsWith('data:')) {
            dataUri = uri;
          } else {
            if (typeof FileSystem === 'undefined') {
              throw new Error('FileSystem is not available');
            }
            const base64 = await FileSystem.readAsStringAsync(uri, {
              encoding: 'base64',
            } as { encoding: 'base64' });
            // Determine MIME type from file extension
            const mimeType = uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
            dataUri = `data:${mimeType};base64,${base64}`;
          }
          
          // Check size (limit to ~10MB for base64)
          const sizeInMB = dataUri.length / (1024 * 1024);
          if (sizeInMB > 10) {
            Alert.alert(
              t('common.error'),
              t('chat.imageTooLarge')
            );
            return;
          }
          
          setSelectedImage(dataUri);
        } catch (error) {
          console.error('Error converting image to base64:', error);
          Alert.alert(t('common.error'), t('chat.imagePickerError'));
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('common.error'), t('chat.imagePickerError'));
    }
  };

  const handleSend = async () => {
    if ((!messageText.trim() && !selectedImage) || !conversationId || sending || uploadingImage) return;

    const text = messageText.trim();
    const imageToSend = selectedImage;
    
    setMessageText('');
    setSelectedImage(null);
    setSending(true);
    setUploadingImage(!!imageToSend);

    try {
      const newMessage = await sendConversationMessage(conversationId, {
        ...(text && { content: text }),
        ...(imageToSend && { imageBase64: imageToSend }),
      });
      setMessages((prev) => [...prev, newMessage]);
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.error('Error sending message:', err);
      setMessageText(text); // Restore message on error
      if (imageToSend) {
        setSelectedImage(imageToSend); // Restore image on error
      }
      Alert.alert(
        t('common.error'),
        imageToSend ? t('chat.imageUploadError') : 'Failed to send message'
      );
    } finally {
      setSending(false);
      setUploadingImage(false);
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
            <Text style={styles.dateText}>
              {formatDateDivider(item.created_at)}
            </Text>
          </View>
        )}
        <View style={[styles.messageBubbleContainer, isMine && styles.myMessageContainer]}>
          <View style={[styles.messageBubble, isMine ? styles.myMessage : styles.theirMessage]}>
            {item.image_url && (
              <TouchableOpacity
                style={styles.messageImageContainer}
                onPress={() => {
                  // TODO: Open image in full screen viewer
                  Alert.alert('Image', 'Tap to view full screen (to be implemented)');
                }}
              >
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.messageImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
            {item.content ? (
              <Text style={styles.messageText}>
                {item.content}
              </Text>
            ) : null}
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

  const otherUserName = user?.id === conversation?.client_id 
    ? conversation?.supplier_name 
    : conversation?.client_name;

  const otherUserImage = user?.id === conversation?.client_id
    ? conversation?.supplier_image
    : null;

  return (
    <View style={styles.container}>
      {/* Header - Exact match to JSX: padding: '50px 20px 16px', backgroundColor: colors.bgCard */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 20, 50) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        {otherUserImage ? (
          <Image source={{ uri: otherUserImage }} style={styles.headerAvatar} />
        ) : (
          <View style={styles.headerAvatarPlaceholder}>
            <Text style={styles.headerAvatarEmoji}>🧑‍🔧</Text>
          </View>
        )}
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{otherUserName || 'Chat'}</Text>
          <View style={styles.statusContainer}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>{t('chat.online')}</Text>
          </View>
        </View>
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
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Input Area - Exact match to JSX */}
        <View style={styles.inputContainer}>
          <TouchableOpacity 
            style={styles.attachButton}
            onPress={handleImagePicker}
            disabled={sending || uploadingImage}
          >
            <Ionicons name="attach-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          {selectedImage && (
            <View style={styles.selectedImageContainer}>
              <Image source={{ uri: selectedImage }} style={styles.selectedImagePreview} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setSelectedImage(null)}
              >
                <Ionicons name="close-circle" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
          <TextInput
            style={styles.input}
            value={messageText}
            onChangeText={setMessageText}
            placeholder={t('chat.messagePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={1000}
            editable={!sending && !uploadingImage}
          />
          <TouchableOpacity
            style={[styles.sendButton, ((!messageText.trim() && !selectedImage) || sending || uploadingImage) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={(!messageText.trim() && !selectedImage) || sending || uploadingImage}
          >
            {(sending || uploadingImage) ? (
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
  messageImageContainer: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    maxWidth: 250,
  },
  messageImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  selectedImageContainer: {
    position: 'relative',
    marginRight: 8,
  },
  selectedImagePreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.bgCard,
    borderRadius: 12,
  },
});


