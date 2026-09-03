import type { Prisma, TipoMovimiento } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = Prisma.TransactionClient | typeof prisma;

// Signo con el que cada tipo de movimiento afecta el stock.
// AJUSTE usa el campo signoPositivo del propio movimiento.
export function signoDeMovimiento(tipo: TipoMovimiento, signoPositivo: boolean): 1 | -1 {
  switch (tipo) {
    case "RECEPCION":
    case "TRANSFERENCIA_ENTRADA":
      return 1;
    case "ENTREGA":
    case "MERMA":
    case "TRANSFERENCIA_SALIDA":
      return -1;
    case "AJUSTE":
      return signoPositivo ? 1 : -1;
  }
}

export type StockLinea = {
  articuloId: string;
  nombre: string;
  categoria: string;
  unidad: string;
  cantidad: number;
};

export type StockFiltro = { centroId?: string; campanaId?: string; campanaIds?: string[] };

function whereFiltro(f: StockFiltro): Prisma.MovimientoWhereInput {
  return {
    ...(f.centroId ? { centroId: f.centroId } : {}),
    ...(f.campanaId ? { campanaId: f.campanaId } : {}),
    ...(f.campanaIds ? { campanaId: { in: f.campanaIds } } : {}),
  };
}

/**
 * Suma con signo por artículo usando agregación en BD (groupBy) en lugar de
 * traer todos los movimientos a memoria. Devuelve Map<articuloId, cantidad>.
 */
async function sumarPorArticulo(where: Prisma.MovimientoWhereInput, client: Db): Promise<Map<string, number>> {
  const grupos = await client.movimiento.groupBy({
    by: ["articuloId", "tipo", "signoPositivo"],
    where,
    _sum: { cantidad: true },
  });
  const map = new Map<string, number>();
  for (const g of grupos) {
    const delta = signoDeMovimiento(g.tipo, g.signoPositivo) * (g._sum.cantidad ?? 0);
    map.set(g.articuloId, (map.get(g.articuloId) ?? 0) + delta);
  }
  return map;
}

/**
 * Calcula el stock actual (por artículo) sumando los movimientos según su signo.
 * El stock NUNCA se almacena: se deriva del ledger. Opcionalmente filtra por
 * centro y/o campaña. Devuelve solo artículos con cantidad != 0.
 */
