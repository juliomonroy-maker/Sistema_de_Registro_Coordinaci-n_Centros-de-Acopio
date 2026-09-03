import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const BADGE: Record<string, string> = {
  SOLICITADA: "bg-blue-100 text-blue-700",
  APROBADA: "bg-indigo-100 text-indigo-700",
  EN_TRANSITO: "bg-amber-100 text-amber-700",
  COMPLETADA: "bg-green-100 text-green-700",
  CANCELADA: "bg-gray-100 text-gray-500",
};

export default async function TransferenciasPage() {
  const transferencias = await prisma.transferencia.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      origen: { select: { nombre: true } },
      destino: { select: { nombre: true } },
      items: { include: { insumo: true } },
    },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Transferencias entre centros</h1>
      <div className="space-y-3">
        {transferencias.length === 0 && (
          <p className="text-gray-400">Sin transferencias registradas.</p>
        )}
        {transferencias.map((t) => (
          <div key={t.id} className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="font-semibold">{t.origen.nombre}</span>
                <span className="mx-2 text-gray-400">→</span>
                <span className="font-semibold">{t.destino.nombre}</span>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE[t.estado]}`}>
                {t.estado}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {t.items.map((i) => (
                <span key={i.id} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
                  {i.insumo.nombre}: {i.cantidad} {i.insumo.unidad}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
