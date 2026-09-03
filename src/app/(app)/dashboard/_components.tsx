import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { calcularStock, progresoMetas, totalesPorCampana, signoDeMovimiento, type ProgresoMeta } from "@/lib/stock";
import { StatCard, Tabla, TipoBadge, BarraProgreso, BotonCsv, fmtFecha, fmtNum } from "@/components/ui";

// Fila de movimiento reutilizable en las tablas.
async function tablaMovimientos(where: object, opts: { conCentro?: boolean } = {}) {
  const movs = await prisma.movimiento.findMany({
    where,
    orderBy: { fecha: "desc" },
    take: 15,
    include: {
      articulo: true,
      centro: { select: { nombre: true } },
      actor: { select: { nombre: true } },
      institucion: { select: { nombre: true } },
      centroDestino: { select: { nombre: true } },
    },
  });
  const headers = ["Fecha", "Tipo", "Artículo", "Cantidad", ...(opts.conCentro ? ["Centro"] : []), "Actor"];
  const rows = movs.map((m) => {
    const signo = signoDeMovimiento(m.tipo, m.signoPositivo);
    return [
      fmtFecha(m.fecha),
      <TipoBadge key="t" tipo={m.tipo} />,
      m.articulo.nombre,
      <span key="c" className={signo > 0 ? "text-green-700" : "text-red-700"}>
        {signo > 0 ? "+" : "−"}
        {fmtNum(m.cantidad)} {m.articulo.unidad}
      </span>,
      ...(opts.conCentro ? [m.centro.nombre] : []),
      m.actor?.nombre ?? "—",
    ];
  });
  return <Tabla headers={headers} rows={rows} empty="Sin movimientos." />;
}

function TablaStock({ stock }: { stock: Awaited<ReturnType<typeof calcularStock>> }) {
  return (
    <Tabla
      headers={["Artículo", "Categoría", "Existencia"]}
      rows={stock.map((s) => [s.nombre, s.categoria, `${fmtNum(s.cantidad)} ${s.unidad}`])}
      empty="Sin existencias."
    />
  );
}

/** Resumen compacto de metas (solo lectura) para dashboards. */
function MetasResumen({ metas, href }: { metas: ProgresoMeta[]; href?: string }) {
  if (metas.length === 0) return <p className="text-sm text-gray-400">Sin metas definidas.</p>;
  return (
    <ul className="grid gap-3 rounded-xl border bg-white p-5 md:grid-cols-2">
      {metas.map((m) => (
        <li key={m.id}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-medium">{m.nombre}</span>
            <span className="text-gray-500">
              {fmtNum(m.recibido)} / {fmtNum(m.objetivo)} {m.unidad} · <b>{m.porcentaje}%</b>
            </span>
          </div>
          <BarraProgreso porcentaje={m.porcentaje} />
        </li>
      ))}
      {href && (
        <li className="md:col-span-2">
          <Link href={href} className="text-sm text-brand-700 hover:underline">Gestionar metas →</Link>
        </li>
      )}
    </ul>
  );
}

