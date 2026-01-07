import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AssistantScreen() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const insets = useSafeAreaInsets();

  const serviceCategories = [
    { id: 1, nameKey: 'cleaning', icon: 'sparkles', color: '#3B82F6' },
    { id: 2, nameKey: 'plumbing', icon: 'construct', color: '#6B7280' },
    { id: 3, nameKey: 'carWash', icon: 'car', color: '#3B82F6' },
    { id: 4, nameKey: 'haircut', icon: 'cut', color: '#EC4899' },
    { id: 5, nameKey: 'electrical', icon: 'flash', color: '#F59E0B' },
    { id: 6, nameKey: 'painting', icon: 'brush', color: '#F97316' },
    { id: 7, nameKey: 'moving', icon: 'cube', color: '#A78BFA' },
    { id: 8, nameKey: 'applianceRepair', icon: 'settings', color: '#6B7280' },
    { id: 9, nameKey: 'landscaping', icon: 'leaf', color: '#10B981' },
    { id: 10, nameKey: 'petCare', icon: 'paw', color: '#F97316' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3B82F6" />
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>{t('home.hello', { name: user?.firstName || 'Guest' })}</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="mic-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="chatbubble-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Greeting Card */}
        <View style={styles.greetingCard}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={32} color="#10B981" />
          </View>
          <Text style={styles.greetingText}>{t('home.hello', { name: user?.firstName || 'Guest' })}</Text>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('home.searchPlaceholder')}
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Suggestion Text */}
        <Text style={styles.suggestionText}>
          Try saying: "I need a plumber tomorrow morning"
        </Text>

        {/* Recommended Categories */}
        <View style={styles.categoriesContainer}>
          <Text style={styles.sectionTitle}>Recommended for you</Text>
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

        {/* Other Services Button */}
        <TouchableOpacity style={styles.otherServicesButton}>
          <Text style={styles.otherServicesText}>Other Services</Text>
          <Ionicons name="chevron-forward" size={20} color="#10B981" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  greetingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  suggestionText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 24,
    textAlign: 'center',
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
    width: '18%',
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
    fontSize: 11,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  otherServicesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  otherServicesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    marginRight: 8,
  },
});






