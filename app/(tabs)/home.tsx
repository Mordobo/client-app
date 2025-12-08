import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { t } from '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const scheme = useColorScheme();

  const handleLogout = () => {
    logout();
  };

  const serviceCategories = [
    { id: 1, nameKey: 'cleaning', icon: 'broom', color: '#3B82F6' },
    { id: 2, nameKey: 'plumbing', icon: 'construct', color: '#6B7280' },
    { id: 3, nameKey: 'carWash', icon: 'car', color: '#3B82F6' },
    { id: 4, nameKey: 'haircut', icon: 'cut', color: '#EC4899' },
    { id: 5, nameKey: 'electrical', icon: 'flash', color: '#F59E0B' },
    { id: 6, nameKey: 'painting', icon: 'car', color: '#F97316' },
    { id: 7, nameKey: 'moving', icon: 'home', color: '#A78BFA' },
    { id: 8, nameKey: 'applianceRepair', icon: 'settings', color: '#6B7280' },
  ];

  const upcomingAppointments = [
    {
      id: 1,
      service: 'House Cleaning',
      date: 'March 25 • 2:00 PM',
      address: '456 Elm St',
      icon: 'broom',
      color: '#3B82F6',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          </View>
          <Text style={styles.appName}>{t('auth.appName')}</Text>
        </View>
        <Text style={styles.location}>{t('home.location')}</Text>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Debug: current color scheme */}
        <View style={styles.debugBox}>
          <Text style={styles.debugText}>{t('home.colorScheme')}: {scheme ?? 'unknown'}</Text>
        </View>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('home.searchPlaceholder')}
            placeholderTextColor="#6B7280"
          />
        </View>

        {/* Service Categories */}
        <View style={styles.categoriesContainer}>
          <Text style={styles.sectionTitle}>{t('home.services')}</Text>
          <View style={styles.categoriesGrid}>
            {serviceCategories.map((category) => (
              <TouchableOpacity key={category.id} style={styles.categoryItem}>
                <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
                  <Ionicons name={category.icon as any} size={24} color="white" />
                </View>
                <Text style={styles.categoryText}>{t(`home.serviceCategories.${category.nameKey}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Book a Service */}
        <View style={styles.bookServiceContainer}>
          <View style={styles.bookServiceCard}>
            <View style={styles.bookServiceIcon}>
              <Ionicons name="calendar-outline" size={24} color="#10B981" />
              <View style={styles.clockOverlay}>
                <Ionicons name="time-outline" size={12} color="#10B981" />
              </View>
            </View>
            <View style={styles.bookServiceContent}>
              <Text style={styles.bookServiceTitle}>{t('home.bookService')}</Text>
              <Text style={styles.bookServiceSubtitle}>{t('home.selectServiceAndTime')}</Text>
              <Text style={styles.bookServiceSubtitle}>{t('home.confirmBooking')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </View>
        </View>

        {/* Upcoming Appointments */}
        <View style={styles.appointmentsContainer}>
          <Text style={styles.sectionTitle}>{t('home.upcomingAppointment')}</Text>
          {upcomingAppointments.map((appointment) => (
            <View key={appointment.id} style={styles.appointmentCard}>
              <View style={[styles.appointmentIcon, { backgroundColor: appointment.color }]}>
                <Ionicons name={appointment.icon as any} size={20} color="white" />
              </View>
              <View style={styles.appointmentContent}>
                <Text style={styles.appointmentService}>{appointment.service}</Text>
                <Text style={styles.appointmentDate}>{appointment.date}</Text>
                <Text style={styles.appointmentAddress}>{appointment.address}</Text>
                <TouchableOpacity style={styles.viewDetailsButton}>
                  <Text style={styles.viewDetailsText}>{t('home.viewDetails')}</Text>
                </TouchableOpacity>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </View>
          ))}
        </View>

        {/* User Info & Logout */}
        <View style={styles.userSection}>
          <Text style={styles.welcomeText}>{t('home.hello', { name: user?.firstName || '' })}</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>{t('home.logout')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    marginRight: 8,
  },
  appName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  location: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
    textAlign: 'center',
  },
  notificationButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  debugBox: {
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  debugText: {
    color: '#374151',
    fontSize: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 20,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  categoriesContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryItem: {
    alignItems: 'center',
    width: '22%',
    marginBottom: 16,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  bookServiceContainer: {
    marginBottom: 24,
  },
  bookServiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  bookServiceIcon: {
    position: 'relative',
    marginRight: 16,
  },
  clockOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 2,
  },
  bookServiceContent: {
    flex: 1,
  },
  bookServiceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  bookServiceSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  appointmentsContainer: {
    marginBottom: 24,
    alignContent: 'center',
  },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  appointmentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  appointmentContent: {
    flex: 1,
  },
  appointmentService: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  appointmentDate: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  appointmentAddress: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  viewDetailsButton: {
    alignSelf: 'flex-start',
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  userSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: {
    color: '#EF4444',
    marginLeft: 8,
    fontWeight: '500',
  },
});
