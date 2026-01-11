import { Redirect } from 'expo-router';

export default function AuthIndex() {
  // Always redirect to login screen
  // Welcome screen will be shown after successful login if it's the first time
  return <Redirect href="/(auth)/login" />;
}
