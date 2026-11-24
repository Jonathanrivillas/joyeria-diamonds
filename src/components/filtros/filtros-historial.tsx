import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button, Disclosure, FormGrid, Icon, Input } from "@/components/ui";

/**
 * Barra de filtros de los historiales: buscador siempre a la vista y el resto plegado en
 * "Más filtros" (se abre solo si hay alguno puesto). Es un formulario GET: los filtros quedan
 * en la dirección, así se pueden compartir y la paginación los conserva.
 */
export function FiltrosHistorial({
  ruta,
  q,
  placeholder,
  masFiltrosActivos,
  hayFiltros,
  children,
}: {
  ruta: string;
  q?: string;
  placeholder: string;
  /** true si algún filtro de "Más filtros" tiene valor: así aparece abierto. */
  masFiltrosActivos: boolean;
  /** true si hay cualquier filtro (muestra "Quitar filtros"). */
  hayFiltros: boolean;
  /** Campos de "Más filtros" (selects, fechas...). */
  children: React.ReactNode;
}) {
  return (
    <form action={ruta} className="no-print space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="Buscar"
          hideLabel
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder={placeholder}
          prefix={<Icon icon={Search} size="sm" />}
          className="pl-12"
          containerClassName="min-w-[16rem] flex-1"
        />
        <Button type="submit" icon={Search}>
          Buscar
        </Button>
        {hayFiltros && (
          <Button variant="ghost" href={ruta} icon={X}>
            Quitar filtros
          </Button>
        )}
      </div>
      <Disclosure title="Más filtros" icon={SlidersHorizontal} defaultOpen={masFiltrosActivos}>
        <FormGrid columns={3}>{children}</FormGrid>
        <Button type="submit" icon={Search} className="mt-4">
          Aplicar filtros
        </Button>
      </Disclosure>
    </form>
  );
}
