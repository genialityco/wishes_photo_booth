/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import Page from "@/public/page";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showSplash, setShowSplash] = useState(true); // estado de splash

  useEffect(() => {
    // Mostrar splash 4 segundos
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (showSplash) return; // no inicializamos cámara mientras está el splash

    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 320 }, height: { ideal: 240 } },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error al acceder a la cámara:", err);
      }
    };

    initCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, [showSplash]);

  return (
    <div className="antialiased min-h-screen relative">
      {showSplash ? (
        <div
          className="fixed inset-0 z-50 bg-cover bg-center"
          style={{ backgroundImage: "url('/CORTES/HOME/HOMA-DE-LOS-DESEOS.jpg')" }}
        />
      ) : (
        <>
          <div
            className="fixed inset-0 -z-10 bg-cover bg-center"
            style={{ backgroundImage: "url('/images/frame.jpg')" }}
          />
          <Page />
          <video ref={videoRef} autoPlay playsInline className="hidden" />
        </>
      )}
    </div>
  );
}
