import Link from "next/link";
import clsx from "clsx";
import { PackagePlus, ChevronRight } from "lucide-react";
import { requireSesion, getAlcance } from "@/lib/session";
import { planillaDelDia } from "@/lib/consultas";
import { aISO, inicioDia, parseFechaISO, sumarDias } from "@/lib/fechas";
import { gramos, entero, fechaLarga } from "@/lib/format";
import { PageHeader } from "@/components/ui";

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
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

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        titulo="Inventario"
        subtitulo={nombreLocal}
        ayuda="Es la misma planilla del papel: lo que entró, lo que salió y lo que queda de cada tipo de pieza. Toque una categoría para ver todos sus movimientos."
      >
        {s.rol === "ADMIN" && (
          <Link href="/inventario/entradas" className="btn-primary">
            <PackagePlus className="h-5 w-5" /> Ingresar mercancía
          </Link>
        )}
      </PageHeader>

      {/* Día */}
      <div className="no-print mb-5 flex flex-wrap items-center gap-3">
        <Link href={`/inventario?fecha=${aISO(sumarDias(dia, -1))}`} className="btn-secondary">← Día anterior</Link>
        <p className="text-xl font-bold">{esHoy ? `Hoy, ${fechaLarga(dia).toLowerCase()}` : fechaLarga(dia)}</p>
        {!esHoy && (
          <>
            <Link href={`/inventario?fecha=${aISO(sumarDias(dia, 1))}`} className="btn-secondary">Día siguiente →</Link>
            <Link href="/inventario" className="btn-secondary">Volver a hoy</Link>
          </>
        )}
        <form className="ml-auto flex items-center gap-2">
          <input type="date" name="fecha" defaultValue={aISO(dia)} max={aISO(hoy)} className="input w-auto" aria-label="Escoger fecha" />
          <button className="btn-secondary">Ver ese día</button>
        </form>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <div className="card border-2 border-oro-300 bg-oro-50 p-5">
          <p className="text-base text-stone-700">{esHoy ? "Hay en este momento" : "Quedó al final del día"}</p>
          <p className="text-2xl font-bold text-oro-900 tabular-nums">{gramos(tot.p)}</p>
          <p className="text-base text-stone-600">{entero(tot.c)} piezas</p>
        </div>
        <div className="card p-5">
          <p className="text-base text-stone-600">Entró {esHoy ? "hoy" : "ese día"}</p>
          <p className="text-2xl font-bold text-emerald-700 tabular-nums">{gramos(tot.ep)}</p>
          <p className="text-base text-stone-500">{entero(tot.ec)} piezas</p>
        </div>
        <div className="card p-5">
          <p className="text-base text-stone-600">Salió {esHoy ? "hoy" : "ese día"}</p>
          <p className="text-2xl font-bold text-red-700 tabular-nums">{gramos(tot.sp)}</p>
          <p className="text-base text-stone-500">{entero(tot.sc)} piezas</p>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="tabla">
          <thead>
            <tr>
              <th rowSpan={2} className="align-bottom">Categoría</th>
              <th colSpan={2} className="hidden text-center md:table-cell">Entró</th>
              <th colSpan={2} className="hidden text-center md:table-cell">Salió</th>
              <th colSpan={2} className="text-center !bg-oro-100 !text-oro-900">Queda</th>
              <th rowSpan={2} className="no-print w-8"></th>
            </tr>
            <tr>
              <th className="num hidden md:table-cell">Gramos</th>
              <th className="num hidden md:table-cell">Piezas</th>
              <th className="num hidden md:table-cell">Gramos</th>
              <th className="num hidden md:table-cell">Piezas</th>
              <th className="num !bg-oro-100 !text-oro-900">Gramos</th>
              <th className="num !bg-oro-100 !text-oro-900">Piezas</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const href = `/inventario/${f.categoriaId}`;
              return (
                <tr key={f.categoriaId} className="cursor-pointer">
                  <td>
                    <Link href={href} className="block font-semibold text-stone-900 hover:text-oro-800 hover:underline">
                      {f.nombre}
                    </Link>
                    {!f.controlaPeso && <span className="text-sm text-stone-500">Se cuenta por piezas</span>}
                  </td>
                  <td className="num hidden text-emerald-700 md:table-cell">{f.entradaPeso ? gramos(f.entradaPeso, false) : ""}</td>
                  <td className="num hidden text-emerald-700 md:table-cell">{f.entradaCant || ""}</td>
                  <td className="num hidden text-red-700 md:table-cell">{f.salidaPeso ? gramos(f.salidaPeso, false) : ""}</td>
                  <td className="num hidden text-red-700 md:table-cell">{f.salidaCant || ""}</td>
                  <td className={clsx("num bg-oro-50/60 text-lg font-bold")}>{f.controlaPeso ? gramos(f.saldoPeso, false) : "—"}</td>
                  <td className="num bg-oro-50/60 text-lg font-bold">{entero(f.saldoCant)}</td>
                  <td className="no-print">
                    <Link href={href} aria-label={`Ver movimientos de ${f.nombre}`}>
                      <ChevronRight className="h-5 w-5 text-stone-400" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="text-lg font-bold">
              <td className="px-4 py-4">TOTAL</td>
              <td className="num hidden px-4 md:table-cell">{gramos(tot.ep, false)}</td>
              <td className="num hidden px-4 md:table-cell">{entero(tot.ec)}</td>
              <td className="num hidden px-4 md:table-cell">{gramos(tot.sp, false)}</td>
              <td className="num hidden px-4 md:table-cell">{entero(tot.sc)}</td>
              <td className="num bg-oro-100 px-4 text-oro-900">{gramos(tot.p)}</td>
              <td className="num bg-oro-100 px-4 text-oro-900">{entero(tot.c)}</td>
              <td className="no-print"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
