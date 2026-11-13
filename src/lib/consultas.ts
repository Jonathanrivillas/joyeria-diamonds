import { db } from "./db";
import { finDia, inicioDia } from "./fechas";

export type FilaPlanilla = {
  categoriaId: number;
  nombre: string;
  controlaPeso: boolean;
  entradaPeso: number;
  entradaCant: number;
  salidaPeso: number;
  salidaCant: number;
  saldoPeso: number;
  saldoCant: number;
};

/**
 * Planilla del día (formato del papel): Entrada / Salida / Saldo por categoría.
 * Saldo = existencia actual − movimientos posteriores al cierre del día.
 * localId null = consolidado de todos los locales.
 */
export async function planillaDelDia(localId: number | null, dia: Date): Promise<FilaPlanilla[]> {
  const desde = inicioDia(dia);
  const hasta = finDia(dia);
  const whereLocal = localId ? { localId } : {};

  const [categorias, existencias, delDia, posteriores] = await Promise.all([
    db.categoria.findMany({ where: { activa: true }, orderBy: { orden: "asc" } }),
    db.existencia.groupBy({ by: ["categoriaId"], where: whereLocal, _sum: { pesoCg: true, cantidad: true } }),
    db.movimiento.findMany({
      where: { ...whereLocal, fecha: { gte: desde, lte: hasta } },
      select: { categoriaId: true, pesoCg: true, cantidad: true, tipo: true },
    }),
    db.movimiento.groupBy({
      by: ["categoriaId"],
      where: { ...whereLocal, fecha: { gt: hasta } },
      _sum: { pesoCg: true, cantidad: true },
    }),
  ]);

  const ex = new Map(existencias.map((e) => [e.categoriaId, e._sum]));
  const post = new Map(posteriores.map((p) => [p.categoriaId, p._sum]));

  return categorias.map((c) => {
    const fila: FilaPlanilla = {
      categoriaId: c.id,
      nombre: c.nombre,
      controlaPeso: c.controlaPeso,
      entradaPeso: 0,
      entradaCant: 0,
      salidaPeso: 0,
      salidaCant: 0,
      saldoPeso: (ex.get(c.id)?.pesoCg ?? 0) - (post.get(c.id)?.pesoCg ?? 0),
      saldoCant: (ex.get(c.id)?.cantidad ?? 0) - (post.get(c.id)?.cantidad ?? 0),
    };
    for (const m of delDia) {
      if (m.categoriaId !== c.id) continue;
      // Entradas: todo lo que suma (entradas, anulaciones, traslados que llegan, ajustes +)
      if (m.cantidad > 0 || m.pesoCg > 0) {
        fila.entradaPeso += Math.max(0, m.pesoCg);
        fila.entradaCant += Math.max(0, m.cantidad);
      }
      if (m.cantidad < 0 || m.pesoCg < 0) {
        fila.salidaPeso += Math.max(0, -m.pesoCg);
        fila.salidaCant += Math.max(0, -m.cantidad);
      }
    }
    return fila;
  });
}

/** Resumen financiero de un rango (ventas activas y gastos). */
export async function resumenRango(localId: number | null, desde: Date, hasta: Date) {
  const whereLocal = localId ? { localId } : {};
  const [ventas, gastos, gramosVendidos] = await Promise.all([
    db.venta.aggregate({
      where: { ...whereLocal, estado: "ACTIVA", fecha: { gte: desde, lte: hasta } },
      _sum: { total: true },
      _count: true,
    }),
    db.gasto.aggregate({
      where: { ...whereLocal, fecha: { gte: desde, lte: hasta } },
      _sum: { monto: true },
      _count: true,
    }),
    db.ventaItem.aggregate({
      where: { venta: { ...whereLocal, estado: "ACTIVA", fecha: { gte: desde, lte: hasta } } },
      _sum: { pesoCg: true, cantidad: true },
    }),
  ]);
  const totalVentas = ventas._sum.total ?? 0;
  const totalGastos = gastos._sum.monto ?? 0;
  return {
    totalVentas,
    numVentas: ventas._count,
    totalGastos,
    numGastos: gastos._count,
    neto: totalVentas - totalGastos,
    gramosVendidos: gramosVendidos._sum.pesoCg ?? 0,
    piezasVendidas: gramosVendidos._sum.cantidad ?? 0,
  };
}
