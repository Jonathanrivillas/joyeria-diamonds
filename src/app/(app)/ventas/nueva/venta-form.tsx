"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Banknote, Check, CreditCard, Plus, Search, SearchX, Smartphone, Trash2, Pencil, ShoppingBag, UserPlus, FileText } from "lucide-react";
import { publicarLocalVenta } from "@/components/ventas/local-venta";
import { crearVenta } from "../actions";
import { cop, gramos, parseGramos, TIPOS_JOYA } from "@/lib/format";
import {
  Alert,
  BackLink,
  Button,
  ActionBar,
  Card,
  CardFooter,
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
  Select,
} from "@/components/ui";

/** esServicio: fabricación o reparación. Se cobra el valor que se escriba y no toca el inventario. */
/** porPieza: joyas preciosas, se escoge la joya exacta por su código y se cobra su precio. */
type Cat = { id: number; nombre: string; controlaPeso: boolean; esServicio: boolean; porPieza?: boolean; precio: number };
type Ex = { localId: number; categoriaId: number; pesoCg: number; cantidad: number };
type Joya = { id: number; codigo: string; tipo: string; descripcion: string; pesoCg: number; precio: number; localId: number; categoriaId: number };
type Item = {
  key: number;
  categoriaId: number;
  descripcion: string;
  pesoCg: number;
  cantidad: number;
  precio: number;
  subtotal: number;
  piezaId?: number;
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

function calcular(c: Cat, pesoCg: number, cantidad: number, precio: number) {
  return c.controlaPeso ? Math.round((pesoCg / 100) * precio) : precio * cantidad;
}

export function VentaForm({
  esAdmin,
  locales,
  localDefecto,
  categorias,
  existencias,
  frase,
  facturaElectronica = false,
  proveedores = [],
  joyas = [],
  precioGramo = 0,
}: {
  /** Precio del gramo de hoy, el que puso el administrador. */
  precioGramo?: number;
  /** Joyas preciosas disponibles en todos los locales (se filtran por el local de la venta). */
  joyas?: Joya[];
  /** Proveedores activos: una transferencia puede llegar a la cuenta de uno de ellos. */
  proveedores?: { id: number; nombre: string }[];
  frase?: React.ReactNode;
  /** Venta con factura electrónica: pide los datos del cliente y la envía a Alegra. */
  facturaElectronica?: boolean;
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
  const [descripcion, setDescripcion] = useState("");
  const [buscarJoya, setBuscarJoya] = useState("");

  // Cobro
  const [metodo, setMetodo] = useState<Metodo | null>(null);
  const [recibido, setRecibido] = useState(0);
  // A qué cuenta llegó la transferencia: null = a la joyería; un id = a ese proveedor.
  const [proveedorId, setProveedorId] = useState<number | null>(null);
  const [verCliente, setVerCliente] = useState(false);
  const [cliente, setCliente] = useState("");
  const [documento, setDocumento] = useState("");
  const facturaE = facturaElectronica;
  const [tipoDoc, setTipoDoc] = useState<"CC" | "NIT" | "CE" | "PP">("CC");
  const [correo, setCorreo] = useState("");
  const facturaLista = !facturaE || (cliente.trim() && documento.trim() && /^\S+@\S+\.\S+$/.test(correo.trim()));
  const [buscar, setBuscar] = useState("");

  const [canal, setCanal] = useState<"TIENDA" | "REDES">("TIENDA");
  const [red, setRed] = useState<"WHATSAPP" | "INSTAGRAM" | "FACEBOOK" | "OTRA" | null>(null);
  const [redOtra, setRedOtra] = useState("");
  const canalListo = canal === "TIENDA" || (red !== null && (red !== "OTRA" || redOtra.trim().length > 0));


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
    setDescripcion("");
    setBuscarJoya("");
    setPaso("pieza");
  }

  /** Joyas preciosas de una categoría que siguen libres en este local (las que ya van en la venta no). */
  const joyasLibres = (categoriaId: number) =>
    joyas.filter((j) => j.categoriaId === categoriaId && j.localId === localId && !carrito.some((i) => i.piezaId === j.id));

  function agregarJoya(j: Joya) {
    setCarrito((c) => [
      ...c,
      {
        key: siguienteKey++,
        categoriaId: j.categoriaId,
        descripcion: [j.codigo, TIPOS_JOYA[j.tipo] ?? j.tipo, j.descripcion].filter(Boolean).join(" · "),
        pesoCg: j.pesoCg,
        cantidad: 1,
        precio: j.precio,
        subtotal: j.precio,
        piezaId: j.id,
      },
    ]);
    setPaso("resumen");
  }

  // ---- Pieza actual ----
  const cat = catId ? catMap.get(catId) : undefined;
  const pesoCg = parseGramos(peso);
  const pesoValido = !cat?.controlaPeso || (!Number.isNaN(pesoCg) && pesoCg > 0);
  const subtotal = cat ? calcular(cat, pesoValido && cat.controlaPeso ? pesoCg : 0, cantidad, precio) : 0;
  const disp = cat ? disponible(cat.id) : { pesoCg: 0, cantidad: 0 };
  const excedePeso = !!cat?.controlaPeso && pesoValido && pesoCg > disp.pesoCg;
  const excedeCant = !cat?.esServicio && cantidad > disp.cantidad;
  const servicioListo = precio > 0 && descripcion.trim().length > 0;

  function agregar() {
    if (!cat) return;
    if (cat.esServicio && !servicioListo) return setError("Escriba cuánto cobra y qué trabajo es.");
    if (!pesoValido) return setError("Escriba cuántos gramos pesa la pieza.");
    if (excedePeso || excedeCant) return setError("No hay suficiente mercancía en el inventario para esta pieza.");
    if (precio <= 0) return setError("El precio no puede ser cero.");
    setCarrito((c) => [
      ...c,
      {
        key: siguienteKey++,
        categoriaId: cat.id,
        descripcion: descripcion.trim(),
        pesoCg: cat.controlaPeso ? pesoCg : 0,
        cantidad,
        precio,
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
        proveedorId: metodo === "TRANSFERENCIA" ? proveedorId : null,
        canal,
        red: canal === "REDES" ? red ?? undefined : undefined,
        redOtra: red === "OTRA" ? redOtra : undefined,
        facturaElectronica: facturaE,
        clienteTipoDoc: facturaE ? tipoDoc : undefined,
        clienteCorreo: facturaE ? correo : undefined,
        items: carrito.map((i) => ({
          categoriaId: i.categoriaId,
          descripcion: i.descripcion,
          pesoCg: i.pesoCg,
          cantidad: i.cantidad,
          precioGramo: i.precio,
          hechura: 0,
          piezaId: i.piezaId,
        })),
      });
      if (r.error) setError(r.error);
      else if (r.id) router.push(`/ventas/${r.id}?nueva=1${metodo === "EFECTIVO" && recibido > total ? `&cambio=${recibido - total}` : ""}`);
    });
  }

  const paso3 = paso === "cobrar" ? 3 : paso === "resumen" ? 2 : 1;
  const agotado = (c: Cat) => {
    if (c.esServicio) return false;
    if (c.porPieza) return joyasLibres(c.id).length === 0;
    const d = disponible(c.id);
    return d.cantidad <= 0 || (c.controlaPeso && d.pesoCg <= 0);
  };
  // Lo que se puede vender va en recuadros; lo agotado, en una línea de texto aparte (se lee mejor que
  // recuadros grises deshabilitados y no le quita espacio a lo que sí hay).
  const sinTildes = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const filtro = sinTildes(buscar.trim());
  const categoriasOrden = categorias.filter((c) => !filtro || sinTildes(c.nombre).includes(filtro));
  const disponibles = categoriasOrden.filter((c) => !agotado(c));
  const agotadas = categoriasOrden.filter((c) => agotado(c));
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
        title={facturaE ? "Venta con factura electrónica" : "Vender"}
        subtitle={precioGramo > 0 ? <>Precio del gramo hoy: <span className="font-bold text-neutral-900">{cop(precioGramo)}</span></> : undefined}
        center={frase}
        back={facturaE ? { href: "/ventas/nueva", label: "Volver a la venta normal" } : undefined}
        actions={
          <>
            {elegirLocal && (
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
            )}
            {!facturaE && (
              <Button href="/ventas/nueva?fe=1" variant="secondary" size="lg" icon={FileText}>
                Facturación electrónica
              </Button>
            )}
          </>
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
              {disponibles.map((c) => {
                const d = disponible(c.id);
                return (
                  <ChoiceTile
                    key={c.id}
                    layout="start"
                    onClick={() => elegir(c)}
                    title={c.nombre}
                    description={c.esServicio ? "Trabajo" : c.porPieza ? `Hay ${piezas(joyasLibres(c.id).length).replace("pieza", "joya")}` : c.controlaPeso ? `Hay ${gramos(d.pesoCg)} · ${d.cantidad} pzs` : `Hay ${d.cantidad} piezas`}
                  />
                );
              })}
            </ChoiceGrid>
            {agotadas.length > 0 && (
              <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-5 py-4">
                <p className="text-base font-semibold text-neutral-700">
                  Agotado en {nombreLocal ?? "este local"} ({agotadas.length})
                </p>
                <p className="mt-1 text-base leading-relaxed text-neutral-600">{agotadas.map((c) => c.nombre).join(" · ")}</p>
              </div>
            )}
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
      {paso === "pieza" && cat?.esServicio && (
        <div className="max-w-4xl">
          <BackLink onClick={() => setPaso("elegir")}>Escoger otro tipo de pieza</BackLink>
          <Card>
            <div className="divide-y divide-neutral-200">
              <div className="p-5 sm:p-6">
                <p className="text-base text-neutral-500">Está cobrando un trabajo</p>
                <h2 className="text-2xl font-bold">{cat.nombre}</h2>
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                <MoneyInput label="¿Cuánto cobra por el trabajo?" value={precio} onChange={setPrecio} autoFocus size="xl" />
                <Input
                  label="¿Qué trabajo es?"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder={cat.nombre.toLowerCase().startsWith("repar") ? "Ej: soldar cadena" : "Ej: anillo de grado en oro"}
                  maxLength={120}
                />
              </div>

              <div className="flex flex-wrap items-end justify-between gap-4 rounded-b-2xl bg-neutral-50 p-5 sm:p-6">
                <div>
                  <p className="text-base text-neutral-600">Valor del trabajo</p>
                  <p className="text-3xl font-bold tabular-nums">{cop(precio)}</p>
                </div>
                <Button size="lg" icon={Check} onClick={agregar} disabled={!servicioListo} className="w-full sm:w-auto">
                  {precio <= 0 ? "Escriba cuánto cobra" : !descripcion.trim() ? "Escriba qué trabajo es" : "Agregar a la venta"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* PASO 1b (joyas preciosas): escoger la joya exacta por su código */}
      {paso === "pieza" && cat?.porPieza && (
        <div className="max-w-4xl space-y-4">
          <BackLink onClick={() => setPaso("elegir")}>Escoger otro tipo de pieza</BackLink>
          <Card>
            <div className="space-y-4 p-5 sm:p-6">
              <div>
                <p className="text-base text-neutral-500">Está vendiendo</p>
                <h2 className="text-2xl font-bold">{cat.nombre}</h2>
                <p className="text-base text-neutral-500">Toque la joya que se lleva el cliente. Cada una tiene su precio.</p>
              </div>
              <Input
                label="Buscar por código"
                hideLabel
                type="search"
                value={buscarJoya}
                onChange={(e) => setBuscarJoya(e.target.value)}
                placeholder="Escriba el código de la etiqueta (ej. JP-0012)…"
                prefix={<Icon icon={Search} size="sm" />}
                className="pl-12"
                autoFocus
              />
            </div>
            {(() => {
              const q = sinTildes(buscarJoya.trim());
              const lista = joyasLibres(cat.id).filter(
                (j) => !q || sinTildes(j.codigo).includes(q) || sinTildes(j.descripcion).includes(q) || sinTildes(TIPOS_JOYA[j.tipo] ?? "").includes(q)
              );
              return lista.length === 0 ? (
                <EmptyState icon={SearchX} title={q ? `No hay ninguna joya con “${buscarJoya.trim()}” en este local.` : "No hay joyas disponibles en este local."} />
              ) : (
                <ul className="divide-y divide-neutral-100 border-t border-neutral-200">
                  {lista.map((j) => (
                    <li key={j.id}>
                      <button
                        type="button"
                        onClick={() => agregarJoya(j)}
                        className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-brand-50 active:scale-[0.99] sm:px-6"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block font-mono text-lg font-bold">{j.codigo}</span>
                          <span className="block text-base text-neutral-600">
                            {[TIPOS_JOYA[j.tipo] ?? j.tipo, j.descripcion, gramos(j.pesoCg)].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <span className="text-xl font-bold tabular-nums">{cop(j.precio)}</span>
                        <Icon icon={Plus} className="text-brand-700" />
                      </button>
                    </li>
                  ))}
                </ul>
              );
            })()}
          </Card>
        </div>
      )}

      {paso === "pieza" && cat && !cat.esServicio && !cat.porPieza && (
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

              <div className="grid grid-cols-1 gap-6 p-5 sm:p-6 md:grid-cols-2">
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
                      {cat.controlaPeso ? "Precio del gramo hoy" : "Precio por pieza"}: <span className="font-bold">{cop(precio)}</span>
                    </p>
                    {/* Solo el administrador cambia el precio; el vendedor vende al precio que él puso. */}
                    {esAdmin ? (
                      <Button variant="secondary" icon={Pencil} onClick={() => setCambiarPrecio(true)}>
                        Cambiar precio
                      </Button>
                    ) : (
                      <span className="text-sm text-neutral-500">Lo pone el administrador</span>
                    )}
                  </div>
                ) : (
                  <MoneyInput
                    label={cat.controlaPeso ? "Precio por gramo" : "Precio por pieza"}
                    value={precio}
                    onChange={setPrecio}
                    autoFocus
                    hint={
                      cat.controlaPeso
                        ? `El gramo hoy está a ${cop(cat.precio)}. Este cambio es solo para esta pieza (por ejemplo, un descuento).`
                        : `El precio normal es ${cop(cat.precio)}. Este cambio es solo para esta pieza.`
                    }
                  />
                )}
                <Input label="Nota sobre la pieza (si quiere)" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej: cadena lazo de 50 cm" />
              </div>

              {/* Cuenta explicada junto al botón que la confirma */}
              <div className="flex flex-wrap items-end justify-between gap-4 rounded-b-2xl bg-neutral-50 p-5 sm:p-6">
                <div>
                  <p className="text-base text-neutral-600">
                    Valor de esta pieza · {cat.controlaPeso ? (pesoValido && peso ? gramos(pesoCg) : "__ g") : cantidad} × {cop(precio)}
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
                      meta={[c.controlaPeso && gramos(i.pesoCg), !c.esServicio && piezas(i.cantidad), i.descripcion]
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
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {METODOS.map((m) => (
                    <ChoiceTile key={m.id} selected={metodo === m.id} onClick={() => setMetodo(m.id)} icon={m.icon} title={m.nombre} className="px-1 py-4 sm:p-5 sm:text-xl [&_span]:text-[0.95rem] sm:[&_span]:text-lg" />
                  ))}
                </div>
              </div>

              {metodo === "TRANSFERENCIA" && proveedores.length > 0 && (
                <div className="space-y-3 p-5 sm:p-6">
                  <h2 className="text-xl font-bold text-neutral-800">¿A qué cuenta llegó la plata?</h2>
                  <ChipGroup>
                    <Chip selected={proveedorId === null} onClick={() => setProveedorId(null)}>
                      A la joyería
                    </Chip>
                    {proveedores.map((p) => (
                      <Chip key={p.id} selected={proveedorId === p.id} onClick={() => setProveedorId(p.id)}>
                        A {p.nombre}
                      </Chip>
                    ))}
                  </ChipGroup>
                  {proveedorId !== null && (
                    <p className="text-base text-neutral-600">
                      La venta es de la joyería; queda anotado que esa plata la tiene {proveedores.find((p) => p.id === proveedorId)?.nombre}.
                    </p>
                  )}
                </div>
              )}

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

              {/* Pregunta secundaria (casi siempre "En la tienda"): va compacta y después del pago. */}
              <div className="space-y-3 p-5 sm:p-6">
                <h2 className="text-lg font-bold text-neutral-800">¿Dónde se hizo la venta?</h2>
                <ChipGroup>
                  <Chip selected={canal === "TIENDA"} onClick={() => setCanal("TIENDA")}>
                    En la tienda
                  </Chip>
                  <Chip selected={canal === "REDES"} onClick={() => setCanal("REDES")}>
                    Por redes
                  </Chip>
                </ChipGroup>
                {canal === "REDES" && (
                  <>
                    <p className="text-base text-neutral-700">¿Por cuál red?</p>
                    <ChipGroup>
                      {([
                        ["WHATSAPP", "WhatsApp"],
                        ["INSTAGRAM", "Instagram"],
                        ["FACEBOOK", "Facebook"],
                        ["OTRA", "Otra"],
                      ] as const).map(([id, nombre]) => (
                        <Chip key={id} selected={red === id} onClick={() => setRed(id)}>
                          {nombre}
                        </Chip>
                      ))}
                    </ChipGroup>
                    {red === "OTRA" && (
                      <Input label="¿Cuál?" value={redOtra} onChange={(e) => setRedOtra(e.target.value)} autoFocus />
                    )}
                  </>
                )}
              </div>

              <div className="space-y-4 p-5 sm:p-6">
                {facturaE && <h2 className="text-xl font-bold text-neutral-800">Datos del cliente para la factura electrónica</h2>}

                {facturaE ? (
                  <FormGrid>
                    <Select
                      label="Tipo de documento"
                      value={tipoDoc}
                      onChange={(e) => setTipoDoc(e.target.value as typeof tipoDoc)}
                      options={[
                        { value: "CC", label: "Cédula de ciudadanía" },
                        { value: "NIT", label: "NIT (empresa)" },
                        { value: "CE", label: "Cédula de extranjería" },
                        { value: "PP", label: "Pasaporte" },
                      ]}
                    />
                    <Input label="Número de documento" inputMode="numeric" value={documento} onChange={(e) => setDocumento(e.target.value)} />
                    <Input label={tipoDoc === "NIT" ? "Nombre de la empresa" : "Nombre completo"} value={cliente} onChange={(e) => setCliente(e.target.value)} />
                    <Input label="Correo (allá le llega la factura)" type="email" inputMode="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />
                    <p className="text-sm text-neutral-500 sm:col-span-2">
                      Estos datos solo se usan para la factura electrónica de esta venta (Ley 1581 de 2012). Pregúntele al cliente si está de acuerdo.
                    </p>
                  </FormGrid>
                ) : !verCliente ? (
                  <Button variant="link" icon={UserPlus} className="text-lg" onClick={() => setVerCliente(true)}>
                    Poner el nombre del cliente en la factura (si quiere)
                  </Button>
                ) : (
                  <FormGrid>
                    <Input label="Nombre del cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} autoFocus />
                    <Input label="Cédula" inputMode="numeric" value={documento} onChange={(e) => setDocumento(e.target.value)} />
                  </FormGrid>
                )}
              </div>
            </div>
          </Card>

          <ActionBar>
            <Button
              size="lg"
              block
              icon={Check}
              className="text-xl"
              disabled={!metodo || !canalListo || !facturaLista}
              loading={pendiente}
              loadingText={facturaE ? "Guardando y enviando la factura electrónica..." : "Guardando la venta..."}
              onClick={confirmar}
            >
              {!metodo
                ? "Primero toque la forma de pago"
                : !canalListo
                  ? "Toque por cuál red se vendió"
                  : !facturaLista
                    ? "Complete los datos de la factura"
                    : `Confirmar la venta · ${cop(total)}`}
            </Button>
          </ActionBar>
        </div>
      )}
    </div>
  );
}
