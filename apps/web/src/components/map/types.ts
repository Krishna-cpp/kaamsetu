export type PinStatus = 'suggested' | 'alerted' | 'viewed' | 'accepted' | 'declined';

export interface WorkerPin {
  id: string;
  lat: number;
  lng: number;
  rank: number;
  status: PinStatus;
  /** accessible name, e.g. "Ramesh Pawar, rank 1, accepted" */
  label: string;
}

export interface JobPin {
  id: string;
  lat: number;
  lng: number;
  radiusKm?: number;
  label?: string;
}

export interface DotPoint {
  id: string;
  lat: number;
  lng: number;
}

export interface Ping {
  id: string;
  lat: number;
  lng: number;
  tone: 'hivis' | 'signal' | 'paper';
}

export interface MapViewProps {
  variant?: 'light' | 'dark';
  /** The focused job: ink square + radius ring. */
  job?: JobPin | null;
  /** Secondary job squares (e.g. open jobs on /live). */
  jobs?: JobPin[];
  /** Ranked, status-coloured worker pins. */
  workers?: WorkerPin[];
  /** Ambient dots (all workers) — cheap GeoJSON layer. */
  dots?: DotPoint[];
  /** Transient pulse rings. */
  pings?: Ping[];
  activeId?: string | null;
  onHover?: (id: string | null) => void;
  onSelect?: (id: string) => void;
  /** Change this to re-fit the camera to the current content. */
  fitKey?: string;
  /** camera padding when fitting (e.g. leave room for a bottom sheet) */
  fitPadding?: number | { top: number; right: number; bottom: number; left: number };
  className?: string;
  ariaLabel?: string;
}

/** Map pin CSS class + data attrs shared by MapLibre markers and the offline fallback. */
export function pinStatusLabel(s: PinStatus): string {
  return s === 'suggested' ? 'shortlisted' : s;
}
