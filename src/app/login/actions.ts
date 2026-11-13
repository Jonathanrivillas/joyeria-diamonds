"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { COOKIE_SESION } from "@/lib/token";
import { guardarCookieSesion } from "@/lib/sesion-cookie";
import { COOKIE_LOCAL } from "@/lib/session";
import { ipActual } from "@/lib/auditoria";

const VENTANA_MS = 15 * 60 * 1000; // 15 minutos
const MAX_FALLOS_CORREO = 5;
const MAX_FALLOS_IP = 20;

// Cuando el correo no existe se compara contra este hash, para que la respuesta
// tarde lo mismo y no revele qué correos están registrados.
const HASH_FALSO = bcrypt.hashSync("no-es-una-clave-real", 10);

export async function login(
  _prev: { error?: string } | undefined,
  form: FormData,
) {
  const email = String(form.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(form.get("password") || "");

  const ip = await ipActual();
  const desde = new Date(Date.now() - VENTANA_MS);
  const [fallosCorreo, fallosIp] = await Promise.all([
    db.intentoLogin.count({ where: { email, exito: false, fecha: { gte: desde } } }),
    db.intentoLogin.count({ where: { ip, exito: false, fecha: { gte: desde } } }),
  ]);
  if (fallosCorreo >= MAX_FALLOS_CORREO || fallosIp >= MAX_FALLOS_IP) {
    return { error: "Hubo demasiados intentos fallidos. Por seguridad, espere 15 minutos e intente de nuevo." };
  }

  const u = await db.usuario.findUnique({ where: { email } });
  const claveOk = await bcrypt.compare(password, u?.passwordHash ?? HASH_FALSO);
  if (!u || !u.activo || !claveOk) {
    await db.intentoLogin.create({ data: { email, ip, exito: false } });
    return { error: "Correo o contraseña incorrectos. Revise que estén bien escritos." };
  }
  await db.intentoLogin.create({ data: { email, ip, exito: true } });

  await guardarCookieSesion(u);
  const c = await cookies();
  c.delete(COOKIE_LOCAL);
  redirect("/");
}

export async function logout() {
  const c = await cookies();
  c.delete(COOKIE_SESION);
  c.delete(COOKIE_LOCAL);
  redirect("/login");
}
