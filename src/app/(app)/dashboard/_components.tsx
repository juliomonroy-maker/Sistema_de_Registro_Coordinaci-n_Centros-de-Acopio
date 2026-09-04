import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { calcularStock, progresoMetas, totalesPorCampana, signoDeMovimiento, type ProgresoMeta } from "@/lib/stock";
import { serieDiaria, stockPorCategoria, recibidoPorCentro, topArticulos } from "@/lib/graficas";
import { GraficaSerieDiaria, GraficaBarras, GraficaCampanas, GraficaMetas } from "@/components/Graficas";
import {
  cls,
  Cifras,
  Encabezado,
  Seccion,
  Tabla,
  TipoBadge,
  EstadoBadge,
  EstadoActivo,
  BarraProgreso,
  BotonCsv,
  fmtFecha,
  fmtNum,
} from "@/components/ui";

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
      <span key="f" className="whitespace-nowrap text-ink-2">{fmtFecha(m.fecha)}</span>,
      <span key="t" className="inline-flex flex-wrap gap-1">
        <TipoBadge tipo={m.tipo} />
        <EstadoBadge estado={m.estado} />
      </span>,
      m.articulo.nombre,
      <span key="c" className={`whitespace-nowrap font-medium ${signo > 0 ? "text-ink" : "text-ink-2"}`}>
        {signo > 0 ? "+" : "−"}
        {fmtNum(m.cantidad)} <span className="text-ink-3">{m.articulo.unidad}</span>
      </span>,
      ...(opts.conCentro ? [m.centro.nombre] : []),
      <span key="a" className="text-ink-2">{m.actor?.nombre ?? "—"}</span>,
    ];
  });
  return <Tabla headers={headers} rows={rows} empty="Sin movimientos." />;
}

function TablaStock({ stock }: { stock: Awaited<ReturnType<typeof calcularStock>> }) {
  return (
    <Tabla
      headers={["Artículo", "Categoría", "Existencia"]}
      rows={stock.map((s) => [
        <span key="n" className="font-medium">{s.nombre}</span>,
        <span key="c" className="text-ink-2">{s.categoria}</span>,
        <span key="e" className="whitespace-nowrap">{fmtNum(s.cantidad)} <span className="text-ink-3">{s.unidad}</span></span>,
      ])}
      empty="Sin existencias."
    />
  );
}

/** Resumen compacto de metas (solo lectura) para dashboards. */
function MetasResumen({ metas, href }: { metas: ProgresoMeta[]; href?: string }) {
  if (metas.length === 0) return <p className={cls.muted}>Sin metas definidas.</p>;
  return (
    <ul className={`${cls.panel} divide-y divide-line`}>
      {metas.map((m) => (
        <li key={m.id} className="px-4 py-3 sm:px-5">
          <div className="mb-1.5 flex justify-between gap-3 text-sm">
            <span className="font-medium">{m.nombre}</span>
            <span className="whitespace-nowrap text-ink-3">
              {fmtNum(m.recibido)} / {fmtNum(m.objetivo)} {m.unidad} · <b className="text-ink">{m.porcentaje}%</b>
            </span>
          </div>
          <BarraProgreso porcentaje={m.porcentaje} />
        </li>
      ))}
      {href && (
        <li className="px-4 py-3 sm:px-5">
          <Link href={href} className={`${cls.link} text-sm`}>Gestionar metas</Link>
        </li>
      )}
    </ul>
  );
}

