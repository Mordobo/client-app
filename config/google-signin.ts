import { t } from '@/i18n';
import { getGoogleSignin } from '@/utils/googleSignIn';

const getEnvValue = (key: string): string | undefined => {
  const value = process.env[key];
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const configureGoogleSignIn = () => {
  const GoogleSignin = getGoogleSignin();
  if (!GoogleSignin) {
    console.warn(t('warnings.googleSignInModuleUnavailable'));
    return;
  }

  const webClientId = getEnvValue('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');
  const iosClientId = getEnvValue('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID');

  if (!webClientId) {
    console.warn(t('warnings.googleSignInMissingWebClientId'));
  }

  GoogleSignin.configure({
    webClientId,
    iosClientId,
    offlineAccess: true,
    forceCodeForRefreshToken: true,
  });
};

export const initializeGoogleSignIn = () => {
  configureGoogleSignIn();
};
