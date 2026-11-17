"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "./cn";
import { Button, buttonClasses } from "./button";
import { Field, type FieldProps } from "./form";
import { Icon } from "./icon";

/* Fechas como texto "AAAA-MM-DD" en hora local: evita corrimientos por zona horaria. */
const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const isISO = (s: string | undefined | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
const addDays = (s: string, n: number) => {
  const d = fromISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
const WEEKDAYS_LONG = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const fmtMonth = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" });
const fmtLong = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const fmtShort = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric" });
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Formatea "2026-11-15" como "15 nov 2026" (o la versión larga). */
export function formatISODate(iso: string, long = false) {
  return isISO(iso) ? capital((long ? fmtLong : fmtShort).format(fromISO(iso))) : "";
}

/**
 * Calendario mensual. Semana de lunes a domingo, botones grandes, se maneja también con las flechas del teclado.
 */
export function Calendar({
  value,
  onChange,
  min,
  max,
  autoFocus,
}: {
  value?: string | null;
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
  autoFocus?: boolean;
}) {
  const today = toISO(new Date());
  const [focused, setFocused] = useState(isISO(value) ? value : today);
  const [month, setMonth] = useState(() => focused.slice(0, 7)); // "AAAA-MM"
  const grid = useRef<HTMLDivElement>(null);
  const shouldFocus = useRef(!!autoFocus);

  useEffect(() => {
    // Solo mueve el foco al abrir (autoFocus) o al navegar con el teclado.
    if (!shouldFocus.current) return;
    shouldFocus.current = false;
    grid.current?.querySelector<HTMLButtonElement>(`[data-iso="${focused}"]`)?.focus();
  }, [focused, month]);

  const outOfRange = (iso: string) => (!!min && iso < min) || (!!max && iso > max);

  const first = fromISO(`${month}-01`);
  const offset = (first.getDay() + 6) % 7; // lunes = 0
  const start = toISO(new Date(first.getFullYear(), first.getMonth(), 1 - offset));
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const weeks = days.slice(35).every((d) => d.slice(0, 7) !== month) ? days.slice(0, 35) : days;

  const tabTarget = weeks.includes(focused) ? focused : `${month}-01`;

  const moveMonth = (delta: number) => {
    const d = new Date(first.getFullYear(), first.getMonth() + delta, 1);
    setMonth(toISO(d).slice(0, 7));
  };
  const prevMonth = toISO(new Date(first.getFullYear(), first.getMonth(), 0));
  const nextMonth = toISO(new Date(first.getFullYear(), first.getMonth() + 1, 1));

  const moveFocus = (iso: string) => {
    shouldFocus.current = true;
    setFocused(iso);
    setMonth(iso.slice(0, 7));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (e.key in steps) {
      e.preventDefault();
      moveFocus(addDays(focused, steps[e.key]));
    } else if (e.key === "PageUp" || e.key === "PageDown") {
      e.preventDefault();
      const d = fromISO(focused);
      d.setMonth(d.getMonth() + (e.key === "PageUp" ? -1 : 1));
      moveFocus(toISO(d));
    }
  };

  return (
    <div className="w-[19.5rem] max-w-full select-none">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          icon={ChevronLeft}
          aria-label="Mes anterior"
          onClick={() => moveMonth(-1)}
          disabled={!!min && prevMonth < min}
        />
        <p className="text-lg font-bold" aria-live="polite">
          {capital(fmtMonth.format(first))}
        </p>
        <Button variant="ghost" icon={ChevronRight} aria-label="Mes siguiente" onClick={() => moveMonth(1)} disabled={!!max && nextMonth > max} />
      </div>

      <div role="grid" ref={grid} onKeyDown={onKeyDown}>
        <div role="row" className="grid grid-cols-7">
          {WEEKDAYS.map((w, i) => (
            <span key={i} role="columnheader" aria-label={WEEKDAYS_LONG[i]} className="py-1 text-center text-sm font-semibold text-neutral-500">
              {w}
            </span>
          ))}
        </div>
        {Array.from({ length: weeks.length / 7 }, (_, w) => (
          <div role="row" key={w} className="grid grid-cols-7 gap-0.5">
            {weeks.slice(w * 7, w * 7 + 7).map((iso) => {
              const inMonth = iso.slice(0, 7) === month;
              const selected = iso === value;
              const disabled = outOfRange(iso);
              return (
                <button
                  key={iso}
                  type="button"
                  role="gridcell"
                  data-iso={iso}
                  tabIndex={iso === tabTarget ? 0 : -1}
                  aria-selected={selected}
                  aria-current={iso === today ? "date" : undefined}
                  aria-label={formatISODate(iso, true)}
                  disabled={disabled}
                  onClick={() => onChange(iso)}
                  onFocus={() => setFocused(iso)}
                  className={cn(
                    "flex h-11 items-center justify-center rounded-xl text-base font-semibold tabular-nums transition",
                    "hover:bg-brand-100 disabled:pointer-events-none disabled:opacity-30",
                    !inMonth && "text-neutral-500",
                    iso === today && !selected && "ring-2 ring-inset ring-brand-400",
                    selected && "bg-brand-700 text-white hover:bg-brand-600"
                  )}
                >
                  {Number(iso.slice(8))}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {!outOfRange(today) && (
        <div className="mt-2 border-t border-neutral-100 pt-2">
          <Button variant="ghost" size="sm" block onClick={() => onChange(today)} className="text-base text-brand-800">
            Hoy
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Campo de fecha con calendario desplegable. Funciona dentro de formularios
 * (envía `name` como "AAAA-MM-DD") y también controlado con `value` / `onChange`.
 */
export function DatePicker({
  name,
  value,
  defaultValue,
  onChange,
  min,
  max,
  label,
  hint,
  error,
  hideLabel,
  placeholder = "Escoger fecha",
  align = "left",
  className,
}: FieldProps & {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (iso: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  /** Hacia qué lado se abre el calendario. */
  align?: "left" | "right";
  className?: string;
}) {
  const [own, setOwn] = useState(defaultValue ?? "");
  const current = value ?? own;
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const pick = (iso: string) => {
    if (value === undefined) setOwn(iso);
    onChange?.(iso);
    setOpen(false);
    trigger.current?.focus();
  };

  return (
    <Field label={label} hint={hint} error={error} hideLabel={hideLabel} htmlFor={id} className={className}>
      <div ref={box} className="relative">
        <button
          ref={trigger}
          id={id}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            buttonClasses({ variant: "secondary", block: true }),
            "justify-between text-left font-medium active:scale-100",
            open && "border-brand-600 ring-4 ring-brand-100",
            error && "border-danger-400"
          )}
        >
          <span className={current ? "text-neutral-900" : "text-neutral-500"}>{current ? formatISODate(current) : placeholder}</span>
          <Icon icon={CalendarDays} className="text-brand-700" />
        </button>
        {name && <input type="hidden" name={name} value={current} />}
        {open && (
          <div
            role="dialog"
            aria-label="Calendario"
            className={cn(
              "absolute z-30 mt-2 animate-aparecer rounded-2xl border border-neutral-200 bg-white p-3 shadow-xl",
              align === "right" ? "right-0" : "left-0"
            )}
          >
            <Calendar value={current} onChange={pick} min={min} max={max} autoFocus />
          </div>
        )}
      </div>
    </Field>
  );
}
