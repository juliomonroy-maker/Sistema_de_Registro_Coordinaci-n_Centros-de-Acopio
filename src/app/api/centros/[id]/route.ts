import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, puedeVerCentro } from "@/lib/auth";
import { centroUpdateSchema } from "@/lib/validation";
import { calcularStock } from "@/lib/stock";
import { ok, fail, handleError } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

// GET /api/centros/:id — detalle + stock derivado. Coordinador o miembros del centro.
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireUser();
    const { id } = await params;
    if (!puedeVerCentro(session, id)) return fail("No tienes permiso sobre este centro.", 403);
    const centro = await prisma.centro.findUnique({
      where: { id },
      include: {
        encargado: { select: { id: true, nombre: true, email: true } },
        miembros: { select: { id: true, nombre: true, rol: true } },
        campanas: { include: { campana: { select: { id: true, nombre: true, activa: true } } } },
      },
    });
    if (!centro) return fail("Centro no encontrado.", 404);
    const stock = await calcularStock({ centroId: id });
    return ok({ ...centro, stock });
  } catch (err) {
    return handleError(err);
  }
}

// PATCH /api/centros/:id — COORDINADOR (incluye activar/desactivar)
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireRole("COORDINADOR");
    const { id } = await params;
    const { campanaIds, ...data } = centroUpdateSchema.parse(await req.json());
    const centro = await prisma.$transaction(async (tx) => {
      if (campanaIds) {
        await tx.centroCampana.deleteMany({ where: { centroId: id } });
        await tx.centroCampana.createMany({
          data: campanaIds.map((campanaId) => ({ centroId: id, campanaId })),
          skipDuplicates: true,
        });
      }
      return tx.centro.update({ where: { id }, data });
    });
    return ok(centro);
  } catch (err) {
    return handleError(err);
  }
}