// ─────────────────────────  COORDINADOR GENERAL  ──────────────────────────────
export async function DashboardCoordinador() {
  const [centros, centrosActivos, campanas, movimientos, mermas, entregasPend, mermasPend, voluntariosPend] = await Promise.all([
    prisma.centro.count(),
    prisma.centro.count({ where: { activo: true } }),
    prisma.campana.count({ where: { activa: true } }),
    prisma.movimiento.count({ where: { estado: "APROBADO" } }),
    prisma.movimiento.count({ where: { tipo: "MERMA", estado: "APROBADO" } }),
    // Solo cuentan las entregas canalizadas a una institución: las de beneficiario directo no se confirman.
    prisma.movimiento.count({ where: { tipo: "ENTREGA", confirmadaRecibida: false, institucionId: { not: null } } }),
    prisma.movimiento.count({ where: { tipo: "MERMA", estado: "PENDIENTE" } }),
    prisma.usuario.count({ where: { estado: "PENDIENTE" } }),
  ]);
  const [totales, serie, porCategoria] = await Promise.all([totalesPorCampana(), serieDiaria({}), stockPorCategoria({})]);
  const metasPorCampana = await Promise.all(
    totales.filter((c) => c.activa).map(async (c) => ({ ...c, metas: await progresoMetas(c.id) })),
  );
  const pendientes = mermasPend + voluntariosPend;

  return (
    <div>
      <Encabezado
        titulo="Panel global"
        sub="Todos los centros y campañas. Cada cifra sale del ledger de movimientos."
        acciones={
          <>
            <BotonCsv href="/api/movimientos/export" label="Movimientos CSV" />
            <BotonCsv href="/api/stock/export" label="Stock CSV" />
          </>
        }
      />

      {pendientes > 0 && (
        <Link href="/aprobaciones" className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-warn/30 bg-warn-bg px-4 py-3 text-sm text-warn hover:bg-warn/20">
          <span>
            <b>{pendientes}</b> por aprobar: {mermasPend} merma{mermasPend === 1 ? "" : "s"} y {voluntariosPend} voluntario{voluntariosPend === 1 ? "" : "s"}.
          </span>
          <span className="shrink-0 font-medium">Revisar</span>
        </Link>
      )}

      <Cifras
        items={[
          { label: "Centros", value: centros, href: "/centros" },
          { label: "Centros activos", value: centrosActivos, href: "/mapa" },
          { label: "Campañas activas", value: campanas, href: "/campanas" },
          { label: "Movimientos", value: fmtNum(movimientos), href: "/movimientos" },
          { label: "Mermas aprobadas", value: mermas },
          { label: "Entregas sin confirmar", value: entregasPend },
        ]}
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2"><GraficaSerieDiaria datos={serie} /></div>
        <GraficaBarras datos={porCategoria} titulo="Stock por categoría" />
      </div>
      <div className="mt-4">
        <GraficaCampanas datos={totales.map((t) => ({ nombre: t.nombre, recibido: t.recibido, entregado: t.entregado, merma: t.merma }))} />
      </div>

      <Seccion titulo="Totales por campaña">
        <Tabla
          headers={["Campaña", "Estado", "Centros", "Recibido", "Entregado", "Merma", "Stock actual", "Movs.", "Avance metas"]}
          rows={totales.map((c) => [
            <Link key="n" href={`/campanas/${c.id}`} className={`${cls.link} font-medium`}>{c.nombre}</Link>,
            <EstadoActivo key="e" activo={c.activa} labels={["Activa", "Cerrada"]} />,
            c.centros,
            fmtNum(c.recibido),
            fmtNum(c.entregado),
            fmtNum(c.merma),
            <b key="s">{fmtNum(c.stock)}</b>,
            c.movimientos,
            c.avanceMetas == null ? <span className="text-ink-3">—</span> : (
              <div key="a" className="flex items-center gap-2">
                <span className="w-10 tabular-nums">{c.avanceMetas}%</span>
                <div className="w-24"><BarraProgreso porcentaje={c.avanceMetas} /></div>
              </div>
            ),
          ])}
          empty="Sin campañas."
        />
      </Seccion>

      {metasPorCampana.map((c) => (
        <Seccion key={c.id} titulo={`Metas · ${c.nombre}`}>
          <MetasResumen metas={c.metas} href={`/campanas/${c.id}`} />
        </Seccion>
      ))}

      <Seccion titulo="Stock global">
        <TablaStock stock={await calcularStock({})} />
      </Seccion>

      <Seccion titulo="Movimientos recientes" aside={<Link href="/movimientos" className={`${cls.link} text-sm`}>Ver todos</Link>}>
        {await tablaMovimientos({}, { conCentro: true })}
      </Seccion>
    </div>
  );
}

