export interface LatLng {
  lat: number;
  lng: number;
}

const R_KM = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in km. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export function geohashEncode(lat: number, lng: number, precision = 6): string {
  let latMin = -90,
    latMax = 90,
    lngMin = -180,
    lngMax = 180;
  let hash = '';
  let bit = 0;
  let ch = 0;
  let even = true;
  while (hash.length < precision) {
    if (even) {
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) {
        ch = (ch << 1) | 1;
        lngMin = mid;
      } else {
        ch = ch << 1;
        lngMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        ch = (ch << 1) | 1;
        latMin = mid;
      } else {
        ch = ch << 1;
        latMax = mid;
      }
    }
    even = !even;
    if (++bit === 5) {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return hash;
}

export function geohashBounds(hash: string): { latMin: number; latMax: number; lngMin: number; lngMax: number } {
  let latMin = -90,
    latMax = 90,
    lngMin = -180,
    lngMax = 180;
  let even = true;
  for (const c of hash) {
    const idx = BASE32.indexOf(c);
    if (idx < 0) throw new Error(`invalid geohash char ${c}`);
    for (let n = 4; n >= 0; n--) {
      const bitN = (idx >> n) & 1;
      if (even) {
        const mid = (lngMin + lngMax) / 2;
        if (bitN) lngMin = mid;
        else lngMax = mid;
      } else {
        const mid = (latMin + latMax) / 2;
        if (bitN) latMin = mid;
        else latMax = mid;
      }
      even = !even;
    }
  }
  return { latMin, latMax, lngMin, lngMax };
}

/** The cell itself plus its 8 neighbours — used for DynamoDB GSI "nearby" queries. */
export function geohashWithNeighbours(hash: string): string[] {
  const b = geohashBounds(hash);
  const dLat = b.latMax - b.latMin;
  const dLng = b.lngMax - b.lngMin;
  const cLat = (b.latMin + b.latMax) / 2;
  const cLng = (b.lngMin + b.lngMax) / 2;
  const out = new Set<string>();
  for (const dy of [-1, 0, 1]) {
    for (const dx of [-1, 0, 1]) {
      out.add(geohashEncode(cLat + dy * dLat, cLng + dx * dLng, hash.length));
    }
  }
  return [...out];
}

/** Deterministic small offset (≈ up to `meters`) so seeded points in the same locality don't stack. */
export function jitter(point: LatLng, seed: number, meters = 900): LatLng {
  const r1 = Math.sin(seed * 12.9898) * 43758.5453;
  const r2 = Math.sin(seed * 78.233) * 12345.6789;
  const fx = r1 - Math.floor(r1) - 0.5;
  const fy = r2 - Math.floor(r2) - 0.5;
  const dLat = (fy * 2 * meters) / 111_320;
  const dLng = (fx * 2 * meters) / (111_320 * Math.cos(rad(point.lat)));
  return { lat: +(point.lat + dLat).toFixed(6), lng: +(point.lng + dLng).toFixed(6) };
}
