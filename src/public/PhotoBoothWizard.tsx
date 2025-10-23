/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import CaptureStep from "./CaptureStep";
import PreviewStep from "./PreviewStep";
import WishStep from "./WishStep";
// import ButtonPrimary from "./components/button";
import ParticleAnimation from "./components/ParticleAnimation";
import { addTextToImage } from "./CaptureWithFrame";
import { createWish } from "@/services/eventService";
import ReviewStep from "./ReviewStep";
import SuccessStepTextOnly from "./SuccessStep";

// ---------------------------------------------
// Types
// ---------------------------------------------

type Step = "capture" | "preview" | "wish" | "review" | "animation" | "success";
interface Props {
  frameSrc?: string | null;
  mirror?: boolean;
  boxSize?: string;
  eventId: string;
}

interface WishData {
  name: string;
  wish: string;
}

// ---------------------------------------------
// Component
// ---------------------------------------------

export default function PhotoBoothWizard({
  frameSrc = null,
  mirror = true,
  boxSize = "min(88vw, 60svh)",
  eventId,
}: Props) {
  const searchParams = useSearchParams();

  // UI flow
  const [step, setStep] = useState<Step>("capture");
  const [showAnimation, setShowAnimation] = useState(false);

  // Images
  const [, setRawShot] = useState<string | null>(null); // sin marco
  const [framedShot, setFramedShot] = useState<string | null>(null); // con marco
  const [framedShotWithText, setFramedShotWithText] = useState<string | null>(
    null
  ); // con texto

  // Wish
  const [wish, setWish] = useState<WishData>({ name: "", wish: "" });
  const [color, setColor] = useState<string | null>(null);

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitReady, setSubmitReady] = useState(false); // habilita el botón después de confirmar el deseo
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------
  // Derived values & effects
  // ---------------------------------------------

  // Frame aleatorio estable por montaje si no llega por props
  const resolvedFrameSrc = useMemo(() => {
    if (frameSrc) return frameSrc;
    const r = Math.floor(Math.random() * 3) + 1; // 1..3
    return `/CORTES/POLAROIDS/POLAROID_0${r}.png`;
  }, [frameSrc]);

  // Color desde querystring (?color=#fff)
  useEffect(() => {
    const c = searchParams?.get("color");
    setColor(c ?? null);
  }, [searchParams]);

  // Tipo de dispositivo (no cambia durante la sesión)
  const deviceType = useMemo<"mobile" | "tablet" | "desktop">(() => {
    if (typeof navigator === "undefined") return "desktop";
    const ua = navigator.userAgent;
    if (/iPad|Tablet/i.test(ua)) return "tablet";
    if (/Mobile|Android|iPhone/i.test(ua)) return "mobile";
    return "desktop";
  }, []);

  // ---------------------------------------------
  // Handlers
  // ---------------------------------------------

  const resetAll = useCallback(() => {
    setStep("capture");
    setShowAnimation(false);
    setRawShot(null);
    setFramedShot(null);
    setFramedShotWithText(null);
    setWish({ name: "", wish: "" });
    setSubmitReady(false);
    setIsSubmitting(false);
    setError(null);
  }, []);

  const handleCaptured = useCallback(
    (payload: { framed: string; raw: string }) => {
      setFramedShot(payload.framed);
      setRawShot(payload.raw);
      setSubmitReady(false);
      setStep("preview");
    },
    []
  );

  const handleWishConfirm = useCallback(
    async (wishData: WishData) => {
      setWish(wishData);

      if (framedShot && wishData.wish) {
        try {
          const withText = await addTextToImage(framedShot, wishData);
          setFramedShotWithText(withText);
        } catch (e) {
          console.error("addTextToImage failed", e);
          setFramedShotWithText(framedShot); // fallback sin texto
        }
      }

      setSubmitReady(true);
      setStep("review");
    },
    [framedShot]
  );

  const handleAnimationComplete = useCallback(() => {
    setShowAnimation(false);
    setSubmitReady(false);
    setStep("success");
  }, []);

  // ---------------------------------------------
  // Submit flow
  // ---------------------------------------------

  const submitAndProcess = useCallback(async () => {
    if (isSubmitting) return; // evitar dobles envíos

    setIsSubmitting(true);
    setError(null);

    try {
      if (!eventId) throw new Error("Event ID no encontrado");
      if (!framedShotWithText) throw new Error("No hay foto capturada");
      if (!wish.name || !wish.wish)
        throw new Error("Nombre y deseo son requeridos");

      // Mostrar animación durante el proceso
      setShowAnimation(true);
      setStep("animation");

      // 1) Subir imagen a Storage
      const photoUrl = await uploadWishPhoto(
        framedShotWithText,
        eventId,
        wish.name
      );

      // 2) Crear documento en Firestore
      const payload = {
        userName: wish.name,
        message: wish.wish,
        photoUrl,
        approved: true,
        deviceType,
        location: { lat: 4.60971, lng: -74.08175 }, // placeholder sin geolocalización
        colorTheme: color || "#FFD700",
        public: true,
      };

      await createWish(eventId, payload);

      // pequeña pausa opcional para dejar terminar la animación
      await new Promise((r) => setTimeout(r, 800));
    } catch (e: any) {
      console.error("Error al enviar el deseo:", e);
      setError(e?.message || "Error al enviar el deseo");
      setShowAnimation(false);
      setStep("preview");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    color,
    deviceType,
    eventId,
    framedShotWithText,
    isSubmitting,
    wish.name,
    wish.wish,
  ]);

  // ---------------------------------------------
  // Helpers
  // ---------------------------------------------

  async function uploadWishPhoto(
    imageDataUrl: string,
    eventId: string,
    userName: string
  ): Promise<string> {
    const { getStorage, ref, uploadBytes, getDownloadURL } = await import(
      "firebase/storage"
    );

    const storage = getStorage();
    const blob = dataURLtoBlob(imageDataUrl);

    const timestamp = Date.now();
    const sanitizedUserName = userName
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();
    const fileName = `${timestamp}_${sanitizedUserName}.png`;

    const storageRef = ref(storage, `wishes_${eventId}/${fileName}`);

    await uploadBytes(storageRef, blob, {
      contentType: "image/png",
      customMetadata: {
        userName,
        eventId,
        uploadedAt: new Date().toISOString(),
      },
    });

    return getDownloadURL(storageRef);
  }

  function dataURLtoBlob(dataurl: string): Blob {
    const [meta, base64] = dataurl.split(",");
    const mimeMatch = meta.match(/:(.*?);/);
    if (!mimeMatch) throw new Error("Formato de Data URL inválido");
    const mime = mimeMatch[1];

    const binary = atob(base64);
    const len = binary.length;
    const u8 = new Uint8Array(len);
    for (let i = 0; i < len; i++) u8[i] = binary.charCodeAt(i);
    return new Blob([u8], { type: mime });
  }

  const handleDownload = (img: string) => {
    const a = document.createElement("a");
    a.href = img;
    a.download = `deseo_gondola_${Date.now()}.png`;
    a.click();
  };

  // ---------------------------------------------
  // Render
  // ---------------------------------------------

  const bgImage =
    step === "success"
      ? "url(/CORTES/CIERRE/FONDO-CIERRE.png)"
      : "url(/CORTES/HOME/FONDO_HOME.jpg)";

  return (
    <div
      className="fixed inset-0 overflow-hidden flex items-center justify-center flex-col"
      style={{
        height: "var(--app-vh)", // viewport estable
        width: "100vw",
        backgroundImage: bgImage,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {showAnimation && framedShotWithText && (
        <ParticleAnimation
          imageSrc={framedShotWithText}
          onComplete={handleAnimationComplete}
        />
      )}

      {step === "capture" && (
        <CaptureStep
          frameSrc={resolvedFrameSrc}
          mirror={mirror}
          onCaptured={handleCaptured}
          wish={wish}
        />
      )}

      {step === "preview" && framedShot && (
        <PreviewStep
          framedShot={framedShotWithText || framedShot}
          boxSize={boxSize}
          onRetake={resetAll}
          onConfirm={() => setStep("wish")}
          wish={wish}
        />
      )}

      {step === "wish" && (
        <WishStep
          onBack={() => setStep("preview")}
          onConfirm={handleWishConfirm}
        />
      )}

      {step === "review" && (
        <ReviewStep
          framedShot={framedShotWithText || framedShot!}
          onConfirmSend={submitAndProcess}
        />
      )}

      {/* {submitReady && !isSubmitting && step !== "wish" && (
        <ButtonPrimary
          onClick={submitAndProcess}
          label="CONFIRMAR Y ENVIAR"
          imageSrc="/CORTES/BOTONES/BOTON-LARGO.png"
          width={300}
          height={60}
          ariaLabel="Confirmar y enviar deseo"
          className="absolute bottom-20"
        />
      )} */}

      {isSubmitting && !showAnimation && (
        <div className="mt-4 flex items-center gap-2 text-gray-600">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
          <span>Enviando tu deseo...</span>
        </div>
      )}

      {step === "success" && (
        <SuccessStepTextOnly
          onDownload={() => handleDownload(framedShotWithText!)}
          onFinish={resetAll}
        />
      )}

      {error && step !== "success" && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-md shadow">
          {error}
        </div>
      )}
    </div>
  );
}
