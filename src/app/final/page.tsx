/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  limit as fqLimit,
  orderBy 
} from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { getEventById, Wish } from "@/services/eventService";
import AnimationComponent from "./components/AnimationComponent";


export default function WishesAnimationPage() {
  const router = useRouter();
  const params = useParams();
  const [eventId, setEventId] = useState<string>("Dr8vPWpmnq1HtcEOCSEn");
  interface Event {
    id: string;
    name: string;
    settings: {
      backgroundColor: string;
    };
    // Add other properties as needed to match the structure of eventData
  }
  
  const [event, setEvent] = useState<Event | null>(null);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Resolver eventId desde params
  useEffect(() => {
    if (params?.eventId) {
      setEventId(params.eventId as string);
    }
  }, [params]);

  // Cargar evento y wishes
  useEffect(() => {
    const loadEventAndWishes = async () => {
      if (!eventId) return;

      setIsLoading(true);
      setError(null);

      try {
        // 1. Cargar datos del evento
        const eventData = await getEventById(eventId);
        
        if (!eventData) {
          setError("Evento no encontrado");
          return;
        }

        setEvent(eventData);

        // 2. Cargar wishes aprobados con fotos
        const wishesRef = collection(db, "events", eventId, "wishes");
        const q = query(
          wishesRef,
          where('approved', '==', true),
          where('public', '==', true),
          orderBy('createdAt', 'desc'),
          fqLimit(100) // Limitar a 100 wishes máximo
        );

        const snapshot = await getDocs(q);
        const wishesData: Wish[] = snapshot.docs
          .map(doc => ({
            id: doc.id,
            eventId: eventId,
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
          .filter(wish => wish.photoUrl); // Solo wishes con foto

        if (wishesData.length === 0) {
          setError("No hay deseos aprobados para mostrar");
          return;
        }

        setWishes(wishesData);
        console.log(`Loaded ${wishesData.length} approved wishes`);

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
    }, 5000); // Cambiar cada 5 segundos

    return () => clearInterval(interval);
  }, [isPlaying, wishes.length]);

  const handleStart = () => {
    setCurrentIndex(0);
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleResume = () => {
    setIsPlaying(true);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsPlaying(true);
  };

  const handleNext = () => {
    if (currentIndex < wishes.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{
          background: event?.settings.backgroundColor || "linear-gradient(to br, #6366f1, #8b5cf6)"
        }}
      >
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto"></div>
          <p className="text-white text-xl font-semibold">Cargando deseos mágicos...</p>
        </div>
      </div>
    );
  }

  // Error state
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

  const currentWish = wishes[currentIndex];
  const progress = wishes.length > 0 ? ((currentIndex + 1) / wishes.length) * 100 : 0;

  return (
    <div>
        <AnimationComponent photoUrls={wishes.map(wish => wish.photoUrl)} message="fenalco geniality"></AnimationComponent>
    </div>
  )
}