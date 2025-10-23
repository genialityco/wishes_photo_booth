/* ==============================
 * ReviewStep.tsx
 * (preview sólo visual + botón Confirmar/Enviar en el footer del propio componente)
 * Estructura y tamaño idénticos a Capture/Preview
 * ============================== */

/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import ButtonPrimary from "./components/button";

export default function ReviewStep({
  framedShot,
  onConfirmSend,
}: {
  framedShot: string;             // imagen final (idealmente con texto ya aplicado)
  onConfirmSend: () => void;      // acción de Confirmar y Enviar
}) {
  // Refs y estados para replicar EXACTA estructura/medidas de Capture/Preview
  const headerRef = useRef<HTMLElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);
  const frameImgRef = useRef<HTMLImageElement | null>(null);

  const [frameNat, setFrameNat] = useState<{ w: number; h: number } | null>(null);
  const [display, setDisplay] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  // === computeDisplay (idéntico a CaptureStep/PreviewStep) ===
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

  // Cargar la foto resultante y obtener tamaño nativo
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
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        afterHaveNat(w, h);
      } catch {
        const img = new Image();
        img.src = framedShot;
        img.onload = () => {
          if (cancelled) return;
          frameImgRef.current = img;
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          afterHaveNat(w, h);
        };
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [framedShot, computeDisplay]);

  // Recalcular display en resize/orientación
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

  return (
    <div
      className="
        relative h-screen w-screen
        grid grid-rows-[auto,1fr,auto]
        bg-black/50 text-white
        pb-[env(safe-area-inset-bottom)]
      "
    >
      {/* HEADER (misma posición) */}
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

      {/* MAIN (idéntico layout/offset) */}
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
              {/* Imagen final (con o sin texto) */}
              <img
                src={framedShot}
                alt="Revisión final"
                className="absolute inset-0 w-full h-full object-contain select-none"
                draggable={false}
              />
            </div>
          )}
        </div>
      </main>

      {/* FOOTER: único botón Confirmar y Enviar */}
      <footer
        ref={footerRef}
        className="z-40"
        style={{ position: "absolute", bottom: "3%", width: "100%" }}
      >
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-center">
          <ButtonPrimary
            onClick={onConfirmSend}
            label="CONFIRMAR Y ENVIAR"
            imageSrc="/CORTES/BOTONES/BOTON-LARGO.png"
            width={300}
            height={60}
            ariaLabel="Confirmar y enviar deseo"
          />
        </div>
      </footer>
    </div>
  );
}