export async function calcularStock(filtro: StockFiltro, client: Db = prisma): Promise<StockLinea[]> {
  const sumas = await sumarPorArticulo(whereFiltro(filtro), client);
  const ids = [...sumas.keys()];
  if (ids.length === 0) return [];

  const articulos = await client.articulo.findMany({
    where: { id: { in: ids } },
    select: { id: true, nombre: true, categoria: true, unidad: true },
  });

  return articulos
    .map((a) => ({
      articuloId: a.id,
      nombre: a.nombre,
      categoria: a.categoria,
      unidad: a.unidad,
      cantidad: sumas.get(a.id) ?? 0,
    }))
    .filter((l) => Math.abs(l.cantidad) > 1e-9)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/** Stock de un artículo concreto en un centro+campaña. Usar antes de una salida. */
export async function stockDisponible(
  centroId: string,
  campanaId: string,
  articuloId: string,
  client: Db = prisma,
): Promise<number> {
  const sumas = await sumarPorArticulo({ centroId, campanaId, articuloId }, client);
  return sumas.get(articuloId) ?? 0;
}

// ─────────────────────────────  Metas por campaña  ────────────────────────────

export type ProgresoMeta = {
  id: string;
  articuloId: string;
  nombre: string;
  unidad: string;
  objetivo: number;
  recibido: number;
  porcentaje: number; // 0..100, tope 100
};

/**
 * Avance de cada meta de la campaña: lo recibido en donaciones (RECEPCION) del
 * artículo en todos los centros participantes, contra la cantidad objetivo.
 * Se mide lo captado, no el stock actual (las entregas no restan avance).
 */
export async function progresoMetas(campanaId: string, client: Db = prisma): Promise<ProgresoMeta[]> {
  const metas = await client.metaCampana.findMany({
    where: { campanaId },
    include: { articulo: { select: { nombre: true, unidad: true } } },
    orderBy: { articulo: { nombre: "asc" } },
  });
  if (metas.length === 0) return [];

  const recibidos = await client.movimiento.groupBy({
    by: ["articuloId"],
    where: { campanaId, tipo: "RECEPCION", articuloId: { in: metas.map((m) => m.articuloId) } },
    _sum: { cantidad: true },
  });
  const porArticulo = new Map(recibidos.map((r) => [r.articuloId, r._sum.cantidad ?? 0]));

  return metas.map((m) => {
    const recibido = porArticulo.get(m.articuloId) ?? 0;
    return {
      id: m.id,
      articuloId: m.articuloId,
      nombre: m.articulo.nombre,
      unidad: m.articulo.unidad,
      objetivo: m.cantidadObjetivo,
      recibido,
      porcentaje: Math.min(100, Math.round((recibido / m.cantidadObjetivo) * 100)),
    };
  });
}

// ────────────────────  Totales agregados por campaña  ─────────────────────────

export type TotalCampana = {
  id: string;
  nombre: string;
  activa: boolean;
  centros: number;
  movimientos: number;
  recibido: number; // unidades captadas (RECEPCION)
  entregado: number; // unidades entregadas (ENTREGA)
  merma: number; // unidades perdidas (MERMA)
  stock: number; // existencia actual (suma con signo)
  avanceMetas: number | null; // promedio de avance de sus metas; null si no tiene metas
};

/**
 * Totales de cada campaña derivados del ledger, para el panel global.
 * Usa cuatro agregaciones en BD (movimientos, centros, metas y recepciones por
 * meta), por lo que el coste no crece con el número de campañas.
 */
export async function totalesPorCampana(client: Db = prisma): Promise<TotalCampana[]> {
  const [campanas, porTipo, metas] = await Promise.all([
    client.campana.findMany({
      select: { id: true, nombre: true, activa: true, _count: { select: { centros: true } } },
      orderBy: [{ activa: "desc" }, { createdAt: "desc" }],
    }),
    client.movimiento.groupBy({
      by: ["campanaId", "tipo", "signoPositivo"],
      _sum: { cantidad: true },
      _count: true,
    }),
    client.metaCampana.findMany({ select: { campanaId: true, articuloId: true, cantidadObjetivo: true } }),
  ]);

  // Recepciones por campaña+artículo, solo para los artículos con meta.
  const recepcionesMeta = metas.length
    ? await client.movimiento.groupBy({
        by: ["campanaId", "articuloId"],
        where: { tipo: "RECEPCION", articuloId: { in: [...new Set(metas.map((m) => m.articuloId))] } },
        _sum: { cantidad: true },
      })
    : [];
  const recibidoPorMeta = new Map(
    recepcionesMeta.map((r) => [`${r.campanaId}:${r.articuloId}`, r._sum.cantidad ?? 0]),
  );

  // Promedio de avance de las metas de cada campaña (misma fórmula que progresoMetas).
  const avancePorCampana = new Map<string, number[]>();
  for (const m of metas) {
    const recibido = recibidoPorMeta.get(`${m.campanaId}:${m.articuloId}`) ?? 0;
    const pct = Math.min(100, Math.round((recibido / m.cantidadObjetivo) * 100));
    const lista = avancePorCampana.get(m.campanaId);
    if (lista) lista.push(pct);
    else avancePorCampana.set(m.campanaId, [pct]);
  }

  return campanas.map((c) => {
    const grupos = porTipo.filter((g) => g.campanaId === c.id);
    const suma = (tipo: TipoMovimiento) =>
      grupos.filter((g) => g.tipo === tipo).reduce((a, g) => a + (g._sum.cantidad ?? 0), 0);
    const pcts = avancePorCampana.get(c.id);

    return {
      id: c.id,
      nombre: c.nombre,
      activa: c.activa,
      centros: c._count.centros,
      movimientos: grupos.reduce((a, g) => a + g._count, 0),
      recibido: suma("RECEPCION"),
      entregado: suma("ENTREGA"),
      merma: suma("MERMA"),
      stock: grupos.reduce(
        (a, g) => a + signoDeMovimiento(g.tipo, g.signoPositivo) * (g._sum.cantidad ?? 0),
        0,
      ),
      avanceMetas: pcts?.length ? Math.round(pcts.reduce((a, p) => a + p, 0) / pcts.length) : null,
    };
  });
}
