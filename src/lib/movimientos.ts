import type { Prisma, Motivo, TipoMovimiento } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { stockDisponible, type StockFiltro } from "@/lib/stock";
import { AuthError } from "@/lib/auth";
import type { SessionPayload } from "@/lib/session";

const SALIDAS: TipoMovimiento[] = ["ENTREGA", "MERMA", "TRANSFERENCIA_SALIDA"];

export class MovimientoError extends Error {}

type Tx = Prisma.TransactionClient;

/**
 * Serializa las salidas sobre una misma línea de stock (centro+campaña+artículo).
 * Sin esto, dos salidas concurrentes leerían el mismo disponible y podrían dejar
 * el stock negativo. El lock consultivo se libera solo al terminar la transacción
 * y no bloquea otras líneas, así que no hay conflictos espurios.
 */
async function bloquearLineaStock(tx: Tx, centroId: string, campanaId: string, articuloId: string) {
  const clave = `${centroId}:${campanaId}:${articuloId}`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${clave}))`;
}

/** Centro activo, campaña activa y centro participante en la campaña. */
async function validarContexto(tx: Tx, centroId: string, campanaId: string) {
  const [centro, campana, participa] = await Promise.all([
    tx.centro.findUnique({ where: { id: centroId }, select: { nombre: true, activo: true } }),
    tx.campana.findUnique({ where: { id: campanaId }, select: { activa: true } }),
    tx.centroCampana.findUnique({ where: { centroId_campanaId: { centroId, campanaId } }, select: { centroId: true } }),
  ]);
  if (!centro) throw new MovimientoError("Centro no encontrado.");
  if (!centro.activo) throw new MovimientoError(`El centro "${centro.nombre}" está inactivo.`);
  if (!campana) throw new MovimientoError("Campaña no encontrada.");
  if (!campana.activa) throw new MovimientoError("La campaña está cerrada; no admite movimientos.");
  if (!participa) throw new MovimientoError(`El centro "${centro.nombre}" no participa en esta campaña.`);
}

/** Bloquea la línea y verifica que haya stock suficiente para una salida. Debe correr en la txn. */
async function validarSalida(tx: Tx, centroId: string, campanaId: string, articuloId: string, cantidad: number) {
  await bloquearLineaStock(tx, centroId, campanaId, articuloId);
  const disp = await stockDisponible(centroId, campanaId, articuloId, tx);
  if (cantidad > disp) {
    throw new MovimientoError(`Stock insuficiente: disponible ${disp}, solicitado ${cantidad}.`);
  }
}

type MovInput = {
  tipo: Exclude<TipoMovimiento, "TRANSFERENCIA_SALIDA" | "TRANSFERENCIA_ENTRADA">;
  centroId: string;
  campanaId: string;
  articuloId: string;
  cantidad: number;
  actorId: string;
  motivo?: Motivo | null;
  nota?: string | null;
  signoPositivo?: boolean;
  donanteNombre?: string | null;
  donanteAnonimo?: boolean;
  institucionId?: string | null;
};

/** Registra un movimiento simple (recepción, entrega, merma, ajuste). */
export async function registrarMovimiento(input: MovInput) {
  return prisma.$transaction(async (tx) => {
    await validarContexto(tx, input.centroId, input.campanaId);

    const esSalida = SALIDAS.includes(input.tipo);
    const ajusteNegativo = input.tipo === "AJUSTE" && input.signoPositivo === false;
    if (esSalida || ajusteNegativo) {
      await validarSalida(tx, input.centroId, input.campanaId, input.articuloId, input.cantidad);
    }

    return tx.movimiento.create({
      data: {
        tipo: input.tipo,
        centroId: input.centroId,
        campanaId: input.campanaId,
        articuloId: input.articuloId,
        cantidad: input.cantidad,
        signoPositivo: input.signoPositivo ?? true,
        actorId: input.actorId,
        motivo: input.motivo ?? null,
        nota: input.nota ?? null,
        donanteNombre: input.donanteAnonimo ? null : (input.donanteNombre ?? null),
        donanteAnonimo: input.donanteAnonimo ?? false,
        institucionId: input.institucionId ?? null,
      },
      include: { articulo: true, campana: true },
    });
  });
}

/**
 * Registra una transferencia entre centros como DOS movimientos ligados
 * (salida en origen + entrada en destino) dentro de una única transacción,
 * compartiendo `grupoTransferencia` para trazabilidad. El stock total del
 * sistema no se descuadra.
 */
export async function registrarTransferencia(input: {
  origenId: string;
  destinoId: string;
  campanaId: string;
  articuloId: string;
  cantidad: number;
  actorId: string;
  nota?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    await validarContexto(tx, input.origenId, input.campanaId);
    await validarContexto(tx, input.destinoId, input.campanaId);
    await validarSalida(tx, input.origenId, input.campanaId, input.articuloId, input.cantidad);

    const comun = {
      campanaId: input.campanaId,
      articuloId: input.articuloId,
      cantidad: input.cantidad,
      actorId: input.actorId,
      nota: input.nota ?? null,
    };

    // El id de la salida sirve como id de grupo para ambos movimientos.
    const salida = await tx.movimiento.create({
      data: { ...comun, tipo: "TRANSFERENCIA_SALIDA", centroId: input.origenId, centroDestinoId: input.destinoId },
    });
    const grupo = salida.id;
    await tx.movimiento.update({ where: { id: grupo }, data: { grupoTransferencia: grupo } });

    const entrada = await tx.movimiento.create({
      data: {
        ...comun,
        tipo: "TRANSFERENCIA_ENTRADA",
        centroId: input.destinoId,
        centroDestinoId: input.origenId,
        grupoTransferencia: grupo,
      },
    });

    return { grupo, salida: { ...salida, grupoTransferencia: grupo }, entrada };
  });
}

/**
 * Reglas de rol para operar un movimiento en un centro:
 * - COORDINADOR: cualquier centro, cualquier tipo.
 * - ENCARGADO: solo su centro; cualquier tipo.
 * - VOLUNTARIO: solo su centro; solo RECEPCION y ENTREGA (no merma/ajuste/transferencia).
 * Lanza AuthError(403) si no cumple.
 */
export function autorizarMovimiento(
  session: { rol: string; centroId: string | null },
  tipo: TipoMovimiento,
  centroId: string,
) {
  if (session.rol === "COORDINADOR") return;

  if (session.rol === "ENCARGADO") {
    if (session.centroId !== centroId) throw new AuthError(403, "Solo puedes operar tu centro.");
    return;
  }

  if (session.rol === "VOLUNTARIO") {
    if (session.centroId !== centroId) throw new AuthError(403, "Solo puedes operar tu centro.");
    if (tipo !== "RECEPCION" && tipo !== "ENTREGA") {
      throw new AuthError(403, "El voluntario solo registra recepciones y entregas.");
    }
    return;
  }

  throw new AuthError(403, "Tu rol no puede registrar movimientos.");
}

// ─────────────────────────  Alcance de lectura por rol  ───────────────────────

export type MovimientosFiltro = {
  centroId?: string;
  campanaId?: string;
  tipo?: TipoMovimiento;
  desde?: Date;
  hasta?: Date;
};

/**
 * Construye el `where` de movimientos que un usuario puede VER, combinando los
 * filtros pedidos con el alcance de su rol. Único punto de verdad para listado,
 * exportación y páginas: así ningún rol ve más de lo que le corresponde.
 * - COORDINADOR: todo.
 * - ENCARGADO / VOLUNTARIO: solo su centro.
 * - INSTITUCION: solo ENTREGAs dirigidas a su institución.
 * - LIDER_CAMPANA: solo las campañas que lidera.
 */
export async function alcanceMovimientos(
  session: SessionPayload,
  f: MovimientosFiltro = {},
): Promise<Prisma.MovimientoWhereInput> {
  const where: Prisma.MovimientoWhereInput = {
    ...(f.centroId ? { centroId: f.centroId } : {}),
    ...(f.campanaId ? { campanaId: f.campanaId } : {}),
    ...(f.tipo ? { tipo: f.tipo } : {}),
    ...(f.desde || f.hasta ? { fecha: { ...(f.desde ? { gte: f.desde } : {}), ...(f.hasta ? { lte: f.hasta } : {}) } } : {}),
  };

  switch (session.rol) {
    case "COORDINADOR":
      return where;
    case "ENCARGADO":
    case "VOLUNTARIO":
      return { ...where, centroId: session.centroId ?? "" };
    case "INSTITUCION":
      return { ...where, tipo: "ENTREGA", institucionId: session.institucionId ?? "" };
    case "LIDER_CAMPANA": {
      const ids = await campanasLideradas(session.userId);
      const pedida = f.campanaId && ids.includes(f.campanaId) ? [f.campanaId] : ids;
      return { ...where, campanaId: { in: pedida } };
    }
  }
}

export async function campanasLideradas(userId: string): Promise<string[]> {
  const rows = await prisma.campana.findMany({ where: { liderId: userId }, select: { id: true } });
  return rows.map((r) => r.id);
}

/**
 * Filtro de stock que un usuario puede consultar. Misma lógica que
 * `alcanceMovimientos`; la institución receptora no consulta stock (403).
 */
export async function alcanceStock(
  session: SessionPayload,
  f: { centroId?: string; campanaId?: string } = {},
): Promise<StockFiltro> {
  switch (session.rol) {
    case "COORDINADOR":
      return f;
    case "ENCARGADO":
    case "VOLUNTARIO":
      return { ...f, centroId: session.centroId ?? "" };
    case "LIDER_CAMPANA": {
      const ids = await campanasLideradas(session.userId);
      if (f.campanaId && ids.includes(f.campanaId)) return f;
      return { centroId: f.centroId, campanaIds: ids };
    }
    case "INSTITUCION":
      throw new AuthError(403, "Tu rol no consulta inventario.");
  }
}
