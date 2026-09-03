import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, puedeVerCampana, puedeGestionarCampana } from "@/lib/auth";
import { metasCampanaPutSchema } from "@/lib/validation";
import { progresoMetas } from "@/lib/stock";
import { ok, fail, handleError } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

// GET /api/campanas/:id/metas — metas con avance (recibido vs objetivo)
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireUser();
    const { id } = await params;
    if (!(await puedeVerCampana(session, id))) return fail("No tienes permiso sobre esta campaña.", 403);
    return ok(await progresoMetas(id));
  } catch (err) {
    return handleError(err);
  }
}

// PUT /api/campanas/:id/metas — reemplaza el conjunto de metas. COORDINADOR o líder de la campaña.
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await requireUser();
    const { id } = await params;
    if (!(await puedeGestionarCampana(session, id))) return fail("No tienes permiso sobre esta campaña.", 403);

    const metas = metasCampanaPutSchema.parse(await req.json());
    const existe = await prisma.campana.findUnique({ where: { id }, select: { id: true } });
    if (!existe) return fail("Campaña no encontrada.", 404);

    await prisma.$transaction([
      prisma.metaCampana.deleteMany({ where: { campanaId: id } }),
      prisma.metaCampana.createMany({ data: metas.map((m) => ({ ...m, campanaId: id })) }),
    ]);
    return ok(await progresoMetas(id));
  } catch (err) {
    return handleError(err);
  }
}
