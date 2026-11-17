"use client";

import { useActionState, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { registrarEntrada } from "./actions";
import { Alert, Button, Card, GramsInput, Input, QuantityStepper, Select } from "@/components/ui";

export function EntradaForm({
  locales,
  localDefecto,
  categorias,
}: {
  locales: { id: number; nombre: string }[];
  localDefecto?: number;
  categorias: { id: number; nombre: string; controlaPeso: boolean }[];
}) {
  const [estado, accion, pendiente] = useActionState(registrarEntrada, undefined);
  const [catId, setCatId] = useState(categorias[0]?.id);
  const [peso, setPeso] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const cat = categorias.find((c) => c.id === Number(catId));

  useEffect(() => {
    if (estado?.ok) {
      setPeso("");
      setCantidad(1);
    }
  }, [estado]);

  return (
    <Card padding="lg">
      <form action={accion} className="space-y-5">
        <h2 className="text-2xl font-bold">Ingresar mercancía nueva</h2>
        {estado?.ok && <Alert tone="success">{estado.ok}</Alert>}
        <Select
          label="¿A qué local llega?"
          name="localId"
          defaultValue={localDefecto}
          options={locales.map((l) => ({ value: l.id, label: l.nombre }))}
        />
        <Select
          label="¿Qué tipo de pieza es?"
          name="categoriaId"
          size="lg"
          value={catId}
          onChange={(e) => setCatId(Number(e.target.value))}
          options={categorias.map((c) => ({ value: c.id, label: c.nombre }))}
        />
        {cat?.controlaPeso && <GramsInput name="peso" label="¿Cuánto pesa todo lo que llegó?" value={peso} onChange={setPeso} size="xl" />}
        <QuantityStepper name="cantidad" label="¿Cuántas piezas son?" value={cantidad} onChange={setCantidad} />
        <Input label="¿De dónde viene? (si quiere)" name="nota" placeholder="Ej: Proveedor Juan, factura 123" />
        {estado?.error && <Alert tone="danger">{estado.error}</Alert>}
        <Button type="submit" size="lg" block icon={Check} loading={pendiente} loadingText="Guardando...">
          Guardar ingreso
        </Button>
      </form>
    </Card>
  );
}
