/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import ButtonPrimary from "./components/button";
import { defaultTextStyle } from "@/context/Context";


export default function PreviewStep({
  framedShot,
  boxSize = "min(88vw, 60svh)",
  onRetake,
  onConfirm,
  wish = { name: "", wish: "" }, // Cambié el tipo de wish a un objeto con name y wish
  wishStyle = { fontSize: "40px", fontWeight: "bold", color: "red" },
}: {
  framedShot: string; // mostramos la foto con marco
  boxSize?: string;
  onRetake: () => void;
  onConfirm?: () => void; // confirmará y pasará al loader
  wish?: { name: string; wish: string }; // mensaje de deseo
  wishStyle?: any
}) {
  const style = { ...defaultTextStyle};
  return (
    <div className="h-[100svh] w-[100vw] flex flex-col items-center justify-center gap-6">
      <div
        className="relative overflow-hidden "
        style={{ width: boxSize, height: boxSize }}
      >
        <img
          src={framedShot}
          alt="Preview"
          className="absolute inset-0 w-full h-full object-contain"
        />
        {/* Mostrar el deseo en la parte inferior del frame */}
      
      </div>

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
