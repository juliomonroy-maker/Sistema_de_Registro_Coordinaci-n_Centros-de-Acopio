import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const BADGE: Record<string, string> = {
  ACTIVO: "bg-green-100 text-green-700",
  INACTIVO: "bg-gray-100 text-gray-600",
  LLENO: "bg-amber-100 text-amber-700",
};

export default async function CentrosPage() {
  const centros = await prisma.centro.findMany({
    orderBy: { nombre: "asc" },
    include: { _count: { select: { inventario: true, necesidades: true } } },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Centros de acopio</h1>
        <Link
          href="/centros/nuevo"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + Nuevo centro
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {centros.map((c) => (
          <Link
            key={c.id}
            href={`/centros/${c.id}`}
            className="rounded-xl border bg-white p-5 shadow-sm transition hover:shadow"
          >
            <div className="flex items-start justify-between">
              <h2 className="font-semibold">{c.nombre}</h2>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGE[c.situacion]}`}>
                {c.situacion}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {c.direccion}, {c.ciudad}
            </p>
            <div className="mt-3 flex gap-4 text-xs text-gray-500">
              <span>{c._count.inventario} insumos</span>
              <span>{c._count.necesidades} necesidades</span>
            </div>
          </Link>
        ))}
        {centros.length === 0 && (
          <p className="text-gray-400">Aún no hay centros registrados.</p>
        )}
      </div>
    </div>
  );
}
