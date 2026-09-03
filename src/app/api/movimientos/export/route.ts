import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { movimientosFiltroSchema, queryToObject } from "@/lib/validation";
import { alcanceMovimientos } from "@/lib/movimientos";
import { signoDeMovimiento } from "@/lib/stock";
import { toCsv, csvResponse, nombreCsv } from "@/lib/csv";
import { handleError } from "@/lib/api";

const MAX_FILAS = 50_000;

// GET /api/movimientos/export?centroId=&campanaId=&tipo=&desde=&hasta=
// Descarga CSV del ledger con el mismo alcance por rol que el listado.
export async function GET(req: NextRequest) {
  try {
    const session = await requireUser();
    const filtro = movimientosFiltroSchema.parse(queryToObject(new URL(req.url).searchParams));
    const where = await alcanceMovimientos(session, filtro);

    const movs = await prisma.movimiento.findMany({
      where,
      orderBy: { fecha: "desc" },
      take: MAX_FILAS,
      include: {
        centro: { select: { nombre: true } },
        centroDestino: { select: { nombre: true } },
        campana: { select: { nombre: true } },
        articulo: { select: { nombre: true, categoria: true, unidad: true } },
        actor: { select: { nombre: true } },
        institucion: { select: { nombre: true } },
      },
    });

    const headers = [
      "id", "fecha", "tipo", "signo", "centro", "campana", "articulo", "categoria", "unidad",
      "cantidad", "cantidad_con_signo", "motivo", "nota", "actor", "donante", "donante_anonimo",
      "institucion", "entrega_confirmada", "fecha_confirmacion", "centro_contraparte", "grupo_transferencia",
    ];
    const rows = movs.map((m) => {
      const signo = signoDeMovimiento(m.tipo, m.signoPositivo);
      return [
        m.id, m.fecha, m.tipo, signo > 0 ? "ENTRADA" : "SALIDA", m.centro.nombre, m.campana.nombre,
        m.articulo.nombre, m.articulo.categoria, m.articulo.unidad,
        m.cantidad, signo * m.cantidad, m.motivo, m.nota, m.actor?.nombre,
        m.donanteAnonimo ? "Anónimo" : m.donanteNombre, m.donanteAnonimo,
        m.institucion?.nombre, m.tipo === "ENTREGA" ? m.confirmadaRecibida : null, m.confirmadaAt,
        m.centroDestino?.nombre, m.grupoTransferencia,
      ];
    });

    return csvResponse(nombreCsv("movimientos"), toCsv(headers, rows));
  } catch (err) {
    return handleError(err);
  }
}
