"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ref, onValue, update } from "firebase/database";
import { getDatabaseBrowser } from "@/lib/firebaseConfig";

export default function InnerAdminPage() {
  const search = useSearchParams();
  const router = useRouter();

  const initialEventId = useMemo(
    () => (search.get("eventId") || "Dr8vPWpmnq1HtcEOCSEn").trim(),
    [search]
  );
  const [eventId, setEventId] = useState(initialEventId);
  const [dirty, setDirty] = useState(false);
  const [rtdb, setRtdb] = useState<import("firebase/database").Database | null>(null);
  const [start, setStart] = useState(false);

  useEffect(() => {
    let mounted = true;
    getDatabaseBrowser().then((db) => mounted && setRtdb(db));
    return () => { mounted = false; };
  }, []);

  const baseRef = useMemo(
    () => (rtdb ? ref(rtdb, `events/${eventId}/controls`) : null),
    [rtdb, eventId]
  );

  useEffect(() => {
    if (!baseRef) return;
    const unsub = onValue(baseRef, (snap) => {
      const v = snap.val() || {};
      if (typeof v.start === "boolean") setStart(v.start);
    });
    return () => unsub();
  }, [baseRef]);

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

  // ✅ Helper seguro para redirigir (y opcionalmente limpiar)
  const setRedirect = async (path: string | null, autoClearMs?: number) => {
    if (!baseRef) return;
    await update(baseRef, { redirect: path });
    if (autoClearMs && path) {
      // Limpieza automática tras un momento para evitar “pegado”
      setTimeout(() => {
        update(baseRef, { redirect: null }).catch(() => {});
      }, autoClearMs);
    }
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
                dirty && eventId ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-gray-200 text-gray-600"
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
          <div className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
            <div className="text-sm text-gray-600">
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
                Estado: {start ? <b className="text-emerald-700">Iniciado</b> : <b className="text-gray-700">Detenido</b>}
              </span>
            </div>

            <p className="text-xs text-gray-500">
              Escribe <span className="font-mono">events/{eventId}/controls/start</span> en Realtime DB.
            </p>

            {/* 🔀 Controles de redirect */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setRedirect("/finalmsn", 1500)} // escribe y limpia en 1.5s
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Ir a mensaje final (/finalmsn)
              </button>
              <button
                onClick={() => setRedirect("/final", 1500)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
              >
                Ir a cascada (/final)
              </button>
              <button
                onClick={() => setRedirect(null)} // dejar por defecto
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-900"
              >
                Limpiar redirect
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Usa <span className="font-mono">events/{eventId}/controls/redirect</span> con
              <span className="font-mono"> /finalmsn</span>, <span className="font-mono">/final</span> o <span className="font-mono">null</span>.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
