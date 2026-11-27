import { notFound } from "next/navigation";
import { CalendarRange, Gem, PackagePlus, Pencil, Receipt, Save, Wallet, X } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { aISO, parseFechaISO } from "@/lib/fechas";
import { cop, fecha, fechaHora, gramos, hora, plural, TIPOS_JOYA } from "@/lib/format";
import { enlaceCon, filtroFechas, leerPagina, paginar, POR_PAGINA } from "@/lib/listas";
import {
  Alert,
  Badge,
  Button,
  Card,
  Chip,
  ChipGroup,
  DatePicker,
  Disclosure,
  EmptyState,
  Icon,
  List,
  ListItem,
  PageContainer,
  PageHeader,
  Pagination,
  Stat,
  StatPanel,
  StatusBadge,
  ConfirmButton,
  SubmitButton,
  cn,
} from "@/components/ui";
import { VentaFila } from "@/components/ventas/venta-fila";
import { VentasTabla } from "@/components/ventas/ventas-tabla";
import { alternarProveedor, guardarProveedor } from "../actions";
import { CamposProveedor } from "../campos-proveedor";

type Pestana = "ventas" | "pagos" | "compras" | "joyas";
const PESTANAS: { id: Pestana; nombre: string }[] = [
  { id: "ventas", nombre: "Ventas que le llegaron" },
  { id: "pagos", nombre: "Pagos que le hicimos" },
  { id: "compras", nombre: "Mercancía comprada" },
  { id: "joyas", nombre: "Joyas preciosas" },
];

