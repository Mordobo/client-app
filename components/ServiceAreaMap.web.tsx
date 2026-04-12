import { t } from '@/i18n';
import { Image } from 'expo-image';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Dimensions, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  FALLBACK_CENTER,
  MAP_HEIGHT,
  type ServiceAreaMapHandle,
  type ServiceAreaMapProps,
  osmStaticPreviewUrl,
} from '@/components/ServiceAreaMap.types';

/** Web: no react-native-maps (native-only). Static preview + zoom adjusts OSM zoom level in URL. */
export type { ServiceAreaMapHandle, ServiceAreaMapProps } from '@/components/ServiceAreaMap.types';

export const ServiceAreaMap = forwardRef<ServiceAreaMapHandle, ServiceAreaMapProps>(function ServiceAreaMap(
  { latitude, longitude, radiusKm, onRegionComplete },
  ref
) {
  const [zoom, setZoom] = useState(14);
  const centerRef = useRef({
    latitude: latitude ?? FALLBACK_CENTER.latitude,
    longitude: longitude ?? FALLBACK_CENTER.longitude,
  });

  const lat = latitude ?? FALLBACK_CENTER.latitude;
  const lng = longitude ?? FALLBACK_CENTER.longitude;

  centerRef.current = { latitude: lat, longitude: lng };

  useEffect(() => {
    onRegionComplete?.(lat, lng);
  }, [lat, lng, zoom, onRegionComplete]);

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => {
        setZoom((z) => Math.min(18, z + 1));
      },
      zoomOut: () => {
        setZoom((z) => Math.max(6, z - 1));
      },
    }),
    []
  );

  const webWidth = Dimensions.get('window').width;
  const previewUri = useMemo(() => {
    return osmStaticPreviewUrl(lat, lng, Math.round(Math.max(320, webWidth) * 2), MAP_HEIGHT * 2, zoom);
  }, [lat, lng, webWidth, zoom]);

  const openOsmInBrowser = useCallback(() => {
    void Linking.openURL(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`);
  }, [lat, lng, zoom]);

  const onPressPreview = useCallback(() => {
    onRegionComplete?.(lat, lng);
    void openOsmInBrowser();
  }, [lat, lng, onRegionComplete, openOsmInBrowser]);

  return (
    <View style={styles.mapBox}>
      <Pressable onPress={onPressPreview} style={styles.webMapPressable} accessibilityRole="button">
        <Image
          source={{ uri: previewUri }}
          style={styles.webMapImage}
          contentFit="cover"
          accessibilityLabel={t('providerDashboard.providerServiceArea.webMapTapHint')}
        />
        <View style={styles.radiusBadge} pointerEvents="none">
          <Text style={styles.radiusBadgeText}>
            {radiusKm} km
          </Text>
        </View>
        <View style={styles.webMapHint} pointerEvents="none">
          <Text style={styles.webHintText}>{t('providerDashboard.providerServiceArea.webMapTapHint')}</Text>
        </View>
      </Pressable>
    </View>
  );
});

ServiceAreaMap.displayName = 'ServiceAreaMap';

const styles = StyleSheet.create({
  mapBox: {
    height: MAP_HEIGHT,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#1a1d24',
  },
  webMapPressable: {
    flex: 1,
    width: '100%',
    height: MAP_HEIGHT,
  },
  webMapImage: {
    width: '100%',
    height: MAP_HEIGHT,
  },
  radiusBadge: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  radiusBadgeText: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '600',
  },
  webMapHint: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  webHintText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
});
