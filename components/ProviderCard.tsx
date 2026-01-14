import { useFavorite } from '@/hooks/useFavorite';
import { Supplier } from '@/services/suppliers';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { t } from '@/i18n';

interface ProviderCardProps {
  supplier: Supplier;
  onPress?: () => void;
  onBookPress?: () => void;
}

export function ProviderCard({ supplier, onPress, onBookPress }: ProviderCardProps) {
  const { isFavorite, isLoading: isFavoriteLoading, toggleFavorite } = useFavorite(supplier.id);
  
  const ratingValue = typeof supplier.rating === 'number' 
    ? supplier.rating 
    : (typeof supplier.rating === 'string' ? parseFloat(supplier.rating) : 0);
  const safeRating = isNaN(ratingValue) ? 0 : ratingValue;

  const handleFavoritePress = (e: any) => {
    e.stopPropagation();
    toggleFavorite();
  };

  const isAvailable = supplier.availability && supplier.availability.trim() !== '';

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.content}>
        {/* Profile Image - 80x80px, borderRadius 14px */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: supplier.profile_image || 'https://via.placeholder.com/80' }}
            style={styles.image}
          />
        </View>

        {/* Info Section */}
        <View style={styles.info}>
          {/* Name and Favorite Row */}
          <View style={styles.headerRow}>
            <Text style={styles.name} numberOfLines={1}>{supplier.full_name}</Text>
            <TouchableOpacity 
              style={styles.favoriteButton}
              onPress={handleFavoritePress}
              disabled={isFavoriteLoading}
            >
              <Ionicons 
                name={isFavorite ? "heart" : "heart-outline"} 
                size={18} 
                color={isFavorite ? "#EF4444" : "#9CA3AF"} 
              />
            </TouchableOpacity>
          </View>

          {/* Service Category */}
          {supplier.service_category && (
            <Text style={styles.service} numberOfLines={1}>{supplier.service_category}</Text>
          )}

          {/* Rating and Distance Row */}
          <View style={styles.ratingRow}>
            <Text style={styles.ratingText}>
              ⭐ {safeRating.toFixed(1)} ({supplier.total_reviews || 0})
            </Text>
            {supplier.distance_km !== undefined && (
              <Text style={styles.distance}>📍 {supplier.distance_km.toFixed(1)} km</Text>
            )}
          </View>

          {/* Price, Availability and Book Button Row */}
          <View style={styles.footerRow}>
            <View style={styles.priceSection}>
              {supplier.hourly_rate && (
                <Text style={styles.price}>${supplier.hourly_rate}/hr</Text>
              )}
              {isAvailable && (
                <View style={styles.availableBadge}>
                  <Text style={styles.availableText}>{t('searchResults.available')}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity 
              style={styles.bookButton}
              onPress={(e) => {
                e.stopPropagation();
                onBookPress?.();
              }}
            >
              <Text style={styles.bookButtonText}>{t('searchResults.book')}</Text>
            </TouchableOpacity>
          </View>
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
  },
  content: {
    flexDirection: 'row',
    gap: 14,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: '#2d2d4a',
    overflow: 'hidden',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 14,
  },
  info: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  favoriteButton: {
    padding: 4,
  },
  service: {
    fontSize: 14,
    color: '#10B981',
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 13,
    color: '#F59E0B',
  },
  distance: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3B82F6',
    margin: 0,
  },
  availableBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  availableText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '600',
  },
  bookButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  bookButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
