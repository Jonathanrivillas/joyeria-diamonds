import Link from "next/link";
import { ArrowLeftRight, Gem, Pencil, Save } from "lucide-react";
import { db } from "@/lib/db";
import { requireSesion, getAlcance } from "@/lib/session";
import { cop, gramos, fechaHora, plural } from "@/lib/format";
import { asegurarCategoriaJoyas, TIPOS_JOYA } from "@/lib/joyas";
import {
  Alert,
  Card,
  Chip,
  ChipGroup,
  Disclosure,
  EmptyState,
  Icon,
  Input,
  MoneyInput,
  PageContainer,
  PageHeader,
  Select,
  Stat,
  StatPanel,
  SubmitButton,
} from "@/components/ui";
import { JoyaForm } from "./joya-form";
import { editarJoya, moverJoya } from "./actions";

export default async function JoyasPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string; buscar?: string; ok?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const s = await requireSesion();
  const esAdmin = s.rol === "ADMIN";
  const { localId, locales } = await getAlcance(s);
  const cat = await asegurarCategoriaJoyas();
  const vendidas = sp.ver === "vendidas";
  const buscar = (sp.buscar ?? "").trim();

  const [piezas, proveedores, categoriasOrigen] = await Promise.all([
    db.pieza.findMany({
      where: {
        categoriaId: cat.id,
        estado: vendidas ? "VENDIDA" : "DISPONIBLE",
        ...(localId ? { localId } : {}),
        ...(buscar
          ? { OR: [{ codigo: { contains: buscar, mode: "insensitive" } }, { descripcion: { contains: buscar, mode: "insensitive" } }] }
          : {}),
      },
      orderBy: { codigo: "asc" },
      include: { local: true, proveedor: true },
      take: 300,
    }),
    esAdmin ? db.proveedor.findMany({ where: { activo: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }) : [],
    // De dónde puede salir una joya que ya estaba en inventario: las esmeraldas primero.
    esAdmin
      ? db.categoria.findMany({
          where: { esServicio: false, porPieza: false },
          orderBy: { orden: "asc" },
          include: { existencias: { select: { localId: true, pesoCg: true, cantidad: true } } },
        })
      : [],
  ]);
  const origenes = [...categoriasOrigen]
    .filter((c) => c.activa || c.existencias.some((e) => e.cantidad > 0))
    .sort((a, b) => Number(/esmeralda/i.test(b.nombre)) - Number(/esmeralda/i.test(a.nombre)));
  const valorTotal = piezas.reduce((a, p) => a + p.precio, 0);
  const pesoTotal = piezas.reduce((a, p) => a + p.pesoCg, 0);
  const qs = (ver?: string) => `/inventario/joyas${ver ? `?ver=${ver}` : ""}`;

  return (
    <PageContainer width="fluid">
      <PageHeader
        title="Joyas preciosas"
        back={{ href: "/inventario", label: "Volver al inventario" }}
        help="Cada joya preciosa tiene su código y su propio precio. Al vender, se escoge la joya exacta por su código."
      />

      {sp.ok && <Alert tone="success">{sp.ok}</Alert>}
      {sp.error && <Alert tone="danger">{sp.error}</Alert>}

      <div className={esAdmin ? "grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,30rem)_minmax(0,1fr)]" : ""}>
        {esAdmin && (
          <JoyaForm
            locales={locales.map((l) => ({ id: l.id, nombre: l.nombre }))}
            localDefecto={localId ?? locales[0]?.id}
            proveedores={proveedores}
            categoriasOrigen={origenes.map((c) => ({ id: c.id, nombre: c.nombre, existencias: c.existencias }))}
          />
        )}

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ChipGroup>
              <Chip href={qs()} selected={!vendidas}>
                Disponibles
              </Chip>
              <Chip href={qs("vendidas")} selected={vendidas}>
                Vendidas
              </Chip>
            </ChipGroup>
            <form className="w-full sm:w-72">
              {vendidas && <input type="hidden" name="ver" value="vendidas" />}
              <Input label="Buscar por código" hideLabel type="search" name="buscar" defaultValue={buscar} placeholder="Buscar código o descripción…" />
            </form>
          </div>

          {!vendidas && (
            <StatPanel columns={2}>
              <Stat label="Joyas disponibles" value={plural(piezas.length, "joya", "joyas")} detail={gramos(pesoTotal)} />
              <Stat label="Valen (precio de venta)" value={cop(valorTotal)} />
            </StatPanel>
          )}

          <Card>
            {piezas.length === 0 ? (
              <EmptyState icon={Gem} title={buscar ? `No hay joyas con “${buscar}”.` : vendidas ? "Todavía no se ha vendido ninguna." : "No hay joyas preciosas registradas."} />
            ) : (
              <ul className="divide-y divide-neutral-100">
                {piezas.map((p) => (
                  <li key={p.id} className="space-y-3 px-5 py-4">
                    <div className="flex flex-wrap items-start gap-x-4 gap-y-1">
                      <div className="min-w-0 flex-1 basis-56">
                        <p className="font-mono text-lg font-bold">{p.codigo}</p>
                        <p className="text-base">
                          {TIPOS_JOYA[p.tipo] ?? p.tipo}
                          {p.descripcion && ` · ${p.descripcion}`}
                        </p>
                        <p className="text-sm text-neutral-500">
                          {[gramos(p.pesoCg), !localId && p.local.nombre, esAdmin && p.proveedor && `de ${p.proveedor.nombre}`, `registrada ${fechaHora(p.creadaEn)}`]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold tabular-nums">{cop(p.precio)}</p>
                        {esAdmin && (
                          <p className="text-sm text-neutral-500">{p.costo > 0 ? `Costó ${cop(Math.round(p.costo))}` : "Sin costo registrado"}</p>
                        )}
                      </div>
                    </div>

                    {esAdmin && !vendidas && (
                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                        <Disclosure title="Cambiar precio o descripción" icon={Pencil}>
                          <form action={editarJoya} className="space-y-3">
                            <input type="hidden" name="id" value={p.id} />
                            <MoneyInput name="precio" label="Precio de venta" defaultValue={p.precio} />
                            <Input label="Descripción" name="descripcion" defaultValue={p.descripcion} maxLength={120} />
                            <SubmitButton loadingText="Guardando...">
                              <Icon icon={Save} /> Guardar
                            </SubmitButton>
                          </form>
                        </Disclosure>
                        {locales.length > 1 && (
                          <Disclosure title="Mover a otro local" icon={ArrowLeftRight}>
                            <form action={moverJoya} className="space-y-3">
                              <input type="hidden" name="id" value={p.id} />
                              <Select
                                label="¿A cuál local?"
                                name="destinoId"
                                options={locales.filter((l) => l.id !== p.localId).map((l) => ({ value: l.id, label: l.nombre }))}
                              />
                              <SubmitButton variant="secondary" loadingText="Moviendo...">
                                <Icon icon={ArrowLeftRight} /> Mover
                              </SubmitButton>
                            </form>
                          </Disclosure>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {piezas.length === 300 && <p className="text-sm text-neutral-500">Se muestran las primeras 300. Use el buscador para encontrar una joya.</p>}
          {!esAdmin && (
            <p className="text-base text-neutral-500">
              Para vender una joya, vaya a <Link href="/ventas/nueva" className="text-brand-800 underline">Vender</Link> y toque “{cat.nombre}”.
            </p>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
