import { GeoPlacesClient, GeocodeCommand } from '@aws-sdk/client-geo-places';
import type { Env } from '../config';
import type { LatLng } from '../geo';
import { getLocality, PUNE_CENTER } from '../localities';

export interface GeocodeResult {
  locality: string;
  location: LatLng;
  source: 'aws' | 'table' | 'fallback';
}

export interface GeoAdapter {
  readonly name: 'aws' | 'mock';
  geocode(query: string): Promise<GeocodeResult>;
}

function tableLookup(query: string): GeocodeResult | null {
  const loc = getLocality(query);
  return loc ? { locality: loc.name, location: { lat: loc.lat, lng: loc.lng }, source: 'table' } : null;
}

const titleCase = (s: string) => s.trim().replace(/\s+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export class MockGeo implements GeoAdapter {
  readonly name = 'mock' as const;
  async geocode(query: string): Promise<GeocodeResult> {
    return tableLookup(query) ?? { locality: titleCase(query) || 'Pune', location: { ...PUNE_CENTER }, source: 'fallback' };
  }
}

/** Amazon Location Service (Places v2) with India filter and a Pune bias. Table lookup first for speed/cost. */
export class AwsGeo implements GeoAdapter {
  readonly name = 'aws' as const;
  private client: GeoPlacesClient;
  constructor(env: Env) {
    this.client = new GeoPlacesClient({ region: env.AWS_REGION });
  }
  async geocode(query: string): Promise<GeocodeResult> {
    const known = tableLookup(query);
    if (known) return known;
    try {
      const res = await this.client.send(
        new GeocodeCommand({
          QueryText: `${query}, Pune, Maharashtra`,
          MaxResults: 1,
          BiasPosition: [PUNE_CENTER.lng, PUNE_CENTER.lat],
          Filter: { IncludeCountries: ['IND'] },
          Language: 'en',
        }),
      );
      const item = res.ResultItems?.[0];
      const pos = item?.Position;
      if (pos && pos.length >= 2 && pos[0] !== undefined && pos[1] !== undefined) {
        const locality = item?.Address?.SubDistrict ?? item?.Address?.District ?? item?.Address?.Locality ?? titleCase(query);
        return { locality, location: { lat: pos[1], lng: pos[0] }, source: 'aws' };
      }
    } catch (e) {
      console.warn('[geo] Amazon Location geocode failed, falling back:', (e as Error).message);
    }
    return { locality: titleCase(query) || 'Pune', location: { ...PUNE_CENTER }, source: 'fallback' };
  }
}

export function createGeo(env: Env): GeoAdapter {
  return !env.DEMO_MODE && env.GEO_PROVIDER === 'aws' ? new AwsGeo(env) : new MockGeo();
}
