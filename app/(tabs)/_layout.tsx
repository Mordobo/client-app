import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { AppState, AppStateStatus, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { useThemeColors } from '@/hooks/useThemeColors';
import { fetchUnreadCount } from '@/services/conversations';
import { fetchUnreadNotificationCount } from '@/services/notifications';

const CHAT_UNREAD_POLL_MS = 5000; // Check every 5s so new messages show quickly

function ChatTabIcon({ color, focused }: { color: string; focused: boolean }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await fetchUnreadCount();
      setUnreadCount(count);
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, CHAT_UNREAD_POLL_MS);
    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  // Refresh badge when user switches to Chat tab (e.g. after leaving a conversation) (MDB-160 / MDB-244)
  useEffect(() => {
    if (focused) loadUnreadCount();
  }, [focused, loadUnreadCount]);

  // Refresh badge when app comes to foreground so new message indicator appears right away
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') loadUnreadCount();
    });
    return () => sub.remove();
  }, [loadUnreadCount]);

  return (
    <View>
      <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={20} color={color} />
      {unreadCount > 0 && (
        <View style={styles.badgeDot} />
      )}
    </View>
  );
}

function NotificationsTabIcon({ color, focused }: { color: string; focused: boolean }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await fetchUnreadNotificationCount();
      setUnreadCount(count);
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  return (
    <View>
      <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={20} color={color} />
      {unreadCount > 0 && (
        <View style={styles.badgeDot} />
      )}
    </View>
  );
}

export default function TabLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { isAuthenticated } = useAuth();
  const { mode, isLoading } = useMode();

  // After login: redirect to provider dashboard when saved mode is provider (synced with DB)
  // Must run before any early return so hook order is stable when isAuthenticated flips (e.g. logout).
  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    if (mode === 'provider') {
      router.replace('/(provider-tabs)');
    }
  }, [isAuthenticated, isLoading, mode, router]);

  if (!isAuthenticated) {
    return <Redirect href="/(auth)" />;
  }

  // Calculate bottom padding respecting safe area
  const bottomPadding = Math.max(insets.bottom, 24);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabBarInactive,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopWidth: 1,
          borderTopColor: colors.tabBarBorder,
          paddingVertical: 12,
          paddingBottom: bottomPadding,
          height: 60 + bottomPadding,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        // Label styling from JSX: fontSize: '10px'
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '400',
        },
        // Icon size from JSX: fontSize: '20px' (but we use 20px for icons)
        tabBarIconStyle: {
          marginBottom: 0,
        },
        // Opacity from JSX: opacity: active === item.id ? 1 : 0.5
        // This is handled by tabBarActiveTintColor and tabBarInactiveTintColor
        // But we can add item style for inactive tabs
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Reservas', // From JSX: 'Reservas'
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, focused }) => <ChatTabIcon color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alertas', // From JSX: 'Alertas'
          tabBarIcon: ({ color, focused }) => (
            <NotificationsTabIcon color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil', // From JSX: 'Perfil'
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    position: 'absolute',
    top: -2,
    right: -2,
  },
});
