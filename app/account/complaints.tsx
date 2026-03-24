import { useThemeColors } from '@/hooks/useThemeColors';
import { t } from '@/i18n';
import { ApiError } from '@/services/auth';
import {
  createComplaint,
  getComplaintMessages,
  listComplaints,
  sendComplaintReply,
  type ComplaintMessage,
  type ComplaintRecord,
  type ComplaintType,
} from '@/services/complaints';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const TYPES: ComplaintType[] = ['complaint', 'claim', 'suggestion'];

function typeLabel(type: ComplaintType): string {
  if (type === 'complaint') return t('complaints.typeComplaint');
  if (type === 'claim') return t('complaints.typeClaim');
  return t('complaints.typeSuggestion');
}

function statusLabel(status: string): string {
  switch (status) {
    case 'open':
      return t('complaints.statusOpen');
    case 'in_progress':
      return t('complaints.statusInProgress');
    case 'resolved':
      return t('complaints.statusResolved');
    case 'closed':
      return t('complaints.statusClosed');
    case 'escalated':
      return t('complaints.statusEscalated');
    default:
      return status;
  }
}

function isUserSender(senderType: string): boolean {
  return senderType === 'client' || senderType === 'provider';
}

export default function ComplaintsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const queryClient = useQueryClient();

  const [type, setType] = useState<ComplaintType>('complaint');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [orderId, setOrderId] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const listQuery = useQuery({
    queryKey: ['complaints', 'mine'],
    queryFn: () => listComplaints(1, 50),
  });

  const messagesQuery = useQuery({
    queryKey: ['complaints', 'messages', expandedId],
    queryFn: () => getComplaintMessages(expandedId!),
    enabled: !!expandedId,
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      createComplaint({
        type,
        subject: subject.trim(),
        description: description.trim(),
        order_id: orderId.trim() || undefined,
      }),
    onSuccess: () => {
      setSubject('');
      setDescription('');
      setOrderId('');
      queryClient.invalidateQueries({ queryKey: ['complaints', 'mine'] });
      Alert.alert(t('complaints.successTitle'), t('complaints.successMessage'));
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError && err.data && typeof err.data === 'object' && 'code' in err.data) {
        const code = (err.data as { code?: string }).code;
        if (code === 'invalid_order') {
          Alert.alert(t('common.error'), t('complaints.invalidOrder'));
          return;
        }
      }
      Alert.alert(t('common.error'), t('complaints.submitError'));
    },
  });

  const replyMutation = useMutation({
    mutationFn: () => sendComplaintReply(expandedId!, replyText),
    onSuccess: () => {
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['complaints', 'messages', expandedId] });
    },
    onError: () => {
      Alert.alert(t('common.error'), t('complaints.replyError'));
    },
  });

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
    setReplyText('');
  }, []);

  const messages = messagesQuery.data?.data ?? [];

  const sortedMessages = useMemo(() => {
    return [...messages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [messages]);

  const renderMessage = useCallback(
    (m: ComplaintMessage) => {
      const isUser = isUserSender(m.senderType);
      const label = m.senderType === 'admin' ? t('complaints.adminLabel') : t('complaints.youLabel');
      return (
        <View
          key={m.id}
          style={[
            styles.msgBubble,
            {
              alignSelf: isUser ? 'flex-end' : 'flex-start',
              backgroundColor: isUser ? colors.primary + '33' : colors.card,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <Text style={[styles.msgLabel, { color: colors.textTertiary }]}>{label}</Text>
          <Text style={[styles.msgText, { color: colors.textPrimary }]}>{m.messageText}</Text>
          <Text style={[styles.msgTime, { color: colors.textTertiary }]}>
            {new Date(m.createdAt).toLocaleString()}
          </Text>
        </View>
      );
    },
    [colors]
  );

  const items = listQuery.data?.data ?? [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
            paddingBottom: 16,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('complaints.title')}</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          style={[styles.scroll, { backgroundColor: colors.background }]}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>{t('complaints.subtitle')}</Text>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('complaints.typeLabel')}</Text>
          <View style={styles.typeRow}>
            {TYPES.map((tOption) => (
              <Pressable
                key={tOption}
                onPress={() => setType(tOption)}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor: type === tOption ? colors.primary + '44' : colors.card,
                    borderColor: type === tOption ? colors.primary : colors.cardBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    { color: type === tOption ? colors.textPrimary : colors.textSecondary },
                  ]}
                >
                  {typeLabel(tOption)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('complaints.subjectLabel')}</Text>
          <TextInput
            style={[
              styles.input,
              { color: colors.textPrimary, borderColor: colors.cardBorder, backgroundColor: colors.card },
            ]}
            value={subject}
            onChangeText={setSubject}
            placeholder={t('complaints.subjectPlaceholder')}
            placeholderTextColor={colors.textTertiary}
            maxLength={200}
          />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            {t('complaints.descriptionLabel')}
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              { color: colors.textPrimary, borderColor: colors.cardBorder, backgroundColor: colors.card },
            ]}
            value={description}
            onChangeText={setDescription}
            placeholder={t('complaints.descriptionPlaceholder')}
            placeholderTextColor={colors.textTertiary}
            multiline
            textAlignVertical="top"
            maxLength={8000}
          />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            {t('complaints.orderIdLabel')}
          </Text>
          <TextInput
            style={[
              styles.input,
              { color: colors.textPrimary, borderColor: colors.cardBorder, backgroundColor: colors.card },
            ]}
            value={orderId}
            onChangeText={setOrderId}
            placeholder={t('complaints.orderIdPlaceholder')}
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[
              styles.submitBtn,
              {
                backgroundColor: colors.primary,
                opacity:
                  submitMutation.isPending || subject.trim().length < 3 || description.trim().length < 10
                    ? 0.5
                    : 1,
              },
            ]}
            disabled={
              submitMutation.isPending || subject.trim().length < 3 || description.trim().length < 10
            }
            onPress={() => {
              if (subject.trim().length < 3) {
                Alert.alert(t('common.error'), t('complaints.validationSubject'));
                return;
              }
              if (description.trim().length < 10) {
                Alert.alert(t('common.error'), t('complaints.validationDescription'));
                return;
              }
              submitMutation.mutate();
            }}
            activeOpacity={0.85}
          >
            {submitMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>{t('complaints.submit')}</Text>
            )}
          </TouchableOpacity>

          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
            {t('complaints.sectionPrevious')}
          </Text>

          {listQuery.isLoading ? (
            <ActivityIndicator style={styles.loader} color={colors.primary} />
          ) : listQuery.isError ? (
            <Text style={[styles.errorText, { color: colors.textSecondary }]}>{t('complaints.loadError')}</Text>
          ) : items.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textTertiary }]}>{t('complaints.emptyList')}</Text>
          ) : (
            items.map((item: ComplaintRecord) => (
              <View key={item.id} style={[styles.card, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}>
                <TouchableOpacity onPress={() => toggleExpand(item.id)} activeOpacity={0.8}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                      {item.subject}
                    </Text>
                    <Ionicons
                      name={expandedId === item.id ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={colors.textTertiary}
                    />
                  </View>
                  <Text style={[styles.cardMeta, { color: colors.textTertiary }]}>
                    {typeLabel(item.type)} · {statusLabel(item.status)}
                  </Text>
                  {expandedId !== item.id ? (
                    <Text style={[styles.cardPreview, { color: colors.textSecondary }]} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                </TouchableOpacity>

                {expandedId === item.id ? (
                  <View style={styles.detail}>
                    <Text style={[styles.cardBody, { color: colors.textSecondary }]}>{item.description}</Text>
                    <Text style={[styles.messagesTitle, { color: colors.textPrimary }]}>
                      {t('complaints.messagesTitle')}
                    </Text>
                    {messagesQuery.isFetching ? (
                      <ActivityIndicator color={colors.primary} style={styles.loader} />
                    ) : sortedMessages.length === 0 ? (
                      <Text style={[styles.empty, { color: colors.textTertiary }]}>
                        {t('complaints.noMessages')}
                      </Text>
                    ) : (
                      <View style={styles.msgList}>{sortedMessages.map(renderMessage)}</View>
                    )}
                    <TextInput
                      style={[
                        styles.input,
                        styles.textArea,
                        {
                          color: colors.textPrimary,
                          borderColor: colors.cardBorder,
                          backgroundColor: colors.surface,
                        },
                      ]}
                      value={replyText}
                      onChangeText={setReplyText}
                      placeholder={t('complaints.replyPlaceholder')}
                      placeholderTextColor={colors.textTertiary}
                      multiline
                    />
                    <TouchableOpacity
                      style={[
                        styles.replyBtn,
                        { backgroundColor: colors.primary, opacity: replyMutation.isPending ? 0.7 : 1 },
                      ]}
                      disabled={replyMutation.isPending || !replyText.trim()}
                      onPress={() => replyMutation.mutate()}
                    >
                      {replyMutation.isPending ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.submitBtnText}>{t('complaints.sendReply')}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  backButton: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '600', textAlign: 'center' },
  headerPlaceholder: { width: 32 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  typeChipText: { fontSize: 13, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  textArea: { minHeight: 120, paddingTop: 12 },
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 28,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  loader: { marginVertical: 16 },
  errorText: { textAlign: 'center', marginVertical: 12 },
  empty: { fontSize: 14, marginVertical: 8 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '600' },
  cardMeta: { fontSize: 12, marginTop: 4 },
  cardPreview: { fontSize: 13, marginTop: 8 },
  cardBody: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  detail: { marginTop: 8 },
  messagesTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  msgList: { gap: 8, marginBottom: 12 },
  msgBubble: {
    maxWidth: '92%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  msgLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  msgText: { fontSize: 14, lineHeight: 20 },
  msgTime: { fontSize: 10, marginTop: 6 },
  replyBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
});
