import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MovimientoError } from "@/lib/movimientos";

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * El líder de una campaña debe ser una cuenta activa y aprobada con rol
 * LIDER_CAMPANA. Lanza MovimientoError (→ 422) si no cumple. `null` = sin líder.
 */
export async function validarLider(liderId: string | null | undefined, client: Db = prisma): Promise<void> {
  if (!liderId) return;
  const u = await client.usuario.findUnique({ where: { id: liderId }, select: { rol: true, activo: true, estado: true } });
  if (!u) throw new MovimientoError("El líder indicado no existe.");
  if (u.rol !== "LIDER_CAMPANA") throw new MovimientoError("El líder debe tener el rol Líder de campaña.");
  if (!u.activo || u.estado !== "APROBADO") throw new MovimientoError("La cuenta del líder está inactiva o sin aprobar.");
}
