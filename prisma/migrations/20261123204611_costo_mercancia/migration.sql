-- AlterTable
ALTER TABLE "Existencia" ADD COLUMN     "costoTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "medidaConCosto" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Gasto" ADD COLUMN     "proveedorId" INTEGER;

-- AlterTable
ALTER TABLE "Movimiento" ADD COLUMN     "costo" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "proveedorId" INTEGER;

-- AlterTable
ALTER TABLE "Venta" ADD COLUMN     "proveedorId" INTEGER;

-- AlterTable
ALTER TABLE "VentaItem" ADD COLUMN     "costo" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "costoMedida" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Proveedor" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "documento" TEXT NOT NULL DEFAULT '',
    "telefono" TEXT NOT NULL DEFAULT '',
    "notas" TEXT NOT NULL DEFAULT '',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Proveedor_nombre_key" ON "Proveedor"("nombre");

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
