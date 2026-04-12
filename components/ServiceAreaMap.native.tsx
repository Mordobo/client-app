import { t } from '@/i18n';
import Constants from 'expo-constants';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Marker, type MapStyleElement, type Region } from 'react-native-maps';
import {
  FALLBACK_CENTER,
  MAP_HEIGHT,
  type ServiceAreaMapHandle,
  type ServiceAreaMapProps,
} from '@/components/ServiceAreaMap.types';

export type { ServiceAreaMapHandle, ServiceAreaMapProps } from '@/components/ServiceAreaMap.types';

const INITIAL_DELTA = 0.14;

const ANDROID_DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
];

export const ServiceAreaMap = forwardRef<ServiceAreaMapHandle, ServiceAreaMapProps>(function ServiceAreaMap(
  { latitude, longitude, radiusKm, primaryColor, isDark, showsUserLocation = false, onBaseCoordinateChange, onRegionComplete },
  ref
) {
  const mapRef = useRef<MapView>(null);
  const [mapReady, setMapReady] = useState(false);
  const [latDelta, setLatDelta] = useState(INITIAL_DELTA);
  const latDeltaRef = useRef(latDelta);
  latDeltaRef.current = latDelta;
  const lastRegionRef = useRef<Region>({
    ...FALLBACK_CENTER,
    latitudeDelta: INITIAL_DELTA,
    longitudeDelta: INITIAL_DELTA * 1.15,
  });

  const hasBase = latitude != null && longitude != null;

  const animateTo = useCallback((r: Region) => {
    lastRegionRef.current = r;
    mapRef.current?.animateToRegion(r, 220);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => {
        const next = Math.max(0.018, latDelta / 1.35);
        setLatDelta(next);
        const c = lastRegionRef.current;
        animateTo({
          latitude: c.latitude,
          longitude: c.longitude,
          latitudeDelta: next,
          longitudeDelta: next * 1.15,
        });
      },
      zoomOut: () => {
        const next = Math.min(0.85, latDelta * 1.35);
        setLatDelta(next);
        const c = lastRegionRef.current;
        animateTo({
          latitude: c.latitude,
          longitude: c.longitude,
          latitudeDelta: next,
          longitudeDelta: next * 1.15,
        });
      },
    }),
    [animateTo, latDelta]
  );

  useEffect(() => {
    if (latitude == null || longitude == null) return;
    const d = latDeltaRef.current;
    animateTo({
      latitude,
      longitude,
      latitudeDelta: d,
      longitudeDelta: d * 1.15,
    });
  }, [latitude, longitude, animateTo]);

  const onMapPress = useCallback(
    (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
      const { latitude: la, longitude: lo } = e.nativeEvent.coordinate;
      onBaseCoordinateChange(la, lo);
    },
    [onBaseCoordinateChange]
  );

  const onDragEnd = useCallback(
    (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
      const { latitude: la, longitude: lo } = e.nativeEvent.coordinate;
      onBaseCoordinateChange(la, lo);
    },
    [onBaseCoordinateChange]
  );

  const onRegionChangeComplete = useCallback(
    (r: Region) => {
      lastRegionRef.current = r;
      onRegionComplete?.(r.latitude, r.longitude);
    },
    [onRegionComplete]
  );

  const initialRegion: Region = {
    ...(hasBase ? { latitude: latitude!, longitude: longitude! } : FALLBACK_CENTER),
    latitudeDelta: INITIAL_DELTA,
    longitudeDelta: INITIAL_DELTA * 1.15,
  };

  const googleMapsApiKey = (process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '').trim();
  const isExpoGo = Constants.appOwnership === 'expo';
  const showAndroidKeyHint = Platform.OS === 'android' && googleMapsApiKey.length === 0 && !isExpoGo;

  return (
    <View style={styles.mapBox} collapsable={false}>
      {!mapReady && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      )}
      {showAndroidKeyHint ? (
        <View style={styles.keyMissingBanner}>
          <Text style={styles.keyMissingText}>{t('providerDashboard.providerServiceArea.mapsAndroidKeyHint')}</Text>
        </View>
      ) : null}
      <MapView
        ref={mapRef}
        style={styles.mapFill}
        initialRegion={initialRegion}
        onMapReady={() => setMapReady(true)}
        onPress={onMapPress}
        onRegionChangeComplete={onRegionChangeComplete}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
        mapType={Platform.OS === 'ios' && isDark ? 'mutedStandard' : 'standard'}
        customMapStyle={Platform.OS === 'android' && isDark ? (ANDROID_DARK_MAP_STYLE as MapStyleElement[]) : undefined}
        showsUserLocation={showsUserLocation}
        showsMyLocationButton={false}
        scrollEnabled
        zoomEnabled
        pitchEnabled={false}
        rotateEnabled={false}
      >
        {hasBase ? (
          <>
            <Circle
              center={{ latitude: latitude!, longitude: longitude! }}
              radius={radiusKm * 1000}
              strokeColor={`${primaryColor}CC`}
              fillColor={`${primaryColor}33`}
              strokeWidth={2}
            />
            <Marker coordinate={{ latitude: latitude!, longitude: longitude! }} draggable onDragEnd={onDragEnd} />
          </>
        ) : null}
      </MapView>
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
  mapFill: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    zIndex: 2,
  },
  keyMissingBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(180,83,9,0.92)',
  },
  keyMissingText: {
    color: '#fff',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
});
