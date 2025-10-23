"use client";

import React, { useEffect, useRef, useState } from "react";

// Tipos para navegadores con APIs legacy
type LegacyGetUserMedia = (
  constraints: MediaStreamConstraints,
  success: (stream: MediaStream) => void,
  error: (err: unknown) => void
) => void;

type NavigatorWithLegacy = Navigator & {
  webkitGetUserMedia?: LegacyGetUserMedia;
  mozGetUserMedia?: LegacyGetUserMedia;
  getUserMedia?: LegacyGetUserMedia;
  mediaDevices?: MediaDevices & {
    getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  };
};

export default function FrameCamera({
  frameSrc = null,
  mirror = true,
  boxSize = "min(88vw, 60svh)",
  onReady,
  videoStyle, // <-- NUEVO
}: {
  frameSrc?: string | null;
  mirror?: boolean;
  boxSize?: string;
  onReady?: (api: { getVideoEl: () => HTMLVideoElement | null }) => void;
  videoStyle?: React.CSSProperties; // <-- NUEVO
}) {
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function ensureGetUserMedia(): boolean {
    if (typeof navigator === "undefined") return false;
    const n = navigator as NavigatorWithLegacy;

    const legacy = n.getUserMedia || n.webkitGetUserMedia || n.mozGetUserMedia;

    if (!n.mediaDevices) {
      (n as unknown as { mediaDevices: MediaDevices }).mediaDevices = {} as MediaDevices;
    }

    const md = n.mediaDevices as MediaDevices & {
      getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
    };

    if (!md.getUserMedia && legacy) {
      md.getUserMedia = (constraints: MediaStreamConstraints) =>
        new Promise<MediaStream>((resolve, reject) => {
          legacy.call(n, constraints, resolve, reject);
        });
    }

    return typeof md.getUserMedia === "function";
  }

  useEffect(() => {
    let mounted = true;

    const start = async () => {
      if (typeof window === "undefined") return;

      const isLocalhost =
        typeof location !== "undefined" &&
        /^localhost$|^127\.0\.0\.1$/.test(location.hostname);
      if (window.isSecureContext === false && !isLocalhost) {
        setError("La cámara requiere HTTPS (o localhost).");
        return;
      }

      const hasGUM = ensureGetUserMedia();
      if (!hasGUM) {
        setError("getUserMedia no está disponible.");
        return;
      }

      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        const stream = await (navigator.mediaDevices as MediaDevices).getUserMedia({
          audio: false,
          video: {
            facingMode: "user",
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
          },
        });

        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setError(null);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg || "No se pudo acceder a la cámara.");
      }
    };

    void start();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    onReady?.({ getVideoEl: () => videoRef.current });
  }, [onReady]);

  return (
    <div className="w-full h-full relative overflow-hidden rounded-2xl shadow-2xl" style={{ width: boxSize, height: boxSize }}>
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          transform: mirror ? "scaleX(-1)" : "none",
          ...videoStyle, // <-- aplicamos clip-path y cualquier override
        }}
        playsInline
        autoPlay
        muted
      />
      {error && (
        <p className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1 rounded">
          {error}
        </p>
      )}
    </div>
  );
}
