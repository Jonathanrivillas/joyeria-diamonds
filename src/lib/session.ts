import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { COOKIE_SESION, verificarSesion, type Sesion } from "./token";
import { db } from "./db";

export const COOKIE_LOCAL = "joyeria_local";

/**
 * Sesión validada contra la base de datos: si el usuario fue desactivado
 * o su versión cambió (ej. cambio de clave), la sesión deja de servir.
 * `cache` evita repetir la consulta dentro de la misma petición.
 */
export const getSesion = cache(async (): Promise<Sesion | null> => {
  const c = await cookies();
  const t = await verificarSesion(c.get(COOKIE_SESION)?.value);
  if (!t) return null;
  const u = await db.usuario.findUnique({
    where: { id: t.id },
    select: { id: true, nombre: true, email: true, rol: true, localId: true, activo: true, sesionVersion: true, debeCambiarClave: true },
  });
  if (!u || !u.activo || u.sesionVersion !== t.version) return null;
  return {
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol as Sesion["rol"],
    localId: u.localId,
    version: u.sesionVersion,
    debeCambiarClave: u.debeCambiarClave,
  };
});

export async function requireSesion(): Promise<Sesion> {
  const s = await getSesion();
  if (!s) redirect("/login?salir=1");
  if (s.debeCambiarClave) redirect("/cambiar-clave");
  return s;
}

export async function requireAdmin(): Promise<Sesion> {
  const s = await requireSesion();
  if (s.rol !== "ADMIN") redirect("/");
  return s;
}

/**
 * Local sobre el que trabaja la vista:
 * - Vendedor: siempre su local.
 * - Admin: el elegido en el selector (null = todos los locales).
 */
export async function getAlcance(s: Sesion): Promise<{
  localId: number | null;
  locales: { id: number; nombre: string; prefijoFactura: string }[];
}> {
  const locales = await db.local.findMany({
    orderBy: { id: "asc" },
    select: { id: true, nombre: true, prefijoFactura: true },
  });
  if (s.rol !== "ADMIN") {
    return { localId: s.localId, locales: locales.filter((l) => l.id === s.localId) };
  }
  const c = await cookies();
  const v = c.get(COOKIE_LOCAL)?.value;
  const id = v && v !== "todos" ? Number(v) : null;
  const valido = id && locales.some((l) => l.id === id) ? id : null;
  return { localId: valido, locales };
}

/** Para operaciones que necesitan un local concreto (venta, gasto, arqueo...). */
export function localParaOperar(s: Sesion, solicitado: number | null | undefined): number {
  if (s.rol !== "ADMIN") {
    if (!s.localId) throw new Error("Su usuario no tiene un local asignado. Pídale al administrador que lo asigne.");
    return s.localId;
  }
  if (!solicitado) throw new Error("Escoja el local.");
  return solicitado;
}
