import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AuthError } from "@/lib/auth";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Convierte errores comunes (Zod, Prisma, Auth) en respuestas JSON coherentes. */
export function handleError(err: unknown): NextResponse {
  if (err instanceof AuthError) return fail(err.message, err.status);

  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: err.flatten().fieldErrors },
      { status: 422 },
    );
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return fail("Registro duplicado.", 409);
    if (err.code === "P2025") return fail("Registro no encontrado.", 404);
    if (err.code === "P2003") return fail("Referencia inválida.", 422);
  }

  console.error(err);
  return fail("Error interno del servidor.", 500);
}
