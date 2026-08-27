/**
 * Web reverse geocoding.
 *
 * `Location.getCurrentPositionAsync` works on web (expo-location wraps
 * `navigator.geolocation`), but `reverseGeocodeAsync` is unsupported and
 * throws. BigDataCloud's client endpoint is free, keyless and CORS-enabled.
 *
 * NOTE: this sends the visitor's coordinates to a third party. To avoid that,
 * replace the body with `return null` — the report form already lets the user
 * type a location label, so the UI degrades gracefully.
 */
export interface Coords {
  latitude: number;
  longitude: number;
}

const ENDPOINT = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

export async function reverseGeocode(coords: Coords): Promise<string | null> {
  try {
    const url = `${ENDPOINT}?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=en`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    // Mirrors the native [street, district || subregion, city] shape.
    const parts = [
      data.locality,
      data.localityInfo?.administrative?.[3]?.name || data.principalSubdivision,
      data.city || data.countryName,
    ].filter(Boolean);
    // Drop consecutive duplicates — BigDataCloud often repeats the locality.
    const deduped = parts.filter((p: string, i: number) => p !== parts[i - 1]);
    return deduped.length ? deduped.join(', ') : null;
  } catch {
    return null;
  }
}
