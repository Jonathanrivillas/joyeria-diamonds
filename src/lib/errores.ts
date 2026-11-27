// Errores que se le pueden mostrar al usuario vs. errores internos.
//
// Regla: lo que el usuario debe leer ("No hay suficiente Anillos…") se lanza como ErrorUsuario.
// Cualquier otro error (Prisma, Neon, red, código) se registra en el servidor y al usuario solo le
// llega un mensaje genérico: así no se filtran nombres de tablas, la dirección de la base, etc.

export class ErrorUsuario extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorUsuario";
  }
}

export const MENSAJE_GENERICO = "No se pudo guardar. Revise la conexión e intente otra vez. Si sigue pasando, avise a soporte.";

/**
 * Texto para mostrar al usuario a partir de un error atrapado.
 * `donde` identifica la acción en el registro del servidor (ej. "crearVenta").
 */
export function mensajeSeguro(e: unknown, donde: string): string {
  if (e instanceof ErrorUsuario) return e.message;
  console.error(`[${new Date().toISOString()}] Error en ${donde}:`, e);
  return MENSAJE_GENERICO;
}
