import { getSession, type SessionPayload } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { Rol } from "@prisma/client";

export class AuthError extends Error {
  constructor(
    public status: 401 | 403,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/** Exige sesión válida. Lanza AuthError(401) si no hay. Usar en rutas API/server. */
export async function requireUser(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new AuthError(401, "No autenticado.");
  return session;
}

/** Exige sesión con uno de los roles dados. Lanza AuthError(403) si no cumple. */
export async function requireRole(...roles: Rol[]): Promise<SessionPayload> {
  const session = await requireUser();
  if (!roles.includes(session.rol)) {
    throw new AuthError(403, "No tienes permiso para esta acción.");
  }
  return session;
}

// ─────────────────  Acceso a recursos concretos (anti-IDOR)  ──────────────────

/** ¿Puede ver el detalle/stock/movimientos de un centro? Coordinador o miembro del centro. */
export function puedeVerCentro(session: SessionPayload, centroId: string): boolean {
  if (session.rol === "COORDINADOR") return true;
  if (session.rol === "ENCARGADO" || session.rol === "VOLUNTARIO") return session.centroId === centroId;
  return false;
}

/** ¿Puede ver el detalle/agregado de una campaña? Coordinador o su líder. */
export async function puedeVerCampana(session: SessionPayload, campanaId: string): Promise<boolean> {
  if (session.rol === "COORDINADOR") return true;
  if (session.rol !== "LIDER_CAMPANA") return false;
  const c = await prisma.campana.findUnique({ where: { id: campanaId }, select: { liderId: true } });
  return c?.liderId === session.userId;
}

/** ¿Puede editar una campaña (datos, centros participantes, metas)? Coordinador o su líder. */
export const puedeGestionarCampana = puedeVerCampana;
