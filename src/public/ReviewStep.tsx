/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import ButtonPrimary from "./components/button";
import { useBlowDetector } from "../hooks/useBlowDetector";
import BlowParticlesOverlay from "./components/BlowParticlesOverlay";

export default function ReviewStep({
  framedShot,
  onConfirmSend,
}: {
  framedShot: string;
  onConfirmSend: () => void;
}) {
  const headerRef = useRef<HTMLElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);
  const frameImgRef = useRef<HTMLImageElement | null>(null);

  const [frameNat, setFrameNat] = useState<{ w: number; h: number } | null>(null);
  const [display, setDisplay] = useState<{ w: number; h: number } | null>(null);

  // --- Detección de soplo ---
  const REQUIRED_MS = 2500;
  const { start, stop, permission, active, level, blowing, elapsedMs, targetMs, done } =
    useBlowDetector({ threshold: 0.035, targetMs: REQUIRED_MS });

  // Intento de auto-start al entrar a Review
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await start();
      } catch {
      }
      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
      stop(); // liberar recursos al salir del step
    };
  }, [start, stop]);

  // Enviar cuando complete el soplo requerido
  useEffect(() => {
    if (done) {
      setTimeout(() => {
        stop();
        onConfirmSend();
      }, 150);
    }
  }, [done, stop, onConfirmSend]);

  // Layout base
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  const computeDisplay = useCallback((natW: number, natH: number) => {
    const vw = Math.min(window.innerWidth, 1280);
    const sidePadding = 32 * 2;
    const maxW = Math.max(280, Math.min(vw - sidePadding, 960));
    const hdr = headerRef.current?.offsetHeight ?? 0;
    const ftr = footerRef.current?.offsetHeight ?? 0;
    const verticalGaps = 24 + 24;
    const maxH = Math.max(220, window.innerHeight - hdr - ftr - verticalGaps);

    let dispW = Math.min(maxW, Math.round(maxH * (natW / natH)));
    let dispH = Math.round(dispW * (natH / natW));
    if (dispH > maxH) {
      dispH = Math.round(maxH);
      dispW = Math.round(dispH * (natW / natH));
    }
    setDisplay({ w: dispW, h: dispH });
  }, []);

  // Cargar foto y tamaños
  useEffect(() => {
    let cancelled = false;
    const afterHaveNat = (w: number, h: number) => {
      setFrameNat({ w, h });
      computeDisplay(w, h);
    };
    if (!framedShot) return;

    (async () => {
      try {
        const img = new Image();
        img.decoding = "async";
        img.src = framedShot;
        await img.decode();
        if (cancelled) return;
        frameImgRef.current = img;
        afterHaveNat(img.naturalWidth || img.width, img.naturalHeight || img.height);
      } catch {
        const img = new Image();
        img.src = framedShot;
        img.onload = () => {
          if (cancelled) return;
          frameImgRef.current = img;
          afterHaveNat(img.naturalWidth || img.width, img.naturalHeight || img.height);
        };
      }
    })();

    return () => { cancelled = true; };
  }, [framedShot, computeDisplay]);

  useEffect(() => {
    if (!frameNat) return;
    const onResize = () => computeDisplay(frameNat.w, frameNat.h);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [frameNat, computeDisplay]);

  const progress = Math.min(1, elapsedMs / targetMs);
  const glowStrength = Math.min(0.6, 0.1 + level * 1.5);
  const [manualSending, setManualSending] = useState(false);

  const handleManualSend = async () => {
    if (manualSending) return;
    setManualSending(true);
    try {
      if (active) stop();
      onConfirmSend();
    } finally {
      setManualSending(false);
    }
  };

  const needEnableButton =
    !active && (permission === "idle" || permission === "prompt"); // Safari/iOS por auto-start fallido

  const showMicError = permission === "denied" || permission === "error";

  return (
    <div
      className="
        relative h-screen w-screen
        grid grid-rows-[auto,1fr,auto]
        bg-black/50 text-white
        pb-[env(safe-area-inset-bottom)]
      "
    >
      {/* HEADER */}
      <header
        ref={headerRef}
        className="z-40 w-full"
        style={{ position: "absolute", top: "2%" }}
      >
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            <img
              src="/CORTES/HOME/LOGO_GONDOLA.png"
              alt="Logo Góndola"
              className="h-auto select-none"
              style={{ width: "clamp(150px, 18vw, 190px)" }}
              draggable={false}
            />
            <img
              src="/LOGO_GEN.png"
              alt="Logo Generador"
              className="h-auto select-none"
              style={{ width: "clamp(150px, 16vw, 180px)" }}
              draggable={false}
            />
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main
        className="z-30 mx-auto flex w-full max-w-6xl items-center justify-center"
        style={{ position: "absolute", top: "15%" }}
      >
        <div className="relative w-full flex items-center justify-center my-4 md:my-6">
          {display && (
            <div
              className="relative"
              style={{ width: `${display.w}px`, height: `${display.h}px` }}
            >
              <img
                src={framedShot}
                alt="Revisión final"
                className="absolute inset-0 w-full h-full object-contain select-none"
                draggable={false}
                style={{
                  filter: blowing
                    ? `drop-shadow(0 0 ${Math.round(24 + 36*glowStrength)}px rgba(255,255,255,${0.35+glowStrength}))`
                    : "none",
                  transition: "filter 120ms linear",
                }}
              />

              <BlowParticlesOverlay
                intensity={Math.min(1, level * 3)}
                playing={blowing}
                width={display.w}
                height={display.h}
              />

              <div
                className="absolute left-3 top-3 text-xs md:text-sm bg-black/50 px-2 py-1 rounded"
                aria-live="polite"
              >
                {showMicError
                  ? "Micrófono no disponible"
                  : done
                  ? "¡Listo!"
                  : active
                  ? (blowing ? "Soplando…" : "Listo para soplar")
                  : "Activando micrófono…"}
                {" · "}
                {Math.round(progress * 100)}%
              </div>
            </div>
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer
        ref={footerRef}
        className="z-40"
        style={{ position: "absolute", bottom: "3%", width: "100%" }}
      >
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-4 flex flex-col items-center justify-center gap-3">
          {needEnableButton && !showMicError && (
            <ButtonPrimary
              onClick={start}
              label="Activar micrófono"
              imageSrc="/CORTES/BOTONES/BOTON-LARGO.png"
              width={260}
              height={54}
              ariaLabel="Activar micrófono para soplar y enviar"
            />
          )}

          {/* Botón manual */}
          <ButtonPrimary
            onClick={handleManualSend}
            label={manualSending ? "ENVIANDO…" : "CONFIRMAR Y ENVIAR"}
            imageSrc="/CORTES/BOTONES/BOTON-LARGO.png"
            width={300}
            height={60}
            ariaLabel="Confirmar y enviar deseo"
          />

          {/* Mensajitos contextuales */}
          {permission === "prompt" && !active && (
            <p className="text-white/70 text-sm">
              Concede acceso al micrófono para soplar y enviar automáticamente.
            </p>
          )}
          {showMicError && (
            <p className="text-red-300 text-sm text-center">
              No se pudo usar el micrófono. Usa “Confirmar y enviar”.
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}
