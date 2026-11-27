-- AlterTable
ALTER TABLE "Venta" ADD COLUMN     "alegraIntentoEn" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ArqueoDetalle_arqueoId_idx" ON "ArqueoDetalle"("arqueoId");

-- CreateIndex
CREATE INDEX "Gasto_fecha_idx" ON "Gasto"("fecha");

-- CreateIndex
CREATE INDEX "Gasto_proveedorId_idx" ON "Gasto"("proveedorId");

-- CreateIndex
CREATE INDEX "Movimiento_fecha_idx" ON "Movimiento"("fecha");

-- CreateIndex
CREATE INDEX "Movimiento_proveedorId_tipo_idx" ON "Movimiento"("proveedorId", "tipo");

-- CreateIndex
CREATE INDEX "Pieza_categoriaId_estado_idx" ON "Pieza"("categoriaId", "estado");

-- CreateIndex
CREATE INDEX "Pieza_proveedorId_idx" ON "Pieza"("proveedorId");

-- CreateIndex
CREATE INDEX "TrasladoItem_trasladoId_idx" ON "TrasladoItem"("trasladoId");

-- CreateIndex
CREATE INDEX "Venta_fecha_idx" ON "Venta"("fecha");

-- CreateIndex
CREATE INDEX "Venta_usuarioId_fecha_idx" ON "Venta"("usuarioId", "fecha");

-- CreateIndex
CREATE INDEX "Venta_proveedorId_idx" ON "Venta"("proveedorId");

-- CreateIndex
CREATE INDEX "VentaItem_ventaId_idx" ON "VentaItem"("ventaId");

-- CreateIndex
CREATE INDEX "VentaItem_piezaId_idx" ON "VentaItem"("piezaId");

