import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";
import { cn } from "./cn";
import { Icon } from "./icon";
import { toneSoft, toneSolid, type Tone } from "./tones";

/** Etiqueta pequeña para estados y conteos. */
export function Badge({
  tone = "neutral",
  solid,
  size = "md",
  icon,
  className,
  children,
}: {
  tone?: Tone;
  /** Fondo fuerte (para resaltar resultados, ej. "Cuadra"). */
  solid?: boolean;
  size?: "md" | "lg";
  icon?: LucideIcon;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full font-semibold",
        size === "md" ? "px-3 py-1 text-sm" : "px-4 py-2 text-base",
        solid ? toneSolid[tone] : toneSoft[tone],
        className
      )}
    >
      {icon && <Icon icon={icon} size={size === "md" ? "xs" : "sm"} />}
      {children}
    </span>
  );
}

/** Estados del sistema con su color y texto oficiales. Así un estado se ve igual en todas las pantallas. */
const STATUS: Record<string, { tone: Tone; text: string; icon?: LucideIcon }> = {
  OK: { tone: "success", text: "Está igual", icon: Check },
  SOBRA: { tone: "warning", text: "Sobra" },
  FALTA: { tone: "danger", text: "Falta" },
  ACTIVA: { tone: "success", text: "Vigente" },
  ANULADA: { tone: "danger", text: "Anulada" },
  ACTIVO: { tone: "success", text: "Vigente" },
  ANULADO: { tone: "danger", text: "Anulado" },
  ABIERTO: { tone: "warning", text: "Sin terminar" },
  CERRADO: { tone: "neutral", text: "Terminado" },
  HABILITADO: { tone: "success", text: "Activo" },
  INACTIVO: { tone: "neutral", text: "Inactivo" },
};

export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-neutral-400">—</span>;
  const s = STATUS[status] ?? { tone: "neutral" as Tone, text: status };
  return (
    <Badge tone={s.tone} icon={s.icon}>
      {s.text}
    </Badge>
  );
}
