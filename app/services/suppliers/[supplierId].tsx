import { FavoriteButton } from '@/components/FavoriteButton';
import { useTheme } from '@/contexts/ThemeContext';
import { getOrCreateConversation } from '@/services/conversations';
import {
    ApiError,
    fetchSupplierProfile,
    fetchSupplierReviews,
    fetchSupplierServices,
    Review,
    Supplier,
    SupplierService,
} from '@/services/suppliers';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SupplierProfileScreen() {
  const router = useRouter();
  const { colorScheme } = useTheme();
  const { supplierId } = useLocalSearchParams<{ supplierId: string }>();
  const insets = useSafeAreaInsets();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [services, setServices] = useState<SupplierService[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingChat, setStartingChat] = useState(false);
  
  const isDark = colorScheme === 'dark';
  const themeColors = {
    background: isDark ? '#151718' : '#F9FAFB',
    surface: isDark ? '#1F2937' : '#FFFFFF',
    textPrimary: isDark ? '#ECEDEE' : '#1F2937',
    textSecondary: isDark ? '#9BA1A6' : '#6B7280',
    border: isDark ? '#374151' : '#E5E7EB',
    borderLight: isDark ? '#4B5563' : '#F3F4F6',
  };

  useEffect(() => {
    if (supplierId) {
      loadData();
    }
  }, [supplierId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [supplierData, servicesData, reviewsData] = await Promise.all([
        fetchSupplierProfile(supplierId),
        fetchSupplierServices(supplierId),
        fetchSupplierReviews(supplierId),
      ]);

      setSupplier(supplierData);
      setServices(servicesData);
      setReviews(reviewsData.reviews);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load supplier profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async () => {
    if (!supplierId || startingChat) return;
    
    setStartingChat(true);
    try {
      const { conversation } = await getOrCreateConversation(supplierId);
      router.push(`/chat/${conversation.id}`);
    } catch (err) {
      console.error('Error starting chat:', err);
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
    } finally {
      setStartingChat(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      </View>
    );
  }

  if (error || !supplier) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error || 'Supplier not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { top: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: themeColors.surface }]}>
          <Ionicons name="arrow-back" size={24} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <View style={[styles.favoriteButton, { backgroundColor: themeColors.surface }]}>
          <FavoriteButton
            supplierId={supplierId || ''}
            size={24}
            color={themeColors.textPrimary}
            activeColor="#EF4444"
          />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={[styles.profileSection, { backgroundColor: themeColors.surface }]}>
          <Image
            source={{ uri: supplier.profile_image || 'https://via.placeholder.com/150' }}
            style={styles.profileImage}
          />
          <Text style={[styles.name, { color: themeColors.textPrimary }]}>{supplier.full_name}</Text>
          
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={20} color="#F59E0B" />
            <Text style={[styles.rating, { color: themeColors.textPrimary }]}>{Number(supplier.rating).toFixed(1)}</Text>
          </View>

          {/* Badges */}
          <View style={styles.badgesRow}>
            {supplier.years_experience && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{supplier.years_experience}+ years of experience</Text>
              </View>
            )}
            {supplier.location && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Available in {supplier.location}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Description */}
        {supplier.bio && (
          <View style={[styles.section, { backgroundColor: themeColors.surface }]}>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Description</Text>
            <Text style={[styles.description, { color: themeColors.textSecondary }]}>{supplier.bio}</Text>
          </View>
        )}

        {/* Services Offered */}
        {services.length > 0 && (
          <View style={[styles.section, { backgroundColor: themeColors.surface }]}>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Services</Text>
            <View style={styles.servicesContainer}>
              {services.map((service) => (
                <View key={service.id} style={[styles.serviceTag, { backgroundColor: themeColors.borderLight }]}>
                  <Text style={[styles.serviceTagText, { color: themeColors.textPrimary }]}>{service.category_name || 'Service'}</Text>
                  {service.price && (
                    <Text style={styles.servicePrice}>${service.price}/hr</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Pricing */}
        {supplier.hourly_rate && (
          <View style={[styles.pricingSection, { backgroundColor: themeColors.surface }]}>
            <Text style={[styles.pricingLabel, { color: themeColors.textSecondary }]}>From</Text>
            <Text style={styles.pricingAmount}>${supplier.hourly_rate}/hr</Text>
          </View>
        )}

        {/* Photo Gallery */}
        {supplier.gallery && supplier.gallery.length > 0 && (
          <View style={[styles.section, { backgroundColor: themeColors.surface }]}>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Photo Gallery</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {supplier.gallery.map((photo, index) => (
                <Image key={index} source={{ uri: photo }} style={styles.galleryImage} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <View style={[styles.section, { backgroundColor: themeColors.surface }]}>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Reviews</Text>
            {reviews.slice(0, 3).map((review) => (
              <View key={review.id} style={[styles.reviewCard, { backgroundColor: themeColors.background }]}>
                <View style={styles.reviewHeader}>
                  <View style={[styles.reviewAvatar, { backgroundColor: themeColors.borderLight }]}>
                    <Ionicons name="person" size={20} color={themeColors.textSecondary} />
                  </View>
                  <View style={styles.reviewHeaderInfo}>
                    <Text style={[styles.reviewerName, { color: themeColors.textPrimary }]}>{review.client_name || 'Anonymous'}</Text>
                    <View style={styles.reviewRating}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons
                          key={star}
                          name={star <= review.rating ? 'star' : 'star-outline'}
                          size={12}
                          color={star <= review.rating ? '#F59E0B' : themeColors.textSecondary}
                        />
                      ))}
                    </View>
                  </View>
                  <Text style={[styles.reviewDate, { color: themeColors.textSecondary }]}>
                    {new Date(review.created_at).toLocaleDateString()}
                  </Text>
                </View>
                {review.comment && (
                  <Text style={[styles.reviewComment, { color: themeColors.textSecondary }]}>{review.comment}</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { backgroundColor: themeColors.surface, borderTopColor: themeColors.border }]}>
        <TouchableOpacity 
          style={[styles.chatActionButton, startingChat && styles.chatActionButtonDisabled]}
          onPress={handleStartChat}
          disabled={startingChat}
        >
          {startingChat ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="chatbubble-outline" size={20} color="#FFFFFF" />
              <Text style={styles.chatActionText}>Message</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.bookActionButton}>
          <Text style={styles.bookActionText}>Book Service</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 24,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  rating: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '500',
  },
  section: {
    padding: 20,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  serviceTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  servicePrice: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 8,
  },
  pricingSection: {
    padding: 20,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  pricingLabel: {
    fontSize: 16,
    marginRight: 8,
  },
  pricingAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#10B981',
  },
  galleryImage: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginRight: 12,
  },
  reviewCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  reviewHeaderInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  reviewRating: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontSize: 12,
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  chatActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 8,
  },
  chatActionButtonDisabled: {
    opacity: 0.7,
  },
  chatActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  bookActionButton: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 8,
  },
  bookActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});




