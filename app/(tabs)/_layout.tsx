import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchUnreadCount } from '@/services/conversations';
import { fetchUnreadNotificationCount } from '@/services/notifications';

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
    const interval = setInterval(loadUnreadCount, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  return (
    <View>
      <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={20} color={color} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
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
  const colorScheme = useColorScheme();
  const router = useRouter();
  const isDark = colorScheme === 'dark';

  // Exact colors from JSX
  const tabBarColors = {
    bgCard: isDark ? '#252542' : '#FFFFFF',
    border: isDark ? '#374151' : '#E5E7EB',
    primary: '#3b82f6',
    textSecondary: isDark ? '#9ca3af' : '#6B7280',
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tabBarColors.primary,
        tabBarInactiveTintColor: tabBarColors.textSecondary,
        headerShown: false,
        tabBarButton: HapticTab,
        // Exact styling from JSX: padding: '12px 0 24px', backgroundColor: colors.bgCard, borderTop: 1px solid colors.border
        tabBarStyle: {
          backgroundColor: tabBarColors.bgCard,
          borderTopWidth: 1,
          borderTopColor: tabBarColors.border,
          paddingVertical: 12,
          paddingBottom: 24,
          height: 60 + 24, // Base height + bottom padding
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
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
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
