import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/auth";
import { centroCreateSchema } from "@/lib/validation";
import { ok, handleError } from "@/lib/api";

// GET /api/centros?activo=&campanaId=&q=
export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const sp = new URL(req.url).searchParams;
    const activo = sp.get("activo");
    const campanaId = sp.get("campanaId") ?? undefined;
    const q = sp.get("q") ?? undefined;

    const centros = await prisma.centro.findMany({
      where: {
        ...(activo !== null ? { activo: activo === "true" } : {}),
        ...(campanaId ? { campanas: { some: { campanaId } } } : {}),
        ...(q ? { nombre: { contains: q, mode: "insensitive" } } : {}),
      },
      orderBy: { nombre: "asc" },
      include: {
        encargado: { select: { id: true, nombre: true } },
        _count: { select: { movimientos: true } },
      },
    });
    return ok(centros);
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/centros  — solo COORDINADOR
export async function POST(req: NextRequest) {
  try {
    await requireRole("COORDINADOR");
    const { campanaIds, ...data } = centroCreateSchema.parse(await req.json());
    const centro = await prisma.centro.create({
      data: {
        ...data,
        ...(campanaIds?.length
          ? { campanas: { create: campanaIds.map((campanaId) => ({ campanaId })) } }
          : {}),
      },
    });
    return ok(centro, 201);
  } catch (err) {
    return handleError(err);
  }
}
