import { getProfileImageUrl } from '@/utils/profileImage';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageStyle,
  type ViewStyle,
} from 'react-native';

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
 * Avatar for providers (or any profile). Shows profile image when available,
 * or a local default placeholder (icon on background). Never relies on external URLs.
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
        source={{ uri }}
        style={[
          { width: size, height: size, borderRadius },
          imageStyle,
        ]}
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
