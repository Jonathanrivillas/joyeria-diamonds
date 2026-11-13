"use server";

import { auditar } from "@/lib/auditoria";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { parseCOP } from "@/lib/format";

export async function guardarCategoria(form: FormData) {
  const s = await requireAdmin();
  const id = Number(form.get("id"));
  const data = {
    nombre: String(form.get("nombre") || "").trim(),
    controlaPeso: form.get("controlaPeso") === "on",
    precioGramoSugerido: parseCOP(String(form.get("precioGramo") || "0")) || 0,
    precioUnidadSugerido:
      parseCOP(String(form.get("precioUnidad") || "0")) || 0,
    activa: form.get("activa") === "on",
  };
  if (!data.nombre) return;
  if (id) {
    const antes = await db.categoria.findUnique({ where: { id } });
    await db.categoria.update({ where: { id }, data });
    await auditar(s, "CATEGORIA_EDITADA", {
      entidad: "Categoria",
      entidadId: id,
      detalle: {
        antes: antes && {
          nombre: antes.nombre,
          controlaPeso: antes.controlaPeso,
          precioGramoSugerido: antes.precioGramoSugerido,
          precioUnidadSugerido: antes.precioUnidadSugerido,
          activa: antes.activa,
        },
        despues: data,
      },
    });
  } else {
    const max = await db.categoria.aggregate({ _max: { orden: true } });
    const nueva = await db.categoria.create({
      data: { ...data, activa: true, orden: (max._max.orden ?? 0) + 1 },
    });
    await auditar(s, "CATEGORIA_CREADA", {
      entidad: "Categoria",
      entidadId: nueva.id,
      detalle: { despues: data },
    });
  }
  revalidatePath("/", "layout");
}

export async function guardarLocal(form: FormData) {
  const s = await requireAdmin();
  const id = Number(form.get("id"));
  const nombre = String(form.get("nombre") || "").trim();
  const direccion = String(form.get("direccion") || "").trim();
  const prefijoFactura = String(form.get("prefijo") || "")
    .trim()
    .toUpperCase();
  if (!nombre || !prefijoFactura) return;
  const local = id
    ? await db.local.update({ where: { id }, data: { nombre, direccion } })
    : await db.local.create({ data: { nombre, direccion, prefijoFactura } });
  await auditar(s, "LOCAL_GUARDADO", {
    entidad: "Local",
    entidadId: local.id,
    detalle: { nombre, direccion, prefijoFactura },
  });
  revalidatePath("/", "layout");
}

export async function crearUsuario(form: FormData) {
  const s = await requireAdmin();
  const nombre = String(form.get("nombre") || "").trim();
  const email = String(form.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(form.get("password") || "");
  const rol = form.get("rol") === "ADMIN" ? "ADMIN" : "VENDEDOR";
  const localId = rol === "ADMIN" ? null : Number(form.get("localId")) || null;
  if (!nombre || nombre.length > 100 || password.length < 8 || password.length > 200) return;
  if (!z.email().safeParse(email).success) return;
  const existia = await db.usuario.findUnique({
    where: { email },
    select: { rol: true, localId: true },
  });
  const u = await db.usuario.upsert({
    where: { email },
    create: {
      nombre,
      email,
      rol,
      localId,
      passwordHash: await bcrypt.hash(password, 10),
      debeCambiarClave: true,
    },
    update: {
      nombre,
      rol,
      localId,
      passwordHash: await bcrypt.hash(password, 10),
      activo: true,
      sesionVersion: { increment: 1 },
      debeCambiarClave: true,
    },
  });
  await auditar(s, existia ? "USUARIO_ACTUALIZADO" : "USUARIO_CREADO", {
    entidad: "Usuario",
    entidadId: u.id,
    detalle: {
      email,
      rol,
      localId,
      ...(existia
        ? { rolAntes: existia.rol, localIdAntes: existia.localId }
        : {}),
      claveAsignada: true, // nunca se guarda la contraseña, solo que se cambió
    },
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
  await auditar(s, u.activo ? "USUARIO_DESACTIVADO" : "USUARIO_ACTIVADO", {
    entidad: "Usuario",
    entidadId: id,
    detalle: { email: u.email },
  });

  revalidatePath("/admin");
}
