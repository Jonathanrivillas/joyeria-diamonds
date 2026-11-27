import { ArrowLeftRight, ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { aISO } from "@/lib/fechas";
import { fecha, gramos, hora } from "@/lib/format";
import { enlaceCon, filtroFechas, leerPagina, paginar, POR_PAGINA, leerId } from "@/lib/listas";
import { Card, DatePicker, EmptyState, Icon, PageContainer, PageHeader, Pagination, Select } from "@/components/ui";
import { FiltrosHistorial } from "@/components/filtros/filtros-historial";

type Filtros = { q?: string; desde?: string; hasta?: string; origen?: string; destino?: string; categoria?: string; pagina?: string };

/** Todos los traslados entre locales, con filtros y paginación. */
export default async function HistorialTrasladosPage({ searchParams }: { searchParams: Promise<Filtros> }) {
  const sp = await searchParams;
  await requireAdmin();
  const q = sp.q?.trim();

  const where = {
    ...(filtroFechas(sp.desde, sp.hasta) ? { fecha: filtroFechas(sp.desde, sp.hasta) } : {}),
    ...(leerId(sp.origen) ? { origenId: leerId(sp.origen) } : {}),
    ...(leerId(sp.destino) ? { destinoId: leerId(sp.destino) } : {}),
    ...(leerId(sp.categoria) ? { items: { some: { categoriaId: leerId(sp.categoria) } } } : {}),
    ...(q ? { nota: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [total, locales, categorias] = await Promise.all([
    db.traslado.count({ where }),
    db.local.findMany({ orderBy: { id: "asc" }, select: { id: true, nombre: true } }),
    db.categoria.findMany({ where: { esServicio: false }, orderBy: { orden: "asc" }, select: { id: true, nombre: true } }),
  ]);
  const { paginas, actual, skip, take } = paginar(total, leerPagina(sp.pagina));
  const traslados = await db.traslado.findMany({
    where,
    orderBy: { fecha: "desc" },
    skip,
    take,
    include: { origen: true, destino: true, usuario: true, items: { include: { categoria: true } } },
  });

  const filtros = { q, desde: sp.desde, hasta: sp.hasta, origen: sp.origen, destino: sp.destino, categoria: sp.categoria };
  const masFiltros = !!(sp.desde || sp.hasta || sp.origen || sp.destino || sp.categoria);
  const opcionesLocal = locales.map((l) => ({ value: l.id, label: l.nombre }));

  return (
    <PageContainer width="fluid">
      <PageHeader title="Todos los traslados" back={{ href: "/traslados", label: "Volver a Traslados" }} help="El historial completo de lo que se ha movido entre locales." />

      <FiltrosHistorial ruta="/traslados/historial" q={q} placeholder="Buscar en las notas (ej. código de joya)…" masFiltrosActivos={masFiltros} hayFiltros={!!q || masFiltros}>
        <DatePicker label="Desde" name="desde" defaultValue={sp.desde} max={aISO(new Date())} />
        <DatePicker label="Hasta" name="hasta" defaultValue={sp.hasta} max={aISO(new Date())} />
        <Select label="Tipo de pieza" name="categoria" defaultValue={sp.categoria ?? ""} placeholder="Todos" options={categorias.map((c) => ({ value: c.id, label: c.nombre }))} />
        <Select label="Salió de" name="origen" defaultValue={sp.origen ?? ""} placeholder="Cualquier local" options={opcionesLocal} />
        <Select label="Llegó a" name="destino" defaultValue={sp.destino ?? ""} placeholder="Cualquier local" options={opcionesLocal} />
      </FiltrosHistorial>

      <Card>
        {traslados.length === 0 ? (
          <EmptyState icon={ArrowLeftRight} title="No hay traslados con estos filtros." />
        ) : (
          <ul className="divide-y divide-neutral-100">
            {traslados.map((t) => (
              <li key={t.id} className="flex flex-wrap items-start gap-x-6 gap-y-2 px-5 py-4">
                <div className="w-32 shrink-0 tabular-nums">
                  <p className="font-semibold">{fecha(t.fecha)}</p>
                  <p className="text-sm text-neutral-500">{hora(t.fecha)}</p>
                </div>
                <div className="min-w-0 flex-1 basis-60">
                  <p className="flex flex-wrap items-center gap-2 text-base font-semibold">
                    {t.origen.nombre} <Icon icon={ArrowRight} size="sm" className="text-neutral-400" /> {t.destino.nombre}
                  </p>
                  <p className="text-sm text-neutral-500">
                    TR-{t.id} · {t.usuario.nombre}
                    {t.nota && ` · ${t.nota}`}
                  </p>
                </div>
                <div className="text-right">
                  {t.items.map((i) => (
                    <p key={i.id} className="tabular-nums">
                      <span className="font-semibold">{i.categoria.nombre}</span>{" "}
                      <span className="text-neutral-600">
                        {i.pesoCg > 0 && `${gramos(i.pesoCg)} · `}
                        {i.cantidad} pzs
                      </span>
                    </p>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Pagination page={actual} pages={paginas} total={total} perPage={POR_PAGINA} href={(n) => enlaceCon("/traslados/historial", { ...filtros, pagina: n })} />
    </PageContainer>
  );
}
