import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ok, fail, handleError } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/movimientos/:id/confirmar — la institución receptora confirma
// que recibió la entrega. También puede confirmar el COORDINADOR.
export async function PATCH(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireUser();
    const { id } = await params;

    const mov = await prisma.movimiento.findUnique({ where: { id } });
    if (!mov) return fail("Movimiento no encontrado.", 404);
    if (mov.tipo !== "ENTREGA") return fail("Solo se confirman movimientos de tipo ENTREGA.", 422);

    const esInstitucionDestino =
      session.rol === "INSTITUCION" &&
      session.institucionId != null &&
      mov.institucionId === session.institucionId;

    if (session.rol !== "COORDINADOR" && !esInstitucionDestino) {
      return fail("Solo la institución receptora puede confirmar esta entrega.", 403);
    }

    const actualizado = await prisma.movimiento.update({
      where: { id },
      data: { confirmadaRecibida: true, confirmadaAt: new Date() },
    });
    return ok(actualizado);
  } catch (err) {
    return handleError(err);
  }
}
