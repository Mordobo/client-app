import { Redirect } from 'expo-router';

export default function AuthIndex() {
  // Automatically redirect to the login screen
  return <Redirect href="/(auth)/login" />;
}
