import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/auth";
import { campanaCreateSchema } from "@/lib/validation";
import { validarLider } from "@/lib/campanas";
import { ok, handleError } from "@/lib/api";

// GET /api/campanas?activa=&centroId=   (centroId: solo campañas en las que participa ese centro)
export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const sp = new URL(req.url).searchParams;
    const activa = sp.get("activa");
    const centroId = sp.get("centroId") || undefined;
    const campanas = await prisma.campana.findMany({
      where: {
        ...(activa !== null ? { activa: activa === "true" } : {}),
        ...(centroId ? { centros: { some: { centroId } } } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        lider: { select: { id: true, nombre: true } },
        _count: { select: { centros: true, movimientos: true } },
      },
    });
    return ok(campanas);
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/campanas — solo COORDINADOR
export async function POST(req: NextRequest) {
  try {
    await requireRole("COORDINADOR");
    const { centroIds, ...data } = campanaCreateSchema.parse(await req.json());
    await validarLider(data.liderId);
    const campana = await prisma.campana.create({
      data: {
        ...data,
        ...(centroIds?.length ? { centros: { create: [...new Set(centroIds)].map((centroId) => ({ centroId })) } } : {}),
      },
      include: { lider: { select: { id: true, nombre: true } }, _count: { select: { centros: true } } },
    });
    return ok(campana, 201);
  } catch (err) {
    return handleError(err);
  }
}
