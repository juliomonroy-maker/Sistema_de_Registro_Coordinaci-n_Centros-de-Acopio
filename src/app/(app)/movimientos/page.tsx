import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { alcanceMovimientos } from "@/lib/movimientos";
import { signoDeMovimiento } from "@/lib/stock";
import { movimientosFiltroSchema } from "@/lib/validation";
import { Tabla, TipoBadge, EstadoBadge, BotonCsv, fmtFecha, fmtNum } from "@/components/ui";

export const dynamic = "force-dynamic";

const TIPOS = [
  ["RECEPCION", "Recepción"],
  ["ENTREGA", "Entrega"],
  ["MERMA", "Merma"],
  ["TRANSFERENCIA_SALIDA", "Transf. salida"],
  ["TRANSFERENCIA_ENTRADA", "Transf. entrada"],
  ["AJUSTE", "Ajuste"],
] as const;

const field = "min-h-11 rounded-md border border-line-2 bg-bg px-2 py-1.5 text-base text-ink focus:border-ink focus:outline-none sm:min-h-9 sm:text-sm";

type Search = Record<string, string | string[] | undefined>;

export default async function MovimientosPage({ searchParams }: { searchParams: Promise<Search> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Filtros del query string (inválidos → se ignoran) y alcance por rol.
  const sp = await searchParams;
  const crudo = Object.fromEntries(Object.entries(sp).filter(([, v]) => typeof v === "string" && v !== ""));
  const parsed = movimientosFiltroSchema.safeParse(crudo);
  const filtro = parsed.success ? parsed.data : {};
  const where = await alcanceMovimientos(session, filtro);

  const [movimientos, campanas] = await Promise.all([
    prisma.movimiento.findMany({
      where,
      orderBy: { fecha: "desc" },
      take: 200,
      include: {
        articulo: true,
        centro: { select: { nombre: true } },
        centroDestino: { select: { nombre: true } },
        actor: { select: { nombre: true } },
        institucion: { select: { nombre: true } },
      },
    }),
    prisma.campana.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
  ]);

  const qs = new URLSearchParams(crudo as Record<string, string>).toString();
  const puedeRegistrar = ["COORDINADOR", "ENCARGADO", "VOLUNTARIO"].includes(session.rol);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Movimientos</h1>
        <div className="flex gap-2">
          <BotonCsv href={`/api/movimientos/export${qs ? `?${qs}` : ""}`} />
          {puedeRegistrar && (
            <Link href="/movimientos/nuevo" className="inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-bg hover:bg-ink-2">
              + Registrar
            </Link>
          )}
        </div>
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-line bg-surface p-3 text-sm">
        <label>
          <span className="block text-xs text-ink-3">Tipo</span>
          <select name="tipo" defaultValue={crudo.tipo ?? ""} className={field}>
            <option value="">Todos</option>
            {TIPOS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        {session.rol !== "INSTITUCION" && (
          <label>
            <span className="block text-xs text-ink-3">Campaña</span>
            <select name="campanaId" defaultValue={crudo.campanaId ?? ""} className={field}>
              <option value="">Todas</option>
              {campanas.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </label>
        )}
        {session.rol !== "INSTITUCION" && (
          <label>
            <span className="block text-xs text-ink-3">Estado</span>
            <select name="estado" defaultValue={crudo.estado ?? ""} className={field}>
              <option value="">Todos</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="APROBADO">Aprobado</option>
              <option value="RECHAZADO">Rechazado</option>
            </select>
          </label>
        )}
        <label>
          <span className="block text-xs text-ink-3">Desde</span>
          <input type="date" name="desde" defaultValue={crudo.desde ?? ""} className={field} />
        </label>
        <label>
          <span className="block text-xs text-ink-3">Hasta</span>
          <input type="date" name="hasta" defaultValue={crudo.hasta ?? ""} className={field} />
        </label>
        <button type="submit" className="inline-flex min-h-11 items-center rounded-md border border-line-2 px-3 font-medium text-ink hover:bg-surface-3 sm:min-h-9">
          Filtrar
        </button>
        {qs && (
          <Link href="/movimientos" className="px-2 py-1.5 text-ink-3 hover:underline">
            Limpiar
          </Link>
        )}
        <span className="ml-auto text-xs text-ink-3">{movimientos.length} resultados{movimientos.length === 200 ? " (máx. 200; usa CSV para todo)" : ""}</span>
      </form>

      <Tabla
        headers={["Fecha", "Tipo", "Centro", "Artículo", "Cantidad", "Destino", "Actor", "Motivo"]}
        rows={movimientos.map((m) => {
          const signo = signoDeMovimiento(m.tipo, m.signoPositivo);
          const destino = m.institucion?.nombre ?? m.centroDestino?.nombre ?? "—";
          return [
            fmtFecha(m.fecha),
            <span key="t" className="inline-flex flex-wrap gap-1">
              <TipoBadge tipo={m.tipo} />
              <EstadoBadge estado={m.estado} />
            </span>,
            m.centro.nombre,
            m.articulo.nombre,
            <span key="c" className={signo > 0 ? "text-ink" : "text-danger"}>
              {signo > 0 ? "+" : "−"}
              {fmtNum(m.cantidad)} {m.articulo.unidad}
            </span>,
            destino,
            m.actor?.nombre ?? "—",
            m.motivo ?? "—",
          ];
        })}
        empty="Sin movimientos."
      />
    </div>
  );
}
