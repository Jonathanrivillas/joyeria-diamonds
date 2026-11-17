import Link from "next/link";
import { BarChart3, Download } from "lucide-react";
import { db } from "@/lib/db";
import { requireSesion, getAlcance } from "@/lib/session";
import { resumenRango } from "@/lib/consultas";
import { aISO, finDia, inicioDia, parseFechaISO, sumarDias } from "@/lib/fechas";
import { cop, gramos, fecha, fechaLarga, METODOS_PAGO, TIPOS_GASTO, plural } from "@/lib/format";
import { rangoActivo, rangosRapidos } from "@/lib/rangos";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  DataRow,
  EmptyState,
  PageContainer,
  PageHeader,
  PrintButton,
  Table,
  Td,
  Th,
  Tr,
  cn,
} from "@/components/ui";
import { RangoFechas } from "@/components/filtros/rango-fechas";
import { GraficoCategorias, GraficoVentasGastos } from "@/components/graficos/graficos";

export default async function ReportesPage({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string }> }) {
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
        db.gasto.groupBy({ by: ["tipo"], where: { localId: l.id, estado: "ACTIVO", fecha: { gte: desde, lte: hasta } }, _sum: { monto: true } }),
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
    db.gasto.findMany({ where: { ...whereLocal, estado: "ACTIVO", fecha: { gte: gDesde, lte: hasta } }, select: { fecha: true, monto: true } }),
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
  const rangos = rangosRapidos(hoy);
  const activo = rangoActivo(rangos, desde, hasta)?.etiqueta;

  return (
    <PageContainer>
      <PageHeader
        title="Reportes"
        subtitle={unDia ? `Cierre del ${fechaLarga(desde).toLowerCase()}` : `Del ${fecha(desde)} al ${fecha(hasta)}`}
        help="Aquí ve cómo le fue: cuánto vendió, cuánto gastó y cuánto le quedó. Puede imprimirlo o descargarlo para Excel."
        actions={<PrintButton />}
      />

      <RangoFechas ruta="/reportes" rangos={rangos} activo={activo} desde={aISO(desde)} hasta={aISO(hasta)} max={aISO(hoy)} />

      <div className="grid gap-6 lg:grid-cols-2">
        {porLocal.map(({ local, res, porMetodo, porTipo, arqueo, stock }) => {
          const difArqueo = arqueo ? arqueo.pesoContadoCg - arqueo.pesoSistemaCg : 0;
          return (
            <Card key={local.id} padding="lg">
              <p className="mb-4 text-2xl font-bold">{local.nombre}</p>
              <div className="space-y-4">
                <DataRow label={`Vendió (${plural(res.numVentas, "factura", "facturas")})`} value={cop(res.totalVentas)} strong />
                {porMetodo.length > 0 && (
                  <p className="-mt-2 text-base text-neutral-500">
                    {porMetodo.map((m) => `${METODOS_PAGO[m.metodoPago]} ${cop(m._sum.total ?? 0)}`).join(" · ")}
                  </p>
                )}
                <DataRow label="Gastó" value={cop(res.totalGastos)} tone="danger" strong />
                {porTipo.length > 0 && (
                  <p className="-mt-2 text-base text-neutral-500">{porTipo.map((t) => `${TIPOS_GASTO[t.tipo]} ${cop(t._sum.monto ?? 0)}`).join(" · ")}</p>
                )}
                <Card tone={res.neto >= 0 ? "success" : "danger"} padding="sm">
                  <DataRow label="Le quedó" value={cop(res.neto)} tone={res.neto >= 0 ? "success" : "danger"} strong size="xl" className="font-normal" />
                </Card>
                <DataRow label="Oro vendido" value={`${gramos(res.gramosVendidos)} · ${res.piezasVendidas} pzs`} />
                <DataRow label="Hay en inventario hoy" value={gramos(stock)} />
                <DataRow
                  label="Arqueo"
                  value={arqueo ? (difArqueo === 0 ? "Cuadró ✓" : `Diferencia ${gramos(difArqueo)}`) : "No se hizo"}
                  tone={arqueo ? (difArqueo === 0 ? "success" : "danger") : "warning"}
                />
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Ventas y gastos por día" description="Barra dorada = ventas · barra gris = gastos" />
          <CardBody>
            <GraficoVentasGastos datos={serie.map(({ dia, ventas, gastos }) => ({ dia, ventas, gastos }))} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Lo que más se vendió" description="Gramos vendidos por tipo de pieza" />
          <CardBody>
            {topCats.length ? <GraficoCategorias datos={topCats} /> : <EmptyState icon={BarChart3} title="Sin ventas en estas fechas." />}
          </CardBody>
        </Card>
      </div>

      {!unDia && (
        <Card>
          <CardHeader title="Día por día" />
          <Table>
            <thead>
              <tr>
                <Th>Día</Th>
                <Th numeric>Vendió</Th>
                <Th numeric>Gastó</Th>
                <Th numeric>Le quedó</Th>
              </tr>
            </thead>
            <tbody>
              {serie.map((d) => (
                <Tr key={d.dia}>
                  <Td>
                    <Link href={`/reportes?desde=${aISO(d.fechaD)}`} className="text-brand-800 hover:underline">
                      {fechaLarga(d.fechaD)}
                    </Link>
                  </Td>
                  <Td numeric>{cop(d.ventas)}</Td>
                  <Td numeric className="text-danger-700">
                    {cop(d.gastos)}
                  </Td>
                  <Td numeric className={cn("font-semibold", d.ventas - d.gastos < 0 && "text-danger-700")}>
                    {cop(d.ventas - d.gastos)}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <div className="no-print">
        <Card>
          <CardHeader title="Descargar para Excel" icon={Download} />
          <CardBody className="flex flex-wrap gap-3">
            <Button variant="secondary" native href={`/api/reportes/ventas?${qs}`} icon={Download}>
              Ventas
            </Button>
            <Button variant="secondary" native href={`/api/reportes/gastos?${qs}`} icon={Download}>
              Gastos
            </Button>
            <Button variant="secondary" native href="/api/reportes/inventario" icon={Download}>
              Inventario actual
            </Button>
          </CardBody>
        </Card>
      </div>
    </PageContainer>
  );
}