// ─────────────────────────  COORDINADOR GENERAL  ──────────────────────────────
export async function DashboardCoordinador() {
  const [centros, centrosActivos, campanas, movimientos, mermas, entregasPend] = await Promise.all([
    prisma.centro.count(),
    prisma.centro.count({ where: { activo: true } }),
    prisma.campana.count({ where: { activa: true } }),
    prisma.movimiento.count(),
    prisma.movimiento.count({ where: { tipo: "MERMA" } }),
    // Solo cuentan las entregas canalizadas a una institución: las de beneficiario directo no se confirman.
    prisma.movimiento.count({ where: { tipo: "ENTREGA", confirmadaRecibida: false, institucionId: { not: null } } }),
  ]);
  const totales = await totalesPorCampana();
  const metasPorCampana = await Promise.all(
    totales.filter((c) => c.activa).map(async (c) => ({ ...c, metas: await progresoMetas(c.id) })),
  );

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Panel global</h1>
        <div className="flex gap-2">
          <BotonCsv href="/api/movimientos/export" label="Movimientos CSV" />
          <BotonCsv href="/api/stock/export" label="Stock CSV" />
        </div>
      </div>
      <p className="mb-6 text-sm text-gray-500">Visibilidad de todos los centros y campañas.</p>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
        <StatCard label="Centros" value={centros} href="/centros" />
        <StatCard label="Activos" value={centrosActivos} />
        <StatCard label="Campañas activas" value={campanas} href="/campanas" />
        <StatCard label="Movimientos" value={movimientos} href="/movimientos" />
        <StatCard label="Mermas" value={mermas} />
        <StatCard label="Entregas sin confirmar" value={entregasPend} />
      </div>

      <h2 className="mb-3 mt-10 text-lg font-semibold">Totales por campaña</h2>
      <Tabla
        headers={["Campaña", "Estado", "Centros", "Recibido", "Entregado", "Merma", "Stock actual", "Movs.", "Avance metas"]}
        rows={totales.map((c) => [
          <Link key="n" href={`/campanas/${c.id}`} className="font-medium text-brand-700 hover:underline">
            {c.nombre}
          </Link>,
          <span key="e" className={c.activa ? "text-green-700" : "text-gray-400"}>
            {c.activa ? "Activa" : "Cerrada"}
          </span>,
          c.centros,
          fmtNum(c.recibido),
          fmtNum(c.entregado),
          fmtNum(c.merma),
          <b key="s">{fmtNum(c.stock)}</b>,
          c.movimientos,
          c.avanceMetas == null ? "—" : (
            <div key="a" className="flex items-center gap-2">
              <span className="w-10 tabular-nums">{c.avanceMetas}%</span>
              <div className="w-24"><BarraProgreso porcentaje={c.avanceMetas} /></div>
            </div>
          ),
        ])}
        empty="Sin campañas."
      />

      {metasPorCampana.map((c) => (
        <section key={c.id}>
          <h2 className="mb-3 mt-10 text-lg font-semibold">Metas · {c.nombre}</h2>
          <MetasResumen metas={c.metas} href={`/campanas/${c.id}`} />
        </section>
      ))}

      <h2 className="mb-3 mt-10 text-lg font-semibold">Stock global (todos los centros)</h2>
      <TablaStock stock={await calcularStock({})} />

      <h2 className="mb-3 mt-10 text-lg font-semibold">Movimientos recientes</h2>
      {await tablaMovimientos({}, { conCentro: true })}
    </div>
  );
}

// ─────────────────────────  ENCARGADO DE CENTRO  ──────────────────────────────
export async function DashboardEncargado({ centroId }: { centroId: string | null }) {
  if (!centroId) return <SinAsignar tipo="centro" />;
  const centro = await prisma.centro.findUnique({ where: { id: centroId } });
  if (!centro) return <SinAsignar tipo="centro" />;

  const stock = await calcularStock({ centroId });
  const [recepciones, entregas, mermas] = await Promise.all([
    prisma.movimiento.count({ where: { centroId, tipo: "RECEPCION" } }),
    prisma.movimiento.count({ where: { centroId, tipo: "ENTREGA" } }),
    prisma.movimiento.count({ where: { centroId, tipo: "MERMA" } }),
  ]);
  const totalStock = stock.reduce((a, s) => a + s.cantidad, 0);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">{centro.nombre}</h1>
      <p className="mb-6 text-sm text-gray-500">
        {centro.direccion}, {centro.ciudad} · Dashboard del centro
      </p>

      <div className="mb-4 flex gap-3">
        <Link href="/movimientos/nuevo" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          + Registrar movimiento
        </Link>
        <BotonCsv href="/api/movimientos/export" label="Movimientos CSV" />
        <BotonCsv href="/api/stock/export" label="Stock CSV" />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Artículos en stock" value={stock.length} />
        <StatCard label="Unidades totales" value={fmtNum(totalStock)} />
        <StatCard label="Recepciones" value={recepciones} />
        <StatCard label="Entregas / Mermas" value={`${entregas} / ${mermas}`} />
      </div>

      <h2 className="mb-3 mt-10 text-lg font-semibold">Inventario actual</h2>
      <TablaStock stock={stock} />

      <h2 className="mb-3 mt-10 text-lg font-semibold">Movimientos del centro</h2>
      {await tablaMovimientos({ centroId })}
    </div>
  );
}

// ────────────────────────────  VOLUNTARIO  ────────────────────────────────────
export async function DashboardVoluntario({ centroId }: { centroId: string | null }) {
  if (!centroId) return <SinAsignar tipo="centro" />;
  const centro = await prisma.centro.findUnique({ where: { id: centroId } });
  if (!centro) return <SinAsignar tipo="centro" />;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">{centro.nombre}</h1>
      <p className="mb-6 text-sm text-gray-500">
        Voluntario · puedes registrar recepciones y entregas.
      </p>

      <div className="mb-6 flex gap-3">
        <Link href="/movimientos/nuevo?tipo=RECEPCION" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          + Registrar recepción
        </Link>
        <Link href="/movimientos/nuevo?tipo=ENTREGA" className="rounded-md border px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100">
          + Registrar entrega
        </Link>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Inventario del centro</h2>
      <TablaStock stock={await calcularStock({ centroId })} />

      <h2 className="mb-3 mt-10 text-lg font-semibold">Últimos movimientos</h2>
      {await tablaMovimientos({ centroId })}
    </div>
  );
}

