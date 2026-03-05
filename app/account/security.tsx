import { Toast } from '@/components/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n';
import {
  changePassword,
  disable2FA,
  enable2FA,
  getSettings,
  validatePassword,
  verify2FA,
  type Enable2FAResponse,
  type UserSettings,
} from '@/services/settings';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const I18N = 'providerDashboard.providerSettings.securityScreen';
const BACKGROUND = '#1a1a2e';
const HEADER_BG = '#252542';
const CARD_BG = '#252542';
const CARD_BORDER = '#374151';
const SECTION_HEADER_COLOR = '#9ca3af';
const ACCENT = '#3b82f6';
const PRIMARY_20 = '#3b82f620';
const TOGGLE_ACTIVE = '#22C55E';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#9ca3af';

type PasswordStep = 'current' | 'new' | 'confirm';

interface PasswordModalState {
  visible: boolean;
  step: PasswordStep;
  currentPassword: string;
  newPassword: string;
}

export default function ClientSecurityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [passwordModal, setPasswordModal] = useState<PasswordModalState | null>(null);
  const [passwordInput, setPasswordInput] = useState('');

  const [twoFASetup, setTwoFASetup] = useState<Enable2FAResponse | null>(null);
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFAPasswordModal, setTwoFAPasswordModal] = useState<{ action: 'enable' | 'disable' } | null>(null);
  const [twoFAPasswordInput, setTwoFAPasswordInput] = useState('');

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getSettings();
      setSettings(response.settings);
    } catch {
      showToast(t('errors.getSettingsFailed'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleChangePassword = useCallback(() => {
    setPasswordInput('');
    setPasswordModal({ visible: true, step: 'current', currentPassword: '', newPassword: '' });
  }, []);

  const handlePasswordStep = useCallback(async () => {
    if (!passwordModal || !passwordInput.trim()) return;

    const value = passwordInput.trim();

    if (passwordModal.step === 'current') {
      try {
        setUpdating('password');
        await validatePassword({ password: value });
        setPasswordInput('');
        setPasswordModal({ ...passwordModal, step: 'new', currentPassword: value });
      } catch (error: unknown) {
        const apiError = error as { status?: number };
        if (apiError?.status === 401) {
          showToast(t(`${I18N}.invalidPassword`), 'error');
        } else if (apiError?.status === 429) {
          showToast(t('errors.tooManyRequests'), 'error');
        } else {
          showToast(t('errors.changePasswordFailed'), 'error');
        }
      } finally {
        setUpdating(null);
      }
    } else if (passwordModal.step === 'new') {
      if (value.length < 8) {
        showToast(t(`${I18N}.passwordTooShort`), 'error');
        return;
      }
      setPasswordInput('');
      setPasswordModal({ ...passwordModal, step: 'confirm', newPassword: value });
    } else if (passwordModal.step === 'confirm') {
      if (value !== passwordModal.newPassword) {
        showToast(t(`${I18N}.passwordsDontMatch`), 'error');
        return;
      }
      try {
        setUpdating('password');
        await changePassword({ currentPassword: passwordModal.currentPassword, newPassword: passwordModal.newPassword });
        setPasswordModal(null);
        setPasswordInput('');
        showToast(t(`${I18N}.passwordChanged`), 'success');
        setTimeout(() => { logout(); }, 2000);
      } catch {
        showToast(t('errors.changePasswordFailed'), 'error');
      } finally {
        setUpdating(null);
      }
    }
  }, [passwordModal, passwordInput, showToast, logout]);

  const handleToggle2FA = useCallback(() => {
    const action = settings?.two_factor_enabled ? 'disable' : 'enable';
    if (action === 'disable') {
      Alert.alert(
        t('providerDashboard.providerSettings.securityScreen.disable2FAConfirmTitle'),
        t('providerDashboard.providerSettings.securityScreen.disable2FAConfirmMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.confirm'), onPress: () => { setTwoFAPasswordInput(''); setTwoFAPasswordModal({ action: 'disable' }); } },
        ]
      );
      return;
    }
    setTwoFAPasswordInput('');
    setTwoFAPasswordModal({ action: 'enable' });
  }, [settings?.two_factor_enabled]);

  const handle2FAPasswordConfirm = useCallback(async () => {
    if (!twoFAPasswordModal || !twoFAPasswordInput.trim()) return;
    const password = twoFAPasswordInput.trim();

    try {
      setUpdating('2fa');
      if (twoFAPasswordModal.action === 'enable') {
        const response = await enable2FA({ password });
        setTwoFASetup(response);
        setTwoFACode('');
      } else {
        await disable2FA({ password });
        setSettings((prev) => prev ? { ...prev, two_factor_enabled: false } : prev);
        showToast(t(`${I18N}.twoFactorDisabled`), 'info');
      }
      setTwoFAPasswordModal(null);
      setTwoFAPasswordInput('');
    } catch (error: unknown) {
      const apiError = error as { status?: number; data?: { code?: string } };
      const code = apiError?.data?.code;
      if (apiError?.status === 401) {
        showToast(t(`${I18N}.invalidPassword`), 'error');
      } else if (code === 'password_not_set') {
        showToast(t('errors.passwordNotSetFor2FA'), 'error');
      } else {
        showToast(t('errors.enable2FAFailed'), 'error');
      }
    } finally {
      setUpdating(null);
    }
  }, [twoFAPasswordModal, twoFAPasswordInput, showToast]);

  const handleVerify2FA = useCallback(async () => {
    if (twoFACode.trim().length !== 6) return;
    try {
      setUpdating('2fa-verify');
      await verify2FA({ token: twoFACode.trim() });
      setTwoFASetup(null);
      setTwoFACode('');
      setSettings((prev) => prev ? { ...prev, two_factor_enabled: true } : prev);
      showToast(t(`${I18N}.twoFactorEnabled`), 'success');
    } catch {
      showToast(t('errors.verify2FAFailed'), 'error');
    } finally {
      setUpdating(null);
    }
  }, [twoFACode, showToast]);

  const getPasswordModalTitle = useCallback((): string => {
    if (!passwordModal) return '';
    switch (passwordModal.step) {
      case 'current': return t(`${I18N}.currentPassword`);
      case 'new': return t(`${I18N}.newPassword`);
      case 'confirm': return t(`${I18N}.confirmNewPassword`);
    }
  }, [passwordModal]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16, paddingBottom: 20 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.title}>{t(`${I18N}.title`)}</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16, paddingBottom: 20 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.title}>{t(`${I18N}.title`)}</Text>
        {updating ? <ActivityIndicator size="small" color={ACCENT} style={{ width: 32 }} /> : <View style={styles.headerPlaceholder} />}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>{t(`${I18N}.sectionPassword`)}</Text>
        <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={handleChangePassword}>
          <View style={styles.iconBox}>
            <Ionicons name="key-outline" size={20} color={ACCENT} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>{t(`${I18N}.changePassword`)}</Text>
            <Text style={styles.rowDesc}>{t(`${I18N}.changePasswordDesc`)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={TEXT_SECONDARY} />
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>{t(`${I18N}.section2FA`)}</Text>
        <View style={styles.card}>
          <View style={styles.iconBox}>
            <Ionicons name="shield-checkmark-outline" size={20} color={ACCENT} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>{t(`${I18N}.twoFactorAuth`)}</Text>
            <Text style={styles.rowDesc}>{t(`${I18N}.twoFactorDesc`)}</Text>
          </View>
          <Switch
            value={settings?.two_factor_enabled ?? false}
            onValueChange={handleToggle2FA}
            trackColor={{ false: 'rgba(255,255,255,0.1)', true: TOGGLE_ACTIVE }}
            thumbColor="#fff"
          />
        </View>
      </ScrollView>

      <Modal visible={passwordModal?.visible === true} transparent animationType="fade" onRequestClose={() => setPasswordModal(null)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPasswordModal(null)}>
            <View style={styles.modalBox} onStartShouldSetResponder={() => true}>
              <Text style={styles.modalTitle}>{getPasswordModalTitle()}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={getPasswordModalTitle()}
                placeholderTextColor={TEXT_SECONDARY}
                secureTextEntry
                value={passwordInput}
                onChangeText={setPasswordInput}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handlePasswordStep}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setPasswordModal(null); setPasswordInput(''); }}>
                  <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmBtn, !passwordInput.trim() && styles.modalBtnDisabled]}
                  onPress={handlePasswordStep}
                  disabled={!passwordInput.trim() || !!updating}
                >
                  {updating === 'password' ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalConfirmText}>{t('common.confirm')}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={twoFAPasswordModal !== null} transparent animationType="fade" onRequestClose={() => setTwoFAPasswordModal(null)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTwoFAPasswordModal(null)}>
            <View style={styles.modalBox} onStartShouldSetResponder={() => true}>
              <Text style={styles.modalTitle}>{t(`${I18N}.enterPasswordToContinue`)}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={t(`${I18N}.currentPassword`)}
                placeholderTextColor={TEXT_SECONDARY}
                secureTextEntry
                value={twoFAPasswordInput}
                onChangeText={setTwoFAPasswordInput}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handle2FAPasswordConfirm}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setTwoFAPasswordModal(null); setTwoFAPasswordInput(''); }}>
                  <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmBtn, !twoFAPasswordInput.trim() && styles.modalBtnDisabled]}
                  onPress={handle2FAPasswordConfirm}
                  disabled={!twoFAPasswordInput.trim() || !!updating}
                >
                  {updating === '2fa' ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalConfirmText}>{t('common.confirm')}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={twoFASetup !== null} transparent animationType="fade" onRequestClose={() => setTwoFASetup(null)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTwoFASetup(null)}>
            <View style={[styles.modalBox, { maxWidth: 340 }]} onStartShouldSetResponder={() => true}>
              <Text style={styles.modalTitle}>{t(`${I18N}.scanQRCode`)}</Text>
              {twoFASetup?.qrCode && (
                <View style={styles.qrContainer}>
                  <Image source={{ uri: twoFASetup.qrCode }} style={styles.qrImage} resizeMode="contain" />
                </View>
              )}
              <Text style={[styles.modalSubtitle, { marginTop: 12 }]}>{t(`${I18N}.enter2FACode`)}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="000000"
                placeholderTextColor={TEXT_SECONDARY}
                value={twoFACode}
                onChangeText={setTwoFACode}
                keyboardType="number-pad"
                maxLength={6}
                textAlign="center"
                returnKeyType="done"
                onSubmitEditing={handleVerify2FA}
              />
              {twoFASetup?.backupCodes && twoFASetup.backupCodes.length > 0 && (
                <View style={styles.backupBox}>
                  <Text style={styles.backupTitle}>{t(`${I18N}.backupCodes`)}</Text>
                  <Text style={styles.backupHint}>{t(`${I18N}.saveBackupCodes`)}</Text>
                  <View style={styles.backupCodesGrid}>
                    {twoFASetup.backupCodes.map((code, i) => (
                      <Text key={i} style={styles.backupCode}>{code}</Text>
                    ))}
                  </View>
                </View>
              )}
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setTwoFASetup(null); setTwoFACode(''); }}>
                  <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmBtn, twoFACode.trim().length !== 6 && styles.modalBtnDisabled]}
                  onPress={handleVerify2FA}
                  disabled={twoFACode.trim().length !== 6 || !!updating}
                >
                  {updating === '2fa-verify' ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalConfirmText}>{t(`${I18N}.verify`)}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <Toast message={toast?.message ?? ''} visible={toast !== null} onHide={() => setToast(null)} type={toast?.type ?? 'success'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    backgroundColor: HEADER_BG,
  },
  backButton: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontWeight: '600', textAlign: 'center', color: TEXT_PRIMARY },
  headerPlaceholder: { width: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 12,
    color: SECTION_HEADER_COLOR,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: PRIMARY_20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  rowText: { flex: 1 },
  rowLabel: { color: TEXT_PRIMARY, fontSize: 15, fontWeight: '600' },
  rowDesc: { color: TEXT_SECONDARY, fontSize: 12, marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  modalTitle: { color: TEXT_PRIMARY, fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  modalSubtitle: { color: TEXT_SECONDARY, fontSize: 13, textAlign: 'center', marginBottom: 12 },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: TEXT_PRIMARY,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 16,
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  modalCancelText: { color: TEXT_SECONDARY, fontSize: 15, fontWeight: '600' },
  modalConfirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: ACCENT, alignItems: 'center' },
  modalConfirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  modalBtnDisabled: { opacity: 0.4 },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignSelf: 'center',
  },
  qrImage: { width: 180, height: 180 },
  backupBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  backupTitle: { color: TEXT_PRIMARY, fontSize: 14, fontWeight: '600', marginBottom: 4 },
  backupHint: { color: TEXT_SECONDARY, fontSize: 12, marginBottom: 12 },
  backupCodesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  backupCode: {
    color: ACCENT,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: PRIMARY_20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
});
