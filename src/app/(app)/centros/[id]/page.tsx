import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CentroDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const centro = await prisma.centro.findUnique({
    where: { id },
    include: {
      inventario: { include: { insumo: { include: { categoria: true } } }, orderBy: { updatedAt: "desc" } },
      necesidades: { include: { insumo: true }, orderBy: { prioridad: "desc" } },
      usuarios: { select: { id: true, nombre: true, rol: true } },
    },
  });
  if (!centro) notFound();

  return (
    <div>
      <Link href="/centros" className="text-sm text-brand-700 hover:underline">
        ← Centros
      </Link>
      <div className="mb-6 mt-2 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{centro.nombre}</h1>
          <p className="text-sm text-gray-500">
            {centro.direccion}, {centro.ciudad}, {centro.estado}
          </p>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
          {centro.situacion}
        </span>
      </div>

      <div className="grid gap-4 text-sm md:grid-cols-3">
        <Info label="Responsable" value={centro.responsable} />
        <Info label="Teléfono" value={centro.telefono} />
        <Info label="Horario" value={centro.horario} />
        <Info label="Email" value={centro.email} />
        <Info label="Capacidad" value={centro.capacidad?.toString()} />
        <Info
          label="Coordenadas"
          value={centro.latitud && centro.longitud ? `${centro.latitud}, ${centro.longitud}` : null}
        />
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Inventario</h2>
        <Tabla
          headers={["Insumo", "Categoría", "Cantidad"]}
          rows={centro.inventario.map((i) => [
            i.insumo.nombre,
            i.insumo.categoria.nombre,
            `${i.cantidad} ${i.insumo.unidad}`,
          ])}
          empty="Sin inventario registrado."
        />
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Necesidades</h2>
        <Tabla
          headers={["Insumo", "Cantidad", "Prioridad", "Estado"]}
          rows={centro.necesidades.map((n) => [
            n.insumo.nombre,
            `${n.cantidadRequerida} ${n.insumo.unidad}`,
            n.prioridad,
            n.cubierta ? "Cubierta" : "Pendiente",
          ])}
          empty="Sin necesidades registradas."
        />
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="mt-0.5 font-medium">{value ?? "—"}</div>
    </div>
  );
}

function Tabla({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: string[][];
  empty: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-500">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-2">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={headers.length} className="px-4 py-6 text-center text-gray-400">
                {empty}
              </td>
            </tr>
          )}
          {rows.map((r, idx) => (
            <tr key={idx} className="border-t">
              {r.map((cell, i) => (
                <td key={i} className="px-4 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
