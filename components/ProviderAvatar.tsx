import { getProfileImageUrl } from '@/utils/profileImage';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, type ImageStyle, type ViewStyle } from 'react-native';

const PLACEHOLDER_BG = '#2d2d4a';
const PLACEHOLDER_ICON_COLOR = '#9CA3AF';

interface ProviderAvatarProps {
  profileImage?: string | null;
  size?: number;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  rounded?: boolean; // true = circle, false = rounded rect (e.g. 14px)
}

/**
 * Avatar for providers (or any profile). Uses expo-image for reliable loading
 * and caching. Shows profile image when available, or placeholder icon.
 */
export function ProviderAvatar({
  profileImage,
  size = 48,
  style,
  imageStyle,
  rounded = false,
}: ProviderAvatarProps) {
  const [error, setError] = useState(false);
  const uri = getProfileImageUrl(profileImage);
  const showImage = uri && !error;

  useEffect(() => {
    setError(false);
  }, [uri]);

  const borderRadius = rounded ? size / 2 : 14;
  const containerStyle = [
    styles.placeholder,
    {
      width: size,
      height: size,
      borderRadius,
      backgroundColor: PLACEHOLDER_BG,
    },
    style,
  ];

  if (showImage) {
    return (
      <Image
        key={uri}
        source={{ uri }}
        style={[
          { width: size, height: size, borderRadius },
          imageStyle,
        ]}
        contentFit="cover"
        cachePolicy="disk"
        onError={() => setError(true)}
      />
    );
  }

  return (
    <View style={containerStyle}>
      <Ionicons
        name="person"
        size={size * 0.5}
        color={PLACEHOLDER_ICON_COLOR}
        style={styles.icon}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    textAlign: 'center',
  },
});
