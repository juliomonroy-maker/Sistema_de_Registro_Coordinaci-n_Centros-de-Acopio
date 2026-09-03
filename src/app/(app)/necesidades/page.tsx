import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const BADGE: Record<string, string> = {
  URGENTE: "bg-red-100 text-red-700",
  ALTA: "bg-orange-100 text-orange-700",
  MEDIA: "bg-yellow-100 text-yellow-700",
  BAJA: "bg-gray-100 text-gray-600",
};

export default async function NecesidadesPage() {
  const necesidades = await prisma.necesidad.findMany({
    where: { cubierta: false },
    orderBy: [{ prioridad: "desc" }, { createdAt: "desc" }],
    include: { centro: { select: { nombre: true, ciudad: true } }, insumo: true },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Necesidades activas</h1>
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
            {necesidades.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  No hay necesidades activas.
                </td>
              </tr>
            )}
            {necesidades.map((n) => (
              <tr key={n.id} className="border-t">
                <td className="px-4 py-2">
                  {n.centro.nombre}
                  <span className="ml-1 text-xs text-gray-400">{n.centro.ciudad}</span>
                </td>
                <td className="px-4 py-2">{n.insumo.nombre}</td>
                <td className="px-4 py-2">
                  {n.cantidadRequerida} {n.insumo.unidad}
                </td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGE[n.prioridad]}`}>
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
