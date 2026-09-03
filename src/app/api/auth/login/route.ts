import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { loginSchema } from "@/lib/validation";
import { ok, fail, handleError } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const body = loginSchema.parse(await req.json());
    const usuario = await prisma.usuario.findUnique({ where: { email: body.email } });

    if (!usuario || !usuario.activo) return fail("Credenciales inválidas.", 401);

    const okPass = await verifyPassword(body.password, usuario.passwordHash);
    if (!okPass) return fail("Credenciales inválidas.", 401);

    await createSession({
      userId: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      centroId: usuario.centroId,
    });

    return ok({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      centroId: usuario.centroId,
    });
  } catch (err) {
    return handleError(err);
  }
}
