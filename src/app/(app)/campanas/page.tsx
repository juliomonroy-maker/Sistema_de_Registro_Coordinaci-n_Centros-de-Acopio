import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { fmtFecha } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CampanasPage() {
  const session = await getSession();
  const esCoordinador = session?.rol === "COORDINADOR";

  const campanas = await prisma.campana.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      lider: { select: { nombre: true } },
      _count: { select: { centros: true, movimientos: true } },
    },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Campañas</h1>
        {esCoordinador && (
          <Link
            href="/campanas/nueva"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            + Nueva campaña
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {campanas.length === 0 && <p className="text-gray-400">Sin campañas.</p>}
        {campanas.map((c) => (
          <Link key={c.id} href={`/campanas/${c.id}`} className="rounded-xl border bg-white p-5 shadow-sm transition hover:shadow">
            <div className="flex items-start justify-between">
              <h2 className="font-semibold">{c.nombre}</h2>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.activa ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {c.activa ? "Activa" : "Cerrada"}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">Inicio: {fmtFecha(c.fechaInicio)}</p>
            <div className="mt-3 flex gap-4 text-xs text-gray-500">
              <span>{c._count.centros} centros</span>
              <span>{c._count.movimientos} movimientos</span>
              <span>Líder: {c.lider?.nombre ?? "—"}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
