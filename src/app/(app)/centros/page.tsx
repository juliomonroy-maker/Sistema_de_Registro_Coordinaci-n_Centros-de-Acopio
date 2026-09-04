import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CentrosPage() {
  const session = await getSession();
  const esCoordinador = session?.rol === "COORDINADOR";

  const centros = await prisma.centro.findMany({
    orderBy: { nombre: "asc" },
    include: {
      encargado: { select: { nombre: true } },
      _count: { select: { movimientos: true } },
    },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Centros de acopio</h1>
        <div className="flex items-center gap-3">
        <Link href="/mapa" className="inline-flex min-h-11 items-center justify-center rounded-md border border-line-2 px-4 text-sm font-medium text-ink hover:bg-surface-3">
          Ver mapa
        </Link>
        {esCoordinador && (
          <Link
            href="/centros/nuevo"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-bg hover:bg-ink-2"
          >
            + Nuevo centro
          </Link>
        )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {centros.length === 0 && <p className="text-ink-3">Aún no hay centros registrados.</p>}
        {centros.map((c) => (
          <Link
            key={c.id}
            href={`/centros/${c.id}`}
            className="rounded-xl border border-line bg-surface p-5 shadow-sm transition hover:shadow"
          >
            <div className="flex items-start justify-between">
              <h2 className="font-semibold">{c.nombre}</h2>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  c.activo ? "bg-ink/10 text-ink" : "bg-surface-2 text-ink-3"
                }`}
              >
                {c.activo ? "Activo" : "Inactivo"}
              </span>
            </div>
            <p className="mt-1 text-sm text-ink-3">
              {c.direccion}, {c.ciudad}
            </p>
            <div className="mt-3 flex gap-4 text-xs text-ink-3">
              <span>Encargado: {c.encargado?.nombre ?? "—"}</span>
              <span>{c._count.movimientos} movimientos</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
