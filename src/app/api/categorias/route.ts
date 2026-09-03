import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/auth";
import { categoriaCreateSchema } from "@/lib/validation";
import { ok, handleError } from "@/lib/api";

export async function GET() {
  try {
    await requireUser();
    const categorias = await prisma.categoria.findMany({
      orderBy: { nombre: "asc" },
      include: { _count: { select: { insumos: true } } },
    });
    return ok(categorias);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole("ADMIN", "COORDINADOR");
    const data = categoriaCreateSchema.parse(await req.json());
    const categoria = await prisma.categoria.create({ data });
    return ok(categoria, 201);
  } catch (err) {
    return handleError(err);
  }
}
