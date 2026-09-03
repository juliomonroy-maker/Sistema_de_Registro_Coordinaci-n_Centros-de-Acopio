import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding…");

  // ── Usuarios ──
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.usuario.upsert({
    where: { email: "admin@acopio.mx" },
    update: {},
    create: { nombre: "Administrador", email: "admin@acopio.mx", passwordHash, rol: "ADMIN" },
  });

  // ── Categorías ──
  const categoriasData = [
    { nombre: "Alimentos", descripcion: "Alimentos no perecederos" },
    { nombre: "Agua", descripcion: "Agua embotellada y garrafones" },
    { nombre: "Ropa", descripcion: "Ropa y calzado" },
    { nombre: "Medicamentos", descripcion: "Medicamentos e insumos médicos" },
    { nombre: "Higiene", descripcion: "Artículos de higiene personal" },
  ];
  const categorias = await Promise.all(
    categoriasData.map((c) =>
      prisma.categoria.upsert({ where: { nombre: c.nombre }, update: {}, create: c }),
    ),
  );
  const catBy = (n: string) => categorias.find((c) => c.nombre === n)!;

  // ── Insumos ──
  const insumosData = [
    { nombre: "Arroz", unidad: "kg", categoriaId: catBy("Alimentos").id },
    { nombre: "Frijol", unidad: "kg", categoriaId: catBy("Alimentos").id },
    { nombre: "Atún enlatado", unidad: "pza", categoriaId: catBy("Alimentos").id },
    { nombre: "Agua embotellada 1L", unidad: "pza", categoriaId: catBy("Agua").id },
    { nombre: "Cobija", unidad: "pza", categoriaId: catBy("Ropa").id },
    { nombre: "Paracetamol 500mg", unidad: "caja", categoriaId: catBy("Medicamentos").id },
    { nombre: "Jabón de tocador", unidad: "pza", categoriaId: catBy("Higiene").id },
  ];
  const insumos = await Promise.all(
    insumosData.map((i) =>
      prisma.insumo.upsert({
        where: { nombre_categoriaId: { nombre: i.nombre, categoriaId: i.categoriaId } },
        update: {},
        create: i,
      }),
    ),
  );
  const insBy = (n: string) => insumos.find((i) => i.nombre === n)!;

  // ── Centros ──
  const centro1 = await prisma.centro.upsert({
    where: { id: "seed-centro-1" },
    update: {},
    create: {
      id: "seed-centro-1",
      nombre: "Centro de Acopio Centro Histórico",
      descripcion: "Punto principal de recepción en el centro de la ciudad.",
      direccion: "Av. Hidalgo 100",
      ciudad: "Ciudad Victoria",
      estado: "Tamaulipas",
      cp: "87000",
      latitud: 23.7369,
      longitud: -99.1411,
      telefono: "834-100-0000",
      responsable: "María López",
      horario: "Lun-Sáb 8:00-20:00",
      capacidad: 5000,
      situacion: "ACTIVO",
    },
  });

  const centro2 = await prisma.centro.upsert({
    where: { id: "seed-centro-2" },
    update: {},
    create: {
      id: "seed-centro-2",
      nombre: "Centro de Acopio Norte",
      direccion: "Blvd. Tamaulipas 4500",
      ciudad: "Ciudad Victoria",
      estado: "Tamaulipas",
      cp: "87025",
      telefono: "834-200-0000",
      responsable: "Juan Pérez",
      horario: "Lun-Vie 9:00-18:00",
      capacidad: 2000,
      situacion: "ACTIVO",
    },
  });

  // Coordinador y voluntario ligados a centros
  await prisma.usuario.upsert({
    where: { email: "coordinador@acopio.mx" },
    update: {},
    create: {
      nombre: "Coordinador Centro",
      email: "coordinador@acopio.mx",
      passwordHash,
      rol: "COORDINADOR",
      centroId: centro1.id,
    },
  });
  await prisma.usuario.upsert({
    where: { email: "voluntario@acopio.mx" },
    update: {},
    create: {
      nombre: "Voluntario Norte",
      email: "voluntario@acopio.mx",
      passwordHash,
      rol: "VOLUNTARIO",
      centroId: centro2.id,
    },
  });

  // ── Inventario inicial ──
  const invData = [
    { centroId: centro1.id, insumoId: insBy("Arroz").id, cantidad: 120 },
    { centroId: centro1.id, insumoId: insBy("Agua embotellada 1L").id, cantidad: 800 },
    { centroId: centro2.id, insumoId: insBy("Cobija").id, cantidad: 45 },
  ];
  for (const inv of invData) {
    await prisma.inventario.upsert({
      where: { centroId_insumoId: { centroId: inv.centroId, insumoId: inv.insumoId } },
      update: { cantidad: inv.cantidad },
      create: inv,
    });
  }

  // ── Necesidades ──
  await prisma.necesidad.createMany({
    data: [
      { centroId: centro2.id, insumoId: insBy("Agua embotellada 1L").id, cantidadRequerida: 500, prioridad: "URGENTE" },
      { centroId: centro2.id, insumoId: insBy("Paracetamol 500mg").id, cantidadRequerida: 30, prioridad: "ALTA" },
      { centroId: centro1.id, insumoId: insBy("Jabón de tocador").id, cantidadRequerida: 200, prioridad: "MEDIA" },
    ],
    skipDuplicates: true,
  });

  // ── Donación de ejemplo ──
  const yaHay = await prisma.donacion.count();
  if (yaHay === 0) {
    await prisma.donacion.create({
      data: {
        centroId: centro1.id,
        donanteNombre: "Empresa Solidaria SA",
        registradaPorId: admin.id,
        items: {
          create: [
            { insumoId: insBy("Frijol").id, cantidad: 50 },
            { insumoId: insBy("Atún enlatado").id, cantidad: 200 },
          ],
        },
      },
    });
    // reflejar en inventario
    await prisma.inventario.upsert({
      where: { centroId_insumoId: { centroId: centro1.id, insumoId: insBy("Frijol").id } },
      update: { cantidad: 50 },
      create: { centroId: centro1.id, insumoId: insBy("Frijol").id, cantidad: 50 },
    });
    await prisma.inventario.upsert({
      where: { centroId_insumoId: { centroId: centro1.id, insumoId: insBy("Atún enlatado").id } },
      update: { cantidad: 200 },
      create: { centroId: centro1.id, insumoId: insBy("Atún enlatado").id, cantidad: 200 },
    });
  }

  console.log("Seed completo.");
  console.log("Usuarios: admin@acopio.mx / coordinador@acopio.mx / voluntario@acopio.mx — pass: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
