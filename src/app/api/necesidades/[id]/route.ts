import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { necesidadUpdateSchema } from "@/lib/validation";
import { ok, handleError } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const data = necesidadUpdateSchema.parse(await req.json());
    const necesidad = await prisma.necesidad.update({ where: { id }, data });
    return ok(necesidad);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    await prisma.necesidad.delete({ where: { id } });
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
