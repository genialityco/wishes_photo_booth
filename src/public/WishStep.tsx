"use client";

import React, { useState } from "react";
import ButtonPrimary from "./components/button";

export default function WishStep({
  onBack,
  onConfirm,
}: {
  onBack?: () => void;
  onConfirm: (wishData: { name: string; wish: string }) => void; // Cambié el tipo de onConfirm para aceptar un objeto
}) {
  const [formData, setFormData] = useState({ name: "", wish: "" }); // Combina nombre y deseo en un solo estado
  const maxCharacters = 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      onConfirm(formData);
    }
  };

  return (
    <div className="h-[100vh] w-[100vw] flex flex-col items-center justify-between gap-4 px-4"
      style={{ 
        backgroundImage: "url(/CORTES/INTERNA/INTERNA-DE-LOS-DESEOS.jpg)", 
        backgroundSize: "cover", 
        backgroundPosition: "center", 
        backgroundColor: "#000", // Fondo oscuro
        color: "#fff" // Texto blanco para contraste
      }}
    >
      <div className=" w-52">
        <img
          src="/CORTES/INTERNA/LOGO-INTERNA.png"
          alt="Logo Interna"
          className="w-full h-auto"
        />
      </div>
      <div className="text-center mb-4 bg-black/50 p-2 rounded-md">
        <h1 className=" text-3xl font-bold mb-2 text-white">✨ Escribe tu deseo ✨</h1>
        <p className="text-gray-300">
          Tu deseo aparecerá en la foto que tomarás a continuación
        </p>
      </div>
      <div className="w-full max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
          
            <input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Escribe aquí tu nombre..."
              className="w-full p-3 border-2 border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none text-center bg-gray-800/50 text-white"
              autoFocus
            />
          </div>
          <div>
            <textarea
              id="wish"
              value={formData.wish}
              onChange={(e) => setFormData({ ...formData, wish: e.target.value })}
              placeholder="Escribe aquí tu deseo..."
              className="w-full h-32 p-4 border-2 border-gray-600 rounded-lg resize-none focus:border-blue-500 focus:outline-none text-center text-lg bg-gray-800/50 text-white"
              maxLength={maxCharacters}
            />
            <div className="text-right text-sm text-gray-400 mt-2">
              {formData.wish.length}/{maxCharacters} caracteres
            </div>
          </div>
          <div className="flex gap-4 justify-center mb-6">
            {onBack && (
              <ButtonPrimary
                onClick={onBack}
                label="VOLVER"
                imageSrc="/CORTES/BOTONES/BOTON-PEQUENO.png"
                width={120}
                height={60}
                ariaLabel="Volver atrás"
              />
            )}
            <ButtonPrimary
              onClick={() => onConfirm(formData)}
              label="CONTINUAR"
              imageSrc="/CORTES/BOTONES/BOTON-PEQUENO.png"
              width={180}
              height={60}
              disabled={!formData.wish.trim()}
              ariaLabel="Continuar a tomar foto"
            />
          </div>
        </form>
      </div>
    </div>
  );
}