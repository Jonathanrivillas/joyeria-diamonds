"use client";

import { useActionState, useEffect, useState } from "react";
import { ArrowDown, Check } from "lucide-react";
import { crearTraslado } from "./actions";
import { Alert, Button, Card, GramsInput, Icon, Input, QuantityStepper, Select } from "@/components/ui";

export function TrasladoForm({
  locales,
  categorias,
}: {
  locales: { id: number; nombre: string }[];
  categorias: { id: number; nombre: string; controlaPeso: boolean }[];
}) {
  const [estado, accion, pendiente] = useActionState(crearTraslado, undefined);
  const [catId, setCatId] = useState(categorias[0]?.id);
  const [origen, setOrigen] = useState(locales[0]?.id);
  const [peso, setPeso] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const cat = categorias.find((c) => c.id === catId);
  const destinos = locales.filter((l) => l.id !== origen);

  useEffect(() => {
    if (estado?.ok) {
      setPeso("");
      setCantidad(1);
    }
  }, [estado]);

  return (
    <Card padding="lg">
      <form action={accion} className="space-y-5 [&>h2]:!mt-0">
        <h2 className="text-2xl font-bold">Mover mercancía</h2>
        {estado?.ok && <Alert tone="success">{estado.ok}</Alert>}
        <Select
          label="Sale de"
          name="origenId"
          value={origen}
          onChange={(e) => setOrigen(Number(e.target.value))}
          options={locales.map((l) => ({ value: l.id, label: l.nombre }))}
        />
        <Icon icon={ArrowDown} size="lg" className="mx-auto block text-neutral-400" />
        <Select
          key={origen}
          label="Llega a"
          name="destinoId"
          defaultValue={destinos[0]?.id}
          options={destinos.map((l) => ({ value: l.id, label: l.nombre }))}
        />
        <Select
          label="¿Qué tipo de pieza?"
          name="categoriaId"
          size="lg"
          value={catId}
          onChange={(e) => setCatId(Number(e.target.value))}
          options={categorias.map((c) => ({ value: c.id, label: c.nombre }))}
        />
        {cat?.controlaPeso && <GramsInput name="peso" label="¿Cuánto pesa?" value={peso} onChange={setPeso} />}
        <QuantityStepper name="cantidad" label="¿Cuántas piezas?" value={cantidad} onChange={setCantidad} />
        <Input label="Nota (si quiere)" name="nota" placeholder="Ej: para surtir vitrina" />
        {estado?.error && <Alert tone="danger">{estado.error}</Alert>}
        <Button type="submit" size="lg" block icon={Check} loading={pendiente} loadingText="Guardando...">
          Guardar traslado
        </Button>
      </form>
    </Card>
  );
}
