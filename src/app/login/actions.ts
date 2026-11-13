"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { COOKIE_SESION, firmarSesion } from "@/lib/token";
import { COOKIE_LOCAL } from "@/lib/session";

export async function login(
  _prev: { error?: string } | undefined,
  form: FormData,
) {
  const email = String(form.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(form.get("password") || "");

  const u = await db.usuario.findUnique({ where: { email } });
  if (!u || !u.activo || !(await bcrypt.compare(password, u.passwordHash))) {
    return { error: "Correo o contraseña incorrectos" };
  }

  const token = await firmarSesion({
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol as "ADMIN" | "VENDEDOR",
    localId: u.localId,
    version: u.sesionVersion,
  });
  const c = await cookies();
  c.set(COOKIE_SESION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 10,
  });
  c.delete(COOKIE_LOCAL);
  redirect("/");
}

export async function logout() {
  const c = await cookies();
  c.delete(COOKIE_SESION);
  c.delete(COOKIE_LOCAL);
  redirect("/login");
}
