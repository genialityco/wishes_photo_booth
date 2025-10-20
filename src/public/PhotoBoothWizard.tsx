/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import CaptureStep from "./CaptureStep";
import PreviewStep from "./PreviewStep";
import WishStep from "./WishStep";
import ButtonPrimary from "./components/button";
import { addTextToImage } from "./CaptureWithFrame";
import ParticleAnimation from "./components/ParticleAnimation";
import { createWish } from "@/services/eventService";

export default function PhotoBoothWizard({
  frameSrc = null,
  mirror = true,
  boxSize = "min(50vw, 40svh)",
  eventId,
}: {
  frameSrc?: string | null;
  mirror?: boolean;
  boxSize?: string;
  eventId: string; // Recibe el eventId como prop
}) {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<
    "capture" | "preview" | "wish" | "loading" | "result" | "animation" | "success"
  >("capture");
  const [framedShot, setFramedShot] = useState<string | null>(null); // dataURL (con marco) para mostrar
  const [rawShot, setRawShot] = useState<string | null>(null); // dataURL (sin marco) para la Function
  const [wish, setWish] = useState<{ name: string; wish: string }>({ name: "", wish: "" });
  const [aiUrl, setAiUrl] = useState<string | null>(null);
  const [framedUrl, setFramedUrl] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);

  const [color, setColor] = useState<string | null>(null);
  const [submit, setSubmit] = useState<boolean>(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsubRef = useRef<(() => void) | undefined>(undefined);
  const [framedShotWithText, setFramedShotWithText] = useState<string | null>(null); // Nuevo estado para la imagen con texto

  useEffect(() => {
    if (!searchParams) {
    
      setColor(null);
    } else {
     
      setColor(searchParams.get("color") as string || null);
    }
    return () => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = undefined;
      }
    };
  }, [searchParams]);

   const handleCaptured = (payload: { framed: string; raw: string }) => {
    setFramedShot(payload.framed);
    setRawShot(payload.raw);
    setStep("preview");
    setSubmit(false);
  };

  const handleWishConfirm = async (wishData: { name: string; wish: string }) => {
    setWish(wishData);
    if (framedShot && wishData.wish) {
      const result = await addTextToImage(framedShot, wishData);
      setSubmit(false);
      setFramedShotWithText(result); // Guardar la imagen con texto en un estado separado
    }
    setSubmit(true);
    setStep("preview");
  };

  const resetAll = () => {
    setFramedShot(null);
    setRawShot(null);
    setWish({ name: "", wish: "" });
    setAiUrl(null);
    setFramedUrl(null);
    setTaskId(null);
    setStep("capture");
    setSubmit(false);
    setError(null);
  };

  const submitAndProcess = async () => {
    if (isSubmitting) return; // Prevenir múltiples envíos
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Validar que tengamos todos los datos necesarios
      if (!eventId) {
        throw new Error("Event ID no encontrado");
      }
      
      if (!framedShotWithText) {
        throw new Error("No hay foto capturada");
      }
      
      if (!wish.name || !wish.wish) {
        throw new Error("Nombre y deseo son requeridos");
      }

      // Mostrar animación mientras se procesa
      setShowAnimation(true);
      setStep("animation");

      // 1. PRIMERO: Subir la imagen a Firebase Storage
      console.log("Subiendo imagen a Storage...");
      const photoUrl = await uploadWishPhoto(framedShotWithText, eventId, wish.name);
      console.log("Imagen subida exitosamente:", photoUrl);

      // Obtener información del dispositivo
      const deviceType = /Mobile|Android|iPhone/i.test(navigator.userAgent) 
        ? "mobile" 
        : /iPad|Tablet/i.test(navigator.userAgent) 
        ? "tablet" 
        : "desktop";

      // *** PARTE DE UBICACIÓN DESHABILITADA ***
      /*
      // Obtener ubicación si está disponible
      let location: { lat: number; lng: number } | undefined;
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              maximumAge: 0
            });
          });
          location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
        } catch (geoError) {
          console.warn("No se pudo obtener la ubicación:", geoError);
          // Continuar sin ubicación
        }
      }
      */
      // location queda como undefined

      // 2. DESPUÉS: Crear el deseo en Firestore con la URL ya subida
      const wishData = {
        userName: wish.name,
        message: wish.wish,
        photoUrl: photoUrl, // URL ya subida a Storage
        approved: true,
        deviceType: deviceType,
        location: {lat: 4.60971, lng: -74.08175}, // Sin ubicación
        colorTheme: color || "#FFD700",
        public: true,
      };

      console.log("Guardando deseo en Firestore:", wishData);

      // Guardar en Firestore (ahora photoUrl ya es una URL de Storage)
      const wishId = await createWish(eventId, wishData);

      console.log("Deseo creado con ID:", wishId);

      // Esperar un poco antes de completar la animación
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error("Error al enviar el deseo:", error);
      setError(error instanceof Error ? error.message : "Error al enviar el deseo");
      setShowAnimation(false);
      setStep("preview");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para subir foto a Storage
  const uploadWishPhoto = async (
    imageDataUrl: string, 
    eventId: string, 
    userName: string
  ): Promise<string> => {
    const { getStorage, ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
    
    const storage = getStorage();
    
    // Convertir Data URL a Blob
    const blob = dataURLtoBlob(imageDataUrl);
    
    // Crear nombre único para el archivo
    const timestamp = Date.now();
    const sanitizedUserName = userName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `${timestamp}_${sanitizedUserName}.png`;
    
    // Crear referencia en Storage: wishes_eventId/fileName
    const storageRef = ref(storage, `wishes_${eventId}/${fileName}`);
    
    // Subir archivo
    await uploadBytes(storageRef, blob, { 
      contentType: 'image/png',
      customMetadata: {
        userName: userName,
        eventId: eventId,
        uploadedAt: new Date().toISOString()
      }
    });
    
    // Obtener y retornar URL de descarga
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  };

  // Helper para convertir Data URL a Blob
  const dataURLtoBlob = (dataurl: string): Blob => {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error("Invalid Data URL format");
    const mime = mimeMatch[1];
    
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while(n--){
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new Blob([u8arr], { type: mime });
  };

  const handleAnimationComplete = () => {
    setShowAnimation(false);
    setSubmit(false);
    setStep("success");
  };

  return (
    <div className="h-[90vh] w-[100vw] flex items-center flex-col justify-center"
    style={{ backgroundImage: step === "success" ? "url(/CORTES/CIERRE/FONDO-CIERRE.png)": "url(/CORTES/HOME/FONDO_HOME.jpg)", backgroundSize: "cover", backgroundPosition: "center" }}>
      {showAnimation && framedShot && (
        <ParticleAnimation 
          imageSrc={framedShot}
          onComplete={handleAnimationComplete}
        />
      )}

      {step === "capture" && (
        <CaptureStep
          frameSrc={frameSrc || `/CORTES/POLAROIDS/POLAROID_0${Math.floor(Math.random() * 3) + 1}.png`} // Selección aleatoria de imagen entre 1 y 3
          mirror={mirror}
          boxSize={boxSize}
          onCaptured={handleCaptured}
          wish={wish}
        />
      )}

      {step === "preview" && framedShot && (
        <PreviewStep
          framedShot={framedShotWithText || framedShot} // Usar la imagen con texto si está disponible
          boxSize={boxSize}
          onRetake={resetAll}
          onConfirm={() => setStep("wish")}
          wish={wish} // Pasar el objeto completo del deseo
        />
      )}

      {step === "wish" && framedShot && (
        <WishStep
          
         
          onBack={() => setStep("preview")}
          onConfirm={handleWishConfirm}
        />
      )}

      {submit && !isSubmitting && step !== "wish" && (
        <ButtonPrimary
          onClick={submitAndProcess}
          label="CONFIRMAR Y ENVIAR"
          imageSrc="/CORTES/BOTONES/BOTON-LARGO.png"
          width={300}
          height={60}
          ariaLabel="Confirmar y enviar deseo"
          className="absolute bottom-20"
        />
      )}

      {isSubmitting && !showAnimation && (
        <div className="mt-4 flex items-center gap-2 text-gray-600">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
          <span>Enviando tu deseo...</span>
        </div>
      )}

      {step === "success" && (
        <div className="h-screen w-screen flex flex-col items-center justify-around text-white"
    style={{ backgroundImage: "url(/CORTES/CIERRE/FONDO-CIERRE.png)", backgroundSize: "cover", backgroundPosition: "center" }}>
        
          <div className="text-center space-y-6 animate-fade-in">
            <div className="text-6xl mb-4">✨</div>
            <h2 className="text-4xl bg-black/50 p-2 rounded-md font-bold">¡Deseo enviado!</h2>
            {/* <div className="bg-black/50">
            <p className="text-xl text-white max-w-md mx-auto  p-2 rounded-md">
              Tu deseo ha sido enviado al universo
            </p>
            {wish.name && (
              <p className="text-lg text-gray-50  p-2 rounded-md">
                Gracias, <strong>{wish.name}</strong>
              </p>
            )}

            </div> */}
          </div>
            <div className="pt-8">
              <img
                src="/CORTES/CIERRE/GRACIAS.png"
                alt="Gracias"
                className="w-90 h-20 mx-auto"
              />
            </div>
        </div>
      )}
    </div>
  );
}