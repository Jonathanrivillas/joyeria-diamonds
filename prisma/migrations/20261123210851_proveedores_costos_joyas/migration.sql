-- AlterTable
ALTER TABLE "Categoria" ADD COLUMN     "porPieza" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "VentaItem" ADD COLUMN     "piezaId" INTEGER;

-- CreateTable
CREATE TABLE "Pieza" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL DEFAULT '',
    "pesoCg" INTEGER NOT NULL,
    "precio" INTEGER NOT NULL,
    "costo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'DISPONIBLE',
    "localId" INTEGER NOT NULL,
    "categoriaId" INTEGER NOT NULL,
    "proveedorId" INTEGER,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pieza_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pieza_codigo_key" ON "Pieza"("codigo");

-- CreateIndex
CREATE INDEX "Pieza_localId_estado_idx" ON "Pieza"("localId", "estado");

-- AddForeignKey
ALTER TABLE "VentaItem" ADD CONSTRAINT "VentaItem_piezaId_fkey" FOREIGN KEY ("piezaId") REFERENCES "Pieza"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pieza" ADD CONSTRAINT "Pieza_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pieza" ADD CONSTRAINT "Pieza_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pieza" ADD CONSTRAINT "Pieza_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
