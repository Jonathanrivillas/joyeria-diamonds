import { Check } from "lucide-react";
import { cn } from "./cn";
import { Icon } from "./icon";

/** Barra de avance (0 a `max`). */
export function ProgressBar({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      className="h-3 overflow-hidden rounded-full bg-neutral-200"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
    >
      <div className="h-full rounded-full bg-success-600 transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Indicador de pasos numerados (ej. "1 Escoger las piezas — 2 Cobrar"). `current` empieza en 1. */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-3 text-base font-semibold">
      {steps.map((t, i) => {
        const n = i + 1;
        const done = current > n;
        const active = current === n;
        return (
          <li key={t} className="flex items-center gap-3" aria-current={active ? "step" : undefined}>
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-lg",
                done ? "bg-success-600 text-white" : active ? "bg-brand-700 text-white" : "bg-neutral-200 text-neutral-500"
              )}
            >
              {done ? <Icon icon={Check} /> : n}
            </span>
            <span className={active ? "text-neutral-900" : "text-neutral-500"}>{t}</span>
            {n < steps.length && <span aria-hidden className="h-0.5 w-8 bg-neutral-300" />}
          </li>
        );
      })}
    </ol>
  );
}
