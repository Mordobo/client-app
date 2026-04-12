/**
 * TypeScript default entry for `@/components/ServiceAreaMap`.
 * Metro prefers `ServiceAreaMap.web.tsx` on web and `ServiceAreaMap.native.tsx` on iOS/Android,
 * so this file is not used in those bundles and must not be required for web runtime.
 */
export type { ServiceAreaMapHandle, ServiceAreaMapProps, FALLBACK_CENTER, MAP_HEIGHT } from './ServiceAreaMap.types';
export { ServiceAreaMap } from './ServiceAreaMap.native';
