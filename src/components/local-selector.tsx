"use client";

import { useTransition } from "react";
import { Store } from "lucide-react";
import { cambiarLocal } from "@/app/(app)/actions";

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

  if (!esAdmin) {
    return (
      <div className="flex items-center gap-2 text-lg font-semibold">
        <Store className="h-6 w-6 text-oro-700" />
        {locales[0]?.nombre ?? "Sin local"}
      </div>
    );
  }

  return (
    <label className="flex items-center gap-2">
      <Store className="h-6 w-6 shrink-0 text-oro-700" />
      <span className="hidden font-medium text-stone-600 md:inline">Viendo:</span>
      <select
        className="input w-auto min-w-[12rem] font-semibold"
        value={localId ?? "todos"}
        disabled={pendiente}
        onChange={(e) => start(() => cambiarLocal(e.target.value))}
      >
        <option value="todos">Todos los locales</option>
        {locales.map((l) => (
          <option key={l.id} value={l.id}>
            {l.nombre}
          </option>
        ))}
      </select>
      {pendiente && <span className="text-sm text-stone-500">Cambiando...</span>}
    </label>
  );
}
