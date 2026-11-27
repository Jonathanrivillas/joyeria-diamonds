"use server";

import { auditar } from "@/lib/auditoria";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { esSoporte, requireAdmin, requireSoporte } from "@/lib/session";
import type { Sesion } from "@/lib/token";

/** Costo de bcrypt para las claves (12: más lento de adivinar que el 10 de antes). */
const COSTO_CLAVE = 12;
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
  if (email === s.email.toLowerCase()) avisar("error", "Ese es su propio correo. Para cambiar su clave use «Mi cuenta».");

  // Solo CREA. Antes, un correo que ya existía se "actualizaba" en silencio (clave y rol nuevos):
  // así un administrador podía quedarse con la cuenta de otro administrador o de soporte.
  const existe = await db.usuario.findUnique({ where: { email }, select: { nombre: true } });
  if (existe)
    avisar("error", `Ya existe un usuario con ese correo (${existe.nombre}). Para darle una clave nueva use «Poner clave temporal» en su fila.`);
  if (rol === "ADMIN" && !esSoporte(s)) avisar("error", "Solo soporte puede crear administradores.");

  const u = await db.usuario.create({
    data: { nombre, email, rol, localId, permisos, passwordHash: await bcrypt.hash(password, COSTO_CLAVE), debeCambiarClave: true },
  });
  await auditar(s, "USUARIO_CREADO", {
    entidad: "Usuario",
    entidadId: u.id,
    detalle: { email, rol, localId, permisos, claveAsignada: true }, // nunca se guarda la contraseña
  });
  revalidatePath("/admin");
  avisar("ok", `Listo, se creó a ${nombre}. Entra con ${email} y la contraseña que escribió (al entrar debe cambiarla).`);
}

/**
 * ¿Puede este administrador cambiar a este usuario? A los vendedores, cualquier administrador.
 * A otros administradores y a las cuentas de soporte, solo soporte (si no, un administrador podría
 * desactivar o quedarse con la cuenta de soporte).
 */
function puedeAdministrar(s: Sesion, u: { id: number; rol: string; email: string }) {
  if (u.id === s.id) return false;
  if (u.rol === "VENDEDOR") return true;
  return esSoporte(s);
}

/** Le pone una clave temporal a un usuario que la olvidó; al entrar debe cambiarla. */
export async function ponerClaveTemporal(form: FormData) {
  const s = await requireAdmin();
  const avisar = (clave: "ok" | "error", msg: string) => redirect(`/admin?${clave}=${encodeURIComponent(msg)}#usuarios`);
  const id = Number(form.get("id"));
  const password = String(form.get("password") || "");
  const u = Number.isInteger(id) && id > 0 ? await db.usuario.findUnique({ where: { id } }) : null;
  if (!u) avisar("error", "Ese usuario no existe.");
  if (!puedeAdministrar(s, u!)) avisar("error", "No puede cambiar la clave de ese usuario.");
  if (password.length < 8) avisar("error", "La clave temporal debe tener mínimo 8 caracteres.");
  if (password.length > 200) avisar("error", "La clave es demasiado larga.");
  await db.usuario.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(password, COSTO_CLAVE), debeCambiarClave: true, sesionVersion: { increment: 1 } },
  });
  await db.intentoLogin.deleteMany({ where: { email: u!.email } }); // la desbloquea si estaba bloqueada
  await auditar(s, "CLAVE_RESTABLECIDA", { entidad: "Usuario", entidadId: id, detalle: { email: u!.email } });
  revalidatePath("/admin");
  avisar("ok", `Listo. ${u!.nombre} entra con la clave temporal que escribió y el sistema le pedirá cambiarla.`);
}

export async function alternarUsuario(form: FormData) {
  const s = await requireAdmin();
  const avisar = (clave: "ok" | "error", msg: string) => redirect(`/admin?${clave}=${encodeURIComponent(msg)}#usuarios`);
  const id = Number(form.get("id"));
  const u = Number.isInteger(id) && id > 0 ? await db.usuario.findUnique({ where: { id } }) : null;
  if (!u) avisar("error", "Ese usuario no existe.");
  if (!puedeAdministrar(s, u!)) avisar("error", u!.id === s.id ? "No puede desactivar su propio usuario." : "Solo soporte puede activar o desactivar administradores.");
  await db.usuario.update({ where: { id }, data: { activo: !u!.activo, sesionVersion: { increment: 1 } } });
  await auditar(s, u!.activo ? "USUARIO_DESACTIVADO" : "USUARIO_ACTIVADO", { entidad: "Usuario", entidadId: id, detalle: { email: u!.email } });
  revalidatePath("/admin");
  avisar("ok", u!.activo ? `${u!.nombre} quedó desactivado: ya no puede entrar.` : `${u!.nombre} puede volver a entrar.`);
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
