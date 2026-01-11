import { Redirect } from 'expo-router';

export default function AuthIndex() {
  // Welcome screen is now the first screen users see
  return <Redirect href="/(auth)/welcome" />;
}
