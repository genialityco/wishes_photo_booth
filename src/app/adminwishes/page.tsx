"use client";

import { Suspense } from "react";
import InnerAdminPage from "./InnerAdminPage";

export const dynamic = "force-dynamic"; // opcional pero útil en Netlify para evitar prerender

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Cargando…</div>}>
      <InnerAdminPage />
    </Suspense>
  );
}
