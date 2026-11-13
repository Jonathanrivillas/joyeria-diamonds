import Link from "next/link";
import clsx from "clsx";
import { Download } from "lucide-react";
import { db } from "@/lib/db";
import { requireSesion, getAlcance } from "@/lib/session";
import { resumenRango } from "@/lib/consultas";
import { aISO, finDia, inicioDia, parseFechaISO, sumarDias } from "@/lib/fechas";
import { cop, gramos, fecha, fechaLarga, METODOS_PAGO, TIPOS_GASTO, plural } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { BotonImprimir } from "@/components/boton-imprimir";
import { GraficoCategorias, GraficoVentasGastos } from "@/components/graficos";

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  const sp = await searchParams;
  const s = await requireSesion();
  const { localId, locales } = await getAlcance(s);
  const hoy = inicioDia(new Date());
  const desde = inicioDia(parseFechaISO(sp.desde));
  const hasta = finDia(parseFechaISO(sp.hasta ?? sp.desde));
  const unDia = aISO(desde) === aISO(hasta);
  const localesVista = localId ? locales.filter((l) => l.id === localId) : locales;
  const whereLocal = localId ? { localId } : {};

  const porLocal = await Promise.all(
    localesVista.map(async (l) => {
      const [res, porMetodo, porTipo, arqueo, stock] = await Promise.all([
        resumenRango(l.id, desde, hasta),
        db.venta.groupBy({
          by: ["metodoPago"],
          where: { localId: l.id, estado: "ACTIVA", fecha: { gte: desde, lte: hasta } },
          _sum: { total: true },
        }),
        db.gasto.groupBy({ by: ["tipo"], where: { localId: l.id, fecha: { gte: desde, lte: hasta } }, _sum: { monto: true } }),
        db.arqueo.findFirst({
          where: { localId: l.id, estado: "CERRADO", fecha: { gte: desde, lte: hasta } },
          orderBy: { fecha: "desc" },
        }),
        db.existencia.aggregate({ where: { localId: l.id }, _sum: { pesoCg: true } }),
      ]);
      return { local: l, res, porMetodo, porTipo, arqueo, stock: stock._sum.pesoCg ?? 0 };
    })
  );

  // Gráficos: si es un solo día, se muestran los 7 días que terminan en ese día.
  const gDesde = unDia ? sumarDias(desde, -6) : desde;
  const nDias = Math.min(62, Math.round((inicioDia(hasta).getTime() - gDesde.getTime()) / 86400000) + 1);
  const [ventasRango, gastosRango, itemsRango, categorias] = await Promise.all([
    db.venta.findMany({ where: { ...whereLocal, estado: "ACTIVA", fecha: { gte: gDesde, lte: hasta } }, select: { fecha: true, total: true } }),
    db.gasto.findMany({ where: { ...whereLocal, fecha: { gte: gDesde, lte: hasta } }, select: { fecha: true, monto: true } }),
    db.ventaItem.groupBy({
      by: ["categoriaId"],
      where: { venta: { ...whereLocal, estado: "ACTIVA", fecha: { gte: gDesde, lte: hasta } } },
      _sum: { pesoCg: true },
    }),
    db.categoria.findMany(),
  ]);
  const serie = Array.from({ length: nDias }, (_, i) => {
    const d = sumarDias(gDesde, i);
    const f = finDia(d);
    return {
      dia: d.toLocaleDateString("es-CO", { day: "2-digit", month: "short" }),
      fechaD: d,
      ventas: ventasRango.filter((v) => v.fecha >= d && v.fecha <= f).reduce((a, v) => a + v.total, 0),
      gastos: gastosRango.filter((g) => g.fecha >= d && g.fecha <= f).reduce((a, g) => a + g.monto, 0),
    };
  });
  const nombres = new Map(categorias.map((c) => [c.id, c.nombre]));
  const topCats = itemsRango
    .map((i) => ({ nombre: nombres.get(i.categoriaId) ?? "", gramos: (i._sum.pesoCg ?? 0) / 100 }))
    .filter((x) => x.gramos > 0)
    .sort((a, b) => b.gramos - a.gramos)
    .slice(0, 8);

  const qs = `desde=${aISO(desde)}&hasta=${aISO(hasta)}`;
  const rapidos = [
    { t: "Hoy", d: hoy, h: hoy },
    { t: "Ayer", d: sumarDias(hoy, -1), h: sumarDias(hoy, -1) },
    { t: "Últimos 7 días", d: sumarDias(hoy, -6), h: hoy },
    { t: "Últimos 30 días", d: sumarDias(hoy, -29), h: hoy },
  ];
  const activo = rapidos.find((r) => aISO(r.d) === aISO(desde) && aISO(r.h) === aISO(hasta))?.t;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        titulo="Reportes"
        subtitulo={unDia ? `Cierre del ${fechaLarga(desde).toLowerCase()}` : `Del ${fecha(desde)} al ${fecha(hasta)}`}
        ayuda="Aquí ve cómo le fue: cuánto vendió, cuánto gastó y cuánto le quedó. Puede imprimirlo o descargarlo para Excel."
      >
        <BotonImprimir />
      </PageHeader>

      <div className="no-print mb-6 flex flex-wrap items-center gap-2">
        {rapidos.map((r) => (
          <Link
            key={r.t}
            href={`/reportes?desde=${aISO(r.d)}&hasta=${aISO(r.h)}`}
            className={clsx("btn", activo === r.t ? "bg-oro-700 text-white" : "border-2 border-stone-300 bg-white hover:bg-stone-50")}
          >
            {r.t}
          </Link>
        ))}
        <details className="relative">
          <summary className="btn cursor-pointer list-none border-2 border-stone-300 bg-white">Otras fechas…</summary>
          <form className="card absolute z-10 mt-2 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3 p-4">
            <label className="label">Desde<input type="date" name="desde" className="input mt-1" defaultValue={aISO(desde)} /></label>
            <label className="label">Hasta<input type="date" name="hasta" className="input mt-1" defaultValue={aISO(hasta)} /></label>
            <button className="btn-primary">Ver</button>
          </form>
        </details>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {porLocal.map(({ local, res, porMetodo, porTipo, arqueo, stock }) => (
          <div key={local.id} className="card p-6">
            <p className="mb-4 text-2xl font-bold">{local.nombre}</p>
            <div className="space-y-4 text-lg">
              <Fila t={`Vendió (${plural(res.numVentas, "factura", "facturas")})`} v={cop(res.totalVentas)} fuerte />
              {porMetodo.length > 0 && (
                <p className="-mt-2 text-base text-stone-500">
                  {porMetodo.map((m) => `${METODOS_PAGO[m.metodoPago]} ${cop(m._sum.total ?? 0)}`).join(" · ")}
                </p>
              )}
              <Fila t="Gastó" v={cop(res.totalGastos)} clase="text-red-700" fuerte />
              {porTipo.length > 0 && (
                <p className="-mt-2 text-base text-stone-500">
                  {porTipo.map((t) => `${TIPOS_GASTO[t.tipo]} ${cop(t._sum.monto ?? 0)}`).join(" · ")}
                </p>
              )}
              <div className={clsx("rounded-xl p-4", res.neto >= 0 ? "bg-emerald-50" : "bg-red-50")}>
                <Fila t="Le quedó" v={cop(res.neto)} clase={res.neto >= 0 ? "text-emerald-800" : "text-red-700"} fuerte grande />
              </div>
              <Fila t="Oro vendido" v={`${gramos(res.gramosVendidos)} · ${res.piezasVendidas} pzs`} />
              <Fila t="Hay en inventario hoy" v={gramos(stock)} />
              <Fila
                t="Arqueo"
                v={
                  arqueo
                    ? arqueo.pesoContadoCg === arqueo.pesoSistemaCg
                      ? "Cuadró ✓"
                      : `Diferencia ${gramos(arqueo.pesoContadoCg - arqueo.pesoSistemaCg)}`
                    : "No se hizo"
                }
                clase={arqueo ? (arqueo.pesoContadoCg === arqueo.pesoSistemaCg ? "text-emerald-700" : "text-red-700") : "text-amber-700"}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="card p-5">
          <p className="text-xl font-bold">Ventas y gastos por día</p>
          <p className="mb-3 text-base text-stone-500">Barra dorada = ventas · barra gris = gastos</p>
          <GraficoVentasGastos datos={serie.map(({ dia, ventas, gastos }) => ({ dia, ventas, gastos }))} />
        </div>
        <div className="card p-5">
          <p className="text-xl font-bold">Lo que más se vendió</p>
          <p className="mb-3 text-base text-stone-500">Gramos vendidos por tipo de pieza</p>
          {topCats.length ? <GraficoCategorias datos={topCats} /> : <p className="py-16 text-center text-stone-500">Sin ventas en estas fechas.</p>}
        </div>
      </div>

      {!unDia && (
        <div className="card mt-6 overflow-x-auto">
          <p className="border-b border-stone-200 px-5 py-4 text-xl font-bold">Día por día</p>
          <table className="tabla">
            <thead>
              <tr>
                <th>Día</th>
                <th className="num">Vendió</th>
                <th className="num">Gastó</th>
                <th className="num">Le quedó</th>
              </tr>
            </thead>
            <tbody>
              {serie.map((d) => (
                <tr key={d.dia}>
                  <td>
                    <Link href={`/reportes?desde=${aISO(d.fechaD)}`} className="text-oro-800 hover:underline">{fechaLarga(d.fechaD)}</Link>
                  </td>
                  <td className="num">{cop(d.ventas)}</td>
                  <td className="num text-red-700">{cop(d.gastos)}</td>
                  <td className={clsx("num font-semibold", d.ventas - d.gastos < 0 && "text-red-700")}>{cop(d.ventas - d.gastos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="no-print mt-6 card p-5">
        <p className="mb-3 text-lg font-semibold">Descargar para Excel</p>
        <div className="flex flex-wrap gap-3">
          <a href={`/api/reportes/ventas?${qs}`} className="btn-secondary"><Download className="h-5 w-5" /> Ventas</a>
          <a href={`/api/reportes/gastos?${qs}`} className="btn-secondary"><Download className="h-5 w-5" /> Gastos</a>
          <a href="/api/reportes/inventario" className="btn-secondary"><Download className="h-5 w-5" /> Inventario actual</a>
        </div>
      </div>
    </div>
  );
}

function Fila({ t, v, clase, fuerte, grande }: { t: string; v: string; clase?: string; fuerte?: boolean; grande?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-stone-700">{t}</span>
      <span className={clsx("text-right tabular-nums", fuerte && "font-bold", grande && "text-2xl", clase)}>{v}</span>
    </div>
  );
}
