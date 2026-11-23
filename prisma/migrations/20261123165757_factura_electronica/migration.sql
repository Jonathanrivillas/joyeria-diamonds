-- AlterTable
ALTER TABLE "Categoria" ADD COLUMN     "alegraItemId" TEXT;

-- AlterTable
ALTER TABLE "Venta" ADD COLUMN     "alegraError" TEXT,
ADD COLUMN     "alegraEstado" TEXT,
ADD COLUMN     "alegraId" TEXT,
ADD COLUMN     "alegraNumero" TEXT,
ADD COLUMN     "clienteCorreo" TEXT,
ADD COLUMN     "clienteTipoDoc" TEXT,
ADD COLUMN     "facturaElectronica" BOOLEAN NOT NULL DEFAULT false;
