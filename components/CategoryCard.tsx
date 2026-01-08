import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CategoryCardProps {
  name: string;
  icon: string;
  color: string;
  onPress?: () => void;
}

export function CategoryCard({ name, icon, color, onPress }: CategoryCardProps) {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={24} color="white" />
      </View>
      <Text style={[styles.name, { color: isDark ? '#FFFFFF' : '#374151' }]}>{name}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '22%',
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
});









