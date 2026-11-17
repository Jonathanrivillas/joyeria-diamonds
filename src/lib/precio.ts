import { db } from "./db";
import { inicioDia } from "./fechas";

export type PrecioDelDia = {
  /** Pesos por gramo. 0 = todavía no se ha puesto ningún precio. */
  valor: number;
  /** Cuándo se puso o confirmó por última vez. */
  fecha: Date | null;
  /** Quién lo puso o confirmó. */
  quien: string | null;
  /** true si ya se confirmó hoy. */
  confirmadoHoy: boolean;
};

/**
 * Precio del gramo vigente: el último registrado. Todas las piezas se venden
 * a este precio (la vendedora puede cambiarlo solo para una venta).
 */
export async function precioDelDia(): Promise<PrecioDelDia> {
  const ultimo = await db.precioGramo.findFirst({
    orderBy: { fecha: "desc" },
    include: { usuario: { select: { nombre: true } } },
  });
  if (ultimo) {
    return {
      valor: ultimo.valor,
      fecha: ultimo.fecha,
      quien: ultimo.usuario.nombre,
      confirmadoHoy: ultimo.fecha >= inicioDia(new Date()),
    };
  }
  // Sin historial (instalaciones anteriores a esta función): el precio que tenían las categorías.
  const cat = await db.categoria.aggregate({
    _max: { precioGramoSugerido: true },
  });
  return {
    valor: cat._max.precioGramoSugerido ?? 0,
    fecha: null,
    quien: null,
    confirmadoHoy: false,
  };
}
