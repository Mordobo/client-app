import { Redirect } from 'expo-router';

export default function TabsIndex() {
  // Automatically redirect to the home screen
  return <Redirect href="/(tabs)/home" />;
}
