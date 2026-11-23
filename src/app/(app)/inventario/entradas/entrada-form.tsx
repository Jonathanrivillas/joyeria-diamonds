"use client";

import { useActionState, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { registrarEntrada } from "./actions";
import { cop, parseGramos } from "@/lib/format";
import { Alert, Button, Card, Chip, ChipGroup, Field, GramsInput, Input, MoneyInput, QuantityStepper, Select } from "@/components/ui";

export function EntradaForm({
  locales,
  localDefecto,
  categorias,
  proveedores,
  hoy,
}: {
  locales: { id: number; nombre: string }[];
  localDefecto?: number;
  categorias: { id: number; nombre: string; controlaPeso: boolean }[];
  /** Proveedores activos. */
  proveedores: { id: number; nombre: string }[];
  /** Fecha de hoy en Colombia ("2026-11-23"): valor inicial y máximo del campo fecha. */
  hoy: string;
}) {
  const [estado, accion, pendiente] = useActionState(registrarEntrada, undefined);
  const [catId, setCatId] = useState(categorias[0]?.id);
  const [peso, setPeso] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [proveedorId, setProveedorId] = useState<number | null>(null);
  const [precio, setPrecio] = useState(0);
  const [fecha, setFecha] = useState(hoy);
  const cat = categorias.find((c) => c.id === Number(catId));

  useEffect(() => {
    if (estado?.ok) {
      setPeso("");
      setCantidad(1);
      setPrecio(0);
      setProveedorId(null);
      setFecha(hoy);
    }
  }, [estado, hoy]);

  const pesoCg = parseGramos(peso);
  const total = precio > 0 ? (cat?.controlaPeso ? (Number.isNaN(pesoCg) ? 0 : Math.round((pesoCg / 100) * precio)) : precio * cantidad) : 0;
  const proveedor = proveedores.find((p) => p.id === proveedorId);

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

        <Field label="¿A quién se le compró?">
          <input type="hidden" name="proveedorId" value={proveedorId ?? ""} />
          <ChipGroup>
            <Chip selected={proveedorId === null} onClick={() => setProveedorId(null)}>
              No fue una compra
            </Chip>
            {proveedores.map((p) => (
              <Chip key={p.id} selected={proveedorId === p.id} onClick={() => setProveedorId(p.id)}>
                {p.nombre}
              </Chip>
            ))}
          </ChipGroup>
          {proveedores.length === 0 && <p className="mt-2 text-sm text-neutral-500">Para anotar compras, primero agregue el proveedor en el módulo Proveedores.</p>}
        </Field>

        {proveedor && (
          <>
            <MoneyInput
              name="precio"
              label={cat?.controlaPeso ? "¿A cómo se compró el gramo?" : "¿A cómo se compró cada pieza?"}
              value={precio}
              onChange={setPrecio}
              size="xl"
            />
            {total > 0 && (
              <Alert tone="info" title={`Total de la compra: ${cop(total)}`}>
                Se anotará en Gastos como pago a {proveedor.nombre}.
              </Alert>
            )}
          </>
        )}

        <Input label="¿Qué día llegó?" name="fecha" type="date" value={fecha} max={hoy} onChange={(e) => setFecha(e.target.value)} />
        <Input label="Nota (si quiere)" name="nota" placeholder="Ej: factura 123" />
        {estado?.error && <Alert tone="danger">{estado.error}</Alert>}
        <Button
          type="submit"
          size="lg"
          block
          icon={Check}
          loading={pendiente}
          loadingText="Guardando..."
          disabled={!!proveedor && precio <= 0}
        >
          {proveedor && precio <= 0 ? "Escriba el precio de compra" : "Guardar ingreso"}
        </Button>
      </form>
    </Card>
  );
}
