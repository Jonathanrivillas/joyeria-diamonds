-- CreateTable
CREATE TABLE "Local" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NOT NULL DEFAULT '',
    "prefijoFactura" TEXT NOT NULL,
    "consecutivo" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Local_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "localId" INTEGER,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "controlaPeso" BOOLEAN NOT NULL DEFAULT true,
    "precioGramoSugerido" INTEGER NOT NULL DEFAULT 0,
    "precioUnidadSugerido" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Existencia" (
    "id" SERIAL NOT NULL,
    "localId" INTEGER NOT NULL,
    "categoriaId" INTEGER NOT NULL,
    "pesoCg" INTEGER NOT NULL DEFAULT 0,
    "cantidad" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Existencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movimiento" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" TEXT NOT NULL,
    "pesoCg" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "referencia" TEXT,
    "nota" TEXT,
    "localId" INTEGER NOT NULL,
    "categoriaId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,

    CONSTRAINT "Movimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venta" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clienteNombre" TEXT,
    "clienteDocumento" TEXT,
    "metodoPago" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVA',
    "motivoAnulacion" TEXT,
    "localId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,

    CONSTRAINT "Venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentaItem" (
    "id" SERIAL NOT NULL,
    "ventaId" INTEGER NOT NULL,
    "categoriaId" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL DEFAULT '',
    "pesoCg" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioGramo" INTEGER NOT NULL,
    "hechura" INTEGER NOT NULL DEFAULT 0,
    "subtotal" INTEGER NOT NULL,

    CONSTRAINT "VentaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gasto" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" TEXT NOT NULL,
    "monto" INTEGER NOT NULL,
    "justificacion" TEXT NOT NULL,
    "soporte" TEXT,
    "localId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,

    CONSTRAINT "Gasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Arqueo" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'ABIERTO',
    "pesoSistemaCg" INTEGER NOT NULL DEFAULT 0,
    "pesoContadoCg" INTEGER NOT NULL DEFAULT 0,
    "ajustesAplicados" BOOLEAN NOT NULL DEFAULT false,
    "observacion" TEXT,
    "localId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,

    CONSTRAINT "Arqueo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArqueoDetalle" (
    "id" SERIAL NOT NULL,
    "arqueoId" INTEGER NOT NULL,
    "categoriaId" INTEGER NOT NULL,
    "pesoSistemaCg" INTEGER NOT NULL,
    "cantidadSistema" INTEGER NOT NULL,
    "pesoContadoCg" INTEGER,
    "cantidadContada" INTEGER,
    "estado" TEXT,
    "observacion" TEXT,

    CONSTRAINT "ArqueoDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Traslado" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nota" TEXT,
    "origenId" INTEGER NOT NULL,
    "destinoId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,

    CONSTRAINT "Traslado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrasladoItem" (
    "id" SERIAL NOT NULL,
    "trasladoId" INTEGER NOT NULL,
    "categoriaId" INTEGER NOT NULL,
    "pesoCg" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,

    CONSTRAINT "TrasladoItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Local_prefijoFactura_key" ON "Local"("prefijoFactura");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_nombre_key" ON "Categoria"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Existencia_localId_categoriaId_key" ON "Existencia"("localId", "categoriaId");

-- CreateIndex
CREATE INDEX "Movimiento_localId_fecha_idx" ON "Movimiento"("localId", "fecha");

-- CreateIndex
CREATE INDEX "Movimiento_categoriaId_fecha_idx" ON "Movimiento"("categoriaId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "Venta_numero_key" ON "Venta"("numero");

-- CreateIndex
CREATE INDEX "Venta_localId_fecha_idx" ON "Venta"("localId", "fecha");

-- CreateIndex
CREATE INDEX "Gasto_localId_fecha_idx" ON "Gasto"("localId", "fecha");

-- CreateIndex
CREATE INDEX "Arqueo_localId_fecha_idx" ON "Arqueo"("localId", "fecha");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Existencia" ADD CONSTRAINT "Existencia_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Existencia" ADD CONSTRAINT "Existencia_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaItem" ADD CONSTRAINT "VentaItem_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaItem" ADD CONSTRAINT "VentaItem_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Arqueo" ADD CONSTRAINT "Arqueo_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Arqueo" ADD CONSTRAINT "Arqueo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArqueoDetalle" ADD CONSTRAINT "ArqueoDetalle_arqueoId_fkey" FOREIGN KEY ("arqueoId") REFERENCES "Arqueo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArqueoDetalle" ADD CONSTRAINT "ArqueoDetalle_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Traslado" ADD CONSTRAINT "Traslado_origenId_fkey" FOREIGN KEY ("origenId") REFERENCES "Local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Traslado" ADD CONSTRAINT "Traslado_destinoId_fkey" FOREIGN KEY ("destinoId") REFERENCES "Local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Traslado" ADD CONSTRAINT "Traslado_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrasladoItem" ADD CONSTRAINT "TrasladoItem_trasladoId_fkey" FOREIGN KEY ("trasladoId") REFERENCES "Traslado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrasladoItem" ADD CONSTRAINT "TrasladoItem_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
