import { getSession, type SessionPayload } from "@/lib/session";
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
