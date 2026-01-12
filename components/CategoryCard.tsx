import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CategoryCardProps {
  name: string;
  emoji: string;
  color: string;
  onPress?: () => void;
}

// Helper to convert hex color to rgba with opacity
const hexToRgba = (hex: string, opacity: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export function CategoryCard({ name, emoji, color, onPress }: CategoryCardProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: hexToRgba(color, 0.2) }]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <Text style={styles.name}>{name}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '22%',
    marginBottom: 12,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emoji: {
    fontSize: 28,
  },
  name: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});









