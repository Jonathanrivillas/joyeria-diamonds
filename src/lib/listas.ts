// Utilidades para las listas largas (historiales): página, enlaces que conservan filtros y fechas opcionales.
import { finDia, inicioDia, parseFechaISO } from "./fechas";

/** Registros por página en los historiales. */
export const POR_PAGINA = 25;

export function leerPagina(v: string | undefined): number {
  return Math.max(1, Math.floor(Number(v)) || 1);
}

/** Id que viene en la dirección (?vendedor=3). Si no es un número entero válido, undefined. */
export function leerId(v: string | undefined | null): number | undefined {
  if (!v || !/^\d{1,9}$/.test(v)) return undefined;
  const n = Number(v);
  return n > 0 ? n : undefined;
}

/** Arma "/ruta?a=1&b=2" con los valores que no estén vacíos. */
export function enlaceCon(ruta: string, params: Record<string, string | number | undefined | null>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  const qs = p.toString();
  return qs ? `${ruta}?${qs}` : ruta;
}

const esISO = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

/**
 * Filtro de fechas opcional: sin fechas = todo el historial.
 * Devuelve el `where` de Prisma para el campo fecha (o undefined si no hay filtro).
 */
export function filtroFechas(desde?: string, hasta?: string): { gte?: Date; lte?: Date } | undefined {
  if (!esISO(desde) && !esISO(hasta)) return undefined;
  return {
    ...(esISO(desde) ? { gte: inicioDia(parseFechaISO(desde)) } : {}),
    ...(esISO(hasta) ? { lte: finDia(parseFechaISO(hasta)) } : {}),
  };
}

/** Número de páginas y la página válida (si piden la 40 y hay 3, se muestra la 3). */
export function paginar(total: number, pagina: number) {
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const actual = Math.min(pagina, paginas);
  return { paginas, actual, skip: (actual - 1) * POR_PAGINA, take: POR_PAGINA };
}
