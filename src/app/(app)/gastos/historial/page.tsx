import Link from "next/link";
import { ChevronRight, Paperclip, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { requirePermiso, getAlcance } from "@/lib/session";
import { aISO } from "@/lib/fechas";
import { cop, fecha, hora, plural, TIPOS_GASTO } from "@/lib/format";
import { enlaceCon, filtroFechas, leerPagina, paginar, POR_PAGINA } from "@/lib/listas";
import {
  Badge,
  Card,
  DatePicker,
  EmptyState,
  Icon,
  IconBadge,
  List,
  ListItem,
  PageContainer,
  PageHeader,
  Pagination,
  Select,
  Stat,
  StatPanel,
  Table,
  Td,
  Th,
  Tr,
  cn,
} from "@/components/ui";
import { FiltrosHistorial } from "@/components/filtros/filtros-historial";
import { GRUPOS_GASTO, iconoGasto } from "@/components/gastos/tipos-gasto";

type Filtros = { q?: string; desde?: string; hasta?: string; tipo?: string; proveedor?: string; usuario?: string; estado?: string; pagina?: string };

/** Todos los gastos, sin límite de fechas, con filtros y paginación. */
export default async function HistorialGastosPage({ searchParams }: { searchParams: Promise<Filtros> }) {
  const sp = await searchParams;
  const s = await requirePermiso("gastos");
  const { localId } = await getAlcance(s);
  const q = sp.q?.trim();

  // Un grupo con subtipos (ej. Presupuesto) filtra por todos sus subtipos.
  const grupo = GRUPOS_GASTO.find((g) => g.id === sp.tipo);
  const tipos = grupo ? (grupo.subtipos ? grupo.subtipos.map((st) => st.id) : [grupo.id]) : sp.tipo ? [sp.tipo] : null;

  const where = {
    ...(localId ? { localId } : {}),
    ...(filtroFechas(sp.desde, sp.hasta) ? { fecha: filtroFechas(sp.desde, sp.hasta) } : {}),
    ...(tipos ? { tipo: { in: tipos } } : {}),
    ...(sp.proveedor ? { proveedorId: Number(sp.proveedor) } : {}),
    ...(sp.usuario ? { usuarioId: Number(sp.usuario) } : {}),
    ...(sp.estado ? { estado: sp.estado } : {}),
    ...(q ? { justificacion: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [total, resumen, proveedores, usuarios] = await Promise.all([
    db.gasto.count({ where }),
    db.gasto.aggregate({ where: { ...where, estado: "ACTIVO" }, _sum: { monto: true }, _count: true }),
    db.proveedor.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    db.usuario.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
  ]);
  const { paginas, actual, skip, take } = paginar(total, leerPagina(sp.pagina));
  const gastos = await db.gasto.findMany({
    where,
    orderBy: { fecha: "desc" },
    skip,
    take,
    include: { local: true, usuario: true, proveedor: true },
  });

  const filtros = { q, desde: sp.desde, hasta: sp.hasta, tipo: sp.tipo, proveedor: sp.proveedor, usuario: sp.usuario, estado: sp.estado };
  const masFiltros = !!(sp.desde || sp.hasta || sp.tipo || sp.proveedor || sp.usuario || sp.estado);
  const tipoTexto = (g: (typeof gastos)[number]) =>
    g.proveedor ? `${TIPOS_GASTO[g.tipo] ?? g.tipo}: ${g.proveedor.nombre}` : TIPOS_GASTO[g.tipo] ?? g.tipo;

  return (
    <PageContainer width="fluid">
      <PageHeader
        title="Todos los gastos"
        back={{ href: "/gastos", label: "Volver a Gastos" }}
        help="El historial completo de gastos. Toque uno para ver todo su detalle y el recibo."
      />

      <FiltrosHistorial ruta="/gastos/historial" q={q} placeholder="Buscar en qué se gastó…" masFiltrosActivos={masFiltros} hayFiltros={!!q || masFiltros}>
        <DatePicker label="Desde" name="desde" defaultValue={sp.desde} max={aISO(new Date())} />
        <DatePicker label="Hasta" name="hasta" defaultValue={sp.hasta} max={aISO(new Date())} />
        <Select label="Tipo de gasto" name="tipo" defaultValue={sp.tipo ?? ""} placeholder="Todos" options={GRUPOS_GASTO.map((g) => ({ value: g.id, label: g.nombre }))} />
        <Select label="Proveedor" name="proveedor" defaultValue={sp.proveedor ?? ""} placeholder="Todos" options={proveedores.map((p) => ({ value: p.id, label: p.nombre }))} />
        <Select label="Quién lo anotó" name="usuario" defaultValue={sp.usuario ?? ""} placeholder="Todos" options={usuarios.map((u) => ({ value: u.id, label: u.nombre }))} />
        <Select
          label="Estado"
          name="estado"
          defaultValue={sp.estado ?? ""}
          placeholder="Todos"
          options={[
            { value: "ACTIVO", label: "Vigentes" },
            { value: "ANULADO", label: "Anulados" },
          ]}
        />
      </FiltrosHistorial>

      <StatPanel>
        <Stat label="Gastos encontrados" value={total.toLocaleString("es-CO")} detail={total !== resumen._count ? `${plural(total - resumen._count, "anulado", "anulados")} incluidos` : undefined} />
        <Stat label="Total gastado" value={cop(resumen._sum.monto ?? 0)} detail="sin contar los anulados" />
      </StatPanel>

      <Card>
        {gastos.length === 0 ? (
          <EmptyState icon={Wallet} title="No hay gastos con estos filtros." />
        ) : (
          <>
            {/* Computador: tabla. Toda la fila lleva al detalle. */}
            <div className="hidden lg:block">
              <Table>
                <thead>
                  <tr>
                    <Th className="w-40">Fecha</Th>
                    <Th>En qué se gastó</Th>
                    <Th>Tipo</Th>
                    {!localId && <Th>Local</Th>}
                    <Th>Anotó</Th>
                    <Th numeric>Valor</Th>
                    <Th className="w-12">
                      <span className="sr-only">Abrir</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {gastos.map((g) => {
                    const anulado = g.estado === "ANULADO";
                    return (
                      <Tr key={g.id} className={cn("relative", anulado && "text-neutral-500")}>
                        <Td className="whitespace-nowrap tabular-nums">
                          <span className="block">{fecha(g.fecha)}</span>
                          <span className="block text-sm text-neutral-500">{hora(g.fecha)}</span>
                        </Td>
                        <Td className={cn("max-w-md", anulado && "line-through")}>
                          <Link
                            href={`/gastos/${g.id}`}
                            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-brand-400"
                          >
                            {g.justificacion}
                          </Link>
                          {g.soporte && <Icon icon={Paperclip} size="sm" className="ml-2 inline text-neutral-400" aria-label="Tiene recibo" />}
                        </Td>
                        <Td>{anulado ? <Badge tone="danger">Anulado</Badge> : tipoTexto(g)}</Td>
                        {!localId && <Td className="whitespace-nowrap">{g.local.nombre}</Td>}
                        <Td className="whitespace-nowrap">{g.usuario.nombre}</Td>
                        <Td numeric className={cn("whitespace-nowrap font-semibold", anulado && "line-through")}>
                          {cop(g.monto)}
                        </Td>
                        <Td>
                          <Icon icon={ChevronRight} className="text-neutral-400" />
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
            {/* Celular: lista */}
            <div className="lg:hidden">
              <List>
                {gastos.map((g) => {
                  const anulado = g.estado === "ANULADO";
                  return (
                    <ListItem
                      key={g.id}
                      href={`/gastos/${g.id}`}
                      muted={anulado}
                      leading={<IconBadge icon={iconoGasto(g.tipo)} tone="neutral" size="sm" />}
                      title={<span className="whitespace-normal">{g.justificacion}</span>}
                      meta={[`${fecha(g.fecha)} ${hora(g.fecha)}`, tipoTexto(g), !localId && g.local.nombre].filter(Boolean).join(" · ")}
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
            </div>
          </>
        )}
      </Card>

      <Pagination page={actual} pages={paginas} total={total} perPage={POR_PAGINA} href={(n) => enlaceCon("/gastos/historial", { ...filtros, pagina: n })} />
    </PageContainer>
  );
}
