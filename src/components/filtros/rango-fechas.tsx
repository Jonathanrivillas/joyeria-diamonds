import { CalendarRange } from "lucide-react";
import { Button, Chip, ChipGroup, DatePicker, Popover } from "@/components/ui";
import type { RangoRapido } from "@/lib/rangos";
import { parseFechaISO } from "@/lib/fechas";
import { fecha } from "@/lib/format";

const etiquetaRango = (d: string, h: string) =>
  d === h ? fecha(parseFechaISO(d)) : `${fecha(parseFechaISO(d))} – ${fecha(parseFechaISO(h))}`;

/**
 * Filtro de fechas estándar: atajos ("Hoy", "Ayer"...) y, si `personalizado`,
 * un botón "Otras fechas…" con dos calendarios.
 */
export function RangoFechas({
  ruta,
  rangos,
  activo,
  desde,
  hasta,
  max,
  personalizado = true,
  conservar,
}: {
  /** Ruta de la página, ej. "/gastos". */
  ruta: string;
  rangos: RangoRapido[];
  activo?: string;
  desde: string;
  hasta: string;
  max: string;
  personalizado?: boolean;
  /** Otros filtros que los atajos deben conservar, ya como query string (ej. "q=maria&metodo=EFECTIVO"). */
  conservar?: string;
}) {
  return (
    <ChipGroup>
      {rangos.map((r) => (
        <Chip key={r.etiqueta} href={`${ruta}?desde=${r.desde}&hasta=${r.hasta}${conservar ? `&${conservar}` : ""}`} selected={activo === r.etiqueta}>
          {r.etiqueta}
        </Chip>
      ))}
      {personalizado && (
        <Popover label={activo ? "Otras fechas…" : etiquetaRango(desde, hasta)} icon={CalendarRange}>
          <form action={ruta} className="space-y-4">
            <DatePicker name="desde" label="Desde" defaultValue={desde} max={max} />
            <DatePicker name="hasta" label="Hasta" defaultValue={hasta} max={max} />
            <Button type="submit" block>
              Ver esas fechas
            </Button>
          </form>
        </Popover>
      )}
    </ChipGroup>
  );
}
