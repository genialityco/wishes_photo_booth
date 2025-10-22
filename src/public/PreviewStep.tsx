/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect } from "react";
import ButtonPrimary from "./components/button";
import { defaultTextStyle } from "@/context/Context";

export default function PreviewStep({
  framedShot,
  boxSize = "min(88vw, 60svh)",
  onRetake,
  onConfirm,
  wish = { name: "", wish: "" },
}: {
  framedShot: string;
  boxSize?: string;
  onRetake: () => void;
  onConfirm?: () => void;
  wish?: { name: string; wish: string };
  wishStyle?: unknown;
}) {
  const style = { ...defaultTextStyle };

  // 🔹 Mover scroll al inicio cada vez que se entra a esta pantalla
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" }); // sin animación
  }, []);

  return (
    <div className="h-[100svh] w-[100vw] flex flex-col items-center justify-center gap-6 overflow-hidden relative">
      {/* LOGO */}
      <div className="absolute top-4 z-50">
        <img
          src="/CORTES/INTERNA/LOGO-INTERNA.png"
          alt="Logo Góndola"
          className="w-40 h-auto object-contain drop-shadow-md"
        />
      </div>

      {/* FOTO CON MARCO */}
      <div
        className="relative overflow-hidden"
        style={{ width: boxSize, height: boxSize }}
      >
        <img
          src={framedShot}
          alt="Preview"
          className="absolute inset-0 w-full h-full object-contain"
        />
      </div>

      {/* BOTONES */}
      <div className="flex gap-3">
        <ButtonPrimary
          onClick={onRetake}
          label="REPETIR"
          imageSrc="/CORTES/BOTONES/BOTON-PEQUENO.png"
          width={180}
          height={60}
        />
        {onConfirm && (
          <ButtonPrimary
            onClick={onConfirm}
            label={wish ? "AGREGAR DESEO" : "CONTINUAR"}
            imageSrc="/CORTES/BOTONES/BOTON-PEQUENO.png"
            width={180}
            height={60}
          />
        )}
      </div>
    </div>
  );
}
