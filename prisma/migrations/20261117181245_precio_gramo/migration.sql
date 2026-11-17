-- CreateTable
CREATE TABLE "PrecioGramo" (
    "id" SERIAL NOT NULL,
    "valor" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" INTEGER NOT NULL,

    CONSTRAINT "PrecioGramo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrecioGramo_fecha_idx" ON "PrecioGramo"("fecha");

-- AddForeignKey
ALTER TABLE "PrecioGramo" ADD CONSTRAINT "PrecioGramo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
