'use client';

import clsx from 'clsx';
import { useMemo } from 'react';
import { PUNE_LOCALITIES } from '@kaamsetu/core';
import { boundsOf } from './geo';
import { pinStatusLabel, type MapViewProps } from './types';

/**
 * Offline map: paper + hairline grid, pins positioned by a simple equirectangular projection.
 * Used when the tile server is unreachable so the demo never breaks.
 */
export function FallbackMap({ variant = 'light', job, jobs, workers, dots, pings, activeId, onHover, onSelect, className, ariaLabel }: MapViewProps) {
  const dark = variant === 'dark';
  const ring = job?.radiusKm ? { lat: job.lat, lng: job.lng, radiusKm: job.radiusKm } : null;
  const b = useMemo(() => {
    const focus = [...(job ? [job] : []), ...(workers ?? [])];
    return (
      (focus.length ? boundsOf(focus, ring) : boundsOf([...(dots ?? []), ...(jobs ?? [])])) ??
      boundsOf(PUNE_LOCALITIES.map((l) => ({ lat: l.lat, lng: l.lng })))!
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job, workers, dots, jobs]);

  // pad bounds 12% and keep aspect sane
  const padLat = (b.maxLat - b.minLat || 0.02) * 0.14;
  const padLng = (b.maxLng - b.minLng || 0.02) * 0.14;
  const box = { minLat: b.minLat - padLat, maxLat: b.maxLat + padLat, minLng: b.minLng - padLng, maxLng: b.maxLng + padLng };
  const pos = (lat: number, lng: number) => ({
    left: `${((lng - box.minLng) / (box.maxLng - box.minLng)) * 100}%`,
    top: `${(1 - (lat - box.minLat) / (box.maxLat - box.minLat)) * 100}%`,
  });
  const ringW = ring ? ((ring.radiusKm / (111.32 * Math.cos((ring.lat * Math.PI) / 180))) * 2 * 100) / (box.maxLng - box.minLng) : 0;
  const ringH = ring ? ((ring.radiusKm / 110.574) * 2 * 100) / (box.maxLat - box.minLat) : 0;

  const labels = PUNE_LOCALITIES.filter((l) => l.lat > box.minLat && l.lat < box.maxLat && l.lng > box.minLng && l.lng < box.maxLng);

  return (
    <div
      className={clsx('ks-fallback relative h-full w-full overflow-hidden', dark ? 'bg-ink' : 'bg-paper', className)}
      data-variant={variant}
      role="region"
      aria-label={ariaLabel ?? 'Map of Pune (offline view)'}
    >
      {labels.map((l) => (
        <span key={l.name} className={clsx('label absolute -translate-x-1/2 -translate-y-1/2', dark ? 'text-paper/25' : 'text-concrete/80')} style={pos(l.lat, l.lng)}>
          {l.name}
        </span>
      ))}
      {ring && (
        <span
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-hivis bg-hivis/5"
          style={{ ...pos(ring.lat, ring.lng), width: `${ringW}%`, height: `${ringH}%` }}
        />
      )}
      {(dots ?? []).map((d) => (
        <span key={d.id} className={clsx('absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full', dark ? 'bg-paper/50' : 'bg-ink/50')} style={pos(d.lat, d.lng)} />
      ))}
      {(jobs ?? []).map((j) => (
        <span key={j.id} className="ks-marker absolute -translate-x-1/2 -translate-y-1/2" style={pos(j.lat, j.lng)}>
          <span className="ks-job" data-focus="false" data-variant={variant} />
        </span>
      ))}
      {job && (
        <span className="ks-marker absolute z-[4] -translate-x-1/2 -translate-y-1/2" style={pos(job.lat, job.lng)} role="img" aria-label={job.label ?? 'Job location'}>
          <span className="ks-job" data-focus="true" data-variant={variant} />
        </span>
      )}
      {(pings ?? []).map((p) => (
        <span key={p.id} className="ks-marker absolute z-[3] -translate-x-1/2 -translate-y-1/2" style={pos(p.lat, p.lng)} aria-hidden>
          <span className="ks-ping" data-tone={p.tone}>
            <i />
            <i />
            <b />
          </span>
        </span>
      ))}
      {(workers ?? []).map((w) => (
        <button
          key={w.id}
          type="button"
          className="ks-marker absolute -translate-x-1/2 -translate-y-1/2"
          style={{ ...pos(w.lat, w.lng), zIndex: activeId === w.id ? 10 : w.status === 'accepted' ? 6 : 5 }}
          aria-label={`${w.label}, ${pinStatusLabel(w.status)}`}
          onMouseEnter={() => onHover?.(w.id)}
          onMouseLeave={() => onHover?.(null)}
          onFocus={() => onHover?.(w.id)}
          onBlur={() => onHover?.(null)}
          onClick={() => onSelect?.(w.id)}
        >
          <span className="ks-pin" data-status={w.status} data-variant={variant} data-active={String(activeId === w.id)}>
            {w.rank}
          </span>
        </button>
      ))}
      <p className={clsx('label absolute bottom-2 left-2 px-1.5 py-1', dark ? 'bg-ink-2 text-paper/50' : 'bg-paper text-concrete')}>Offline map · approximate positions</p>
    </div>
  );
}
