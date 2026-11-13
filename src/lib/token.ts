// Firma/verificación del token de sesión. Compatible con Edge (middleware).
import { SignJWT, jwtVerify } from "jose";

export const COOKIE_SESION = "joyeria_sesion";

export type Sesion = {
  id: number;
  nombre: string;
  email: string;
  rol: "ADMIN" | "VENDEDOR";
  localId: number | null;
};

function clave() {
  return new TextEncoder().encode(
    process.env.SESSION_SECRET || "demo-joyeria-secreto-por-defecto-0123456789"
  );
}

export async function firmarSesion(s: Sesion): Promise<string> {
  return new SignJWT({ ...s })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(clave());
}

export async function verificarSesion(token: string | undefined): Promise<Sesion | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, clave());
    return {
      id: payload.id as number,
      nombre: payload.nombre as string,
      email: payload.email as string,
      rol: payload.rol as Sesion["rol"],
      localId: (payload.localId as number | null) ?? null,
    };
  } catch {
    return null;
  }
}
