'use client';

import clsx from 'clsx';
import dynamic from 'next/dynamic';

export type { DotPoint, JobPin, MapViewProps, Ping, PinStatus, WorkerPin } from './types';

/** Lazy, client-only MapLibre map (keeps maplibre-gl out of the initial bundle). */
export const KMap = dynamic(() => import('./map-view'), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export function MapSkeleton({ dark = false }: { dark?: boolean }) {
  return (
    <div className={clsx('ks-map-grid relative h-full w-full', dark ? 'bg-ink' : 'bg-paper')} role="status" aria-label="Loading map">
      <span className={clsx('label absolute left-3 top-3', dark ? 'text-paper/40' : 'text-concrete')}>Loading map…</span>
    </div>
  );
}
