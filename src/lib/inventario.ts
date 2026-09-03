import { Prisma } from "@prisma/client";

/**
 * Suma (delta > 0) o resta (delta < 0) cantidad de un insumo en el inventario
 * de un centro. Crea la fila si no existe. Debe ejecutarse dentro de una
 * transacción Prisma (recibe el `tx`).
 */
export async function ajustarInventario(
  tx: Prisma.TransactionClient,
  centroId: string,
  insumoId: string,
  delta: number,
): Promise<void> {
  const existente = await tx.inventario.findUnique({
    where: { centroId_insumoId: { centroId, insumoId } },
  });

  const actual = existente?.cantidad ?? 0;
  const nueva = actual + delta;
  if (nueva < 0) {
    throw new Error(
      `Stock insuficiente del insumo ${insumoId} en el centro ${centroId} (disponible ${actual}, requerido ${-delta}).`,
    );
  }

  await tx.inventario.upsert({
    where: { centroId_insumoId: { centroId, insumoId } },
    create: { centroId, insumoId, cantidad: nueva },
    update: { cantidad: nueva },
  });
}
