"use client";

import { useState, useTransition } from "react";
import { Check, X, Save, Lock, RotateCcw } from "lucide-react";
import { gramos, parseGramos } from "@/lib/format";
import {
  ActionBar,
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  CountInput,
  GramsInput,
  Input,
  LeaveGuard,
  ProgressBar,
  Stat,
  StatPanel,
  Table,
  Td,
  Th,
  Tr,
  Textarea,
  cn,
} from "@/components/ui";
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
const piezas = (n: number) => `${n} ${n === 1 ? "pieza" : "piezas"}`;
/** "12,50 g · 4 pzs" (sin gramos en categorías que solo se cuentan por pieza). */
const conteo = (pesoCg: number, cant: number, controlaPeso: boolean) => `${controlaPeso ? `${gramos(pesoCg)} · ` : ""}${cant} pzs`;

/** "Falta 2,10 g 1 pzs" / "Sobra ..." / "Cuadra". */
function Diferencia({ dp, dc, controlaPeso, solid }: { dp: number; dc: number; controlaPeso: boolean; solid?: boolean }) {
  if (dp === 0 && dc === 0)
    return (
      <Badge tone="success" icon={Check} solid={solid} size={solid ? "lg" : "md"}>
        {solid ? "Cuadra" : "Está igual"}
      </Badge>
    );
  return (
    <Badge tone="danger" solid={solid} size={solid ? "lg" : "md"}>
      {dp < 0 || dc < 0 ? "Falta" : "Sobra"}
      {controlaPeso && dp !== 0 && ` ${gramos(Math.abs(dp))}`}
      {dc !== 0 && ` ${Math.abs(dc)} pzs`}
    </Badge>
  );
}

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
  const [accion, setAccion] = useState<"guardar" | "cerrar" | null>(null);
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

  // Para avisar si sale de la pantalla con conteos sin guardar.
  const foto = JSON.stringify({ filas, obs });
  const [guardado, setGuardado] = useState(foto);
  const sinGuardar = foto !== guardado;

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
        <Alert tone={conDiferencia === 0 ? "success" : "danger"}>
          {conDiferencia === 0
            ? "Todo cuadró. El conteo es igual a lo que dice el sistema."
            : `Hubo diferencia en ${conDiferencia} ${conDiferencia === 1 ? "categoría" : "categorías"} (${gramos(difTotal)} en total). ${
                ajustesAplicados ? "El inventario se corrigió con lo contado." : "El inventario no se modificó."
              }`}
        </Alert>
        <Totales totSis={totSis} totCont={totCont} />
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>Categoría</Th>
                <Th numeric divider>
                  El sistema decía
                </Th>
                <Th numeric>Se contó</Th>
                <Th divider>Resultado</Th>
              </tr>
            </thead>
            <tbody>
              {detalles.map((d, i) => {
                const x = calc[i];
                return (
                  <Tr key={d.id}>
                    <Td>
                      <p className="font-semibold">{d.categoria}</p>
                      {d.observacion && <p className="text-base text-neutral-500">Nota: {d.observacion}</p>}
                    </Td>
                    <Td numeric divider className="whitespace-nowrap">
                      {conteo(d.pesoSistemaCg, d.cantidadSistema, d.controlaPeso)}
                    </Td>
                    <Td numeric className="whitespace-nowrap">
                      {x.completo ? conteo(x.pC ?? 0, x.cC ?? 0, d.controlaPeso) : "—"}
                    </Td>
                    <Td divider>
                      <Diferencia dp={x.dp} dc={x.dc} controlaPeso={d.controlaPeso} />
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
        {observacion && <p className="text-lg text-neutral-600">Observación: {observacion}</p>}
      </div>
    );
  }

  // ---------- Arqueo en curso ----------
  return (
    <div className="space-y-5">
      <LeaveGuard
        when={sinGuardar && !pendiente}
        title="¿Salir sin guardar el conteo?"
        message="Lo que ha contado desde la última vez que guardó se va a perder. Para no perderlo, quédese y toque «Guardar y seguir después»."
        stayLabel="No, seguir contando"
        leaveLabel="Sí, salir sin guardar"
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 min-[1800px]:grid-cols-3">
        {detalles.map((d, i) => {
          const f = filas[i];
          const x = calc[i];
          const cuadra = f.modo === "igual" || (f.modo === "diferente" && x.completo && x.dp === 0 && x.dc === 0);
          const franja = cuadra ? "border-l-success-500" : f.modo === "diferente" ? "border-l-danger-500" : "border-l-neutral-300";
          return (
            <Card key={d.id} padding="md" className={cn("flex flex-col gap-4 border-l-4", franja)}>
              <div className="flex flex-1 flex-col gap-4">
                <div>
                  <p className="text-xl font-bold">{d.categoria}</p>
                  <p className="text-base text-neutral-600">
                    El sistema dice:{" "}
                    <span className="font-semibold text-neutral-900">
                      {d.controlaPeso ? `${gramos(d.pesoSistemaCg)} y ` : ""}
                      {piezas(d.cantidadSistema)}
                    </span>
                  </p>
                </div>
                {f.modo === null ? (
                  <div className="mt-auto grid grid-cols-2 gap-3">
                    <Button variant="success" icon={Check} onClick={() => set(i, { modo: "igual" })}>
                      Está igual
                    </Button>
                    <Button
                      variant="danger-outline"
                      icon={X}
                      onClick={() => set(i, { modo: "diferente", peso: d.controlaPeso ? aTexto(d.pesoSistemaCg) : "", cant: String(d.cantidadSistema) })}
                    >
                      Es diferente
                    </Button>
                  </div>
                ) : (
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                    {f.modo === "igual" ? (
                      <Badge tone="success" solid size="lg" icon={Check}>
                        Está igual
                      </Badge>
                    ) : (
                      x.completo && <Diferencia dp={x.dp} dc={x.dc} controlaPeso={d.controlaPeso} solid />
                    )}
                    <Button variant="ghost" size="sm" icon={RotateCcw} className="text-base" onClick={() => set(i, { modo: null })}>
                      Cambiar
                    </Button>
                  </div>
                )}
              </div>

              {f.modo === "diferente" && (
                <div className="grid grid-cols-1 gap-4 border-t border-neutral-200 pt-4 sm:grid-cols-2">
                  {d.controlaPeso && <GramsInput label="¿Cuánto pesó lo que contó?" value={f.peso} onChange={(v) => set(i, { peso: v })} autoFocus />}
                  <CountInput label="¿Cuántas piezas contó?" value={f.cant} onChange={(v) => set(i, { cant: v })} />
                  <Input
                    containerClassName="sm:col-span-2"
                    label="¿Por qué cree que no cuadra?"
                    value={f.obs}
                    onChange={(e) => set(i, { obs: e.target.value })}
                    placeholder="Ej: una pieza está en el taller"
                  />
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Totales totSis={totSis} totCont={totCont} parcial={faltan > 0} />

      <Card padding="md">
        <div className="space-y-4">
          <Textarea label="Observación general (si quiere)" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
          {esAdmin && conDiferencia > 0 && (
            <Checkbox
              variant="card"
              checked={aplicar}
              onChange={(e) => setAplicar(e.target.checked)}
              label="Corregir el inventario con lo que contó."
              description="Si no marca esto, la diferencia queda anotada pero el inventario sigue igual."
            />
          )}
        </div>
      </Card>

      <ActionBar
        summary={
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">
                Lleva {completos} de {detalles.length} categorías
              </p>
              {conDiferencia > 0 && <Badge tone="danger">{conDiferencia} con diferencia</Badge>}
            </div>
            <div className="w-56 max-w-full">
              <ProgressBar value={completos} max={detalles.length} label="Avance del arqueo" />
            </div>
            {msg.error && <p className="text-base font-semibold text-danger-700">{msg.error}</p>}
            {msg.ok && !sinGuardar && <p className="text-base font-semibold text-success-700">{msg.ok}</p>}
          </div>
        }
      >
        <Button
          variant="secondary"
          size="lg"
          icon={Save}
          disabled={pendiente}
          loading={pendiente && accion === "guardar"}
          loadingText="Guardando..."
          onClick={() => {
            setAccion("guardar");
            const ahora = foto;
            start(async () => {
              const r = await guardarConteo(input());
              setMsg(r);
              if (!r.error) setGuardado(ahora);
            });
          }}
        >
          Guardar y seguir después
        </Button>
        <Button
          size="lg"
          icon={Lock}
          disabled={pendiente || faltan > 0}
          loading={pendiente && accion === "cerrar"}
          loadingText="Terminando..."
          onClick={() => {
            setAccion("cerrar");
            start(async () => {
              const r = await cerrarArqueo(input(), aplicar);
              if (r?.error) setMsg(r);
            });
          }}
        >
          {faltan > 0 ? `Faltan ${faltan} por revisar` : "Terminar el arqueo"}
        </Button>
      </ActionBar>
    </div>
  );
}

function Totales({ totSis, totCont, parcial }: { totSis: number; totCont: number; parcial?: boolean }) {
  const dif = totCont - totSis;
  return (
    <StatPanel columns={parcial ? 2 : 3}>
      <Stat label="El sistema dice" value={gramos(totSis)} />
      <Stat label={`Usted contó${parcial ? " (hasta ahora)" : ""}`} value={gramos(totCont)} />
      {!parcial && (
        <Stat
          label="Diferencia"
          value={dif === 0 ? "Cuadra ✓" : dif < 0 ? `Faltan ${gramos(-dif)}` : `Sobran ${gramos(dif)}`}
          tone={dif === 0 ? "success" : "danger"}
        />
      )}
    </StatPanel>
  );
}
