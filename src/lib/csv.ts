import { NextResponse } from "next/server";

type Celda = string | number | boolean | Date | null | undefined;

function escapar(v: Celda): string {
  if (v == null) return "";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  const s = v instanceof Date ? v.toISOString() : v;
  // Neutraliza inyección de fórmulas en Excel/Sheets (=, +, -, @) y escapa comillas.
  const seguro = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\r\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

/** Genera CSV (RFC 4180, separador coma, CRLF) con BOM para que Excel detecte UTF-8. */
export function toCsv(headers: string[], rows: Celda[][]): string {
  const lineas = [headers, ...rows].map((r) => r.map(escapar).join(","));
  return "\uFEFF" + lineas.join("\r\n") + "\r\n";
}

/** Respuesta HTTP de descarga CSV. */
export function csvResponse(nombreArchivo: string, contenido: string): NextResponse {
  return new NextResponse(contenido, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Nombre de archivo con fecha, sin caracteres problemáticos. */
export function nombreCsv(base: string): string {
  const fecha = new Date().toISOString().slice(0, 10);
  const limpio = base.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "_");
  return `${limpio}_${fecha}.csv`;
}
