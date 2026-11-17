// Utilidades de fecha en HORA DE COLOMBIA, sin importar la zona horaria del
// servidor (Vercel corre en UTC). Colombia está siempre en UTC−5 y no tiene
// horario de verano, así que basta con un desfase fijo.
// En la base de datos las fechas se guardan en UTC (lo correcto); aquí solo se
// decide dónde empieza y termina cada día.

export const ZONA_HORARIA = "America/Bogota";

const DESFASE_MS = 5 * 60 * 60 * 1000; // Colombia = UTC−5
const DIA_MS = 24 * 60 * 60 * 1000;

/** Año, mes (0-11), día y hora del momento `d`, vistos desde Colombia. */
function enColombia(d: Date) {
  const c = new Date(d.getTime() - DESFASE_MS);
  return { y: c.getUTCFullYear(), m: c.getUTCMonth(), d: c.getUTCDate(), h: c.getUTCHours() };
}

/** Medianoche en Colombia de un día del calendario (mes 0-11). */
function medianoche(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d) + DESFASE_MS);
}

/** 12:00 a. m. en Colombia del día en que cae `d`. */
export function inicioDia(d: Date): Date {
  const p = enColombia(d);
  return medianoche(p.y, p.m, p.d);
}

/** 11:59:59.999 p. m. en Colombia del día en que cae `d`. */
export function finDia(d: Date): Date {
  return new Date(inicioDia(d).getTime() + DIA_MS - 1);
}

/** Suma (o resta) días completos. Sin horario de verano, un día son siempre 24 h. */
export function sumarDias(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DIA_MS);
}

/** Hora del día (0-23) en Colombia. */
export function horaColombia(d: Date): number {
  return enColombia(d).h;
}

/** "2026-11-12" → medianoche de ese día en Colombia. Si es inválida, hoy. */
export function parseFechaISO(s: string | undefined | null): Date {
  if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return medianoche(y, m - 1, d);
  }
  return inicioDia(new Date());
}

/** Fecha → "2026-11-12", según el día en Colombia. */
export function aISO(d: Date): string {
  const p = enColombia(d);
  return `${p.y}-${String(p.m + 1).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}
