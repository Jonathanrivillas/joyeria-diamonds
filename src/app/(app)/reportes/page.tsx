import Link from "next/link";
import { BarChart3, Download } from "lucide-react";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePermiso, getAlcance } from "@/lib/session";
import { resumenRango } from "@/lib/consultas";
import { ZONA_HORARIA, aISO, finDia, inicioDia, parseFechaISO, sumarDias } from "@/lib/fechas";
import { cop, gramos, fecha, fechaLarga, METODOS_PAGO, REDES, TIPOS_GASTO, plural } from "@/lib/format";
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
  Stat,
  StatPanel,
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
  const s = await requirePermiso("reportes");
  const { localId, locales } = await getAlcance(s);
  const hoy = inicioDia(new Date());
  let desde = inicioDia(parseFechaISO(sp.desde));
  let hasta = finDia(parseFechaISO(sp.hasta ?? sp.desde));
  if (desde > hasta) [desde, hasta] = [inicioDia(hasta), finDia(desde)];
  const unDia = aISO(desde) === aISO(hasta);
  const localesVista = localId ? locales.filter((l) => l.id === localId) : locales;
  const whereLocal = localId ? { localId } : {};

  const porLocal = await Promise.all(
    localesVista.map(async (l) => {
      const [res, porMetodo, porCanal, porTipo, arqueo, stock] = await Promise.all([
        resumenRango(l.id, desde, hasta),
        db.venta.groupBy({
          by: ["metodoPago"],
          where: { localId: l.id, estado: "ACTIVA", fecha: { gte: desde, lte: hasta } },
          _sum: { total: true },
        }),
        db.venta.groupBy({
          by: ["canal"],
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
      return { local: l, res, porMetodo, porCanal, porTipo, arqueo, stock: stock._sum.pesoCg ?? 0 };
    })
  );

  // ¿Dónde se vendió? Tienda física vs. redes, y cada red por separado.
  const ventasCanal = await db.venta.groupBy({
    by: ["canal", "red", "redOtra"],
    where: { ...whereLocal, estado: "ACTIVA", fecha: { gte: desde, lte: hasta } },
    _sum: { total: true },
    _count: true,
  });
  const totalCanal = ventasCanal.reduce((a, v) => a + (v._sum.total ?? 0), 0);
  const tienda = ventasCanal.filter((v) => v.canal !== "REDES");
  const filaTienda = {
    facturas: tienda.reduce((a, v) => a + v._count, 0),
    total: tienda.reduce((a, v) => a + (v._sum.total ?? 0), 0),
  };
  // Las redes "Otra" se agrupan por nombre sin importar mayúsculas (TikTok = tiktok).
  const redesMap = new Map<string, { nombre: string; facturas: number; total: number }>();
  for (const v of ventasCanal.filter((v) => v.canal === "REDES")) {
    const nombre = v.red === "OTRA" ? v.redOtra?.trim() || "Otra red" : REDES[v.red ?? ""] ?? "Sin red";
    const clave = nombre.toLowerCase();
    const r = redesMap.get(clave) ?? { nombre, facturas: 0, total: 0 };
    r.facturas += v._count;
    r.total += v._sum.total ?? 0;
    redesMap.set(clave, r);
  }
  const filasRedes = [...redesMap.values()].sort((a, b) => b.total - a.total);
  const filaRedes = {
    facturas: filasRedes.reduce((a, r) => a + r.facturas, 0),
    total: filasRedes.reduce((a, r) => a + r.total, 0),
  };
  const pct = (n: number) => (totalCanal > 0 ? `${Math.round((n / totalCanal) * 100)} %` : "—");

  // Ganancia: solo de la parte vendida que tiene costo de compra registrado.
  // Si una línea tiene parte con costo y parte sin costo, su precio se reparte en proporción.
  const filtroLocal = localId ? Prisma.sql`AND v."localId" = ${localId}` : Prisma.empty;
  const [sumasGanancia, compras] = await Promise.all([
    db.$queryRaw<{ vendidoConCosto: number | null; costo: number | null; gramosConCosto: bigint | null; vendidoTotal: bigint | null; gramosTotal: bigint | null }[]>`
      SELECT
        SUM(vi.subtotal * LEAST(1, COALESCE(vi."costoMedida"::float8 / NULLIF(CASE WHEN c."controlaPeso" THEN vi."pesoCg" ELSE vi.cantidad END, 0), 0))) AS "vendidoConCosto",
        SUM(vi.costo) AS "costo",
        SUM(CASE WHEN c."controlaPeso" THEN vi."costoMedida" ELSE 0 END) AS "gramosConCosto",
        SUM(vi.subtotal) AS "vendidoTotal",
        SUM(CASE WHEN c."controlaPeso" THEN vi."pesoCg" ELSE 0 END) AS "gramosTotal"
      FROM "VentaItem" vi
      JOIN "Venta" v ON v.id = vi."ventaId"
      JOIN "Categoria" c ON c.id = vi."categoriaId"
      WHERE v.estado = 'ACTIVA' AND c."esServicio" = false AND v.fecha >= ${desde} AND v.fecha <= ${hasta} ${filtroLocal}`,
    db.movimiento.aggregate({
      where: { ...whereLocal, tipo: "ENTRADA", costo: { gt: 0 }, fecha: { gte: desde, lte: hasta } },
      _sum: { costo: true, pesoCg: true },
      _count: true,
    }),
  ]);
  const sg = sumasGanancia[0];
  const g = {
    vendidoConCosto: Number(sg?.vendidoConCosto ?? 0),
    costo: Number(sg?.costo ?? 0),
    gramosConCosto: Number(sg?.gramosConCosto ?? 0),
    vendidoSinCosto: Number(sg?.vendidoTotal ?? 0) - Number(sg?.vendidoConCosto ?? 0),
    gramosSinCosto: Number(sg?.gramosTotal ?? 0) - Number(sg?.gramosConCosto ?? 0),
  };
  const ganancia = Math.round(g.vendidoConCosto - g.costo);
  const margen = g.vendidoConCosto > 0 ? Math.round((ganancia / g.vendidoConCosto) * 100) : 0;

  // Gráficos: si es un solo día, se muestran los 7 días que terminan en ese día.
  const MAX_DIAS_GRAFICA = 62;
  const diasRango = Math.round((inicioDia(hasta).getTime() - desde.getTime()) / 86400000) + 1;
  const graficaRecortada = diasRango > MAX_DIAS_GRAFICA;
  const gDesde = unDia ? sumarDias(desde, -6) : graficaRecortada ? sumarDias(inicioDia(hasta), -(MAX_DIAS_GRAFICA - 1)) : desde;
  const nDias = Math.round((inicioDia(hasta).getTime() - gDesde.getTime()) / 86400000) + 1;
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
      dia: d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", timeZone: ZONA_HORARIA }),
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
    <PageContainer width="fluid">
      <PageHeader
        title="Reportes"
        subtitle={unDia ? `Cierre del ${fechaLarga(desde).toLowerCase()}` : `Del ${fecha(desde)} al ${fecha(hasta)}`}
        help="Aquí ve cómo le fue: cuánto vendió, cuánto gastó y cuánto le quedó. Puede imprimirlo o descargarlo para Excel."
        actions={<PrintButton />}
      />

      <RangoFechas ruta="/reportes" rangos={rangos} activo={activo} desde={aISO(desde)} hasta={aISO(hasta)} max={aISO(hoy)} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {porLocal.map(({ local, res, porMetodo, porCanal, porTipo, arqueo, stock }) => {
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
                {porCanal.length > 0 && (
                  <p className="-mt-2 text-base text-neutral-500">
                    {porCanal.map((c) => `${c.canal === "REDES" ? "Por redes" : "En la tienda"} ${cop(c._sum.total ?? 0)}`).join(" · ")}
                  </p>
                )}
                <DataRow label="Gastó" value={cop(res.totalGastos)} tone="danger" strong />
                {porTipo.length > 0 && (
                  <p className="-mt-2 text-base text-neutral-500">{porTipo.map((t) => `${TIPOS_GASTO[t.tipo] ?? t.tipo} ${cop(t._sum.monto ?? 0)}`).join(" · ")}</p>
                )}
                <Card tone={res.neto >= 0 ? "success" : "danger"} padding="sm">
                  <DataRow label="Le quedó" value={cop(res.neto)} tone={res.neto >= 0 ? "success" : "danger"} strong size="xl" className="font-normal" />
                  <p className="mt-1 text-base text-neutral-600">Lo vendido menos lo gastado (los gastos incluyen lo que se pagó por mercancía).</p>
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

      <Card>
        <CardHeader title="¿Dónde se vendió?" description="Ventas en la tienda física y por cada red social" />
        {totalCanal === 0 ? (
          <CardBody>
            <EmptyState icon={BarChart3} title="Sin ventas en estas fechas." />
          </CardBody>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Canal</Th>
                <Th numeric>Facturas</Th>
                <Th numeric>Vendió</Th>
                <Th numeric>%</Th>
              </tr>
            </thead>
            <tbody>
              <Tr>
                <Td className="font-semibold">En la tienda</Td>
                <Td numeric>{filaTienda.facturas}</Td>
                <Td numeric className="font-semibold">
                  {cop(filaTienda.total)}
                </Td>
                <Td numeric>{pct(filaTienda.total)}</Td>
              </Tr>
              <Tr>
                <Td className="font-semibold">Por redes</Td>
                <Td numeric>{filaRedes.facturas}</Td>
                <Td numeric className="font-semibold">
                  {cop(filaRedes.total)}
                </Td>
                <Td numeric>{pct(filaRedes.total)}</Td>
              </Tr>
              {filasRedes.map((r) => (
                <Tr key={r.nombre}>
                  <Td className="pl-8 text-neutral-600">{r.nombre}</Td>
                  <Td numeric className="text-neutral-600">
                    {r.facturas}
                  </Td>
                  <Td numeric className="text-neutral-600">
                    {cop(r.total)}
                  </Td>
                  <Td numeric className="text-neutral-600">
                    {pct(r.total)}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Costos y ganancia: solo el administrador. */}
      {s.rol === "ADMIN" && (
      <Card>
        <CardHeader title="Ganancia" description="Lo que se vendió menos lo que costó comprarlo (solo mercancía con precio de compra registrado)" />
        <CardBody className="space-y-4">
          <StatPanel>
            <Stat label="Se vendió" value={cop(Math.round(g.vendidoConCosto))} />
            <Stat label="Costó comprarlo" value={cop(Math.round(g.costo))} tone="danger" />
            <Stat label="Ganancia" value={cop(ganancia)} tone={ganancia >= 0 ? "success" : "danger"} detail={margen ? `${margen} % de lo vendido` : undefined} />
          </StatPanel>
          {g.gramosConCosto > 0 && <p className="text-base text-neutral-500">{gramos(g.gramosConCosto)} vendidos con costo registrado.</p>}
          {g.vendidoSinCosto > 0 && (
            <p className="text-base text-neutral-500">
              Además se vendieron {cop(Math.round(g.vendidoSinCosto))}
              {g.gramosSinCosto > 0 && ` (${gramos(g.gramosSinCosto)})`} de mercancía sin precio de compra registrado (la que ya había antes). Esa no
              cuenta en la ganancia.
            </p>
          )}
          <DataRow
            label={`Compras de mercancía en estas fechas (${plural(compras._count, "compra", "compras")})`}
            value={`${cop(Math.round(compras._sum.costo ?? 0))}${compras._sum.pesoCg ? ` · ${gramos(compras._sum.pesoCg)}` : ""}`}
            className="border-t border-neutral-200 pt-3"
          />
        </CardBody>
      </Card>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Ventas y gastos por día" description={graficaRecortada ? `Solo los últimos ${MAX_DIAS_GRAFICA} días de las fechas elegidas` : undefined} />
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
          <CardHeader title="Día por día" description={graficaRecortada ? `Solo los últimos ${MAX_DIAS_GRAFICA} días de las fechas elegidas` : undefined} />
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
