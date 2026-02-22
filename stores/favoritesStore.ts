import { create } from 'zustand';
import { fetchFavorites } from '@/services/favorites';

interface FavoritesStore {
  favoriteIds: Set<string>;
  isLoading: boolean;
  lastUpdated: number;
  setFavoriteIds: (ids: Set<string>) => void;
  addFavorite: (supplierId: string) => void;
  removeFavorite: (supplierId: string) => void;
  isFavorite: (supplierId: string) => boolean;
  setLoading: (loading: boolean) => void;
  refreshFavorites: () => Promise<void>;
  clear: () => void;
}

export const useFavoritesStore = create<FavoritesStore>((set, get) => ({
  favoriteIds: new Set<string>(),
  isLoading: false,
  lastUpdated: 0,
  
  setFavoriteIds: (ids: Set<string>) => {
    set({ favoriteIds: ids, lastUpdated: Date.now() });
  },
  
  addFavorite: (supplierId: string) => {
    const currentIds = get().favoriteIds;
    const newIds = new Set(currentIds);
    newIds.add(supplierId);
    set({ favoriteIds: newIds, lastUpdated: Date.now() });
  },
  
  removeFavorite: (supplierId: string) => {
    const currentIds = get().favoriteIds;
    const newIds = new Set(currentIds);
    newIds.delete(supplierId);
    set({ favoriteIds: newIds, lastUpdated: Date.now() });
  },
  
  isFavorite: (supplierId: string) => {
    return get().favoriteIds.has(supplierId);
  },
  
  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },
  
  refreshFavorites: async () => {
    try {
      set({ isLoading: true });
      const data = await fetchFavorites();
      const ids = new Set(data.favorites.map((f) => f.id));
      set({ favoriteIds: ids, lastUpdated: Date.now(), isLoading: false });
    } catch (error) {
      console.error('[favoritesStore] Error refreshing favorites:', error);
      set({ isLoading: false });
    }
  },
  
  clear: () => {
    set({ favoriteIds: new Set<string>(), lastUpdated: 0 });
  },
}));
