// Pesos se guardan en centésimas de gramo (cg). Dinero en pesos COP enteros.

import { ZONA_HORARIA, horaColombia, inicioDia, sumarDias } from "./fechas";

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

// Todas las fechas se muestran en hora de Colombia, aunque el servidor esté en otra zona.
const fmtFecha = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: ZONA_HORARIA,
});
const fmtFechaHora = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: ZONA_HORARIA,
});

const fmtFechaLarga = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: ZONA_HORARIA,
});
const fmtHora = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit", timeZone: ZONA_HORARIA });

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
  const hoy = inicioDia(new Date());
  const ayer = sumarDias(hoy, -1);
  if (d >= hoy) return `Hoy ${hora(d)}`;
  if (d >= ayer) return `Ayer ${hora(d)}`;
  return fechaHora(d);
}

export function saludo(d = new Date()): string {
  const h = horaColombia(d);
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

/** Tipos de gasto válidos. Los de "Presupuesto" llevan el grupo en el nombre. */
export const TIPOS_GASTO: Record<string, string> = {
  SALUD: "Presupuesto · Salud",
  NOMINA: "Presupuesto · Nómina",
  ARRIENDO: "Presupuesto · Arriendo",
  PRESTACIONES: "Presupuesto · Prestaciones",
  TALLERES: "Talleres",
  COMISIONES: "Comisiones",
  INSUMOS: "Insumos",
  PROVEEDOR: "Pago a proveedor",
};

export const METODOS_PAGO: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  TARJETA: "Tarjeta",
};

/** Tipos de joya preciosa (modelo Pieza). Aquí y no en lib/joyas.ts porque también se usa en el navegador. */
export const TIPOS_JOYA: Record<string, string> = {
  ANILLO: "Anillo",
  TOPOS: "Topos",
  DIJE: "Dije",
  OTRO: "Otra",
};

export const REDES: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  OTRA: "Otra red",
};

export function canalVenta(v: { canal: string; red: string | null; redOtra: string | null }): string {
  if (v.canal !== "REDES") return "En la tienda";
  const red = v.red === "OTRA" ? v.redOtra || "Otra red" : REDES[v.red ?? ""] ?? "";
  return red ? `Por redes · ${red}` : "Por redes";
}

export const TIPOS_MOVIMIENTO: Record<string, string> = {
  ENTRADA: "Ingresó mercancía",
  VENTA: "Se vendió",
  ANULACION: "Volvió (factura anulada)",
  TRASLADO_SALIDA: "Se envió a otro local",
  TRASLADO_ENTRADA: "Llegó de otro local",
  AJUSTE_ARQUEO: "Corrección por arqueo",
  RECLASIFICACION_SALIDA: "Se pasó a otro tipo de pieza",
  RECLASIFICACION_ENTRADA: "Llegó de otro tipo de pieza",
};
