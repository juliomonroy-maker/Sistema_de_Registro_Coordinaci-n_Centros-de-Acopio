import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { puedeVerCampana } from "@/lib/auth";
import { calcularStock, progresoMetas } from "@/lib/stock";
import { StatCard, Tabla, BotonCsv, fmtFecha, fmtNum } from "@/components/ui";
import { MetasCampana } from "@/components/MetasCampana";

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

  const [stock, metas, recepciones] = await Promise.all([
    calcularStock({ campanaId: id }),
    progresoMetas(id),
    prisma.movimiento.aggregate({ where: { campanaId: id, tipo: "RECEPCION" }, _sum: { cantidad: true }, _count: true }),
  ]);
  const totalUnidades = stock.reduce((a, s) => a + s.cantidad, 0);
  const avanceGlobal = metas.length ? Math.round(metas.reduce((a, m) => a + m.porcentaje, 0) / metas.length) : null;

  return (
    <div>
      <Link href="/campanas" className="text-sm text-brand-700 hover:underline">
        ← Campañas
      </Link>
      <div className="mb-6 mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{campana.nombre}</h1>
          <p className="text-sm text-gray-500">
            {campana.descripcion ?? ""} {campana.meta ? `· Meta: ${campana.meta}` : ""}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Inicio {fmtFecha(campana.fechaInicio)}
            {campana.fechaFin ? ` · Fin ${fmtFecha(campana.fechaFin)}` : ""} · Líder{" "}
            {campana.lider?.nombre ?? "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BotonCsv href={`/api/movimientos/export?campanaId=${id}`} label="Movimientos CSV" />
          <BotonCsv href={`/api/stock/export?campanaId=${id}`} label="Stock CSV" />
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${campana.activa ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
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
        <MetasCampana campanaId={id} inicial={metas} editable={true} />
      </div>

      <h2 className="mb-3 mt-10 text-lg font-semibold">Centros participantes</h2>
      <Tabla
        headers={["Centro", "Ciudad", "Estado"]}
        rows={campana.centros.map((c) => [
          session.rol === "COORDINADOR" ? (
            <Link key="l" href={`/centros/${c.centro.id}`} className="text-brand-700 hover:underline">
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

      <h2 className="mb-3 mt-10 text-lg font-semibold">Stock agregado</h2>
      <Tabla
        headers={["Artículo", "Categoría", "Existencia"]}
        rows={stock.map((s) => [s.nombre, s.categoria, `${fmtNum(s.cantidad)} ${s.unidad}`])}
        empty="Sin existencias."
      />
    </div>
  );
}
