import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { t } from '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { colorScheme } = useTheme();
  const insets = useSafeAreaInsets();
  
  const isDark = colorScheme === 'dark';
  const themeColors = {
    background: isDark ? '#151718' : '#F9FAFB',
    surface: isDark ? '#1F2937' : '#FFFFFF',
    textPrimary: isDark ? '#ECEDEE' : '#1F2937',
    textSecondary: isDark ? '#9BA1A6' : '#6B7280',
    border: isDark ? '#374151' : '#E5E7EB',
    borderLight: isDark ? '#4B5563' : '#F3F4F6',
    icon: isDark ? '#9BA1A6' : '#374151',
  };

  const handleLogout = () => {
    Alert.alert(
      t('home.logout'),
      'Are you sure you want to logout?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('home.logout'), 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert(t('common.error'), 'Failed to logout');
            }
          }
        }
      ]
    );
  };

  const menuSections = [
    {
      title: 'Account',
      items: [
        { icon: 'card-outline', label: 'Payment Methods', route: '/profile/payment-methods' },
        { icon: 'calendar-outline', label: 'My Bookings', route: '/orders' },
        { icon: 'chatbubble-outline', label: 'Chat History', route: '/profile/chat-history' },
        { icon: 'document-text-outline', label: 'Invoices', route: '/profile/invoices' },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: 'help-circle-outline', label: 'Help Center', route: '/profile/support' },
        { icon: 'settings-outline', label: 'Settings', route: '/profile/settings' },
      ],
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16), backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
        <Text style={[styles.title, { color: themeColors.textPrimary }]}>{t('profile.title')}</Text>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info Card */}
        {user && (
          <View style={[styles.userInfoContainer, { backgroundColor: themeColors.surface }]}>
            <View style={styles.avatarContainer}>
              {user.avatar ? (
                <Image
                  source={{ uri: user.avatar }}
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              ) : (
                <Ionicons name="person" size={40} color="#10B981" />
              )}
            </View>
            <Text style={[styles.userName, { color: themeColors.textPrimary }]}>{user.firstName} {user.lastName}</Text>
            <Text style={[styles.userEmail, { color: themeColors.textSecondary }]}>{user.email}</Text>
            {user.phone && (
              <Text style={[styles.userPhone, { color: themeColors.textSecondary }]}>{user.phone}</Text>
            )}
            <TouchableOpacity
              style={styles.editProfileChip}
              onPress={() => router.push('/profile/edit')}
            >
              <Text style={styles.editProfileText}>{t('profile.editProfile')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Menu Sections */}
        {menuSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.menuSection}>
            <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>{section.title}</Text>
            <View style={[styles.menuContainer, { backgroundColor: themeColors.surface }]}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.menuItem,
                    { borderBottomColor: themeColors.borderLight },
                    itemIndex === section.items.length - 1 && styles.menuItemLast,
                  ]}
                  onPress={() => {
                    if (item.route) {
                      router.push(item.route as any);
                    }
                  }}
                >
                  <Ionicons name={item.icon as any} size={24} color={themeColors.icon} />
                  <Text style={[styles.menuText, { color: themeColors.textPrimary }]}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={20} color={themeColors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>{t('home.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  userInfoContainer: {
    padding: 24,
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  userName: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 16,
    marginBottom: 12,
  },
  editProfileChip: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
  },
  menuSection: {
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  menuContainer: {
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    marginHorizontal: 20,
    marginVertical: 24,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: {
    color: '#EF4444',
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 16,
  },
});

