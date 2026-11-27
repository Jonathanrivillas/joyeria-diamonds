import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { db, type Tx } from "./db";

/**
 * IP de quien hace la petición, la que puso NUESTRO proxy (Caddy/Nginx en el VPS).
 * - Primero `x-real-ip`: el proxy la fija con la IP real de la conexión.
 * - Si no viene, la ÚLTIMA de `x-forwarded-for` (la que agregó el proxy). La primera la puede
 *   escribir cualquiera y con eso se saltaba el límite de intentos del inicio de sesión.
 */
export async function ipActual() {
  const h = await headers();
  const real = h.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  const ultima = h.get("x-forwarded-for")?.split(",").map((p) => p.trim()).filter(Boolean).at(-1);
  return (ultima || "desconocida").slice(0, 64);
}

/**
 * Deja constancia de una acción delicada. Si se pasa `tx`, queda dentro de la
 * misma transacción: si la acción falla, tampoco se registra (y viceversa).
 */
export async function auditar(
  quien: { id: number; nombre: string } | null,
  accion: string,
  datos: {
    entidad?: string;
    entidadId?: number;
    detalle?: Prisma.InputJsonValue;
  } = {},
  tx: Tx = db,
) {
  await tx.auditoria.create({
    data: {
      usuarioId: quien?.id ?? null,
      usuarioNombre: quien?.nombre ?? null,
      accion,
      entidad: datos.entidad,
      entidadId: datos.entidadId,
      detalle: datos.detalle,
      ip: await ipActual(),
    },
  });
}
