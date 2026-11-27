import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { COOKIE_SESION, verificarSesion, type Sesion } from "./token";
import { db } from "./db";
import { paginaInicial, puedeVer, type Permiso } from "./permisos";
import { ErrorUsuario } from "./errores";

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
    select: { id: true, nombre: true, email: true, rol: true, localId: true, activo: true, sesionVersion: true, debeCambiarClave: true, permisos: true, letra: true },
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
    permisos: u.permisos,
    letra: u.letra,
  };
});

export async function requireSesion(): Promise<Sesion> {
  const s = await getSesion();
  if (!s) redirect("/login?salir=1");
  if (s.debeCambiarClave) redirect("/cambiar-clave");
  return s;
}

/**
 * Exige permiso para una pantalla (el ADMIN siempre lo tiene). Con varios, basta uno.
 * Si no lo tiene, lo manda a la primera pantalla que sí puede ver.
 */
export async function requirePermiso(...permisos: Permiso[]): Promise<Sesion> {
  const s = await requireSesion();
  if (!permisos.some((p) => puedeVer(s, p))) redirect(paginaInicial(s));
  return s;
}

/** Para acciones del servidor: en vez de redirigir, lanza un error (no se guarda nada). */
export async function exigirPermiso(...permisos: Permiso[]): Promise<Sesion> {
  const s = await requireSesion();
  if (!permisos.some((p) => puedeVer(s, p))) throw new Error("No tiene permiso para hacer esto. Pídaselo al administrador.");
  return s;
}

export async function requireAdmin(): Promise<Sesion> {
  const s = await requireSesion();
  if (s.rol !== "ADMIN") redirect("/");
  return s;
}

/**
 * Cuenta de soporte técnico (el desarrollador): la única que ve y cambia la
 * configuración que casi nunca se toca (tipos de pieza y locales). Se define con
 * la variable SOPORTE_EMAILS (correos separados por coma).
 */
export function esSoporte(s: Sesion): boolean {
  const correos = (process.env.SOPORTE_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return s.rol === "ADMIN" && correos.includes(s.email.toLowerCase());
}

export async function requireSoporte(): Promise<Sesion> {
  const s = await requireAdmin();
  if (!esSoporte(s)) redirect("/admin");
  return s;
}

/**
 * Local sobre el que trabaja la vista:
 * - Vendedor: siempre su local.
 * - Admin: el elegido en el selector (null = todos los locales).
 */
// `cache`: el layout y la página la piden en la misma petición; así se consulta una sola vez.
export const getAlcance = cache(async (s: Sesion): Promise<{
  localId: number | null;
  locales: { id: number; nombre: string; prefijoFactura: string }[];
}> => {
  const locales = await db.local.findMany({
    orderBy: { id: "asc" },
    select: { id: true, nombre: true, prefijoFactura: true },
  });
  if (s.rol !== "ADMIN") {
    // Un vendedor sin local asignado no ve nada (antes, "sin local" se leía como "todos los locales").
    return { localId: s.localId ?? -1, locales: locales.filter((l) => l.id === s.localId) };
  }
  const c = await cookies();
  const v = c.get(COOKIE_LOCAL)?.value;
  const id = v && v !== "todos" ? Number(v) : null;
  const valido = id && locales.some((l) => l.id === id) ? id : null;
  return { localId: valido, locales };
});

/** Para operaciones que necesitan un local concreto (venta, gasto, arqueo...). */
export function localParaOperar(s: Sesion, solicitado: number | null | undefined): number {
  if (s.rol !== "ADMIN") {
    if (!s.localId) throw new ErrorUsuario("Su usuario no tiene un local asignado. Pídale al administrador que lo asigne.");
    return s.localId;
  }
  if (!solicitado) throw new ErrorUsuario("Escoja el local.");
  return solicitado;
}
