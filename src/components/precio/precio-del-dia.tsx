"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Pencil } from "lucide-react";
import { fijarPrecioGramo } from "@/app/(app)/precio-actions";
import { cop } from "@/lib/format";
import { Alert, Button, Card, MoneyInput } from "@/components/ui";

/**
 * Precio del gramo de hoy, en el inicio.
 * - Administradora: si aún no lo confirmó hoy, se le pregunta primero ("¿Sigue igual o cambió?").
 * - Vendedora: solo lo ve.
 */
export function PrecioDelDia({
  valor,
  confirmadoHoy,
  ultimaVez,
  puedeCambiar,
}: {
  valor: number;
  confirmadoHoy: boolean;
  /** Texto ya formateado de cuándo se puso por última vez, ej. "Ayer 9:15 a. m.". */
  ultimaVez: string | null;
  puedeCambiar: boolean;
}) {
  const [estado, accion, pendiente] = useActionState(
    fijarPrecioGramo,
    undefined,
  );
  const nunca = valor <= 0;
  const [modo, setModo] = useState<"preguntar" | "editar" | "listo">(
    !puedeCambiar || confirmadoHoy ? "listo" : nunca ? "editar" : "preguntar",
  );
  const [nuevo, setNuevo] = useState(nunca ? 0 : valor);

  useEffect(() => {
    if (estado?.ok) setModo("listo");
  }, [estado]);

  // ---------- Administradora: todavía no confirma el precio de hoy ----------
  if (modo === "preguntar") {
    return (
      <Card tone="warning" emphasis padding="lg" as="section">
        <div className="space-y-5">
          <div>
            <h2 className="text-2xl font-bold">¿A cuánto está el gramo hoy?</h2>
            <p className="mt-1 text-lg text-neutral-700">
              La última vez estaba a{" "}
              <span className="font-bold">{cop(valor)}</span>
              {ultimaVez && (
                <span className="text-neutral-500">
                  {" "}
                  ({ultimaVez.toLowerCase()})
                </span>
              )}
              .
            </p>
          </div>
          {estado?.error && <Alert tone="danger">{estado.error}</Alert>}
          <div className="grid gap-3 sm:grid-cols-2">
            <form action={accion}>
              <input type="hidden" name="valor" value={valor} />
              <Button
                type="submit"
                size="lg"
                block
                icon={Check}
                loading={pendiente}
              >
                Sigue igual
              </Button>
            </form>
            <Button
              variant="secondary"
              size="lg"
              block
              icon={Pencil}
              onClick={() => setModo("editar")}
              disabled={pendiente}
            >
              Cambió
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // ---------- Escribir el precio nuevo ----------
  if (modo === "editar") {
    return (
      <Card tone="warning" emphasis padding="lg" as="section">
        <form action={accion}>
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold">
                ¿A cuánto está el gramo hoy?
              </h2>
              {!nunca && (
                <p className="mt-1 text-lg text-neutral-700">
                  Estaba a <span className="font-bold">{cop(valor)}</span>.
                </p>
              )}
            </div>
            <MoneyInput
              name="valor"
              label="Precio del gramo hoy"
              size="lg"
              value={nuevo}
              onChange={setNuevo}
              autoFocus
              hint="Todas las ventas de hoy usarán este precio."
              error={estado?.error}
            />
            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                size="lg"
                icon={Check}
                loading={pendiente}
                disabled={nuevo <= 0}
              >
                Guardar precio de hoy
              </Button>
              {!nunca && (
                <Button
                  variant="ghost"
                  size="lg"
                  disabled={pendiente}
                  onClick={() => {
                    setNuevo(valor);
                    setModo(confirmadoHoy ? "listo" : "preguntar");
                  }}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </form>
      </Card>
    );
  }

  // ---------- Ya confirmado (o vista de la vendedora) ----------
  return (
    <Card padding="md" as="section">
      <div className="space-y-3">
        {estado?.ok && <Alert tone="success">{estado.ok}</Alert>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-base text-neutral-600">Precio del gramo hoy</p>
            <p className="text-3xl font-bold tabular-nums">
              {nunca ? "Sin precio" : cop(valor)}
            </p>
          </div>
          {puedeCambiar && (
            <Button
              variant="secondary"
              icon={Pencil}
              onClick={() => {
                setNuevo(valor);
                setModo("editar");
              }}
            >
              Cambiar
            </Button>
          )}
        </div>
        {!puedeCambiar && !confirmadoHoy && (
          <p className="text-base text-neutral-600">
            {nunca
              ? "La administradora todavía no ha puesto el precio del gramo."
              : "La administradora todavía no ha confirmado el precio de hoy. Se usa el último que puso."}
          </p>
        )}
      </div>
    </Card>
  );
}
