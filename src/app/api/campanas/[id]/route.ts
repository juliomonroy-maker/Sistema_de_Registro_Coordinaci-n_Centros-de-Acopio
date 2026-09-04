import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, puedeVerCampana, puedeGestionarCampana } from "@/lib/auth";
import { campanaUpdateSchema } from "@/lib/validation";
import { calcularStock, progresoMetas } from "@/lib/stock";
import { validarLider } from "@/lib/campanas";
import { ok, fail, handleError } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

// GET /api/campanas/:id — detalle + centros participantes + stock agregado + metas
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireUser();
    const { id } = await params;
    if (!(await puedeVerCampana(session, id))) return fail("No tienes permiso sobre esta campaña.", 403);

    const campana = await prisma.campana.findUnique({
      where: { id },
      include: {
        lider: { select: { id: true, nombre: true } },
        centros: { include: { centro: { select: { id: true, nombre: true, ciudad: true, activo: true } } } },
      },
    });
    if (!campana) return fail("Campaña no encontrada.", 404);
    const [stock, metas] = await Promise.all([calcularStock({ campanaId: id }), progresoMetas(id)]);
    return ok({ ...campana, stock, metas });
  } catch (err) {
    return handleError(err);
  }
}

// PATCH /api/campanas/:id — COORDINADOR: todo. LIDER de la campaña: datos,
// fechas, meta y centros participantes (no puede cambiar líder ni activar/cerrar).
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireUser();
    const { id } = await params;
    if (!(await puedeGestionarCampana(session, id))) return fail("No tienes permiso sobre esta campaña.", 403);

    const { centroIds, liderId, activa, ...resto } = campanaUpdateSchema.parse(await req.json());
    const data = session.rol === "COORDINADOR" ? { ...resto, liderId, activa } : resto;
    if (session.rol === "COORDINADOR" && liderId !== undefined) await validarLider(liderId);

    const campana = await prisma.$transaction(async (tx) => {
      if (centroIds) {
        await tx.centroCampana.deleteMany({ where: { campanaId: id } });
        await tx.centroCampana.createMany({
          data: centroIds.map((centroId) => ({ centroId, campanaId: id })),
          skipDuplicates: true,
        });
      }
      return tx.campana.update({
        where: { id },
        data,
        include: { lider: { select: { id: true, nombre: true } }, centros: { select: { centroId: true } } },
      });
    });
    return ok(campana);
  } catch (err) {
    return handleError(err);
  }
}

// DELETE /api/campanas/:id — COORDINADOR (falla con 422 si ya tiene movimientos)
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireRole("COORDINADOR");
    const { id } = await params;
    await prisma.campana.delete({ where: { id } });
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
