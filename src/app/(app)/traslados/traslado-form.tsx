"use client";

import { useActionState, useEffect, useState } from "react";
import { ArrowDown, Check } from "lucide-react";
import { crearTraslado } from "./actions";
import { Aviso } from "@/components/ui";
import { CampoGramos, Contador } from "@/components/campos";

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
    <form action={accion} className="card p-6"><div className="space-y-5">
      <h2 className="text-2xl font-bold">Mover mercancía</h2>
      {estado?.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}
      <div>
        <label className="label">Sale de</label>
        <select name="origenId" className="input" value={origen} onChange={(e) => setOrigen(Number(e.target.value))}>
          {locales.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
        </select>
      </div>
      <ArrowDown className="mx-auto h-7 w-7 text-stone-400" />
      <div>
        <label className="label">Llega a</label>
        <select name="destinoId" className="input" key={origen} defaultValue={destinos[0]?.id}>
          {destinos.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
        </select>
      </div>
      <div>
        <label className="label">¿Qué tipo de pieza?</label>
        <select name="categoriaId" className="input text-lg" value={catId} onChange={(e) => setCatId(Number(e.target.value))}>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>
      {cat?.controlaPeso && <CampoGramos name="peso" label="¿Cuánto pesa?" value={peso} onChange={setPeso} />}
      <Contador name="cantidad" label="¿Cuántas piezas?" value={cantidad} onChange={setCantidad} />
      <div>
        <label className="label">Nota (si quiere)</label>
        <input name="nota" className="input" placeholder="Ej: para surtir vitrina" />
      </div>
      {estado?.error && <Aviso tipo="error">{estado.error}</Aviso>}
      <button className="btn-primary btn-grande w-full" disabled={pendiente}>
        <Check className="h-6 w-6" /> {pendiente ? "Guardando..." : "Guardar traslado"}
      </button>
    </div></form>
  );
}
