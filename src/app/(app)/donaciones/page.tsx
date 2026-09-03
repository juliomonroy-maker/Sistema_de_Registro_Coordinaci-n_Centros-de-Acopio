import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DonacionesPage() {
  const donaciones = await prisma.donacion.findMany({
    orderBy: { fecha: "desc" },
    take: 100,
    include: {
      centro: { select: { nombre: true } },
      items: { include: { insumo: true } },
      registradaPor: { select: { nombre: true } },
    },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Donaciones recibidas</h1>
      <div className="space-y-3">
        {donaciones.length === 0 && <p className="text-gray-400">Sin donaciones registradas.</p>}
        {donaciones.map((d) => (
          <div key={d.id} className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold">{d.donanteNombre ?? "Anónimo"}</span>
                <span className="ml-2 text-sm text-gray-500">→ {d.centro.nombre}</span>
              </div>
              <span className="text-sm text-gray-400">
                {new Date(d.fecha).toLocaleDateString("es-MX")}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {d.items.map((i) => (
                <span key={i.id} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs text-brand-700">
                  {i.insumo.nombre}: {i.cantidad} {i.insumo.unidad}
                </span>
              ))}
            </div>
            {d.registradaPor && (
              <p className="mt-2 text-xs text-gray-400">Registró: {d.registradaPor.nombre}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
