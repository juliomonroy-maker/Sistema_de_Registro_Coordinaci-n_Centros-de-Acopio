import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/auth";
import { campanaCreateSchema } from "@/lib/validation";
import { ok, handleError } from "@/lib/api";

// GET /api/campanas?activa=
export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const activa = new URL(req.url).searchParams.get("activa");
    const campanas = await prisma.campana.findMany({
      where: activa !== null ? { activa: activa === "true" } : {},
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
    const data = campanaCreateSchema.parse(await req.json());
    const campana = await prisma.campana.create({ data });
    return ok(campana, 201);
  } catch (err) {
    return handleError(err);
  }
}
