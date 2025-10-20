"use client";

import React, { useEffect, useRef, useState } from "react";
import FrameCamera from "./CaptureImage";
import ButtonPrimary from "./components/button";
import {captureWithFrame} from "./CaptureWithFrame";

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
  wish?: { name: string, wish: string};
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
  handleResize(); // evaluar inmediatamente
  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []);

  const calculateSizes = (frameAspectRatio: number, viewportWidth: number, viewportHeight: number) => {
    let frameDisplayWidth;
    let frameDisplayHeight;
    
    if (viewportWidth >= 1200) {
      frameDisplayWidth = Math.min(600, viewportWidth * 0.4);
    } else if (viewportWidth >= 768) {
      frameDisplayWidth = viewportWidth * 0.5;
    } else {
      frameDisplayWidth = Math.max(280, viewportWidth * 0.8);
    }
    
    frameDisplayHeight = frameDisplayWidth / frameAspectRatio;
    
    if (frameDisplayHeight > viewportHeight * 0.7) {
      frameDisplayHeight = viewportHeight * 0.7;
      frameDisplayWidth = frameDisplayHeight * frameAspectRatio;
    }
    
    const captureDisplayWidth = frameDisplayWidth * 0.75;
    const captureDisplayHeight = frameDisplayHeight * 0.75;
    
    const captureWidthVw = (captureDisplayWidth / viewportWidth) * 100;
    const captureHeightVh = (captureDisplayHeight / viewportHeight) * 100;
    
    const frameWidthVw = (frameDisplayWidth / viewportWidth) * 100;
    const frameHeightVh = (frameDisplayHeight / viewportHeight) * 100;
    
    return {
      frameSize: `min(${frameWidthVw.toFixed(1)}vw, ${frameHeightVh.toFixed(1)}vh)`,
      captureSize: `min(${captureWidthVw.toFixed(1)}vw, ${captureHeightVh.toFixed(1)}vh)`
    };
  };

  const onReady = ({
    getVideoEl,
  }: {
    getVideoEl: () => HTMLVideoElement | null;
  }) => {
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
      return () => {
        cancelled = true;
      };
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
        
        const frameAspectRatio = w / h;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        const sizes = calculateSizes(frameAspectRatio, viewportWidth, viewportHeight);
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
          
          const frameAspectRatio = w / h;
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          const sizes = calculateSizes(frameAspectRatio, viewportWidth, viewportHeight);
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
      const frameAspectRatio = frameSize.w / frameSize.h;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      const sizes = calculateSizes(frameAspectRatio, viewportWidth, viewportHeight);
      setFrameDisplaySize(sizes.frameSize);
      setCaptureSize(sizes.captureSize);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [frameSize, frameReady]);

  const canShoot = videoReady && frameReady && !!frameSize;

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
    if (!video) return;

    const frameImg = frameImgRef.current;
    if (!frameSize) return;
    
    const targetW = frameSize.w;
    const targetH = frameSize.h;
    
    // 👇 Capturar snapshot del video para poder regenerar después
    const videoCanvas = document.createElement('canvas');
    videoCanvas.width = video.videoWidth || 1280;
    videoCanvas.height = video.videoHeight || 720;
    const videoCtx = videoCanvas.getContext('2d')!;
    const videoAspect = video.videoWidth / video.videoHeight;
const targetAspect = targetW / targetH;

let sx = 0, sy = 0, sWidth = video.videoWidth, sHeight = video.videoHeight;

// Recorte centrado según diferencia de aspect ratio
if (videoAspect > targetAspect) {
  // El video es más ancho → recorta a los lados
  const newWidth = video.videoHeight * targetAspect;
  sx = (video.videoWidth - newWidth) / 2;
  sWidth = newWidth;
} else {
  // El video es más alto → recorta arriba y abajo
  const newHeight = video.videoWidth / targetAspect;
  sy = (video.videoHeight - newHeight) / 2;
  sHeight = newHeight;
}
if (window.innerWidth < 768) {
  sy += sHeight * 0.5; // mueve la captura 2% hacia abajo
}
// Dibujar el área recortada centrada en el canvas
videoCtx.drawImage(
  video,
  sx,
  sy,
  sWidth,
  sHeight,
  0,
  0,
  videoCanvas.width,
  videoCanvas.height
);
    // 👇 Guardar los datos para regenerar después con el deseo

    
    // 👇 Generar la imagen inicial (sin deseo por ahora)
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
 <div className=" h-[100vh] w-[100vw] flex flex-col items-center justify-center gap-6 relative overflow-hidden">
    <div
      className="mt-32  relative flex flex-col items-center mb-60 justify-center w-full"
      style={{
        transform: isMobile ? "translateY(-6svh)" : "none",
      }}
    >
      {frameSrc && (
        <img
          src={frameSrc}
          alt="Marco"
          className=" absolute h-auto object-contain pointer-events-none select-none z-50"
          draggable={false}
          style={{
            width: isMobile ? "90vw" : frameDisplaySize,
            height: "auto",
            maxHeight: isMobile ? "auto" : "auto",
          }}
        />
      )}

      <div
        className="relative z-10 flex justify-center"
        style={{
          width: isMobile ? "90vw" : captureSize,
          height: isMobile ? "55vh" : captureSize,
          marginTop: isMobile ? "16svh" : "5svh",
          marginBottom: isMobile ? "0" : "4svh",
          aspectRatio: "1/1",
           clipPath: isMobile ? "inset(10% 0 0 0)" : "none",
        }}
      >
        <FrameCamera
          frameSrc={frameSrc ?? undefined}
          mirror={mirror}
          boxSize="100%"
          onReady={onReady}
        />
      </div>
<ButtonPrimary
  className="mt-42"
  onClick={startCapture}
  label={canShoot ? "TOMAR FOTO" : "Cargando cámara…"}
  imageSrc="/CORTES/BOTONES/BOTON-LARGO.png"
  width={300}
  height={68}
  disabled={!canShoot}
  ariaLabel="Tomar foto"
/>
    </div>

    {countdown !== null && (
      <div className=" mt-36 absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-7xl font-bold drop-shadow-lg">{countdown}</div>
      </div>
    )}

    {flash && (
      <div className="absolute inset-0 bg-white/80 animate-pulse pointer-events-none" />
    )}

  </div>
);
}