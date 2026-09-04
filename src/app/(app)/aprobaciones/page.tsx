import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { stockDisponible } from "@/lib/stock";
import { MermasPendientes, VoluntariosPendientes } from "@/components/Aprobaciones";

export const dynamic = "force-dynamic";

// Bandeja de aprobaciones.
// COORDINADOR: mermas solicitadas por encargados (todas) + voluntarios pendientes (todos).
// ENCARGADO: voluntarios pendientes de su centro; ve sus propias mermas en espera (solo lectura).
export default async function AprobacionesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "COORDINADOR" && session.rol !== "ENCARGADO") redirect("/dashboard");

  const esCoord = session.rol === "COORDINADOR";
  const centroId = session.centroId ?? "";

  const [mermasRaw, voluntarios] = await Promise.all([
    prisma.movimiento.findMany({
      where: { tipo: "MERMA", estado: "PENDIENTE", ...(esCoord ? {} : { centroId }) },
      orderBy: { fecha: "asc" },
      include: {
        articulo: { select: { nombre: true, unidad: true } },
        centro: { select: { nombre: true } },
        campana: { select: { nombre: true } },
        actor: { select: { nombre: true } },
      },
    }),
    prisma.usuario.findMany({
      where: { rol: "VOLUNTARIO", estado: "PENDIENTE", ...(esCoord ? {} : { centroId }) },
      orderBy: { createdAt: "asc" },
      select: { id: true, nombre: true, email: true, createdAt: true, centro: { select: { nombre: true } } },
    }),
  ]);

  // Disponible actual por línea, para que el coordinador vea si la merma alcanza antes de aprobar.
  const mermas = await Promise.all(
    mermasRaw.map(async (m) => ({
      ...m,
      fecha: m.fecha.toISOString(),
      disponible: await stockDisponible(m.centroId, m.campanaId, m.articuloId),
    })),
  );

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight sm:text-3xl">Aprobaciones</h1>
      <p className="mb-6 text-sm text-ink-3">
        {esCoord
          ? "Mermas solicitadas por encargados y cuentas de voluntarios en espera."
          : "Voluntarios que pidieron unirse a tu centro y tus mermas en espera del coordinador."}
      </p>

      <h2 className="mb-3 text-base font-semibold sm:text-lg">Voluntarios pendientes ({voluntarios.length})</h2>
      <VoluntariosPendientes voluntarios={voluntarios.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() }))} />

      <h2 className="mb-3 mt-10 text-base font-semibold sm:text-lg">Mermas pendientes ({mermas.length})</h2>
      {esCoord ? (
        <MermasPendientes mermas={mermas} />
      ) : (
        <MermasSoloLectura mermas={mermas} />
      )}
    </div>
  );
}

function MermasSoloLectura({ mermas }: { mermas: { id: string; fecha: string; cantidad: number; motivo: string | null; articulo: { nombre: string; unidad: string }; campana: { nombre: string } }[] }) {
  if (mermas.length === 0) return <p className="text-sm text-ink-3">No tienes mermas en espera.</p>;
  return (
    <ul className="divide-y divide-line rounded-xl border border-line bg-surface text-sm">
      {mermas.map((m) => (
        <li key={m.id} className="flex items-center justify-between px-4 py-2">
          <span>
            {new Date(m.fecha).toLocaleDateString("es-MX")} · {m.articulo.nombre} · <b className="text-danger">−{m.cantidad} {m.articulo.unidad}</b> · {m.campana.nombre}
          </span>
          <span className="rounded-full bg-warn-bg px-2 py-0.5 text-xs font-medium text-warn">Pendiente</span>
        </li>
      ))}
    </ul>
  );
}
