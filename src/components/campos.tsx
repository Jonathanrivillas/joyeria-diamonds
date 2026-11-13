"use client";

import { useState } from "react";
import clsx from "clsx";
import { Minus, Plus } from "lucide-react";
import { gramos, parseGramos } from "@/lib/format";

const nf = new Intl.NumberFormat("es-CO");

/**
 * Campo para escribir gramos. Acepta coma o punto ("5,20" o "5.20")
 * y muestra debajo cómo lo entendió el sistema, para evitar errores.
 */
export function CampoGramos({
  name,
  value,
  onChange,
  defaultValue = "",
  label = "Peso",
  autoFocus,
  disabled,
  grande,
}: {
  name?: string;
  value?: string;
  onChange?: (v: string) => void;
  defaultValue?: string;
  label?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  grande?: boolean;
}) {
  const [interno, setInterno] = useState(defaultValue);
  const v = value ?? interno;
  const cg = parseGramos(v);
  const invalido = v.trim() !== "" && (Number.isNaN(cg) || cg < 0);

  return (
    <div>
      {label && <label className="label">{label}</label>}
      <div className="relative">
        <input
          name={name}
          className={clsx(
            "input pr-24 text-right font-semibold tabular-nums",
            grande && "min-h-[3.5rem] pr-32 text-2xl",
            invalido && "border-red-400"
          )}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          autoFocus={autoFocus}
          disabled={disabled}
          value={v}
          onChange={(e) => {
            const nuevo = e.target.value.replace(/[^\d.,]/g, "");
            if (onChange) onChange(nuevo);
            else setInterno(nuevo);
          }}
        />
        <span className={clsx("pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-medium text-stone-500", grande ? "text-xl" : "text-base")}>
          gramos
        </span>
      </div>
      {invalido ? (
        <p className="mt-1 text-sm font-medium text-red-700">Escriba solo el número, por ejemplo: 5,20</p>
      ) : (
        !disabled && (
          <p className="ayuda">{v.trim() ? `Entendido: ${gramos(cg)}` : "Use la coma para los decimales. Ej: 5,20"}</p>
        )
      )}
    </div>
  );
}

/** Campo de dinero que se formatea mientras se escribe: "1250000" → "1.250.000". */
export function CampoDinero({
  name,
  value,
  onChange,
  defaultValue,
  label,
  placeholder = "0",
  autoFocus,
  grande,
  ayuda,
}: {
  name?: string;
  value?: number;
  onChange?: (v: number) => void;
  defaultValue?: number;
  label?: string;
  placeholder?: string;
  autoFocus?: boolean;
  grande?: boolean;
  ayuda?: string;
}) {
  const [interno, setInterno] = useState<number>(defaultValue ?? 0);
  const v = value ?? interno;

  return (
    <div>
      {label && <label className="label">{label}</label>}
      <div className="relative">
        <span className={clsx("pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-stone-500", grande ? "text-2xl" : "text-base")}>
          $
        </span>
        <input
          className={clsx("input pl-9 text-right font-semibold tabular-nums", grande && "min-h-[3.5rem] text-2xl")}
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          autoFocus={autoFocus}
          value={v ? nf.format(v) : ""}
          onChange={(e) => {
            const n = Number(e.target.value.replace(/\D/g, "")) || 0;
            if (onChange) onChange(n);
            else setInterno(n);
          }}
        />
        {name && <input type="hidden" name={name} value={v} />}
      </div>
      {ayuda && <p className="ayuda">{ayuda}</p>}
    </div>
  );
}

/** Cantidad con botones grandes de menos / más. */
export function Contador({
  name,
  value,
  onChange,
  min = 1,
  max,
  label = "Cantidad de piezas",
}: {
  name?: string;
  value?: number;
  onChange?: (v: number) => void;
  min?: number;
  max?: number;
  label?: string;
}) {
  const [interno, setInterno] = useState(min);
  const v = value ?? interno;
  const set = (n: number) => {
    const c = Math.max(min, max !== undefined ? Math.min(max, n) : n);
    if (onChange) onChange(c);
    else setInterno(c);
  };

  return (
    <div>
      {label && <label className="label">{label}</label>}
      <div className="flex items-center gap-3">
        <button type="button" className="btn-secondary h-12 w-12 shrink-0 p-0" onClick={() => set(v - 1)} disabled={v <= min} aria-label="Menos">
          <Minus className="h-6 w-6" />
        </button>
        <input
          className="input h-12 w-20 text-center text-2xl font-bold tabular-nums"
          inputMode="numeric"
          value={v}
          onChange={(e) => set(Number(e.target.value.replace(/\D/g, "")) || min)}
        />
        <button type="button" className="btn-secondary h-12 w-12 shrink-0 p-0" onClick={() => set(v + 1)} disabled={max !== undefined && v >= max} aria-label="Más">
          <Plus className="h-6 w-6" />
        </button>
        {name && <input type="hidden" name={name} value={v} />}
      </div>
    </div>
  );
}
