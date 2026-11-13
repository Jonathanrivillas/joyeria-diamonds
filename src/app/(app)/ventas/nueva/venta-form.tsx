"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Check,
  CreditCard,
  Plus,
  Smartphone,
  Trash2,
  Pencil,
  ShoppingBag,
} from "lucide-react";
import { crearVenta } from "../actions";
import { cop, gramos, parseGramos } from "@/lib/format";
import { Aviso } from "@/components/ui";
import { CampoDinero, CampoGramos, Contador } from "@/components/campos";

type Cat = { id: number; nombre: string; controlaPeso: boolean; precio: number };
type Ex = { localId: number; categoriaId: number; pesoCg: number; cantidad: number };
type Item = {
  key: number;
  categoriaId: number;
  descripcion: string;
  pesoCg: number;
  cantidad: number;
  precio: number;
  hechura: number;
  subtotal: number;
};
type Paso = "elegir" | "pieza" | "resumen" | "cobrar";
type Metodo = "EFECTIVO" | "TRANSFERENCIA" | "TARJETA";

const METODOS: { id: Metodo; nombre: string; icon: typeof Banknote }[] = [
  { id: "EFECTIVO", nombre: "Efectivo", icon: Banknote },
  { id: "TRANSFERENCIA", nombre: "Transferencia", icon: Smartphone },
  { id: "TARJETA", nombre: "Tarjeta", icon: CreditCard },
];

let siguienteKey = 1;

function calcular(c: Cat, pesoCg: number, cantidad: number, precio: number, hechura: number) {
  return c.controlaPeso ? Math.round((pesoCg / 100) * precio) + hechura : precio * cantidad + hechura;
}

