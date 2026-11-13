"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { registrarMovimiento } from "@/lib/inventario";
import { parseGramos } from "@/lib/format";

export type EstadoTraslado = { error?: string; ok?: string } | undefined;

export async function crearTraslado(_prev: EstadoTraslado, form: FormData): Promise<EstadoTraslado> {
  const s = await requireAdmin();
  const origenId = Number(form.get("origenId"));
  const destinoId = Number(form.get("destinoId"));
  const categoriaId = Number(form.get("categoriaId"));
  const pesoCg = parseGramos(String(form.get("peso") || "0"));
  const cantidad = Number(form.get("cantidad") || 0);
  const nota = String(form.get("nota") || "").trim() || null;

  if (!origenId || !destinoId || origenId === destinoId) return { error: "El local que envía y el que recibe deben ser distintos." };
  const cat = await db.categoria.findUnique({ where: { id: categoriaId } });
  if (!cat) return { error: "Ese tipo de pieza no existe." };
  if (Number.isNaN(pesoCg) || (cat.controlaPeso && pesoCg <= 0)) return { error: "Escriba cuánto pesa lo que va a mover." };
  if (!Number.isInteger(cantidad) || cantidad <= 0) return { error: "Escriba cuántas piezas son." };
  const peso = cat.controlaPeso ? pesoCg : 0;

  try {
    await db.$transaction(async (tx) => {
      const t = await tx.traslado.create({
        data: { origenId, destinoId, usuarioId: s.id, nota, items: { create: [{ categoriaId, pesoCg: peso, cantidad }] } },
      });
      const ref = `TR-${t.id}`;
      await registrarMovimiento(tx, { localId: origenId, categoriaId, usuarioId: s.id, tipo: "TRASLADO_SALIDA", pesoCg: -peso, cantidad: -cantidad, referencia: ref, nota: nota ?? undefined });
      await registrarMovimiento(tx, { localId: destinoId, categoriaId, usuarioId: s.id, tipo: "TRASLADO_ENTRADA", pesoCg: peso, cantidad, referencia: ref, nota: nota ?? undefined });
    });
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/", "layout");
  return { ok: `Listo. El traslado de ${cat.nombre} quedó guardado.` };
}
