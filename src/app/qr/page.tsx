"use client";

import React from "react";
import QRCode from "react-qr-code";

export default function QrPage() {
  const qrValue = "https://wishes-photo.netlify.app/"; // 🔗 Cambia por la URL que quieras codificar

  return (
    <div className="relative w-screen h-screen overflow-hidden flex  justify-center">
      {/* 🎥 VIDEO DE FONDO */}
      <video
        src="/CORTES/VIDEOS/PANTALLA_FENALCO.mp4" // 📁 coloca tu video en /public/videos/fondo.mp4
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover"
      />

      {/* 🌓 CAPA OSCURA SUAVE (opcional para contraste) */}
      <div className="absolute inset-0 bg-black/40 " />

      {/* 🧾 CONTENIDO PRINCIPAL */}
      <div className="mt-32  h-fit relative z-10 flex flex-col items-center text-center p-4 rounded-xl bg-black/50">
        <h1 className="text-white text-3xl font-semibold mb-6 drop-shadow-lg">
          Escanea el código QR
        </h1>

        {/* 📱 CÓDIGO QR */}
        <div className="bg-white p-4 rounded-xl shadow-lg">
          <QRCode value={qrValue} size={450} />
        </div>

        <p className="text-white mt-6 text-lg drop-shadow-md">
          o visita: {qrValue}
        </p>
      </div>
    </div>
  );
}