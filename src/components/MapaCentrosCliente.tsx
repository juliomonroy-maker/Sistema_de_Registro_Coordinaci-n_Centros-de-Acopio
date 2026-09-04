"use client";

import dynamic from "next/dynamic";
import type { CentroMapa } from "@/components/MapaCentros";

// Leaflet toca `window`: se carga solo en el navegador.
const Mapa = dynamic(() => import("@/components/MapaCentros").then((m) => m.MapaCentros), {
  ssr: false,
  loading: () => <div className="flex h-full min-h-40 items-center justify-center text-sm text-ink-3">Cargando mapa…</div>,
});

export function MapaCentrosCliente({
  centros,
  alto,
  className,
  tema,
  enfocarGrupo,
  zoomRueda,
}: {
  centros: CentroMapa[];
  alto?: number | string;
  className?: string;
  tema?: "claro" | "oscuro";
  enfocarGrupo?: boolean;
  zoomRueda?: boolean;
}) {
  return <Mapa centros={centros} alto={alto} className={className} tema={tema} enfocarGrupo={enfocarGrupo} zoomRueda={zoomRueda} />;
}

export const SelectorUbicacionCliente = dynamic(
  () => import("@/components/MapaCentros").then((m) => m.SelectorUbicacion),
  { ssr: false, loading: () => <div className="flex h-72 items-center justify-center rounded-xl border bg-surface text-sm text-ink-3">Cargando mapa…</div> },
);
