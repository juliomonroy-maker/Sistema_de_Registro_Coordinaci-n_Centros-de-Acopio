"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type CentroMapa = {
  id: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  latitud: number;
  longitud: number;
  activo: boolean;
  institucion?: string | null;
  encargado?: string | null; // solo para usuarios con sesión
  unidades?: number | null; // existencia total (stock derivado); null en vistas públicas
  href: string | null; // enlace a la ficha si el usuario puede verla
};

const CENTRO_MX: [number, number] = [22.2350, -97.8600]; // Tampico

// Siempre OpenStreetMap (sin API key). El tema oscuro se logra con un filtro CSS
// sobre las teselas (`.tiles-oscuro` en globals.css); CARTO exige API key por referrer.
const OSM = { url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' };

/**
 * Encuadre inicial: el grupo más denso de puntos (mediana ± ~25 km) en lugar de
 * todos los puntos, para que un centro lejano no aleje el mapa de la zona principal.
 */
function puntosPrincipales(puntos: [number, number][]): [number, number][] {
  if (puntos.length < 3) return puntos;
  const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const mLat = med(puntos.map((p) => p[0])), mLng = med(puntos.map((p) => p[1]));
  const cerca = puntos.filter((p) => Math.abs(p[0] - mLat) < 0.25 && Math.abs(p[1] - mLng) < 0.25);
  return cerca.length >= 2 ? cerca : puntos;
}

/**
 * Mapa Leaflet + OpenStreetMap (sin API key). Marcadores circulares (sin
 * imágenes externas), popup con datos del centro. Se carga solo en cliente
 * (usar con next/dynamic ssr:false).
 */
export function MapaCentros({
  centros,
  alto = 480,
  className = "w-full overflow-hidden rounded-xl border",
  tema = "claro",
  enfocarGrupo = true,
  zoomRueda = false,
}: {
  centros: CentroMapa[];
  alto?: number | string;
  className?: string;
  tema?: "claro" | "oscuro";
  /** Encuadrar el grupo principal de centros (no los puntos lejanos). */
  enfocarGrupo?: boolean;
  /** Permitir zoom con la rueda del ratón (en páginas largas conviene apagado). */
  zoomRueda?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const map = L.map(ref.current, { scrollWheelZoom: zoomRueda, preferCanvas: true, zoomControl: true });
    L.tileLayer(OSM.url, {
      maxZoom: 19,
      attribution: OSM.attribution,
      updateWhenIdle: true,
      keepBuffer: 2,
      className: tema === "oscuro" ? "tiles-oscuro" : "",
    }).addTo(map);

    const puntos: L.LatLngExpression[] = [];
    for (const c of centros) {
      const p: [number, number] = [c.latitud, c.longitud];
      puntos.push(p);
      const marker = L.circleMarker(p, {
        radius: 10,
        color: tema === "oscuro" ? "#0a0a0a" : "#ffffff",
        weight: 2,
        fillColor: c.activo ? (tema === "oscuro" ? "#f4f4f4" : "#111111") : "#8a8a8a",
        fillOpacity: 0.95,
      }).addTo(map);
      const enlace = c.href ? `<a href="${c.href}" style="font-weight:600;text-decoration:underline;text-underline-offset:3px">Ver ficha</a>` : "";
      const lineas = [
        `<b>${escapar(c.nombre)}</b>${c.activo ? "" : ' <span style="color:#6b7280">(inactivo)</span>'}`,
        c.institucion ? `<span style="opacity:.65">${escapar(c.institucion)}</span>` : "",
        `${escapar(c.direccion)}, ${escapar(c.ciudad)}`,
        c.encargado !== undefined ? `Encargado: ${escapar(c.encargado ?? "—")}` : "",
        c.unidades != null
          ? `Existencia: <b>${new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(c.unidades)}</b> unidades`
          : "",
        enlace,
      ].filter(Boolean);
      marker.bindPopup(`<div style="font-size:13px;line-height:1.4">${lineas.join("<br/>")}</div>`);
      marker.bindTooltip(c.nombre, { direction: "top", offset: [0, -8] });
    }

    const encuadre = enfocarGrupo ? puntosPrincipales(puntos as [number, number][]) : (puntos as [number, number][]);
    if (encuadre.length === 0) map.setView(CENTRO_MX, 12);
    else if (encuadre.length === 1) map.setView(encuadre[0], 14);
    else map.fitBounds(L.latLngBounds(encuadre), { padding: [32, 32], maxZoom: 14 });

    return () => {
      map.remove();
    };
  }, [centros, tema, enfocarGrupo, zoomRueda]);

  return <div ref={ref} style={{ height: alto }} className={className} />;
}

/** Selector de ubicación: clic en el mapa fija lat/lng (para el alta de centros). */
export function SelectorUbicacion({
  valor,
  onChange,
  alto = 300,
}: {
  valor: { lat: number; lng: number } | null;
  onChange: (p: { lat: number; lng: number }) => void;
  alto?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current).setView(valor ? [valor.lat, valor.lng] : CENTRO_MX, valor ? 14 : 5);
    L.tileLayer(OSM.url, { maxZoom: 19, attribution: OSM.attribution, className: "tiles-oscuro" }).addTo(map);
    map.on("click", (e: L.LeafletMouseEvent) => {
      onChangeRef.current({ lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) });
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!valor) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    const p: [number, number] = [valor.lat, valor.lng];
    if (markerRef.current) markerRef.current.setLatLng(p);
    else markerRef.current = L.circleMarker(p, { radius: 10, color: "#0a0a0a", weight: 2, fillColor: "#f4f4f4", fillOpacity: 0.95 }).addTo(map);
  }, [valor]);

  return <div ref={ref} style={{ height: alto }} className="w-full overflow-hidden rounded-xl border" />;
}

function escapar(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] ?? ch);
}
