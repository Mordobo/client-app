import { useFavorite } from '@/hooks/useFavorite';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

interface FavoriteButtonProps {
  supplierId: string;
  size?: number;
  color?: string;
  activeColor?: string;
  style?: any;
  onPress?: () => void;
}

export function FavoriteButton({
  supplierId,
  size = 24,
  color = '#9CA3AF',
  activeColor = '#EF4444',
  style,
  onPress,
}: FavoriteButtonProps) {
  const { isFavorite, isLoading, toggleFavorite } = useFavorite(supplierId);

  const handlePress = () => {
    toggleFavorite();
    if (onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handlePress}
      disabled={isLoading}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons
        name={isFavorite ? 'heart' : 'heart-outline'}
        size={size}
        color={isFavorite ? activeColor : color}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
