// Firma/verificación del token de sesión. Compatible con Edge (middleware).
import { SignJWT, jwtVerify } from "jose";

export const COOKIE_SESION = "joyeria_sesion";

export type Sesion = {
  id: number;
  nombre: string;
  email: string;
  rol: "ADMIN" | "VENDEDOR";
  localId: number | null;
  version: number;

};

function clave() {
  const secreto = process.env.SESSION_SECRET;
  if (!secreto || secreto.length < 32) {
    throw new Error(
      "Falta SESSION_SECRET (mínimo 32 caracteres) en las variables de entorno.",
    );
  }
  return new TextEncoder().encode(secreto);
}

export async function firmarSesion(s: Sesion): Promise<string> {
  return new SignJWT({ ...s })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10h")
    .sign(clave());
}

export async function verificarSesion(
  token: string | undefined,
): Promise<Sesion | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, clave());
    return {
      id: payload.id as number,
      nombre: payload.nombre as string,
      email: payload.email as string,
      rol: payload.rol as Sesion["rol"],
      localId: (payload.localId as number | null) ?? null,
      version: typeof payload.version === "number" ? payload.version : -1,
    };
  } catch {
    return null;
  }
}
