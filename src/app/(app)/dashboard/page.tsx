import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function Stat({ label, value, href }: { label: string; value: number; href?: string }) {
  const card = (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="text-3xl font-bold text-brand-700">{value}</div>
      <div className="mt-1 text-sm text-gray-500">{label}</div>
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

export default async function DashboardPage() {
  const [centros, centrosActivos, donaciones, urgentes, transferencias] = await Promise.all([
    prisma.centro.count(),
    prisma.centro.count({ where: { situacion: "ACTIVO" } }),
    prisma.donacion.count(),
    prisma.necesidad.count({ where: { cubierta: false, prioridad: "URGENTE" } }),
    prisma.transferencia.count({
      where: { estado: { in: ["SOLICITADA", "APROBADA", "EN_TRANSITO"] } },
    }),
  ]);

  const necesidadesUrgentes = await prisma.necesidad.findMany({
    where: { cubierta: false, prioridad: { in: ["URGENTE", "ALTA"] } },
    orderBy: [{ prioridad: "desc" }],
    take: 8,
    include: { centro: { select: { nombre: true } }, insumo: true },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Panel general</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Stat label="Centros" value={centros} href="/centros" />
        <Stat label="Centros activos" value={centrosActivos} />
        <Stat label="Donaciones" value={donaciones} href="/donaciones" />
        <Stat label="Necesidades urgentes" value={urgentes} href="/necesidades" />
        <Stat label="Transferencias en curso" value={transferencias} href="/transferencias" />
      </div>

      <h2 className="mb-3 mt-10 text-lg font-semibold">Necesidades prioritarias</h2>
      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Centro</th>
              <th className="px-4 py-2">Insumo</th>
              <th className="px-4 py-2">Cantidad</th>
              <th className="px-4 py-2">Prioridad</th>
            </tr>
          </thead>
          <tbody>
            {necesidadesUrgentes.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  Sin necesidades prioritarias.
                </td>
              </tr>
            )}
            {necesidadesUrgentes.map((n) => (
              <tr key={n.id} className="border-t">
                <td className="px-4 py-2">{n.centro.nombre}</td>
                <td className="px-4 py-2">{n.insumo.nombre}</td>
                <td className="px-4 py-2">
                  {n.cantidadRequerida} {n.insumo.unidad}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      n.prioridad === "URGENTE"
                        ? "bg-red-100 text-red-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {n.prioridad}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
