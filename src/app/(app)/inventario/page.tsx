import Link from "next/link";
import { ArrowDown, ArrowUp, PackagePlus, ChevronRight } from "lucide-react";
import { requireSesion, getAlcance } from "@/lib/session";
import { planillaDelDia } from "@/lib/consultas";
import { aISO, inicioDia, parseFechaISO } from "@/lib/fechas";
import { gramos, entero, plural } from "@/lib/format";
import { Button, Card, Icon, NoValue, PageContainer, PageHeader, Stat, StatPanel, Table, Td, Th, Tr, cn } from "@/components/ui";
import { NavegadorDia } from "@/components/filtros/navegador-dia";

/** Columna "Queda": el dato principal, resaltado como en la planilla de papel. */
const QUEDA = "bg-neutral-100/70";
const QUEDA_TITULO = "bg-neutral-200 text-neutral-900";
/** Fila de totales: separada con una línea gruesa arriba. */
const TOTAL = "border-t-2 border-t-neutral-500 border-b-0 py-4";

export default async function InventarioPage({ searchParams }: { searchParams: Promise<{ fecha?: string }> }) {
  const sp = await searchParams;
  const s = await requireSesion();
  const { localId, locales } = await getAlcance(s);
  const hoy = inicioDia(new Date());
  const dia = parseFechaISO(sp.fecha);
  const esHoy = aISO(dia) === aISO(hoy);
  const filas = await planillaDelDia(localId, dia);

  const tot = filas.reduce(
    (a, f) => ({
      ep: a.ep + f.entradaPeso,
      ec: a.ec + f.entradaCant,
      sp: a.sp + f.salidaPeso,
      sc: a.sc + f.salidaCant,
      p: a.p + f.saldoPeso,
      c: a.c + f.saldoCant,
    }),
    { ep: 0, ec: 0, sp: 0, sc: 0, p: 0, c: 0 }
  );

  const nombreLocal = localId ? locales.find((l) => l.id === localId)?.nombre : "Todos los locales";
  const md = "hidden md:table-cell";

  return (
    <PageContainer width="fluid">
      <PageHeader
        title="Inventario"
        subtitle={nombreLocal}
        help="Es la misma planilla del papel: lo que entró, lo que salió y lo que queda de cada tipo de pieza. Toque una categoría para ver todos sus movimientos."
        actions={
          s.rol === "ADMIN" && (
            <Button href="/inventario/entradas" icon={PackagePlus}>
              Ingresar mercancía
            </Button>
          )
        }
      />

      <NavegadorDia ruta="/inventario" fecha={aISO(dia)} hoy={aISO(hoy)} />

      <StatPanel>
        <Stat label={esHoy ? "Hay en este momento" : "Quedó al final del día"} value={gramos(tot.p)} detail={`${entero(tot.c)} piezas`} />
        <Stat
          label={`Entró ${esHoy ? "hoy" : "ese día"}`}
          value={gramos(tot.ep)}
          detail={plural(tot.ec, "pieza", "piezas")}
          tone={tot.ep > 0 || tot.ec > 0 ? "success" : "neutral"}
        />
        <Stat
          label={`Salió ${esHoy ? "hoy" : "ese día"}`}
          value={gramos(tot.sp)}
          detail={plural(tot.sc, "pieza", "piezas")}
          tone={tot.sp > 0 || tot.sc > 0 ? "danger" : "neutral"}
        />
      </StatPanel>

      <Card>
        <Table stickyHeader>
          <thead>
            <tr>
              <Th rowSpan={2} sticky className="align-bottom">
                Categoría
              </Th>
              <Th colSpan={2} center divider className={md}>
                <span className="inline-flex items-center gap-1.5">
                  <Icon icon={ArrowDown} size="sm" className="text-success-600" /> Entró
                </span>
              </Th>
              <Th colSpan={2} center divider className={md}>
                <span className="inline-flex items-center gap-1.5">
                  <Icon icon={ArrowUp} size="sm" className="text-danger-600" /> Salió
                </span>
              </Th>
              <Th colSpan={2} center divider="strong" className={cn(QUEDA_TITULO, "text-lg")}>
                Queda
              </Th>
              <Th rowSpan={2} className="no-print w-10" />
            </tr>
            <tr>
              <Th numeric divider className={md}>
                Gramos
              </Th>
              <Th numeric className={md}>
                Piezas
              </Th>
              <Th numeric divider className={md}>
                Gramos
              </Th>
              <Th numeric className={md}>
                Piezas
              </Th>
              <Th numeric divider="strong" className={QUEDA_TITULO}>
                Gramos
              </Th>
              <Th numeric className={QUEDA_TITULO}>
                Piezas
              </Th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const href = `/inventario/${f.categoriaId}`;
              return (
                <Tr key={f.categoriaId}>
                  <Td sticky>
                    <Link href={href} className="block font-semibold text-neutral-900 hover:underline">
                      {f.nombre}
                    </Link>
                    {!f.controlaPeso && <span className="text-sm text-neutral-500">Se cuenta por piezas</span>}
                  </Td>
                  <Td numeric divider className={cn(md, "text-success-700")}>
                    {f.entradaPeso ? gramos(f.entradaPeso, false) : <NoValue />}
                  </Td>
                  <Td numeric className={cn(md, "text-success-700")}>
                    {f.entradaCant || <NoValue />}
                  </Td>
                  <Td numeric divider className={cn(md, "text-danger-700")}>
                    {f.salidaPeso ? gramos(f.salidaPeso, false) : <NoValue />}
                  </Td>
                  <Td numeric className={cn(md, "text-danger-700")}>
                    {f.salidaCant || <NoValue />}
                  </Td>
                  <Td numeric divider="strong" className={cn(QUEDA, "text-lg font-bold")}>
                    {f.controlaPeso ? gramos(f.saldoPeso, false) : <NoValue label="Se cuenta por piezas" />}
                  </Td>
                  <Td numeric className={cn(QUEDA, "text-lg font-bold")}>
                    {entero(f.saldoCant)}
                  </Td>
                  <Td className="no-print">
                    <Link href={href} aria-label={`Ver movimientos de ${f.nombre}`}>
                      <Icon icon={ChevronRight} className="text-neutral-400" />
                    </Link>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-neutral-50 text-lg font-bold">
              <Td sticky className={cn("bg-neutral-50 group-hover:bg-neutral-50", TOTAL)}>
                Total
              </Td>
              <Td numeric divider className={cn(md, TOTAL)}>
                {gramos(tot.ep, false)}
              </Td>
              <Td numeric className={cn(md, TOTAL)}>
                {entero(tot.ec)}
              </Td>
              <Td numeric divider className={cn(md, TOTAL)}>
                {gramos(tot.sp, false)}
              </Td>
              <Td numeric className={cn(md, TOTAL)}>
                {entero(tot.sc)}
              </Td>
              <Td numeric divider="strong" className={cn(QUEDA_TITULO, TOTAL)}>
                {gramos(tot.p)}
              </Td>
              <Td numeric className={cn(QUEDA_TITULO, TOTAL)}>
                {entero(tot.c)}
              </Td>
              <Td className={cn("no-print", TOTAL)} />
            </tr>
          </tfoot>
        </Table>
      </Card>
    </PageContainer>
  );
}
