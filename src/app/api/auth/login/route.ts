import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, HASH_SENUELO } from "@/lib/password";
import { createSession } from "@/lib/session";
import { loginSchema } from "@/lib/validation";
import { limitar } from "@/lib/ratelimit";
import { ok, fail, handleError } from "@/lib/api";

const MAX_INTENTOS = 10;
const VENTANA_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
    const body = loginSchema.parse(await req.json());
    const email = body.email.toLowerCase();

    const lim = limitar(`login:${ip}:${email}`, MAX_INTENTOS, VENTANA_MS);
    if (!lim.permitido) {
      return NextResponse.json(
        { error: `Demasiados intentos. Espera ${lim.reintentarEnSeg} s.` },
        { status: 429, headers: { "Retry-After": String(lim.reintentarEnSeg) } },
      );
    }

    const usuario = await prisma.usuario.findUnique({ where: { email } });
    const okPass = await verifyPassword(body.password, usuario?.passwordHash ?? HASH_SENUELO);
    if (!usuario || !usuario.activo || !okPass) return fail("Credenciales inválidas.", 401);
    // Solo tras verificar la contraseña se revela el estado de aprobación (no filtra existencia de cuentas).
    if (usuario.estado === "PENDIENTE") return fail("Tu cuenta está pendiente de aprobación por el encargado o el coordinador.", 403);
    if (usuario.estado === "RECHAZADO") return fail("Tu solicitud de cuenta fue rechazada. Contacta al coordinador.", 403);

    const { id, nombre, rol, centroId, institucionId } = usuario;
    await createSession({ userId: id, nombre, email: usuario.email, rol, centroId, institucionId });
    return ok({ id, nombre, email: usuario.email, rol, centroId, institucionId });
  } catch (err) {
    return handleError(err);
  }
}
