import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { transferenciaSchema } from "@/lib/validation";
import { registrarTransferencia, autorizarMovimiento } from "@/lib/movimientos";
import { ok, handleError } from "@/lib/api";

// POST /api/transferencias — crea salida+entrada ligadas en una transacción.
// Permitido a COORDINADOR y ENCARGADO (del centro origen). Voluntario NO.
export async function POST(req: NextRequest) {
  try {
    const session = await requireUser();
    const d = transferenciaSchema.parse(await req.json());
    // Autoriza como salida en el centro origen (bloquea voluntario / otro centro).
    autorizarMovimiento(session, "TRANSFERENCIA_SALIDA", d.origenId);

    const result = await registrarTransferencia({
      origenId: d.origenId,
      destinoId: d.destinoId,
      campanaId: d.campanaId,
      articuloId: d.articuloId,
      cantidad: d.cantidad,
      nota: d.nota ?? null,
      actorId: session.userId,
    });
    return ok(result, 201);
  } catch (err) {
    return handleError(err);
  }
}
