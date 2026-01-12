import { useRouter } from 'expo-router';
import { useEffect } from 'react';

// This screen redirects to /orders
export default function BookingsScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/orders');
  }, [router]);

  return null;
}
