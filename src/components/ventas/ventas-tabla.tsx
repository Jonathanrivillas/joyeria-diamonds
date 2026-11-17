import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge, Icon, NoValue, Table, Td, Th, Tr, cn } from "@/components/ui";
import { cop, hora, METODOS_PAGO } from "@/lib/format";
import type { VentaResumen } from "./venta-fila";

export type GrupoVentas = { iso: string; titulo: string; total: number; ventas: VentaResumen[] };

/**
 * Facturas en tabla, para pantallas anchas (en celular se usa la lista con VentaFila).
 * Toda la fila es un enlace a la factura. Con `porDia` cada grupo lleva su encabezado con el total del día.
 */
export function VentasTabla({ grupos, porDia, mostrarLocal }: { grupos: GrupoVentas[]; porDia: boolean; mostrarLocal: boolean }) {
  const columnas = mostrarLocal ? 8 : 7;
  return (
    <Table>
      <thead>
        <tr>
          <Th className="w-28">Hora</Th>
          <Th>Factura</Th>
          <Th>Piezas</Th>
          <Th>Cliente</Th>
          {mostrarLocal && <Th>Local</Th>}
          <Th>Forma de pago</Th>
          <Th numeric>Total</Th>
          <Th className="w-12">
            <span className="sr-only">Abrir</span>
          </Th>
        </tr>
      </thead>
      {grupos.map((g) => (
        <tbody key={g.iso}>
          {porDia && (
            <tr>
              <td colSpan={columnas - 2} className="border-b border-neutral-300 bg-neutral-100 px-4 py-2.5 text-base font-bold text-neutral-800">
                {g.titulo}
              </td>
              <td className="border-b border-neutral-300 bg-neutral-100 px-4 py-2.5 text-right text-base font-bold tabular-nums text-neutral-800">
                {cop(g.total)}
              </td>
              <td className="border-b border-neutral-300 bg-neutral-100" />
            </tr>
          )}
          {g.ventas.map((v) => {
            const anulada = v.estado === "ANULADA";
            return (
              <Tr key={v.id} className={cn("relative", anulada && "text-neutral-500")}>
                <Td className="whitespace-nowrap tabular-nums">{hora(v.fecha)}</Td>
                <Td className="whitespace-nowrap font-semibold">
                  <Link
                    href={`/ventas/${v.id}`}
                    className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-brand-400"
                  >
                    {v.numero}
                  </Link>
                </Td>
                <Td className={cn("max-w-md", anulada && "line-through")}>{v.items.map((i) => i.categoria.nombre).join(", ")}</Td>
                <Td>{v.clienteNombre ?? <NoValue label="Sin cliente" />}</Td>
                {mostrarLocal && <Td className="whitespace-nowrap">{v.local.nombre}</Td>}
                <Td className="whitespace-nowrap">{anulada ? <Badge tone="danger">Anulada</Badge> : METODOS_PAGO[v.metodoPago]}</Td>
                <Td numeric className={cn("whitespace-nowrap text-lg font-bold", anulada ? "line-through" : "text-neutral-900")}>
                  {cop(v.total)}
                </Td>
                <Td className="text-neutral-400">
                  <Icon icon={ChevronRight} size="md" />
                </Td>
              </Tr>
            );
          })}
        </tbody>
      ))}
    </Table>
  );
}
