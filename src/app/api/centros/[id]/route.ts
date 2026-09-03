import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/auth";
import { centroUpdateSchema } from "@/lib/validation";
import { ok, fail, handleError } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

// GET /api/centros/:id  — detalle con inventario y necesidades
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const centro = await prisma.centro.findUnique({
      where: { id },
      include: {
        inventario: { include: { insumo: { include: { categoria: true } } } },
        necesidades: { include: { insumo: true }, orderBy: { prioridad: "desc" } },
        usuarios: { select: { id: true, nombre: true, rol: true } },
      },
    });
    if (!centro) return fail("Centro no encontrado.", 404);
    return ok(centro);
  } catch (err) {
    return handleError(err);
  }
}

// PATCH /api/centros/:id  (ADMIN, COORDINADOR)
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireRole("ADMIN", "COORDINADOR");
    const { id } = await params;
    const data = centroUpdateSchema.parse(await req.json());
    const centro = await prisma.centro.update({ where: { id }, data });
    return ok(centro);
  } catch (err) {
    return handleError(err);
  }
}

// DELETE /api/centros/:id  (ADMIN)
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireRole("ADMIN");
    const { id } = await params;
    await prisma.centro.delete({ where: { id } });
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
