'use client';

/**
 * Plays a short demo clip and exposes a live level + progress for waveforms.
 * Bulletproof by design: if the file 404s, autoplay is blocked, or sound is
 * muted, it falls back to a timed "fake" playback with a deterministic level,
 * so captions and waveforms still run and the demo never stalls.
 */
export type PlayResult = 'ended' | 'cancelled';

export class ClipPlayer {
  private el: HTMLAudioElement | null = null;
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private data: Uint8Array<ArrayBuffer> | null = null;
  private real = false;
  private startedAt = 0;
  private fallbackMs = 0;
  private cancel: (() => void) | null = null;
  muted = false;

  /** Call from a user gesture so the AudioContext may start. */
  unlock() {
    if (typeof window === 'undefined') return;
    if (!this.el) {
      this.el = new Audio();
      this.el.preload = 'auto';
      this.el.crossOrigin = 'anonymous';
    }
    if (!this.ctx) {
      try {
        const Ctor = window.AudioContext;
        this.ctx = new Ctor();
        const src = this.ctx.createMediaElementSource(this.el);
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.7;
        src.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
        this.data = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
      } catch {
        this.ctx = null;
        this.analyser = null;
      }
    }
    if (this.ctx?.state === 'suspended') void this.ctx.resume().catch(() => undefined);
  }

  get isReal() {
    return this.real;
  }

  /** 0..1 */
  progress(): number {
    if (this.real && this.el && Number.isFinite(this.el.duration) && this.el.duration > 0) {
      return Math.min(1, this.el.currentTime / this.el.duration);
    }
    if (!this.fallbackMs) return 0;
    return Math.min(1, (performance.now() - this.startedAt) / this.fallbackMs);
  }

  /** Current duration in seconds (real if known, otherwise the fallback). */
  duration(): number {
    if (this.real && this.el && Number.isFinite(this.el.duration)) return this.el.duration;
    return this.fallbackMs / 1000;
  }

  /** 0..1 loudness. Real analyser when available, else a speech-like synthetic envelope. */
  level(): number {
    if (this.real && this.analyser && this.data) {
      this.analyser.getByteFrequencyData(this.data);
      let sum = 0;
      const n = Math.min(48, this.data.length);
      for (let i = 2; i < n; i++) sum += this.data[i] ?? 0;
      return Math.min(1, sum / (n - 2) / 150);
    }
    const t = (performance.now() - this.startedAt) / 1000;
    const syllable = Math.abs(Math.sin(t * 9.1)) * 0.6 + Math.abs(Math.sin(t * 3.7 + 1.3)) * 0.4;
    const phrase = Math.sin(t * 1.3) > -0.75 ? 1 : 0.15;
    return Math.min(1, 0.15 + syllable * phrase * 0.85);
  }

  stop() {
    this.cancel?.();
    this.cancel = null;
    if (this.el) {
      this.el.pause();
      this.el.removeAttribute('src');
      this.el.load();
    }
  }

  /**
   * Resolves when the clip (or its timed fallback) ends, or when stopped.
   * Never rejects.
   */
  play(url: string, fallbackMs: number): Promise<PlayResult> {
    this.stop();
    this.fallbackMs = fallbackMs;
    this.startedAt = performance.now();
    this.real = false;

    return new Promise<PlayResult>((resolve) => {
      let done = false;
      let timer = 0;
      const el = this.el;
      const finish = (r: PlayResult) => {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        if (el) {
          el.onended = null;
          el.onerror = null;
        }
        this.cancel = null;
        resolve(r);
      };
      const fallback = () => {
        if (done) return;
        this.real = false;
        this.startedAt = performance.now();
        window.clearTimeout(timer);
        timer = window.setTimeout(() => finish('ended'), fallbackMs);
      };
      this.cancel = () => finish('cancelled');

      if (!el || this.muted) {
        fallback();
        return;
      }
      // Safety net: if nothing starts within 2.5s, go to fallback timing.
      timer = window.setTimeout(fallback, 2500);
      el.onerror = () => fallback();
      el.onended = () => finish('ended');
      el.src = url;
      el.play().then(
        () => {
          if (done) return;
          window.clearTimeout(timer);
          this.real = true;
          this.startedAt = performance.now();
          // hard cap in case `ended` never fires
          const cap = Number.isFinite(el.duration) && el.duration > 0 ? el.duration * 1000 + 1500 : 30_000;
          timer = window.setTimeout(() => finish('ended'), cap);
        },
        () => fallback(),
      );
    });
  }

  dispose() {
    this.stop();
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.el = null;
  }
}

/** Reading-speed based fallback duration for a caption. */
export function captionMs(text: string): number {
  return Math.max(2600, Math.min(9000, text.length * 62));
}

/** Deterministic pseudo-random bar heights for a static voice-note waveform. */
export function seededBars(seed: number, n: number): number[] {
  let s = seed * 9301 + 49297;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    const env = Math.sin((i / (n - 1)) * Math.PI) * 0.55 + 0.45;
    out.push(Math.max(0.12, Math.min(1, (0.25 + r * 0.75) * env)));
  }
  return out;
}
