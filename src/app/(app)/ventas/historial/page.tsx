import { Receipt } from "lucide-react";
import { db } from "@/lib/db";
import { requirePermiso, getAlcance } from "@/lib/session";
import { aISO } from "@/lib/fechas";
import { cop, METODOS_PAGO, plural, REDES } from "@/lib/format";
import { enlaceCon, filtroFechas, leerPagina, paginar, POR_PAGINA, leerId } from "@/lib/listas";
import { Card, DatePicker, EmptyState, List, PageContainer, PageHeader, Pagination, Select, Stat, StatPanel } from "@/components/ui";
import { FiltrosHistorial } from "@/components/filtros/filtros-historial";
import { VentaFila } from "@/components/ventas/venta-fila";
import { VentasTabla } from "@/components/ventas/ventas-tabla";

type Filtros = {
  q?: string;
  desde?: string;
  hasta?: string;
  metodo?: string;
  vendedor?: string;
  estado?: string;
  canal?: string;
  fe?: string;
  pagina?: string;
};

/** Todas las facturas, sin límite de fechas, con filtros y paginación. */
export default async function HistorialFacturasPage({ searchParams }: { searchParams: Promise<Filtros> }) {
  const sp = await searchParams;
  const s = await requirePermiso("facturas");
  const { localId } = await getAlcance(s);
  const q = sp.q?.trim();

  const where = {
    ...(localId ? { localId } : {}),
    ...(filtroFechas(sp.desde, sp.hasta) ? { fecha: filtroFechas(sp.desde, sp.hasta) } : {}),
    ...(sp.metodo ? { metodoPago: sp.metodo } : {}),
    ...(leerId(sp.vendedor) ? { usuarioId: leerId(sp.vendedor) } : {}),
    ...(sp.estado ? { estado: sp.estado } : {}),
    ...(sp.canal === "TIENDA" ? { canal: "TIENDA" } : sp.canal ? { canal: "REDES", red: sp.canal } : {}),
    ...(sp.fe === "si" ? { facturaElectronica: true } : sp.fe === "no" ? { facturaElectronica: false } : {}),
    ...(q
      ? {
          OR: [
            { numero: { contains: q, mode: "insensitive" as const } },
            { clienteNombre: { contains: q, mode: "insensitive" as const } },
            { clienteDocumento: { contains: q } },
            { alegraNumero: { contains: q } },
          ],
        }
      : {}),
  };

  const [total, resumen, usuarios] = await Promise.all([
    db.venta.count({ where }),
    db.venta.aggregate({ where: { ...where, estado: "ACTIVA" }, _sum: { total: true }, _count: true }),
    db.usuario.findMany({ orderBy: { nombre: "asc" }, ...(localId ? { where: { OR: [{ localId }, { rol: "ADMIN" }] } } : {}) }),
  ]);
  const { paginas, actual, skip, take } = paginar(total, leerPagina(sp.pagina));
  const ventas = await db.venta.findMany({
    where,
    orderBy: { fecha: "desc" },
    skip,
    take,
    include: { local: true, items: { include: { categoria: true } } },
  });

  const filtros = { q, desde: sp.desde, hasta: sp.hasta, metodo: sp.metodo, vendedor: sp.vendedor, estado: sp.estado, canal: sp.canal, fe: sp.fe };
  const masFiltros = !!(sp.desde || sp.hasta || sp.metodo || sp.vendedor || sp.estado || sp.canal || sp.fe);
  const grupo = [{ iso: "todo", titulo: "", total: 0, ventas }];

  return (
    <PageContainer width="fluid">
      <PageHeader
        title="Todas las facturas"
        back={{ href: "/ventas", label: "Volver a Facturas" }}
        help="El historial completo de ventas. Busque por número, cliente o cédula; use “Más filtros” para fechas, forma de pago y más."
      />

      <FiltrosHistorial ruta="/ventas/historial" q={q} placeholder="Número de factura, cliente o cédula" masFiltrosActivos={masFiltros} hayFiltros={!!q || masFiltros}>
        <DatePicker label="Desde" name="desde" defaultValue={sp.desde} max={aISO(new Date())} />
        <DatePicker label="Hasta" name="hasta" defaultValue={sp.hasta} max={aISO(new Date())} />
        <Select
          label="Forma de pago"
          name="metodo"
          defaultValue={sp.metodo ?? ""}
          placeholder="Todas"
          options={Object.entries(METODOS_PAGO).map(([value, label]) => ({ value, label }))}
        />
        <Select label="Quién vendió" name="vendedor" defaultValue={sp.vendedor ?? ""} placeholder="Todos" options={usuarios.map((u) => ({ value: u.id, label: u.nombre }))} />
        <Select
          label="Dónde se vendió"
          name="canal"
          defaultValue={sp.canal ?? ""}
          placeholder="Todos"
          options={[{ value: "TIENDA", label: "En la tienda" }, ...Object.entries(REDES).map(([value, label]) => ({ value, label: `Redes · ${label}` }))]}
        />
        <Select
          label="Estado"
          name="estado"
          defaultValue={sp.estado ?? ""}
          placeholder="Todas"
          options={[
            { value: "ACTIVA", label: "Vigentes" },
            { value: "ANULADA", label: "Anuladas" },
          ]}
        />
        <Select
          label="Factura electrónica"
          name="fe"
          defaultValue={sp.fe ?? ""}
          placeholder="Todas"
          options={[
            { value: "si", label: "Con factura electrónica" },
            { value: "no", label: "Sin factura electrónica" },
          ]}
        />
      </FiltrosHistorial>

      <StatPanel>
        <Stat label="Facturas encontradas" value={total.toLocaleString("es-CO")} detail={total !== resumen._count ? `${plural(total - resumen._count, "anulada", "anuladas")} incluidas` : undefined} />
        <Stat label="Total vendido" value={cop(resumen._sum.total ?? 0)} detail="sin contar las anuladas" />
      </StatPanel>

      <Card>
        {ventas.length === 0 ? (
          <EmptyState icon={Receipt} title="No hay facturas con estos filtros." />
        ) : (
          <>
            <div className="hidden lg:block">
              <VentasTabla grupos={grupo} porDia={false} mostrarLocal={!localId} conFecha />
            </div>
            <div className="lg:hidden">
              <List>
                {ventas.map((v) => (
                  <VentaFila key={v.id} venta={v} mostrarLocal={!localId} />
                ))}
              </List>
            </div>
          </>
        )}
      </Card>

      <Pagination page={actual} pages={paginas} total={total} perPage={POR_PAGINA} href={(n) => enlaceCon("/ventas/historial", { ...filtros, pagina: n })} />
    </PageContainer>
  );
}
