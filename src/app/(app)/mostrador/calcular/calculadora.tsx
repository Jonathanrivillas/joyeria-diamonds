"use client";

import { useState } from "react";
import { RotateCcw, ShoppingBag } from "lucide-react";
import { cop, gramos, parseGramos } from "@/lib/format";
import { Button, Card, GramsInput } from "@/components/ui";

/**
 * Calcula el precio de una pieza por su peso, para decírselo (o mostrárselo) al cliente.
 * No crea ninguna venta ni toca el inventario. "Vender esta pieza" lleva a Vender con el peso puesto.
 * Pantalla ancha: a la izquierda el peso y los botones; a la derecha el precio en grande.
 */
export function Calculadora({ precioGramo }: { precioGramo: number }) {
  const [peso, setPeso] = useState("");
  const pesoCg = parseGramos(peso);
  const valido = !Number.isNaN(pesoCg) && pesoCg > 0;
  const valor = valido ? Math.round((pesoCg / 100) * precioGramo) : 0;

  return (
    <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-2">
      <div className="space-y-5">
        <Card padding="lg">
          <GramsInput label="¿Cuánto pesa? (póngala en la balanza)" value={peso} onChange={setPeso} autoFocus size="xl" />
        </Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button variant="secondary" size="lg" icon={RotateCcw} onClick={() => setPeso("")} disabled={!peso}>
            Calcular otra pieza
          </Button>
          <Button size="lg" icon={ShoppingBag} href={valido ? `/ventas/nueva?peso=${encodeURIComponent(peso)}` : "/ventas/nueva"}>
            {valido ? "Vender esta pieza" : "Ir a vender"}
          </Button>
        </div>
        <p className="text-base text-neutral-500">Esto solo calcula: no hace ninguna venta ni descuenta del inventario.</p>
      </div>

      {/* El resultado en grande, para voltear la pantalla hacia el cliente. */}
      <Card padding="lg" tone={valido ? "success" : "neutral"} className="flex flex-col items-center justify-center text-center xl:min-h-full">
        {valido ? (
          <>
            <p className="text-xl text-neutral-700 tabular-nums sm:text-2xl">
              {gramos(pesoCg)} × {cop(precioGramo)} el gramo
            </p>
            <p className="mt-2 text-5xl font-bold tabular-nums sm:text-7xl">{cop(valor)}</p>
          </>
        ) : (
          <p className="py-6 text-xl text-neutral-500">Escriba el peso y aquí aparece el precio.</p>
        )}
      </Card>
    </div>
  );
}
