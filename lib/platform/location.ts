/**
 * Reverse geocoding. `Location.reverseGeocodeAsync` is native-only — the web
 * implementation lives in `location.web.ts`. Both return `null` rather than
 * throwing, so the caller can keep the coordinates and let the user type a
 * label by hand.
 */
import * as Location from 'expo-location';

export interface Coords {
  latitude: number;
  longitude: number;
}

export async function reverseGeocode(coords: Coords): Promise<string | null> {
  try {
    const [geo] = await Location.reverseGeocodeAsync(coords);
    if (!geo) return null;
    const parts = [geo.street, geo.district || geo.subregion, geo.city].filter(Boolean);
    return parts.length ? parts.join(', ') : null;
  } catch {
    return null;
  }
}
