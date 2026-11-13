import { cookies } from "next/headers";
import { COOKIE_SESION, firmarSesion } from "./token";

/**
 * Firma la sesión y la guarda en la cookie.
 * IMPORTANTE: no mover a un archivo "use server". Todo lo que se exporta desde
 * un archivo "use server" se puede llamar desde internet, y esta función
 * permitiría iniciar sesión como cualquier usuario.
 */
export async function guardarCookieSesion(u: {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  localId: number | null;
  sesionVersion: number;
}) {
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
}
