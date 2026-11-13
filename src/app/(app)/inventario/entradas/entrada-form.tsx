"use client";

import { useActionState, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { registrarEntrada } from "./actions";
import { Aviso } from "@/components/ui";
import { CampoGramos, Contador } from "@/components/campos";

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
    <form action={accion} className="card p-6"><div className="space-y-5">
      <h2 className="text-2xl font-bold">Ingresar mercancía nueva</h2>
      {estado?.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}
      <div>
        <label className="label">¿A qué local llega?</label>
        <select name="localId" className="input" defaultValue={localDefecto}>
          {locales.map((l) => (
            <option key={l.id} value={l.id}>{l.nombre}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">¿Qué tipo de pieza es?</label>
        <select name="categoriaId" className="input text-lg" value={catId} onChange={(e) => setCatId(Number(e.target.value))}>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>
      {cat?.controlaPeso && <CampoGramos name="peso" label="¿Cuánto pesa todo lo que llegó?" value={peso} onChange={setPeso} grande />}
      <Contador name="cantidad" label="¿Cuántas piezas son?" value={cantidad} onChange={setCantidad} />
      <div>
        <label className="label">¿De dónde viene? (si quiere)</label>
        <input name="nota" className="input" placeholder="Ej: Proveedor Juan, factura 123" />
      </div>
      {estado?.error && <Aviso tipo="error">{estado.error}</Aviso>}
      <button className="btn-primary btn-grande w-full" disabled={pendiente}>
        <Check className="h-6 w-6" /> {pendiente ? "Guardando..." : "Guardar ingreso"}
      </button>
    </div></form>
  );
}
