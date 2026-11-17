"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Banknote, Check, CreditCard, Plus, Search, SearchX, Smartphone, Trash2, Pencil, ShoppingBag, UserPlus } from "lucide-react";
import { publicarLocalVenta } from "@/components/ventas/local-venta";
import { crearVenta } from "../actions";
import { cop, gramos, parseGramos } from "@/lib/format";
import {
  Alert,
  BackLink,
  Button,
  ActionBar,
  Card,
  CardFooter,
  Checkbox,
  ChoiceGrid,
  ChoiceTile,
  Chip,
  ChipGroup,
  EmptyState,
  FormGrid,
  GramsInput,
  Icon,
  Input,
  List,
  LeaveGuard,
  ListItem,
  MoneyInput,
  PageHeader,
  QuantityStepper,
  Section,
  Stepper,
} from "@/components/ui";

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

const piezas = (n: number) => `${n} ${n === 1 ? "pieza" : "piezas"}`;

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

  const [buscar, setBuscar] = useState("");

  // La barra superior muestra el local de esta venta.
  const nombreLocal = locales.find((l) => l.id === localId)?.nombre ?? null;
  useEffect(() => {
    publicarLocalVenta(nombreLocal);
    return () => publicarLocalVenta(null);
  }, [nombreLocal]);

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

  const paso3 = paso === "cobrar" ? 3 : paso === "resumen" ? 2 : 1;
  const agotado = (c: Cat) => {
    const d = disponible(c.id);
    return d.cantidad <= 0 || (c.controlaPeso && d.pesoCg <= 0);
  };
  // Lo disponible primero; lo agotado al final.
  const sinTildes = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const filtro = sinTildes(buscar.trim());
  const categoriasOrden = [...categorias]
    .sort((a, b) => Number(agotado(a)) - Number(agotado(b)))
    .filter((c) => !filtro || sinTildes(c.nombre).includes(filtro));
  const conBuscador = categorias.length > 9;
  const elegirLocal = esAdmin && locales.length > 1;
  const resumenCarrito = (
    <p>
      <span className="font-semibold">{piezas(carrito.length)}</span>
      <span className="text-neutral-500"> · </span>
      <span className="font-bold tabular-nums">{cop(total)}</span>
    </p>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vender"
        back={{ href: "/", label: "Volver al inicio", mobileOnly: true }}
        actions={
          elegirLocal && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-lg font-semibold text-neutral-700">Vendiendo en:</span>
              <ChipGroup>
                {locales.map((l) => (
                  <Chip key={l.id} selected={localId === l.id} disabled={carrito.length > 0} onClick={() => setLocalId(l.id)}>
                    {l.nombre}
                  </Chip>
                ))}
              </ChipGroup>
            </div>
          )
        }
      />
      {elegirLocal && carrito.length > 0 && paso === "elegir" && (
        <p className="-mt-4 text-base text-neutral-500">Para cambiar de local, primero quite las piezas de la venta.</p>
      )}

      <LeaveGuard
        when={carrito.length > 0 && !pendiente}
        title="¿Salir sin terminar la venta?"
        message={`La venta tiene ${piezas(carrito.length)} sin cobrar. Si sale, se pierden.`}
        stayLabel="No, seguir con la venta"
        leaveLabel="Sí, salir"
      />

      <Stepper steps={["Piezas", "Revisar", "Cobrar"]} current={paso3} />

      {error && <Alert tone="danger">{error}</Alert>}

      {/* PASO 1: escoger el tipo de pieza */}
      {paso === "elegir" && (
        <div className="space-y-5">
          <Section
            title="¿Qué va a vender?"
            description="Toque el tipo de pieza."
            action={
              conBuscador && (
                <Input
                  label="Buscar tipo de pieza"
                  hideLabel
                  type="search"
                  value={buscar}
                  onChange={(e) => setBuscar(e.target.value)}
                  placeholder="Buscar tipo de pieza…"
                  prefix={<Icon icon={Search} size="sm" />}
                  className="pl-12"
                  containerClassName="w-full sm:w-80"
                />
              )
            }
          >
            {categoriasOrden.length === 0 && (
              <EmptyState icon={SearchX} title={`No hay ningún tipo de pieza que se llame “${buscar.trim()}”.`}>
                <Button variant="secondary" onClick={() => setBuscar("")}>
                  Ver todos
                </Button>
              </EmptyState>
            )}
            <ChoiceGrid columns={5}>
              {categoriasOrden.map((c) => {
                const d = disponible(c.id);
                return (
                  <ChoiceTile
                    key={c.id}
                    layout="start"
                    disabled={agotado(c)}
                    onClick={() => elegir(c)}
                    title={c.nombre}
                    description={agotado(c) ? "Agotado" : c.controlaPeso ? `Hay ${gramos(d.pesoCg)} · ${d.cantidad} pzs` : `Hay ${d.cantidad} piezas`}
                  />
                );
              })}
            </ChoiceGrid>
          </Section>

          {carrito.length > 0 && (
            <ActionBar summary={resumenCarrito}>
              <Button iconRight={ArrowRight} onClick={() => setPaso("resumen")}>
                Ver la venta
              </Button>
            </ActionBar>
          )}
        </div>
      )}

      {/* PASO 1b: datos de la pieza */}
      {paso === "pieza" && cat && (
        <div className="max-w-4xl">
          <BackLink onClick={() => setPaso("elegir")}>Escoger otro tipo de pieza</BackLink>
          <Card>
            <div className="divide-y divide-neutral-200">
              <div className="p-5 sm:p-6">
                <p className="text-base text-neutral-500">Está vendiendo</p>
                <h2 className="text-2xl font-bold">{cat.nombre}</h2>
                <p className="text-base text-neutral-500">
                  En inventario: {cat.controlaPeso ? `${gramos(disp.pesoCg)} · ` : ""}
                  {disp.cantidad} piezas
                </p>
              </div>

              <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-2">
                {cat.controlaPeso && (
                  <GramsInput
                    label="¿Cuánto pesa? (póngala en la balanza)"
                    value={peso}
                    onChange={setPeso}
                    autoFocus
                    size="xl"
                    error={excedePeso ? `Solo hay ${gramos(disp.pesoCg)} en inventario.` : undefined}
                  />
                )}
                <QuantityStepper
                  label="¿Cuántas piezas?"
                  value={cantidad}
                  onChange={setCantidad}
                  error={excedeCant ? `Solo hay ${disp.cantidad} piezas.` : undefined}
                />
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                {!cambiarPrecio ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-lg">
                      Precio {cat.controlaPeso ? "por gramo" : "por pieza"}: <span className="font-bold">{cop(precio)}</span>
                    </p>
                    <Button variant="secondary" icon={Pencil} onClick={() => setCambiarPrecio(true)}>
                      Cambiar precio
                    </Button>
                  </div>
                ) : (
                  <MoneyInput
                    label={cat.controlaPeso ? "Precio por gramo" : "Precio por pieza"}
                    value={precio}
                    onChange={setPrecio}
                    autoFocus
                    hint={`El precio normal es ${cop(cat.precio)}. Este cambio es solo para esta pieza.`}
                  />
                )}
                <div className="space-y-3">
                  <Checkbox variant="card" label="Cobrar hechura (mano de obra)" checked={conHechura} onChange={(e) => setConHechura(e.target.checked)} />
                  {conHechura && <MoneyInput label="Valor de la hechura" value={hechura} onChange={setHechura} />}
                </div>
                <Input label="Nota sobre la pieza (si quiere)" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej: cadena lazo de 50 cm" />
              </div>

              {/* Cuenta explicada junto al botón que la confirma */}
              <div className="flex flex-wrap items-end justify-between gap-4 rounded-b-2xl bg-neutral-50 p-5 sm:p-6">
                <div>
                  <p className="text-base text-neutral-600">
                    Valor de esta pieza · {cat.controlaPeso ? (pesoValido && peso ? gramos(pesoCg) : "__ g") : cantidad} × {cop(precio)}
                    {conHechura && hechura > 0 && <> + hechura {cop(hechura)}</>}
                  </p>
                  <p className="text-3xl font-bold tabular-nums">{cop(subtotal)}</p>
                </div>
                <Button size="lg" icon={Check} onClick={agregar} disabled={!pesoValido} className="w-full sm:w-auto">
                  Agregar a la venta
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* PASO 2: revisar la venta */}
      {paso === "resumen" && (
        <Section title="La venta lleva:" className="max-w-4xl">
          <Card>
            {carrito.length === 0 ? (
              <EmptyState icon={ShoppingBag} title="No hay piezas. Agregue una." />
            ) : (
              <List>
                {carrito.map((i, n) => {
                  const c = catMap.get(i.categoriaId)!;
                  return (
                    <ListItem
                      key={i.key}
                      leading={
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-lg font-bold text-neutral-800">{n + 1}</span>
                      }
                      title={c.nombre}
                      meta={[c.controlaPeso && gramos(i.pesoCg), piezas(i.cantidad), i.hechura > 0 && `hechura ${cop(i.hechura)}`, i.descripcion]
                        .filter(Boolean)
                        .join(" · ")}
                      end={
                        <div className="flex items-center justify-end gap-2">
                          <p className="text-xl font-bold tabular-nums">{cop(i.subtotal)}</p>
                          <Button
                            variant="ghost"
                            icon={Trash2}
                            aria-label={`Quitar ${c.nombre} de la venta`}
                            title="Quitar de la venta"
                            className="text-neutral-500 hover:bg-danger-50 hover:text-danger-700"
                            onClick={() => setCarrito((c) => c.filter((x) => x.key !== i.key))}
                          />
                        </div>
                      }
                    />
                  );
                })}
              </List>
            )}
            <CardFooter className="flex items-end justify-between">
              <span className="text-lg text-neutral-600">Total {pesoTotal > 0 && `(${gramos(pesoTotal)})`}</span>
              <span className="text-3xl font-bold tabular-nums">{cop(total)}</span>
            </CardFooter>
          </Card>
          <ActionBar>
            <Button variant="secondary" size="lg" icon={Plus} onClick={() => setPaso("elegir")}>
              Agregar otra pieza
            </Button>
            <Button size="lg" iconRight={ArrowRight} disabled={carrito.length === 0} onClick={() => setPaso("cobrar")}>
              Cobrar
            </Button>
          </ActionBar>
        </Section>
      )}

      {/* PASO 3: cobrar */}
      {paso === "cobrar" && (
        <div className="max-w-4xl space-y-5">
          <BackLink onClick={() => setPaso("resumen")}>Volver a la venta</BackLink>
          <Card>
            <div className="divide-y divide-neutral-200">
              <div className="p-6 text-center">
                <p className="text-lg text-neutral-600">Total a cobrar</p>
                <p className="text-4xl font-bold tabular-nums">{cop(total)}</p>
                <p className="mt-1 text-base text-neutral-500">
                  {piezas(carrito.length)}
                  {pesoTotal > 0 && ` · ${gramos(pesoTotal)}`}
                </p>
              </div>

              <div className="space-y-3 p-5 sm:p-6">
                <h2 className="text-xl font-bold text-neutral-800">¿Cómo le pagan?</h2>
                <div className="grid gap-3 sm:grid-cols-3">
                  {METODOS.map((m) => (
                    <ChoiceTile key={m.id} selected={metodo === m.id} onClick={() => setMetodo(m.id)} icon={m.icon} title={m.nombre} className="p-5 text-xl" />
                  ))}
                </div>
              </div>

              {metodo === "EFECTIVO" && (
                <div className="space-y-3 p-5 sm:p-6">
                  <MoneyInput label="¿Con cuánto le pagan? (para calcular el cambio)" value={recibido} onChange={setRecibido} size="xl" />
                  {recibido > 0 &&
                    (recibido >= total ? (
                      <Card tone="success" padding="sm">
                        <div className="text-center">
                          <p className="text-lg text-success-800">Debe devolver</p>
                          <p className="text-3xl font-bold text-success-800 tabular-nums">{cop(recibido - total)}</p>
                        </div>
                      </Card>
                    ) : (
                      <Alert tone="danger">Faltan {cop(total - recibido)}</Alert>
                    ))}
                </div>
              )}

              <div className="p-5 sm:p-6">
                {!verCliente ? (
                  <Button variant="link" icon={UserPlus} className="text-lg" onClick={() => setVerCliente(true)}>
                    Poner el nombre del cliente en la factura (si quiere)
                  </Button>
                ) : (
                  <FormGrid>
                    <Input label="Nombre del cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} autoFocus />
                    <Input label="Cédula" inputMode="numeric" value={documento} onChange={(e) => setDocumento(e.target.value)} />
                    <p className="text-sm text-neutral-500 sm:col-span-2">
                      El nombre y la cédula solo se usan para la factura de esta venta (Ley 1581 de 2012). Pregúntele al cliente si está de acuerdo.
                    </p>
                  </FormGrid>
                )}
              </div>
            </div>
          </Card>

          <ActionBar>
            <Button size="lg" block icon={Check} className="text-xl" disabled={!metodo} loading={pendiente} loadingText="Guardando la venta..." onClick={confirmar}>
              {metodo ? `Confirmar la venta · ${cop(total)}` : "Primero toque la forma de pago"}
            </Button>
          </ActionBar>
        </div>
      )}
    </div>
  );
}
