import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { usuarioUpdateSchema, asignacionCoherente } from "@/lib/validation";
import { ok, fail, handleError } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

const SELECT = {
  id: true, nombre: true, email: true, rol: true, activo: true,
  centro: { select: { id: true, nombre: true } },
  institucion: { select: { id: true, nombre: true } },
} as const;

// PATCH /api/usuarios/:id — COORDINADOR: activar/desactivar, rol, asignación, nombre, contraseña.
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireRole("COORDINADOR");
    const { id } = await params;
    const data = usuarioUpdateSchema.parse(await req.json());

    const actual = await prisma.usuario.findUnique({ where: { id }, select: { rol: true, centroId: true, institucionId: true } });
    if (!actual) return fail("Usuario no encontrado.", 404);

    // Un coordinador no puede desactivarse ni degradarse a sí mismo (evita quedarse sin administrador).
    if (id === session.userId && (data.activo === false || (data.rol && data.rol !== "COORDINADOR"))) {
      return fail("No puedes desactivar ni cambiar el rol de tu propia cuenta.", 422);
    }

    const resultado = { ...actual, ...data };
    const incoherencia = asignacionCoherente(resultado);
    if (incoherencia) return fail(incoherencia, 422);

    const { password, ...resto } = data;
    const usuario = await prisma.usuario.update({
      where: { id },
      data: { ...resto, ...(password ? { passwordHash: await hashPassword(password) } : {}) },
      select: SELECT,
    });
    return ok(usuario);
  } catch (err) {
    return handleError(err);
  }
}
