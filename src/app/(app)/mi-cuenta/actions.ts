"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSesion } from "@/lib/session";
import { LETRAS } from "@/lib/permisos";

/** Cada persona escoge su tamaño de letra; aplica en todas las pantallas, solo para ella. */
export async function guardarLetra(form: FormData) {
  const s = await requireSesion();
  const letra = String(form.get("letra") || "");
  if (!LETRAS.some((l) => l.clave === letra)) return;
  await db.usuario.update({ where: { id: s.id }, data: { letra } });
  revalidatePath("/", "layout");
}
