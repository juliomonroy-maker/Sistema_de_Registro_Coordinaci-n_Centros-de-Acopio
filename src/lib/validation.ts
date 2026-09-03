import { z } from "zod";

// ── Centros ──
export const centroCreateSchema = z.object({
  nombre: z.string().min(2).max(120),
  descripcion: z.string().max(500).optional().nullable(),
  direccion: z.string().min(3).max(200),
  ciudad: z.string().min(2).max(80),
  estado: z.string().min(2).max(80),
  cp: z.string().max(10).optional().nullable(),
  latitud: z.number().min(-90).max(90).optional().nullable(),
  longitud: z.number().min(-180).max(180).optional().nullable(),
  telefono: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().nullable(),
  responsable: z.string().max(120).optional().nullable(),
  horario: z.string().max(120).optional().nullable(),
  capacidad: z.number().int().positive().optional().nullable(),
  situacion: z.enum(["ACTIVO", "INACTIVO", "LLENO"]).optional(),
});
export const centroUpdateSchema = centroCreateSchema.partial();

// ── Insumos / Categorías ──
export const categoriaCreateSchema = z.object({
  nombre: z.string().min(2).max(80),
  descripcion: z.string().max(300).optional().nullable(),
});

export const insumoCreateSchema = z.object({
  nombre: z.string().min(2).max(120),
  unidad: z.string().min(1).max(20),
  categoriaId: z.string().cuid(),
});

// ── Donaciones ──
export const donacionCreateSchema = z.object({
  centroId: z.string().cuid(),
  donanteNombre: z.string().max(120).optional().nullable(),
  donanteTel: z.string().max(30).optional().nullable(),
  notas: z.string().max(500).optional().nullable(),
  items: z
    .array(
      z.object({
        insumoId: z.string().cuid(),
        cantidad: z.number().positive(),
      }),
    )
    .min(1, "Registra al menos un insumo."),
});

// ── Necesidades ──
export const necesidadCreateSchema = z.object({
  centroId: z.string().cuid(),
  insumoId: z.string().cuid(),
  cantidadRequerida: z.number().positive(),
  prioridad: z.enum(["BAJA", "MEDIA", "ALTA", "URGENTE"]).optional(),
});
export const necesidadUpdateSchema = z.object({
  cantidadRequerida: z.number().positive().optional(),
  prioridad: z.enum(["BAJA", "MEDIA", "ALTA", "URGENTE"]).optional(),
  cubierta: z.boolean().optional(),
});

// ── Transferencias ──
export const transferenciaCreateSchema = z
  .object({
    origenId: z.string().cuid(),
    destinoId: z.string().cuid(),
    notas: z.string().max(500).optional().nullable(),
    items: z
      .array(
        z.object({
          insumoId: z.string().cuid(),
          cantidad: z.number().positive(),
        }),
      )
      .min(1, "Agrega al menos un insumo a transferir."),
  })
  .refine((d) => d.origenId !== d.destinoId, {
    message: "Origen y destino deben ser distintos.",
    path: ["destinoId"],
  });

export const transferenciaEstadoSchema = z.object({
  estado: z.enum(["SOLICITADA", "APROBADA", "EN_TRANSITO", "COMPLETADA", "CANCELADA"]),
});

// ── Auth ──
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
