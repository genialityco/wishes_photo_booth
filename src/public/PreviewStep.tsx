/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import ButtonPrimary from "./components/button";
// import { defaultTextStyle } from "@/context/Context";

export default function PreviewStep({
  framedShot,
  onRetake,
  onConfirm,
  // Mantén boxSize solo si quieres forzar un tamaño específico; aquí lo calculamos como en CaptureStep
  // boxSize,
  wish = { name: "", wish: "" },
}: {
  framedShot: string;
  boxSize?: string; // opcional, si no se provee se calcula con computeDisplay
  onRetake: () => void;
  onConfirm?: () => void;
  wish?: { name: string; wish: string };
  wishStyle?: unknown;
}) {
  // const style = { ...defaultTextStyle };

  // Refs y estados para replicar EXACTA estructura/medidas de CaptureStep
  const headerRef = useRef<HTMLElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);
  const frameImgRef = useRef<HTMLImageElement | null>(null);

  const [frameNat, setFrameNat] = useState<{ w: number; h: number } | null>(null);
  const [display, setDisplay] = useState<{ w: number; h: number } | null>(null);

  // Llevar el scroll al inicio al entrar
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  // === computeDisplay (idéntico a CaptureStep) ===
  const computeDisplay = useCallback((natW: number, natH: number) => {
    // ancho disponible: paddings laterales del container
    const vw = Math.min(window.innerWidth, 1280); // cap opcional
    const sidePadding = 32 * 2;
    const maxW = Math.max(280, Math.min(vw - sidePadding, 960));

    // alto disponible: 100dvh - header - footer - márgenes
    const hdr = headerRef.current?.offsetHeight ?? 0;
    const ftr = footerRef.current?.offsetHeight ?? 0;
    const verticalGaps = 24 + 24; // py aprox
    const maxH = Math.max(220, window.innerHeight - hdr - ftr - verticalGaps);

    // respetar AR
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

  // Recalcular display en resize/orientación (igual a CaptureStep)
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

  const hasWish = Boolean((wish?.name || "").trim() || (wish?.wish || "").trim());

  return (
    <div
      className="
        relative h-screen w-screen
        grid grid-rows-[auto,1fr,auto]
        bg-black/50 text-white
        pb-[env(safe-area-inset-bottom)]
      "
    >
      {/* HEADER (misma posición que CaptureStep) */}
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

      {/* MAIN (idéntico layout/offset que CaptureStep) */}
      <main
        className="z-30 mx-auto flex w-full max-w-6xl items-center justify-center"
        style={{ position: "absolute", top: "20%" }}
      >
        <div className="relative w-full flex items-center justify-center">
          {display && (
            <div
              className="relative"
              style={{width: "300px", height: "400px"}}
            >
              {/* La foto final en el mismo contenedor del frame */}
              <img
                src={framedShot}
                alt="Preview"
                className="absolute inset-0 w-full h-full object-contain select-none"
                draggable={false}
              />
            </div>
          )}
        </div>
      </main>

      {/* FOOTER (idéntico a CaptureStep) */}
      <footer
        ref={footerRef}
        className="z-40"
        style={{ position: "absolute", bottom: "3%", width: "100%" }}
      >
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-center gap-3">
          <ButtonPrimary
            onClick={onRetake}
            label="REPETIR FOTO"
            imageSrc="/CORTES/BOTONES/BOTON-PEQUENO.png"
            width={180}
            height={60}
            ariaLabel="Repetir foto"
          />
          {onConfirm && (
            <ButtonPrimary
              onClick={onConfirm}
              label={hasWish ? "CONTINUAR" : "SIGUIENTE"}
              imageSrc="/CORTES/BOTONES/BOTON-PEQUENO.png"
              width={180}
              height={60}
              ariaLabel={hasWish ? "Continuar" : "Agregar deseo"}
            />
          )}
        </div>
      </footer>
    </div>
  );
}
