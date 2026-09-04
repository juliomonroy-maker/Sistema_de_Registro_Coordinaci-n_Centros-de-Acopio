import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { usuarioCreateSchema } from "@/lib/validation";
import { ok, handleError } from "@/lib/api";

// GET /api/usuarios?rol=&centroId=&estado=  — COORDINADOR todo;
// ENCARGADO solo los voluntarios de su centro (para aprobarlos).
export async function GET(req: NextRequest) {
  try {
    const session = await requireRole("COORDINADOR", "ENCARGADO");
    const sp = new URL(req.url).searchParams;
    const rol = sp.get("rol") ?? undefined;
    const centroId = sp.get("centroId") ?? undefined;
    const estado = sp.get("estado") ?? undefined;
    const alcance =
      session.rol === "ENCARGADO" ? { rol: "VOLUNTARIO" as const, centroId: session.centroId ?? "" } : {};
    const usuarios = await prisma.usuario.findMany({
      where: {
        ...(rol ? { rol: rol as never } : {}),
        ...(centroId ? { centroId } : {}),
        ...(estado ? { estado: estado as never } : {}),
        ...alcance,
      },
      orderBy: { nombre: "asc" },
      select: {
        id: true, nombre: true, email: true, rol: true, activo: true, estado: true, createdAt: true,
        centro: { select: { id: true, nombre: true } },
        institucion: { select: { id: true, nombre: true } },
      },
    });
    return ok(usuarios);
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/usuarios — COORDINADOR crea cuentas (encargado, voluntario, institución, líder)
export async function POST(req: NextRequest) {
  try {
    await requireRole("COORDINADOR");
    const data = usuarioCreateSchema.parse(await req.json());
    const usuario = await prisma.usuario.create({
      data: {
        nombre: data.nombre,
        email: data.email.toLowerCase(),
        passwordHash: await hashPassword(data.password),
        rol: data.rol,
        centroId: data.centroId ?? null,
        institucionId: data.institucionId ?? null,
      },
      select: { id: true, nombre: true, email: true, rol: true },
    });
    return ok(usuario, 201);
  } catch (err) {
    return handleError(err);
  }
}
