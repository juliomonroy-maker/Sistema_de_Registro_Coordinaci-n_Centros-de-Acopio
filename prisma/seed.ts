import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding…");
  const passwordHash = await bcrypt.hash("password123", 10);

  // ── Instituciones receptoras ──
  const dif = await prisma.institucion.upsert({
    where: { id: "seed-inst-1" },
    update: {},
    create: { id: "seed-inst-1", nombre: "DIF Municipal", contacto: "Lic. Ana Ruiz", telefono: "834-300-0000" },
  });

  // ── Usuarios (uno por rol) ──
  const coordinador = await prisma.usuario.upsert({
    where: { email: "coordinador@acopio.mx" },
    update: {},
    create: { nombre: "Coordinador General", email: "coordinador@acopio.mx", passwordHash, rol: "COORDINADOR" },
  });

  const lider = await prisma.usuario.upsert({
    where: { email: "lider@acopio.mx" },
    update: {},
    create: { nombre: "Líder Campaña", email: "lider@acopio.mx", passwordHash, rol: "LIDER_CAMPANA" },
  });

  await prisma.usuario.upsert({
    where: { email: "institucion@acopio.mx" },
    update: {},
    create: {
      nombre: "DIF Municipal (receptora)",
      email: "institucion@acopio.mx",
      passwordHash,
      rol: "INSTITUCION",
      institucionId: dif.id,
    },
  });

  // ── Campaña ──
  const campana = await prisma.campana.upsert({
    where: { id: "seed-camp-1" },
    update: {},
    create: {
      id: "seed-camp-1",
      nombre: "Apoyo Huracán 2026",
      descripcion: "Recolección de víveres e insumos para damnificados.",
      meta: "10,000 artículos",
      liderId: lider.id,
      activa: true,
    },
  });

  // ── Centros ──
  const centro1 = await prisma.centro.upsert({
    where: { id: "seed-centro-1" },
    update: {},
    create: {
      id: "seed-centro-1",
      nombre: "Centro de Acopio Centro Histórico",
      institucion: "Universidad IEST",
      direccion: "Av. Hidalgo 100",
      ciudad: "Ciudad Victoria",
      estado: "Tamaulipas",
      latitud: 23.7369,
      longitud: -99.1411,
      telefono: "834-100-0000",
      activo: true,
    },
  });

  const centro2 = await prisma.centro.upsert({
    where: { id: "seed-centro-2" },
    update: {},
    create: {
      id: "seed-centro-2",
      nombre: "Centro de Acopio Norte",
      institucion: "Escuela Secundaria 5",
      direccion: "Blvd. Tamaulipas 4500",
      ciudad: "Ciudad Victoria",
      estado: "Tamaulipas",
      telefono: "834-200-0000",
      activo: true,
    },
  });

  // Encargados + voluntario ligados a centros
  const encargado1 = await prisma.usuario.upsert({
    where: { email: "encargado@acopio.mx" },
    update: {},
    create: { nombre: "Encargado Centro Histórico", email: "encargado@acopio.mx", passwordHash, rol: "ENCARGADO", centroId: centro1.id },
  });
  await prisma.usuario.upsert({
    where: { email: "encargado2@acopio.mx" },
    update: {},
    create: { nombre: "Encargado Norte", email: "encargado2@acopio.mx", passwordHash, rol: "ENCARGADO", centroId: centro2.id },
  });
  const voluntario = await prisma.usuario.upsert({
    where: { email: "voluntario@acopio.mx" },
    update: {},
    create: { nombre: "Voluntario Centro Histórico", email: "voluntario@acopio.mx", passwordHash, rol: "VOLUNTARIO", centroId: centro1.id },
  });

  // Asignar encargados a sus centros
  await prisma.centro.update({ where: { id: centro1.id }, data: { encargadoId: encargado1.id } });

  // Vincular centros a la campaña
  for (const centroId of [centro1.id, centro2.id]) {
    await prisma.centroCampana.upsert({
      where: { centroId_campanaId: { centroId, campanaId: campana.id } },
      update: {},
      create: { centroId, campanaId: campana.id },
    });
  }

  // ── Artículos ──
  const articulosData = [
    { id: "seed-art-1", nombre: "Arroz", categoria: "NO_PERECEDERO", unidad: "KG" },
    { id: "seed-art-2", nombre: "Agua embotellada 1L", categoria: "NO_PERECEDERO", unidad: "PIEZA" },
    { id: "seed-art-3", nombre: "Cobija", categoria: "ROPA", unidad: "PIEZA" },
    { id: "seed-art-4", nombre: "Paracetamol 500mg", categoria: "MEDICAMENTO", unidad: "CAJA" },
    { id: "seed-art-5", nombre: "Jabón", categoria: "LIMPIEZA", unidad: "PIEZA" },
  ] as const;
  for (const a of articulosData) {
    await prisma.articulo.upsert({ where: { id: a.id }, update: {}, create: a });
  }

  // ── Metas de recolección por artículo ──
  for (const m of [
    { articuloId: "seed-art-1", cantidadObjetivo: 500 },
    { articuloId: "seed-art-2", cantidadObjetivo: 2000 },
    { articuloId: "seed-art-3", cantidadObjetivo: 150 },
  ]) {
    await prisma.metaCampana.upsert({
      where: { campanaId_articuloId: { campanaId: campana.id, articuloId: m.articuloId } },
      update: { cantidadObjetivo: m.cantidadObjetivo },
      create: { campanaId: campana.id, ...m },
    });
  }

  // ── Movimientos de ejemplo (ledger) ──
  const yaHay = await prisma.movimiento.count();
  if (yaHay === 0) {
    // Recepciones en centro1
    await prisma.movimiento.createMany({
      data: [
        { tipo: "RECEPCION", centroId: centro1.id, campanaId: campana.id, articuloId: "seed-art-1", cantidad: 200, actorId: voluntario.id, donanteNombre: "Empresa Solidaria SA" },
        { tipo: "RECEPCION", centroId: centro1.id, campanaId: campana.id, articuloId: "seed-art-2", cantidad: 1000, actorId: voluntario.id, donanteAnonimo: true },
        { tipo: "RECEPCION", centroId: centro2.id, campanaId: campana.id, articuloId: "seed-art-3", cantidad: 80, actorId: encargado1.id },
      ],
    });
    // Merma en centro1 (motivo obligatorio)
    await prisma.movimiento.create({
      data: { tipo: "MERMA", centroId: centro1.id, campanaId: campana.id, articuloId: "seed-art-1", cantidad: 10, motivo: "DANO", actorId: encargado1.id, nota: "Sacos rotos" },
    });
    // Entrega desde centro1 a institución (sin confirmar)
    await prisma.movimiento.create({
      data: { tipo: "ENTREGA", centroId: centro1.id, campanaId: campana.id, articuloId: "seed-art-2", cantidad: 300, actorId: encargado1.id, institucionId: dif.id },
    });
    // Transferencia ligada centro1 → centro2 (arroz 50)
    const salida = await prisma.movimiento.create({
      data: { tipo: "TRANSFERENCIA_SALIDA", centroId: centro1.id, campanaId: campana.id, articuloId: "seed-art-1", cantidad: 50, actorId: encargado1.id, centroDestinoId: centro2.id },
    });
    await prisma.movimiento.update({ where: { id: salida.id }, data: { grupoTransferencia: salida.id } });
    await prisma.movimiento.create({
      data: { tipo: "TRANSFERENCIA_ENTRADA", centroId: centro2.id, campanaId: campana.id, articuloId: "seed-art-1", cantidad: 50, actorId: encargado1.id, centroDestinoId: centro1.id, grupoTransferencia: salida.id },
    });
  }

  console.log("Seed completo.");
  console.log("Usuarios (pass: password123):");
  console.log("  coordinador@acopio.mx  (COORDINADOR)");
  console.log("  encargado@acopio.mx    (ENCARGADO centro 1)");
  console.log("  voluntario@acopio.mx   (VOLUNTARIO centro 1)");
  console.log("  institucion@acopio.mx  (INSTITUCION receptora)");
  console.log("  lider@acopio.mx        (LIDER_CAMPANA)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
