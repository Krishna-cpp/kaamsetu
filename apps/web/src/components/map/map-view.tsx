'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import clsx from 'clsx';
import maplibregl, { type GeoJSONSource, type Map as MlMap, type Marker } from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import { PUNE_CENTER } from '@kaamsetu/core';
import type { FeatureCollection } from 'geojson';
import { FallbackMap } from './fallback';
import { boundsOf, circlePolygon } from './geo';
import { PALETTES, recolor, styleUrl } from './style';
import { pinStatusLabel, type MapViewProps } from './types';

const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] };
const LOAD_TIMEOUT_MS = 9000;

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function MapView(props: MapViewProps) {
  const { variant = 'light', job, jobs, workers, dots, pings, activeId, fitKey, className, ariaLabel } = props;
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const cb = useRef({ onHover: props.onHover, onSelect: props.onSelect });
  cb.current = { onHover: props.onHover, onSelect: props.onSelect };

  const workerMarkers = useRef(new Map<string, { m: Marker; pin: HTMLSpanElement }>());
  const jobMarkers = useRef(new Map<string, Marker>());
  const pingMarkers = useRef(new Map<string, Marker>());

  /* ── create map ── */
  useEffect(() => {
    if (!box.current) return;
    let loaded = false;
    const map = new maplibregl.Map({
      container: box.current,
      style: styleUrl(),
      center: [PUNE_CENTER.lng, PUNE_CENTER.lat],
      zoom: 11,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
      cooperativeGestures: window.innerWidth < 768,
      fadeDuration: 0,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    const fail = () => {
      if (loaded) return;
      setFailed(true);
    };
    const timer = window.setTimeout(fail, LOAD_TIMEOUT_MS);
    map.on('error', () => {
      if (!loaded && !map.isStyleLoaded()) fail();
    });
    map.on('load', () => {
      loaded = true;
      window.clearTimeout(timer);
      recolor(map, variant);
      const pal = PALETTES[variant];
      map.addSource('ks-dots', { type: 'geojson', data: EMPTY });
      map.addLayer({
        id: 'ks-dots',
        type: 'circle',
        source: 'ks-dots',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 3, 12, 4.5, 15, 7],
          'circle-color': variant === 'dark' ? '#F3EFE6' : '#121210',
          'circle-opacity': variant === 'dark' ? 0.7 : 0.78,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': pal.bg,
        },
      });
      map.addSource('ks-ring', { type: 'geojson', data: EMPTY });
      map.addLayer({ id: 'ks-ring-fill', type: 'fill', source: 'ks-ring', paint: { 'fill-color': '#FF5B14', 'fill-opacity': 0.05 } });
      map.addLayer({
        id: 'ks-ring-line',
        type: 'line',
        source: 'ks-ring',
        paint: { 'line-color': '#FF5B14', 'line-width': 1.2, 'line-dasharray': [3, 2] },
      });
      setReady(true);
    });

    const markers = workerMarkers.current;
    const jm = jobMarkers.current;
    const pm = pingMarkers.current;
    return () => {
      window.clearTimeout(timer);
      markers.clear();
      jm.clear();
      pm.clear();
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, [variant]);

  /* ── dots ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource('ks-dots') as GeoJSONSource | undefined;
    src?.setData({
      type: 'FeatureCollection',
      features: (dots ?? []).map((d) => ({ type: 'Feature', properties: { id: d.id }, geometry: { type: 'Point', coordinates: [d.lng, d.lat] } })),
    });
  }, [dots, ready]);

  /* ── ring + focused job ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource('ks-ring') as GeoJSONSource | undefined;
    src?.setData(job?.radiusKm ? { type: 'FeatureCollection', features: [circlePolygon(job.lat, job.lng, job.radiusKm)] } : EMPTY);
  }, [job?.lat, job?.lng, job?.radiusKm, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const all = [...(job ? [{ ...job, focus: true }] : []), ...(jobs ?? []).map((j) => ({ ...j, focus: false }))];
    const seen = new Set<string>();
    for (const j of all) {
      const key = (j.focus ? 'F:' : 'J:') + j.id;
      seen.add(key);
      const existing = jobMarkers.current.get(key);
      if (existing) {
        existing.setLngLat([j.lng, j.lat]);
        continue;
      }
      const el = document.createElement('div');
      el.className = 'ks-marker';
      el.innerHTML = `<span class="ks-job" data-focus="${j.focus}" data-variant="${variant}"></span>`;
      el.setAttribute('aria-label', j.label ?? 'Job location');
      el.setAttribute('role', 'img');
      el.style.zIndex = j.focus ? '4' : '1';
      jobMarkers.current.set(key, new maplibregl.Marker({ element: el }).setLngLat([j.lng, j.lat]).addTo(map));
    }
    for (const [k, m] of jobMarkers.current) {
      if (!seen.has(k)) {
        m.remove();
        jobMarkers.current.delete(k);
      }
    }
  }, [job, jobs, ready, variant]);

  /* ── worker pins ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const seen = new Set<string>();
    for (const w of workers ?? []) {
      seen.add(w.id);
      let entry = workerMarkers.current.get(w.id);
      if (!entry) {
        const el = document.createElement('div');
        el.className = 'ks-marker';
        el.tabIndex = 0;
        el.setAttribute('role', 'button');
        const pin = document.createElement('span');
        pin.className = 'ks-pin';
        el.appendChild(pin);
        el.addEventListener('mouseenter', () => cb.current.onHover?.(w.id));
        el.addEventListener('mouseleave', () => cb.current.onHover?.(null));
        el.addEventListener('focus', () => cb.current.onHover?.(w.id));
        el.addEventListener('blur', () => cb.current.onHover?.(null));
        el.addEventListener('click', () => cb.current.onSelect?.(w.id));
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            cb.current.onSelect?.(w.id);
          }
        });
        entry = { m: new maplibregl.Marker({ element: el }).setLngLat([w.lng, w.lat]).addTo(map), pin };
        workerMarkers.current.set(w.id, entry);
      }
      entry.m.setLngLat([w.lng, w.lat]);
      entry.pin.textContent = String(w.rank);
      entry.pin.dataset.status = w.status;
      entry.pin.dataset.variant = variant;
      entry.pin.dataset.active = String(activeId === w.id);
      entry.m.getElement().setAttribute('aria-label', `${w.label}, ${pinStatusLabel(w.status)}`);
      entry.m.getElement().style.zIndex = activeId === w.id ? '10' : w.status === 'accepted' ? '6' : String(Math.max(1, 5 - Math.floor(w.rank / 3)));
    }
    for (const [k, e] of workerMarkers.current) {
      if (!seen.has(k)) {
        e.m.remove();
        workerMarkers.current.delete(k);
      }
    }
  }, [workers, activeId, ready, variant]);

  /* ── pings ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const seen = new Set<string>();
    for (const p of pings ?? []) {
      seen.add(p.id);
      if (pingMarkers.current.has(p.id)) continue;
      const el = document.createElement('div');
      el.className = 'ks-marker';
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = `<span class="ks-ping" data-tone="${p.tone}"><i></i><i></i><b></b></span>`;
      el.style.zIndex = '3';
      pingMarkers.current.set(p.id, new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map));
    }
    for (const [k, m] of pingMarkers.current) {
      if (!seen.has(k)) {
        m.remove();
        pingMarkers.current.delete(k);
      }
    }
  }, [pings, ready]);

  /* ── camera ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const ring = job?.radiusKm ? { lat: job.lat, lng: job.lng, radiusKm: job.radiusKm } : null;
    const focus = [...(job ? [job] : []), ...(workers ?? [])];
    const b = focus.length ? boundsOf(focus, ring) : boundsOf([...(dots ?? []), ...(jobs ?? [])]);
    if (!b) return;
    const w = map.getContainer().clientWidth;
    const pad = props.fitPadding ?? (w < 500 ? 28 : 64);
    map.fitBounds(
      [
        [b.minLng, b.minLat],
        [b.maxLng, b.maxLat],
      ],
      { padding: pad, maxZoom: 14, duration: prefersReducedMotion() ? 0 : 900 },
    );
    // Only refit when the caller says the subject changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, ready]);

  if (failed) return <FallbackMap {...props} />;

  return (
    <div
      ref={box}
      className={clsx('ks-map relative h-full w-full', variant === 'dark' ? 'ks-map-dark bg-ink' : 'bg-paper', className)}
      role="region"
      aria-label={ariaLabel ?? 'Map of Pune'}
    />
  );
}
