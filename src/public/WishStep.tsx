/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useRef, useState } from "react";
import ButtonPrimary from "./components/button";

export default function WishStep({
  onBack,
  onConfirm,
}: {
  onBack?: () => void;
  onConfirm: (wishData: { name: string; wish: string }) => void;
}) {
  const [formData, setFormData] = useState({ name: "", wish: "" });
  const maxCharacters = 30;

  // Refs para replicar la estructura (header/footer) como en Capture/Preview
  const headerRef = useRef<HTMLElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) onConfirm(formData);
  };

  const disabled = !formData.wish.trim();

  return (
    <div
      className="
        relative h-screen w-screen
        grid grid-rows-[auto,1fr,auto]
        text-white
        pb-[env(safe-area-inset-bottom)]
        overflow-hidden
      "
      style={{
        backgroundImage: "url(/CORTES/INTERNA/INTERNA-DE-LOS-DESEOS.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#000",
      }}
    >
      {/* HEADER (misma posición que en los otros pasos) */}
      <header
        ref={headerRef}
        className="z-40 w-full"
        style={{ position: "absolute", top: "2%" }}
      >
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            <img
              src="/LOGO_GEN.png"
              alt="Logo Góndola"
              className="h-auto select-none"
              style={{ width: "clamp(150px, 18vw, 190px)" }}
              draggable={false}
            />
            <img
              src="/CORTES/INTERNA/LOGO-INTERNA.png"
              alt="Logo Interna"
              className="h-auto select-none"
              style={{ width: "clamp(150px, 16vw, 180px)" }}
              draggable={false}
            />
          </div>
        </div>
      </header>

      {/* MAIN (offset y contenedor igual a Capture/Preview) */}
      <main
        className="z-30 mx-auto flex w-full max-w-6xl items-start justify-center"
        style={{ position: "absolute", top: "25%", padding: "15px" }}
      >
        <div
          className="w-full max-w-xl px-4 py-4 md:py-6 bg-black/50 rounded-xl"
          style={{ border: "2px solid white" }}
        >
          <div className="text-center mb-4">
            <h1 className="text-2xl md:text-3xl font-bold mb-1 text-white">
              ✨ Escribe tu deseo ✨
            </h1>
            <p className="text-white/80 text-sm md:text-base">
              Tu deseo aparecerá en la foto que tomarás a continuación
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Escribe aquí tu nombre..."
                className="w-full p-3 rounded-lg text-center bg-white/10 text-white placeholder-white/60 outline-none focus:border-white/50"
                style={{ border: "2px solid white", marginBottom: "12px" }}
                autoFocus
              />
            </div>
            <div>
              <textarea
                id="wish"
                value={formData.wish}
                onChange={(e) =>
                  setFormData({ ...formData, wish: e.target.value })
                }
                placeholder="Escribe aquí tu deseo..."
                className="w-full h-32 p-4 rounded-lg resize-none text-center text-lg bg-white/10 text-white placeholder-white/60 outline-none focus:border-white/50"
                style={{ border: "2px solid white" }}
                maxLength={maxCharacters}
              />
              <div className="text-right text-sm text-white/70 mt-2">
                {formData.wish.length}/{maxCharacters} caracteres
              </div>
            </div>
          </form>
        </div>
      </main>

      {/* FOOTER (mismo patrón que en los otros pasos) */}
      <footer
        ref={footerRef}
        className="z-40"
        style={{ position: "absolute", bottom: "5%", width: "100%" }}
      >
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-center gap-3">
          {onBack && (
            <ButtonPrimary
              onClick={onBack}
              label="VOLVER"
              imageSrc="/CORTES/BOTONES/BOTON-PEQUENO.png"
              width={140}
              height={60}
              ariaLabel="Volver"
            />
          )}
          <ButtonPrimary
            onClick={() => onConfirm(formData)}
            label="CONTINUAR"
            imageSrc="/CORTES/BOTONES/BOTON-PEQUENO.png"
            width={180}
            height={60}
            disabled={disabled}
            ariaLabel="Continuar a tomar foto"
          />
        </div>
      </footer>
    </div>
  );
}
