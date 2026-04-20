import { Toast } from '@/components/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColors } from '@/hooks/useThemeColors';
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
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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

type PasswordStep = 'current' | 'new' | 'confirm';

interface PasswordModalState {
  visible: boolean;
  step: PasswordStep;
  currentPassword: string;
  newPassword: string;
}

const MODAL_DIM = 'rgba(0,0,0,0.6)' as const;

const TWO_FA_DIM_GAP_TOP = 56;
const TWO_FA_DIM_GAP_BOTTOM = 72;
const TWO_FA_DIM_GAP_H = 14;

export default function ProviderSecurityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { width: screenW, height: screenH } = Dimensions.get('screen');
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
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t(`${I18N}.title`)}</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t(`${I18N}.title`)}</Text>
        {updating && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 'auto' }} />}
      </View>

      <ScrollView style={[styles.scroll, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Password Section */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{t(`${I18N}.sectionPassword`)}</Text>
        <TouchableOpacity style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} activeOpacity={0.8} onPress={handleChangePassword}>
          <View style={[styles.iconBox, { backgroundColor: `${colors.primary}20` }]}>
            <Ionicons name="key-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{t(`${I18N}.changePassword`)}</Text>
            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>{t(`${I18N}.changePasswordDesc`)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* 2FA Section */}
        <Text style={[styles.sectionTitle, { marginTop: 28, color: colors.textTertiary }]}>{t(`${I18N}.section2FA`)}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.iconBox, { backgroundColor: `${colors.primary}20` }]}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{t(`${I18N}.twoFactorAuth`)}</Text>
            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>{t(`${I18N}.twoFactorDesc`)}</Text>
          </View>
          <Switch
            value={settings?.two_factor_enabled ?? false}
            onValueChange={handleToggle2FA}
            trackColor={{ false: colors.cardBorder, true: '#22C55E' }}
            thumbColor="#fff"
          />
        </View>
      </ScrollView>

      {/* Password Modal — edge-to-edge dim (status bar + nav bar) via screen size + Modal flags */}
      <Modal
        visible={passwordModal?.visible === true}
        transparent
        animationType="fade"
        statusBarTranslucent={Platform.OS === 'android'}
        presentationStyle="overFullScreen"
        onRequestClose={() => setPasswordModal(null)}
      >
        <View style={[styles.modalRoot, { width: screenW, minHeight: screenH, backgroundColor: MODAL_DIM }]}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => { setPasswordModal(null); setPasswordInput(''); }}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
          />
          <KeyboardAvoidingView
            style={styles.modalCenterWrap}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            pointerEvents="box-none"
          >
            <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onStartShouldSetResponder={() => true}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{getPasswordModalTitle()}</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                placeholder={getPasswordModalTitle()}
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                value={passwordInput}
                onChangeText={setPasswordInput}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handlePasswordStep}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { backgroundColor: colors.background }]}
                  onPress={() => { setPasswordModal(null); setPasswordInput(''); }}
                >
                  <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmBtn, { backgroundColor: colors.buttonPrimaryBg }, !passwordInput.trim() && styles.modalBtnDisabled]}
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
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* 2FA Password Modal */}
      <Modal
        visible={twoFAPasswordModal !== null}
        transparent
        animationType="fade"
        statusBarTranslucent={Platform.OS === 'android'}
        presentationStyle="overFullScreen"
        onRequestClose={() => setTwoFAPasswordModal(null)}
      >
        <View style={[styles.modalRoot, { width: screenW, minHeight: screenH, backgroundColor: MODAL_DIM }]}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => { setTwoFAPasswordModal(null); setTwoFAPasswordInput(''); }}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
          />
          <KeyboardAvoidingView
            style={styles.modalCenterWrap}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            pointerEvents="box-none"
          >
            <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onStartShouldSetResponder={() => true}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t(`${I18N}.enterPasswordToContinue`)}</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                placeholder={t(`${I18N}.currentPassword`)}
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                value={twoFAPasswordInput}
                onChangeText={setTwoFAPasswordInput}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handle2FAPasswordConfirm}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalCancelBtn, { backgroundColor: colors.background }]} onPress={() => { setTwoFAPasswordModal(null); setTwoFAPasswordInput(''); }}>
                  <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmBtn, { backgroundColor: colors.buttonPrimaryBg }, !twoFAPasswordInput.trim() && styles.modalBtnDisabled]}
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
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* QR Code + Verify Modal — inset dim overlay (header + tab bar stay outside grey area) */}
      <Modal
        visible={twoFASetup !== null}
        transparent
        animationType="fade"
        statusBarTranslucent={Platform.OS === 'android'}
        presentationStyle="overFullScreen"
        onRequestClose={() => setTwoFASetup(null)}
      >
        <View style={[styles.modalRoot, { width: screenW, minHeight: screenH, backgroundColor: 'transparent' }]}>
          <View
            style={[
              styles.twoFAOverlayInset,
              {
                top: insets.top + TWO_FA_DIM_GAP_TOP,
                bottom: insets.bottom + TWO_FA_DIM_GAP_BOTTOM,
                left: TWO_FA_DIM_GAP_H,
                right: TWO_FA_DIM_GAP_H,
                backgroundColor: MODAL_DIM,
              },
            ]}
          >
            <Pressable
              style={StyleSheet.absoluteFillObject}
              onPress={() => {
                setTwoFASetup(null);
                setTwoFACode('');
              }}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
            />
            <KeyboardAvoidingView
              style={styles.twoFAOverlayContent}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              pointerEvents="box-none"
            >
              <ScrollView
                style={styles.twoFAOverlayContent}
                contentContainerStyle={styles.modalScrollContentTwoFA}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View
                  style={[styles.twoFAModalBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                  onStartShouldSetResponder={() => true}
                >
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t(`${I18N}.scanQRCode`)}</Text>
                  {twoFASetup?.qrCode && (
                    <View style={styles.qrContainer}>
                      <Image source={{ uri: twoFASetup.qrCode }} style={styles.qrImage} resizeMode="contain" />
                    </View>
                  )}
                  <Text style={[styles.modalSubtitle, { marginTop: 12, color: colors.textSecondary }]}>{t(`${I18N}.enter2FACode`)}</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                    placeholder="000000"
                    placeholderTextColor={colors.textSecondary}
                    value={twoFACode}
                    onChangeText={setTwoFACode}
                    keyboardType="number-pad"
                    maxLength={6}
                    textAlign="center"
                    returnKeyType="done"
                    onSubmitEditing={handleVerify2FA}
                  />
                  {twoFASetup?.backupCodes && twoFASetup.backupCodes.length > 0 && (
                    <View style={[styles.backupBox, { backgroundColor: colors.background }]}>
                      <Text style={[styles.backupTitle, { color: colors.textPrimary }]}>{t(`${I18N}.backupCodes`)}</Text>
                      <Text style={[styles.backupHint, { color: colors.textSecondary }]}>{t(`${I18N}.saveBackupCodes`)}</Text>
                      <View style={styles.backupCodesGrid}>
                        {twoFASetup.backupCodes.map((code, i) => (
                          <Text key={i} style={[styles.backupCode, { color: colors.primary, backgroundColor: `${colors.primary}20` }]}>{code}</Text>
                        ))}
                      </View>
                    </View>
                  )}
                  <View style={styles.modalButtons}>
                    <TouchableOpacity style={[styles.modalCancelBtn, { backgroundColor: colors.background }]} onPress={() => { setTwoFASetup(null); setTwoFACode(''); }}>
                      <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalConfirmBtn, { backgroundColor: colors.buttonPrimaryBg }, twoFACode.trim().length !== 6 && styles.modalBtnDisabled]}
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
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>
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
  container: { flex: 1 },
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
  title: { fontSize: 20, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 12,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
  },
  card: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: '500' },
  rowDesc: { fontSize: 12, marginTop: 2 },
  modalRoot: {
    flex: 1,
  },
  modalCenterWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  twoFAOverlayInset: {
    position: 'absolute',
    borderRadius: 18,
    overflow: 'hidden',
  },
  twoFAOverlayContent: {
    ...StyleSheet.absoluteFillObject,
  },
  modalScrollContentTwoFA: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  twoFAModalBox: {
    borderRadius: 14,
    padding: 16,
    width: '100%',
    alignSelf: 'stretch',
    borderWidth: 1,
  },
  modalBox: {
    borderRadius: 16,
    padding: 24, width: '85%', maxWidth: 360,
    borderWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  modalSubtitle: { fontSize: 13, textAlign: 'center', marginBottom: 12 },
  modalInput: {
    borderRadius: 12,
    padding: 14, fontSize: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 15, fontWeight: '600' },
  modalConfirmBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  modalBtnDisabled: { opacity: 0.4 },
  qrContainer: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', borderRadius: 12, padding: 12, alignSelf: 'center',
  },
  qrImage: { width: 180, height: 180 },
  backupBox: {
    borderRadius: 12,
    padding: 16, marginBottom: 16,
  },
  backupTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  backupHint: { fontSize: 12, marginBottom: 12 },
  backupCodesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  backupCode: {
    fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
  },
});
