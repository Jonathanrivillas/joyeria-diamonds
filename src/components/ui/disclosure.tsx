import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "./cn";
import { Icon } from "./icon";
import { buttonClasses } from "./button";

/** Sección plegable dentro de una tarjeta (ej. "Buscar o filtrar"). Funciona sin JavaScript. */
export function Disclosure({
  title,
  icon,
  defaultOpen,
  className,
  children,
}: {
  title: React.ReactNode;
  icon?: LucideIcon;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <details className={cn("group rounded-2xl border border-neutral-300 bg-white", className)} open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-2xl px-5 py-4 text-base font-semibold text-neutral-700 hover:bg-neutral-50 [&::-webkit-details-marker]:hidden">
        {icon && <Icon icon={icon} />}
        <span className="flex-1">{title}</span>
        <Icon icon={ChevronDown} className="text-neutral-400 transition group-open:rotate-180" />
      </summary>
      <div className="border-t border-neutral-100 p-5">{children}</div>
    </details>
  );
}

/** Botón que despliega un panel flotante (ej. "Otras fechas…"). Funciona sin JavaScript. */
export function Popover({
  label,
  icon,
  align = "left",
  children,
}: {
  label: React.ReactNode;
  icon?: LucideIcon;
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  return (
    <details className="group relative">
      <summary className={cn(buttonClasses({ variant: "secondary" }), "cursor-pointer list-none [&::-webkit-details-marker]:hidden")}>
        {icon && <Icon icon={icon} />}
        {label}
        <Icon icon={ChevronDown} className="text-neutral-400 transition group-open:rotate-180" />
      </summary>
      <div
        className={cn(
          "absolute z-20 mt-2 w-[min(24rem,calc(100vw-2rem))] animate-aparecer rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl",
          align === "right" ? "right-0" : "left-0"
        )}
      >
        {children}
      </div>
    </details>
  );
}
