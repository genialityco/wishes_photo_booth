"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import AdminAnimationControls from "./AdminAnimationControls";

export default function AdminWishesPage() {
  const search = useSearchParams();
  const router = useRouter();

  // lee el eventId desde ?eventId= o usa uno por defecto temporal
  const initialEventId = useMemo(
    () => (search.get("eventId") || "Dr8vPWpmnq1HtcEOCSEn").trim(),
    [search]
  );

  const [eventId, setEventId] = useState<string>(initialEventId);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setEventId(initialEventId);
    setDirty(false);
  }, [initialEventId]);

  const applyEventIdToUrl = () => {
    const params = new URLSearchParams(Array.from(search.entries()));
    params.set("eventId", eventId);
    router.replace(`/adminwishes?${params.toString()}`);
    setDirty(false);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 p-4">
          <h1 className="text-xl font-semibold">Panel de Animación (Admin)</h1>

          <div className="ml-auto flex items-center gap-2">
            <input
              value={eventId}
              onChange={(e) => {
                setEventId(e.target.value);
                setDirty(true);
              }}
              placeholder="eventId..."
              className="w-[320px] rounded-md border px-3 py-2 text-sm"
            />
            <button
              onClick={applyEventIdToUrl}
              disabled={!dirty || !eventId}
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                dirty && eventId
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              Aplicar
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl p-4">
        {/* Aquí cargamos el panel admin */}
        <AdminAnimationControls />
      </section>
    </main>
  );
}
