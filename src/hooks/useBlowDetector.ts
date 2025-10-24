// hooks/useBlowDetector.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Detecta "soplar" midiendo RMS sobre un AnalyserNode.
 * - Acumula tiempo sólo cuando el nivel supera `threshold`.
 * - Requiere invocar start() tras gesto del usuario (tap/click).
 */
export function useBlowDetector(opts?: {
  threshold?: number;          // 0..1 ~ sensibilidad (0.02-0.06 recomendable)
  smoothing?: number;          // 0..1 suavizado exponencial
  fftSize?: number;            // 256/512
  targetMs?: number;           // ms de soplo acumulado requeridos
  maxMicWaitMs?: number;       // ms para timeout al solicitar permisos
}) {
  const {
    threshold = 0.035,
    smoothing = 0.8,
    fftSize = 256,
    targetMs = 2500,
    maxMicWaitMs = 8000,
  } = opts || {};

  const [permission, setPermission] = useState<"idle"|"prompt"|"granted"|"denied"|"error">("idle");
  const [active, setActive] = useState(false);
  const [level, setLevel] = useState(0);            // 0..1
  const [blowing, setBlowing] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);    // ms acumulados sopra
  const [done, setDone] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameTsRef = useRef<number | null>(null);

  const stopAudio = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;

    analyserRef.current?.disconnect();
    analyserRef.current = null;

    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;

    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    setActive(false);
    setBlowing(false);
    setLevel(0);
    lastFrameTsRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setPermission("prompt");
    setDone(false);
    setElapsedMs(0);

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), maxMicWaitMs);

    try {
      const getUserMediaPromise = navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          channelCount: 1,
          sampleRate: 44100,
        },
        video: false,
      });

      const abortPromise = new Promise<MediaStream>((_, reject) => {
        ctrl.signal.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        }, { once: true });
      });

      const stream = await Promise.race([getUserMediaPromise, abortPromise]);

      clearTimeout(timeout);
      setPermission("granted");

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = fftSize;
      analyser.smoothingTimeConstant = smoothing;

      source.connect(analyser);
      ctxRef.current = ctx;
      analyserRef.current = analyser;
      streamRef.current = stream;
      setActive(true);

      const buf = new Uint8Array(analyser.frequencyBinCount);

      const tick = (ts: number) => {
        rafRef.current = requestAnimationFrame(tick);
        if (!analyserRef.current) return;

        analyserRef.current.getByteTimeDomainData(buf);

        // RMS simple sobre time domain (0..255), centrado en 128
        let sumSq = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128; // -1..1
          sumSq += v * v;
        }
        const rms = Math.sqrt(sumSq / buf.length); // 0..~0.7
        setLevel(rms);

        const isBlowing = rms >= threshold;
        setBlowing(isBlowing);

        // integrar tiempo sólo mientras sopla
        const last = lastFrameTsRef.current ?? ts;
        const dt = ts - last;
        lastFrameTsRef.current = ts;

        if (isBlowing) {
          setElapsedMs(prev => {
            const next = prev + dt;
            if (next >= targetMs) setDone(true);
            return Math.min(next, targetMs);
          });
        }
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      clearTimeout(timeout);
      setPermission((err as any)?.name === "NotAllowedError" ? "denied" : "error");
      stopAudio();
    }
  }, [fftSize, smoothing, threshold, targetMs, maxMicWaitMs, stopAudio]);

  useEffect(() => {
    return () => stopAudio();
  }, [stopAudio]);

  return {
    // estado
    permission, active, level, blowing, elapsedMs, targetMs, done,
    // acciones
    start, stop: stopAudio,
  };
}
