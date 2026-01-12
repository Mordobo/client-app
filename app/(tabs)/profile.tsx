import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { t } from '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchOrders } from '@/services/orders';

interface UserStats {
  services: number;
  reviews: number;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { colorScheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<UserStats>({ services: 0, reviews: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  
  // Exact colors from JSX
  const isDark = colorScheme === 'dark';
  const themeColors = {
    background: isDark ? '#1a1a2e' : '#F9FAFB',
    bgCard: isDark ? '#252542' : '#FFFFFF',
    bgInput: isDark ? '#2d2d4a' : '#F3F4F6',
    textPrimary: isDark ? '#FFFFFF' : '#1F2937',
    textSecondary: isDark ? '#9ca3af' : '#6B7280',
    border: isDark ? '#374151' : '#E5E7EB',
    primary: '#3b82f6',
    secondary: '#10b981',
    danger: '#ef4444',
  };

  const loadStats = useCallback(async () => {
    try {
      const ordersData = await fetchOrders();
      
      setStats({
        services: ordersData.orders.length,
        reviews: 0, // TODO: Get from reviews endpoint when available
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      // Keep default values on error
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleLogout = () => {
    Alert.alert(
      t('profile.logout'),
      t('profile.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('profile.logout'), 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert(t('common.error'), t('profile.logoutError'));
            }
          }
        }
      ]
    );
  };

  const menuItems = [
    { icon: '👤', label: t('profile.editProfile'), route: '/profile/edit' },
    { icon: '📍', label: t('profile.myAddresses'), route: '/profile/edit' }, // TODO: Add addresses route
    { icon: '💳', label: t('profile.paymentMethods'), route: '/profile/payment-methods' },
    { icon: '❤️', label: t('profile.favorites'), route: '/profile/edit' }, // TODO: Add favorites route
    { icon: '🔔', label: t('profile.notifications'), route: '/profile/settings' },
    { icon: '❓', label: t('profile.helpCenter'), route: '/profile/support' },
  ];

  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : '';

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header - Exact match to JSX: padding: '50px 20px 30px', backgroundColor: colors.bgCard */}
        <View style={[styles.header, { 
          paddingTop: Math.max(insets.top + 20, 50),
          backgroundColor: themeColors.bgCard 
        }]}>
          <View style={styles.profileHeader}>
            {/* Avatar - Exact match: width: '80px', height: '80px', borderRadius: '50%', border: '3px solid primary' */}
            <View style={[styles.avatarContainer, { 
              backgroundColor: themeColors.bgInput,
              borderColor: themeColors.primary 
            }]}>
              {user?.avatar ? (
                <Image
                  source={{ uri: user.avatar }}
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              ) : (
                <Ionicons name="person" size={40} color={themeColors.primary} />
              )}
            </View>
            <View style={styles.profileInfo}>
              {/* Name - Exact match: fontSize: '22px', fontWeight: '700' */}
              <Text style={[styles.userName, { color: themeColors.textPrimary }]}>
                {fullName || t('profile.guest')}
              </Text>
              {/* Email - Exact match: fontSize: '14px', color: textSecondary */}
              <Text style={[styles.userEmail, { color: themeColors.textSecondary }]}>
                {user?.email || ''}
              </Text>
              {/* Badge - Exact match: backgroundColor: secondary20, padding: '4px 10px', borderRadius: '12px' */}
              <View style={[styles.badge, { backgroundColor: `${themeColors.secondary}20` }]}>
                <Text style={[styles.badgeText, { color: themeColors.secondary }]}>
                  ⭐ {t('profile.goldClient')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Cards - Exact match: display: 'flex', padding: '20px', gap: '12px', marginTop: '-10px' */}
        <View style={[styles.statsContainer, { marginTop: -10 }]}>
          {[
            { value: loadingStats ? '...' : stats.services.toString(), label: t('profile.services') },
            { value: loadingStats ? '...' : stats.reviews.toString(), label: t('profile.reviews') },
          ].map((stat, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: themeColors.bgCard }]}>
              {/* Value - Exact match: color: primary, fontSize: '20px', fontWeight: '700' */}
              <Text style={[styles.statValue, { color: themeColors.primary }]}>
                {stat.value}
              </Text>
              {/* Label - Exact match: color: textSecondary, fontSize: '12px' */}
              <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Menu Items - Exact match: padding: '0 20px' */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.menuItem,
                { borderBottomColor: themeColors.border },
                i === menuItems.length - 1 && styles.menuItemLast
              ]}
              onPress={() => {
                if (item.route) {
                  router.push(item.route as any);
                }
              }}
              activeOpacity={0.7}
            >
              {/* Icon - Exact match: fontSize: '20px' */}
              <Text style={styles.menuIcon}>{item.icon}</Text>
              {/* Label - Exact match: fontSize: '15px', flex: 1 */}
              <Text style={[styles.menuLabel, { color: themeColors.textPrimary }]}>
                {item.label}
              </Text>
              {/* Chevron - Exact match: color: textSecondary, fontSize: '16px' */}
              <Text style={[styles.menuChevron, { color: themeColors.textSecondary }]}>
                ›
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button - Exact match: padding: '20px', backgroundColor: danger20, borderRadius: '12px' */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: `${themeColors.danger}20` }]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutIcon}>🚪</Text>
            <Text style={[styles.logoutText, { color: themeColors.danger }]}>
              {t('profile.logout')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Version - From requirements */}
        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: themeColors.textSecondary }]}>
            Version 1.0.3
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for bottom nav
  },
  // Header: padding: '50px 20px 30px' from JSX
  header: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  // Avatar: width: '80px', height: '80px', borderRadius: '50%', border: '3px solid primary' from JSX
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  profileInfo: {
    flex: 1,
  },
  // Name: fontSize: '22px', fontWeight: '700' from JSX
  userName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  // Email: fontSize: '14px' from JSX
  userEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  // Badge: padding: '4px 10px', borderRadius: '12px' from JSX
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
  },
  // Stats: display: 'flex', padding: '20px', gap: '12px' from JSX
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  // Stat Card: flex: 1, backgroundColor: bgCard, borderRadius: '12px', padding: '16px', textAlign: 'center' from JSX
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  // Value: color: primary, fontSize: '20px', fontWeight: '700' from JSX
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  // Label: fontSize: '12px' from JSX
  statLabel: {
    fontSize: 12,
  },
  // Menu: padding: '0 20px' from JSX
  menuContainer: {
    paddingHorizontal: 20,
  },
  // Menu Item: display: 'flex', gap: '14px', padding: '16px 0' from JSX
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIcon: {
    fontSize: 20,
  },
  // Label: fontSize: '15px', flex: 1 from JSX
  menuLabel: {
    fontSize: 15,
    flex: 1,
  },
  // Chevron: fontSize: '16px' from JSX
  menuChevron: {
    fontSize: 16,
  },
  // Logout: padding: '20px' from JSX
  logoutContainer: {
    padding: 20,
  },
  // Logout Button: padding: '16px', borderRadius: '12px', display: 'flex', gap: '8px' from JSX
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutIcon: {
    fontSize: 20,
  },
  // Logout Text: fontSize: '15px', fontWeight: '600' from JSX
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  versionText: {
    fontSize: 12,
  },
});
