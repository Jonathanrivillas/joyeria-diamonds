"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { auditar } from "@/lib/auditoria";
import { precioDelDia } from "@/lib/precio";
import { cop } from "@/lib/format";

export type EstadoPrecio = { error?: string; ok?: string } | undefined;

const MAXIMO = 50_000_000; // pesos por gramo: tope de seguridad contra errores de digitación

/**
 * Guarda el precio del gramo de hoy. Si es igual al vigente, solo queda como
 * "confirmado hoy"; si cambió, además se anota en el historial de cambios.
 */
export async function fijarPrecioGramo(
  _prev: EstadoPrecio,
  form: FormData,
): Promise<EstadoPrecio> {
  const s = await requireAdmin();
  const valor = Number(String(form.get("valor") ?? "").replace(/\D/g, ""));
  if (!Number.isInteger(valor) || valor <= 0)
    return { error: "Escriba cuánto vale el gramo hoy." };
  if (valor > MAXIMO)
    return { error: "Ese precio es demasiado alto. Revise el número." };

  const anterior = await precioDelDia();
  await db.$transaction(async (tx) => {
    await tx.precioGramo.create({ data: { valor, usuarioId: s.id } });
    if (valor !== anterior.valor) {
      await auditar(
        s,
        "PRECIO_GRAMO_CAMBIADO",
        {
          entidad: "PrecioGramo",
          detalle: { antes: anterior.valor, despues: valor },
        },
        tx,
      );
    }
  });
  revalidatePath("/", "layout");
  return {
    ok:
      valor === anterior.valor
        ? `Listo. Hoy el gramo sigue a ${cop(valor)}.`
        : `Listo. Desde ahora el gramo vale ${cop(valor)}.`,
  };
}