// ─────────────────────────  ENCARGADO DE CENTRO  ──────────────────────────────
export async function DashboardEncargado({ centroId }: { centroId: string | null }) {
  if (!centroId) return <SinAsignar tipo="centro" />;
  const centro = await prisma.centro.findUnique({ where: { id: centroId } });
  if (!centro) return <SinAsignar tipo="centro" />;

  const stock = await calcularStock({ centroId });
  const [recepciones, entregas, mermas, mermasPend, voluntariosPend, serie, top] = await Promise.all([
    prisma.movimiento.count({ where: { centroId, tipo: "RECEPCION" } }),
    prisma.movimiento.count({ where: { centroId, tipo: "ENTREGA" } }),
    prisma.movimiento.count({ where: { centroId, tipo: "MERMA", estado: "APROBADO" } }),
    prisma.movimiento.count({ where: { centroId, tipo: "MERMA", estado: "PENDIENTE" } }),
    prisma.usuario.count({ where: { centroId, rol: "VOLUNTARIO", estado: "PENDIENTE" } }),
    serieDiaria({ centroId }),
    topArticulos({ centroId }),
  ]);
  const totalStock = stock.reduce((a, s) => a + s.cantidad, 0);

  return (
    <div>
      <Encabezado
        titulo={centro.nombre}
        sub={`${centro.direccion}, ${centro.ciudad} · Panel del centro`}
        acciones={
          <>
            <Link href="/movimientos/nuevo" className={cls.btnPrimary}>Registrar movimiento</Link>
            <BotonCsv href="/api/movimientos/export" label="Movimientos CSV" />
            <BotonCsv href="/api/stock/export" label="Stock CSV" />
          </>
        }
      />

      {(mermasPend > 0 || voluntariosPend > 0) && (
        <Link href="/aprobaciones" className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-warn/30 bg-warn-bg px-4 py-3 text-sm text-warn hover:bg-warn/20">
          <span>
            {voluntariosPend > 0 && <>{voluntariosPend} voluntario{voluntariosPend === 1 ? "" : "s"} esperan tu aprobación. </>}
            {mermasPend > 0 && <>{mermasPend} merma{mermasPend === 1 ? "" : "s"} tuya{mermasPend === 1 ? "" : "s"} esperan al coordinador.</>}
          </span>
          <span className="shrink-0 font-medium">Ver</span>
        </Link>
      )}

      <Cifras
        items={[
          { label: "Artículos en stock", value: stock.length },
          { label: "Unidades totales", value: fmtNum(totalStock) },
          { label: "Recepciones", value: recepciones },
          { label: "Entregas", value: entregas },
          { label: "Mermas aprobadas", value: mermas },
          { label: "Mermas en espera", value: mermasPend, tono: mermasPend ? "warn" : undefined, href: "/aprobaciones" },
        ]}
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2"><GraficaSerieDiaria datos={serie} titulo="Actividad del centro (últimos 30 días)" /></div>
        <GraficaBarras datos={top} titulo="Artículos con más existencia" />
      </div>

      <Seccion titulo="Inventario actual">
        <TablaStock stock={stock} />
      </Seccion>

      <Seccion titulo="Movimientos del centro" aside={<Link href="/movimientos" className={`${cls.link} text-sm`}>Ver todos</Link>}>
        {await tablaMovimientos({ centroId })}
      </Seccion>
    </div>
  );
}

