"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarCheck } from "lucide-react";
import { Button, DatePicker } from "@/components/ui";
import { fechaLarga } from "@/lib/format";
import { aISO, parseFechaISO, sumarDias } from "@/lib/fechas";

/** Moverse día por día (o escoger un día en el calendario) en pantallas como el inventario. */
export function NavegadorDia({ ruta, fecha, hoy }: { ruta: string; fecha: string; hoy: string }) {
  const router = useRouter();
  const dia = parseFechaISO(fecha);
  const esHoy = fecha === hoy;
  const ir = (iso: string) => (iso === hoy ? ruta : `${ruta}?fecha=${iso}`);

  return (
    <div className="no-print flex flex-wrap items-center gap-3">
      <Button variant="secondary" href={ir(aISO(sumarDias(dia, -1)))} icon={ArrowLeft}>
        Día anterior
      </Button>
      <p className="text-xl font-bold">{esHoy ? `Hoy, ${fechaLarga(dia).toLowerCase()}` : fechaLarga(dia)}</p>
      {!esHoy && (
        <>
          <Button variant="secondary" href={ir(aISO(sumarDias(dia, 1)))} iconRight={ArrowRight}>
            Día siguiente
          </Button>
          <Button variant="secondary" href={ruta} icon={CalendarCheck}>
            Volver a hoy
          </Button>
        </>
      )}
      <div className="w-full sm:ml-auto sm:w-56">
        <DatePicker label="Escoger otro día" hideLabel value={fecha} max={hoy} align="right" onChange={(iso) => router.push(ir(iso))} />
      </div>
    </div>
  );
}
