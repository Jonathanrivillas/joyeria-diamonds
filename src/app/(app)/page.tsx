import Link from "next/link";
import clsx from "clsx";
import { ShoppingBag, Wallet, ClipboardCheck, Boxes, CheckCircle2, AlertCircle, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { requireSesion, getAlcance } from "@/lib/session";
import { resumenRango } from "@/lib/consultas";
import { finDia, inicioDia } from "@/lib/fechas";
import { cop, gramos, entero, fechaLarga, hora, plural, saludo } from "@/lib/format";
import { Accion } from "@/components/ui";

export default async function InicioPage() {
  const s = await requireSesion();
  const { localId, locales } = await getAlcance(s);
  const hoy = inicioDia(new Date());
  const whereLocal = localId ? { localId } : {};
  const localesVista = localId ? locales.filter((l) => l.id === localId) : locales;

  const [res, stock, arqueosHoy, ventasHoy] = await Promise.all([
    resumenRango(localId, hoy, finDia(hoy)),
    db.existencia.aggregate({ where: whereLocal, _sum: { pesoCg: true, cantidad: true } }),
    db.arqueo.findMany({ where: { ...whereLocal, fecha: { gte: hoy } }, orderBy: { fecha: "desc" } }),
    db.venta.findMany({
      where: { ...whereLocal, fecha: { gte: hoy } },
      orderBy: { fecha: "desc" },
      take: 5,
      include: { local: true, items: { include: { categoria: true } } },
    }),
  ]);

  const primerNombre = s.nombre.split(/[ (]/)[0];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="text-lg text-stone-500">{fechaLarga(new Date())}</p>
        <h1 className="text-2xl font-bold sm:text-3xl">
          {saludo()}, {primerNombre}
        </h1>
      </div>

      {/* ¿Qué quiere hacer? */}
      <section>
        <h2 className="mb-3 text-xl font-bold text-stone-700">¿Qué quiere hacer?</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Accion href="/ventas/nueva" titulo="Vender" texto="Hacer una factura nueva" icon={ShoppingBag} destacado />
          <Accion href="/gastos" titulo="Anotar un gasto" texto="Registrar en qué se gastó plata" icon={Wallet} />
          <Accion href="/arqueo" titulo="Hacer el arqueo" texto="Contar la mercancía del día" icon={ClipboardCheck} />
          <Accion href="/inventario" titulo="Ver inventario" texto="Cuánto oro y cuántas piezas hay" icon={Boxes} />
        </div>
      </section>

      {/* Así va el día */}
      <section>
        <h2 className="mb-3 text-xl font-bold text-stone-700">Así va el día de hoy</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="card p-5">
            <p className="text-base text-stone-600">Lleva vendido</p>
            <p className="mt-1 text-2xl font-bold text-oro-800 tabular-nums">{cop(res.totalVentas)}</p>
            <p className="mt-1 text-base text-stone-500">
              en {plural(res.numVentas, "factura", "facturas")} · {gramos(res.gramosVendidos)}
            </p>
          </div>
          <div className="card p-5">
            <p className="text-base text-stone-600">Ha gastado</p>
            <p className="mt-1 text-2xl font-bold text-red-700 tabular-nums">{cop(res.totalGastos)}</p>
            <p className="mt-1 text-base text-stone-500">{plural(res.numGastos, "gasto anotado", "gastos anotados")}</p>
          </div>
          <div className={clsx("card p-5", res.neto >= 0 ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50")}>
            <p className="text-base text-stone-700">Le queda (ventas menos gastos)</p>
            <p className={clsx("mt-1 text-2xl font-bold tabular-nums", res.neto >= 0 ? "text-emerald-800" : "text-red-700")}>{cop(res.neto)}</p>
          </div>
          <div className="card p-5">
            <p className="text-base text-stone-600">Hay en inventario</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{gramos(stock._sum.pesoCg ?? 0)}</p>
            <p className="mt-1 text-base text-stone-500">{entero(stock._sum.cantidad ?? 0)} piezas</p>
          </div>
        </div>
      </section>

      {/* Arqueo de hoy */}
      <section className="grid gap-4 md:grid-cols-2">
        {localesVista.map((l) => {
          const a = arqueosHoy.find((x) => x.localId === l.id);
          const hecho = a?.estado === "CERRADO";
          const cuadra = hecho && a.pesoContadoCg === a.pesoSistemaCg;
          return (
            <Link
              key={l.id}
              href={a ? `/arqueo/${a.id}` : "/arqueo"}
              className={clsx(
                "card flex items-center gap-4 p-5 transition hover:shadow-md",
                !hecho && "border-2 border-amber-300 bg-amber-50"
              )}
            >
              {hecho ? (
                <CheckCircle2 className={clsx("h-9 w-9 shrink-0", cuadra ? "text-emerald-600" : "text-red-600")} />
              ) : (
                <AlertCircle className="h-9 w-9 shrink-0 text-amber-600" />
              )}
              <div className="flex-1">
                <p className="text-lg font-bold">
                  Arqueo de hoy{localesVista.length > 1 ? ` · ${l.nombre}` : ""}
                </p>
                <p className="text-base text-stone-600">
                  {!a
                    ? "Todavía no se ha hecho. Toque aquí para empezarlo."
                    : !hecho
                      ? "Está empezado pero sin terminar. Toque para continuar."
                      : cuadra
                        ? "Hecho. Todo cuadró ✓"
                        : `Hecho, con una diferencia de ${gramos(a.pesoContadoCg - a.pesoSistemaCg)}.`}
                </p>
              </div>
              <ChevronRight className="h-6 w-6 text-stone-400" />
            </Link>
          );
        })}
      </section>

      {/* Ventas de hoy */}
      <section className="card">
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <h2 className="text-xl font-bold">Ventas de hoy</h2>
          <Link href="/ventas" className="font-semibold text-oro-800 hover:underline">Ver todas las facturas</Link>
        </div>
        {ventasHoy.length === 0 ? (
          <p className="px-5 py-8 text-center text-lg text-stone-500">Hoy todavía no hay ventas.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {ventasHoy.map((v) => (
              <li key={v.id}>
                <Link href={`/ventas/${v.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-stone-50">
                  <span className="w-20 shrink-0 text-base text-stone-500">{hora(v.fecha)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {v.items.map((i) => i.categoria.nombre).join(", ")}
                    </span>
                    <span className="block text-sm text-stone-500">
                      Factura {v.numero}
                      {!localId && ` · ${v.local.nombre}`}
                      {v.estado === "ANULADA" && <span className="font-semibold text-red-700"> · ANULADA</span>}
                    </span>
                  </span>
                  <span className={clsx("text-lg font-bold tabular-nums", v.estado === "ANULADA" && "text-stone-400 line-through")}>
                    {cop(v.total)}
                  </span>
                  <ChevronRight className="h-5 w-5 text-stone-400" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
