import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { calcularStock } from "@/lib/stock";
import { alcanceStock } from "@/lib/movimientos";
import { ok, handleError } from "@/lib/api";

// GET /api/stock?centroId=&campanaId=  — stock derivado del ledger, acotado por rol.
export async function GET(req: NextRequest) {
  try {
    const session = await requireUser();
    const sp = new URL(req.url).searchParams;
    const filtro = await alcanceStock(session, {
      centroId: sp.get("centroId") || undefined,
      campanaId: sp.get("campanaId") || undefined,
    });
    return ok(await calcularStock(filtro));
  } catch (err) {
    return handleError(err);
  }
}
