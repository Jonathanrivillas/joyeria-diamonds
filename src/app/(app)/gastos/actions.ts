"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSesion, localParaOperar } from "@/lib/session";
import { parseCOP, TIPOS_GASTO } from "@/lib/format";

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

  let soporte: string | null = null;
  const archivo = form.get("soporte");
  if (archivo instanceof File && archivo.size > 0) {
    if (archivo.size > 4 * 1024 * 1024) return { error: "La foto es muy pesada (más de 4 MB). Intente con otra." };
    const ext = path.extname(archivo.name).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".bin";
    const nombre = `gasto-${Date.now()}${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, nombre), Buffer.from(await archivo.arrayBuffer()));
    soporte = `/uploads/${nombre}`;
  }

  await db.gasto.create({
    data: { localId, usuarioId: s.id, tipo, monto, justificacion, soporte },
  });
  revalidatePath("/", "layout");
  return { ok: "Listo, el gasto quedó guardado. Puede anotar otro si necesita." };
}

export async function eliminarGasto(form: FormData) {
  const s = await requireSesion();
  if (s.rol !== "ADMIN") return;
  await db.gasto.delete({ where: { id: Number(form.get("id")) } });
  revalidatePath("/", "layout");
}
