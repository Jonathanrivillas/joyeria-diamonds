import { History, ShoppingBag, SlidersHorizontal, Search, Receipt } from "lucide-react";
import { puedeVer } from "@/lib/permisos";
import { db } from "@/lib/db";
import { requirePermiso, getAlcance } from "@/lib/session";
import { aISO, finDia, inicioDia, parseFechaISO, sumarDias } from "@/lib/fechas";
import { cop, fecha, fechaLarga, gramos, METODOS_PAGO, plural } from "@/lib/format";
import { rangoActivo, rangosRapidos } from "@/lib/rangos";
import {
  Button,
  Card,
  DatePicker,
  Disclosure,
  EmptyState,
  FormGrid,
  Icon,
  Input,
  List,
  PageContainer,
  PageHeader,
  RemovableChip,
  Select,
  Stat,
  StatPanel,
} from "@/components/ui";
import { RangoFechas } from "@/components/filtros/rango-fechas";
import { VentaFila } from "@/components/ventas/venta-fila";
import { VentasTabla } from "@/components/ventas/ventas-tabla";

const ESTADOS: Record<string, string> = { ACTIVA: "Vigentes", ANULADA: "Anuladas" };
const LIMITE = 500;

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; metodo?: string; vendedor?: string; q?: string; estado?: string }>;
}) {
  const sp = await searchParams;
  const s = await requirePermiso("facturas");
  const { localId } = await getAlcance(s);
  const hoy = inicioDia(new Date());
  const desde = sp.desde ? parseFechaISO(sp.desde) : hoy;
  const hasta = sp.hasta ? parseFechaISO(sp.hasta) : hoy;

  const where = {
    ...(localId ? { localId } : {}),
    fecha: { gte: inicioDia(desde), lte: finDia(hasta) },
    ...(sp.metodo ? { metodoPago: sp.metodo } : {}),
    ...(sp.vendedor ? { usuarioId: Number(sp.vendedor) } : {}),
    ...(sp.estado ? { estado: sp.estado } : {}),
    ...(sp.q
      ? {
          OR: [{ numero: { contains: sp.q, mode: "insensitive" as const } }, { clienteNombre: { contains: sp.q, mode: "insensitive" as const } }],
        }
      : {}),
  };

  const [ventas, usuarios] = await Promise.all([
    db.venta.findMany({
      where,
      orderBy: { fecha: "desc" },
      take: LIMITE,
      include: { local: true, usuario: true, items: { include: { categoria: true } } },
    }),
    db.usuario.findMany({ orderBy: { nombre: "asc" }, ...(localId ? { where: { OR: [{ localId }, { rol: "ADMIN" }] } } : {}) }),
  ]);
  const activas = ventas.filter((v) => v.estado === "ACTIVA");
  const anuladas = ventas.length - activas.length;
  const total = activas.reduce((a, v) => a + v.total, 0);
  const peso = activas.reduce((a, v) => a + v.items.reduce((b, i) => b + i.pesoCg, 0), 0);

  // ---- Filtros: enlaces que conservan lo demás ----
  const actuales = { desde: aISO(desde), hasta: aISO(hasta), q: sp.q, metodo: sp.metodo, vendedor: sp.vendedor, estado: sp.estado };
  const enlace = (cambios: Partial<typeof actuales>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...actuales, ...cambios })) if (v) p.set(k, v);
    return `/ventas?${p}`;
  };
  const otrosFiltros = new URLSearchParams(
    Object.entries({ q: sp.q, metodo: sp.metodo, vendedor: sp.vendedor, estado: sp.estado }).filter((e): e is [string, string] => !!e[1]),
  ).toString();

  const rangos = rangosRapidos(hoy);
  const activo = rangoActivo(rangos, desde, hasta)?.etiqueta;
  const vendedor = usuarios.find((u) => String(u.id) === sp.vendedor);
  const filtrosActivos = [
    !activo && {
      texto: aISO(desde) === aISO(hasta) ? `Fecha: ${fecha(desde)}` : `Fechas: ${fecha(desde)} – ${fecha(hasta)}`,
      href: enlace({ desde: undefined, hasta: undefined }),
    },
    sp.q && { texto: `Búsqueda: “${sp.q}”`, href: enlace({ q: undefined }) },
    sp.metodo && { texto: METODOS_PAGO[sp.metodo] ?? sp.metodo, href: enlace({ metodo: undefined }) },
    vendedor && { texto: `Vendió: ${vendedor.nombre}`, href: enlace({ vendedor: undefined }) },
    sp.estado && { texto: ESTADOS[sp.estado] ?? sp.estado, href: enlace({ estado: undefined }) },
  ].filter((f): f is { texto: string; href: string } => !!f);

  // ---- Agrupar por día cuando se ven varios días ----
  const variosDias = aISO(desde) !== aISO(hasta);
  const ayer = aISO(sumarDias(hoy, -1));
  const nombreDia = (iso: string, d: Date) => (iso === aISO(hoy) ? "Hoy" : iso === ayer ? "Ayer" : fechaLarga(d));
  const grupos: { iso: string; titulo: string; total: number; ventas: typeof ventas }[] = [];
  for (const v of ventas) {
    const iso = variosDias ? aISO(v.fecha) : "todo";
    let g = grupos.at(-1);
    if (!g || g.iso !== iso) {
      g = { iso, titulo: nombreDia(iso, v.fecha), total: 0, ventas: [] };
      grupos.push(g);
    }
    g.ventas.push(v);
    if (v.estado === "ACTIVA") g.total += v.total;
  }

  return (
    <PageContainer width="fluid">
      <PageHeader
        title="Facturas"
        help="Aquí están las ventas ya hechas. Toque una para verla, imprimirla o anularla."
        actions={
          <>
            <Button href="/ventas/historial" variant="secondary" size="lg" icon={History}>
              Ver todas
            </Button>
            {puedeVer(s, "vender") && (
              <Button href="/ventas/nueva" size="lg" icon={ShoppingBag}>
                Nueva venta
              </Button>
            )}
          </>
        }
      />

      <form action="/ventas" className="no-print space-y-3">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="flex flex-wrap items-end gap-3">
            <Input
              label="Buscar una factura"
              hideLabel
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Número de factura o nombre del cliente"
              prefix={<Icon icon={Search} size="sm" />}
              className="pl-12"
              containerClassName="min-w-[16rem] flex-1"
            />
            <Button type="submit">Buscar</Button>
          </div>

          <RangoFechas
            ruta="/ventas"
            rangos={rangos}
            activo={activo}
            desde={aISO(desde)}
            hasta={aISO(hasta)}
            max={aISO(hoy)}
            personalizado={false}
            conservar={otrosFiltros}
          />
        </div>

        <Disclosure title="Más filtros: fechas, forma de pago, vendedor" icon={SlidersHorizontal}>
          <FormGrid columns={3} className="xl:grid-cols-5">
            <DatePicker label="Desde" name="desde" defaultValue={aISO(desde)} max={aISO(hoy)} />
            <DatePicker label="Hasta" name="hasta" defaultValue={aISO(hasta)} max={aISO(hoy)} />
            <Select
              label="Forma de pago"
              name="metodo"
              defaultValue={sp.metodo ?? ""}
              placeholder="Todas"
              options={Object.entries(METODOS_PAGO).map(([k, v]) => ({ value: k, label: v }))}
            />
            <Select
              label="Quién vendió"
              name="vendedor"
              defaultValue={sp.vendedor ?? ""}
              placeholder="Todos"
              options={usuarios.map((u) => ({ value: u.id, label: u.nombre }))}
            />
            <Select
              label="Estado"
              name="estado"
              defaultValue={sp.estado ?? ""}
              placeholder="Todas"
              options={Object.entries(ESTADOS).map(([value, label]) => ({ value, label }))}
            />
          </FormGrid>
          <Button type="submit" icon={Search} className="mt-4">
            Aplicar filtros
          </Button>
        </Disclosure>

        {filtrosActivos.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {filtrosActivos.map((f) => (
              <RemovableChip key={f.texto} href={f.href}>
                {f.texto}
              </RemovableChip>
            ))}
            {filtrosActivos.length > 1 && (
              <Button variant="link" href="/ventas">
                Quitar todos
              </Button>
            )}
          </div>
        )}
      </form>

      <StatPanel>
        <Stat label="Facturas" value={activas.length} detail={anuladas > 0 ? `sin contar ${plural(anuladas, "anulada", "anuladas")}` : undefined} />
        <Stat label="Total vendido" value={cop(total)} />
        <Stat label="Peso vendido" value={gramos(peso)} />
      </StatPanel>

      <Card>
        {ventas.length === 0 ? (
          otrosFiltros ? (
            <EmptyState icon={Receipt} title="No hay facturas con estos filtros.">
              <Button variant="secondary" href="/ventas">
                Quitar los filtros
              </Button>
            </EmptyState>
          ) : (
            <EmptyState icon={Receipt} title="No hay facturas en estas fechas.">
              <Button href="/ventas/nueva" icon={ShoppingBag}>
                Hacer una venta
              </Button>
            </EmptyState>
          )
        ) : (
          <>
            <div className="hidden lg:block">
              <VentasTabla grupos={grupos} porDia={variosDias} mostrarLocal={!localId} />
            </div>
            <div className="lg:hidden">
              {grupos.map((g, i) => (
                <section key={g.iso} aria-label={variosDias ? g.titulo : undefined} className={i > 0 ? "border-t border-neutral-200" : undefined}>
                  {variosDias && (
                    <div className={`flex items-baseline justify-between gap-3 bg-neutral-50 px-5 py-3 ${i === 0 ? "rounded-t-2xl" : ""}`}>
                      <h2 className="text-base font-bold text-neutral-800">{g.titulo}</h2>
                      <p className="text-base font-semibold tabular-nums text-neutral-600">{cop(g.total)}</p>
                    </div>
                  )}
                  <List>
                    {g.ventas.map((v) => (
                      <VentaFila key={v.id} venta={v} mostrarLocal={!localId} soloHora={variosDias} />
                    ))}
                  </List>
                </section>
              ))}
            </div>
          </>
        )}
      </Card>

      {ventas.length === LIMITE && (
        <p className="text-center text-base text-neutral-500">
          Se muestran las {LIMITE} facturas más recientes.{" "}
          <Button variant="link" href="/ventas/historial">
            Ver todas, con páginas
          </Button>
        </p>
      )}
    </PageContainer>
  );
}