export function VentaForm({
  esAdmin,
  locales,
  localDefecto,
  categorias,
  existencias,
}: {
  esAdmin: boolean;
  locales: { id: number; nombre: string }[];
  localDefecto: number | null;
  categorias: Cat[];
  existencias: Ex[];
}) {
  const router = useRouter();
  const [pendiente, start] = useTransition();
  const [error, setError] = useState<string>();
  const [paso, setPaso] = useState<Paso>("elegir");
  const [localId, setLocalId] = useState<number | null>(localDefecto);
  const [carrito, setCarrito] = useState<Item[]>([]);

  // Pieza en edición
  const [catId, setCatId] = useState<number | null>(null);
  const [peso, setPeso] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [precio, setPrecio] = useState(0);
  const [cambiarPrecio, setCambiarPrecio] = useState(false);
  const [conHechura, setConHechura] = useState(false);
  const [hechura, setHechura] = useState(0);
  const [descripcion, setDescripcion] = useState("");

  // Cobro
  const [metodo, setMetodo] = useState<Metodo | null>(null);
  const [recibido, setRecibido] = useState(0);
  const [verCliente, setVerCliente] = useState(false);
  const [cliente, setCliente] = useState("");
  const [documento, setDocumento] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setError(undefined);
  }, [paso]);

  const catMap = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias]);

  /** Lo disponible en el local, descontando lo que ya va en esta venta. */
  const disponible = (id: number) => {
    const ex = existencias.find((e) => e.localId === localId && e.categoriaId === id);
    const enCarrito = carrito.filter((i) => i.categoriaId === id);
    return {
      pesoCg: (ex?.pesoCg ?? 0) - enCarrito.reduce((a, i) => a + i.pesoCg, 0),
      cantidad: (ex?.cantidad ?? 0) - enCarrito.reduce((a, i) => a + i.cantidad, 0),
    };
  };

  const total = carrito.reduce((a, i) => a + i.subtotal, 0);
  const pesoTotal = carrito.reduce((a, i) => a + i.pesoCg, 0);

  function elegir(c: Cat) {
    setCatId(c.id);
    setPeso("");
    setCantidad(1);
    setPrecio(c.precio);
    setCambiarPrecio(false);
    setConHechura(false);
    setHechura(0);
    setDescripcion("");
    setPaso("pieza");
  }

  // ---- Pieza actual ----
  const cat = catId ? catMap.get(catId) : undefined;
  const pesoCg = parseGramos(peso);
  const pesoValido = !cat?.controlaPeso || (!Number.isNaN(pesoCg) && pesoCg > 0);
  const subtotal = cat ? calcular(cat, pesoValido && cat.controlaPeso ? pesoCg : 0, cantidad, precio, conHechura ? hechura : 0) : 0;
  const disp = cat ? disponible(cat.id) : { pesoCg: 0, cantidad: 0 };
  const excedePeso = !!cat?.controlaPeso && pesoValido && pesoCg > disp.pesoCg;
  const excedeCant = cantidad > disp.cantidad;

  function agregar() {
    if (!cat) return;
    if (!pesoValido) return setError("Escriba cuántos gramos pesa la pieza.");
    if (excedePeso || excedeCant) return setError("No hay suficiente mercancía en el inventario para esta pieza.");
    if (precio <= 0) return setError("El precio no puede ser cero.");
    setCarrito((c) => [
      ...c,
      {
        key: siguienteKey++,
        categoriaId: cat.id,
        descripcion,
        pesoCg: cat.controlaPeso ? pesoCg : 0,
        cantidad,
        precio,
        hechura: conHechura ? hechura : 0,
        subtotal,
      },
    ]);
    setPaso("resumen");
  }

  function confirmar() {
    if (!metodo) return setError("Toque la forma de pago.");
    start(async () => {
      const r = await crearVenta({
        localId,
        clienteNombre: cliente,
        clienteDocumento: documento,
        metodoPago: metodo,
        items: carrito.map((i) => ({
          categoriaId: i.categoriaId,
          descripcion: i.descripcion,
          pesoCg: i.pesoCg,
          cantidad: i.cantidad,
          precioGramo: i.precio,
          hechura: i.hechura,
        })),
      });
      if (r.error) setError(r.error);
      else if (r.id) router.push(`/ventas/${r.id}?nueva=1${metodo === "EFECTIVO" && recibido > total ? `&cambio=${recibido - total}` : ""}`);
    });
  }

  const pasoNum = paso === "cobrar" ? 2 : 1;

  return (
    <div className="mx-auto max-w-4xl">
      {/* Indicador de pasos */}
      <ol className="mb-6 flex items-center gap-3 text-base font-semibold">
        {["Escoger las piezas", "Cobrar"].map((t, i) => (
          <li key={t} className="flex items-center gap-3">
            <span
              className={clsx(
                "flex h-9 w-9 items-center justify-center rounded-full text-lg",
                pasoNum > i + 1 ? "bg-emerald-600 text-white" : pasoNum === i + 1 ? "bg-oro-700 text-white" : "bg-stone-200 text-stone-500"
              )}
            >
              {pasoNum > i + 1 ? <Check className="h-5 w-5" /> : i + 1}
            </span>
            <span className={pasoNum === i + 1 ? "text-stone-900" : "text-stone-400"}>{t}</span>
            {i === 0 && <span className="h-0.5 w-8 bg-stone-300" />}
          </li>
        ))}
      </ol>

      {error && (
        <div className="mb-4">
          <Aviso tipo="error">{error}</Aviso>
        </div>
      )}

      {/* PASO: elegir categoría */}
      {paso === "elegir" && (
        <div className="space-y-5">
          {esAdmin && (
            <div className="card p-5">
              <label className="label">¿En qué local está vendiendo?</label>
              <div className="flex flex-wrap gap-3">
                {locales.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    disabled={carrito.length > 0}
                    onClick={() => setLocalId(l.id)}
                    className={clsx("btn", localId === l.id ? "bg-oro-700 text-white" : "border-2 border-stone-300 bg-white")}
                  >
                    {localId === l.id && <Check className="h-5 w-5" />} {l.nombre}
                  </button>
                ))}
              </div>
              {carrito.length > 0 && <p className="ayuda">Para cambiar de local, primero quite las piezas de la venta.</p>}
            </div>
          )}

          <div>
            <h2 className="text-2xl font-bold">¿Qué va a vender?</h2>
            <p className="text-lg text-stone-600">Toque el tipo de pieza.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {categorias.map((c) => {
              const d = disponible(c.id);
              const agotado = d.cantidad <= 0 || (c.controlaPeso && d.pesoCg <= 0);
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={agotado}
                  onClick={() => elegir(c)}
                  className="flex min-h-[6rem] flex-col items-start justify-between rounded-2xl border-2 border-stone-200 bg-white p-4 text-left shadow-sm transition hover:border-oro-500 hover:bg-oro-50 active:scale-[0.98] disabled:opacity-40"
                >
                  <span className="text-lg font-bold leading-tight">{c.nombre}</span>
                  <span className="mt-2 text-sm text-stone-500">
                    {agotado ? "Agotado" : c.controlaPeso ? `Hay ${gramos(d.pesoCg)} · ${d.cantidad} pzs` : `Hay ${d.cantidad} piezas`}
                  </span>
                </button>
              );
            })}
          </div>
          {carrito.length > 0 && (
            <div className="sticky bottom-24 lg:bottom-4">
              <button type="button" className="btn-primary btn-grande w-full shadow-lg" onClick={() => setPaso("resumen")}>
                <ShoppingBag className="h-6 w-6" /> Volver a la venta ({carrito.length} {carrito.length === 1 ? "pieza" : "piezas"} · {cop(total)})
              </button>
            </div>
          )}
        </div>
      )}

      {/* PASO: datos de la pieza */}
      {paso === "pieza" && cat && (
        <div className="space-y-5">
          <button type="button" className="inline-flex items-center gap-2 text-lg font-medium text-oro-800 hover:underline" onClick={() => setPaso("elegir")}>
            <ArrowLeft className="h-5 w-5" /> Escoger otro tipo de pieza
          </button>
          <div className="card space-y-6 p-6">
            <div>
              <p className="text-base text-stone-500">Está vendiendo</p>
              <h2 className="text-2xl font-bold">{cat.nombre}</h2>
              <p className="text-base text-stone-500">
                En inventario: {cat.controlaPeso ? `${gramos(disp.pesoCg)} · ` : ""}
                {disp.cantidad} piezas
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {cat.controlaPeso && (
                <div>
                  <CampoGramos label="¿Cuánto pesa? (póngala en la balanza)" value={peso} onChange={setPeso} autoFocus grande />
                  {excedePeso && <p className="mt-1 font-semibold text-red-700">Solo hay {gramos(disp.pesoCg)} en inventario.</p>}
                </div>
              )}
              <div>
                <Contador label="¿Cuántas piezas?" value={cantidad} onChange={setCantidad} />
                {excedeCant && <p className="mt-1 font-semibold text-red-700">Solo hay {disp.cantidad} piezas.</p>}
              </div>
            </div>

            <div className="rounded-xl bg-stone-50 p-4">
              {!cambiarPrecio ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-lg">
                    Precio {cat.controlaPeso ? "por gramo" : "por pieza"}: <span className="font-bold">{cop(precio)}</span>
                  </p>
                  <button type="button" className="btn-secondary" onClick={() => setCambiarPrecio(true)}>
                    <Pencil className="h-5 w-5" /> Cambiar precio
                  </button>
                </div>
              ) : (
                <CampoDinero
                  label={cat.controlaPeso ? "Precio por gramo" : "Precio por pieza"}
                  value={precio}
                  onChange={setPrecio}
                  autoFocus
                  ayuda={`El precio normal es ${cop(cat.precio)}. Este cambio es solo para esta pieza.`}
                />
              )}
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setConHechura((v) => !v)}
                className={clsx("btn w-full justify-start border-2 sm:w-auto", conHechura ? "border-oro-600 bg-oro-50 text-oro-900" : "border-stone-300 bg-white")}
              >
                <span className={clsx("flex h-6 w-6 items-center justify-center rounded-md border-2", conHechura ? "border-oro-700 bg-oro-700 text-white" : "border-stone-400")}>
                  {conHechura && <Check className="h-4 w-4" />}
                </span>
                Cobrar hechura (mano de obra)
              </button>
              {conHechura && <CampoDinero label="Valor de la hechura" value={hechura} onChange={setHechura} />}
            </div>

            <div>
              <label className="label">Nota sobre la pieza (si quiere)</label>
              <input className="input" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej: cadena lazo de 50 cm" />
            </div>

            {/* Cuenta explicada */}
            <div className="rounded-xl border-2 border-oro-200 bg-oro-50 p-5">
              {cat.controlaPeso ? (
                <p className="text-lg text-stone-700">
                  {pesoValido && peso ? gramos(pesoCg) : "__ g"} × {cop(precio)}
                  {conHechura && hechura > 0 && <> + hechura {cop(hechura)}</>}
                </p>
              ) : (
                <p className="text-lg text-stone-700">
                  {cantidad} × {cop(precio)}
                  {conHechura && hechura > 0 && <> + hechura {cop(hechura)}</>}
                </p>
              )}
              <p className="mt-1 text-base text-stone-600">Valor de esta pieza:</p>
              <p className="text-3xl font-bold text-oro-800 tabular-nums">{cop(subtotal)}</p>
            </div>

            <button type="button" className="btn-primary btn-grande w-full" onClick={agregar} disabled={!pesoValido}>
              <Check className="h-6 w-6" /> Agregar a la venta
            </button>
          </div>
        </div>
      )}

      {/* PASO: resumen de la venta */}
      {paso === "resumen" && (
        <div className="space-y-5">
          <h2 className="text-2xl font-bold">La venta lleva:</h2>
          <div className="card divide-y divide-stone-100">
            {carrito.map((i, n) => {
              const c = catMap.get(i.categoriaId)!;
              return (
                <div key={i.key} className="flex flex-wrap items-center gap-4 p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-oro-100 text-lg font-bold text-oro-800">{n + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xl font-bold">{c.nombre}</p>
                    <p className="text-base text-stone-600">
                      {c.controlaPeso ? `${gramos(i.pesoCg)} · ` : ""}
                      {i.cantidad} {i.cantidad === 1 ? "pieza" : "piezas"}
                      {i.hechura > 0 && ` · hechura ${cop(i.hechura)}`}
                      {i.descripcion && ` · ${i.descripcion}`}
                    </p>
                  </div>
                  <p className="text-xl font-bold tabular-nums">{cop(i.subtotal)}</p>
                  <button type="button" className="btn-secondary text-red-700" onClick={() => setCarrito((c) => c.filter((x) => x.key !== i.key))}>
                    <Trash2 className="h-5 w-5" /> Quitar
                  </button>
                </div>
              );
            })}
            {carrito.length === 0 && <p className="p-8 text-center text-lg text-stone-500">No hay piezas. Agregue una.</p>}
            <div className="flex items-end justify-between bg-stone-50 p-5">
              <span className="text-lg text-stone-600">
                Total {pesoTotal > 0 && `(${gramos(pesoTotal)})`}
              </span>
              <span className="text-3xl font-bold text-oro-800 tabular-nums">{cop(total)}</span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" className="btn-secondary btn-grande" onClick={() => setPaso("elegir")}>
              <Plus className="h-6 w-6" /> Agregar otra pieza
            </button>
            <button type="button" className="btn-primary btn-grande" disabled={carrito.length === 0} onClick={() => setPaso("cobrar")}>
              Cobrar <ArrowRight className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}

      {/* PASO: cobrar */}
      {paso === "cobrar" && (
        <div className="space-y-5">
          <button type="button" className="inline-flex items-center gap-2 text-lg font-medium text-oro-800 hover:underline" onClick={() => setPaso("resumen")}>
            <ArrowLeft className="h-5 w-5" /> Volver a la venta
          </button>
          <div className="card p-6 text-center">
            <p className="text-lg text-stone-600">Total a cobrar</p>
            <p className="text-4xl font-bold text-oro-800 tabular-nums">{cop(total)}</p>
            <p className="mt-1 text-base text-stone-500">
              {carrito.length} {carrito.length === 1 ? "pieza" : "piezas"}
              {pesoTotal > 0 && ` · ${gramos(pesoTotal)}`}
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-2xl font-bold">¿Cómo le pagan?</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {METODOS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMetodo(m.id)}
                  className={clsx(
                    "flex flex-col items-center gap-2 rounded-2xl border-2 p-5 text-xl font-bold transition active:scale-[0.98]",
                    metodo === m.id ? "border-oro-700 bg-oro-700 text-white shadow-md" : "border-stone-200 bg-white hover:border-oro-500"
                  )}
                >
                  <m.icon className="h-10 w-10" />
                  {m.nombre}
                </button>
              ))}
            </div>
          </div>

          {metodo === "EFECTIVO" && (
            <div className="card space-y-3 p-5">
              <CampoDinero label="¿Con cuánto le pagan? (para calcular el cambio)" value={recibido} onChange={setRecibido} grande />
              {recibido > 0 &&
                (recibido >= total ? (
                  <div className="rounded-xl bg-emerald-50 p-4 text-center">
                    <p className="text-lg text-emerald-800">Debe devolver</p>
                    <p className="text-3xl font-bold text-emerald-800 tabular-nums">{cop(recibido - total)}</p>
                  </div>
                ) : (
                  <p className="rounded-xl bg-red-50 p-4 text-center text-lg font-semibold text-red-700">
                    Faltan {cop(total - recibido)}
                  </p>
                ))}
            </div>
          )}

          <div className="card p-5">
            {!verCliente ? (
              <button type="button" className="text-lg font-medium text-oro-800 hover:underline" onClick={() => setVerCliente(true)}>
                + Poner el nombre del cliente en la factura (si quiere)
              </button>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Nombre del cliente</label>
                  <input className="input" value={cliente} onChange={(e) => setCliente(e.target.value)} autoFocus />
                </div>
                <div>
                  <label className="label">Cédula</label>
                  <input className="input" inputMode="numeric" value={documento} onChange={(e) => setDocumento(e.target.value)} />
                </div>
                <p className="ayuda sm:col-span-2">
                  El nombre y la cédula solo se usan para la factura de esta venta (Ley 1581 de 2012).
                  Pregúntele al cliente si está de acuerdo.
                </p>
              </div>
            )}
          </div>

          <button type="button" className="btn-primary btn-grande w-full text-xl" disabled={!metodo || pendiente} onClick={confirmar}>
            <Check className="h-7 w-7" />
            {pendiente ? "Guardando la venta..." : metodo ? "Confirmar la venta" : "Primero toque la forma de pago"}
          </button>
        </div>
      )}
    </div>
  );
}