// ──────────────────────  INSTITUCIÓN RECEPTORA  ──────────────────────────────
// Nota: la confirmación es interactiva → se usa un client component (EntregasInstitucion).
export async function DashboardInstitucion({ institucionId }: { institucionId: string | null }) {
  if (!institucionId) return <SinAsignar tipo="institución" />;
  const institucion = await prisma.institucion.findUnique({ where: { id: institucionId } });
  const [pendientes, confirmadas] = await Promise.all([
    prisma.movimiento.count({ where: { institucionId, tipo: "ENTREGA", confirmadaRecibida: false } }),
    prisma.movimiento.count({ where: { institucionId, tipo: "ENTREGA", confirmadaRecibida: true } }),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">{institucion?.nombre ?? "Institución"}</h1>
      <p className="mb-6 text-sm text-gray-500">Entregas canalizadas a tu institución.</p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Por confirmar" value={pendientes} />
        <StatCard label="Confirmadas" value={confirmadas} />
      </div>
      <div className="mt-2 text-sm text-gray-500">
        Ve y confirma tus entregas en la sección de abajo.
      </div>
    </div>
  );
}

// ─────────────────────  LÍDER DE CAMPAÑA (opcional)  ──────────────────────────
export async function DashboardLider({ userId }: { userId: string }) {
  const campana = await prisma.campana.findFirst({
    where: { liderId: userId },
    include: { centros: { include: { centro: { select: { id: true, nombre: true, ciudad: true } } } } },
  });
  if (!campana) return <SinAsignar tipo="campaña" />;

  const [stock, metas, recepciones, entregas] = await Promise.all([
    calcularStock({ campanaId: campana.id }),
    progresoMetas(campana.id),
    prisma.movimiento.count({ where: { campanaId: campana.id, tipo: "RECEPCION" } }),
    prisma.movimiento.count({ where: { campanaId: campana.id, tipo: "ENTREGA" } }),
  ]);
  const totalStock = stock.reduce((a, s) => a + s.cantidad, 0);
  const avance = metas.length ? Math.round(metas.reduce((a, m) => a + m.porcentaje, 0) / metas.length) : null;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{campana.nombre}</h1>
        <div className="flex gap-2">
          <BotonCsv href={`/api/movimientos/export?campanaId=${campana.id}`} label="Movimientos CSV" />
          <BotonCsv href={`/api/stock/export?campanaId=${campana.id}`} label="Stock CSV" />
        </div>
      </div>
      <p className="mb-6 text-sm text-gray-500">
        Dashboard agregado de la campaña · {campana.centros.length} centros participantes
        {campana.meta ? ` · Meta: ${campana.meta}` : ""}
      </p>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Centros" value={campana.centros.length} />
        <StatCard label="Artículos en stock" value={stock.length} />
        <StatCard label="Unidades totales" value={fmtNum(totalStock)} />
        <StatCard label="Recepciones / Entregas" value={`${recepciones} / ${entregas}`} />
        <StatCard label="Avance de metas" value={avance == null ? "—" : `${avance}%`} href={`/campanas/${campana.id}`} />
      </div>

      <h2 className="mb-3 mt-10 text-lg font-semibold">Metas de recolección</h2>
      <MetasResumen metas={metas} href={`/campanas/${campana.id}`} />

      <h2 className="mb-3 mt-10 text-lg font-semibold">Centros participantes</h2>
      <Tabla
        headers={["Centro", "Ciudad"]}
        rows={campana.centros.map((c) => [c.centro.nombre, c.centro.ciudad])}
      />

      <h2 className="mb-3 mt-10 text-lg font-semibold">Stock agregado de la campaña</h2>
      <TablaStock stock={stock} />

      <h2 className="mb-3 mt-10 text-lg font-semibold">Movimientos de la campaña</h2>
      {await tablaMovimientos({ campanaId: campana.id }, { conCentro: true })}
    </div>
  );
}

function SinAsignar({ tipo }: { tipo: string }) {
  return (
    <div className="rounded-xl border bg-white p-8 text-center text-gray-500">
      Tu cuenta no tiene {tipo} asignado. Contacta al coordinador general.
    </div>
  );
}
