import type { LucideIcon } from "lucide-react";
import { cn } from "./cn";
import { Icon } from "./icon";
import { toneSurface, toneText, type Tone } from "./tones";

/**
 * Cifra destacada: "Lleva vendido $ 1.200.000".
 * `tone` colorea la cifra; `highlight` además tiñe el fondo de la tarjeta.
 */
export function StatCard({
  label,
  value,
  detail,
  icon,
  tone = "neutral",
  highlight,
  size = "md",
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  detail?: React.ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  highlight?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border",
        size === "sm" ? "p-4" : "p-5",
        highlight ? cn("border-2", toneSurface[tone]) : toneSurface.neutral
      )}
    >
      <div className="flex items-center gap-2 text-neutral-600">
        {icon && <Icon icon={icon} />}
        <p className="text-base">{label}</p>
      </div>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", toneText[tone])}>{value}</p>
      {detail && <p className="mt-1 text-base text-neutral-500">{detail}</p>}
    </div>
  );
}

/**
 * Varias cifras agrupadas en una sola tarjeta, separadas por líneas finas.
 * Preferible a varias StatCard sueltas cuando las cifras se leen juntas (ej. el resumen del día).
 */
export function StatPanel({ columns = 3, children }: { columns?: 1 | 2 | 3 | 4; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "grid divide-y divide-neutral-200 rounded-2xl border border-neutral-300 bg-white sm:divide-x sm:divide-y-0",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-3",
        columns === 4 && "sm:grid-cols-4"
      )}
    >
      {children}
    </div>
  );
}

/** Una cifra dentro de un StatPanel. `tone` solo colorea la cifra: úselo cuando el color signifique algo. */
export function Stat({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  detail?: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="px-5 py-3.5 sm:py-5">
      <p className="text-base text-neutral-600">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums sm:text-3xl", toneText[tone])}>{value}</p>
      {detail && <p className="mt-1 text-base text-neutral-500">{detail}</p>}
    </div>
  );
}

/** Cuadrícula estándar para filas de StatCard. */
export function StatGrid({ columns = 3, children }: { columns?: 2 | 3 | 4; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "grid gap-4",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-3",
        columns === 4 && "md:grid-cols-2 xl:grid-cols-4"
      )}
    >
      {children}
    </div>
  );
}
