import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { transferenciaCreateSchema } from "@/lib/validation";
import { ok, handleError } from "@/lib/api";

// GET /api/transferencias?estado=&centroId=
export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const sp = new URL(req.url).searchParams;
    const estado = sp.get("estado") ?? undefined;
    const centroId = sp.get("centroId") ?? undefined;

    const transferencias = await prisma.transferencia.findMany({
      where: {
        ...(estado ? { estado: estado as never } : {}),
        ...(centroId ? { OR: [{ origenId: centroId }, { destinoId: centroId }] } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        origen: { select: { id: true, nombre: true } },
        destino: { select: { id: true, nombre: true } },
        items: { include: { insumo: true } },
      },
    });
    return ok(transferencias);
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/transferencias — crea solicitud de transferencia entre centros.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const data = transferenciaCreateSchema.parse(await req.json());

    const transferencia = await prisma.transferencia.create({
      data: {
        origenId: data.origenId,
        destinoId: data.destinoId,
        notas: data.notas ?? null,
        creadaPorId: user.userId,
        items: { create: data.items.map((i) => ({ insumoId: i.insumoId, cantidad: i.cantidad })) },
      },
      include: { items: true },
    });
    return ok(transferencia, 201);
  } catch (err) {
    return handleError(err);
  }
}
