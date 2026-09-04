"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";
import type { PuntoDiario, BarraCategoria } from "@/lib/graficas";

// Monocromo: tres niveles de tinta + trazo (sólido / sólido / discontinuo) como
// segunda codificación, con leyenda siempre visible. Orden fijo: recibido, entregado, merma.
const SERIES = {
  recibido: { nombre: "Recibido", color: "#f4f4f4", dash: undefined as string | undefined },
  entregado: { nombre: "Entregado", color: "#8a8a8a", dash: undefined as string | undefined },
  merma: { nombre: "Merma", color: "#b9b9b9", dash: "5 4" as string | undefined },
} as const;
const BARRA = "#f4f4f4"; // magnitud de una sola serie: tinta
const GRID = "#262626";
const EJE = "#8a8a8a";
const TOOLTIP = { fontSize: 12, borderRadius: 8, background: "#121212", border: "1px solid #262626", color: "#f4f4f4" } as const;
const CURSOR = { fill: "#181818" } as const;

const fmt = (n: number) => new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(n);
const fmtDia = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};

function Vacio({ texto }: { texto: string }) {
  return <div className="flex h-64 items-center justify-center text-sm text-ink-3">{texto}</div>;
}

/** Recibido / entregado / merma por día (últimos N días). */
export function GraficaSerieDiaria({ datos, titulo = "Actividad diaria (últimos 30 días)" }: { datos: PuntoDiario[]; titulo?: string }) {
  const hayDatos = datos.some((p) => p.recibido || p.entregado || p.merma);
  return (
    <figure className="rounded-xl border border-line bg-surface p-4">
      <figcaption className="mb-2 text-sm font-semibold">{titulo}</figcaption>
      {!hayDatos ? (
        <Vacio texto="Sin movimientos en el periodo." />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={datos} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="dia" tickFormatter={fmtDia} tick={{ fontSize: 11, fill: EJE }} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={24} />
            <YAxis tick={{ fontSize: 11, fill: EJE }} tickLine={false} axisLine={false} width={44} tickFormatter={fmt} />
            <Tooltip
              formatter={(v: number, name: string) => [fmt(v), name]}
              labelFormatter={(l) => `Día ${fmtDia(String(l))}`}
              contentStyle={TOOLTIP} itemStyle={{ color: "#f4f4f4" }} labelStyle={{ color: "#8a8a8a" }}
            />
            <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
            {(Object.keys(SERIES) as (keyof typeof SERIES)[]).map((k) => (
              <Line key={k} type="monotone" dataKey={k} name={SERIES[k].nombre} stroke={SERIES[k].color} strokeDasharray={SERIES[k].dash} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: "#0a0a0a" }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </figure>
  );
}

/** Barras horizontales de una sola serie (magnitud): stock por categoría, recibido por centro, top artículos. */
export function GraficaBarras({ datos, titulo, unidad = "" }: { datos: BarraCategoria[]; titulo: string; unidad?: string }) {
  const alto = Math.max(160, 36 * datos.length + 40);
  return (
    <figure className="rounded-xl border border-line bg-surface p-4">
      <figcaption className="mb-2 text-sm font-semibold">{titulo}</figcaption>
      {datos.length === 0 ? (
        <Vacio texto="Sin datos." />
      ) : (
        <ResponsiveContainer width="100%" height={alto}>
          <BarChart data={datos} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 8 }} barCategoryGap={6}>
            <CartesianGrid stroke={GRID} horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: EJE }} tickLine={false} axisLine={false} tickFormatter={fmt} />
            <YAxis type="category" dataKey="nombre" width={150} tick={{ fontSize: 11, fill: EJE }} tickLine={false} axisLine={false} />
            <Tooltip formatter={(v: number) => [`${fmt(v)} ${unidad}`.trim(), "Cantidad"]} contentStyle={TOOLTIP} itemStyle={{ color: "#f4f4f4" }} labelStyle={{ color: "#8a8a8a" }} cursor={CURSOR} />
            <Bar dataKey="cantidad" fill={BARRA} radius={[0, 4, 4, 0]} maxBarSize={22}>
              <LabelList dataKey="cantidad" position="right" formatter={(v: number) => fmt(v)} style={{ fontSize: 11, fill: "#b9b9b9" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </figure>
  );
}

/** Recibido / entregado / merma por campaña (barras agrupadas, 3 series fijas). */
export function GraficaCampanas({ datos }: { datos: { nombre: string; recibido: number; entregado: number; merma: number }[] }) {
  return (
    <figure className="rounded-xl border border-line bg-surface p-4">
      <figcaption className="mb-2 text-sm font-semibold">Recibido, entregado y merma por campaña</figcaption>
      {datos.length === 0 ? (
        <Vacio texto="Sin campañas." />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={datos} margin={{ top: 8, right: 16, bottom: 0, left: 0 }} barGap={2} barCategoryGap={16}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: EJE }} tickLine={false} axisLine={{ stroke: GRID }} interval={0} />
            <YAxis tick={{ fontSize: 11, fill: EJE }} tickLine={false} axisLine={false} width={44} tickFormatter={fmt} />
            <Tooltip formatter={(v: number, name: string) => [fmt(v), name]} contentStyle={TOOLTIP} itemStyle={{ color: "#f4f4f4" }} labelStyle={{ color: "#8a8a8a" }} cursor={CURSOR} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {(Object.keys(SERIES) as (keyof typeof SERIES)[]).map((k) => (
              <Bar key={k} dataKey={k} name={SERIES[k].nombre} fill={SERIES[k].color} stroke="#0a0a0a" strokeWidth={1} radius={[4, 4, 0, 0]} maxBarSize={28} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </figure>
  );
}

/** Avance de metas: % captado por artículo (una serie, magnitud). */
export function GraficaMetas({ metas }: { metas: { nombre: string; porcentaje: number; recibido: number; objetivo: number; unidad: string }[] }) {
  const datos = metas.map((m) => ({ nombre: m.nombre, cantidad: m.porcentaje, detalle: `${fmt(m.recibido)} / ${fmt(m.objetivo)} ${m.unidad}` }));
  const alto = Math.max(140, 36 * datos.length + 40);
  return (
    <figure className="rounded-xl border border-line bg-surface p-4">
      <figcaption className="mb-2 text-sm font-semibold">Avance de metas (% del objetivo)</figcaption>
      {datos.length === 0 ? (
        <Vacio texto="Sin metas definidas." />
      ) : (
        <ResponsiveContainer width="100%" height={alto}>
          <BarChart data={datos} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 8 }} barCategoryGap={6}>
            <CartesianGrid stroke={GRID} horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: EJE }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
            <YAxis type="category" dataKey="nombre" width={150} tick={{ fontSize: 11, fill: EJE }} tickLine={false} axisLine={false} />
            <Tooltip formatter={(v: number, _n, item) => [`${v}% · ${(item?.payload as { detalle?: string })?.detalle ?? ""}`, "Avance"]} contentStyle={TOOLTIP} itemStyle={{ color: "#f4f4f4" }} labelStyle={{ color: "#8a8a8a" }} cursor={CURSOR} />
            <Bar dataKey="cantidad" fill={BARRA} radius={[0, 4, 4, 0]} maxBarSize={22} background={{ fill: "#222222", radius: 4 }}>
              <LabelList dataKey="cantidad" position="right" formatter={(v: number) => `${v}%`} style={{ fontSize: 11, fill: "#b9b9b9" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </figure>
  );
}
