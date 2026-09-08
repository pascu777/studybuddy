import * as Location from 'expo-location';

export type Coords = { lat: number; lng: number };
export type PlaceResult = { label: string; coords: Coords };

function formatPlace(p: Location.LocationGeocodedAddress): string {
  const city = p.city ?? p.subregion ?? p.district ?? p.name ?? '';
  const province = p.subregion && p.subregion !== city ? p.subregion : (p.region ?? '');
  return [city, province].filter(Boolean).join(', ') || 'Posizione sconosciuta';
}

/** Chiede il permesso, legge la posizione e la converte in "Città, Provincia". */
export async function getCurrentPlace(): Promise<PlaceResult> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('permission-denied');
  }
  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const coords: Coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
  try {
    const [addr] = await Location.reverseGeocodeAsync(pos.coords);
    return { label: addr ? formatPlace(addr) : 'Posizione attuale', coords };
  } catch {
    return { label: 'Posizione attuale', coords };
  }
}

/** Geocoding manuale da testo digitato (fallback se il permesso è negato). */
export async function geocodeText(query: string): Promise<PlaceResult | null> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return null;
  try {
    const [hit] = await Location.geocodeAsync(trimmed);
    if (!hit) return null;
    const coords: Coords = { lat: hit.latitude, lng: hit.longitude };
    try {
      const [addr] = await Location.reverseGeocodeAsync(hit);
      return { label: addr ? formatPlace(addr) : trimmed, coords };
    } catch {
      return { label: trimmed, coords };
    }
  } catch {
    return null;
  }
}

/** WKT per la colonna Postgres `geography(Point, 4326)` (ordine lng lat). */
export function toGeographyPoint(coords: Coords | null | undefined): string | null {
  if (!coords) return null;
  return `SRID=4326;POINT(${coords.lng} ${coords.lat})`;
}
