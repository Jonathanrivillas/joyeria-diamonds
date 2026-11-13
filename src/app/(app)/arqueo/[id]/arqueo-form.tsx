"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import { Check, X, Save, Lock, RotateCcw } from "lucide-react";
import { gramos, parseGramos } from "@/lib/format";
import { Aviso } from "@/components/ui";
import { CampoGramos } from "@/components/campos";
import { cerrarArqueo, guardarConteo, type ConteoInput } from "../actions";

type Det = {
  id: number;
  categoria: string;
  controlaPeso: boolean;
  pesoSistemaCg: number;
  cantidadSistema: number;
  pesoContadoCg: number | null;
  cantidadContada: number | null;
  observacion: string;
};

type Modo = null | "igual" | "diferente";
type Fila = { modo: Modo; peso: string; cant: string; obs: string };

const aTexto = (cg: number) => (cg / 100).toFixed(2).replace(".", ",");

export function ArqueoForm({
  arqueoId,
  cerrado,
  ajustesAplicados,
  esAdmin,
  observacion,
  detalles,
}: {
  arqueoId: number;
  cerrado: boolean;
  ajustesAplicados: boolean;
  esAdmin: boolean;
  observacion: string;
  detalles: Det[];
}) {
  const [pendiente, start] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>({});
  const [obs, setObs] = useState(observacion);
  const [aplicar, setAplicar] = useState(false);
  const [filas, setFilas] = useState<Fila[]>(
    detalles.map((d) => {
      if (d.pesoContadoCg === null || d.cantidadContada === null) return { modo: null, peso: "", cant: "", obs: d.observacion };
      const igual = d.pesoContadoCg === d.pesoSistemaCg && d.cantidadContada === d.cantidadSistema;
      return {
        modo: igual ? "igual" : "diferente",
        peso: aTexto(d.pesoContadoCg),
        cant: String(d.cantidadContada),
        obs: d.observacion,
      };
    })
  );

  const calc = detalles.map((d, i) => {
    const f = filas[i];
    if (f.modo === "igual") return { pC: d.pesoSistemaCg, cC: d.cantidadSistema, completo: true, dp: 0, dc: 0 };
    if (f.modo === "diferente") {
      const pC = d.controlaPeso ? parseGramos(f.peso) : 0;
      const cC = f.cant.trim() === "" ? NaN : Number(f.cant);
      const completo = (!d.controlaPeso || (f.peso.trim() !== "" && !Number.isNaN(pC))) && !Number.isNaN(cC);
      return { pC, cC, completo, dp: completo ? pC - d.pesoSistemaCg : 0, dc: completo ? cC - d.cantidadSistema : 0 };
    }
    return { pC: null, cC: null, completo: false, dp: 0, dc: 0 };
  });

  const completos = calc.filter((x) => x.completo).length;
  const faltan = detalles.length - completos;
  const conDiferencia = calc.filter((x) => x.completo && (x.dp !== 0 || x.dc !== 0)).length;
  const totSis = detalles.reduce((a, d) => a + d.pesoSistemaCg, 0);
  const totCont = calc.reduce((a, x) => a + (x.completo ? (x.pC ?? 0) : 0), 0);
  const difTotal = calc.reduce((a, x) => a + x.dp, 0);

  const set = (i: number, c: Partial<Fila>) => setFilas((fs) => fs.map((f, j) => (j === i ? { ...f, ...c } : f)));

  const input = (): ConteoInput => ({
    arqueoId,
    observacion: obs,
    detalles: detalles.map((d, i) => ({
      id: d.id,
      pesoContadoCg: calc[i].completo ? (calc[i].pC as number) : null,
      cantidadContada: calc[i].completo ? (calc[i].cC as number) : null,
      observacion: filas[i].obs,
    })),
  });

  // ---------- Arqueo terminado: solo lectura ----------
  if (cerrado) {
    return (
      <div className="space-y-5">
        <Aviso tipo={conDiferencia === 0 ? "ok" : "error"}>
          {conDiferencia === 0
            ? "Todo cuadró. El conteo es igual a lo que dice el sistema."
            : `Hubo diferencia en ${conDiferencia} ${conDiferencia === 1 ? "categoría" : "categorías"} (${gramos(difTotal)} en total). ${
                ajustesAplicados ? "El inventario se corrigió con lo contado." : "El inventario no se modificó."
              }`}
        </Aviso>
        <Totales totSis={totSis} totCont={totCont} />
        <div className="card divide-y divide-stone-100">
          {detalles.map((d, i) => {
            const x = calc[i];
            const ok = x.dp === 0 && x.dc === 0;
            return (
              <div key={d.id} className={clsx("flex flex-wrap items-center gap-3 px-5 py-4", !ok && "bg-red-50")}>
                <p className="min-w-[10rem] flex-1 text-lg font-semibold">{d.categoria}</p>
                <p className="text-base text-stone-600">
                  Sistema: {d.controlaPeso ? `${gramos(d.pesoSistemaCg)} · ` : ""}
                  {d.cantidadSistema} pzs
                </p>
                {ok ? (
                  <span className="badge bg-emerald-100 text-emerald-800"><Check className="h-4 w-4" /> Está igual</span>
                ) : (
                  <span className="badge bg-red-100 text-red-800">
                    {x.dp < 0 || x.dc < 0 ? "Falta" : "Sobra"}: {d.controlaPeso && x.dp !== 0 ? gramos(Math.abs(x.dp)) : ""}
                    {x.dc !== 0 ? ` ${Math.abs(x.dc)} pzs` : ""}
                  </span>
                )}
                {d.observacion && <p className="w-full text-base text-stone-500">Nota: {d.observacion}</p>}
              </div>
            );
          })}
        </div>
        {observacion && <p className="text-lg text-stone-600">Observación: {observacion}</p>}
      </div>
    );
  }

  // ---------- Arqueo en curso ----------
  return (
    <div className="space-y-5">
      {/* Avance */}
      <div className="card sticky top-[4.5rem] z-10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-lg font-semibold">
            Lleva {completos} de {detalles.length} categorías
          </p>
          {conDiferencia > 0 && <p className="font-semibold text-red-700">{conDiferencia} con diferencia</p>}
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-stone-200">
          <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${(completos / detalles.length) * 100}%` }} />
        </div>
      </div>

      <div className="space-y-3">
        {detalles.map((d, i) => {
          const f = filas[i];
          const x = calc[i];
          return (
            <div
              key={d.id}
              className={clsx(
                "card p-5 transition",
                (f.modo === "igual" || (f.modo === "diferente" && x.completo && x.dp === 0 && x.dc === 0)) &&
                  "border-2 border-emerald-300 bg-emerald-50",
                f.modo === "diferente" && !(x.completo && x.dp === 0 && x.dc === 0) && "border-2 border-red-300 bg-red-50/50"
              )}
            >
              <div className="flex flex-wrap items-center gap-4">
                <div className="min-w-[12rem] flex-1">
                  <p className="text-xl font-bold">{d.categoria}</p>
                  <p className="text-base text-stone-600">
                    El sistema dice:{" "}
                    <span className="font-semibold text-stone-900">
                      {d.controlaPeso ? `${gramos(d.pesoSistemaCg)} y ` : ""}
                      {d.cantidadSistema} {d.cantidadSistema === 1 ? "pieza" : "piezas"}
                    </span>
                  </p>
                </div>
                {f.modo === null ? (
                  <div className="flex w-full gap-3 sm:w-auto">
                    <button type="button" className="btn flex-1 bg-emerald-600 text-white hover:bg-emerald-700 sm:flex-none" onClick={() => set(i, { modo: "igual" })}>
                      <Check className="h-6 w-6" /> Está igual
                    </button>
                    <button
                      type="button"
                      className="btn flex-1 border-2 border-red-300 bg-white text-red-700 hover:bg-red-50 sm:flex-none"
                      onClick={() =>
                        set(i, { modo: "diferente", peso: d.controlaPeso ? aTexto(d.pesoSistemaCg) : "", cant: String(d.cantidadSistema) })
                      }
                    >
                      <X className="h-6 w-6" /> Es diferente
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    {f.modo === "igual" ? (
                      <span className="badge bg-emerald-600 px-4 py-2 text-base text-white"><Check className="h-5 w-5" /> Está igual</span>
                    ) : (
                      x.completo &&
                      (x.dp === 0 && x.dc === 0 ? (
                        <span className="badge bg-emerald-600 px-4 py-2 text-base text-white"><Check className="h-5 w-5" /> Cuadra</span>
                      ) : (
                        <span className="badge bg-red-600 px-4 py-2 text-base text-white">
                          {x.dp < 0 || x.dc < 0 ? "Falta" : "Sobra"}
                          {d.controlaPeso && x.dp !== 0 && ` ${gramos(Math.abs(x.dp))}`}
                          {x.dc !== 0 && ` ${Math.abs(x.dc)} pzs`}
                        </span>
                      ))
                    )}
                    <button type="button" className="inline-flex items-center gap-1 text-base font-medium text-stone-600 hover:underline" onClick={() => set(i, { modo: null })}>
                      <RotateCcw className="h-4 w-4" /> Cambiar
                    </button>
                  </div>
                )}
              </div>

              {f.modo === "diferente" && (
                <div className="mt-4 grid gap-4 border-t border-red-200 pt-4 md:grid-cols-3">
                  {d.controlaPeso && <CampoGramos label="¿Cuánto pesó lo que contó?" value={f.peso} onChange={(v) => set(i, { peso: v })} autoFocus />}
                  <div>
                    <label className="label">¿Cuántas piezas contó?</label>
                    <input
                      className="input text-right text-lg font-semibold"
                      inputMode="numeric"
                      value={f.cant}
                      onChange={(e) => set(i, { cant: e.target.value.replace(/\D/g, "") })}
                    />
                  </div>
                  <div>
                    <label className="label">¿Por qué cree que no cuadra?</label>
                    <input className="input" value={f.obs} onChange={(e) => set(i, { obs: e.target.value })} placeholder="Ej: una pieza está en el taller" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Totales totSis={totSis} totCont={totCont} parcial={faltan > 0} />

      <div className="card space-y-4 p-5">
        <div>
          <label className="label">Observación general (si quiere)</label>
          <textarea className="input" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>
        {msg.error && <Aviso tipo="error">{msg.error}</Aviso>}
        {msg.ok && <Aviso tipo="ok">{msg.ok}</Aviso>}

        {esAdmin && conDiferencia > 0 && (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-amber-50 p-4 text-base">
            <input type="checkbox" className="mt-1 h-6 w-6" checked={aplicar} onChange={(e) => setAplicar(e.target.checked)} />
            <span>
              <span className="font-semibold">Corregir el inventario con lo que contó.</span>
              <span className="block text-stone-600">Si no marca esto, la diferencia queda anotada pero el inventario sigue igual.</span>
            </span>
          </label>
        )}

        <div className="no-print grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            className="btn-secondary btn-grande"
            disabled={pendiente}
            onClick={() => start(async () => setMsg(await guardarConteo(input())))}
          >
            <Save className="h-6 w-6" /> Guardar y seguir después
          </button>
          <button
            type="button"
            className="btn-primary btn-grande"
            disabled={pendiente || faltan > 0}
            onClick={() =>
              start(async () => {
                const r = await cerrarArqueo(input(), aplicar);
                if (r?.error) setMsg(r);
              })
            }
          >
            <Lock className="h-6 w-6" /> {faltan > 0 ? `Faltan ${faltan} por revisar` : "Terminar el arqueo"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Totales({ totSis, totCont, parcial }: { totSis: number; totCont: number; parcial?: boolean }) {
  const dif = totCont - totSis;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="card p-4">
        <p className="text-base text-stone-600">El sistema dice</p>
        <p className="text-2xl font-bold tabular-nums">{gramos(totSis)}</p>
      </div>
      <div className="card p-4">
        <p className="text-base text-stone-600">Usted contó{parcial ? " (hasta ahora)" : ""}</p>
        <p className="text-2xl font-bold tabular-nums">{gramos(totCont)}</p>
      </div>
      {!parcial && (
        <div className={clsx("card p-4", dif === 0 ? "bg-emerald-50" : "bg-red-50")}>
          <p className="text-base text-stone-600">Diferencia</p>
          <p className={clsx("text-2xl font-bold tabular-nums", dif === 0 ? "text-emerald-700" : "text-red-700")}>
            {dif === 0 ? "Cuadra ✓" : gramos(dif)}
          </p>
        </div>
      )}
    </div>
  );
}
