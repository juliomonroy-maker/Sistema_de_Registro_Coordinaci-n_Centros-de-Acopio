import { z } from "zod";

const CATEGORIAS = ["NO_PERECEDERO", "PERECEDERO", "ROPA", "LIMPIEZA", "MEDICAMENTO", "OTRO"] as const;
const UNIDADES = ["PIEZA", "KG", "L", "BOLSA", "CAJA"] as const;
const MOTIVOS = ["CADUCIDAD", "DANO", "PERDIDA", "CORRECCION", "OTRO"] as const;
const ROLES = ["COORDINADOR", "ENCARGADO", "VOLUNTARIO", "INSTITUCION", "LIDER_CAMPANA"] as const;
const TIPOS = ["RECEPCION", "ENTREGA", "MERMA", "TRANSFERENCIA_SALIDA", "TRANSFERENCIA_ENTRADA", "AJUSTE"] as const;

// Cantidad física: positiva, finita y con un tope razonable para evitar valores absurdos.
const cantidad = z.number().positive().finite().max(1_000_000);
const id = z.string().min(1).max(64);

// ── Auth ──
export const loginSchema = z.object({
  email: z.string().email().max(254),
  // No se valida longitud mínima aquí: no revelar la política de contraseñas a un atacante.
  password: z.string().min(1).max(200),
});

// ── Usuarios ──
// Coherencia rol ↔ asignación: encargado/voluntario necesitan centro; institución necesita institución.
function asignacionCoherente(u: { rol: (typeof ROLES)[number]; centroId?: string | null; institucionId?: string | null }) {
  if ((u.rol === "ENCARGADO" || u.rol === "VOLUNTARIO") && !u.centroId) return "Este rol requiere un centro asignado.";
  if (u.rol === "INSTITUCION" && !u.institucionId) return "Este rol requiere una institución asignada.";
  return null;
}
export const usuarioCreateSchema = z
  .object({
    nombre: z.string().min(2).max(120),
    email: z.string().email().max(254),
    password: z.string().min(8).max(200),
    rol: z.enum(ROLES),
    centroId: id.optional().nullable(),
    institucionId: id.optional().nullable(),
  })
  .superRefine((u, ctx) => {
    const msg = asignacionCoherente(u);
    if (msg) ctx.addIssue({ code: "custom", message: msg, path: ["rol"] });
  });

export const usuarioUpdateSchema = z.object({
  nombre: z.string().min(2).max(120).optional(),
  rol: z.enum(ROLES).optional(),
  centroId: id.optional().nullable(),
  institucionId: id.optional().nullable(),
  activo: z.boolean().optional(),
  password: z.string().min(8).max(200).optional(),
});
export { asignacionCoherente };

// ── Campañas ──
export const campanaCreateSchema = z.object({
  nombre: z.string().min(2).max(120),
  descripcion: z.string().max(500).optional().nullable(),
  fechaInicio: z.coerce.date().optional(),
  fechaFin: z.coerce.date().optional().nullable(),
  meta: z.string().max(300).optional().nullable(),
  liderId: id.optional().nullable(),
});
export const campanaUpdateSchema = campanaCreateSchema.partial().extend({
  activa: z.boolean().optional(),
  centroIds: z.array(id).max(500).optional(), // centros participantes (reemplaza el conjunto)
});

// Metas cuantitativas por artículo. PUT reemplaza el conjunto completo.
export const metaCampanaSchema = z.object({
  articuloId: id,
  cantidadObjetivo: cantidad,
});
export const metasCampanaPutSchema = z
  .array(metaCampanaSchema)
  .max(200)
  .refine((m) => new Set(m.map((x) => x.articuloId)).size === m.length, {
    message: "Hay artículos repetidos en las metas.",
  });

// ── Centros ──
export const centroCreateSchema = z.object({
  nombre: z.string().min(2).max(120),
  institucion: z.string().max(120).optional().nullable(),
  direccion: z.string().min(3).max(200),
  ciudad: z.string().min(2).max(80),
  estado: z.string().min(2).max(80),
  latitud: z.number().min(-90).max(90).optional().nullable(),
  longitud: z.number().min(-180).max(180).optional().nullable(),
  telefono: z.string().max(30).optional().nullable(),
  encargadoId: id.optional().nullable(),
  campanaIds: z.array(id).max(500).optional(),
});
export const centroUpdateSchema = centroCreateSchema.partial().extend({
  activo: z.boolean().optional(),
});

// ── Instituciones receptoras ──
export const institucionCreateSchema = z.object({
  nombre: z.string().min(2).max(120),
  contacto: z.string().max(120).optional().nullable(),
  telefono: z.string().max(30).optional().nullable(),
  direccion: z.string().max(200).optional().nullable(),
});

// ── Artículos ──
export const articuloCreateSchema = z.object({
  nombre: z.string().min(2).max(120),
  categoria: z.enum(CATEGORIAS),
  unidad: z.enum(UNIDADES),
});

// ── Movimientos ──
// Base común de un movimiento de entrada/salida simple.
const movimientoBase = z.object({
  centroId: id,
  campanaId: id,
  articuloId: id,
  cantidad,
  nota: z.string().max(300).optional().nullable(),
});

export const recepcionSchema = movimientoBase.extend({
  donanteNombre: z.string().max(120).optional().nullable(),
  donanteAnonimo: z.boolean().optional(),
});

export const entregaSchema = movimientoBase.extend({
  institucionId: id.optional().nullable(),
});

export const mermaSchema = movimientoBase.extend({
  motivo: z.enum(["CADUCIDAD", "DANO", "PERDIDA", "OTRO"]),
});

export const ajusteSchema = movimientoBase.extend({
  signoPositivo: z.boolean(),
  motivo: z.enum(["CORRECCION", "OTRO"]),
});

export const transferenciaSchema = z
  .object({
    origenId: id,
    destinoId: id,
    campanaId: id,
    articuloId: id,
    cantidad,
    nota: z.string().max(300).optional().nullable(),
  })
  .refine((d) => d.origenId !== d.destinoId, {
    message: "Origen y destino deben ser distintos.",
    path: ["destinoId"],
  });

// Filtros de consulta/exportación de movimientos (query string).
// `hasta` se interpreta como fin de día para que un rango de fechas sea inclusivo.
export const movimientosFiltroSchema = z.object({
  centroId: id.optional(),
  campanaId: id.optional(),
  tipo: z.enum(TIPOS).optional(),
  desde: z.coerce.date().optional(),
  hasta: z.coerce
    .date()
    .optional()
    .transform((d) => (d ? new Date(d.getTime() + 86_399_999) : undefined)),
});

/** Parsea `URLSearchParams` a objeto plano ignorando vacíos (para los schemas de filtros). */
export function queryToObject(sp: URLSearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  sp.forEach((v, k) => {
    if (v !== "") out[k] = v;
  });
  return out;
}

// Motivo genérico (por si se expone un endpoint unificado)
export const motivoSchema = z.enum(MOTIVOS);
export const rolSchema = z.enum(ROLES);
export const tipoMovimientoSchema = z.enum(TIPOS);
