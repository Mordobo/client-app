import { Toast } from '@/components/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColors } from '@/hooks/useThemeColors';
import { t } from '@/i18n';
import { formatTotpSecretForDisplay, getTotpManualEntryRaw } from '@/utils/totpDisplay';
import {
  changePassword,
  disable2FA,
  enable2FA,
  getBackupCodes,
  getSettings,
  regenerateBackupCodes,
  validatePassword,
  verify2FA,
  type Enable2FAResponse,
  type UserSettings,
} from '@/services/settings';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Accepts either 6 digits (TOTP) or 8 alphanumeric characters (backup code). */
const normalize2FAInput = (raw: string): string =>
  raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8);
const is2FAInputReady = (value: string): boolean =>
  /^\d{6}$/.test(value) || /^[A-Z0-9]{8}$/.test(value);

const I18N = 'providerDashboard.providerSettings.securityScreen';

const TWO_FA_DIM_BG = 'rgba(0,0,0,0.58)' as const;
/** Inset for the grey dim layer so header and tab bar stay outside the overlay. */
const TWO_FA_DIM_GAP_TOP = 56;
const TWO_FA_DIM_GAP_BOTTOM = 72;
const TWO_FA_DIM_GAP_H = 14;

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
  const colors = useThemeColors();
  const { logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [passwordModal, setPasswordModal] = useState<PasswordModalState | null>(null);
  const [passwordInput, setPasswordInput] = useState('');

  const [twoFASetup, setTwoFASetup] = useState<Enable2FAResponse | null>(null);
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFAPasswordModal, setTwoFAPasswordModal] = useState<{ action: 'enable' | 'disable' | 'regenerate' } | null>(null);
  const [twoFAPasswordInput, setTwoFAPasswordInput] = useState('');
  const [backupCodesView, setBackupCodesView] = useState<string[] | null>(null);
  const [backupCodesLoading, setBackupCodesLoading] = useState(false);
  const backupCodesFromSetup = useMemo(() => twoFASetup?.backupCodes ?? [], [twoFASetup]);
  const twoFaManualKeyRaw = useMemo(() => getTotpManualEntryRaw(twoFASetup), [twoFASetup]);

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

  const openDisable2FAPasswordModal = useCallback(() => {
    setTwoFAPasswordInput('');
    setTwoFAPasswordModal({ action: 'disable' });
  }, []);

  const handleToggle2FA = useCallback(() => {
    const action = settings?.two_factor_enabled ? 'disable' : 'enable';
    if (action === 'disable') {
      openDisable2FAPasswordModal();
      return;
    }
    setTwoFAPasswordInput('');
    setTwoFAPasswordModal({ action: 'enable' });
  }, [settings?.two_factor_enabled, openDisable2FAPasswordModal]);

  const handle2FAPasswordConfirm = useCallback(async () => {
    if (!twoFAPasswordModal || !twoFAPasswordInput.trim()) return;
    const password = twoFAPasswordInput.trim();

    try {
      setUpdating('2fa');
      if (twoFAPasswordModal.action === 'enable') {
        const response = await enable2FA({ password });
        setTwoFASetup(response);
        setTwoFACode('');
      } else if (twoFAPasswordModal.action === 'disable') {
        await disable2FA({ password });
        setSettings((prev) => prev ? { ...prev, two_factor_enabled: false } : prev);
        showToast(t(`${I18N}.twoFactorDisabled`), 'info');
      } else {
        const response = await regenerateBackupCodes({ password });
        setBackupCodesView(response.backupCodes);
        showToast(t(`${I18N}.regenerateCodesSuccess`), 'success');
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
      } else if (twoFAPasswordModal.action === 'regenerate') {
        showToast(t('errors.regenerateBackupCodesFailed'), 'error');
      } else {
        showToast(t('errors.enable2FAFailed'), 'error');
      }
    } finally {
      setUpdating(null);
    }
  }, [twoFAPasswordModal, twoFAPasswordInput, showToast]);

  const handleVerify2FA = useCallback(async () => {
    const normalized = normalize2FAInput(twoFACode);
    if (!is2FAInputReady(normalized)) return;
    try {
      setUpdating('2fa-verify');
      await verify2FA({ token: normalized });
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

  const handleCopy = useCallback(async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      showToast(t('errors.copiedToClipboard'), 'success');
    } catch {
      showToast(t('errors.copyFailed'), 'error');
    }
  }, [showToast]);

  const buildBackupCodesBody = useCallback((codes: string[]): string => {
    const header = t(`${I18N}.backupCodesTitle`);
    const hint = t(`${I18N}.saveBackupCodes`);
    return `${header}\n${hint}\n\n${codes.join('\n')}\n`;
  }, []);

  const handleShareCodes = useCallback(async (codes: string[]) => {
    try {
      await Share.share({ message: buildBackupCodesBody(codes) });
    } catch {
      showToast(t('errors.copyFailed'), 'error');
    }
  }, [buildBackupCodesBody, showToast]);

  const handleDownloadCodes = useCallback(async (codes: string[]) => {
    try {
      const fileName = `mordobo-backup-codes-${Date.now()}.txt`;
      const dir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '';
      const uri = `${dir}${fileName}`;
      await FileSystem.writeAsStringAsync(uri, buildBackupCodesBody(codes), { encoding: FileSystem.EncodingType.UTF8 });
      await Share.share({ url: uri, message: buildBackupCodesBody(codes), title: fileName });
      showToast(t(`${I18N}.backupCodesSaved`, { file: fileName }), 'success');
    } catch {
      showToast(t('errors.copyFailed'), 'error');
    }
  }, [buildBackupCodesBody, showToast]);

  const handleOpenBackupCodes = useCallback(async () => {
    try {
      setBackupCodesLoading(true);
      const res = await getBackupCodes();
      setBackupCodesView(res.backupCodes);
    } catch {
      showToast(t('errors.getBackupCodesFailed'), 'error');
    } finally {
      setBackupCodesLoading(false);
    }
  }, [showToast]);

  const handleRegenerateCodes = useCallback(() => {
    Alert.alert(
      t(`${I18N}.regenerateCodesConfirmTitle`),
      t(`${I18N}.regenerateCodesConfirmMessage`),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t(`${I18N}.regenerateCodes`),
          style: 'destructive',
          onPress: () => {
            setTwoFAPasswordInput('');
            setTwoFAPasswordModal({ action: 'regenerate' });
          },
        },
      ],
    );
  }, []);

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
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 16, paddingBottom: 20, backgroundColor: colors.card }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t(`${I18N}.title`)}</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, paddingBottom: 20, backgroundColor: colors.card }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t(`${I18N}.title`)}</Text>
        {updating ? <ActivityIndicator size="small" color={colors.primary} style={{ width: 32 }} /> : <View style={styles.headerPlaceholder} />}
      </View>

      <ScrollView style={[styles.scroll, { backgroundColor: colors.background }]} contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{t(`${I18N}.sectionPassword`)}</Text>
        <TouchableOpacity style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} activeOpacity={0.8} onPress={handleChangePassword}>
          <View style={[styles.iconBox, { backgroundColor: `${colors.primary}20` }]}>
            <Ionicons name="key-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{t(`${I18N}.changePassword`)}</Text>
            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>{t(`${I18N}.changePasswordDesc`)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 28, color: colors.textTertiary }]}>{t(`${I18N}.section2FA`)}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.iconBox, { backgroundColor: `${colors.primary}20` }]}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{t(`${I18N}.twoFactorAuth`)}</Text>
            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>{t(`${I18N}.methodAuthenticatorDesc`)}</Text>
          </View>
          <Switch
            value={settings?.two_factor_enabled ?? false}
            onValueChange={handleToggle2FA}
            trackColor={{ false: colors.cardBorder, true: '#22C55E' }}
            thumbColor="#fff"
          />
        </View>

        {settings?.two_factor_enabled && (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, marginTop: 12 }]}
            activeOpacity={0.8}
            onPress={handleOpenBackupCodes}
            disabled={backupCodesLoading}
          >
            <View style={[styles.iconBox, { backgroundColor: `${colors.primary}20` }]}>
              <Ionicons name="key-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{t(`${I18N}.backupCodesManage`)}</Text>
              <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>{t(`${I18N}.backupCodesManageDesc`)}</Text>
            </View>
            {backupCodesLoading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />}
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal visible={passwordModal?.visible === true} transparent animationType="fade" onRequestClose={() => setPasswordModal(null)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity
            style={[styles.modalOverlay, styles.modalOverlayTouchable]}
            activeOpacity={1}
            onPress={() => setPasswordModal(null)}
          />
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
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
              <TouchableOpacity style={[styles.modalCancelBtn, { backgroundColor: colors.background }]} onPress={() => { setPasswordModal(null); setPasswordInput(''); }}>
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: colors.primary }, !passwordInput.trim() && styles.modalBtnDisabled]}
                onPress={handlePasswordStep}
                disabled={!passwordInput.trim() || !!updating}
              >
                {updating === 'password' ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalConfirmText}>{t('common.confirm')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={twoFAPasswordModal !== null} transparent animationType="fade" onRequestClose={() => setTwoFAPasswordModal(null)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity
            style={[styles.modalOverlay, styles.modalOverlayTouchable]}
            activeOpacity={1}
            onPress={() => setTwoFAPasswordModal(null)}
          />
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
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
                style={[styles.modalConfirmBtn, { backgroundColor: colors.primary }, !twoFAPasswordInput.trim() && styles.modalBtnDisabled]}
                onPress={handle2FAPasswordConfirm}
                disabled={!twoFAPasswordInput.trim() || !!updating}
              >
                {updating === '2fa' ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalConfirmText}>{t('common.confirm')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={twoFASetup !== null}
        transparent
        animationType="fade"
        statusBarTranslucent={Platform.OS === 'android'}
        presentationStyle="overFullScreen"
        onRequestClose={() => setTwoFASetup(null)}
      >
        <View style={styles.twoFAModalRoot}>
          <View
            style={[
              styles.twoFAOverlayInset,
              {
                top: insets.top + TWO_FA_DIM_GAP_TOP,
                bottom: insets.bottom + TWO_FA_DIM_GAP_BOTTOM,
                left: TWO_FA_DIM_GAP_H,
                right: TWO_FA_DIM_GAP_H,
                backgroundColor: TWO_FA_DIM_BG,
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
                  <Text style={[styles.methodLabel, { color: colors.textTertiary }]}>{t(`${I18N}.method`)}</Text>
                  <Text style={[styles.methodValue, { color: colors.textPrimary }]}>{t(`${I18N}.methodAuthenticator`)}</Text>

                  {!!twoFaManualKeyRaw && (
                    <View style={[styles.setupKeyBox, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
                      <Text style={[styles.manualEntryPrimary, { color: colors.textPrimary }]}>{t(`${I18N}.manualEntryPrimary`)}</Text>
                      <Text style={[styles.backupTitle, { color: colors.textPrimary, marginTop: 8 }]}>{t(`${I18N}.setupKey`)}</Text>
                      <Text style={[styles.backupHint, { color: colors.textSecondary }]}>{t(`${I18N}.setupKeyHint`)}</Text>
                      <View style={styles.setupKeyRow}>
                        <Text
                          style={[styles.setupKeyValueMultiline, { color: colors.textPrimary, borderColor: colors.cardBorder }]}
                          selectable
                        >
                          {formatTotpSecretForDisplay(twoFaManualKeyRaw)}
                        </Text>
                        <TouchableOpacity
                          onPress={() => handleCopy(twoFaManualKeyRaw)}
                          style={[styles.copyBtn, { backgroundColor: `${colors.primary}20` }]}
                          accessibilityRole="button"
                          accessibilityLabel={t(`${I18N}.copy`)}
                        >
                          <Ionicons name="copy-outline" size={16} color={colors.primary} />
                          <Text style={[styles.copyBtnText, { color: colors.primary }]}>{t(`${I18N}.copy`)}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {twoFASetup?.qrCode ? (
                    <>
                      <Text style={[styles.modalSubtitle, { marginTop: 16, color: colors.textSecondary }]}>{t(`${I18N}.orScanQR`)}</Text>
                      <View style={styles.qrContainer}>
                        <Image source={{ uri: twoFASetup.qrCode }} style={styles.qrImage} resizeMode="contain" />
                      </View>
                    </>
                  ) : null}

                  <Text style={[styles.modalSubtitle, { marginTop: 12, color: colors.textSecondary }]}>{t(`${I18N}.codeOrBackup`)}</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                    placeholder="000000"
                    placeholderTextColor={colors.textSecondary}
                    value={twoFACode}
                    onChangeText={(v) => setTwoFACode(normalize2FAInput(v))}
                    keyboardType="default"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={8}
                    textAlign="center"
                    returnKeyType="done"
                    onSubmitEditing={handleVerify2FA}
                  />
                  {backupCodesFromSetup.length > 0 && (
                    <View style={[styles.backupBox, { backgroundColor: colors.background }]}>
                      <Text style={[styles.backupTitle, { color: colors.textPrimary }]}>{t(`${I18N}.backupCodes`)}</Text>
                      <Text style={[styles.backupHint, { color: colors.textSecondary }]}>{t(`${I18N}.saveBackupCodes`)}</Text>
                      <View style={styles.backupCodesGrid}>
                        {backupCodesFromSetup.map((code) => (
                          <TouchableOpacity key={code} onPress={() => handleCopy(code)} activeOpacity={0.7}>
                            <Text style={[styles.backupCode, { color: colors.primary, backgroundColor: `${colors.primary}20` }]}>{code}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <View style={styles.backupActionsRow}>
                        <TouchableOpacity style={[styles.backupActionBtn, { borderColor: colors.cardBorder }]} onPress={() => handleCopy(backupCodesFromSetup.join('\n'))}>
                          <Ionicons name="copy-outline" size={14} color={colors.primary} />
                          <Text style={[styles.backupActionText, { color: colors.primary }]}>{t(`${I18N}.copyCodes`)}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.backupActionBtn, { borderColor: colors.cardBorder }]} onPress={() => handleShareCodes(backupCodesFromSetup)}>
                          <Ionicons name="share-outline" size={14} color={colors.primary} />
                          <Text style={[styles.backupActionText, { color: colors.primary }]}>{t(`${I18N}.shareCodes`)}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.backupActionBtn, { borderColor: colors.cardBorder }]} onPress={() => handleDownloadCodes(backupCodesFromSetup)}>
                          <Ionicons name="download-outline" size={14} color={colors.primary} />
                          <Text style={[styles.backupActionText, { color: colors.primary }]}>{t(`${I18N}.downloadCodes`)}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  <View style={styles.modalButtons}>
                    <TouchableOpacity style={[styles.modalCancelBtn, { backgroundColor: colors.background }]} onPress={() => { setTwoFASetup(null); setTwoFACode(''); }}>
                      <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalConfirmBtn, { backgroundColor: colors.primary }, !is2FAInputReady(twoFACode) && styles.modalBtnDisabled]}
                      onPress={handleVerify2FA}
                      disabled={!is2FAInputReady(twoFACode) || !!updating}
                    >
                      {updating === '2fa-verify' ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalConfirmText}>{t(`${I18N}.verify`)}</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={backupCodesView !== null}
        transparent
        animationType="fade"
        statusBarTranslucent={Platform.OS === 'android'}
        presentationStyle="overFullScreen"
        onRequestClose={() => setBackupCodesView(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalOverlayTouchable} activeOpacity={1} onPress={() => setBackupCodesView(null)} />
          <View style={[styles.modalBox, styles.backupModalBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t(`${I18N}.backupCodesTitle`)}</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>{t(`${I18N}.saveBackupCodes`)}</Text>
            {backupCodesView && backupCodesView.length > 0 ? (
              <>
                <View style={styles.backupCodesGrid}>
                  {backupCodesView.map((code) => (
                    <TouchableOpacity key={code} onPress={() => handleCopy(code)} activeOpacity={0.7}>
                      <Text style={[styles.backupCode, { color: colors.primary, backgroundColor: `${colors.primary}20` }]}>{code}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.backupActionsRow}>
                  <TouchableOpacity style={[styles.backupActionBtn, { borderColor: colors.cardBorder }]} onPress={() => handleCopy(backupCodesView.join('\n'))}>
                    <Ionicons name="copy-outline" size={14} color={colors.primary} />
                    <Text style={[styles.backupActionText, { color: colors.primary }]}>{t(`${I18N}.copyCodes`)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.backupActionBtn, { borderColor: colors.cardBorder }]} onPress={() => handleShareCodes(backupCodesView)}>
                    <Ionicons name="share-outline" size={14} color={colors.primary} />
                    <Text style={[styles.backupActionText, { color: colors.primary }]}>{t(`${I18N}.shareCodes`)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.backupActionBtn, { borderColor: colors.cardBorder }]} onPress={() => handleDownloadCodes(backupCodesView)}>
                    <Ionicons name="download-outline" size={14} color={colors.primary} />
                    <Text style={[styles.backupActionText, { color: colors.primary }]}>{t(`${I18N}.downloadCodes`)}</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 12 }}>—</Text>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalCancelBtn, { backgroundColor: colors.background }]} onPress={() => setBackupCodesView(null)}>
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>{t('common.close')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: colors.primary }]}
                onPress={handleRegenerateCodes}
                disabled={!!updating}
              >
                {updating === '2fa' ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalConfirmText}>{t(`${I18N}.regenerateCodes`)}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Toast message={toast?.message ?? ''} visible={toast !== null} onHide={() => setToast(null)} type={toast?.type ?? 'success'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
  },
  backButton: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontWeight: '600', textAlign: 'center' },
  headerPlaceholder: { width: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600' },
  rowDesc: { fontSize: 12, marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  twoFAModalRoot: {
    flex: 1,
    backgroundColor: 'transparent',
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
  modalOverlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalBox: {
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 360,
    borderWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  modalSubtitle: { fontSize: 13, textAlign: 'center', marginBottom: 12 },
  modalInput: {
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 15, fontWeight: '600' },
  modalConfirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  backupTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  backupHint: { fontSize: 12, marginBottom: 12 },
  backupCodesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  backupCode: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  methodLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
    textAlign: 'center',
  },
  methodValue: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  setupKeyBox: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  setupKeyRow: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
    marginTop: 8,
  },
  setupKeyValue: {
    flex: 1,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    letterSpacing: 1,
  },
  setupKeyValueMultiline: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  manualEntryPrimary: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'center',
    minWidth: 120,
  },
  copyBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  backupActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  backupActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  backupActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  backupModalBox: {
    width: '92%',
    maxWidth: 480,
  },
});
