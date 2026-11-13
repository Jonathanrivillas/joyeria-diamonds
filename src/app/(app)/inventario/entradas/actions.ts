"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { registrarMovimiento } from "@/lib/inventario";
import { parseGramos } from "@/lib/format";
import { auditar } from "@/lib/auditoria";

export type EstadoForm = { error?: string; ok?: string } | undefined;

export async function registrarEntrada(
  _prev: EstadoForm,
  form: FormData,
): Promise<EstadoForm> {
  const s = await requireAdmin();
  const localId = Number(form.get("localId"));
  const categoriaId = Number(form.get("categoriaId"));
  const pesoCg = parseGramos(String(form.get("peso") || "0"));
  const cantidad = Number(form.get("cantidad") || 0);
  const nota = String(form.get("nota") || "").trim();

  if (!localId || !categoriaId)
    return { error: "Escoja el local y el tipo de pieza." };
  const cat = await db.categoria.findUnique({ where: { id: categoriaId } });
  if (!cat) return { error: "Ese tipo de pieza no existe." };
  if (Number.isNaN(pesoCg) || pesoCg < 0)
    return {
      error: "El peso no se entiende. Escriba solo el número, ej: 5,20",
    };
  if (cat.controlaPeso && pesoCg <= 0)
    return { error: "Escriba cuánto pesa lo que llegó." };
  if (!Number.isInteger(cantidad) || cantidad <= 0)
    return { error: "Escriba cuántas piezas son." };
  if (pesoCg > 100_000_000 || cantidad > 100_000)
    return { error: "El número es demasiado alto. Revíselo." };
  if (nota.length > 300)
    return { error: "La nota es muy larga (máximo 300 letras)." };

  await db.$transaction(async (tx) => {
    await registrarMovimiento(tx, {
      localId,
      categoriaId,
      usuarioId: s.id,
      tipo: "ENTRADA",
      pesoCg: cat.controlaPeso ? pesoCg : 0,
      cantidad,
      nota: nota || "Ingreso de mercancía",
    });
    await auditar(
      s,
      "ENTRADA_MERCANCIA",
      {
        entidad: "Categoria",
        entidadId: categoriaId,
        detalle: {
          localId,
          categoria: cat.nombre,
          pesoCg: cat.controlaPeso ? pesoCg : 0,
          cantidad,
          nota,
        },
      },
      tx,
    );
  });
  revalidatePath("/inventario");
  return { ok: `Listo. Se sumó al inventario de ${cat.nombre}.` };
}
