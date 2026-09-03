import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { alcanceMovimientos } from "@/lib/movimientos";
import { signoDeMovimiento } from "@/lib/stock";
import { movimientosFiltroSchema } from "@/lib/validation";
import { Tabla, TipoBadge, BotonCsv, fmtFecha, fmtNum } from "@/components/ui";

export const dynamic = "force-dynamic";

const TIPOS = [
  ["RECEPCION", "Recepción"],
  ["ENTREGA", "Entrega"],
  ["MERMA", "Merma"],
  ["TRANSFERENCIA_SALIDA", "Transf. salida"],
  ["TRANSFERENCIA_ENTRADA", "Transf. entrada"],
  ["AJUSTE", "Ajuste"],
] as const;

const field = "rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none";

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
        <h1 className="text-2xl font-bold">Movimientos</h1>
        <div className="flex gap-2">
          <BotonCsv href={`/api/movimientos/export${qs ? `?${qs}` : ""}`} />
          {puedeRegistrar && (
            <Link href="/movimientos/nuevo" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
              + Registrar
            </Link>
          )}
        </div>
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border bg-white p-3 text-sm">
        <label>
          <span className="block text-xs text-gray-500">Tipo</span>
          <select name="tipo" defaultValue={crudo.tipo ?? ""} className={field}>
            <option value="">Todos</option>
            {TIPOS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        {session.rol !== "INSTITUCION" && (
          <label>
            <span className="block text-xs text-gray-500">Campaña</span>
            <select name="campanaId" defaultValue={crudo.campanaId ?? ""} className={field}>
              <option value="">Todas</option>
              {campanas.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span className="block text-xs text-gray-500">Desde</span>
          <input type="date" name="desde" defaultValue={crudo.desde ?? ""} className={field} />
        </label>
        <label>
          <span className="block text-xs text-gray-500">Hasta</span>
          <input type="date" name="hasta" defaultValue={crudo.hasta ?? ""} className={field} />
        </label>
        <button type="submit" className="rounded-md border px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-100">
          Filtrar
        </button>
        {qs && (
          <Link href="/movimientos" className="px-2 py-1.5 text-gray-500 hover:underline">
            Limpiar
          </Link>
        )}
        <span className="ml-auto text-xs text-gray-400">{movimientos.length} resultados{movimientos.length === 200 ? " (máx. 200; usa CSV para todo)" : ""}</span>
      </form>

      <Tabla
        headers={["Fecha", "Tipo", "Centro", "Artículo", "Cantidad", "Destino", "Actor", "Motivo"]}
        rows={movimientos.map((m) => {
          const signo = signoDeMovimiento(m.tipo, m.signoPositivo);
          const destino = m.institucion?.nombre ?? m.centroDestino?.nombre ?? "—";
          return [
            fmtFecha(m.fecha),
            <TipoBadge key="t" tipo={m.tipo} />,
            m.centro.nombre,
            m.articulo.nombre,
            <span key="c" className={signo > 0 ? "text-green-700" : "text-red-700"}>
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
