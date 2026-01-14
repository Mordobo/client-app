import { FavoriteButton } from '@/components/FavoriteButton';
import { getOrCreateConversation } from '@/services/conversations';
import {
  ApiError,
  fetchSupplierProfile,
  fetchSupplierServices,
  Supplier,
  SupplierService,
} from '@/services/suppliers';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@/i18n';

// Theme colors matching the JSX design
const colors = {
  bg: '#1a1a2e',
  bgCard: '#252542',
  bgInput: '#2d2d4a',
  primary: '#3b82f6',
  secondary: '#10b981',
  accent: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  textSecondary: '#9ca3af',
  border: '#374151',
  white: '#ffffff',
};

const HEADER_HEIGHT = 200;
const PROFILE_IMAGE_SIZE = 90;
const PROFILE_IMAGE_OFFSET = -40; // Negative margin to overlap header

export default function ProviderDetailScreen() {
  const router = useRouter();
  const { supplierId } = useLocalSearchParams<{ supplierId: string }>();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [services, setServices] = useState<SupplierService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingChat, setStartingChat] = useState(false);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Parallax effect for header image
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [0, -HEADER_HEIGHT / 2],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT / 2, HEADER_HEIGHT],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    if (supplierId) {
      loadData();
    }
  }, [supplierId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [supplierData, servicesData] = await Promise.all([
        fetchSupplierProfile(supplierId),
        fetchSupplierServices(supplierId),
      ]);

      setSupplier(supplierData);
      setServices(servicesData);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load provider profile');
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
      Alert.alert(t('common.error'), 'Failed to start conversation. Please try again.');
    } finally {
      setStartingChat(false);
    }
  };

  const handleBookNow = async () => {
    if (!supplierId) return;
    // Navigate to chat to start booking conversation
    // The booking flow typically starts with a conversation
    try {
      const { conversation } = await getOrCreateConversation(supplierId);
      router.push(`/chat/${conversation.id}`);
    } catch (err) {
      console.error('Error starting booking:', err);
      Alert.alert(t('common.error'), 'Failed to start booking. Please try again.');
    }
  };

  const toggleAboutExpanded = () => {
    setAboutExpanded(!aboutExpanded);
  };

  // Format service duration - extract from description or use defaults
  const getServiceDuration = (service: SupplierService): string => {
    // Try to extract duration from description (e.g., "2-3 hours", "1-2 hrs")
    if (service.description) {
      const durationMatch = service.description.match(/(\d+)[-\s](\d+)\s*(hr|hour|h)/i);
      if (durationMatch) {
        return `${durationMatch[1]}-${durationMatch[2]} hrs`;
      }
      const singleDurationMatch = service.description.match(/(\d+)\s*(hr|hour|h)/i);
      if (singleDurationMatch) {
        return `${singleDurationMatch[1]} hrs`;
      }
    }
    
    // Default durations based on service category
    const defaultDurations: Record<string, string> = {
      cleaning: '2-3 hrs',
      'deep-cleaning': '4-5 hrs',
      'office-cleaning': '3-4 hrs',
      plumbing: '1-2 hrs',
      electrical: '1-3 hrs',
      painting: '4-6 hrs',
    };
    
    return defaultDurations[service.category_key || ''] || '2-3 hrs';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (error || !supplier) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error || 'Provider not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryText}>{t('common.ok')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const headerImage = supplier.gallery && supplier.gallery.length > 0 
    ? supplier.gallery[0] 
    : supplier.profile_image || 'https://via.placeholder.com/400x200';

  const aboutText = supplier.bio || '';
  const shouldShowReadMore = aboutText.length > 150;
  const displayAboutText = aboutExpanded || !shouldShowReadMore 
    ? aboutText 
    : aboutText.substring(0, 150) + '...';

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Header Image with Parallax */}
        <Animated.View
          style={[
            styles.headerImageContainer,
            {
              transform: [{ translateY: headerTranslateY }],
              opacity: headerOpacity,
            },
          ]}
        >
          <Image
            source={{ uri: headerImage }}
            style={styles.headerImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.headerGradient}
          />
        </Animated.View>

        {/* Header Buttons (Back, Favorite, Share) */}
        <View style={[styles.headerButtons, { top: insets.top + 10 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerButton}
          >
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.headerButtonsRight}>
            <TouchableOpacity style={styles.headerButton}>
              <FavoriteButton
                supplierId={supplierId || ''}
                size={18}
                color={colors.white}
                activeColor={colors.danger}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="share-outline" size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Provider Info Section */}
        <View style={styles.providerInfoSection}>
          <View style={styles.providerInfoRow}>
            <Image
              source={{ uri: supplier.profile_image || 'https://via.placeholder.com/90' }}
              style={styles.profileImage}
            />
            <View style={styles.providerInfoText}>
              <View style={styles.nameRow}>
                <Text style={styles.providerName}>{supplier.full_name}</Text>
                {supplier.verified && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.secondary} />
                )}
              </View>
              {supplier.service_category && (
                <Text style={styles.profession}>{supplier.service_category}</Text>
              )}
              {supplier.location && (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.location}>{supplier.location}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statContent}>
                <Ionicons name="star" size={20} color={colors.accent} />
                <Text style={styles.statValue}>{Number(supplier.rating).toFixed(1)}</Text>
              </View>
              <Text style={styles.statLabel}>{t('supplier.rating')}</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statContent}>
                <Ionicons name="chatbubble-outline" size={20} color={colors.white} />
                <Text style={styles.statValue}>{supplier.total_reviews}</Text>
              </View>
              <Text style={styles.statLabel}>{t('supplier.reviewsCount')}</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statContent}>
                <Ionicons name="calendar-outline" size={20} color={colors.white} />
                <Text style={styles.statValue}>{supplier.years_experience || 0}</Text>
              </View>
              <Text style={styles.statLabel}>{t('supplier.years')}</Text>
            </View>
          </View>

          {/* About Section */}
          {aboutText && (
            <View style={styles.aboutSection}>
              <Text style={styles.sectionTitle}>{t('supplier.about')}</Text>
              <Text style={styles.aboutText}>{displayAboutText}</Text>
              {shouldShowReadMore && (
                <TouchableOpacity onPress={toggleAboutExpanded}>
                  <Text style={styles.readMoreText}>
                    {aboutExpanded ? t('supplier.readLess') : t('supplier.readMore')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Services List */}
          {services.length > 0 && (
            <View style={styles.servicesSection}>
              <Text style={styles.sectionTitle}>{t('supplier.services')}</Text>
              {services.map((service) => (
                <View key={service.id} style={styles.serviceCard}>
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>
                      {service.category_name || 'Service'}
                    </Text>
                    <View style={styles.serviceDurationRow}>
                      <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.serviceDuration}>{getServiceDuration(service)}</Text>
                    </View>
                  </View>
                  {service.price && (
                    <Text style={styles.servicePrice}>
                      ${service.price}{t('supplier.perHour')}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {/* Fixed CTA Bottom Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity
          style={styles.messageButton}
          onPress={handleStartChat}
          disabled={startingChat}
        >
          {startingChat ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Ionicons name="chatbubble-outline" size={24} color={colors.white} />
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.bookButton} onPress={handleBookNow}>
          <Text style={styles.bookButtonText}>{t('supplier.bookNow')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for fixed bottom bar
  },
  headerImageContainer: {
    height: HEADER_HEIGHT,
    width: '100%',
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
  },
  headerButtons: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  headerButtonsRight: {
    flexDirection: 'row',
    gap: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerInfoSection: {
    padding: 20,
    marginTop: PROFILE_IMAGE_OFFSET,
    backgroundColor: colors.bg,
  },
  providerInfoRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  profileImage: {
    width: PROFILE_IMAGE_SIZE,
    height: PROFILE_IMAGE_SIZE,
    borderRadius: 20,
    backgroundColor: colors.bgInput,
    borderWidth: 4,
    borderColor: colors.bg,
  },
  providerInfoText: {
    flex: 1,
    paddingBottom: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  providerName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
  },
  profession: {
    fontSize: 15,
    color: colors.secondary,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  aboutSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  readMoreText: {
    fontSize: 14,
    color: colors.primary,
    marginTop: 8,
    fontWeight: '500',
  },
  servicesSection: {
    marginBottom: 24,
  },
  serviceCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.white,
    marginBottom: 4,
  },
  serviceDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  serviceDuration: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  messageButton: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookButton: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  errorText: {
    fontSize: 16,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
