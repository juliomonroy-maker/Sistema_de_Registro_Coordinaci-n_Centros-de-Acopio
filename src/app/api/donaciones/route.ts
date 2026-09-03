import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { donacionCreateSchema } from "@/lib/validation";
import { ajustarInventario } from "@/lib/inventario";
import { ok, handleError } from "@/lib/api";

// GET /api/donaciones?centroId=
export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const centroId = new URL(req.url).searchParams.get("centroId") ?? undefined;
    const donaciones = await prisma.donacion.findMany({
      where: centroId ? { centroId } : {},
      orderBy: { fecha: "desc" },
      take: 100,
      include: {
        centro: { select: { id: true, nombre: true } },
        items: { include: { insumo: true } },
        registradaPor: { select: { id: true, nombre: true } },
      },
    });
    return ok(donaciones);
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/donaciones — registra donación y suma al inventario del centro.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const data = donacionCreateSchema.parse(await req.json());

    const donacion = await prisma.$transaction(async (tx) => {
      const d = await tx.donacion.create({
        data: {
          centroId: data.centroId,
          donanteNombre: data.donanteNombre ?? null,
          donanteTel: data.donanteTel ?? null,
          notas: data.notas ?? null,
          registradaPorId: user.userId,
          items: { create: data.items.map((i) => ({ insumoId: i.insumoId, cantidad: i.cantidad })) },
        },
        include: { items: true },
      });

      for (const item of data.items) {
        await ajustarInventario(tx, data.centroId, item.insumoId, item.cantidad);
      }
      return d;
    });

    return ok(donacion, 201);
  } catch (err) {
    return handleError(err);
  }
}
