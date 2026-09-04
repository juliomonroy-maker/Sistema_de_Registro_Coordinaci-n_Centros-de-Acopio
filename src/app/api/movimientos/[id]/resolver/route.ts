import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { resolverMerma } from "@/lib/movimientos";
import { resolucionSchema } from "@/lib/validation";
import { ok, handleError } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/movimientos/:id/resolver  body: { accion: "APROBAR" | "RECHAZAR", motivoRechazo? }
// Solo COORDINADOR. Aprueba o rechaza una MERMA solicitada por un encargado.
// Al aprobar se revalida el stock bajo lock; si no alcanza → 422 y sigue pendiente.
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireRole("COORDINADOR");
    const { id } = await params;
    const data = resolucionSchema.parse(await req.json());
    const mov = await resolverMerma({ id, accion: data.accion, aprobadorId: session.userId, motivoRechazo: data.motivoRechazo });
    return ok(mov);
  } catch (err) {
    return handleError(err);
  }
}
