import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/auth";
import { insumoCreateSchema } from "@/lib/validation";
import { ok, handleError } from "@/lib/api";

// GET /api/insumos?categoriaId=
export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const categoriaId = new URL(req.url).searchParams.get("categoriaId") ?? undefined;
    const insumos = await prisma.insumo.findMany({
      where: categoriaId ? { categoriaId } : {},
      orderBy: { nombre: "asc" },
      include: { categoria: true },
    });
    return ok(insumos);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole("ADMIN", "COORDINADOR");
    const data = insumoCreateSchema.parse(await req.json());
    const insumo = await prisma.insumo.create({ data });
    return ok(insumo, 201);
  } catch (err) {
    return handleError(err);
  }
}
