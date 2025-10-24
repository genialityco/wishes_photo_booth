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
  startAfter,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { getEventById, Wish } from "@/services/eventService";
import AnimationComponent from "./components/AnimationComponent";
import QRCode from "react-qr-code";
import { getDatabase, ref, onValue } from "firebase/database";
import { useWishStyle } from "@/context/Context";
import firebase from "firebase/compat/app";

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
  const [currentWishes, setCurrentWishes] = useState<Wish[]>([]);
  const [lastWishes, setLastWishes] = useState<Wish[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [startedRemotely, setStartedRemotely] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [origin, setOrigin] = useState<string>("");
  const { setWishImage, wishImage } = useWishStyle();
  const loadedForStartRef = useRef<string | null>(null);
  const lastDocRef = useRef<unknown>(null);
  const isLastFetchRef = useRef<boolean>(false);
  const [isImages, setIsImages] = useState<boolean>(true);

  // Constants
  const WISHES_PER_FETCH = 10;
  const FETCH_INTERVAL_MS = 5000; // 30 seconds
  const RESTART_INTERVAL_MS = 8000;

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

  // Cargar SOLO el evento
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

  const lastReloadAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!eventId) return;
    const rtdb = getDatabase();
    const reloadRef = ref(rtdb, `events/${eventId}/controls/reloadAt`);

    const unsub = onValue(reloadRef, (snap) => {
      const val = snap.val(); // number | null
      if (typeof val !== "number") return;

      // Evitar refrescar en la primera lectura (valor actual)
      if (lastReloadAtRef.current === null) {
        lastReloadAtRef.current = val;
        return;
      }

      if (val !== lastReloadAtRef.current) {
        lastReloadAtRef.current = val;
        // Forzar reload completo (mejor que router.refresh() para tu canvas/animación)
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      }
    });

    return () => unsub();
  }, [eventId]);

  // Listener Realtime: events/{eventId}/controls/{start, mode}
  // Dentro del useEffect donde escuchas el controlRef
  useEffect(() => {
    if (!eventId) return;
    const realtime = getDatabase();
    const controlRef = ref(realtime, `events/${eventId}/controls`);

    const unsubscribe = onValue(controlRef, (snap) => {
      const v = snap.val() || {};

      // start
      if (typeof v.start === "boolean") {
        if (v.start) {
          setStartedRemotely(true);
        } else {
          setStartedRemotely(false);
          setIsPlaying(false);
          setCurrentIndex(0);
          setCurrentWishes([]);
          setLastWishes([]);
          loadedForStartRef.current = null;
          lastDocRef.current = null;
          isLastFetchRef.current = false;
        }
      }

      // 🚀 redirect
      if (v.redirect === "/finalmsn") {
        router.push("/finalmsn");
      }
    });

    return () => unsubscribe();
  }, [eventId, router]);

  const initialCreatedAtRef = useRef<Timestamp | null>(null);
  const lastCreatedAtRef = useRef<firebase.firestore.Timestamp | null>(null);
  // Fetch wishes periodically
  useEffect(() => {
    if (!startedRemotely || !eventId) return;

    const fetchWishes = async () => {
      // Si ya cargamos wishes para este evento y start sigue true, solo reproducir
      if (loadedForStartRef.current === eventId && currentWishes.length > 0) {
        if (!isPlaying) setIsPlaying(true);
        return;
      }

      setError(null);
      try {
        const wishesRef = collection(db, "events", eventId, "wishes");

        // Construir query base
        let qy;

        if (lastCreatedAtRef.current) {
          // Paginación: cargar wishes ANTERIORES al último createdAt visto
          qy = query(
            wishesRef,
            where("approved", "==", true),
            where("public", "==", true),
            where("createdAt", "<", lastCreatedAtRef.current),
            orderBy("createdAt", "desc"),
            fqLimit(WISHES_PER_FETCH)
          );
        } else {
          // Primera carga: obtener los más recientes
          qy = query(
            wishesRef,
            where("approved", "==", true),
            where("public", "==", true),
            orderBy("createdAt", "desc"),
            fqLimit(WISHES_PER_FETCH)
          );
        }

        const snapshot = await getDocs(qy);
        console.log("📦 Wishes fetched:", snapshot.docs.length);

        setWishImage([
          ...wishImage,
          ...snapshot.docs.map((doc) => doc.data().photoUrl),
        ]);

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

        // Si no hay más wishes antiguos
        if (wishesData.length === 0) {
          console.log(
            "🏁 No more old wishes, will check for new ones next cycle"
          );
          isLastFetchRef.current = true;
          setIsPreparing(false);
          return;
        }

        // IMPORTANTE: Si encontramos wishes, significa que hay datos
        isLastFetchRef.current = false;

        // Guardar el createdAt del ÚLTIMO wish para continuar desde ahí
        if (wishesData.length > 0) {
          const lastWish = wishesData[wishesData.length - 1];
          if (lastWish.createdAt) {
            lastCreatedAtRef.current = Timestamp.fromDate(lastWish.createdAt);
          }
        }

        // Agregar wishes sin reemplazar los anteriores
        setCurrentWishes((prev) => [...prev, ...wishesData]);

        // Iniciar reproducción
        if (!isPlaying) {
          setCurrentIndex(0);
          setIsPlaying(true);
        }

        // Precargar imágenes
        wishesData.forEach((w) => {
          if (w.photoUrl) {
            const img = new Image();
            img.src = w.photoUrl;
          }
        });

        loadedForStartRef.current = eventId;
      } catch (e) {
        console.error("❌ Error cargando wishes:", e);
        setError("Error al cargar los deseos");
      } finally {
        setIsPreparing(false);
      }
    };

    const checkForNewWishes = async () => {
      console.log("🔍 Checking for brand new wishes...");
      try {
        const wishesRef = collection(db, "events", eventId, "wishes");

        // Buscar wishes MÁS RECIENTES que el primero que vimos
        const qy = query(
          wishesRef,
          where("approved", "==", true),
          where("public", "==", true),
          where("createdAt", ">", initialCreatedAtRef.current || new Date(0)),
          orderBy("createdAt", "desc"),
          fqLimit(WISHES_PER_FETCH)
        );

        const snapshot = await getDocs(qy);
        console.log("🆕 New wishes found:", snapshot.docs.length);

        if (snapshot.docs.length > 0) {
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

          if (wishesData.length > 0) {
            // Actualizar la referencia inicial con el más reciente
            const newestWish = wishesData[0];
            if (newestWish.createdAt) {
              initialCreatedAtRef.current = Timestamp.fromDate(
                newestWish.createdAt
              );
            }

            // Agregar los nuevos wishes al final de la cola
            setCurrentWishes((prev) => [...prev, ...wishesData]);
            const urls = wishesData.map((w: Wish) => w.photoUrl as string);
            setWishImage((prev: string[]) => [...prev, ...urls]);
            // Precargar imágenes
            wishesData.forEach((w) => {
              if (w.photoUrl) {
                const img = new Image();
                img.src = w.photoUrl;
              }
            });

            console.log("✅ Added new wishes to queue");
            isLastFetchRef.current = false; // Reiniciar el flag
          }
        }
      } catch (e) {
        console.error("❌ Error checking new wishes:", e);
      }
    };

    // Carga inicial
    fetchWishes();

    // Fetch periódico
    const interval = setInterval(() => {
      if (isLastFetchRef.current) {
        // Si llegamos al final de los wishes antiguos, buscar NUEVOS
        console.log("🔄 End reached, checking for new wishes...");
        checkForNewWishes();
      } else {
        // Fetch normal: continuar con la paginación hacia atrás
        console.log("🔄 Fetching next batch of old wishes...");
        fetchWishes();
      }
    }, FETCH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [startedRemotely, eventId]);

  // Auto-play animation
  useEffect(() => {
    if (!isPlaying || (currentWishes.length === 0 && lastWishes.length === 0))
      return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const activeWishes = lastWishes.length > 0 ? lastWishes : currentWishes;
        const nextIndex = prev + 1;

        // Si llegamos al final de los wishes actuales
        if (nextIndex >= activeWishes.length) {
          // Si hay más wishes por cargar, volver al inicio
          if (!isLastFetchRef.current) {
            return 0;
          }
          // Si es la última página, quedarse en el último
          return prev;
        }

        return nextIndex;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isPlaying, currentWishes.length, lastWishes.length]); // ✅ Agregar dependencias
  // Auto-play animation
  useEffect(() => {
    if (!isPlaying || (currentWishes.length === 0 && lastWishes.length === 0))
      return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const activeWishes = lastWishes.length > 0 ? lastWishes : currentWishes;
        if (prev >= activeWishes.length - 1) {
          return lastWishes.length > 0 ? prev : 0; // Stop at last for lastWishes, loop for currentWishes
        }
        return prev + 1;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isPlaying, currentWishes.length, lastWishes.length]);

  // Reset index when wishes change to ensure animation starts from the beginning
  useEffect(() => {
    setCurrentIndex(0);
    setIsPlaying(true);
  }, [currentWishes, lastWishes]);

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
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src="/CORTES/VIDEOS/PANTALLA_FENALCO_MENSAJES.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 text-center">
          <h2 className="text-3xl font-bold mb-2 animate-pulse">
            Esperando la llegada de los deseos...
          </h2>
          <p className="opacity-80 mb-6">Estos deseos llegarán pronto.</p>
        </div>
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

  // Preparando (start=true pero aún cargando wishes)
  if (isPreparing) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center text-white overflow-hidden">
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src="/CORTES/VIDEOS/PANTALLA_FENALCO_MENSAJES.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 text-center space-y-6">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto" />
          <p className="text-xl font-semibold">Preparando los deseos…</p>
          <p className="text-sm opacity-80">Esto puede tardar unos segundos.</p>
        </div>
      </div>
    );
  }

  // Animación activa
  return (
    <div>
      <AnimationComponent
        photoUrls={currentWishes.map((w: Wish) => w.photoUrl as string)}
        message={event?.settings.textFinal || "FENALCO 80 AÑOS"}
        isImages={isImages}
      />
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
