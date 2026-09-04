import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { puedeVerCampana } from "@/lib/auth";
import { calcularStock, progresoMetas } from "@/lib/stock";
import { StatCard, Tabla, BotonCsv, fmtFecha, fmtNum } from "@/components/ui";
import { MetasCampana } from "@/components/MetasCampana";
import { CampanaAdmin } from "@/components/CampanaAdmin";

export const dynamic = "force-dynamic";

export default async function CampanaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await puedeVerCampana(session, id))) redirect("/dashboard");

  const campana = await prisma.campana.findUnique({
    where: { id },
    include: {
      lider: { select: { nombre: true } },
      centros: { include: { centro: { select: { id: true, nombre: true, ciudad: true, activo: true } } } },
    },
  });
  if (!campana) notFound();

  const esCoord = session.rol === "COORDINADOR";
  const [stock, metas, recepciones, lideres, todosCentros] = await Promise.all([
    calcularStock({ campanaId: id }),
    progresoMetas(id),
    prisma.movimiento.aggregate({ where: { campanaId: id, tipo: "RECEPCION", estado: "APROBADO" }, _sum: { cantidad: true }, _count: true }),
    esCoord
      ? prisma.usuario.findMany({
          where: { rol: "LIDER_CAMPANA", activo: true, estado: "APROBADO" },
          select: { id: true, nombre: true, email: true },
          orderBy: { nombre: "asc" },
        })
      : Promise.resolve([]),
    prisma.centro.findMany({ select: { id: true, nombre: true, activo: true }, orderBy: [{ activo: "desc" }, { nombre: "asc" }] }),
  ]);
  const totalUnidades = stock.reduce((a, s) => a + s.cantidad, 0);
  const avanceGlobal = metas.length ? Math.round(metas.reduce((a, m) => a + m.porcentaje, 0) / metas.length) : null;

  return (
    <div>
      <Link href="/campanas" className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink">
        <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg> Campañas
      </Link>
      <div className="mb-6 mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{campana.nombre}</h1>
          <p className="text-sm text-ink-3">
            {campana.descripcion ?? ""} {campana.meta ? `· Meta: ${campana.meta}` : ""}
          </p>
          <p className="mt-1 text-xs text-ink-3">
            Inicio {fmtFecha(campana.fechaInicio)}
            {campana.fechaFin ? ` · Fin ${fmtFecha(campana.fechaFin)}` : ""} · Líder{" "}
            {campana.lider?.nombre ?? "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BotonCsv href={`/api/movimientos/export?campanaId=${id}`} label="Movimientos CSV" />
          <BotonCsv href={`/api/stock/export?campanaId=${id}`} label="Stock CSV" />
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${campana.activa ? "bg-ink/10 text-ink" : "bg-surface-2 text-ink-3"}`}>
            {campana.activa ? "Activa" : "Cerrada"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Centros participantes" value={campana.centros.length} />
        <StatCard label="Donaciones recibidas" value={recepciones._count} />
        <StatCard label="Unidades en stock" value={fmtNum(totalUnidades)} />
        <StatCard label="Avance de metas" value={avanceGlobal == null ? "—" : `${avanceGlobal}%`} />
      </div>

      <div className="mt-8">
        <CampanaAdmin
          campanaId={id}
          liderActual={campana.liderId}
          lideres={lideres}
          centros={todosCentros}
          participantes={campana.centros.map((c) => c.centro.id)}
          puedeCambiarLider={esCoord}
        />
      </div>

      <div className="mt-8">
        <MetasCampana campanaId={id} inicial={metas} editable={true} />
      </div>

      <h2 className="mb-3 mt-10 text-base font-semibold sm:text-lg">Centros participantes</h2>
      <Tabla
        headers={["Centro", "Ciudad", "Estado"]}
        rows={campana.centros.map((c) => [
          session.rol === "COORDINADOR" ? (
            <Link key="l" href={`/centros/${c.centro.id}`} className="text-ink underline-offset-4 hover:underline">
              {c.centro.nombre}
            </Link>
          ) : (
            c.centro.nombre
          ),
          c.centro.ciudad,
          c.centro.activo ? "Activo" : "Inactivo",
        ])}
        empty="Ningún centro vinculado."
      />

      <h2 className="mb-3 mt-10 text-base font-semibold sm:text-lg">Stock agregado</h2>
      <Tabla
        headers={["Artículo", "Categoría", "Existencia"]}
        rows={stock.map((s) => [s.nombre, s.categoria, `${fmtNum(s.cantidad)} ${s.unidad}`])}
        empty="Sin existencias."
      />
    </div>
  );
}
