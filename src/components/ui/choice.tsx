import Link from "next/link";
import { Check, X, type LucideIcon } from "lucide-react";
import { cn } from "./cn";
import { Icon } from "./icon";

/**
 * Recuadro grande que se toca para escoger una opción (tipo de pieza, forma de pago, tipo de gasto).
 * Seleccionado se pinta con el color de marca. `layout="stacked"` centra ícono y texto;
 * `layout="start"` alinea a la izquierda en una tarjeta compacta (título + dato debajo);
 * `layout="inline"` pone el ícono a la izquierda del texto (opciones cortas en columnas angostas).
 */
export function ChoiceTile({
  selected,
  title,
  description,
  icon,
  layout = "stacked",
  disabled,
  onClick,
  className,
}: {
  selected?: boolean;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  layout?: "stacked" | "start" | "inline";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex rounded-2xl border p-4 transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
        layout === "stacked" && "flex-col items-center gap-1 text-center",
        layout === "start" && "flex-col items-start gap-1 text-left",
        layout === "inline" && "items-center gap-3 text-left",
        selected ? "border-brand-700 bg-brand-700 text-white" : "border-neutral-300 bg-white text-neutral-900 hover:border-neutral-500 hover:bg-neutral-50",
        className
      )}
    >
      {icon && <Icon icon={icon} size={layout === "stacked" ? "xl" : "lg"} className="shrink-0" />}
      {layout === "inline" ? (
        <span className="flex min-w-0 flex-col">
          <span className="text-lg font-bold leading-tight">{title}</span>
          {description && <span className={cn("text-base", selected ? "text-brand-50" : "text-neutral-500")}>{description}</span>}
        </span>
      ) : (
        <>
          <span className="text-lg font-bold leading-tight">{title}</span>
          {description && (
            <span className={cn(layout === "start" ? "text-base" : "text-sm", selected ? "text-brand-50" : "text-neutral-500")}>{description}</span>
          )}
        </>
      )}
    </button>
  );
}

/** Cuadrícula estándar para ChoiceTile. */
export function ChoiceGrid({ columns = 3, children }: { columns?: 2 | 3 | 4 | 5; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3",
        columns >= 3 && "md:grid-cols-3",
        columns >= 4 && "xl:grid-cols-4",
        columns === 5 && "2xl:grid-cols-5"
      )}
    >
      {children}
    </div>
  );
}

/**
 * Píldora seleccionable para filtros rápidos ("Hoy", "Ayer"...) u opciones cortas.
 * Con `href` es un enlace; si no, un botón.
 */
export function Chip({
  selected,
  href,
  onClick,
  disabled,
  children,
}: {
  selected?: boolean;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const classes = cn(
    "inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-xl border-2 px-4 py-2 text-base font-semibold transition active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-40",
    selected ? "border-brand-700 bg-brand-700 text-white" : "border-neutral-300 bg-white text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50"
  );
  const content = (
    <>
      {selected && <Icon icon={Check} />}
      {children}
    </>
  );
  return href ? (
    <Link href={href} className={classes} aria-current={selected ? "page" : undefined}>
      {content}
    </Link>
  ) : (
    <button type="button" className={classes} aria-pressed={selected} onClick={onClick} disabled={disabled}>
      {content}
    </button>
  );
}

/** Filtro activo que se quita con la ✕ ("Efectivo ✕"). `href` es la misma página sin ese filtro. */
export function RemovableChip({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-[2.5rem] items-center gap-2 rounded-full border border-neutral-300 bg-white py-1.5 pl-4 pr-2 text-base font-medium text-neutral-800 transition hover:border-neutral-400 hover:bg-neutral-50"
    >
      {children}
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100" aria-hidden>
        <Icon icon={X} size="sm" />
      </span>
      <span className="sr-only">(quitar este filtro)</span>
    </Link>
  );
}

export function ChipGroup({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("no-print flex flex-wrap items-center gap-2", className)}>{children}</div>;
}
