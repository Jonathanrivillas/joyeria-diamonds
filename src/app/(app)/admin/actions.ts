"use server";

import { auditar } from "@/lib/auditoria";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin, requireSoporte } from "@/lib/session";
import { limpiarPermisos } from "@/lib/permisos";

/**
 * Tipos de pieza (solo soporte). Todo se vende por gramos al precio del día,
 * así que aquí solo se maneja el nombre y si todavía se vende.
 */
export async function guardarCategoria(form: FormData) {
  const s = await requireSoporte();
  const id = Number(form.get("id"));
  const data = {
    nombre: String(form.get("nombre") || "").trim(),
    activa: form.get("activa") === "on",
  };
  if (!data.nombre || data.nombre.length > 60) return;
  if (id) {
    const antes = await db.categoria.findUnique({ where: { id } });
    if (!antes || antes.esServicio) return; // Fabricación y reparación no se editan aquí
    await db.categoria.update({ where: { id }, data });
    await auditar(s, "CATEGORIA_EDITADA", {
      entidad: "Categoria",
      entidadId: id,
      detalle: {
        antes: antes && { nombre: antes.nombre, activa: antes.activa },
        despues: data,
      },
    });
  } else {
    const max = await db.categoria.aggregate({ _max: { orden: true } });
    const nueva = await db.categoria.create({
      data: {
        ...data,
        controlaPeso: true,
        activa: true,
        orden: (max._max.orden ?? 0) + 1,
      },
    });
    await auditar(s, "CATEGORIA_CREADA", {
      entidad: "Categoria",
      entidadId: nueva.id,
      detalle: { despues: data },
    });
  }
  revalidatePath("/", "layout");
}

/** Locales (solo soporte). El prefijo de factura no se puede cambiar después de creado. */
export async function guardarLocal(form: FormData) {
  const s = await requireSoporte();
  const id = Number(form.get("id"));
  const nombre = String(form.get("nombre") || "").trim();
  const direccion = String(form.get("direccion") || "").trim();
  const prefijoFactura = String(form.get("prefijo") || "")
    .trim()
    .toUpperCase();
  // Al editar, el campo del prefijo va deshabilitado y no se envía: solo es obligatorio al crear.
  if (!nombre || nombre.length > 80 || direccion.length > 200) return;
  if (!id && !/^[A-Z0-9]{1,6}$/.test(prefijoFactura)) return;
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
  // Pantallas del vendedor (las casillas del formulario). El administrador ve todo.
  const permisos = limpiarPermisos(form.getAll("permisos").map(String));

  // Siempre se responde con un mensaje: antes, si algo no cuadraba, no pasaba nada y no se sabía por qué.
  const avisar = (clave: "ok" | "error", msg: string) => redirect(`/admin?${clave}=${encodeURIComponent(msg)}#usuarios`);
  if (!nombre) avisar("error", "Escriba el nombre de la persona.");
  if (nombre.length > 100) avisar("error", "El nombre es muy largo (máximo 100 letras).");
  if (!z.email().safeParse(email).success)
    avisar("error", `El correo "${email}" no es válido. Escríbalo sin tildes ni ñ, por ejemplo: laura@joyeria.com`);
  if (password.length < 8) avisar("error", "La contraseña debe tener mínimo 8 caracteres.");
  if (password.length > 200) avisar("error", "La contraseña es demasiado larga.");
  if (rol === "VENDEDOR" && !localId) avisar("error", "Escoja el local del vendedor.");
  if (email === s.email.toLowerCase()) avisar("error", "Ese es su propio correo. Para cambiar su clave use «Mi clave».");

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
      permisos,
      passwordHash: await bcrypt.hash(password, 10),
      debeCambiarClave: true,
    },
    update: {
      nombre,
      rol,
      localId,
      permisos,
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
      permisos,
      ...(existia
        ? { rolAntes: existia.rol, localIdAntes: existia.localId }
        : {}),
      claveAsignada: true, // nunca se guarda la contraseña, solo que se cambió
    },
  });
  revalidatePath("/admin");
  avisar(
    "ok",
    existia
      ? `Se actualizó a ${nombre}: entra con ${email} y la contraseña que escribió (al entrar debe cambiarla).`
      : `Listo, se creó a ${nombre}. Entra con ${email} y la contraseña que escribió (al entrar debe cambiarla).`,
  );
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

/** Qué pantallas puede ver un vendedor. Aplica de inmediato (la sesión se revisa en cada página). */
export async function guardarPermisos(form: FormData) {
  const s = await requireAdmin();
  const id = Number(form.get("id"));
  const u = await db.usuario.findUnique({ where: { id } });
  if (!u || u.rol === "ADMIN") return; // el administrador siempre ve todo
  const permisos = limpiarPermisos(form.getAll("permisos").map(String));
  await db.usuario.update({ where: { id }, data: { permisos } });
  await auditar(s, "PERMISOS_CAMBIADOS", {
    entidad: "Usuario",
    entidadId: id,
    detalle: { email: u.email, antes: u.permisos, despues: permisos },
  });
  revalidatePath("/admin");
}
