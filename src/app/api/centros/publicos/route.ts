import { prisma } from "@/lib/prisma";
import { ok, handleError } from "@/lib/api";

// GET /api/centros/publicos — público (login, registro de voluntarios).
// Centros activos con dirección y coordenadas: son puntos de donación abiertos
// al público. No expone stock, encargado ni nada operativo.
export async function GET() {
  try {
    const centros = await prisma.centro.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, institucion: true, direccion: true, ciudad: true, estado: true, latitud: true, longitud: true },
      orderBy: { nombre: "asc" },
    });
    return ok(centros);
  } catch (err) {
    return handleError(err);
  }
}
