-- CreateTable
CREATE TABLE "MetaCampana" (
    "id" TEXT NOT NULL,
    "campanaId" TEXT NOT NULL,
    "articuloId" TEXT NOT NULL,
    "cantidadObjetivo" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaCampana_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MetaCampana_campanaId_idx" ON "MetaCampana"("campanaId");

-- CreateIndex
CREATE UNIQUE INDEX "MetaCampana_campanaId_articuloId_key" ON "MetaCampana"("campanaId", "articuloId");

-- AddForeignKey
ALTER TABLE "MetaCampana" ADD CONSTRAINT "MetaCampana_campanaId_fkey" FOREIGN KEY ("campanaId") REFERENCES "Campana"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaCampana" ADD CONSTRAINT "MetaCampana_articuloId_fkey" FOREIGN KEY ("articuloId") REFERENCES "Articulo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
