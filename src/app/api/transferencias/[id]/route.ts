import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/auth";
import { transferenciaEstadoSchema } from "@/lib/validation";
import { ajustarInventario } from "@/lib/inventario";
import { ok, fail, handleError } from "@/lib/api";
import type { EstadoTransferencia } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

// Transiciones de estado permitidas.
const TRANSICIONES: Record<EstadoTransferencia, EstadoTransferencia[]> = {
  SOLICITADA: ["APROBADA", "CANCELADA"],
  APROBADA: ["EN_TRANSITO", "CANCELADA"],
  EN_TRANSITO: ["COMPLETADA", "CANCELADA"],
  COMPLETADA: [],
  CANCELADA: [],
};

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const t = await prisma.transferencia.findUnique({
      where: { id },
      include: {
        origen: true,
        destino: true,
        items: { include: { insumo: true } },
        creadaPor: { select: { id: true, nombre: true } },
      },
    });
    if (!t) return fail("Transferencia no encontrada.", 404);
    return ok(t);
  } catch (err) {
    return handleError(err);
  }
}

// PATCH /api/transferencias/:id — cambia estado. Al COMPLETAR mueve el inventario.
// Solo ADMIN/COORDINADOR pueden cambiar estado.
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireRole("ADMIN", "COORDINADOR");
    const { id } = await params;
    const { estado: nuevo } = transferenciaEstadoSchema.parse(await req.json());

    const actual = await prisma.transferencia.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!actual) return fail("Transferencia no encontrada.", 404);

    if (!TRANSICIONES[actual.estado].includes(nuevo)) {
      return fail(`Transición no permitida: ${actual.estado} → ${nuevo}.`, 422);
    }

    const result = await prisma.$transaction(async (tx) => {
      // Al completar: resta del origen y suma al destino.
      if (nuevo === "COMPLETADA") {
        for (const item of actual.items) {
          await ajustarInventario(tx, actual.origenId, item.insumoId, -item.cantidad);
          await ajustarInventario(tx, actual.destinoId, item.insumoId, item.cantidad);
        }
      }
      return tx.transferencia.update({ where: { id }, data: { estado: nuevo } });
    });

    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
