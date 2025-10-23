/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import FrameCamera from "./CaptureImage";
import ButtonPrimary from "./components/button";
import { captureWithFrame } from "./CaptureWithFrame";
import { AnimatePresence, motion } from "framer-motion";

export default function CaptureStep({
  frameSrc = null,
  mirror = true,
  onCaptured,
  // wish = { name: "", wish: "" },
}: {
  frameSrc?: string | null;
  mirror?: boolean;
  onCaptured: (payload: { framed: string; raw: string }) => void;
  wish?: { name: string; wish: string };
}) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);

  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const frameImgRef = useRef<HTMLImageElement | null>(null);
  const frameBoxRef = useRef<HTMLDivElement | null>(null);

  // Tamaños calculados
  const [frameNat, setFrameNat] = useState<{ w: number; h: number } | null>(
    null
  );
  const [display, setDisplay] = useState<{ w: number; h: number } | null>(null);

  const [frameReady, setFrameReady] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  // NEW: refs para medir header y footer
  const headerRef = useRef<HTMLElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);

  const onReady = useCallback(
    ({ getVideoEl }: { getVideoEl: () => HTMLVideoElement | null }) => {
      const v = getVideoEl();
      videoElRef.current = v || null;
      if (!v) return;
      const mark = () => setVideoReady(true);
      if (v.readyState >= 2) mark();
      else v.onloadedmetadata = mark;
    },
    []
  );

  // helper para calcular display size usando el ALTO DISPONIBLE real
  const computeDisplay = useCallback((natW: number, natH: number) => {
    // ancho disponible: paddings laterales del container
    const vw = Math.min(window.innerWidth, 1280); // cap opcional para desktop ancho
    const sidePadding = 32 * 2; // px (px-4 en main -> 16*2, pero dejamos margen extra)
    const maxW = Math.max(280, Math.min(vw - sidePadding, 960)); // 280–960px

    // alto disponible: 100dvh - header - footer - márgenes
    const hdr = headerRef.current?.offsetHeight ?? 0;
    const ftr = footerRef.current?.offsetHeight ?? 0;
    // gap vertical extra entre secciones
    const verticalGaps = 24 + 24; // py en header/footer aprox
    const maxH = Math.max(220, window.innerHeight - hdr - ftr - verticalGaps);

    // respetar AR del PNG
    let dispW = Math.min(maxW, Math.round(maxH * (natW / natH)));
    let dispH = Math.round(dispW * (natH / natW));

    // si por alto cabe más ancho, reintenta ajustando por ancho
    if (dispH > maxH) {
      dispH = Math.round(maxH);
      dispW = Math.round(dispH * (natW / natH));
    }

    setDisplay({ w: dispW, h: dispH });
  }, []);

  // Cargar marco y fijar tamaño nativo
  useEffect(() => {
    let cancelled = false;

    const afterHaveNat = (w: number, h: number) => {
      setFrameNat({ w, h });
      computeDisplay(w, h);
      setFrameReady(true);
    };

    if (!frameSrc) {
      // Fallback 16:9
      afterHaveNat(1600, 900);
      return;
    }

    (async () => {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.decoding = "async";
        img.src = frameSrc;
        await img.decode();
        if (cancelled) return;
        frameImgRef.current = img;
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        afterHaveNat(w, h);
      } catch {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = frameSrc!;
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
  }, [frameSrc, computeDisplay]);

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

  const canShoot = videoReady && frameReady && !!frameNat && !!display;

  // Captura con contador animado
  const startCapture = () => {
    if (!canShoot) return;
    setCountdown(3);

    const tick = () =>
      setCountdown((c) => {
        if (c === null) return c;
        if (c <= 1) {
          setCountdown(null);
          void doCapture();
          return null;
        }
        return c - 1;
      });

    setTimeout(tick, 1000);
    setTimeout(tick, 2000);
    setTimeout(tick, 3000);
  };

  const doCapture = async () => {
    const video = videoElRef.current;
    if (!video || !frameNat) return;
    const frameImg = frameImgRef.current;
    const { w: targetW, h: targetH } = frameNat;

    const framed = captureWithFrame({
      video,
      frame: frameImg ?? null,
      targetW,
      targetH,
      mirror,
    });

    // FLash localizado solo sobre el contenedor del frame
    setFlash(true);
    setTimeout(() => setFlash(false), 150);

    onCaptured({ framed, raw: "" });
  };

  // Clip del video
  const CLIP = { top: 7, right: 5, bottom: 26, left: 5 };
  const videoClipPath = `inset(${CLIP.top}% ${CLIP.right}% ${CLIP.bottom}% ${CLIP.left}%)`;

  // Variants de animación para el contador
  const digitVariants = {
    initial: { scale: 0.6, opacity: 0, y: 8 },
    animate: { scale: 1, opacity: 1, y: 0, transition: { type: "spring", stiffness: 280, damping: 18 } },
    exit: { scale: 0.2, opacity: 0, y: -8, transition: { duration: 0.18 } },
  } as const;

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

      {/* MAIN: usa todo el alto disponible entre header y footer */}
      <main
        className="z-30 mx-auto flex w-full max-w-6xl items-center justify-center"
        style={{ position: "absolute", top: "20%" }}
      >
        <div className="relative w-full flex items-center justify-center my-4 md:my-6">
          {display && (
            <div
              ref={frameBoxRef}
              className="relative"
              style={{ width: `${display.w}px`, height: `${display.h}px` }}
            >
              {/* Cámara */}
              <div className="relative z-10 h-full w-full">
                <FrameCamera
                  frameSrc={undefined}
                  mirror={mirror}
                  boxSize="100%"
                  onReady={onReady}
                  videoStyle={{
                    WebkitClipPath: videoClipPath,
                    clipPath: videoClipPath,
                  }}
                />

                {/* FLASH local (solo sobre el frame/video) */}
                <AnimatePresence>
                  {flash && (
                    <motion.div
                      key="flash"
                      className="pointer-events-none absolute inset-0"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.85 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.12 }}
                      style={{ background: "white", zIndex: 1000 }}
                    />
                  )}
                </AnimatePresence>

                {/* Contador centrado en el frame */}
                <AnimatePresence mode="popLayout">
                  {countdown !== null && (
                    <motion.div
                      key={`count-${countdown}`}
                      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      variants={{}}
                    >
                      <motion.div
                        variants={digitVariants}
                        className="font-bold drop-shadow-lg"
                        style={{
                          fontSize: "clamp(52px, 10vw, 120px)",
                          lineHeight: 1,
                          textShadow: "0 4px 16px rgba(0,0,0,0.6)",
                        }}
                      >
                        {countdown}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Marco PNG por encima de cámara y flash */}
              {frameSrc && (
                <img
                  src={frameSrc}
                  alt="Marco"
                  className="absolute inset-0 z-40 pointer-events-none select-none"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                  draggable={false}
                />
              )}
            </div>
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer
        ref={footerRef}
        className="z-40"
        style={{ position: "absolute", bottom: "5%", width: "100%" }}
      >
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-center">
          <ButtonPrimary
            onClick={startCapture}
            label={canShoot ? "TOMAR FOTO" : "Cargando cámara…"}
            imageSrc="/CORTES/BOTONES/BOTON-LARGO.png"
            width={300}
            height={68}
            disabled={!canShoot}
            ariaLabel="Tomar foto"
          />
        </div>
      </footer>
    </div>
  );
}
