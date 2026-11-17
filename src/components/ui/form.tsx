"use client";

import { useId } from "react";
import { Check } from "lucide-react";
import { cn } from "./cn";
import { Icon } from "./icon";

/* -------------------------------------------------------------------------- */
/*  Field: etiqueta + control + ayuda/error. Todos los controles lo usan.      */
/* -------------------------------------------------------------------------- */

export type FieldProps = {
  label?: React.ReactNode;
  /** Texto de ayuda gris bajo el control. */
  hint?: React.ReactNode;
  /** Mensaje de error rojo (reemplaza la ayuda). */
  error?: React.ReactNode;
  /** Oculta la etiqueta visualmente (sigue disponible para lectores de pantalla). */
  hideLabel?: boolean;
};

export function Field({
  label,
  hint,
  error,
  hideLabel,
  htmlFor,
  className,
  children,
}: FieldProps & { htmlFor?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className={cn("mb-1.5 block text-base font-semibold text-neutral-700", hideLabel && "sr-only")}>
          {label}
        </label>
      )}
      {children}
      <FieldMessage hint={hint} error={error} />
    </div>
  );
}

export function FieldMessage({ hint, error }: { hint?: React.ReactNode; error?: React.ReactNode }) {
  if (error) return <p className="mt-1 text-base font-medium text-danger-700">{error}</p>;
  if (hint) return <p className="mt-1 text-sm text-neutral-500">{hint}</p>;
  return null;
}

/* -------------------------------------------------------------------------- */
/*  Estilos compartidos de controles                                           */
/* -------------------------------------------------------------------------- */

export type ControlSize = "md" | "lg" | "xl";

const controlSizes: Record<ControlSize, string> = {
  md: "min-h-[2.75rem] text-base",
  lg: "min-h-[3rem] text-lg",
  xl: "min-h-[3.5rem] text-2xl",
};

export function controlClasses({ size = "md", invalid, className }: { size?: ControlSize; invalid?: boolean; className?: string } = {}) {
  return cn(
    "w-full rounded-xl border-2 border-neutral-300 bg-white px-3.5 py-2 text-neutral-900 outline-none transition",
    "placeholder:text-neutral-500 focus:border-brand-600 focus:ring-4 focus:ring-brand-100",
    "disabled:bg-neutral-100 disabled:text-neutral-400",
    controlSizes[size],
    invalid && "border-danger-400 focus:border-danger-500 focus:ring-danger-100",
    className
  );
}

/* -------------------------------------------------------------------------- */
/*  Input                                                                      */
/* -------------------------------------------------------------------------- */

export type InputProps = FieldProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "prefix"> & {
    size?: ControlSize;
    /** Texto fijo a la izquierda dentro del campo (ej. "$"). */
    prefix?: React.ReactNode;
    /** Texto fijo a la derecha dentro del campo (ej. "gramos"). */
    suffix?: React.ReactNode;
    /** Alinea a la derecha con números tabulares. */
    numeric?: boolean;
    containerClassName?: string;
    /** Elemento extra dentro del campo, a la derecha (ej. botón "Ver"). */
    trailing?: React.ReactNode;
  };

export function Input({
  label,
  hint,
  error,
  hideLabel,
  size = "md",
  prefix,
  suffix,
  numeric,
  trailing,
  className,
  containerClassName,
  id,
  ...rest
}: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const affixText = size === "xl" ? "text-xl" : "text-base";
  return (
    <Field label={label} hint={hint} error={error} hideLabel={hideLabel} htmlFor={inputId} className={containerClassName}>
      <div className="relative">
        {prefix && (
          <span className={cn("pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-neutral-500", affixText)}>
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          className={controlClasses({
            size,
            invalid: !!error,
            className: cn(
              numeric && "text-right font-semibold tabular-nums",
              prefix && "pl-9",
              suffix && (size === "xl" ? "pr-32" : "pr-24"),
              trailing && "pr-32",
              className
            ),
          })}
          {...rest}
        />
        {suffix && (
          <span className={cn("pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-medium text-neutral-500", affixText)}>
            {suffix}
          </span>
        )}
        {trailing && <div className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
    </Field>
  );
}

/* -------------------------------------------------------------------------- */
/*  Textarea                                                                   */
/* -------------------------------------------------------------------------- */

export function Textarea({
  label,
  hint,
  error,
  hideLabel,
  size = "md",
  className,
  id,
  rows = 3,
  ...rest
}: FieldProps & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "size"> & { size?: ControlSize }) {
  const autoId = useId();
  const tid = id ?? autoId;
  return (
    <Field label={label} hint={hint} error={error} hideLabel={hideLabel} htmlFor={tid}>
      <textarea id={tid} rows={rows} aria-invalid={error ? true : undefined} className={controlClasses({ size, invalid: !!error, className })} {...rest} />
    </Field>
  );
}

/* -------------------------------------------------------------------------- */
/*  Select                                                                     */
/* -------------------------------------------------------------------------- */

export type SelectOption = { value: string | number; label: React.ReactNode };

export function Select({
  label,
  hint,
  error,
  hideLabel,
  size = "md",
  options,
  placeholder,
  className,
  containerClassName,
  id,
  children,
  ...rest
}: FieldProps &
  Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
    size?: ControlSize;
    options?: SelectOption[];
    /** Primera opción vacía (ej. "Todas"). */
    placeholder?: string;
    containerClassName?: string;
  }) {
  const autoId = useId();
  const sid = id ?? autoId;
  return (
    <Field label={label} hint={hint} error={error} hideLabel={hideLabel} htmlFor={sid} className={containerClassName}>
      <select id={sid} className={controlClasses({ size, invalid: !!error, className: cn("cursor-pointer", className) })} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options?.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        {children}
      </select>
    </Field>
  );
}

/* -------------------------------------------------------------------------- */
/*  Checkbox                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Casilla grande. `variant="card"` la muestra como un recuadro que se colorea al marcarla
 * (para opciones importantes como "Corregir el inventario" o "Cobrar hechura").
 */
export function Checkbox({
  label,
  description,
  variant = "plain",
  hideLabel,
  className,
  id,
  ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: React.ReactNode;
  description?: React.ReactNode;
  variant?: "plain" | "card";
  hideLabel?: boolean;
}) {
  const autoId = useId();
  const cid = id ?? autoId;
  return (
    <label
      htmlFor={cid}
      className={cn(
        "group flex cursor-pointer items-start gap-3 text-base",
        variant === "card" &&
          "rounded-xl border-2 border-neutral-300 bg-white p-4 transition has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-400",
        rest.disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <input id={cid} type="checkbox" className="peer sr-only" {...rest} />
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-neutral-400 bg-white text-transparent transition",
          "peer-checked:border-brand-700 peer-checked:bg-brand-700 peer-checked:text-white",
          variant === "plain" && "peer-focus-visible:ring-4 peer-focus-visible:ring-brand-400"
        )}
      >
        <Icon icon={Check} size="xs" />
      </span>
      <span className={cn(hideLabel && "sr-only")}>
        <span className={cn(description && "font-semibold")}>{label}</span>
        {description && <span className="block text-neutral-600">{description}</span>}
      </span>
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/*  FormGrid: columnas estándar para formularios                               */
/* -------------------------------------------------------------------------- */

export function FormGrid({ columns = 2, className, children }: { columns?: 1 | 2 | 3; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("grid gap-4", columns === 2 && "sm:grid-cols-2", columns === 3 && "sm:grid-cols-2 lg:grid-cols-3", className)}>
      {children}
    </div>
  );
}
