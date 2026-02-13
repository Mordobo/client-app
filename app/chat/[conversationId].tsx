import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { t } from '@/i18n';
import {
    ConversationDetail,
    fetchConversation,
    fetchConversationMessages,
    Message,
    sendConversationMessage,
} from '@/services/conversations';
import { fetchOrderDetail, Order, OrderStatus } from '@/services/orders';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Client UI colors (original design)
const clientColors = {
  bg: '#1a1a2e',
  bgCard: '#252542',
  bgInput: '#2d2d4a',
  primary: '#3b82f6',
  secondary: '#10b981',
  textSecondary: '#9ca3af',
  border: '#374151',
};

const POLLING_INTERVAL = 5000;

// Design colors from provider-communication-preview.jsx
const colors = {
  bg: '#12121A',
  headerCard: '#1E1B2E',
  border: 'rgba(61, 51, 112, 0.3)',
  sentGradient: ['#6366F1', '#8B5CF6'],
  receivedBubble: '#1E1B2E',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.8)',
  textMuted: 'rgba(255,255,255,0.3)',
  textMuted40: 'rgba(255,255,255,0.4)',
  inputBg: '#1E1B2E',
  avatarBg: 'rgba(61, 51, 112, 0.5)',
  jobBannerBg: 'rgba(139, 92, 246, 0.15)',
  jobBannerBorder: 'rgba(139, 92, 246, 0.3)',
  statusGreen: '#22C55E',
  chipBg: 'rgba(255,255,255,0.05)',
};

const ACTIVE_ORDER_STATUSES: OrderStatus[] = ['pending', 'accepted', 'in_progress'];

function isImageContent(content: string): boolean {
  return content.startsWith('data:image/') || /^https?:\/\/.+(\.(jpg|jpeg|png|gif|webp)|image)/i.test(content);
}

