"use server";

import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { detectarTipoArchivo, TAMANO_MAXIMO } from "@/lib/archivos";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSesion, requireAdmin, localParaOperar } from "@/lib/session";
import { parseCOP, TIPOS_GASTO } from "@/lib/format";
import { auditar } from "@/lib/auditoria";

export type EstadoGasto = { error?: string; ok?: string } | undefined;

export async function registrarGasto(_prev: EstadoGasto, form: FormData): Promise<EstadoGasto> {
  const s = await requireSesion();
  let localId: number;
  try {
    localId = localParaOperar(s, Number(form.get("localId")) || null);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const tipo = String(form.get("tipo") || "");
  const monto = parseCOP(String(form.get("monto") || ""));
  const justificacion = String(form.get("justificacion") || "").trim();

  if (!TIPOS_GASTO[tipo]) return { error: "Toque el tipo de gasto." };
  if (!monto || monto <= 0) return { error: "Escriba cuánto costó." };
  if (justificacion.length < 5) return { error: "Escriba en qué se gastó la plata." };
  if (monto > 1_000_000_000) return { error: "El valor es demasiado alto. Revise el número." };
  if (justificacion.length > 500) return { error: "La explicación es muy larga (máximo 500 letras)." };

  let soporte: string | null = null;
  const archivo = form.get("soporte");
  if (archivo instanceof File && archivo.size > 0) {
    if (archivo.size > TAMANO_MAXIMO) return { error: "La foto es muy pesada (más de 4 MB). Intente con otra." };
    const bytes = new Uint8Array(await archivo.arrayBuffer());
    const tipo = detectarTipoArchivo(bytes);
    if (!tipo) {
      return { error: "Ese archivo no es una foto ni un PDF. Tome la foto otra vez o escoja otra imagen." };
    }
    // Nombre aleatorio: nadie puede adivinar la dirección de otro recibo.
    const subido = await put(`soportes/${localId}/${randomUUID()}.${tipo.ext}`, Buffer.from(bytes), {
      access: "public",
      contentType: tipo.mime,
      addRandomSuffix: true,
    });
    soporte = subido.url;
  }

  await db.gasto.create({
    data: { localId, usuarioId: s.id, tipo, monto, justificacion, soporte },
  });
  revalidatePath("/", "layout");
  return { ok: "Listo, el gasto quedó guardado. Puede anotar otro si necesita." };
}

/** Los gastos nunca se borran: se anulan con motivo y quedan en el historial. */
export async function anularGasto(form: FormData) {
  const s = await requireAdmin();
  const id = Number(form.get("id"));
  const motivo = String(form.get("motivo") || "").trim();
  if (!Number.isInteger(id) || !motivo) return;

  await db.$transaction(async (tx) => {
    const g = await tx.gasto.findUnique({ where: { id } });
    if (!g || g.estado === "ANULADO") return;
    await tx.gasto.update({
      where: { id },
      data: { estado: "ANULADO", motivoAnulacion: motivo, anuladoPorId: s.id, anuladoEn: new Date() },
    });
    await auditar(s, "GASTO_ANULADO", {
      entidad: "Gasto",
      entidadId: id,
      detalle: { monto: g.monto, tipo: g.tipo, justificacion: g.justificacion, motivo },
    }, tx);
  });
  revalidatePath("/", "layout");
}
