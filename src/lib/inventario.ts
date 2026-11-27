import type { Tx } from "./db";
import { gramos } from "./format";
import { ErrorUsuario } from "./errores";

export type TipoMovimiento =
  | "ENTRADA"
  | "VENTA"
  | "ANULACION"
  | "TRASLADO_SALIDA"
  | "TRASLADO_ENTRADA"
  | "AJUSTE_ARQUEO"
  // Pasar mercancía de una categoría a otra (ej. esmeraldas viejas → Joyas preciosas)
  | "RECLASIFICACION_SALIDA"
  | "RECLASIFICACION_ENTRADA";

/**
 * Costo de compra conocido que se mueve con la mercancía.
 * `medida` = centigramos si la categoría controla peso, o piezas si no.
 */
export type CostoMovido = { medida: number; valor: number };

/**
 * ÚNICA vía para modificar existencias. Registra el movimiento en el kardex
 * y actualiza el saldo (Existencia). Debe ejecutarse dentro de una transacción.
 * pesoCg y cantidad llevan signo: positivo entra, negativo sale.
 *
 * Costo de compra: lo que entra con `costo` (compras, anulaciones, traslados) suma a la parte
 * con costo conocido. Lo que sale gasta PRIMERO la parte sin costo (la mercancía vieja, de antes
 * de registrar precios) y después la que tiene costo, al costo promedio. Devuelve en `costoSalida`
 * cuánto costo salió, para guardarlo en la venta o pasarlo al local de destino de un traslado.
 */
export async function registrarMovimiento(
  tx: Tx,
  m: {
    localId: number;
    categoriaId: number;
    usuarioId: number;
    tipo: TipoMovimiento;
    pesoCg: number;
    cantidad: number;
    referencia?: string;
    nota?: string;
    fecha?: Date;
    permitirNegativo?: boolean;
    /** Solo en movimientos que entran: costo conocido de lo que entra. Sin él, entra "sin costo". */
    costo?: CostoMovido;
    /**
     * Solo en movimientos que salen, cuando se sabe exactamente qué sale (una joya preciosa con su
     * costo). Reemplaza el cálculo "lo viejo primero, luego al promedio".
     */
    costoExacto?: CostoMovido;
    proveedorId?: number;
  }
): Promise<{ costoSalida: CostoMovido }> {
  // Bloqueo de la fila: si dos operaciones tocan el mismo local + tipo de pieza al mismo tiempo,
  // la segunda espera a que la primera termine. Sin esto, ambas leían el mismo saldo y una borraba
  // el cambio de la otra (ej. 100 g, +50 y −10 a la vez → 150 o 90 en vez de 140).
  // 1) Crear la fila si no existe, sin chocar si otra operación la crea al mismo tiempo.
  await tx.$executeRaw`
    INSERT INTO "Existencia" ("localId", "categoriaId") VALUES (${m.localId}, ${m.categoriaId})
    ON CONFLICT ("localId", "categoriaId") DO NOTHING`;
  // 2) Bloquearla hasta que termine la transacción.
  await tx.$queryRaw`
    SELECT id FROM "Existencia" WHERE "localId" = ${m.localId} AND "categoriaId" = ${m.categoriaId} FOR UPDATE`;
  // 3) Leerla ya bloqueada (valores al día).
  const actual = await tx.existencia.findUniqueOrThrow({
    where: { localId_categoriaId: { localId: m.localId, categoriaId: m.categoriaId } },
    include: { categoria: true },
  });

  const nuevoPeso = actual.pesoCg + m.pesoCg;
  const nuevaCant = actual.cantidad + m.cantidad;

  if (!m.permitirNegativo && (nuevoPeso < 0 || nuevaCant < 0)) {
    throw new ErrorUsuario(
      `No hay suficiente ${actual.categoria.nombre} en el inventario. Solo hay ${gramos(actual.pesoCg)} y ${actual.cantidad} piezas.`
    );
  }

  // ---- Costo de compra ----
  const porPeso = actual.categoria.controlaPeso;
  const medidaActual = porPeso ? actual.pesoCg : actual.cantidad;
  const delta = porPeso ? m.pesoCg : m.cantidad; // + entra, - sale
  let medidaConCosto = actual.medidaConCosto;
  let costoTotal = actual.costoTotal;
  let costoSalida: CostoMovido = { medida: 0, valor: 0 };
  let costoMov = 0;

  if (delta > 0 && m.costo && m.costo.medida > 0) {
    const medida = Math.min(m.costo.medida, delta);
    const valor = m.costo.valor * (medida / m.costo.medida);
    medidaConCosto += medida;
    costoTotal += valor;
    costoMov = valor;
  } else if (delta < 0 && m.costoExacto) {
    const deCosto = Math.min(medidaConCosto, m.costoExacto.medida);
    if (deCosto > 0) {
      const valor = m.costoExacto.valor * (deCosto / m.costoExacto.medida);
      medidaConCosto -= deCosto;
      costoTotal -= valor;
      costoSalida = { medida: deCosto, valor };
      costoMov = -valor;
    }
  } else if (delta < 0) {
    const sale = -delta;
    const sinCosto = Math.max(0, medidaActual - medidaConCosto); // lo viejo sale primero
    const deCosto = Math.min(medidaConCosto, Math.max(0, sale - sinCosto));
    if (deCosto > 0) {
      const valor = medidaConCosto > 0 ? costoTotal * (deCosto / medidaConCosto) : 0;
      medidaConCosto -= deCosto;
      costoTotal -= valor;
      costoSalida = { medida: deCosto, valor };
      costoMov = -valor;
    }
  }
  // Si se vació la parte con costo, se limpia el residuo de redondeo.
  if (medidaConCosto <= 0) {
    medidaConCosto = 0;
    costoTotal = 0;
  }

  await tx.existencia.update({
    where: { id: actual.id },
    data: { pesoCg: nuevoPeso, cantidad: nuevaCant, medidaConCosto, costoTotal },
  });

  await tx.movimiento.create({
    data: {
      localId: m.localId,
      categoriaId: m.categoriaId,
      usuarioId: m.usuarioId,
      tipo: m.tipo,
      pesoCg: m.pesoCg,
      cantidad: m.cantidad,
      referencia: m.referencia,
      nota: m.nota,
      costo: costoMov,
      proveedorId: m.proveedorId ?? null,
      ...(m.fecha ? { fecha: m.fecha } : {}),
    },
  });

  return { costoSalida };
}

/** Siguiente número de factura del local, ej. "L1-000124". */
export async function siguienteNumeroFactura(tx: Tx, localId: number): Promise<string> {
  const local = await tx.local.update({
    where: { id: localId },
    data: { consecutivo: { increment: 1 } },
  });
  return `${local.prefijoFactura}-${String(local.consecutivo).padStart(6, "0")}`;
}
