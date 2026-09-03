import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { calcularStock } from "@/lib/stock";
import { alcanceStock } from "@/lib/movimientos";
import { toCsv, csvResponse, nombreCsv } from "@/lib/csv";
import { handleError } from "@/lib/api";

// GET /api/stock/export?centroId=&campanaId=  — CSV del inventario derivado.
export async function GET(req: NextRequest) {
  try {
    const session = await requireUser();
    const sp = new URL(req.url).searchParams;
    const filtro = await alcanceStock(session, {
      centroId: sp.get("centroId") || undefined,
      campanaId: sp.get("campanaId") || undefined,
    });
    const stock = await calcularStock(filtro);
    const csv = toCsv(
      ["articulo_id", "articulo", "categoria", "unidad", "existencia"],
      stock.map((s) => [s.articuloId, s.nombre, s.categoria, s.unidad, s.cantidad]),
    );
    return csvResponse(nombreCsv("stock"), csv);
  } catch (err) {
    return handleError(err);
  }
}
