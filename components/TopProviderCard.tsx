import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface TopProviderCardProps {
  id: string;
  name: string;
  profileImage?: string;
  serviceCategory?: string;
  rating: number;
  reviewCount: number;
  hourlyRate?: number;
  onPress?: () => void;
}

export function TopProviderCard({
  name,
  profileImage,
  serviceCategory,
  rating,
  reviewCount,
  hourlyRate,
  onPress,
}: TopProviderCardProps) {
  // Convert rating to number to handle cases where API returns string or null/undefined
  const ratingValue = typeof rating === 'number' ? rating : (typeof rating === 'string' ? parseFloat(rating) : 0);
  const safeRating = isNaN(ratingValue) ? 0 : ratingValue;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Image
        source={{ uri: profileImage || 'https://via.placeholder.com/70' }}
        style={styles.image}
      />
      <View style={styles.info}>
        <View style={styles.headerRow}>
          <View style={styles.nameSection}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            {serviceCategory && (
              <Text style={styles.category}>{serviceCategory}</Text>
            )}
          </View>
          <TouchableOpacity style={styles.favoriteButton}>
            <Ionicons name="heart-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
        <View style={styles.footerRow}>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.rating}>{safeRating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({reviewCount})</Text>
          </View>
          {hourlyRate && (
            <Text style={styles.price}>${hourlyRate}/hr</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#252542',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    gap: 14,
  },
  image: {
    width: 70,
    height: 70,
    borderRadius: 14,
    backgroundColor: '#2d2d4a',
  },
  info: {
    flex: 1,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  nameSection: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  category: {
    fontSize: 14,
    color: '#10B981',
    marginBottom: 0,
  },
  favoriteButton: {
    padding: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 13,
    color: '#F59E0B',
    marginLeft: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3B82F6',
  },
});
