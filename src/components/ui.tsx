import Link from "next/link";
import type { ReactNode } from "react";

/* ─────────────────────────── Clases compartidas ───────────────────────────
 * Un solo vocabulario para páginas y componentes cliente. Monocromo oscuro:
 * el botón primario es blanco sobre negro; lo secundario es contorno.
 */
export const cls = {
  btnPrimary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-bg hover:bg-ink-2 disabled:opacity-40 disabled:hover:bg-ink",
  btnSecondary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line-2 px-4 text-sm font-medium text-ink hover:bg-surface-3 disabled:opacity-40",
  btnDanger:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-danger/40 px-4 text-sm font-medium text-danger hover:bg-danger-bg disabled:opacity-40",
  btnSm: "min-h-9 px-3 text-xs",
  input:
    "w-full min-h-11 rounded-md border border-line-2 bg-bg px-3 py-2 text-base text-ink placeholder-ink-3 focus:border-ink focus:outline-none sm:text-sm",
  label: "mb-1 block text-sm font-medium text-ink-2",
  link: "text-ink underline decoration-line-2 underline-offset-4 hover:decoration-ink",
  panel: "rounded-xl border border-line bg-surface",
  h1: "text-2xl font-semibold tracking-tight sm:text-3xl",
  h2: "text-base font-semibold sm:text-lg",
  muted: "text-sm text-ink-3",
  error: "rounded-md bg-danger-bg px-3 py-2 text-sm text-danger",
  ok: "rounded-md bg-ink/10 px-3 py-2 text-sm text-ink",
};

