import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  recepcionSchema,
  entregaSchema,
  mermaSchema,
  ajusteSchema,
  movimientosFiltroSchema,
  queryToObject,
} from "@/lib/validation";
import { registrarMovimiento, autorizarMovimiento, alcanceMovimientos } from "@/lib/movimientos";
import { ok, fail, handleError } from "@/lib/api";

// GET /api/movimientos?centroId=&campanaId=&tipo=&desde=&hasta=
// El alcance se limita por rol (ver alcanceMovimientos).
export async function GET(req: NextRequest) {
  try {
    const session = await requireUser();
    const filtro = movimientosFiltroSchema.parse(queryToObject(new URL(req.url).searchParams));
    const where = await alcanceMovimientos(session, filtro);

    const movimientos = await prisma.movimiento.findMany({
      where,
      orderBy: { fecha: "desc" },
      take: 200,
      include: {
        centro: { select: { id: true, nombre: true } },
        centroDestino: { select: { id: true, nombre: true } },
        campana: { select: { id: true, nombre: true } },
        articulo: true,
        actor: { select: { id: true, nombre: true } },
        institucion: { select: { id: true, nombre: true } },
      },
    });
    return ok(movimientos);
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/movimientos  body: { tipo, ... }  (recepción, entrega, merma, ajuste)
// Las transferencias van por /api/transferencias.
export async function POST(req: NextRequest) {
  try {
    const session = await requireUser();
    const body = await req.json();
    const tipo = body?.tipo as string;

    switch (tipo) {
      case "RECEPCION": {
        const d = recepcionSchema.parse(body);
        autorizarMovimiento(session, "RECEPCION", d.centroId);
        const mov = await registrarMovimiento({ ...d, tipo: "RECEPCION", actorId: session.userId });
        return ok(mov, 201);
      }
      case "ENTREGA": {
        const d = entregaSchema.parse(body);
        autorizarMovimiento(session, "ENTREGA", d.centroId);
        const mov = await registrarMovimiento({ ...d, tipo: "ENTREGA", actorId: session.userId });
        return ok(mov, 201);
      }
      case "MERMA": {
        const d = mermaSchema.parse(body);
        autorizarMovimiento(session, "MERMA", d.centroId);
        const mov = await registrarMovimiento({ ...d, tipo: "MERMA", actorId: session.userId });
        return ok(mov, 201);
      }
      case "AJUSTE": {
        const d = ajusteSchema.parse(body);
        autorizarMovimiento(session, "AJUSTE", d.centroId);
        const mov = await registrarMovimiento({ ...d, tipo: "AJUSTE", actorId: session.userId });
        return ok(mov, 201);
      }
      default:
        return fail("Tipo de movimiento inválido. Usa RECEPCION, ENTREGA, MERMA o AJUSTE.", 422);
    }
  } catch (err) {
    return handleError(err);
  }
}
