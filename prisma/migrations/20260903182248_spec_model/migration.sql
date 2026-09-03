-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('COORDINADOR', 'ENCARGADO', 'VOLUNTARIO', 'INSTITUCION', 'LIDER_CAMPANA');

-- CreateEnum
CREATE TYPE "CategoriaArticulo" AS ENUM ('NO_PERECEDERO', 'PERECEDERO', 'ROPA', 'LIMPIEZA', 'MEDICAMENTO', 'OTRO');

-- CreateEnum
CREATE TYPE "Unidad" AS ENUM ('PIEZA', 'KG', 'L', 'BOLSA', 'CAJA');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('RECEPCION', 'ENTREGA', 'MERMA', 'TRANSFERENCIA_SALIDA', 'TRANSFERENCIA_ENTRADA', 'AJUSTE');

-- CreateEnum
CREATE TYPE "Motivo" AS ENUM ('CADUCIDAD', 'DANO', 'PERDIDA', 'CORRECCION', 'OTRO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'VOLUNTARIO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "centroId" TEXT,
    "institucionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campana" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFin" TIMESTAMP(3),
    "meta" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "liderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campana_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Centro" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "institucion" TEXT,
    "direccion" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "telefono" TEXT,
    "encargadoId" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Centro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CentroCampana" (
    "centroId" TEXT NOT NULL,
    "campanaId" TEXT NOT NULL,

    CONSTRAINT "CentroCampana_pkey" PRIMARY KEY ("centroId","campanaId")
);

-- CreateTable
CREATE TABLE "Institucion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "contacto" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Institucion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Articulo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" "CategoriaArticulo" NOT NULL,
    "unidad" "Unidad" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Articulo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movimiento" (
    "id" TEXT NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "centroId" TEXT NOT NULL,
    "campanaId" TEXT NOT NULL,
    "articuloId" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "signoPositivo" BOOLEAN NOT NULL DEFAULT true,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motivo" "Motivo",
    "nota" TEXT,
    "actorId" TEXT,
    "donanteNombre" TEXT,
    "donanteAnonimo" BOOLEAN NOT NULL DEFAULT false,
    "institucionId" TEXT,
    "confirmadaRecibida" BOOLEAN NOT NULL DEFAULT false,
    "confirmadaAt" TIMESTAMP(3),
    "grupoTransferencia" TEXT,
    "centroDestinoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Movimiento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_centroId_idx" ON "Usuario"("centroId");

-- CreateIndex
CREATE INDEX "Usuario_institucionId_idx" ON "Usuario"("institucionId");

-- CreateIndex
CREATE INDEX "Campana_activa_idx" ON "Campana"("activa");

-- CreateIndex
CREATE INDEX "Centro_activo_idx" ON "Centro"("activo");

-- CreateIndex
CREATE INDEX "Centro_ciudad_idx" ON "Centro"("ciudad");

-- CreateIndex
CREATE INDEX "CentroCampana_campanaId_idx" ON "CentroCampana"("campanaId");

-- CreateIndex
CREATE INDEX "Articulo_categoria_idx" ON "Articulo"("categoria");

-- CreateIndex
CREATE UNIQUE INDEX "Articulo_nombre_categoria_unidad_key" ON "Articulo"("nombre", "categoria", "unidad");

-- CreateIndex
CREATE INDEX "Movimiento_centroId_idx" ON "Movimiento"("centroId");

-- CreateIndex
CREATE INDEX "Movimiento_campanaId_idx" ON "Movimiento"("campanaId");

-- CreateIndex
CREATE INDEX "Movimiento_articuloId_idx" ON "Movimiento"("articuloId");

-- CreateIndex
CREATE INDEX "Movimiento_tipo_idx" ON "Movimiento"("tipo");

-- CreateIndex
CREATE INDEX "Movimiento_grupoTransferencia_idx" ON "Movimiento"("grupoTransferencia");

-- CreateIndex
CREATE INDEX "Movimiento_institucionId_idx" ON "Movimiento"("institucionId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_centroId_fkey" FOREIGN KEY ("centroId") REFERENCES "Centro"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campana" ADD CONSTRAINT "Campana_liderId_fkey" FOREIGN KEY ("liderId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Centro" ADD CONSTRAINT "Centro_encargadoId_fkey" FOREIGN KEY ("encargadoId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CentroCampana" ADD CONSTRAINT "CentroCampana_centroId_fkey" FOREIGN KEY ("centroId") REFERENCES "Centro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CentroCampana" ADD CONSTRAINT "CentroCampana_campanaId_fkey" FOREIGN KEY ("campanaId") REFERENCES "Campana"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_centroId_fkey" FOREIGN KEY ("centroId") REFERENCES "Centro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_campanaId_fkey" FOREIGN KEY ("campanaId") REFERENCES "Campana"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_articuloId_fkey" FOREIGN KEY ("articuloId") REFERENCES "Articulo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_centroDestinoId_fkey" FOREIGN KEY ("centroDestinoId") REFERENCES "Centro"("id") ON DELETE SET NULL ON UPDATE CASCADE;
