import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/auth";
import { centroCreateSchema } from "@/lib/validation";
import { ok, handleError } from "@/lib/api";

// GET /api/centros?ciudad=&situacion=&q=
export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const ciudad = searchParams.get("ciudad") ?? undefined;
    const situacion = searchParams.get("situacion") ?? undefined;
    const q = searchParams.get("q") ?? undefined;

    const centros = await prisma.centro.findMany({
      where: {
        ...(ciudad ? { ciudad } : {}),
        ...(situacion ? { situacion: situacion as never } : {}),
        ...(q
          ? { OR: [{ nombre: { contains: q, mode: "insensitive" } }, { direccion: { contains: q, mode: "insensitive" } }] }
          : {}),
      },
      orderBy: { nombre: "asc" },
      include: { _count: { select: { inventario: true, necesidades: true } } },
    });
    return ok(centros);
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/centros  (ADMIN, COORDINADOR)
export async function POST(req: NextRequest) {
  try {
    await requireRole("ADMIN", "COORDINADOR");
    const data = centroCreateSchema.parse(await req.json());
    const centro = await prisma.centro.create({ data });
    return ok(centro, 201);
  } catch (err) {
    return handleError(err);
  }
}
