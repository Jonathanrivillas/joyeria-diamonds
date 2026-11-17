"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { gramos, parseGramos } from "@/lib/format";
import { Button } from "./button";
import { Field, Input, type ControlSize } from "./form";
import { cn } from "./cn";

const nf = new Intl.NumberFormat("es-CO");

/**
 * Campo para escribir gramos. Acepta coma o punto ("5,20" o "5.20")
 * y muestra debajo cómo lo entendió el sistema, para evitar errores.
 */
export function GramsInput({
  name,
  value,
  onChange,
  defaultValue = "",
  label = "Peso",
  autoFocus,
  disabled,
  size = "lg",
  error,
}: {
  name?: string;
  value?: string;
  onChange?: (v: string) => void;
  defaultValue?: string;
  label?: React.ReactNode;
  autoFocus?: boolean;
  disabled?: boolean;
  size?: ControlSize;
  /** Error adicional (ej. "Solo hay 5,00 g en inventario"). */
  error?: React.ReactNode;
}) {
  const [internal, setInternal] = useState(defaultValue);
  const v = value ?? internal;
  const cg = parseGramos(v);
  const invalid = v.trim() !== "" && (Number.isNaN(cg) || cg < 0);

  return (
    <Input
      name={name}
      label={label}
      size={size}
      numeric
      suffix="gramos"
      inputMode="decimal"
      autoComplete="off"
      placeholder="0,00"
      autoFocus={autoFocus}
      disabled={disabled}
      value={v}
      onChange={(e) => {
        const next = e.target.value.replace(/[^\d.,]/g, "");
        if (onChange) onChange(next);
        else setInternal(next);
      }}
      error={invalid ? "Escriba solo el número, por ejemplo: 5,20" : error}
      hint={disabled ? undefined : v.trim() ? `Entendido: ${gramos(cg)}` : "Use la coma para los decimales. Ej: 5,20"}
    />
  );
}

/** Campo de dinero que se formatea mientras se escribe: "1250000" → "1.250.000". */
export function MoneyInput({
  name,
  value,
  onChange,
  defaultValue,
  label,
  placeholder = "0",
  autoFocus,
  size = "md",
  hint,
  error,
}: {
  name?: string;
  value?: number;
  onChange?: (v: number) => void;
  defaultValue?: number;
  label?: React.ReactNode;
  placeholder?: string;
  autoFocus?: boolean;
  size?: ControlSize;
  hint?: React.ReactNode;
  error?: React.ReactNode;
}) {
  const [internal, setInternal] = useState<number>(defaultValue ?? 0);
  const v = value ?? internal;

  return (
    <>
      <Input
        label={label}
        size={size}
        numeric
        prefix="$"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        autoFocus={autoFocus}
        value={v ? nf.format(v) : ""}
        onChange={(e) => {
          const n = Number(e.target.value.replace(/\D/g, "")) || 0;
          if (onChange) onChange(n);
          else setInternal(n);
        }}
        hint={hint}
        error={error}
      />
      {name && <input type="hidden" name={name} value={v} />}
    </>
  );
}

/** Cantidad con botones grandes de menos / más. */
export function QuantityStepper({
  name,
  value,
  onChange,
  min = 1,
  max,
  label = "Cantidad de piezas",
  error,
}: {
  name?: string;
  value?: number;
  onChange?: (v: number) => void;
  min?: number;
  max?: number;
  label?: React.ReactNode;
  error?: React.ReactNode;
}) {
  const [internal, setInternal] = useState(min);
  const v = value ?? internal;
  const set = (n: number) => {
    const c = Math.max(min, max !== undefined ? Math.min(max, n) : n);
    if (onChange) onChange(c);
    else setInternal(c);
  };

  return (
    <Field label={label} error={error}>
      <div className="flex items-center gap-3">
        <Button variant="secondary" size="lg" icon={Minus} aria-label="Menos" onClick={() => set(v - 1)} disabled={v <= min} />
        <input
          aria-label={typeof label === "string" ? label : "Cantidad"}
          className={cn(
            "h-12 w-20 rounded-xl border-2 border-neutral-300 bg-white text-center text-2xl font-bold tabular-nums outline-none",
            "focus:border-brand-600 focus:ring-4 focus:ring-brand-100",
            error && "border-danger-400"
          )}
          inputMode="numeric"
          value={v}
          onChange={(e) => set(Number(e.target.value.replace(/\D/g, "")) || min)}
        />
        <Button variant="secondary" size="lg" icon={Plus} aria-label="Más" onClick={() => set(v + 1)} disabled={max !== undefined && v >= max} />
        {name && <input type="hidden" name={name} value={v} />}
      </div>
    </Field>
  );
}

/** Campo para contar piezas (solo dígitos). */
export function CountInput({
  label,
  value,
  onChange,
}: {
  label: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
}) {
  return <Input label={label} size="lg" numeric inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))} />;
}