/** Todo lo de un proveedor: sus datos, sus cifras y, por pestañas, cada venta, pago, compra y joya. */
export default async function ProveedorDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ver?: string; desde?: string; hasta?: string; pagina?: string; ok?: string; error?: string }>;
}) {
  await requireAdmin();
  const id = Number((await params).id);
  const sp = await searchParams;
  if (!Number.isInteger(id) || id <= 0) notFound();
  const p = await db.proveedor.findUnique({ where: { id } });
  if (!p) notFound();

  const ver: Pestana = PESTANAS.some((t) => t.id === sp.ver) ? (sp.ver as Pestana) : "ventas";
  const fechas = filtroFechas(sp.desde, sp.hasta);
  const conFechas = fechas ? { fecha: fechas } : {};
  const enFechas = fechas ? "en estas fechas" : "en total";

  // ---- Cifras (respetan el filtro de fechas) ----
  const [ventas, pagos, compras, joyas] = await Promise.all([
    db.venta.aggregate({ where: { proveedorId: id, estado: "ACTIVA", ...conFechas }, _sum: { total: true }, _count: true }),
    db.gasto.aggregate({ where: { proveedorId: id, estado: "ACTIVO", ...conFechas }, _sum: { monto: true }, _count: true }),
    db.movimiento.aggregate({ where: { proveedorId: id, tipo: "ENTRADA", ...conFechas }, _sum: { costo: true, pesoCg: true }, _count: true }),
    db.pieza.groupBy({ by: ["estado"], where: { proveedorId: id, ...(fechas ? { creadaEn: fechas } : {}) }, _count: true }),
  ]);
  const llego = ventas._sum.total ?? 0;
  const pagado = pagos._sum.monto ?? 0;
  const diferencia = llego - pagado;
  const joyasDisp = joyas.find((j) => j.estado === "DISPONIBLE")?._count ?? 0;
  const joyasVend = joyas.find((j) => j.estado === "VENDIDA")?._count ?? 0;

  // ---- Lista de la pestaña activa, con páginas ----
  const pagina = leerPagina(sp.pagina);
  const base = { ver, desde: sp.desde, hasta: sp.hasta };
  const href = (n: number) => enlaceCon(`/proveedores/${id}`, { ...base, pagina: n });

  let lista: React.ReactNode;
  let pag = { paginas: 1, actual: 1, total: 0 };

  if (ver === "ventas") {
    const where = { proveedorId: id, ...conFechas };
    const total = await db.venta.count({ where });
    const { paginas, actual, skip, take } = paginar(total, pagina);
    pag = { paginas, actual, total };
    const filas = await db.venta.findMany({ where, orderBy: { fecha: "desc" }, skip, take, include: { local: true, items: { include: { categoria: true } } } });
    lista =
      filas.length === 0 ? (
        <EmptyState icon={Receipt} title={`Ninguna venta le ha llegado a ${p.nombre}${fechas ? " en estas fechas" : ""}.`} />
      ) : (
        <>
          <div className="hidden lg:block">
            <VentasTabla grupos={[{ iso: "todo", titulo: "", total: 0, ventas: filas }]} porDia={false} mostrarLocal conFecha />
          </div>
          <div className="lg:hidden">
            <List>
              {filas.map((v) => (
                <VentaFila key={v.id} venta={v} mostrarLocal />
              ))}
            </List>
          </div>
        </>
      );
  } else if (ver === "pagos") {
    const where = { proveedorId: id, ...conFechas };
    const total = await db.gasto.count({ where });
    const { paginas, actual, skip, take } = paginar(total, pagina);
    pag = { paginas, actual, total };
    const filas = await db.gasto.findMany({ where, orderBy: { fecha: "desc" }, skip, take, include: { local: true, usuario: true } });
    lista =
      filas.length === 0 ? (
        <EmptyState icon={Wallet} title={`No hay pagos a ${p.nombre}${fechas ? " en estas fechas" : ""}.`} />
      ) : (
        <List>
          {filas.map((g) => {
            const anulado = g.estado === "ANULADO";
            return (
              <ListItem
                key={g.id}
                href={`/gastos/${g.id}`}
                muted={anulado}
                title={<span className="whitespace-normal">{g.justificacion}</span>}
                meta={[fechaHora(g.fecha), g.local.nombre, g.usuario.nombre].join(" · ")}
                end={
                  <div className="flex flex-col items-end gap-1">
                    <p className={cn("text-lg font-bold tabular-nums", anulado && "text-neutral-500 line-through")}>{cop(g.monto)}</p>
                    {anulado && <Badge tone="danger">Anulado</Badge>}
                  </div>
                }
              />
            );
          })}
        </List>
      );
  } else if (ver === "compras") {
    const where = { proveedorId: id, tipo: "ENTRADA", ...conFechas };
    const total = await db.movimiento.count({ where });
    const { paginas, actual, skip, take } = paginar(total, pagina);
    pag = { paginas, actual, total };
    const filas = await db.movimiento.findMany({ where, orderBy: { fecha: "desc" }, skip, take, include: { categoria: true, local: true } });
    lista =
      filas.length === 0 ? (
        <EmptyState icon={PackagePlus} title={`No se le ha comprado mercancía a ${p.nombre}${fechas ? " en estas fechas" : ""}.`} />
      ) : (
        <ul className="divide-y divide-neutral-100">
          {filas.map((m) => (
            <li key={m.id} className="flex flex-wrap items-start gap-x-6 gap-y-1 px-5 py-4">
              <div className="w-32 shrink-0 tabular-nums">
                <p className="font-semibold">{fecha(m.fecha)}</p>
                <p className="text-sm text-neutral-500">{hora(m.fecha)}</p>
              </div>
              <div className="min-w-0 flex-1 basis-56">
                <p className="font-semibold">{m.categoria.nombre}</p>
                <p className="text-sm text-neutral-500">
                  {m.local.nombre}
                  {m.nota && ` · ${m.nota}`}
                </p>
              </div>
              <div className="text-right tabular-nums">
                <p className="font-bold">{m.costo > 0 ? cop(Math.round(m.costo)) : "Sin precio"}</p>
                <p className="text-sm text-neutral-500">
                  {m.pesoCg > 0 ? gramos(m.pesoCg) : `${m.cantidad} pzs`}
                  {m.costo > 0 && m.pesoCg > 0 && ` · ${cop(Math.round(m.costo / (m.pesoCg / 100)))}/g`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      );
  } else {
    const where = { proveedorId: id, ...(fechas ? { creadaEn: fechas } : {}) };
    const total = await db.pieza.count({ where });
    const { paginas, actual, skip, take } = paginar(total, pagina);
    pag = { paginas, actual, total };
    const filas = await db.pieza.findMany({ where, orderBy: { creadaEn: "desc" }, skip, take, include: { local: true } });
    lista =
      filas.length === 0 ? (
        <EmptyState icon={Gem} title={`No hay joyas preciosas compradas a ${p.nombre}${fechas ? " en estas fechas" : ""}.`} />
      ) : (
        <ul className="divide-y divide-neutral-100">
          {filas.map((j) => (
            <li key={j.id} className="flex flex-wrap items-start gap-x-6 gap-y-1 px-5 py-4">
              <div className="min-w-0 flex-1 basis-56">
                <p className="font-mono text-lg font-bold">{j.codigo}</p>
                <p className="text-base">
                  {TIPOS_JOYA[j.tipo] ?? j.tipo}
                  {j.descripcion && ` · ${j.descripcion}`}
                </p>
                <p className="text-sm text-neutral-500">
                  {gramos(j.pesoCg)} · {j.local.nombre} · registrada {fecha(j.creadaEn)}
                </p>
              </div>
              <div className="text-right tabular-nums">
                <p className="font-bold">Costó {cop(Math.round(j.costo))}</p>
                <p className="text-sm text-neutral-500">Se vende en {cop(j.precio)}</p>
                <Badge tone={j.estado === "VENDIDA" ? "neutral" : "success"}>{j.estado === "VENDIDA" ? "Vendida" : "Disponible"}</Badge>
              </div>
            </li>
          ))}
        </ul>
      );
  }

  return (
    <PageContainer width="fluid" className="space-y-6">
      <PageHeader title={p.nombre} back={{ href: "/proveedores", label: "Volver a Proveedores" }} actions={<StatusBadge status={p.activo ? "HABILITADO" : "INACTIVO"} />} />

      {sp.ok && <Alert tone="success">{sp.ok}</Alert>}
      {sp.error && <Alert tone="danger">{sp.error}</Alert>}

      {(p.documento || p.telefono || p.notas) && (
        <p className="-mt-4 text-base text-neutral-600">
          {[p.documento && `NIT/C.C. ${p.documento}`, p.telefono && `Tel. ${p.telefono}`, p.notas].filter(Boolean).join(" · ")}
        </p>
      )}

      {/* Filtro de fechas: sin fechas = todo el historial del proveedor. */}
      <form action={`/proveedores/${id}`} className="no-print flex flex-wrap items-end gap-3">
        <input type="hidden" name="ver" value={ver} />
        <DatePicker label="Desde" name="desde" defaultValue={sp.desde} max={aISO(new Date())} />
        <DatePicker label="Hasta" name="hasta" defaultValue={sp.hasta} max={aISO(new Date())} />
        <Button type="submit" variant="secondary" icon={CalendarRange}>
          Ver esas fechas
        </Button>
        {fechas && (
          <Button variant="ghost" href={enlaceCon(`/proveedores/${id}`, { ver })} icon={X}>
            Ver todo
          </Button>
        )}
      </form>
      {fechas && (
        <p className="-mt-3 text-base text-neutral-600">
          Mostrando{" "}
          {sp.desde && sp.hasta
            ? `del ${fecha(parseFechaISO(sp.desde))} al ${fecha(parseFechaISO(sp.hasta))}`
            : sp.desde
              ? `desde el ${fecha(parseFechaISO(sp.desde))}`
              : `hasta el ${fecha(parseFechaISO(sp.hasta))}`}
          .
        </p>
      )}

      <StatPanel columns={3}>
        <Stat label="Le llegó de nuestras ventas" value={cop(llego)} detail={`${plural(ventas._count, "venta", "ventas")} ${enFechas}`} />
        <Stat label="Le hemos pagado" value={cop(pagado)} detail={`${plural(pagos._count, "pago", "pagos")} ${enFechas}`} />
        <Stat
          label="Diferencia"
          value={cop(diferencia)}
          tone={diferencia > 0 ? "success" : diferencia < 0 ? "danger" : "neutral"}
          detail="lo que le llegó menos lo pagado"
        />
      </StatPanel>
      <StatPanel columns={2}>
        <Stat
          label="Mercancía que se le compró"
          value={cop(Math.round(compras._sum.costo ?? 0))}
          detail={`${plural(compras._count, "compra", "compras")}${compras._sum.pesoCg ? ` · ${gramos(compras._sum.pesoCg)}` : ""}`}
        />
        <Stat label="Joyas preciosas compradas" value={joyasDisp + joyasVend} detail={`${joyasDisp} disponibles · ${joyasVend} vendidas`} />
      </StatPanel>

      <ChipGroup>
        {PESTANAS.map((t) => (
          <Chip key={t.id} href={enlaceCon(`/proveedores/${id}`, { ver: t.id, desde: sp.desde, hasta: sp.hasta })} selected={ver === t.id}>
            {t.nombre}
          </Chip>
        ))}
      </ChipGroup>

      <Card>{lista}</Card>
      <Pagination page={pag.actual} pages={pag.paginas} total={pag.total} perPage={POR_PAGINA} href={href} />

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
        <Disclosure title="Editar datos del proveedor" icon={Pencil}>
          <form action={guardarProveedor} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CamposProveedor p={p} volver="detalle" />
            <div className="sm:col-span-2">
              <SubmitButton loadingText="Guardando...">
                <Icon icon={Save} /> Guardar cambios
              </SubmitButton>
            </div>
          </form>
        </Disclosure>
        <Card padding="md" className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-base text-neutral-600">
            {p.activo
              ? "Si ya no le compran, desactívelo: deja de aparecer para escoger, pero su historial se conserva."
              : "Este proveedor está inactivo: no aparece para escoger."}
          </p>
          {p.activo ? (
            <ConfirmButton
              action={alternarProveedor}
              fields={{ id: p.id }}
              variant="danger-outline"
              label="Desactivar"
              title={`¿Desactivar a ${p.nombre}?`}
              message="Deja de aparecer para escoger en entradas y gastos. Su historial se conserva y lo puede volver a activar."
              confirmLabel="Sí, desactivar"
            />
          ) : (
            <form action={alternarProveedor}>
              <input type="hidden" name="id" value={p.id} />
              <SubmitButton variant="secondary" loadingText="Un momento...">
                Activar
              </SubmitButton>
            </form>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}
