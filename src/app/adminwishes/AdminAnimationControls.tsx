"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ref, onValue, update, Database } from "firebase/database";
import { getDatabaseBrowser } from "@/lib/firebaseConfig";

export default function AdminWishesPage() {
  const search = useSearchParams();
  const router = useRouter();

  // eventId desde ?eventId=... (o uno por defecto)
  const initialEventId = useMemo(
    () => (search.get("eventId") || "Dr8vPWpmnq1HtcEOCSEn").trim(),
    [search]
  );
  const [eventId, setEventId] = useState(initialEventId);
  const [dirty, setDirty] = useState(false);

  // RTDB (solo navegador)
  const [rtdb, setRtdb] = useState<Database | null>(null);
  useEffect(() => {
    let mounted = true;
    getDatabaseBrowser().then((db) => mounted && setRtdb(db));
    return () => { mounted = false; };
  }, []);

  // Ref controles
  const baseRef = useMemo(
    () => (rtdb ? ref(rtdb, `events/${eventId}/controls`) : null),
    [rtdb, eventId]
  );

  // Estado simple
  const [start, setStart] = useState<boolean>(false);

  // Suscripción a `start`
  useEffect(() => {
    if (!baseRef) return;
    const unsub = onValue(baseRef, (snap) => {
      const v = snap.val() || {};
      if (typeof v.start === "boolean") setStart(v.start);
    });
    return () => unsub();
  }, [baseRef]);

  // Helpers
  const setStartFlag = async (value: boolean) => {
    if (!baseRef) return;
    await update(baseRef, { start: value });
  };

  const applyEventIdToUrl = () => {
    const params = new URLSearchParams(Array.from(search.entries()));
    params.set("eventId", eventId);
    router.replace(`/adminwishes?${params.toString()}`);
    setDirty(false);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-2 p-4">
          <h1 className="text-lg font-semibold">Admin | Iniciar Animación</h1>
          <div className="ml-auto flex items-center gap-2">
            <input
              value={eventId}
              onChange={(e) => { setEventId(e.target.value); setDirty(true); }}
              placeholder="eventId..."
              className="w-[280px] rounded-md border px-3 py-2 text-sm"
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

      <section className="mx-auto max-w-3xl p-4">
        {!rtdb ? (
          <div className="text-sm text-gray-500">Inicializando conexión…</div>
        ) : (
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="mb-4 text-sm text-gray-600">
              Evento: <span className="font-mono">{eventId}</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setStartFlag(true)}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Iniciar animación
              </button>
              <button
                onClick={() => setStartFlag(false)}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white"
              >
                Detener
              </button>

              <span className="ml-4 text-sm">
                Estado:{" "}
                {start ? (
                  <b className="text-emerald-700">Iniciado</b>
                ) : (
                  <b className="text-gray-700">Detenido</b>
                )}
              </span>
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Esto escribe <span className="font-mono">events/{eventId}/controls/start</span> en Realtime Database.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
