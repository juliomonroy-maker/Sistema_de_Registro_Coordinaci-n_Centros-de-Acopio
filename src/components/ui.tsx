import Link from "next/link";
import type { ReactNode } from "react";

export function StatCard({ label, value, href }: { label: string; value: ReactNode; href?: string }) {
  const card = (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="text-3xl font-bold text-brand-700">{value}</div>
      <div className="mt-1 text-sm text-gray-500">{label}</div>
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

export function Tabla({
  headers,
  rows,
  empty = "Sin datos.",
}: {
  headers: string[];
  rows: ReactNode[][];
  empty?: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-500">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={headers.length} className="px-4 py-6 text-center text-gray-400">
                {empty}
              </td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={i} className="border-t">
              {r.map((cell, j) => (
                <td key={j} className="px-4 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TIPO_BADGE: Record<string, string> = {
  RECEPCION: "bg-green-100 text-green-700",
  ENTREGA: "bg-blue-100 text-blue-700",
  MERMA: "bg-red-100 text-red-700",
  TRANSFERENCIA_SALIDA: "bg-amber-100 text-amber-700",
  TRANSFERENCIA_ENTRADA: "bg-teal-100 text-teal-700",
  AJUSTE: "bg-purple-100 text-purple-700",
};

const TIPO_LABEL: Record<string, string> = {
  RECEPCION: "Recepción",
  ENTREGA: "Entrega",
  MERMA: "Merma",
  TRANSFERENCIA_SALIDA: "Transf. salida",
  TRANSFERENCIA_ENTRADA: "Transf. entrada",
  AJUSTE: "Ajuste",
};

export function TipoBadge({ tipo }: { tipo: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TIPO_BADGE[tipo] ?? "bg-gray-100 text-gray-600"}`}>
      {TIPO_LABEL[tipo] ?? tipo}
    </span>
  );
}

export function fmtFecha(d: Date | string) {
  return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

/** Barra de avance 0..100 con color según porcentaje. */
export function BarraProgreso({ porcentaje }: { porcentaje: number }) {
  const p = Math.max(0, Math.min(100, porcentaje));
  const color = p >= 100 ? "bg-brand-600" : p >= 50 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full ${color}`} style={{ width: `${p}%` }} />
    </div>
  );
}

/** Enlace de descarga CSV (el navegador descarga por Content-Disposition). */
export function BotonCsv({ href, label = "Exportar CSV" }: { href: string; label?: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
    >
      ⬇ {label}
    </a>
  );
}

export function fmtNum(n: number) {
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(n);
}
