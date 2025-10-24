"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import ShoppingBasketScene from "./ShoppingBasketScene";



export default function AnimationComponent({
  photoUrls = [] as (string | undefined)[],
  message = "HOLA" as string,
  isImages = true,
}) {
  return (
    <div style={{ width: "100%", height: "100vh", position: "relative", overflow: "hidden" }}>
      {/* VIDEO DE FONDO */}
      <video
        src="/CORTES/VIDEOS/PANTALLA_FENALCO_MENSAJES.mp4"
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: -1,
        }}
      />

      {/* AUDIO DE FONDO */}
      <audio
        src="/audio/audio_animation.mp3"
        autoPlay
        loop
        playsInline
        style={{ display: "none" }} // ocultamos el control del navegador
      />

      {/* CANVAS DE THREE.JS */}
      <Canvas gl={{ antialias: true }} camera={{ fov: 75, position: [0, 0, 60] }}>
        <Suspense fallback={null}>

    <ShoppingBasketScene photoUrls={photoUrls} message={message} />

        </Suspense>
      </Canvas>
    </div>
  );
}