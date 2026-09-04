import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { registroVoluntarioSchema } from "@/lib/validation";
import { limitar } from "@/lib/ratelimit";
import { ok, fail, handleError } from "@/lib/api";

const MAX_REGISTROS = 5;
const VENTANA_MS = 60 * 60 * 1000;

// POST /api/auth/registro — público. Crea un VOLUNTARIO en estado PENDIENTE
// ligado a un centro activo. No inicia sesión: debe aprobarlo el encargado
// de ese centro o el coordinador (PATCH /api/usuarios/:id/aprobar).
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
    const lim = limitar(`registro:${ip}`, MAX_REGISTROS, VENTANA_MS);
    if (!lim.permitido) {
      return NextResponse.json(
        { error: `Demasiados registros desde esta red. Espera ${lim.reintentarEnSeg} s.` },
        { status: 429, headers: { "Retry-After": String(lim.reintentarEnSeg) } },
      );
    }

    const data = registroVoluntarioSchema.parse(await req.json());
    const centro = await prisma.centro.findUnique({ where: { id: data.centroId }, select: { activo: true } });
    if (!centro || !centro.activo) return fail("El centro no existe o está inactivo.", 422);

    const usuario = await prisma.usuario.create({
      data: {
        nombre: data.nombre,
        email: data.email.toLowerCase(),
        passwordHash: await hashPassword(data.password),
        rol: "VOLUNTARIO",
        estado: "PENDIENTE",
        centroId: data.centroId,
      },
      select: { id: true, nombre: true, email: true, estado: true },
    });
    return ok(usuario, 201);
  } catch (err) {
    return handleError(err);
  }
}
