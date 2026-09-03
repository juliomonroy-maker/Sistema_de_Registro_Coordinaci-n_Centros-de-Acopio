import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ok, handleError } from "@/lib/api";

// GET /api/stats — métricas para el dashboard.
export async function GET() {
  try {
    await requireUser();
    const [centros, centrosActivos, donaciones, necesidadesUrgentes, transferenciasPendientes] =
      await Promise.all([
        prisma.centro.count(),
        prisma.centro.count({ where: { situacion: "ACTIVO" } }),
        prisma.donacion.count(),
        prisma.necesidad.count({ where: { cubierta: false, prioridad: "URGENTE" } }),
        prisma.transferencia.count({
          where: { estado: { in: ["SOLICITADA", "APROBADA", "EN_TRANSITO"] } },
        }),
      ]);

    return ok({
      centros,
      centrosActivos,
      donaciones,
      necesidadesUrgentes,
      transferenciasPendientes,
    });
  } catch (err) {
    return handleError(err);
  }
}
