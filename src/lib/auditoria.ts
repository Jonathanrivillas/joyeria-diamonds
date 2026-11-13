import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { db, type Tx } from "./db";

/** IP de quien hace la petición (en Vercel viene en x-forwarded-for). */
export async function ipActual() {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0].trim() ||
    h.get("x-real-ip") ||
    "desconocida"
  );
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
