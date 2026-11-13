import type { Tx } from "./db";
import { gramos } from "./format";

export type TipoMovimiento =
  | "ENTRADA"
  | "VENTA"
  | "ANULACION"
  | "TRASLADO_SALIDA"
  | "TRASLADO_ENTRADA"
  | "AJUSTE_ARQUEO";

/**
 * ÚNICA vía para modificar existencias. Registra el movimiento en el kardex
 * y actualiza el saldo (Existencia). Debe ejecutarse dentro de una transacción.
 * pesoCg y cantidad llevan signo: positivo entra, negativo sale.
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
  }
) {
  const actual = await tx.existencia.upsert({
    where: { localId_categoriaId: { localId: m.localId, categoriaId: m.categoriaId } },
    create: { localId: m.localId, categoriaId: m.categoriaId, pesoCg: 0, cantidad: 0 },
    update: {},
    include: { categoria: true },
  });

  const nuevoPeso = actual.pesoCg + m.pesoCg;
  const nuevaCant = actual.cantidad + m.cantidad;

  if (!m.permitirNegativo && (nuevoPeso < 0 || nuevaCant < 0)) {
    throw new Error(
      `No hay suficiente ${actual.categoria.nombre} en el inventario. Solo hay ${gramos(actual.pesoCg)} y ${actual.cantidad} piezas.`
    );
  }

  await tx.existencia.update({
    where: { id: actual.id },
    data: { pesoCg: nuevoPeso, cantidad: nuevaCant },
  });

  return tx.movimiento.create({
    data: {
      localId: m.localId,
      categoriaId: m.categoriaId,
      usuarioId: m.usuarioId,
      tipo: m.tipo,
      pesoCg: m.pesoCg,
      cantidad: m.cantidad,
      referencia: m.referencia,
      nota: m.nota,
      ...(m.fecha ? { fecha: m.fecha } : {}),
    },
  });
}

/** Siguiente número de factura del local, ej. "L1-000124". */
export async function siguienteNumeroFactura(tx: Tx, localId: number): Promise<string> {
  const local = await tx.local.update({
    where: { id: localId },
    data: { consecutivo: { increment: 1 } },
  });
  return `${local.prefijoFactura}-${String(local.consecutivo).padStart(6, "0")}`;
}
