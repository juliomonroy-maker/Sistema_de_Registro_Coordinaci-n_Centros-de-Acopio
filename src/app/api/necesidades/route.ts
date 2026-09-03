import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { necesidadCreateSchema } from "@/lib/validation";
import { ok, handleError } from "@/lib/api";

// GET /api/necesidades?centroId=&prioridad=&cubierta=false
export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const sp = new URL(req.url).searchParams;
    const centroId = sp.get("centroId") ?? undefined;
    const prioridad = sp.get("prioridad") ?? undefined;
    const cubierta = sp.get("cubierta");

    const necesidades = await prisma.necesidad.findMany({
      where: {
        ...(centroId ? { centroId } : {}),
        ...(prioridad ? { prioridad: prioridad as never } : {}),
        ...(cubierta !== null ? { cubierta: cubierta === "true" } : {}),
      },
      orderBy: [{ prioridad: "desc" }, { createdAt: "desc" }],
      include: {
        centro: { select: { id: true, nombre: true, ciudad: true } },
        insumo: { include: { categoria: true } },
      },
    });
    return ok(necesidades);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const data = necesidadCreateSchema.parse(await req.json());
    const necesidad = await prisma.necesidad.create({ data });
    return ok(necesidad, 201);
  } catch (err) {
    return handleError(err);
  }
}
