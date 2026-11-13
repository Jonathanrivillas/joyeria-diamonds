"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSesion } from "@/lib/session";
import { guardarCookieSesion } from "@/lib/sesion-cookie";

export async function cambiarClave(
  _prev: { error?: string } | undefined,
  form: FormData,
) {
  const s = await getSesion();
  if (!s) redirect("/login?salir=1");

  const actual = String(form.get("actual") || "");
  const nueva = String(form.get("nueva") || "");
  const confirmar = String(form.get("confirmar") || "");

  const u = await db.usuario.findUnique({ where: { id: s.id } });
  if (!u || !(await bcrypt.compare(actual, u.passwordHash))) {
    return { error: "La contraseña actual no es correcta." };
  }
  if (nueva.length < 8)
    return { error: "La contraseña nueva debe tener al menos 8 caracteres." };
  if (nueva !== confirmar)
    return {
      error: "Las dos contraseñas nuevas no son iguales. Escríbalas otra vez.",
    };
  if (nueva === actual)
    return { error: "La contraseña nueva debe ser diferente a la actual." };

  const actualizado = await db.usuario.update({
    where: { id: u.id },
    data: {
      passwordHash: await bcrypt.hash(nueva, 10),
      debeCambiarClave: false,
      sesionVersion: { increment: 1 }, // cierra la sesión en otros equipos
    },
  });
  await guardarCookieSesion(actualizado); // mantiene abierta esta sesión
  redirect("/");
}
