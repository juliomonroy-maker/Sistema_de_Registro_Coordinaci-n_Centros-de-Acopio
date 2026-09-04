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
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Campañas</h1>
        {esCoordinador && (
          <Link
            href="/campanas/nueva"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-bg hover:bg-ink-2"
          >
            + Nueva campaña
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {campanas.length === 0 && <p className="text-ink-3">Sin campañas.</p>}
        {campanas.map((c) => (
          <Link key={c.id} href={`/campanas/${c.id}`} className="rounded-xl border border-line bg-surface p-5 shadow-sm transition hover:shadow">
            <div className="flex items-start justify-between">
              <h2 className="font-semibold">{c.nombre}</h2>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.activa ? "bg-ink/10 text-ink" : "bg-surface-2 text-ink-3"}`}>
                {c.activa ? "Activa" : "Cerrada"}
              </span>
            </div>
            <p className="mt-1 text-sm text-ink-3">Inicio: {fmtFecha(c.fechaInicio)}</p>
            <div className="mt-3 flex gap-4 text-xs text-ink-3">
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
