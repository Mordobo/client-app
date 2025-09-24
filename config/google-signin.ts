import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Google Sign-In configuration
// Replace these values with your own Google Cloud Console credentials
export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    webClientId: '123456789-abcdefghijklmnop.apps.googleusercontent.com', // Replace with your Web Client ID
    offlineAccess: true,
    hostedDomain: '',
    forceCodeForRefreshToken: true,
  });
};

// Initialize Google Sign-In when the app starts
export const initializeGoogleSignIn = () => {
  configureGoogleSignIn();
};
