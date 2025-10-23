/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useRef } from "react";
import ButtonPrimary from "./components/button";

export default function SuccessStepTextOnly({
  onDownload,
  onFinish,
}: {
  onDownload: () => void;
  onFinish?: () => void;
}) {
  const headerRef = useRef<HTMLElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);

  return (
    <div
      className="
        relative h-screen w-screen
        grid grid-rows-[auto,1fr,auto]
        text-white
        pb-[env(safe-area-inset-bottom)]
      "
      style={{
        backgroundImage: "url(/CORTES/CIERRE/FONDO-CIERRE.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
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
        className="z-30 mx-auto flex w-full max-w-6xl flex-col items-center justify-center text-center px-4"
        style={{ position: "absolute", top: "20%" }}
      >
        <div className="space-y-8">
          <div className="text-6xl mb-4">✨</div>
          <h2 className="text-4xl md:text-5xl font-bold bg-black/50 px-4 py-2 rounded-md inline-block">
            ¡Deseo enviado!
          </h2>
          <p className="text-lg md:text-xl max-w-md mx-auto bg-black/50 p-2 rounded-md">
            Tu deseo se está juntando con muchos otros, espera...
          </p>
          <p className="text-lg md:text-xl max-w-md mx-auto bg-black/50 p-2 rounded-md">
            Por hacer parte de <strong>GÓNDOLA 2025</strong>
          </p>
          <img
            src="/CORTES/CIERRE/GRACIAS.png"
            alt="Gracias"
            className="h-32 mx-auto"
          />
        </div>
      </main>

      {/* FOOTER */}
      <footer
        ref={footerRef}
        className="z-40"
        style={{ position: "absolute", bottom: "5%", width: "100%" }}
      >
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-center gap-3">
          <ButtonPrimary
            onClick={onDownload}
            label="DESCARGAR FOTO"
            imageSrc="/CORTES/BOTONES/BOTON-LARGO.png"
            width={300}
            height={60}
            ariaLabel="Descargar recuerdo"
          />
          {onFinish && (
            <ButtonPrimary
              onClick={onFinish}
              label="FINALIZAR"
              imageSrc="/CORTES/BOTONES/BOTON-PEQUENO.png"
              width={180}
              height={60}
              ariaLabel="Finalizar"
            />
          )}
        </div>
      </footer>
    </div>
  );
}