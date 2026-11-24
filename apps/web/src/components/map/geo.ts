import type { Feature, Polygon } from 'geojson';

/** Small geo helpers for the map (no deps). */

export function circlePolygon(lat: number, lng: number, radiusKm: number, steps = 72): Feature<Polygon> {
  const coords: [number, number][] = [];
  const dLat = radiusKm / 110.574;
  const dLng = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    coords.push([lng + dLng * Math.cos(t), lat + dLat * Math.sin(t)]);
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coords] } };
}

export interface Bounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export function boundsOf(points: { lat: number; lng: number }[], ring?: { lat: number; lng: number; radiusKm: number } | null): Bounds | null {
  const pts = [...points];
  if (ring) {
    const dLat = ring.radiusKm / 110.574;
    const dLng = ring.radiusKm / (111.32 * Math.cos((ring.lat * Math.PI) / 180));
    pts.push({ lat: ring.lat - dLat, lng: ring.lng - dLng }, { lat: ring.lat + dLat, lng: ring.lng + dLng });
  }
  if (!pts.length) return null;
  let b: Bounds = { minLat: Infinity, maxLat: -Infinity, minLng: Infinity, maxLng: -Infinity };
  for (const p of pts) {
    b = { minLat: Math.min(b.minLat, p.lat), maxLat: Math.max(b.maxLat, p.lat), minLng: Math.min(b.minLng, p.lng), maxLng: Math.max(b.maxLng, p.lng) };
  }
  return b;
}
