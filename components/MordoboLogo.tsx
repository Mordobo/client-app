import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

interface MordoboLogoProps {
  size?: number;
}

export default function MordoboLogo({ size = 64 }: MordoboLogoProps) {
  // Calculate aspect ratio: much wider than tall (1.5-2x wider)
  const width = size * 1.8; // Much wider than tall
  const height = size;
  
  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height} viewBox="0 0 180 100" fill="none" preserveAspectRatio="xMidYMid meet">
        {/* Larger blue blob shape - much wider than tall, very smooth rounded pebble shape */}
        <Path
          d="M8 50C6 40 10 30 18 25C26 20 38 18 50 19C62 20 74 23 84 28C94 33 102 40 105 47C108 54 107 61 102 67C97 73 89 77 80 78C71 79 61 78 52 76C43 74 35 71 28 66C21 61 16 55 14 52C12 51 10 50.5 8 50Z"
          fill="#2563EB"
        />
        {/* Small perfect circle - bright lime green, positioned in upper-left quadrant */}
        <Circle
          cx="36"
          cy="26"
          r="5"
          fill="#10B981"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

