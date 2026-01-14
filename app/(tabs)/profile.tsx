import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Platform,
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
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<UserStats>({ services: 0, reviews: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const ordersData = await fetchOrders();
      
      setStats({
        services: Array.isArray(ordersData) ? ordersData.length : 0,
        reviews: 0, // TODO: Get from reviews endpoint when available
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      // Keep default values on error
      setStats({ services: 0, reviews: 0 });
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleLogout = () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'profile.tsx:66',message:'handleLogout called',data:{platform:Platform.OS},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    const performLogout = async () => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'profile.tsx:75',message:'Alert onPress callback executed',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            
            try {
              console.log('[Profile] ========== LOGOUT BUTTON PRESSED ==========');
              
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'profile.tsx:79',message:'Before logout() call',data:{hasUser:!!user},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
              // #endregion
              
              // Perform logout (clears user state and storage)
              await logout();
              
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'profile.tsx:82',message:'After logout() call',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
              // #endregion
              
              console.log('[Profile] Logout function completed, navigating...');
              
              // Use a small delay to ensure state has updated
              // Then navigate to auth root which will redirect to welcome
              setTimeout(() => {
                try {
                  console.log('[Profile] Attempting navigation to /(auth)...');
                  
                  // #region agent log
                  fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'profile.tsx:90',message:'Before router.replace',data:{target:'/(auth)'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
                  // #endregion
                  
                  // Navigate to auth root - the index will redirect to welcome
                  router.replace('/(auth)');
                  
                  // #region agent log
                  fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'profile.tsx:92',message:'After router.replace',data:{target:'/(auth)',success:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
                  // #endregion
                  
                  console.log('[Profile] Navigation completed');
                } catch (navError) {
                  // #region agent log
                  fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'profile.tsx:93',message:'Navigation error caught',data:{error:String(navError)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
                  // #endregion
                  
                  console.error('[Profile] Navigation error:', navError);
                  // Try alternative navigation
                  try {
                    router.replace('/(auth)/welcome');
                  } catch (altNavError) {
                    console.error('[Profile] Alternative navigation also failed:', altNavError);
                  }
                }
              }, 100);
            } catch (error) {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'profile.tsx:102',message:'Logout error caught',data:{error:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
              // #endregion
              
              console.error('[Profile] Logout error:', error);
              // Even if logout fails, try to navigate
              try {
                router.replace('/(auth)');
              } catch (navError) {
                console.error('[Profile] Navigation error after logout failure:', navError);
                Alert.alert(t('common.error'), t('profile.logoutError'));
              }
            }
    };
    
    // Handle Alert differently on web vs mobile
    if (Platform.OS === 'web') {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'profile.tsx:115',message:'Using window.confirm for web',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      const confirmed = window.confirm(`${t('profile.logout')}\n\n${t('profile.logoutConfirm')}`);
      if (confirmed) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'profile.tsx:118',message:'window.confirm returned true - executing logout',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        performLogout();
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'profile.tsx:121',message:'window.confirm returned false - cancelled',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
      }
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'profile.tsx:125',message:'Using Alert.alert for mobile',data:{platform:Platform.OS},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      Alert.alert(
        t('profile.logout'),
        t('profile.logoutConfirm'),
        [
          { 
            text: t('common.cancel'), 
            style: 'cancel',
          },
          { 
            text: t('profile.logout'), 
            style: 'destructive',
            onPress: performLogout,
          }
        ]
      );
    }
  };

  const menuItems = [
    { icon: '👤', label: t('profile.editProfile'), route: '/profile/edit' },
    { icon: '📍', label: t('profile.myAddresses'), route: '/profile/my-addresses' },
    { icon: '💳', label: t('profile.paymentMethods'), route: '/profile/payment-methods' },
    { icon: '❤️', label: t('profile.favorites'), route: '/profile/favorites' },
    { icon: '🔔', label: t('profile.notifications'), route: '/profile/settings' },
    { icon: '❓', label: t('profile.helpCenter'), route: '/profile/support' },
  ];

  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : '';

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header - Exact match to JSX: padding: '50px 20px 30px', backgroundColor: colors.bgCard */}
        <View style={[styles.header, { 
          paddingTop: Math.max(insets.top + 20, 50),
        }]}>
          <View style={styles.profileHeader}>
            {/* Avatar - Exact match: width: '80px', height: '80px', borderRadius: '50%', border: '3px solid primary' */}
            <View style={styles.avatarContainer}>
              {user?.avatar ? (
                <Image
                  source={{ uri: user.avatar }}
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              ) : (
                <Ionicons name="person" size={40} color="#3b82f6" />
              )}
            </View>
            <View style={styles.profileInfo}>
              {/* Name - Exact match: fontSize: '22px', fontWeight: '700' */}
              <Text style={styles.userName}>
                {fullName || t('profile.guest')}
              </Text>
              {/* Email - Exact match: fontSize: '14px', color: textSecondary */}
              <Text style={styles.userEmail}>
                {user?.email || ''}
              </Text>
              {/* Badge - Exact match: backgroundColor: secondary20, padding: '4px 10px', borderRadius: '12px' */}
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
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
            <View key={i} style={styles.statCard}>
              {/* Value - Exact match: color: primary, fontSize: '20px', fontWeight: '700' */}
              <Text style={styles.statValue}>
                {stat.value}
              </Text>
              {/* Label - Exact match: color: textSecondary, fontSize: '12px' */}
              <Text style={styles.statLabel}>
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
              <Text style={styles.menuLabel}>
                {item.label}
              </Text>
              {/* Chevron - Exact match: color: textSecondary, fontSize: '16px' */}
              <Text style={styles.menuChevron}>
                ›
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button - Exact match: padding: '20px', backgroundColor: danger20, borderRadius: '12px' */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'profile.tsx:197',message:'Logout button onPress triggered',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
              // #endregion
              handleLogout();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutIcon}>🚪</Text>
            <Text style={styles.logoutText}>
              {t('profile.logout')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Version - From requirements */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>
            Version 1.0.5
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e', // Hardcode dark background like Home
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
    backgroundColor: '#252542', // Hardcode dark header
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
    borderColor: '#3b82f6', // Hardcode primary color
    backgroundColor: '#2d2d4a', // Hardcode dark input background
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
    color: '#FFFFFF', // Hardcode white text
  },
  // Email: fontSize: '14px' from JSX
  userEmail: {
    fontSize: 14,
    marginBottom: 8,
    color: '#9ca3af', // Hardcode secondary text
  },
  // Badge: padding: '4px 10px', borderRadius: '12px' from JSX
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#10b98120', // Hardcode secondary20
  },
  badgeText: {
    fontSize: 12,
    color: '#10b981', // Hardcode secondary color
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
    backgroundColor: '#252542', // Hardcode dark card background
  },
  // Value: color: primary, fontSize: '20px', fontWeight: '700' from JSX
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
    color: '#3b82f6', // Hardcode primary color
  },
  // Label: fontSize: '12px' from JSX
  statLabel: {
    fontSize: 12,
    color: '#9ca3af', // Hardcode secondary text
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
    borderBottomColor: '#374151', // Hardcode dark border
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
    color: '#FFFFFF', // Hardcode white text
  },
  // Chevron: fontSize: '16px' from JSX
  menuChevron: {
    fontSize: 16,
    color: '#9ca3af', // Hardcode secondary text
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
    backgroundColor: '#ef444420', // Hardcode danger20
  },
  logoutIcon: {
    fontSize: 20,
  },
  // Logout Text: fontSize: '15px', fontWeight: '600' from JSX
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444', // Hardcode danger color
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  versionText: {
    fontSize: 12,
    color: '#9ca3af', // Hardcode secondary text
  },
});
