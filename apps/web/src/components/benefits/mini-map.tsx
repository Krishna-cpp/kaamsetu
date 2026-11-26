import clsx from 'clsx';
import { BENGALURU_LOCALITIES, PUNE_LOCALITIES } from '@kaamsetu/core';

const ALL = [...PUNE_LOCALITIES, ...BENGALURU_LOCALITIES];

/**
 * A tiny schematic map: paper grid, nearby locality names and one hi-vis pin.
 * Static (no tiles, no JS), so it is safe to render many times, inside scroll lists and on the server.
 */
export function MiniMap({
  lat,
  lng,
  label,
  className,
  spanDeg = 0.045,
  caption,
}: {
  lat: number;
  lng: number;
  /** accessible description, e.g. "Common Service Centre in Kothrud" */
  label: string;
  className?: string;
  /** half-width of the view in degrees of longitude */
  spanDeg?: number;
  /** short name under the pin, e.g. the area */
  caption?: string;
}) {
  const spanLat = spanDeg * 0.6;
  const box = { minLat: lat - spanLat, maxLat: lat + spanLat, minLng: lng - spanDeg, maxLng: lng + spanDeg };
  const pos = (la: number, ln: number) => ({
    left: `${((ln - box.minLng) / (box.maxLng - box.minLng)) * 100}%`,
    top: `${(1 - (la - box.minLat) / (box.maxLat - box.minLat)) * 100}%`,
  });
  // nearby locality names, kept away from the pin and the edges so they never collide with it
  const near = ALL.filter((l) => {
    const dx = (l.lng - lng) / spanDeg;
    const dy = (l.lat - lat) / spanLat;
    return Math.abs(dx) < 0.55 && Math.abs(dy) < 0.7 && Math.hypot(dx, dy) > 0.3;
  }).slice(0, 4);

  return (
    <div
      className={clsx('ks-fallback relative overflow-hidden border border-ink bg-paper', className)}
      role="img"
      aria-label={`Map: ${label}`}
    >
      {/* a couple of schematic roads */}
      <span className="absolute inset-x-0 top-[62%] h-[3px] -rotate-6 bg-line" aria-hidden />
      <span className="absolute inset-y-0 left-[38%] w-[3px] rotate-12 bg-line" aria-hidden />
      {near.map((l) => (
        <span
          key={l.name}
          className="label absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[9.5px] text-concrete"
          style={pos(l.lat, l.lng)}
          aria-hidden
        >
          {l.name}
        </span>
      ))}
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden>
        <span className="absolute left-1/2 top-1/2 size-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-hivis bg-hivis/10" />
        <span className="relative block size-3.5 rotate-45 border-2 border-ink bg-hivis" />
        {caption && (
          <span className="label absolute left-1/2 top-full mt-3 -translate-x-1/2 whitespace-nowrap bg-paper px-1 text-[9.5px] text-ink">
            {caption}
          </span>
        )}
      </span>
    </div>
  );
}

export const mapsHref = (lat: number, lng: number) => `https://maps.google.com/?q=${lat},${lng}`;
