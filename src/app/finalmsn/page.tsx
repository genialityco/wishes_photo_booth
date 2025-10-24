"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
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

import QRCode from "react-qr-code";
import { getDatabase, ref, onValue, update } from "firebase/database";
import AnimationComponent from "./AnimationComponent";

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [startedRemotely, setStartedRemotely] = useState(false);

  const [origin, setOrigin] = useState<string>("");
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const pathname = usePathname();

  useEffect(() => {
    if (!eventId) return;
    const rtdb = getDatabase();
    const redirectRef = ref(rtdb, `events/${eventId}/controls/redirect`);

    const unsub = onValue(redirectRef, (snap) => {
      const dest = snap.val(); // p.ej. "/finalmsn" | "/final" | null
      if (typeof dest !== "string" || !dest) return;

      // si ya estamos en /finalmsn y piden /finalmsn, no hacemos nada
      if (pathname === dest) return;

      // redirige
      router.push(dest);

      // opcional: limpiar para que no quede “pegado”
      update(ref(rtdb, `events/${eventId}/controls`), { redirect: null }).catch(
        () => {}
      );
    });

    return () => unsub();
  }, [eventId, pathname, router]);

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

  const lastReloadAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!eventId) return;
    const rtdb = getDatabase();
    const reloadRef = ref(rtdb, `events/${eventId}/controls/reloadAt`);

    const unsub = onValue(reloadRef, (snap) => {
      const val = snap.val();
      if (typeof val !== "number") return;

      if (lastReloadAtRef.current === null) {
        lastReloadAtRef.current = val;
        return;
      }

      if (val !== lastReloadAtRef.current) {
        lastReloadAtRef.current = val;
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      }
    });

    return () => unsub();
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
        setIsPlaying(true);
        setCurrentIndex(0);
      } else {
        setIsPlaying(false);
        setStartedRemotely(false);
      }
    });

    return () => unsubscribe();
  }, [eventId]);

  // Cargar evento y wishes
  useEffect(() => {
    const loadEventAndWishes = async () => {
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
          .filter((wish) => wish.photoUrl);

        if (wishesData.length === 0) {
          setError("No hay deseos aprobados para mostrar");
          return;
        }

        setWishes(wishesData);
      } catch (err) {
        console.error("Error loading event and wishes:", err);
        setError("Error al cargar los datos");
      } finally {
        setIsLoading(false);
      }
    };

    loadEventAndWishes();
  }, [eventId]);

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

  // Loading
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background:
            event?.settings.backgroundColor ||
            "linear-gradient(to br, #6366f1, #8b5cf6)",
        }}
      >
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto" />
          <p className="text-white text-xl font-semibold">
            Cargando deseos mágicos...
          </p>
        </div>
      </div>
    );
  }

  // Error
  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-600 to-pink-600">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {error || "Evento no disponible"}
          </h2>
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

  // Pantalla de espera: hasta que start=true en Realtime
  if (!startedRemotely) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center text-white relative"
        style={{
          background:
            event?.settings.backgroundColor ||
            "linear-gradient(to br, #4f46e5, #7c3aed)",
        }}
      >
        <h2 className="text-3xl font-bold mb-2 animate-pulse">
          Esperando la llegada de los deseos...
        </h2>
        <p className="opacity-80 mb-6">Estos deseos llegarán pronto.</p>

        {/* QR inferior derecho */}
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

  // Animación activa
  return (
    <div>
      <AnimationComponent
        photoUrls={wishes.map((wish) => wish.photoUrl)}
        message={event?.settings.textFinal || "fenalco geniality"}
      />

      {/* QR inferior derecho (visible también durante la animación, si quieres) */}
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
