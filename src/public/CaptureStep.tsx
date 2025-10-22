"use client";

import React, { useEffect, useRef, useState } from "react";
import FrameCamera from "./CaptureImage";
import ButtonPrimary from "./components/button";
import { captureWithFrame } from "./CaptureWithFrame";

export default function CaptureStep({
  frameSrc = null,
  mirror = true,
  boxSize = "min(88vw, 30svh)",
  onCaptured,
  wish = { name: "", wish: "" },
}: {
  frameSrc?: string | null;
  mirror?: boolean;
  boxSize?: string;
  onCaptured: (payload: { framed: string; raw: string }) => void;
  wish?: { name: string; wish: string };
}) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);

  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const frameImgRef = useRef<HTMLImageElement | null>(null);
  const [frameSize, setFrameSize] = useState<{ w: number; h: number } | null>(null);
  const [frameReady, setFrameReady] = useState(false);
  const [captureSize, setCaptureSize] = useState<string>("min(42vw, 35svh)");
  const [frameDisplaySize, setFrameDisplaySize] = useState<string>("clamp(280px, 50vw, 600px)");
  const [videoReady, setVideoReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const calculateSizes = (frameAspectRatio: number, vw: number, vh: number) => {
    let frameDisplayWidth;
    if (vw >= 1200) frameDisplayWidth = Math.min(600, vw * 0.4);
    else if (vw >= 768) frameDisplayWidth = vw * 0.5;
    else frameDisplayWidth = Math.max(280, vw * 0.8);

    let frameDisplayHeight = frameDisplayWidth / frameAspectRatio;
    if (frameDisplayHeight > vh * 0.7) {
      frameDisplayHeight = vh * 0.7;
      frameDisplayWidth = frameDisplayHeight * frameAspectRatio;
    }

    const captureDisplayWidth = frameDisplayWidth * 0.75;
    const captureDisplayHeight = frameDisplayHeight * 0.75;

    return {
      frameSize: `min(${(frameDisplayWidth / vw) * 100}vw, ${(frameDisplayHeight / vh) * 100}vh)`,
      captureSize: `min(${(captureDisplayWidth / vw) * 100}vw, ${(captureDisplayHeight / vh) * 100}vh)`,
    };
  };

  const onReady = ({ getVideoEl }: { getVideoEl: () => HTMLVideoElement | null }) => {
    const v = getVideoEl();
    videoElRef.current = v || null;
    if (v) {
      const mark = () => setVideoReady(true);
      if (v.readyState >= 2) mark();
      else v.onloadedmetadata = mark;
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (!frameSrc) {
      setFrameReady(true);
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
        setFrameSize({ w, h });

        const sizes = calculateSizes(w / h, window.innerWidth, window.innerHeight);
        setFrameDisplaySize(sizes.frameSize);
        setCaptureSize(sizes.captureSize);
        setFrameReady(true);
      } catch {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = frameSrc;
        img.onload = () => {
          if (cancelled) return;
          frameImgRef.current = img;
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          setFrameSize({ w, h });
          const sizes = calculateSizes(w / h, window.innerWidth, window.innerHeight);
          setFrameDisplaySize(sizes.frameSize);
          setCaptureSize(sizes.captureSize);
          setFrameReady(true);
        };
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [frameSrc]);

  useEffect(() => {
    if (!frameSize || !frameReady) return;
    const handleResize = () => {
      const sizes = calculateSizes(
        frameSize.w / frameSize.h,
        window.innerWidth,
        window.innerHeight
      );
      setFrameDisplaySize(sizes.frameSize);
      setCaptureSize(sizes.captureSize);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [frameSize, frameReady]);

  const canShoot = videoReady && frameReady && !!frameSize;

  // 🔹 Mantiene tu lógica original de captura
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
    if (!video || !frameSize) return;

    const frameImg = frameImgRef.current;
    const targetW = frameSize.w;
    const targetH = frameSize.h;

    const framed = captureWithFrame({
      video,
      frame: frameImg ?? null,
      targetW,
      targetH,
      mirror,
    });

    setFlash(true);
    setTimeout(() => setFlash(false), 120);
    onCaptured({ framed, raw: "" });
  };

  return (
    <div className="relative h-screen w-screen flex flex-col items-center justify-center overflow-hidden bg-black/5">
      {/* 🔹 LOGO GÓNDOLA */}
      <div className="absolute top-4  z-50">
        <img
          src="/CORTES/HOME/LOGO_GONDOLA.png"
          alt="Logo Góndola"
          className="w-40 h-auto object-contain drop-shadow-md"
        />
      </div>

      {/* 🔹 Contenedor principal centrado */}
      <div
        className="relative h-[100vh] flex flex-col items-center justify-center gap-6 w-full "
        style={{
          transform: isMobile ? "translateY(2svh)" : "none",
        }}
      >
        {frameSrc && (
          <img
            src={frameSrc}
            alt="Marco"
            className="absolute h-auto object-contain pointer-events-none select-none z-20"
            draggable={false}
            style={{
              width: isMobile ? "90vw" : frameDisplaySize,
            }}
          />
        )}

        {/* Cámara */}
        <div
          className="relative z-10 flex justify-center"
          style={{
            width: isMobile ? "80vw" : captureSize,
            height: isMobile ? "50vh" : captureSize,
            marginTop: isMobile ? "-15svh" : "5svh",
            aspectRatio: "16/9",
          }}
        >
          <FrameCamera
            frameSrc={frameSrc ?? undefined}
            mirror={mirror}
            boxSize="100%"
            onReady={onReady}
          />
        </div>

        {/* 🔹 Botón funcional restaurado */}
      </div>
        <ButtonPrimary
          className="absolute bottom-6"
          onClick={startCapture}
          label={canShoot ? "TOMAR FOTO" : "Cargando cámara…"}
          imageSrc="/CORTES/BOTONES/BOTON-LARGO.png"
          width={300}
          height={68}
          disabled={!canShoot}
          ariaLabel="Tomar foto"
        />

      {/* Cuenta regresiva */}
      {countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="text-7xl font-bold drop-shadow-lg text-white">
            {countdown}
          </div>
        </div>
      )}

      {/* Flash */}
      {flash && (
        <div className="absolute inset-0 bg-white/80 animate-pulse pointer-events-none z-50" />
      )}
    </div>
  );
}
