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
const BACKGROUND = '#12121A';
const CARD_BG = '#1E1B2E';
const CARD_BORDER = 'rgba(61, 51, 112, 0.2)';
const SECTION_HEADER_COLOR = 'rgba(255,255,255,0.4)';
const ACCENT = '#8B5CF6';
const TOGGLE_ACTIVE = '#22C55E';

type PasswordStep = 'current' | 'new' | 'confirm';

interface PasswordModalState {
  visible: boolean;
  step: PasswordStep;
  currentPassword: string;
  newPassword: string;
}

export default function ProviderSecurityScreen() {
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
        t(`${I18N}.disable2FAConfirmTitle`),
        t(`${I18N}.disable2FAConfirmMessage`),
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
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          <Text style={styles.title}>{t(`${I18N}.title`)}</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={styles.title}>{t(`${I18N}.title`)}</Text>
        {updating && <ActivityIndicator size="small" color={ACCENT} style={{ marginLeft: 'auto' }} />}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Password Section */}
        <Text style={styles.sectionTitle}>{t(`${I18N}.sectionPassword`)}</Text>
        <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={handleChangePassword}>
          <View style={styles.iconBox}>
            <Ionicons name="key-outline" size={20} color={ACCENT} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>{t(`${I18N}.changePassword`)}</Text>
            <Text style={styles.rowDesc}>{t(`${I18N}.changePasswordDesc`)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
        </TouchableOpacity>

        {/* 2FA Section */}
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

      {/* Password Modal */}
      <Modal visible={passwordModal?.visible === true} transparent animationType="fade" onRequestClose={() => setPasswordModal(null)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPasswordModal(null)}>
            <View style={styles.modalBox} onStartShouldSetResponder={() => true}>
              <Text style={styles.modalTitle}>{getPasswordModalTitle()}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={getPasswordModalTitle()}
                placeholderTextColor="rgba(255,255,255,0.3)"
                secureTextEntry
                value={passwordInput}
                onChangeText={setPasswordInput}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handlePasswordStep}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => { setPasswordModal(null); setPasswordInput(''); }}
                >
                  <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmBtn, !passwordInput.trim() && styles.modalBtnDisabled]}
                  onPress={handlePasswordStep}
                  disabled={!passwordInput.trim() || !!updating}
                >
                  {updating === 'password' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalConfirmText}>{t('common.confirm')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* 2FA Password Modal */}
      <Modal visible={twoFAPasswordModal !== null} transparent animationType="fade" onRequestClose={() => setTwoFAPasswordModal(null)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTwoFAPasswordModal(null)}>
            <View style={styles.modalBox} onStartShouldSetResponder={() => true}>
              <Text style={styles.modalTitle}>{t(`${I18N}.enterPasswordToContinue`)}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={t(`${I18N}.currentPassword`)}
                placeholderTextColor="rgba(255,255,255,0.3)"
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
                  {updating === '2fa' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalConfirmText}>{t('common.confirm')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* QR Code + Verify Modal */}
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
                placeholderTextColor="rgba(255,255,255,0.3)"
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
                  {updating === '2fa-verify' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalConfirmText}>{t(`${I18N}.verify`)}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <Toast
        message={toast?.message ?? ''}
        visible={toast !== null}
        onHide={() => setToast(null)}
        type={toast?.type ?? 'success'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 20,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 12, color: SECTION_HEADER_COLOR,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
  },
  card: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: 12, backgroundColor: CARD_BG,
    borderWidth: 1, borderColor: CARD_BORDER,
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  rowText: { flex: 1 },
  rowLabel: { color: '#fff', fontSize: 14, fontWeight: '500' },
  rowDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#1E1B2E', borderRadius: 16,
    padding: 24, width: '85%', maxWidth: 360,
    borderWidth: 1, borderColor: CARD_BORDER,
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  modalSubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', marginBottom: 12 },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12,
    padding: 14, fontSize: 16, color: '#fff',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16,
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center',
  },
  modalCancelText: { color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '600' },
  modalConfirmBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: ACCENT, alignItems: 'center',
  },
  modalConfirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  modalBtnDisabled: { opacity: 0.4 },
  qrContainer: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', borderRadius: 12, padding: 12, alignSelf: 'center',
  },
  qrImage: { width: 180, height: 180 },
  backupBox: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12,
    padding: 16, marginBottom: 16,
  },
  backupTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  backupHint: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 12 },
  backupCodesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  backupCode: {
    color: ACCENT, fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: 'rgba(139, 92, 246, 0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
  },
});
