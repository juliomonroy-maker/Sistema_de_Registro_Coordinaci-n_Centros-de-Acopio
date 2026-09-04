import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { resolucionSchema } from "@/lib/validation";
import { ok, fail, handleError } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/usuarios/:id/aprobar  body: { accion: "APROBAR" | "RECHAZAR" }
// COORDINADOR: cualquier cuenta pendiente. ENCARGADO: solo voluntarios PENDIENTES de su centro.
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireRole("COORDINADOR", "ENCARGADO");
    const { id } = await params;
    const { accion } = resolucionSchema.parse(await req.json());

    const u = await prisma.usuario.findUnique({ where: { id }, select: { rol: true, estado: true, centroId: true } });
    if (!u) return fail("Usuario no encontrado.", 404);
    if (u.estado !== "PENDIENTE") return fail("Esta cuenta ya fue resuelta.", 422);

    if (session.rol === "ENCARGADO") {
      if (u.rol !== "VOLUNTARIO" || !session.centroId || u.centroId !== session.centroId) {
        return fail("Solo puedes aprobar voluntarios de tu centro.", 403);
      }
    }

    const usuario = await prisma.usuario.update({
      where: { id },
      data: {
        estado: accion === "APROBAR" ? "APROBADO" : "RECHAZADO",
        aprobadoPorId: session.userId,
        aprobadoAt: new Date(),
      },
      select: { id: true, nombre: true, email: true, rol: true, estado: true, aprobadoAt: true },
    });
    return ok(usuario);
  } catch (err) {
    return handleError(err);
  }
}
