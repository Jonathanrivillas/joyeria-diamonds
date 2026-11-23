// Joyas preciosas: piezas que se venden una por una, con código y precio propio.
import { db } from "./db";

export { TIPOS_JOYA } from "./format";

export const NOMBRE_JOYAS = "Joyas preciosas";

/**
 * Devuelve la categoría "Joyas preciosas" y la crea si no existe (así no hace falta un script).
 * Pesa en gramos como las demás, para que arqueos y reportes sigan cuadrando.
 */
export async function asegurarCategoriaJoyas() {
  const existe = await db.categoria.findUnique({ where: { nombre: NOMBRE_JOYAS } });
  if (existe) {
    if (!existe.porPieza) return db.categoria.update({ where: { id: existe.id }, data: { porPieza: true } });
    return existe;
  }
  const max = await db.categoria.aggregate({ _max: { orden: true } });
  return db.categoria.create({
    data: { nombre: NOMBRE_JOYAS, controlaPeso: true, porPieza: true, activa: true, orden: (max._max.orden ?? 0) + 1 },
  });
}

/** Código automático a partir del id: JP-0001, JP-0002... */
export const codigoAutomatico = (id: number) => `JP-${String(id).padStart(4, "0")}`;