export default function ChatScreen() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { user } = useAuth();
  const { mode } = useMode();
  const insets = useSafeAreaInsets();
  const isProvider = mode === 'provider';

  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [expandedImageUri, setExpandedImageUri] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetKeyboardLayout = useCallback(() => {
    setKeyboardVisible(false);
    if (Platform.OS === 'android') setKeyboardHeight(0);
  }, []);

  const loadMessages = useCallback(
    async (showLoading = true) => {
      if (!conversationId || conversationId === 'demo') return;
      try {
        if (showLoading) setError(null);
        const msgs = await fetchConversationMessages(conversationId);
        setMessages(msgs);
      } catch (err) {
        if (showLoading) setError(t('chat.failedToLoad'));
      }
    },
    [conversationId]
  );

  const loadConversation = useCallback(async () => {
    if (!conversationId || conversationId === 'demo') return;
    try {
      const conv = await fetchConversation(conversationId);
      setConversation(conv);
      if (conv.order_id) {
        try {
          const detail = await fetchOrderDetail(conv.order_id);
          const order = detail.order;
          if (ACTIVE_ORDER_STATUSES.includes(order.status)) {
            setActiveOrder(order);
          }
        } catch {
          setActiveOrder(null);
        }
      } else {
        setActiveOrder(null);
      }
    } catch (err) {
      setError(t('chat.failedToLoad'));
    }
  }, [conversationId]);

  useEffect(() => {
    if (conversationId === 'demo') {
      setLoading(false);
      setConversation(null);
      setActiveOrder(null);
      setMessages([]);
      return;
    }
    const initChat = async () => {
      setLoading(true);
      await Promise.all([loadConversation(), loadMessages()]);
      setLoading(false);
    };
    initChat();
    pollingRef.current = setInterval(() => loadMessages(false), POLLING_INTERVAL);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [conversationId, loadConversation, loadMessages]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardVisible(true);
        if (Platform.OS === 'android') {
          setKeyboardHeight(e.endCoordinates.height);
        }
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        if (Platform.OS === 'android') {
          // Delay reset so layout runs after keyboard animation; fixes elevated chat (MDB-150)
          setTimeout(() => setKeyboardHeight(0), 150);
        }
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSend = async () => {
    if (!messageText.trim() || sending) return;
    if (conversationId === 'demo') {
      setMessages((prev) => [
        ...prev,
        {
          id: `demo-${Date.now()}`,
          conversation_id: 'demo',
          order_id: null,
          sender_type: 'client',
          sender_id: user?.id ?? 'me',
          receiver_type: 'supplier',
          receiver_id: 'other',
          content: messageText.trim(),
          read: false,
          created_at: new Date().toISOString(),
        },
      ]);
      setMessageText('');
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      return;
    }
    if (!conversationId) return;
    const text = messageText.trim();
    setMessageText('');
    setSending(true);
    try {
      const newMessage = await sendConversationMessage(conversationId, text);
      setMessages((prev) => [...prev, newMessage]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      setMessageText(text);
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
    if (date.toDateString() === today.toDateString()) return t('chat.today');
    if (date.toDateString() === yesterday.toDateString()) return t('chat.yesterday');
    return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const isMyMessage = (message: Message) => message.sender_id === user?.id;

  const handleCall = () => {
    if (conversationId === 'demo') return;
    const phone = conversation?.supplier_phone_number;
    if (!phone) {
      Alert.alert(t('chat.callProvider'), t('chat.phoneNumberNotAvailable'));
      return;
    }
    Linking.openURL(`tel:${phone.replace(/\s/g, '')}`).catch(() =>
      Alert.alert(t('common.error'), t('chat.couldNotOpenDialer'))
    );
  };

  const handleAttachImage = async () => {
    if (sending) return;
    if (conversationId === 'demo') {
      Alert.alert(t('common.error'), t('chat.noMessagesDesc'));
      return;
    }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('chat.imagePermissionDenied'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (result.canceled || !result.assets[0]) return;
      const uri = result.assets[0].uri;
      let imageDataUri: string;
      if (Platform.OS === 'web' && uri.startsWith('blob:')) {
        const response = await fetch(uri);
        const blob = await response.blob();
        const reader = new FileReader();
        imageDataUri = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve((reader.result as string) || '');
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else if (uri.startsWith('data:')) {
        imageDataUri = uri;
      } else {
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' } as { encoding: 'base64' });
        imageDataUri = `data:image/jpeg;base64,${base64}`;
      }
      if (!conversationId || sending) return;
      setSending(true);
      try {
        const newMessage = await sendConversationMessage(conversationId, imageDataUri);
        setMessages((prev) => [...prev, newMessage]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      } catch (err) {
        Alert.alert(t('common.error'), t('chat.imageSelectionFailed'));
      } finally {
        setSending(false);
      }
    } catch (err) {
      Alert.alert(t('common.error'), t('chat.imageSelectionFailed'));
    }
  };

  const handleQuickAction = (key: string) => {
    if (key === 'Foto') handleAttachImage();
    else if (key === 'Ubicación' || key === 'Cotización' || key === 'Agendar') {
      // Placeholder: could open location picker, quote flow, or schedule
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }, list: Message[]) => {
    const isMine = isMyMessage(item);
    const prevItem = list[index - 1];
    const showDate =
      index === 0 ||
      !prevItem ||
      new Date(item.created_at).toDateString() !== new Date(prevItem.created_at).toDateString();
    const isImage = isImageContent(item.content);

    return (
      <View>
        {showDate && (
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{formatDateDivider(item.created_at)}</Text>
          </View>
        )}
        <View style={[styles.messageRow, isMine && styles.messageRowMine]}>
          {!isMine && (
            <View style={styles.avatarSmall}>
              <Text style={styles.avatarSmallEmoji}>👩</Text>
            </View>
          )}
          <View style={[styles.bubbleWrapper, isMine && styles.bubbleWrapperMine]}>
            {isImage ? (
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => setExpandedImageUri(item.content)}
                style={[styles.bubble, isMine ? styles.bubbleSent : styles.bubbleReceived]}
              >
                <Image source={{ uri: item.content }} style={styles.imageInBubble} resizeMode="cover" />
              </TouchableOpacity>
            ) : (
              <View style={[styles.bubble, isMine ? styles.bubbleSent : styles.bubbleReceived]}>
                <Text style={[styles.bubbleText, isMine && styles.bubbleTextSent]}>{item.content}</Text>
              </View>
            )}
            <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeRight]}>
              {formatMessageTime(item.created_at)}
              {isMine && (item.read ? ' ✓✓' : ' ✓')}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const otherUserName =
    conversationId === 'demo'
      ? 'Ana Martínez'
      : user?.id === conversation?.client_id
        ? conversation?.supplier_name
        : conversation?.client_name;
  const otherUserImage =
    conversationId === 'demo' ? null : user?.id === conversation?.client_id ? conversation?.supplier_image : null;
  const isDemo = conversationId === 'demo';

  if (loading && !isDemo) {
    return (
      <View
        style={[
          isProvider ? styles.container : clientStyles.container,
          isProvider ? styles.centerContainer : clientStyles.centerContainer,
        ]}
      >
        <ActivityIndicator size="large" color={isProvider ? '#8B5CF6' : clientColors.primary} />
      </View>
    );
  }

  const displayMessages = isDemo
    ? [
        {
          id: '1',
          conversation_id: 'demo',
          order_id: null,
          sender_type: 'supplier' as const,
          sender_id: 'other',
          receiver_type: 'client' as const,
          receiver_id: 'me',
          content: 'Hola Juan, ¿ya vienes en camino?',
          read: true,
          created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        },
        {
          id: '2',
          conversation_id: 'demo',
          order_id: null,
          sender_type: 'client' as const,
          sender_id: user?.id ?? 'me',
          receiver_type: 'supplier' as const,
          receiver_id: 'other',
          content: '¡Hola Ana! Sí, estoy a unos 15 minutos de llegar',
          read: true,
          created_at: new Date(Date.now() - 13 * 60 * 1000).toISOString(),
        },
        {
          id: '3',
          conversation_id: 'demo',
          order_id: null,
          sender_type: 'supplier' as const,
          sender_id: 'other',
          receiver_type: 'client' as const,
          receiver_id: 'me',
          content: 'Perfecto, te abro la puerta del edificio. Es el depto 402',
          read: true,
          created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
        },
        {
          id: '4',
          conversation_id: 'demo',
          order_id: null,
          sender_type: 'client' as const,
          sender_id: user?.id ?? 'me',
          receiver_type: 'supplier' as const,
          receiver_id: 'other',
          content: '¡Perfecto! Ya casi llego 👍',
          read: false,
          created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        },
      ]
    : messages;

  const jobStatusLabel = activeOrder
    ? activeOrder.status === 'in_progress'
      ? t('chat.jobBannerInProgress')
      : activeOrder.status === 'accepted'
        ? t('chat.jobBannerScheduled')
        : t('chat.jobBannerPending')
    : '';

  const renderClientMessage = ({ item, index }: { item: Message; index: number }, list: Message[]) => {
    const isMine = isMyMessage(item);
    const prevItem = list[index - 1];
    const showDate =
      index === 0 ||
      !prevItem ||
      new Date(item.created_at).toDateString() !== new Date(prevItem.created_at).toDateString();
    const isImage = isImageContent(item.content);
    return (
      <View>
        {showDate && (
          <View style={clientStyles.dateContainer}>
            <Text style={clientStyles.dateText}>{formatDateDivider(item.created_at)}</Text>
          </View>
        )}
        <View style={[clientStyles.messageBubbleContainer, isMine && clientStyles.myMessageContainer]}>
          <View style={[clientStyles.messageBubble, isMine ? clientStyles.myMessage : clientStyles.theirMessage]}>
            {isImage ? (
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => setExpandedImageUri(item.content)}
                style={clientStyles.imageWrap}
              >
                <Image source={{ uri: item.content }} style={clientStyles.imageInBubble} resizeMode="cover" />
              </TouchableOpacity>
            ) : (
              <Text style={clientStyles.messageText}>{item.content}</Text>
            )}
            <Text style={[clientStyles.messageTime, isMine && clientStyles.myMessageTime]}>
              {formatMessageTime(item.created_at)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Client UI (original design)
  if (!isProvider) {
    return (
      <View style={clientStyles.container}>
        <View style={[clientStyles.header, { paddingTop: insets.top + 20 }]}>
          <TouchableOpacity onPress={() => router.back()} style={clientStyles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {otherUserImage ? (
            <Image source={{ uri: otherUserImage }} style={clientStyles.headerAvatar} />
          ) : (
            <View style={clientStyles.headerAvatarPlaceholder}>
              <Text style={clientStyles.headerAvatarEmoji}>👑</Text>
            </View>
          )}
          <View style={clientStyles.headerInfo}>
            <Text style={clientStyles.headerName}>{otherUserName ?? t('chat.title')}</Text>
            <View style={clientStyles.statusContainer}>
              <View style={clientStyles.statusDot} />
              <Text style={clientStyles.statusText}>{t('chat.online')}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleCall} style={clientStyles.callButton}>
            <Ionicons name="call" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <KeyboardAvoidingView
          style={clientStyles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 80 : 0}
          enabled={Platform.OS === 'ios'}
        >
          <View
            style={[
              clientStyles.flex,
              Platform.OS === 'android' && keyboardHeight > 0 && { paddingBottom: keyboardHeight },
            ]}
          >
          {error ? (
            <View style={[clientStyles.centerContainer, clientStyles.flex]}>
              <Text style={clientStyles.errorText}>{error}</Text>
              <TouchableOpacity style={clientStyles.retryButton} onPress={() => loadMessages()}>
                <Text style={clientStyles.retryText}>{t('chat.retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : displayMessages.length === 0 ? (
            <View style={[clientStyles.centerContainer, clientStyles.flex]}>
              <Ionicons name="chatbubble-outline" size={48} color={clientColors.textSecondary} />
              <Text style={clientStyles.emptyText}>{t('chat.noMessages')}</Text>
              <Text style={clientStyles.emptySubtext}>{t('chat.noMessagesDesc')}</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={displayMessages}
              keyExtractor={(item) => item.id}
              renderItem={(args) => renderClientMessage(args, displayMessages)}
              contentContainerStyle={clientStyles.messagesList}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
              onLayout={() => {
                if (!keyboardVisible) flatListRef.current?.scrollToEnd({ animated: false });
              }}
            />
          )}
          <View style={[clientStyles.inputContainer, { paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity
              style={clientStyles.attachButton}
              onPress={handleAttachImage}
              disabled={sending}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="attach-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TextInput
              style={clientStyles.input}
              value={messageText}
              onChangeText={setMessageText}
              placeholder={t('chat.messagePlaceholder')}
              placeholderTextColor={clientColors.textSecondary}
              multiline
              maxLength={1000}
              onFocus={() => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)}
            />
            <TouchableOpacity
              style={[clientStyles.sendButton, (!messageText.trim() || sending) && clientStyles.sendButtonDisabled]}
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
          </View>
        </KeyboardAvoidingView>
        <Modal visible={!!expandedImageUri} transparent animationType="fade">
          <TouchableOpacity
            style={clientStyles.imageModalOverlay}
            activeOpacity={1}
            onPress={() => setExpandedImageUri(null)}
          >
            {expandedImageUri && (
              <Image source={{ uri: expandedImageUri }} style={clientStyles.imageModalImage} resizeMode="contain" />
            )}
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }

  // Provider UI (new design from JSX)
  return (
    <View style={styles.container}>
      {/* Header - JSX style */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textMuted40} />
        </TouchableOpacity>
        {otherUserImage ? (
          <Image source={{ uri: otherUserImage }} style={styles.headerAvatar} />
        ) : (
          <View style={styles.headerAvatarPlaceholder}>
            <Text style={styles.headerAvatarEmoji}>👩</Text>
          </View>
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{otherUserName ?? t('chat.title')}</Text>
          <Text style={styles.headerStatus}>{t('chat.online')}</Text>
        </View>
        <TouchableOpacity onPress={handleCall} style={styles.headerBtn}>
          <Ionicons name="call" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerBtn}>
          <Ionicons name="ellipsis-vertical" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Job banner - only when active order */}
      {activeOrder && (
        <View style={styles.jobBanner}>
          <View style={styles.jobBannerIcon}>
            <Text style={styles.jobBannerIconText}>🔧</Text>
          </View>
          <View style={styles.jobBannerContent}>
            <Text style={styles.jobBannerTitle} numberOfLines={1}>
              {activeOrder.service_name ?? t('chat.quickQuote')}
            </Text>
            <Text style={styles.jobBannerSub}>
              {activeOrder.scheduled_at
                ? new Date(activeOrder.scheduled_at).toLocaleString([], {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : ''}{' '}
              {activeOrder.total_amount != null ? `• $${activeOrder.total_amount}` : ''}
            </Text>
          </View>
          <View style={styles.jobBannerBadge}>
            <Text style={styles.jobBannerBadgeText}>{jobStatusLabel}</Text>
          </View>
        </View>
      )}

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 120 : 0}
        enabled={Platform.OS === 'ios'}
      >
        <View
          style={[
            styles.flex,
            Platform.OS === 'android' && keyboardHeight > 0 && { paddingBottom: keyboardHeight },
          ]}
        >
        {error ? (
          <View style={[styles.centerContainer, styles.flex]}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadMessages()}>
              <Text style={styles.retryText}>{t('chat.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={displayMessages}
            keyExtractor={(item) => item.id}
            renderItem={(args) => renderMessage(args, displayMessages)}
            contentContainerStyle={styles.messagesList}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            ListHeaderComponent={
              isDemo ? (
                <View style={styles.systemMessage}>
                  <Text style={styles.systemMessageText}>
                    {t('chat.appointmentScheduled', { time: '2:00 PM' })}
                  </Text>
                </View>
              ) : null
            }
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            onLayout={() => {
              if (!keyboardVisible) flatListRef.current?.scrollToEnd({ animated: false });
            }}
          />
        )}

        {/* Quick actions - JSX style */}
        <View style={styles.quickActions}>
          {[t('chat.quickLocation'), t('chat.quickPhoto'), t('chat.quickQuote'), t('chat.quickSchedule')].map(
            (label) => (
              <TouchableOpacity
                key={label}
                style={styles.quickActionChip}
                onPress={() => handleQuickAction(label)}
                activeOpacity={0.7}
              >
                <Text style={styles.quickActionChipText}>{label}</Text>
              </TouchableOpacity>
            )
          )}
        </View>

        {/* Input - JSX style */}
        <View style={[styles.inputWrap, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              value={messageText}
              onChangeText={setMessageText}
              placeholder={t('chat.messagePlaceholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={1000}
              onFocus={() => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)}
              onBlur={resetKeyboardLayout}
            />
            <TouchableOpacity hitSlop={8}>
              <Text style={styles.emojiBtn}>😊</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.sendBtn, (!messageText.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!messageText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <Ionicons name="arrow-forward" size={18} color={colors.textPrimary} />
            )}
          </TouchableOpacity>
        </View>
        </View>
      </KeyboardAvoidingView>

      {/* Image expand modal */}
      <Modal visible={!!expandedImageUri} transparent animationType="fade">
        <TouchableOpacity
          style={styles.imageModalOverlay}
          activeOpacity={1}
          onPress={() => setExpandedImageUri(null)}
        >
          {expandedImageUri && (
            <Image source={{ uri: expandedImageUri }} style={styles.imageModalImage} resizeMode="contain" />
          )}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: { flex: 1 },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.headerCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.chipBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.avatarBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarEmoji: { fontSize: 18 },
  headerInfo: { flex: 1 },
  headerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  headerStatus: {
    fontSize: 12,
    color: colors.statusGreen,
  },
  jobBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.jobBannerBg,
    borderWidth: 1,
    borderColor: colors.jobBannerBorder,
  },
  jobBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  jobBannerIconText: { fontSize: 20 },
  jobBannerContent: { flex: 1 },
  jobBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  jobBannerSub: {
    fontSize: 12,
    color: colors.textMuted40,
    marginTop: 2,
  },
  jobBannerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
  },
  jobBannerBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#C4B5FD',
  },
  dateContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 10,
    color: colors.textMuted,
    backgroundColor: colors.chipBg,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  systemMessage: {
    alignItems: 'center',
    marginBottom: 12,
  },
  systemMessageText: {
    fontSize: 10,
    color: colors.textMuted,
    backgroundColor: colors.chipBg,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  messageRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    maxWidth: '85%',
  },
  messageRowMine: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.avatarBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSmallEmoji: { fontSize: 14 },
  bubbleWrapper: {},
  bubbleWrapperMine: { alignItems: 'flex-end' },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    borderTopLeftRadius: 4,
  },
  bubbleReceived: {
    backgroundColor: colors.receivedBubble,
  },
  bubbleSent: {
    backgroundColor: '#8B5CF6',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  bubbleTextSent: { color: colors.textPrimary },
  bubbleTime: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
    marginLeft: 8,
  },
  bubbleTimeRight: {
    marginLeft: 0,
    marginRight: 8,
    textAlign: 'right',
  },
  imageInBubble: {
    width: 200,
    height: 160,
    borderRadius: 12,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  quickActionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.chipBg,
  },
  quickActionChipText: {
    fontSize: 12,
    color: colors.textMuted40,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  inputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  emojiBtn: { fontSize: 18, marginLeft: 8 },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
  },
  sendBtnDisabled: {
    backgroundColor: colors.border,
    opacity: 0.6,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalImage: {
    width: '100%',
    height: '80%',
  },
});

// Client UI styles (original design)
const clientStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: clientColors.bg,
  },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: clientColors.bgCard,
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
    backgroundColor: clientColors.bgInput,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarEmoji: { fontSize: 20 },
  headerInfo: { flex: 1 },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statusContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: clientColors.secondary,
  },
  statusText: { fontSize: 12, color: clientColors.secondary },
  callButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  messagesList: { paddingHorizontal: 20, paddingVertical: 20 },
  dateContainer: { alignItems: 'center', marginBottom: 16 },
  dateText: {
    fontSize: 12,
    color: clientColors.textSecondary,
    backgroundColor: clientColors.bgCard,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  messageBubbleContainer: { flexDirection: 'row', marginBottom: 12 },
  myMessageContainer: { justifyContent: 'flex-end' },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  myMessage: {
    backgroundColor: clientColors.primary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 16,
  },
  theirMessage: {
    backgroundColor: clientColors.bgCard,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 4,
  },
  messageText: { fontSize: 14, lineHeight: 20, color: '#FFFFFF' },
  messageTime: { fontSize: 11, marginTop: 4, textAlign: 'right', color: clientColors.textSecondary },
  myMessageTime: { color: 'rgba(255, 255, 255, 0.7)' },
  imageWrap: {},
  imageInBubble: { width: 200, height: 160, borderRadius: 12 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: clientColors.bgCard,
    borderTopWidth: 1,
    borderTopColor: clientColors.border,
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: clientColors.bgInput,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#FFFFFF',
    backgroundColor: clientColors.bgInput,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: clientColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: { backgroundColor: clientColors.border, opacity: 0.5 },
  emptyText: { fontSize: 16, marginTop: 12, color: '#FFFFFF' },
  emptySubtext: { fontSize: 14, marginTop: 4, color: clientColors.textSecondary },
  errorText: { fontSize: 16, color: '#EF4444', textAlign: 'center', marginBottom: 16 },
  retryButton: {
    backgroundColor: clientColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalImage: { width: '100%', height: '80%' },
});
