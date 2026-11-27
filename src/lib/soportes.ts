// Recibos de gastos (fotos y PDF) guardados en el disco del servidor.
//
// Carpeta: SOPORTES_DIR (en el VPS, ej. /var/lib/joyeria/soportes, fuera del código y dentro del
// respaldo). En desarrollo, ./soportes (ignorada por git).
// En la base (Gasto.soporte) se guarda solo la ruta relativa: "<localId>/<uuid>.<ext>".
// Los recibos viejos de Vercel Blob (https://…) se pasan aquí con scripts/migrar-recibos.ts.
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const RAIZ = path.resolve(process.env.SOPORTES_DIR || "./soportes");

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
  heic: "image/heic",
};

/** Solo nombres que este módulo genera: así nadie puede pedir otro archivo del servidor. */
const NOMBRE_VALIDO = /^\d+\/[0-9a-f-]{36}\.(jpg|png|webp|pdf|heic)$/;

function rutaSegura(rel: string): string | null {
  if (!NOMBRE_VALIDO.test(rel)) return null;
  const completa = path.resolve(RAIZ, rel);
  return completa.startsWith(RAIZ + path.sep) ? completa : null;
}

/** Guarda el archivo y devuelve la ruta relativa para Gasto.soporte. `ext` viene de detectarTipoArchivo. */
export async function guardarSoporte(localId: number, bytes: Uint8Array, ext: string): Promise<string> {
  if (!MIME[ext]) throw new Error(`Tipo de archivo no permitido: ${ext}`);
  const rel = `${localId}/${randomUUID()}.${ext}`;
  const completa = rutaSegura(rel)!;
  await mkdir(path.dirname(completa), { recursive: true });
  await writeFile(completa, bytes, { flag: "wx" }); // "wx": nunca sobrescribe
  return rel;
}

/** Borra un recibo recién guardado (si el gasto no se alcanzó a guardar, no queda huérfano). */
export async function borrarSoporte(rel: string) {
  const completa = rutaSegura(rel);
  if (completa) await unlink(completa).catch(() => {});
}

/** Lee un recibo del disco. null si el nombre no es válido o el archivo no existe. */
export async function leerSoporte(rel: string): Promise<{ bytes: Buffer; mime: string } | null> {
  const completa = rutaSegura(rel);
  if (!completa) return null;
  try {
    return { bytes: await readFile(completa), mime: MIME[path.extname(completa).slice(1)] };
  } catch {
    return null;
  }
}
