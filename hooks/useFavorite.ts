import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n';
import {
  ApiError,
  addFavorite,
  fetchFavorites,
  removeFavorite,
} from '@/services/favorites';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

interface UseFavoriteReturn {
  isFavorite: boolean;
  isLoading: boolean;
  toggleFavorite: () => Promise<void>;
  checkFavorite: () => Promise<void>;
}

/**
 * Hook to manage favorite status for a supplier
 * @param supplierId - The ID of the supplier to check/manage
 */
export function useFavorite(supplierId: string | undefined): UseFavoriteReturn {
  const { isAuthenticated } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Check if supplier is in favorites
  const checkFavorite = useCallback(async () => {
    if (!supplierId || !isAuthenticated) {
      setIsFavorite(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await fetchFavorites();
      const ids = new Set(data.favorites.map((f) => f.id));
      setFavoriteIds(ids);
      setIsFavorite(ids.has(supplierId));
    } catch (error) {
      console.error('[useFavorite] Error checking favorite:', error);
      // Don't show error to user, just assume not favorite
      setIsFavorite(false);
    } finally {
      setIsLoading(false);
    }
  }, [supplierId, isAuthenticated]);

  // Toggle favorite status
  const toggleFavorite = useCallback(async () => {
    if (!supplierId || !isAuthenticated) {
      Alert.alert(t('common.error'), t('auth.signInToContinue'));
      return;
    }

    try {
      setIsLoading(true);

      if (isFavorite) {
        // Remove from favorites
        await removeFavorite(supplierId);
        setIsFavorite(false);
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(supplierId);
          return next;
        });
      } else {
        // Add to favorites
        await addFavorite(supplierId);
        setIsFavorite(true);
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.add(supplierId);
          return next;
        });
      }
    } catch (error) {
      console.error('[useFavorite] Error toggling favorite:', error);
      if (error instanceof ApiError) {
        if (error.statusCode === 409) {
          // Already favorited, just update state
          setIsFavorite(true);
          setFavoriteIds((prev) => {
            const next = new Set(prev);
            next.add(supplierId);
            return next;
          });
        } else {
          Alert.alert(t('common.error'), error.message);
        }
      } else {
        Alert.alert(t('common.error'), t('favorites.toggleError'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [supplierId, isAuthenticated, isFavorite]);

  // Check favorite status on mount and when supplierId changes
  useEffect(() => {
    checkFavorite();
  }, [checkFavorite]);

  return {
    isFavorite,
    isLoading,
    toggleFavorite,
    checkFavorite,
  };
}
