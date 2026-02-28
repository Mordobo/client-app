import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n';
import { ApiError as AuthApiError } from '@/services/auth';
import {
  ApiError,
  addFavorite,
  fetchFavorites,
  removeFavorite,
} from '@/services/favorites';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { useCallback, useEffect } from 'react';
import { Alert } from 'react-native';

interface UseFavoriteReturn {
  isFavorite: boolean;
  isLoading: boolean;
  toggleFavorite: () => Promise<void>;
  checkFavorite: () => Promise<void>;
}

/**
 * Hook to manage favorite status for a supplier
 * Uses global Zustand store for state synchronization across screens
 * @param supplierId - The ID of the supplier to check/manage
 */
export function useFavorite(supplierId: string | undefined): UseFavoriteReturn {
  const { isAuthenticated } = useAuth();
  const {
    isLoading: storeLoading,
    isFavorite: storeIsFavorite,
    setFavoriteIds,
    addFavorite: addToStore,
    removeFavorite: removeFromStore,
    setLoading,
  } = useFavoritesStore();

  // Get favorite status from store
  const isFavorite = supplierId ? storeIsFavorite(supplierId) : false;
  const isLoading = storeLoading;

  // Check if supplier is in favorites and refresh store if needed
  const checkFavorite = useCallback(async () => {
    if (!supplierId || !isAuthenticated) {
      return;
    }

    try {
      setLoading(true);
      const data = await fetchFavorites();
      const ids = new Set(data.favorites.map((f) => f.id));
      setFavoriteIds(ids);
    } catch (error) {
      const status = error && typeof (error as { status?: number }).status === 'number'
        ? (error as { status: number }).status
        : (error as { statusCode?: number }).statusCode;
      const message = error instanceof Error ? error.message : String(error);
      const isAuthError =
        error instanceof AuthApiError &&
        (status === 401 || status === 403 || (error as AuthApiError).sessionExpired === true ||
          /invalid|expired.*token|token.*expired/i.test(message));
      if (isAuthError) {
        setFavoriteIds(new Set());
      } else {
        console.error('[useFavorite] Error checking favorite:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [supplierId, isAuthenticated, setFavoriteIds, setLoading]);

  // Toggle favorite status
  const toggleFavorite = useCallback(async () => {
    if (!supplierId || !isAuthenticated) {
      Alert.alert(t('common.error'), t('auth.signInToContinue'));
      return;
    }

    try {
      setLoading(true);

      if (isFavorite) {
        // Remove from favorites
        await removeFavorite(supplierId);
        removeFromStore(supplierId);
      } else {
        // Add to favorites
        try {
          await addFavorite(supplierId);
          addToStore(supplierId);
        } catch (error) {
          if (error instanceof ApiError && error.statusCode === 409) {
            // Already favorited, just update store state
            addToStore(supplierId);
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      const status = error && typeof (error as { status?: number }).status === 'number'
        ? (error as { status: number }).status
        : (error as { statusCode?: number }).statusCode;
      const message = error instanceof Error ? error.message : String(error);
      const isAuthError =
        (error instanceof ApiError || error instanceof AuthApiError) &&
        (status === 401 || status === 403 ||
          /invalid|expired.*token|token.*expired/i.test(message));
      if (isAuthError) {
        Alert.alert(t('common.error'), t('auth.signInToContinue'));
        return;
      }
      console.error('[useFavorite] Error toggling favorite:', error);
      if (error instanceof ApiError) {
        if (error.statusCode === 409) {
          addToStore(supplierId);
        } else {
          Alert.alert(t('common.error'), error.message);
        }
      } else {
        Alert.alert(t('common.error'), t('favorites.toggleError'));
      }
    } finally {
      setLoading(false);
    }
  }, [supplierId, isAuthenticated, isFavorite, addToStore, removeFromStore, setLoading]);

  // Check favorite status on mount and when supplierId changes
  // Only fetch if store is empty or stale (older than 30 seconds)
  useEffect(() => {
    if (!supplierId || !isAuthenticated) {
      return;
    }

    const store = useFavoritesStore.getState();
    const shouldRefresh = 
      store.favoriteIds.size === 0 || 
      (Date.now() - store.lastUpdated) > 30000; // 30 seconds

    if (shouldRefresh) {
      checkFavorite();
    }
  }, [supplierId, isAuthenticated, checkFavorite]);

  return {
    isFavorite,
    isLoading,
    toggleFavorite,
    checkFavorite,
  };
}
