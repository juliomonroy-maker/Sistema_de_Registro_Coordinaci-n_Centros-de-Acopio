import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Rol } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "acopio_session";
const MAX_AGE = 60 * 60 * 8; // 8 horas

// Cookie Secure por defecto en producción. COOKIE_SECURE=false permite iniciar sesión
// por HTTP plano (p. ej. demo en red local con Docker); nunca desactivar detrás de HTTPS público.
const COOKIE_SECURE =
  process.env.COOKIE_SECURE !== undefined
    ? process.env.COOKIE_SECURE === "true"
    : process.env.NODE_ENV === "production";

export type SessionPayload = {
  userId: string;
  nombre: string;
  email: string;
  rol: Rol;
  centroId: string | null;
  institucionId: string | null;
};

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET no configurado o demasiado corto (min 32 chars).");
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(getSecret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/**
 * Lee y verifica la sesión actual. Devuelve null si no hay sesión válida.
 *
 * El JWT solo identifica al usuario; rol, centro e institución se releen de la
 * BD en cada request para que desactivar o reasignar una cuenta surta efecto de
 * inmediato (el token no es revocable por sí mismo). `cache` dedupe la consulta
 * dentro de un mismo render/request.
 */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  let userId: string;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.userId !== "string") return null;
    userId = payload.userId;
  } catch {
    return null;
  }

  const u = await prisma.usuario.findUnique({
    where: { id: userId },
    select: { id: true, nombre: true, email: true, rol: true, activo: true, estado: true, centroId: true, institucionId: true },
  });
  // Cuenta inactiva o aún no aprobada (registro público de voluntario) = sin sesión.
  if (!u || !u.activo || u.estado !== "APROBADO") return null;

  return {
    userId: u.id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol,
    centroId: u.centroId,
    institucionId: u.institucionId,
  };
});

export { COOKIE_NAME };
