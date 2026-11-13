import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_SESION, verificarSesion, type Sesion } from "./token";
import { db } from "./db";

export const COOKIE_LOCAL = "joyeria_local";

export async function getSesion(): Promise<Sesion | null> {
  const c = await cookies();
  return verificarSesion(c.get(COOKIE_SESION)?.value);
}

export async function requireSesion(): Promise<Sesion> {
  const s = await getSesion();
  if (!s) redirect("/login");
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