// ────────────────────────────  VOLUNTARIO  ────────────────────────────────────
export async function DashboardVoluntario({ centroId }: { centroId: string | null }) {
  if (!centroId) return <SinAsignar tipo="centro" />;
  const centro = await prisma.centro.findUnique({ where: { id: centroId } });
  if (!centro) return <SinAsignar tipo="centro" />;
  const stock = await calcularStock({ centroId });

  return (
    <div>
      <Encabezado titulo={centro.nombre} sub="Voluntario · registras recepciones y entregas de este centro." />

      {/* Las dos acciones que importan, grandes y a la mano en el celular. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/movimientos/nuevo?tipo=RECEPCION" className={`${cls.btnPrimary} min-h-14 text-base`}>
          Registrar recepción
        </Link>
        <Link href="/movimientos/nuevo?tipo=ENTREGA" className={`${cls.btnSecondary} min-h-14 text-base`}>
          Registrar entrega
        </Link>
      </div>

      <div className="mt-6">
        <Cifras items={[{ label: "Artículos en stock", value: stock.length }, { label: "Unidades totales", value: fmtNum(stock.reduce((a, s) => a + s.cantidad, 0)) }]} />
      </div>

      <div className="mt-6">
        <GraficaBarras datos={await stockPorCategoria({ centroId })} titulo="Stock del centro por categoría" />
      </div>

      <Seccion titulo="Inventario del centro">
        <TablaStock stock={stock} />
      </Seccion>

      <Seccion titulo="Últimos movimientos">
        {await tablaMovimientos({ centroId })}
      </Seccion>
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
      <Encabezado titulo={institucion?.nombre ?? "Institución"} sub="Entregas canalizadas a tu institución. Confirma las que ya recibiste." />
      <Cifras items={[{ label: "Por confirmar", value: pendientes, tono: pendientes ? "warn" : undefined }, { label: "Confirmadas", value: confirmadas }]} />
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

  const [stock, metas, recepciones, entregas, serie, porCentro] = await Promise.all([
    calcularStock({ campanaId: campana.id }),
    progresoMetas(campana.id),
    prisma.movimiento.count({ where: { campanaId: campana.id, tipo: "RECEPCION", estado: "APROBADO" } }),
    prisma.movimiento.count({ where: { campanaId: campana.id, tipo: "ENTREGA", estado: "APROBADO" } }),
    serieDiaria({ campanaId: campana.id }),
    recibidoPorCentro(campana.id),
  ]);
  const totalStock = stock.reduce((a, s) => a + s.cantidad, 0);
  const avance = metas.length ? Math.round(metas.reduce((a, m) => a + m.porcentaje, 0) / metas.length) : null;

  return (
    <div>
      <Encabezado
        titulo={campana.nombre}
        sub={`Agregado de ${campana.centros.length} centros participantes${campana.meta ? ` · Meta: ${campana.meta}` : ""}`}
        acciones={
          <>
            <Link href={`/campanas/${campana.id}`} className={cls.btnSecondary}>Gestionar campaña</Link>
            <BotonCsv href={`/api/movimientos/export?campanaId=${campana.id}`} label="Movimientos CSV" />
            <BotonCsv href={`/api/stock/export?campanaId=${campana.id}`} label="Stock CSV" />
          </>
        }
      />

      <Cifras
        items={[
          { label: "Centros", value: campana.centros.length },
          { label: "Artículos en stock", value: stock.length },
          { label: "Unidades totales", value: fmtNum(totalStock) },
          { label: "Recepciones", value: recepciones },
          { label: "Entregas", value: entregas },
          { label: "Avance de metas", value: avance == null ? "—" : `${avance}%`, href: `/campanas/${campana.id}` },
        ]}
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2"><GraficaSerieDiaria datos={serie} titulo="Actividad de la campaña (últimos 30 días)" /></div>
        <GraficaBarras datos={porCentro} titulo="Recibido por centro" />
      </div>
      <div className="mt-4">
        <GraficaMetas metas={metas} />
      </div>

      <Seccion titulo="Metas de recolección">
        <MetasResumen metas={metas} href={`/campanas/${campana.id}`} />
      </Seccion>

      <Seccion titulo="Centros participantes">
        <Tabla headers={["Centro", "Ciudad"]} rows={campana.centros.map((c) => [<span key="n" className="font-medium">{c.centro.nombre}</span>, <span key="c" className="text-ink-2">{c.centro.ciudad}</span>])} />
      </Seccion>

      <Seccion titulo="Stock agregado de la campaña">
        <TablaStock stock={stock} />
      </Seccion>

      <Seccion titulo="Movimientos de la campaña" aside={<Link href="/movimientos" className={`${cls.link} text-sm`}>Ver todos</Link>}>
        {await tablaMovimientos({ campanaId: campana.id }, { conCentro: true })}
      </Seccion>
    </div>
  );
}

function SinAsignar({ tipo }: { tipo: string }) {
  return (
    <div className={`${cls.panel} p-8 text-center text-ink-3`}>
      Tu cuenta no tiene {tipo} asignado. Contacta al coordinador general.
    </div>
  );
}
