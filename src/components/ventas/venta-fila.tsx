import { Badge, ListItem, cn } from "@/components/ui";
import { cop, cuando, hora, METODOS_PAGO } from "@/lib/format";

export type VentaResumen = {
  id: number;
  numero: string;
  fecha: Date;
  total: number;
  estado: string;
  metodoPago: string;
  clienteNombre: string | null;
  local: { nombre: string };
  items: { pesoCg: number; categoria: { nombre: string } }[];
};

/**
 * Una factura en una lista (inicio, historial de facturas).
 * Título: las piezas. Debajo: hora · número · cliente (· local). A la derecha: total y forma de pago.
 * `soloHora` cuando la lista ya está agrupada por día.
 */
export function VentaFila({ venta: v, mostrarLocal, soloHora }: { venta: VentaResumen; mostrarLocal?: boolean; soloHora?: boolean }) {
  const anulada = v.estado === "ANULADA";
  const meta = [soloHora ? hora(v.fecha) : cuando(v.fecha), v.numero, v.clienteNombre, mostrarLocal && v.local.nombre]
    .filter(Boolean)
    .join(" · ");

  return (
    <ListItem
      href={`/ventas/${v.id}`}
      title={v.items.map((i) => i.categoria.nombre).join(", ")}
      meta={meta}
      muted={anulada}
      end={
        <div className="flex flex-col items-end gap-1">
          <p className={cn("text-xl font-bold tabular-nums", anulada && "text-neutral-500 line-through")}>{cop(v.total)}</p>
          {anulada ? <Badge tone="danger">Anulada</Badge> : <Badge>{METODOS_PAGO[v.metodoPago]}</Badge>}
        </div>
      }
    />
  );
}
