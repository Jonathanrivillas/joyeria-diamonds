// Pesos se guardan en centésimas de gramo (cg). Dinero en pesos COP enteros.

const nfGramos = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const nfCOP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const nfEntero = new Intl.NumberFormat("es-CO");

export function gramos(cg: number, conUnidad = true): string {
  const s = nfGramos.format(cg / 100);
  return conUnidad ? `${s} g` : s;
}

export function cop(valor: number): string {
  return nfCOP.format(valor);
}

export function entero(n: number): string {
  return nfEntero.format(n);
}

/** Convierte "5,20" / "5.20" / "1.234,56" a centésimas de gramo. */
export function parseGramos(texto: string | null | undefined): number {
  if (!texto) return 0;
  let t = String(texto).trim().replace(/\s|g/gi, "");
  if (t.includes(",")) {
    t = t.replace(/\./g, "").replace(",", ".");
  }
  const n = Number(t);
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 100);
}

/** Convierte "$ 1.250.000" a 1250000. */
export function parseCOP(texto: string | null | undefined): number {
  if (!texto) return 0;
  const t = String(texto).replace(/[^\d-]/g, "");
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

const fmtFecha = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const fmtFechaHora = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const fmtFechaLarga = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const fmtHora = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit" });

/** "jueves, 12 de noviembre" */
export function fechaLarga(d: Date): string {
  const s = fmtFechaLarga.format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function hora(d: Date): string {
  return fmtHora.format(d);
}

/** "Hoy 3:20 p. m." / "Ayer 10:05 a. m." / "05 nov 2026" */
export function cuando(d: Date): string {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);
  if (d >= hoy) return `Hoy ${hora(d)}`;
  if (d >= ayer) return `Ayer ${hora(d)}`;
  return fechaHora(d);
}

export function saludo(d = new Date()): string {
  const h = d.getHours();
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}

export function plural(n: number, uno: string, varios: string): string {
  return `${entero(n)} ${n === 1 ? uno : varios}`;
}

export function fecha(d: Date): string {
  return fmtFecha.format(d);
}

export function fechaHora(d: Date): string {
  return fmtFechaHora.format(d);
}

export const TIPOS_GASTO: Record<string, string> = {
  NOMINA: "Nómina",
  ARRIENDO: "Arriendo",
  SERVICIOS: "Servicios",
  INSUMOS: "Insumos",
  OTROS: "Otros",
};

export const METODOS_PAGO: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  TARJETA: "Tarjeta",
};

export const TIPOS_MOVIMIENTO: Record<string, string> = {
  ENTRADA: "Ingresó mercancía",
  VENTA: "Se vendió",
  ANULACION: "Volvió (factura anulada)",
  TRASLADO_SALIDA: "Se envió a otro local",
  TRASLADO_ENTRADA: "Llegó de otro local",
  AJUSTE_ARQUEO: "Corrección por arqueo",
};
