import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { puedeVerCentro } from "@/lib/auth";
import { SOLO_APROBADOS, signoDeMovimiento } from "@/lib/stock";
import { MapaCentrosCliente } from "@/components/MapaCentrosCliente";
import type { CentroMapa } from "@/components/MapaCentros";

export const dynamic = "force-dynamic";

// Mapa de todos los centros con coordenadas. Existencia total por centro
// derivada del ledger (una agregación para todos los centros).
export default async function MapaPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [centros, sumas] = await Promise.all([
    prisma.centro.findMany({
      orderBy: { nombre: "asc" },
      include: { encargado: { select: { nombre: true } } },
    }),
    prisma.movimiento.groupBy({ by: ["centroId", "tipo", "signoPositivo"], where: SOLO_APROBADOS, _sum: { cantidad: true } }),
  ]);
  const unidades = new Map<string, number>();
  for (const g of sumas) {
    unidades.set(g.centroId, (unidades.get(g.centroId) ?? 0) + signoDeMovimiento(g.tipo, g.signoPositivo) * (g._sum.cantidad ?? 0));
  }

  const conCoords: CentroMapa[] = centros
    .filter((c) => c.latitud != null && c.longitud != null)
    .map((c) => ({
      id: c.id,
      nombre: c.nombre,
      direccion: c.direccion,
      ciudad: c.ciudad,
      latitud: c.latitud as number,
      longitud: c.longitud as number,
      activo: c.activo,
      encargado: c.encargado?.nombre ?? null,
      unidades: unidades.get(c.id) ?? 0,
      href: puedeVerCentro(session, c.id) ? `/centros/${c.id}` : null,
    }));
  const sinCoords = centros.filter((c) => c.latitud == null || c.longitud == null);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Mapa de centros</h1>
        {session.rol === "COORDINADOR" && (
          <Link href="/centros" className="text-sm text-ink underline-offset-4 hover:underline">Ver lista</Link>
        )}
      </div>
      <p className="mb-4 text-sm text-ink-3">
        {conCoords.length} centros ubicados · verde = activo, gris = inactivo. Clic en un marcador para ver existencia y datos.
      </p>
      <MapaCentrosCliente centros={conCoords} alto={520} tema="oscuro" />
      {sinCoords.length > 0 && (
        <p className="mt-3 text-xs text-ink-3">
          Sin coordenadas (no aparecen en el mapa): {sinCoords.map((c) => c.nombre).join(", ")}.
          {session.rol === "COORDINADOR" && " Edítalos vía PATCH /api/centros/:id con latitud y longitud."}
        </p>
      )}
    </div>
  );
}
