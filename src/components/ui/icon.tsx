import type { LucideIcon } from "lucide-react";
import { cn } from "./cn";
import { toneSoft, type Tone } from "./tones";

export type IconSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

/** Escala única de tamaños de ícono para todo el sitio. */
export const iconSizes: Record<IconSize, string> = {
  xs: "h-4 w-4",
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-7 w-7",
  xl: "h-9 w-9",
  "2xl": "h-12 w-12",
};

/**
 * Ícono de lucide con tamaño estandarizado.
 * Es decorativo salvo que se le dé `label` (entonces lo leen los lectores de pantalla).
 */
export function Icon({
  icon: I,
  size = "sm",
  label,
  className,
}: {
  icon: LucideIcon;
  size?: IconSize;
  label?: string;
  className?: string;
}) {
  return (
    <I
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      className={cn(iconSizes[size], "shrink-0", className)}
    />
  );
}

const circleSizes = { sm: "p-2", md: "p-3", lg: "p-4" } as const;
const circleIcon: Record<keyof typeof circleSizes, IconSize> = { sm: "md", md: "lg", lg: "xl" };

/** Ícono dentro de un círculo (o cuadro redondeado) con fondo de color. */
export function IconBadge({
  icon,
  tone = "brand",
  size = "md",
  shape = "circle",
  className,
}: {
  icon: LucideIcon;
  tone?: Tone;
  size?: keyof typeof circleSizes;
  shape?: "circle" | "square";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        shape === "circle" ? "rounded-full" : "rounded-xl",
        circleSizes[size],
        toneSoft[tone],
        className
      )}
    >
      <Icon icon={icon} size={circleIcon[size]} />
    </span>
  );
}
