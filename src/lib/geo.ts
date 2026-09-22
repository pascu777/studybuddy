import * as Location from 'expo-location';

import { isWeb } from '@/lib/platform';

export type Coords = { lat: number; lng: number };
export type PlaceResult = { label: string; coords: Coords };

function formatPlace(p: Location.LocationGeocodedAddress): string {
  const city = p.city ?? p.subregion ?? p.district ?? p.name ?? '';
  const province = p.subregion && p.subregion !== city ? p.subregion : (p.region ?? '');
  return [city, province].filter(Boolean).join(', ') || 'Posizione sconosciuta';
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

/** expo-location non supporta geocode/reverseGeocode su web: fallback via Nominatim (OSM). */
async function webGeocodeText(query: string): Promise<PlaceResult | null> {
  try {
    const res = await fetch(
      `${NOMINATIM_BASE}/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`,
      { headers: { Accept: 'application/json' } },
    );
    if (!res.ok) return null;
    const hits = (await res.json()) as { lat: string; lon: string; display_name: string }[];
    const hit = hits[0];
    if (!hit) return null;
    return {
      label: hit.display_name.split(',').slice(0, 2).join(',').trim(),
      coords: { lat: Number(hit.lat), lng: Number(hit.lon) },
    };
  } catch {
    return null;
  }
}

async function webReverseGeocode(coords: Coords): Promise<string | null> {
  try {
    const res = await fetch(
      `${NOMINATIM_BASE}/reverse?format=jsonv2&lat=${coords.lat}&lon=${coords.lng}`,
      { headers: { Accept: 'application/json' } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { address?: Record<string, string> };
    const a = data.address ?? {};
    const city = a.city ?? a.town ?? a.village ?? a.county ?? '';
    const province = a.state ?? '';
    return [city, province].filter(Boolean).join(', ') || null;
  } catch {
    return null;
  }
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

  if (isWeb) {
    const label = await webReverseGeocode(coords);
    return { label: label ?? 'Posizione attuale', coords };
  }

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

  if (isWeb) {
    return webGeocodeText(trimmed);
  }

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
