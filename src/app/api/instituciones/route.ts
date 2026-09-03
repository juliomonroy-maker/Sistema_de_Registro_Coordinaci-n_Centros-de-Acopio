import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/auth";
import { institucionCreateSchema } from "@/lib/validation";
import { ok, handleError } from "@/lib/api";

export async function GET() {
  try {
    await requireUser();
    const instituciones = await prisma.institucion.findMany({ orderBy: { nombre: "asc" } });
    return ok(instituciones);
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/instituciones — COORDINADOR
export async function POST(req: NextRequest) {
  try {
    await requireRole("COORDINADOR");
    const data = institucionCreateSchema.parse(await req.json());
    const institucion = await prisma.institucion.create({ data });
    return ok(institucion, 201);
  } catch (err) {
    return handleError(err);
  }
}
