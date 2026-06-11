import { useFavorite } from '@/hooks/useFavorite';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ProviderAvatar } from '@/components/ProviderAvatar';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
  id,
  name,
  profileImage,
  serviceCategory,
  rating,
  reviewCount,
  hourlyRate,
  onPress,
}: TopProviderCardProps) {
  const colors = useThemeColors();
  const { isFavorite, isLoading: isFavoriteLoading, toggleFavorite } = useFavorite(id);
  
  const ratingValue = typeof rating === 'number' ? rating : (typeof rating === 'string' ? parseFloat(rating) : 0);
  const safeRating = isNaN(ratingValue) ? 0 : ratingValue;

  const handleFavoritePress = (e: any) => {
    e.stopPropagation();
    toggleFavorite();
  };

  return (
    <TouchableOpacity style={[styles.container, { backgroundColor: colors.card }]} onPress={onPress}>
      <ProviderAvatar
        profileImage={profileImage}
        size={70}
        rounded={false}
        style={[styles.image, { backgroundColor: colors.surfaceSecondary }]}
      />
      <View style={styles.info}>
        <View style={styles.headerRow}>
          <View style={styles.nameSection}>
            <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>{name}</Text>
            {serviceCategory && (
              <Text style={[styles.category, { color: colors.primary }]}>{serviceCategory}</Text>
            )}
          </View>
          <TouchableOpacity 
            style={styles.favoriteButton}
            onPress={handleFavoritePress}
            disabled={isFavoriteLoading}
          >
            <Ionicons 
              name={isFavorite ? "heart" : "heart-outline"} 
              size={18} 
              color={isFavorite ? "#EF4444" : colors.textTertiary} 
            />
          </TouchableOpacity>
        </View>
        <View style={styles.footerRow}>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={[styles.rating, { color: '#F59E0B' }]}>{safeRating.toFixed(1)}</Text>
            <Text style={[styles.reviewCount, { color: colors.textSecondary }]}>({reviewCount})</Text>
          </View>
          {hourlyRate && (
            <Text style={[styles.price, { color: colors.primary }]}>${hourlyRate}/hr</Text>
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
