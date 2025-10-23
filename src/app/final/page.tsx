"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  getDocs,
  limit as fqLimit,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { getEventById, Wish } from "@/services/eventService";
import AnimationComponent from "./components/AnimationComponent";
import QRCode from "react-qr-code";
import { getDatabase, ref, onValue } from "firebase/database";

export default function WishesAnimationPage() {
  const router = useRouter();
  const params = useParams();
  const [eventId, setEventId] = useState<string>("Dr8vPWpmnq1HtcEOCSEn");

  interface Event {
    id: string;
    name: string;
    settings: {
      backgroundColor: string;
      textFinal: string;
    };
  }

  const [event, setEvent] = useState<Event | null>(null);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [isLoading, setIsLoading] = useState(true); // carga del evento (no de wishes)
  const [error, setError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [startedRemotely, setStartedRemotely] = useState(false); // flag RTDB start
  const [isPreparing, setIsPreparing] = useState(false); // cargando wishes luego del start
  const [origin, setOrigin] = useState<string>("");

  // Para evitar recargar wishes si ya se cargaron en este "start"
  const loadedForStartRef = useRef<string | null>(null);

  // Resolver eventId desde params
  useEffect(() => {
    if (params?.eventId) {
      setEventId(params.eventId as string);
    }
  }, [params]);

  // Guardar origin en cliente
  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  // Cargar SOLO el evento (para colores, textos en la pantalla de espera)
  useEffect(() => {
    const loadEvent = async () => {
      if (!eventId) return;
      setIsLoading(true);
      setError(null);
      try {
        const eventData = await getEventById(eventId);
        if (!eventData) {
          setError("Evento no encontrado");
          return;
        }
        setEvent(eventData);
      } catch (e) {
        console.error(e);
        setError("Error al cargar el evento");
      } finally {
        setIsLoading(false);
      }
    };
    loadEvent();
  }, [eventId]);

  // Listener Realtime: events/{eventId}/controls/start
  useEffect(() => {
    if (!eventId) return;
    const realtime = getDatabase();
    const controlRef = ref(realtime, `events/${eventId}/controls/start`);

    const unsubscribe = onValue(controlRef, (snap) => {
      const value = snap.val();
      if (value === true) {
        setStartedRemotely(true);
      } else {
        // si el admin apaga, detenemos
        setStartedRemotely(false);
        setIsPlaying(false);
        setCurrentIndex(0);
        loadedForStartRef.current = null; // permitir recargar si vuelven a iniciar
      }
    });

    return () => unsubscribe();
  }, [eventId]);

  // 👉 Cargar WISHES SOLO cuando startedRemotely pase a true
  useEffect(() => {
    const fetchWishesOnStart = async () => {
      if (!startedRemotely || !eventId) return;

      // Evita recargas innecesarias si ya se cargaron para este start
      if (loadedForStartRef.current === eventId) {
        setIsPlaying(true);
        return;
      }

      setIsPreparing(true);
      setError(null);
      try {
        const wishesRef = collection(db, "events", eventId, "wishes");
        const qy = query(
          wishesRef,
          where("approved", "==", true),
          where("public", "==", true),
          orderBy("createdAt", "desc"),
          fqLimit(300)
        );

        const snapshot = await getDocs(qy);
        const wishesData: Wish[] = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            eventId,
            userName: doc.data().userName || "",
            message: doc.data().message || "",
            photoUrl: doc.data().photoUrl || "",
            createdAt: doc.data().createdAt?.toDate() || null,
            approved: doc.data().approved || false,
            deviceType: doc.data().deviceType || "unknown",
            location: doc.data().location,
            colorTheme: doc.data().colorTheme || "#FFD700",
            public: doc.data().public || true,
          }))
          .filter((w) => w.photoUrl);

        if (wishesData.length === 0) {
          setError("No hay deseos aprobados para mostrar");
          setIsPreparing(false);
          return;
        }

        setWishes(wishesData);

        // opcional: precargar imágenes para transición suave
        wishesData.forEach((w) => {
          const img = new Image();
          img.src = w.photoUrl || "";
        });

        setCurrentIndex(0);
        setIsPlaying(true);
        loadedForStartRef.current = eventId;
      } catch (e) {
        console.error("Error cargando wishes:", e);
        setError("Error al cargar los deseos");
      } finally {
        setIsPreparing(false);
      }
    };

    fetchWishesOnStart();
  }, [startedRemotely, eventId]);

  // Auto-play de la animación
  useEffect(() => {
    if (!isPlaying || wishes.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= wishes.length - 1) {
          setIsPlaying(false); // Detener al final
          return prev;
        }
        return prev + 1;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isPlaying, wishes.length]);

  // Loading (del evento)
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background:
            event?.settings?.backgroundColor ||
            "linear-gradient(to br, #6366f1, #8b5cf6)",
        }}
      >
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto" />
          <p className="text-white text-xl font-semibold">
            Cargando el evento…
          </p>
        </div>
      </div>
    );
  }

  // Error (evento o wishes)
  if (error && !startedRemotely) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-600 to-pink-600">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">{error}</h2>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-purple-600 text-white rounded-full font-semibold hover:bg-purple-700 transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  if (!startedRemotely) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center text-white overflow-hidden">
        {/* 🎥 Video de fondo */}
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src="/CORTES/VIDEOS/PANTALLA_FENALCO_MENSAJES.mp4"
          autoPlay
          loop
          muted
          playsInline
        />

        {/* Capa de oscurecimiento sutil si quieres más contraste */}
        <div className="absolute inset-0 bg-black/40" />

        {/* Contenido superpuesto */}
        <div className="relative z-10 text-center">
          <h2 className="text-3xl font-bold mb-2 animate-pulse">
            Esperando la llegada de los deseos...
          </h2>
          <p className="opacity-80 mb-6">Estos deseos llegarán pronto.</p>
        </div>

        {/* QR inferior derecho */}
        <div className="fixed bottom-4 right-4 bg-white/80 backdrop-blur-md p-3 rounded-xl shadow-lg flex flex-col items-center z-20">
          <QRCode value={origin || "https://example.com"} size={150} />
          {origin ? (
            <span className="text-[10px] font-medium text-gray-700 mt-2">
              {origin}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  // 👉 Preparando (start=true pero aún cargando wishes)
  if (isPreparing) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center text-white overflow-hidden">
        {/* 🎥 Video de fondo */}
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src="/CORTES/VIDEOS/PANTALLA_FENALCO_MENSAJES.mp4"
          autoPlay
          loop
          muted
          playsInline
        />

        {/* Velo sutil para contraste */}
        <div className="absolute inset-0 bg-black/40" />

        {/* Contenido superpuesto */}
        <div className="relative z-10 text-center space-y-6">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto" />
          <p className="text-xl font-semibold">Preparando los deseos…</p>
          <p className="text-sm opacity-80">Esto puede tardar unos segundos.</p>
        </div>
      </div>
    );
  }

  // Animación activa (wishes ya cargados)
  return (
    <div>
      <AnimationComponent
        photoUrls={wishes.map((w) => w.photoUrl)}
        message={event?.settings?.textFinal || "fenalco geniality"}
      />

      {/* QR inferior derecho (si quieres mantenerlo durante la animación) */}
      <div className="fixed bottom-4 right-4 bg-white/80 backdrop-blur-md p-3 rounded-xl shadow-lg flex flex-col items-center z-[999]">
        <QRCode value={origin || "https://example.com"} size={150} />
        {origin ? (
          <span className="text-[10px] font-medium text-gray-700 mt-2">
            {origin}
          </span>
        ) : null}
      </div>
    </div>
  );
}
