import { cn } from "./cn";
import { toneText, type Tone } from "./tones";

/** Fila "etiqueta ........ valor" para resúmenes y totales. */
export function DataRow({
  label,
  value,
  tone,
  strong,
  size = "md",
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  tone?: Tone;
  strong?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4",
        size === "sm" && "text-base",
        size === "md" && "text-lg",
        size === "lg" && "text-xl",
        size === "xl" && "text-2xl font-bold",
        className
      )}
    >
      <span className={size === "sm" ? "text-neutral-500" : "text-neutral-700"}>{label}</span>
      <span className={cn("text-right tabular-nums", strong && "font-bold", size === "xl" && "text-2xl", tone && toneText[tone])}>{value}</span>
    </div>
  );
}

/** Etiqueta pequeña con su valor debajo (ej. "Cliente / Consumidor final"). */
export function LabeledValue({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-semibold text-neutral-500">{label}</p>
      <div className="text-base">{children}</div>
    </div>
  );
}
