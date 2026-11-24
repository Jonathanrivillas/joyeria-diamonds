import { aISO, sumarDias } from "./fechas";

/** `corta`: lo que se muestra en el celular para que los atajos quepan en una sola línea. */
export type RangoRapido = { etiqueta: string; corta: string; desde: string; hasta: string };

/** Rangos de fecha rápidos, iguales en todas las pantallas que filtran por fecha. */
export function rangosRapidos(hoy: Date): RangoRapido[] {
  const h = aISO(hoy);
  const ayer = aISO(sumarDias(hoy, -1));
  return [
    { etiqueta: "Hoy", corta: "Hoy", desde: h, hasta: h },
    { etiqueta: "Ayer", corta: "Ayer", desde: ayer, hasta: ayer },
    { etiqueta: "Últimos 7 días", corta: "7 días", desde: aISO(sumarDias(hoy, -6)), hasta: h },
    { etiqueta: "Últimos 30 días", corta: "30 días", desde: aISO(sumarDias(hoy, -29)), hasta: h },
  ];
}

export function rangoActivo(rangos: RangoRapido[], desde: Date, hasta: Date): RangoRapido | undefined {
  const d = aISO(desde);
  const h = aISO(hasta);
  return rangos.find((r) => r.desde === d && r.hasta === h);
}
