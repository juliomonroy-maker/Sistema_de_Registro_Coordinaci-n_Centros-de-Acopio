import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcularStock, SOLO_APROBADOS, type StockFiltro } from "@/lib/stock";

/**
 * Series para las gráficas de los dashboards. Todo se deriva del ledger de
 * movimientos APROBADOS (misma regla que el stock); nada se guarda precalculado.
 */

export type PuntoDiario = { dia: string; recibido: number; entregado: number; merma: number };
export type BarraCategoria = { nombre: string; cantidad: number };

const CATEGORIA_LABEL: Record<string, string> = {
  NO_PERECEDERO: "No perecedero",
  PERECEDERO: "Perecedero",
  ROPA: "Ropa",
  LIMPIEZA: "Limpieza",
  MEDICAMENTO: "Medicamento",
  OTRO: "Otro",
};

/** Fecha local (YYYY-MM-DD) sin hora, para agrupar por día. */
function claveDia(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Unidades recibidas / entregadas / merma por día en los últimos `dias` días.
 * Se agrupa en Postgres por día y tipo (una sola consulta); los días sin
 * movimientos se rellenan con cero para que la línea sea continua.
 */
export async function serieDiaria(f: { centroId?: string; campanaId?: string; campanaIds?: string[] }, dias = 30): Promise<PuntoDiario[]> {
  const desde = new Date();
  desde.setUTCHours(0, 0, 0, 0);
  desde.setUTCDate(desde.getUTCDate() - (dias - 1));

  const condiciones = [
    Prisma.sql`"estado" = 'APROBADO'`,
    Prisma.sql`"fecha" >= ${desde}`,
    Prisma.sql`"tipo" IN ('RECEPCION', 'ENTREGA', 'MERMA')`,
  ];
  if (f.centroId) condiciones.push(Prisma.sql`"centroId" = ${f.centroId}`);
  if (f.campanaId) condiciones.push(Prisma.sql`"campanaId" = ${f.campanaId}`);
  if (f.campanaIds) {
    if (f.campanaIds.length === 0) return rellenar(new Map(), desde, dias);
    condiciones.push(Prisma.sql`"campanaId" IN (${Prisma.join(f.campanaIds)})`);
  }

  const filas = await prisma.$queryRaw<{ dia: Date; tipo: string; total: number }[]>`
    SELECT date_trunc('day', "fecha" AT TIME ZONE 'UTC') AS dia, "tipo", SUM("cantidad")::float AS total
    FROM "Movimiento"
    WHERE ${Prisma.join(condiciones, " AND ")}
    GROUP BY 1, 2
  `;

  const porDia = new Map<string, PuntoDiario>();
  for (const r of filas) {
    const k = claveDia(new Date(r.dia));
    const p = porDia.get(k) ?? { dia: k, recibido: 0, entregado: 0, merma: 0 };
    if (r.tipo === "RECEPCION") p.recibido += r.total;
    else if (r.tipo === "ENTREGA") p.entregado += r.total;
    else if (r.tipo === "MERMA") p.merma += r.total;
    porDia.set(k, p);
  }
  return rellenar(porDia, desde, dias);
}

function rellenar(porDia: Map<string, PuntoDiario>, desde: Date, dias: number): PuntoDiario[] {
  const out: PuntoDiario[] = [];
  for (let i = 0; i < dias; i++) {
    const d = new Date(desde);
    d.setUTCDate(desde.getUTCDate() + i);
    const k = claveDia(d);
    out.push(porDia.get(k) ?? { dia: k, recibido: 0, entregado: 0, merma: 0 });
  }
  return out;
}

/** Existencia actual agrupada por categoría de artículo (deriva de calcularStock). */
export async function stockPorCategoria(filtro: StockFiltro): Promise<BarraCategoria[]> {
  const stock = await calcularStock(filtro);
  const acc = new Map<string, number>();
  for (const s of stock) acc.set(s.categoria, (acc.get(s.categoria) ?? 0) + Math.max(0, s.cantidad));
  return [...acc.entries()]
    .map(([cat, cantidad]) => ({ nombre: CATEGORIA_LABEL[cat] ?? cat, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

/** Unidades recibidas (RECEPCION) por centro dentro de una campaña. */
export async function recibidoPorCentro(campanaId: string): Promise<BarraCategoria[]> {
  const grupos = await prisma.movimiento.groupBy({
    by: ["centroId"],
    where: { ...SOLO_APROBADOS, campanaId, tipo: "RECEPCION" },
    _sum: { cantidad: true },
  });
  if (grupos.length === 0) return [];
  const centros = await prisma.centro.findMany({
    where: { id: { in: grupos.map((g) => g.centroId) } },
    select: { id: true, nombre: true },
  });
  const nombre = new Map(centros.map((c) => [c.id, c.nombre]));
  return grupos
    .map((g) => ({ nombre: nombre.get(g.centroId) ?? g.centroId, cantidad: g._sum.cantidad ?? 0 }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

/** Top artículos por existencia actual (para el dashboard de centro). */
export async function topArticulos(filtro: StockFiltro, n = 8): Promise<BarraCategoria[]> {
  const stock = await calcularStock(filtro);
  return stock
    .filter((s) => s.cantidad > 0)
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, n)
    .map((s) => ({ nombre: `${s.nombre} (${s.unidad})`, cantidad: s.cantidad }));
}
