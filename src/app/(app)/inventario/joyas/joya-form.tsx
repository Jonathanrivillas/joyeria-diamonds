"use client";

import { useActionState, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { registrarJoya } from "./actions";
import { gramos, TIPOS_JOYA } from "@/lib/format";
import { Alert, Button, Card, Chip, ChipGroup, Field, GramsInput, Input, MoneyInput, Select } from "@/components/ui";

type Origen = "COMPRA" | "INVENTARIO" | "OTRO";

export function JoyaForm({
  locales,
  localDefecto,
  proveedores,
  categoriasOrigen,
}: {
  locales: { id: number; nombre: string }[];
  localDefecto?: number;
  proveedores: { id: number; nombre: string }[];
  /** Tipos de pieza de donde puede salir una joya que ya estaba en inventario, con lo que hay por local. */
  categoriasOrigen: { id: number; nombre: string; existencias: { localId: number; pesoCg: number; cantidad: number }[] }[];
}) {
  const [estado, accion, pendiente] = useActionState(registrarJoya, undefined);
  const [formKey, setFormKey] = useState(0);
  const [localId, setLocalId] = useState(localDefecto ?? locales[0]?.id);
  const [tipo, setTipo] = useState("");
  const [peso, setPeso] = useState("");
  const [precio, setPrecio] = useState(0);
  const [origen, setOrigen] = useState<Origen | null>(null);
  const [proveedorId, setProveedorId] = useState<number | null>(null);
  const [costo, setCosto] = useState(0);
  const [catOrigenId, setCatOrigenId] = useState<number | null>(null);

  useEffect(() => {
    if (estado?.ok) {
      setTipo("");
      setPeso("");
      setPrecio(0);
      setCosto(0);
      setFormKey((k) => k + 1); // limpia descripción y código
    }
  }, [estado]);

  const hay = (c: (typeof categoriasOrigen)[number]) => c.existencias.find((e) => e.localId === localId);
  const listo =
    tipo &&
    peso &&
    precio > 0 &&
    origen &&
    (origen !== "COMPRA" || (proveedorId && costo > 0)) &&
    (origen !== "INVENTARIO" || catOrigenId);

  const textoBoton = !tipo
    ? "Toque qué tipo de joya es"
    : !peso
      ? "Escriba cuánto pesa"
      : precio <= 0
        ? "Escriba el precio de venta"
        : !origen
          ? "Toque de dónde viene"
          : origen === "COMPRA" && !proveedorId
            ? "Toque el proveedor"
            : origen === "COMPRA" && costo <= 0
              ? "Escriba cuánto costó"
              : origen === "INVENTARIO" && !catOrigenId
                ? "Toque de qué tipo de pieza sale"
                : "Registrar la joya";

  return (
    <Card padding="lg">
      <form key={formKey} action={accion} className="space-y-5">
        <h2 className="text-2xl font-bold">Registrar joya preciosa</h2>
        {estado?.ok && <Alert tone="success">{estado.ok}</Alert>}

        {locales.length > 1 ? (
          <Select
            label="¿En qué local queda?"
            name="localId"
            value={localId}
            onChange={(e) => setLocalId(Number(e.target.value))}
            options={locales.map((l) => ({ value: l.id, label: l.nombre }))}
          />
        ) : (
          <input type="hidden" name="localId" value={localId ?? ""} />
        )}

        <Field label="¿Qué es?">
          <input type="hidden" name="tipo" value={tipo} />
          <ChipGroup>
            {Object.entries(TIPOS_JOYA).map(([id, nombre]) => (
              <Chip key={id} selected={tipo === id} onClick={() => setTipo(id)}>
                {nombre}
              </Chip>
            ))}
          </ChipGroup>
        </Field>
        <Input label="Descripción (si quiere)" name="descripcion" maxLength={120} placeholder="Ej: esmeralda colombiana 0,5 ct, oro 18k" />
        <GramsInput name="peso" label="¿Cuánto pesa?" value={peso} onChange={setPeso} size="xl" />
        <MoneyInput name="precio" label="Precio de venta" value={precio} onChange={setPrecio} size="xl" hint="Cada joya preciosa tiene su propio precio: es el que se cobra al venderla." />
        <Input
          label="Código (si ya tiene uno)"
          name="codigo"
          maxLength={20}
          placeholder="Si lo deja vacío, el sistema le pone uno (JP-0001...)"
          className="uppercase"
        />

        <Field label="¿De dónde viene?">
          <input type="hidden" name="origen" value={origen ?? ""} />
          <ChipGroup>
            <Chip selected={origen === "COMPRA"} onClick={() => setOrigen("COMPRA")}>
              Se le compró a un proveedor
            </Chip>
            <Chip selected={origen === "INVENTARIO"} onClick={() => setOrigen("INVENTARIO")}>
              Ya estaba en el inventario
            </Chip>
            <Chip selected={origen === "OTRO"} onClick={() => setOrigen("OTRO")}>
              Otro
            </Chip>
          </ChipGroup>
        </Field>

        {origen === "COMPRA" && (
          <>
            <Field label="¿A cuál proveedor?">
              <input type="hidden" name="proveedorId" value={proveedorId ?? ""} />
              {proveedores.length === 0 ? (
                <Alert tone="warning">Primero agregue el proveedor en el módulo Proveedores.</Alert>
              ) : (
                <ChipGroup>
                  {proveedores.map((p) => (
                    <Chip key={p.id} selected={proveedorId === p.id} onClick={() => setProveedorId(p.id)}>
                      {p.nombre}
                    </Chip>
                  ))}
                </ChipGroup>
              )}
            </Field>
            <MoneyInput name="costo" label="¿Cuánto costó la joya?" value={costo} onChange={setCosto} size="xl" hint="Se anotará en Gastos como pago al proveedor." />
          </>
        )}

        {origen === "INVENTARIO" && (
          <Field label="¿De qué tipo de pieza sale?">
            <input type="hidden" name="categoriaOrigenId" value={catOrigenId ?? ""} />
            <ChipGroup>
              {categoriasOrigen.map((c) => {
                const e = hay(c);
                return (
                  <Chip key={c.id} selected={catOrigenId === c.id} onClick={() => setCatOrigenId(c.id)}>
                    {c.nombre} {e ? `(${gramos(e.pesoCg)} · ${e.cantidad} pzs)` : "(no hay)"}
                  </Chip>
                );
              })}
            </ChipGroup>
            <p className="mt-2 text-sm text-neutral-500">
              Se descuenta de ese tipo de pieza y se suma a Joyas preciosas: el total de gramos del local no cambia.
            </p>
          </Field>
        )}

        {estado?.error && <Alert tone="danger">{estado.error}</Alert>}
        <Button type="submit" size="lg" block icon={Check} loading={pendiente} loadingText="Guardando..." disabled={!listo}>
          {textoBoton}
        </Button>
      </form>
    </Card>
  );
}
