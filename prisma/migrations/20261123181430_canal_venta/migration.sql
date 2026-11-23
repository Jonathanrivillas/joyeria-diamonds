-- AlterTable
ALTER TABLE "Venta" ADD COLUMN     "canal" TEXT NOT NULL DEFAULT 'TIENDA',
ADD COLUMN     "red" TEXT,
ADD COLUMN     "redOtra" TEXT;
