import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { puedeVerCentro } from "@/lib/auth";
import { calcularStock, signoDeMovimiento } from "@/lib/stock";
import { Tabla, TipoBadge, EstadoBadge, BotonCsv, fmtFecha, fmtNum } from "@/components/ui";
import { MapaCentrosCliente } from "@/components/MapaCentrosCliente";

export const dynamic = "force-dynamic";

export default async function CentroDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!puedeVerCentro(session, id)) redirect("/dashboard");

  const centro = await prisma.centro.findUnique({
    where: { id },
    include: {
      encargado: { select: { nombre: true, email: true } },
      miembros: { select: { id: true, nombre: true, rol: true } },
      campanas: { include: { campana: { select: { nombre: true, activa: true } } } },
    },
  });
  if (!centro) notFound();

  const [stock, movimientos] = await Promise.all([
    calcularStock({ centroId: id }),
    prisma.movimiento.findMany({
      where: { centroId: id },
      orderBy: { fecha: "desc" },
      take: 20,
      include: { articulo: true, actor: { select: { nombre: true } } },
    }),
  ]);

  return (
    <div>
      {session.rol === "COORDINADOR" && (
        <Link href="/centros" className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink">
          <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg> Centros
        </Link>
      )}
      <div className="mb-6 mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{centro.nombre}</h1>
          <p className="text-sm text-ink-3">
            {centro.direccion}, {centro.ciudad}, {centro.estado}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BotonCsv href={`/api/movimientos/export?centroId=${id}`} label="Movimientos CSV" />
          <BotonCsv href={`/api/stock/export?centroId=${id}`} label="Stock CSV" />
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              centro.activo ? "bg-ink/10 text-ink" : "bg-surface-2 text-ink-3"
            }`}
          >
            {centro.activo ? "Activo" : "Inactivo"}
          </span>
        </div>
      </div>

      <div className="grid gap-4 text-sm md:grid-cols-3">
        <Info label="Institución operadora" value={centro.institucion} />
        <Info label="Encargado" value={centro.encargado?.nombre} />
        <Info label="Teléfono" value={centro.telefono} />
        <Info
          label="Campañas"
          value={centro.campanas.map((c) => c.campana.nombre).join(", ") || null}
        />
        <Info
          label="Coordenadas"
          value={centro.latitud && centro.longitud ? `${centro.latitud}, ${centro.longitud}` : null}
        />
        <Info label="Miembros" value={centro.miembros.length.toString()} />
      </div>

      {centro.latitud != null && centro.longitud != null && (
        <section className="mt-6">
          <MapaCentrosCliente
            alto={280}
            tema="oscuro"
            centros={[{
              id: centro.id,
              nombre: centro.nombre,
              direccion: centro.direccion,
              ciudad: centro.ciudad,
              latitud: centro.latitud,
              longitud: centro.longitud,
              activo: centro.activo,
              encargado: centro.encargado?.nombre ?? null,
              unidades: stock.reduce((a, s) => a + s.cantidad, 0),
              href: null,
            }]}
          />
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-3 text-base font-semibold sm:text-lg">Inventario (stock derivado)</h2>
        <Tabla
          headers={["Artículo", "Categoría", "Existencia"]}
          rows={stock.map((s) => [s.nombre, s.categoria, `${fmtNum(s.cantidad)} ${s.unidad}`])}
          empty="Sin existencias."
        />
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-base font-semibold sm:text-lg">Movimientos recientes</h2>
        <Tabla
          headers={["Fecha", "Tipo", "Artículo", "Cantidad", "Actor"]}
          rows={movimientos.map((m) => {
            const signo = signoDeMovimiento(m.tipo, m.signoPositivo);
            return [
              fmtFecha(m.fecha),
              <span key="t" className="inline-flex flex-wrap gap-1">
                <TipoBadge tipo={m.tipo} />
                <EstadoBadge estado={m.estado} />
              </span>,
              m.articulo.nombre,
              `${signo > 0 ? "+" : "−"}${fmtNum(m.cantidad)} ${m.articulo.unidad}`,
              m.actor?.nombre ?? "—",
            ];
          })}
          empty="Sin movimientos."
        />
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="text-xs text-ink-3">{label}</div>
      <div className="mt-0.5 font-medium">{value ?? "—"}</div>
    </div>
  );
}
