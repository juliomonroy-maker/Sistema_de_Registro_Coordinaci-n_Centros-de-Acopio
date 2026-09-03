import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/auth";
import { articuloCreateSchema } from "@/lib/validation";
import { ok, handleError } from "@/lib/api";

// GET /api/articulos?categoria=
export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const categoria = new URL(req.url).searchParams.get("categoria") ?? undefined;
    const articulos = await prisma.articulo.findMany({
      where: categoria ? { categoria: categoria as never } : {},
      orderBy: { nombre: "asc" },
    });
    return ok(articulos);
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/articulos — COORDINADOR o ENCARGADO
export async function POST(req: NextRequest) {
  try {
    await requireRole("COORDINADOR", "ENCARGADO");
    const data = articuloCreateSchema.parse(await req.json());
    const articulo = await prisma.articulo.create({ data });
    return ok(articulo, 201);
  } catch (err) {
    return handleError(err);
  }
}
