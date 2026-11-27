"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { COOKIE_SESION } from "@/lib/token";
import { guardarCookieSesion } from "@/lib/sesion-cookie";
import { COOKIE_LOCAL, getSesion } from "@/lib/session";
import { ipActual } from "@/lib/auditoria";

const VENTANA_MS = 15 * 60 * 1000; // 15 minutos
// Límites en 15 minutos. El de correo + IP frena a quien adivina claves; el de solo correo es alto
// para que nadie pueda bloquear la cuenta de otra persona (ej. la del administrador) equivocándose
// a propósito 5 veces desde otro lado.
const MAX_FALLOS_CORREO_IP = 5;
const MAX_FALLOS_CORREO = 30;
const MAX_FALLOS_IP = 20;
const DIAS_GUARDAR_INTENTOS = 30;

// Cuando el correo no existe se compara contra este hash, para que la respuesta
// tarde lo mismo y no revele qué correos están registrados.
const HASH_FALSO = bcrypt.hashSync("no-es-una-clave-real", 12); // mismo costo que las claves reales

export async function login(
  _prev: { error?: string } | undefined,
  form: FormData,
) {
  const email = String(form.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(form.get("password") || "");
  if (email.length > 254 || password.length > 200) {
    return { error: "Correo o contraseña incorrectos. Revise que estén bien escritos." };
  }

  const ip = await ipActual();
  const desde = new Date(Date.now() - VENTANA_MS);
  const [fallosCorreoIp, fallosCorreo, fallosIp] = await Promise.all([
    db.intentoLogin.count({ where: { email, ip, exito: false, fecha: { gte: desde } } }),
    db.intentoLogin.count({ where: { email, exito: false, fecha: { gte: desde } } }),
    db.intentoLogin.count({ where: { ip, exito: false, fecha: { gte: desde } } }),
  ]);
  if (fallosCorreoIp >= MAX_FALLOS_CORREO_IP || fallosCorreo >= MAX_FALLOS_CORREO || fallosIp >= MAX_FALLOS_IP) {
    return { error: "Hubo demasiados intentos fallidos. Por seguridad, espere 15 minutos e intente de nuevo." };
  }

  const u = await db.usuario.findUnique({ where: { email } });
  const claveOk = await bcrypt.compare(password, u?.passwordHash ?? HASH_FALSO);
  if (!u || !u.activo || !claveOk) {
    await db.intentoLogin.create({ data: { email, ip, exito: false } });
    // De vez en cuando se borran los intentos viejos para que la tabla no crezca sin fin.
    if (Math.random() < 0.05) {
      await db.intentoLogin.deleteMany({ where: { fecha: { lt: new Date(Date.now() - DIAS_GUARDAR_INTENTOS * 86_400_000) } } });
    }
    return { error: "Correo o contraseña incorrectos. Revise que estén bien escritos." };
  }
  await db.intentoLogin.create({ data: { email, ip, exito: true } });

  await guardarCookieSesion(u);
  const c = await cookies();
  c.delete(COOKIE_LOCAL);
  redirect("/");
}

export async function logout() {
  // Se invalida la sesión en el servidor (no solo se borra la cookie): si alguien copió la
  // cookie, deja de servirle. Cierra la sesión de esta persona en todos sus dispositivos.
  const s = await getSesion();
  if (s) await db.usuario.update({ where: { id: s.id }, data: { sesionVersion: { increment: 1 } } });
  const c = await cookies();
  c.delete(COOKIE_SESION);
  c.delete(COOKIE_LOCAL);
  redirect("/login");
}
