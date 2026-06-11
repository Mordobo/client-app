/** Must match `mapWrap` height in `service-area.tsx`. */
export const MAP_HEIGHT = 220;

export interface ServiceAreaMapHandle {
  zoomIn: () => void;
  zoomOut: () => void;
}

export interface ServiceAreaMapProps {
  latitude: number | null;
  longitude: number | null;
  radiusKm: number;
  primaryColor: string;
  isDark: boolean;
  /** When true, shows the device location dot (native only; requires permission). */
  showsUserLocation?: boolean;
  onBaseCoordinateChange: (lat: number, lng: number) => void;
  onRegionComplete?: (lat: number, lng: number) => void;
}

export const FALLBACK_CENTER = { latitude: 19.4326, longitude: -99.1332 };

export function osmStaticPreviewUrl(lat: number, lng: number, width: number, height: number, zoom = 14): string {
  const w = Math.min(1024, Math.max(200, Math.round(width)));
  const h = Math.min(1024, Math.max(120, Math.round(height)));
  const z = Math.min(18, Math.max(1, Math.round(zoom)));
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${z}&size=${w}x${h}&markers=${lat},${lng},red-pushpin`;
}
