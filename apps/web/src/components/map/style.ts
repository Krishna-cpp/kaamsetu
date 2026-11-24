import type { Map as MlMap } from 'maplibre-gl';

export function styleUrl(): string {
  const key = process.env.NEXT_PUBLIC_AWS_LOCATION_API_KEY;
  if (key) {
    const region = process.env.NEXT_PUBLIC_AWS_LOCATION_REGION ?? 'ap-south-1';
    return `https://maps.geo.${region}.amazonaws.com/v2/styles/Monochrome/descriptor?key=${key}&color-scheme=Light`;
  }
  return 'https://tiles.openfreemap.org/styles/positron';
}

interface Palette {
  bg: string;
  land: string;
  park: string;
  water: string;
  building: string;
  road: string;
  roadMajor: string;
  rail: string;
  boundary: string;
  label: string;
  labelStrong: string;
  halo: string;
}

export const PALETTES: Record<'light' | 'dark', Palette> = {
  light: {
    bg: '#F3EFE6',
    land: '#F0EBE1',
    park: '#E6E3D3',
    water: '#C9D2D4',
    building: '#E7E1D4',
    road: '#E6E0D4',
    roadMajor: '#DAD3C5',
    rail: '#D9D3C7',
    boundary: '#A8A59D',
    label: '#8C8A84',
    labelStrong: '#5F5D58',
    halo: '#F3EFE6',
  },
  dark: {
    bg: '#121210',
    land: '#161614',
    park: '#181a15',
    water: '#1A2023',
    building: '#1D1D1A',
    road: '#24241F',
    roadMajor: '#2E2E29',
    rail: '#24241F',
    boundary: '#3A3A35',
    label: '#46453F',
    labelStrong: '#6B6963',
    halo: '#121210',
  },
};

function set(map: MlMap, id: string, prop: string, value: unknown) {
  try {
    map.setPaintProperty(id, prop, value);
  } catch {
    /* property not applicable to this layer: ignore */
  }
}

/** Recolour any vector style (OpenFreeMap Positron or Amazon Location Monochrome) into our paper/ink look. */
export function recolor(map: MlMap, variant: 'light' | 'dark') {
  const p = PALETTES[variant];
  const layers = map.getStyle()?.layers ?? [];
  for (const layer of layers) {
    const id = layer.id;
    const n = id.toLowerCase();
    const src = 'source-layer' in layer ? String(layer['source-layer'] ?? '').toLowerCase() : '';
    const key = `${n} ${src}`;
    const isWater = /water|ocean|sea|lake|river/.test(key);
    switch (layer.type) {
      case 'background':
        set(map, id, 'background-color', p.bg);
        break;
      case 'fill':
        if (isWater) set(map, id, 'fill-color', p.water);
        else if (/building/.test(key)) {
          set(map, id, 'fill-color', p.building);
          set(map, id, 'fill-outline-color', p.building);
        } else if (/park|wood|forest|grass|green|landcover|vegetation/.test(key)) set(map, id, 'fill-color', p.park);
        else set(map, id, 'fill-color', p.land);
        break;
      case 'fill-extrusion':
        map.setLayoutProperty(id, 'visibility', 'none');
        break;
      case 'line':
        if (/casing|outline/.test(key) && !isWater) map.setLayoutProperty(id, 'visibility', 'none');
        else if (isWater) set(map, id, 'line-color', p.water);
        else if (/boundary|admin/.test(key)) {
          set(map, id, 'line-color', p.boundary);
          set(map, id, 'line-opacity', 0.6);
        } else if (/rail|transit/.test(key)) set(map, id, 'line-color', p.rail);
        else if (/motorway|trunk|primary|major/.test(key)) set(map, id, 'line-color', p.roadMajor);
        else set(map, id, 'line-color', p.road);
        break;
      case 'symbol':
        if (/poi|shield|icon|aerodrome|airport|transit|housenum/.test(key)) {
          map.setLayoutProperty(id, 'visibility', 'none');
          break;
        }
        set(map, id, 'text-color', /place|city|town|suburb|neighbourhood|locality/.test(key) ? p.labelStrong : p.label);
        set(map, id, 'text-halo-color', p.halo);
        set(map, id, 'text-halo-width', 1.2);
        set(map, id, 'icon-opacity', 0);
        break;
      case 'circle':
        set(map, id, 'circle-color', p.label);
        break;
      default:
        break;
    }
  }
}
