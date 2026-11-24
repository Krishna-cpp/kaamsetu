'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'denied' | 'unsupported';

const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];

function pickMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
}

/**
 * MediaRecorder + AnalyserNode. `analyser` is exposed for the live waveform.
 * `stop()` resolves with the recorded Blob (or null if nothing was captured).
 */
export function useRecorder() {
  const [state, setState] = useState<RecorderState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const tick = useRef<number | null>(null);
  const resolver = useRef<((b: Blob | null) => void) | null>(null);

  const cleanup = useCallback(() => {
    if (tick.current) window.clearInterval(tick.current);
    tick.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    void audioCtx.current?.close().catch(() => undefined);
    audioCtx.current = null;
    setAnalyser(null);
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const start = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setState('unsupported');
      return false;
    }
    setState('requesting');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      stream.current = s;
      const mime = pickMime();
      const r = new MediaRecorder(s, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = () => {
        const blob = chunks.current.length ? new Blob(chunks.current, { type: r.mimeType || 'audio/webm' }) : null;
        cleanup();
        resolver.current?.(blob);
        resolver.current = null;
      };
      rec.current = r;
      try {
        const Ctor = window.AudioContext;
        const ctx = new Ctor();
        const src = ctx.createMediaStreamSource(s);
        const an = ctx.createAnalyser();
        an.fftSize = 256;
        an.smoothingTimeConstant = 0.6;
        src.connect(an);
        audioCtx.current = ctx;
        setAnalyser(an);
      } catch {
        /* waveform is decorative */
      }
      r.start(250);
      const t0 = Date.now();
      setElapsed(0);
      tick.current = window.setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 250);
      setState('recording');
      return true;
    } catch (e) {
      cleanup();
      const name = e instanceof DOMException ? e.name : '';
      setState(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' ? 'unsupported' : 'denied');
      return false;
    }
  }, [cleanup]);

  const stop = useCallback((): Promise<Blob | null> => {
    const r = rec.current;
    rec.current = null;
    setState('idle');
    if (!r || r.state === 'inactive') {
      cleanup();
      return Promise.resolve(null);
    }
    return new Promise((res) => {
      resolver.current = res;
      r.stop();
    });
  }, [cleanup]);

  return { state, elapsed, analyser, start, stop, reset: () => setState('idle') };
}
