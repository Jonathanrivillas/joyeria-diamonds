import Link from "next/link";
import clsx from "clsx";
import { ShoppingBag, ChevronRight, SlidersHorizontal } from "lucide-react";
import { db } from "@/lib/db";
import { requireSesion, getAlcance } from "@/lib/session";
import { aISO, finDia, inicioDia, parseFechaISO, sumarDias } from "@/lib/fechas";
import { cop, gramos, cuando, METODOS_PAGO, plural } from "@/lib/format";
import { PageHeader, Vacio } from "@/components/ui";

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; metodo?: string; vendedor?: string; q?: string; estado?: string }>;
}) {
  const sp = await searchParams;
  const s = await requireSesion();
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
    ...(sp.q ? { OR: [{ numero: { contains: sp.q } }, { clienteNombre: { contains: sp.q } }] } : {}),
  };

  const [ventas, usuarios] = await Promise.all([
    db.venta.findMany({
      where,
      orderBy: { fecha: "desc" },
      take: 500,
      include: { local: true, usuario: true, items: { include: { categoria: true } } },
    }),
    db.usuario.findMany({ orderBy: { nombre: "asc" }, ...(localId ? { where: { OR: [{ localId }, { rol: "ADMIN" }] } } : {}) }),
  ]);
  const activas = ventas.filter((v) => v.estado === "ACTIVA");
  const total = activas.reduce((a, v) => a + v.total, 0);
  const peso = activas.reduce((a, v) => a + v.items.reduce((b, i) => b + i.pesoCg, 0), 0);

  const rapidos = [
    { t: "Hoy", d: hoy, h: hoy },
    { t: "Ayer", d: sumarDias(hoy, -1), h: sumarDias(hoy, -1) },
    { t: "Últimos 7 días", d: sumarDias(hoy, -6), h: hoy },
    { t: "Últimos 30 días", d: sumarDias(hoy, -29), h: hoy },
  ];
  const sinFiltrosExtra = !sp.metodo && !sp.vendedor && !sp.estado && !sp.q;
  const rapidoActivo = sinFiltrosExtra ? rapidos.find((r) => aISO(r.d) === aISO(desde) && aISO(r.h) === aISO(hasta))?.t : undefined;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader titulo="Facturas" ayuda="Aquí están las ventas ya hechas. Toque una para verla, imprimirla o anularla.">
        <Link href="/ventas/nueva" className="btn-primary">
          <ShoppingBag className="h-5 w-5" /> Vender
        </Link>
      </PageHeader>

      <div className="no-print mb-4 flex flex-wrap gap-2">
        {rapidos.map((r) => (
          <Link
            key={r.t}
            href={`/ventas?desde=${aISO(r.d)}&hasta=${aISO(r.h)}`}
            className={clsx("btn", rapidoActivo === r.t ? "bg-oro-700 text-white" : "border-2 border-stone-300 bg-white hover:bg-stone-50")}
          >
            {r.t}
          </Link>
        ))}
      </div>

      <details className="card no-print mb-4" open={!sinFiltrosExtra}>
        <summary className="flex cursor-pointer items-center gap-2 px-5 py-4 text-base font-semibold text-stone-700">
          <SlidersHorizontal className="h-5 w-5" /> Buscar una factura o filtrar
        </summary>
        <form className="grid gap-4 border-t border-stone-100 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="label">Número o nombre del cliente</label>
            <input name="q" className="input" defaultValue={sp.q ?? ""} placeholder="Ej: L1-000123 o María" />
          </div>
          <div>
            <label className="label">Desde</label>
            <input type="date" name="desde" className="input" defaultValue={aISO(desde)} />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input type="date" name="hasta" className="input" defaultValue={aISO(hasta)} />
          </div>
          <div>
            <label className="label">Forma de pago</label>
            <select name="metodo" className="input" defaultValue={sp.metodo ?? ""}>
              <option value="">Todas</option>
              {Object.entries(METODOS_PAGO).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Quién vendió</label>
            <select name="vendedor" className="input" defaultValue={sp.vendedor ?? ""}>
              <option value="">Todos</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>{u.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Estado</label>
            <select name="estado" className="input" defaultValue={sp.estado ?? ""}>
              <option value="">Todas</option>
              <option value="ACTIVA">Vigentes</option>
              <option value="ANULADA">Anuladas</option>
            </select>
          </div>
          <div className="flex gap-3 sm:col-span-2 lg:col-span-3">
            <button className="btn-primary">Buscar</button>
            <Link href="/ventas" className="btn-secondary">Limpiar</Link>
          </div>
        </form>
      </details>

      <div className="mb-4 rounded-2xl bg-oro-50 px-5 py-4 text-lg">
        <span className="font-bold">{plural(activas.length, "factura", "facturas")}</span> por{" "}
        <span className="font-bold text-oro-800">{cop(total)}</span> · {gramos(peso)} vendidos
      </div>

      <div className="card">
        {ventas.length === 0 ? (
          <Vacio texto="No hay facturas en estas fechas.">
            <Link href="/ventas/nueva" className="btn-primary">Hacer una venta</Link>
          </Vacio>
        ) : (
          <ul className="divide-y divide-stone-100">
            {ventas.map((v) => {
              const anulada = v.estado === "ANULADA";
              return (
                <li key={v.id}>
                  <Link href={`/ventas/${v.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-stone-50">
                    <div className="min-w-0 flex-1">
                      <p className={clsx("truncate text-lg font-semibold", anulada && "text-stone-400 line-through")}>
                        {v.items.map((i) => i.categoria.nombre).join(", ")}
                      </p>
                      <p className="text-base text-stone-500">
                        {cuando(v.fecha)} · {v.numero} · {METODOS_PAGO[v.metodoPago]}
                        {v.clienteNombre && ` · ${v.clienteNombre}`}
                        {!localId && ` · ${v.local.nombre}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={clsx("text-xl font-bold tabular-nums", anulada && "text-stone-400 line-through")}>{cop(v.total)}</p>
                      {anulada ? (
                        <p className="text-sm font-bold text-red-700">ANULADA</p>
                      ) : (
                        <p className="text-sm text-stone-500">{gramos(v.items.reduce((a, i) => a + i.pesoCg, 0))}</p>
                      )}
                    </div>
                    <ChevronRight className="h-6 w-6 shrink-0 text-stone-400" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