/** Cabecera de página: título, subtítulo y acciones alineadas a la derecha (apiladas en móvil). */
export function Encabezado({ titulo, sub, acciones }: { titulo: ReactNode; sub?: ReactNode; acciones?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className={cls.h1}>{titulo}</h1>
        {sub && <p className="mt-1 text-sm text-ink-3">{sub}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </div>
  );
}

/** Título de sección con separación generosa arriba y poca abajo. */
export function Seccion({ titulo, aside, children }: { titulo: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-10 first:mt-0">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className={cls.h2}>{titulo}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/**
 * Riel de cifras: números grandes separados por líneas, no tarjetas. En móvil,
 * dos columnas; en escritorio, una fila. `tono` marca pendientes en ámbar.
 */
export function Cifras({ items }: { items: { label: string; value: ReactNode; href?: string; tono?: "warn" }[] }) {
  return (
    <dl className="grid grid-cols-2 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface sm:grid-cols-3 sm:divide-y-0 lg:flex lg:divide-x">
      {items.map((it) => {
        const cuerpo = (
          <>
            <dd className={`text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl ${it.tono === "warn" ? "text-warn" : "text-ink"}`}>{it.value}</dd>
            <dt className="mt-1 text-xs text-ink-3 sm:text-sm">{it.label}</dt>
          </>
        );
        const base = "flex min-h-24 flex-1 flex-col justify-center px-4 py-4 sm:px-5 [&:nth-child(2n)]:border-l [&:nth-child(2n)]:border-line sm:[&:nth-child(2n)]:border-l-0";
        return it.href ? (
          <Link key={it.label} href={it.href} className={`${base} hover:bg-surface-2`}>{cuerpo}</Link>
        ) : (
          <div key={it.label} className={base}>{cuerpo}</div>
        );
      })}
    </dl>
  );
}

/** Compatibilidad: tarjeta de cifra individual (usa Cifras para rieles). */
export function StatCard({ label, value, href }: { label: string; value: ReactNode; href?: string }) {
  return <Cifras items={[{ label, value, href }]} />;
}

/** Tabla de datos: filas con líneas finas, encabezado discreto, scroll lateral en móvil. */
export function Tabla({ headers, rows, empty = "Sin datos." }: { headers: string[]; rows: ReactNode[][]; empty?: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-ink-3">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={headers.length} className="px-4 py-8 text-center text-ink-3">{empty}</td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line hover:bg-surface-2">
              {r.map((cell, j) => (
                <td key={j} className="px-4 py-3 align-middle tabular-nums">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* Monocromo: las entradas van rellenas, las salidas en contorno. El texto siempre nombra el tipo. */
const TIPO_LABEL: Record<string, string> = {
  RECEPCION: "Recepción",
  ENTREGA: "Entrega",
  MERMA: "Merma",
  TRANSFERENCIA_SALIDA: "Transf. salida",
  TRANSFERENCIA_ENTRADA: "Transf. entrada",
  AJUSTE: "Ajuste",
};
const ENTRADAS = new Set(["RECEPCION", "TRANSFERENCIA_ENTRADA"]);

export function TipoBadge({ tipo }: { tipo: string }) {
  const entrada = ENTRADAS.has(tipo);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
        entrada ? "bg-ink text-bg" : "border border-line-2 text-ink-2"
      }`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${entrada ? "bg-bg" : "bg-ink-3"}`} />
      {TIPO_LABEL[tipo] ?? tipo}
    </span>
  );
}

/** Pastilla genérica: neutra, rellena (activo), ámbar (pendiente) o roja (error). */
export function Pill({ children, tono = "neutro" }: { children: ReactNode; tono?: "neutro" | "lleno" | "warn" | "danger" | "apagado" }) {
  const map = {
    neutro: "border border-line-2 text-ink-2",
    lleno: "bg-ink text-bg",
    warn: "bg-warn-bg text-warn",
    danger: "bg-danger-bg text-danger",
    apagado: "bg-surface-3 text-ink-3 line-through",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[tono]}`}>{children}</span>;
}

/** Activo / Inactivo, Activa / Cerrada. */
export function EstadoActivo({ activo, labels = ["Activo", "Inactivo"] }: { activo: boolean; labels?: [string, string] }) {
  return <Pill tono={activo ? "lleno" : "neutro"}>{activo ? labels[0] : labels[1]}</Pill>;
}

const ESTADO_LABEL: Record<string, [string, "warn" | "lleno" | "apagado"]> = {
  PENDIENTE: ["Pendiente", "warn"],
  APROBADO: ["Aprobado", "lleno"],
  RECHAZADO: ["Rechazado", "apagado"],
};

/** Estado de aprobación (merma o cuenta). Para APROBADO devuelve null salvo `siempre`. */
export function EstadoBadge({ estado, siempre = false }: { estado: string; siempre?: boolean }) {
  if (estado === "APROBADO" && !siempre) return null;
  const [label, tono] = ESTADO_LABEL[estado] ?? [estado, "neutro" as const];
  return <Pill tono={tono}>{label}</Pill>;
}

export function fmtFecha(d: Date | string) {
  return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

/** Barra de avance 0..100 en blanco sobre línea; el porcentaje va siempre en texto al lado. */
export function BarraProgreso({ porcentaje }: { porcentaje: number }) {
  const p = Math.max(0, Math.min(100, porcentaje));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${p >= 100 ? "bg-ink" : "bg-ink-2"}`} style={{ width: `${p}%` }} />
    </div>
  );
}

/** Enlace de descarga CSV (el navegador descarga por Content-Disposition). */
export function BotonCsv({ href, label = "Exportar CSV" }: { href: string; label?: string }) {
  return (
    <a href={href} className={`${cls.btnSecondary} ${cls.btnSm}`}>
      <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
      {label}
    </a>
  );
}

/** Dato etiqueta/valor para fichas. */
export function Info({ label, value }: { label: string; value?: ReactNode | null }) {
  return (
    <div className="border-t border-line py-3 first:border-t-0 sm:border-t-0 sm:border-l sm:px-4 sm:py-0 sm:first:border-l-0 sm:first:pl-0">
      <div className="text-xs text-ink-3">{label}</div>
      <div className="mt-0.5 font-medium text-ink">{value ?? "—"}</div>
    </div>
  );
}

export function fmtNum(n: number) {
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(n);
}
