"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { parseCOP } from "@/lib/format";

export async function guardarCategoria(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  const data = {
    nombre: String(form.get("nombre") || "").trim(),
    controlaPeso: form.get("controlaPeso") === "on",
    precioGramoSugerido: parseCOP(String(form.get("precioGramo") || "0")) || 0,
    precioUnidadSugerido: parseCOP(String(form.get("precioUnidad") || "0")) || 0,
    activa: form.get("activa") === "on",
  };
  if (!data.nombre) return;
  if (id) {
    await db.categoria.update({ where: { id }, data });
  } else {
    const max = await db.categoria.aggregate({ _max: { orden: true } });
    await db.categoria.create({ data: { ...data, activa: true, orden: (max._max.orden ?? 0) + 1 } });
  }
  revalidatePath("/", "layout");
}

export async function guardarLocal(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  const nombre = String(form.get("nombre") || "").trim();
  const direccion = String(form.get("direccion") || "").trim();
  const prefijoFactura = String(form.get("prefijo") || "").trim().toUpperCase();
  if (!nombre || !prefijoFactura) return;
  if (id) await db.local.update({ where: { id }, data: { nombre, direccion } });
  else await db.local.create({ data: { nombre, direccion, prefijoFactura } });
  revalidatePath("/", "layout");
}

export async function crearUsuario(form: FormData) {
  await requireAdmin();
  const nombre = String(form.get("nombre") || "").trim();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const rol = form.get("rol") === "ADMIN" ? "ADMIN" : "VENDEDOR";
  const localId = rol === "ADMIN" ? null : Number(form.get("localId")) || null;
  if (!nombre || !email || password.length < 8) return;
  await db.usuario.upsert({
    where: { email },
    create: { nombre, email, rol, localId, passwordHash: await bcrypt.hash(password, 10), debeCambiarClave: true },
    update: { nombre, rol, localId, passwordHash: await bcrypt.hash(password, 10), activo: true, sesionVersion: { increment: 1 }, debeCambiarClave: true },
  });
  revalidatePath("/admin");
}

export async function alternarUsuario(form: FormData) {
  const s = await requireAdmin();
  const id = Number(form.get("id"));
  if (id === s.id) return;
  const u = await db.usuario.findUnique({ where: { id } });
  if (!u) return;
  await db.usuario.update({
    where: { id },
    data: { activo: !u.activo, sesionVersion: { increment: 1 } },
  });
  revalidatePath("/admin");
}
