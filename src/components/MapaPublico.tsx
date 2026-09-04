"use client";

import { MapaCentrosCliente } from "@/components/MapaCentrosCliente";
import type { CentroMapa } from "@/components/MapaCentros";

export type CentroPublico = {
  id: string;
  nombre: string;
  institucion: string | null;
  direccion: string;
  ciudad: string;
  latitud: number;
  longitud: number;
};

/**
 * Mapa público de centros activos (pantalla de acceso). Los datos llegan del
 * servidor como props, así el mapa se dibuja en cuanto carga Leaflet, sin un
 * fetch extra. Solo ubicación: nombre, institución y dirección.
 */
export function MapaPublico({ centros }: { centros: CentroPublico[] }) {
  const puntos: CentroMapa[] = centros.map((c) => ({ ...c, activo: true, href: null }));
  return (
    <div className="h-full w-full bg-bg">
      <MapaCentrosCliente centros={puntos} alto="100%" className="h-full w-full" tema="oscuro" zoomRueda />
    </div>
  );
}
