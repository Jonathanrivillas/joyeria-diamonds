"use client";

import { useTransition } from "react";
import { usePathname } from "next/navigation";
import { Store } from "lucide-react";
import { useLocalVenta } from "@/components/ventas/local-venta";
import { cambiarLocal } from "@/app/(app)/actions";
import { Icon, Select, Spinner } from "@/components/ui";

export function LocalSelector({
  esAdmin,
  localId,
  locales,
}: {
  esAdmin: boolean;
  localId: number | null;
  locales: { id: number; nombre: string }[];
}) {
  const [pendiente, start] = useTransition();
  const path = usePathname();
  const localVenta = useLocalVenta();

  // En la venta, el local se escoge dentro del formulario: aquí solo se muestra.
  if (esAdmin && path === "/ventas/nueva") {
    return (
      <div className="flex items-center gap-2 text-lg">
        <Icon icon={Store} size="md" className="text-brand-700" />
        <span className="text-neutral-600">Vendiendo en</span>
        <span className="font-semibold">{localVenta ?? "…"}</span>
      </div>
    );
  }

  if (!esAdmin) {
    return (
      <div className="flex items-center gap-2 text-lg font-semibold">
        <Icon icon={Store} size="md" className="text-brand-700" />
        {locales[0]?.nombre ?? "Sin local"}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Icon icon={Store} size="md" className="text-brand-700" />
      <span className="hidden font-medium text-neutral-600 md:inline">Viendo:</span>
      <Select
        label="Local que está viendo"
        hideLabel
        containerClassName="min-w-[12rem]"
        className="font-semibold"
        value={localId ?? "todos"}
        disabled={pendiente}
        onChange={(e) => start(() => cambiarLocal(e.target.value))}
        options={[{ value: "todos", label: "Todos los locales" }, ...locales.map((l) => ({ value: l.id, label: l.nombre }))]}
      />
      {pendiente && (
        <span className="flex items-center gap-2 text-sm text-neutral-500" role="status">
          <Spinner /> Cambiando...
        </span>
      )}
    </div>
  );
}
