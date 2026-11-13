import Link from "next/link";
import clsx from "clsx";
import { Paperclip, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireSesion, getAlcance } from "@/lib/session";
import { aISO, finDia, inicioDia, parseFechaISO, sumarDias } from "@/lib/fechas";
import { cop, cuando, TIPOS_GASTO } from "@/lib/format";
import { PageHeader, Vacio } from "@/components/ui";
import { BotonConfirmar } from "@/components/confirmar";
import { GastoForm } from "./gasto-form";
import { eliminarGasto } from "./actions";

export default async function GastosPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  const sp = await searchParams;
  const s = await requireSesion();
  const { localId, locales } = await getAlcance(s);
  const hoy = inicioDia(new Date());
  const desde = sp.desde ? parseFechaISO(sp.desde) : hoy;
  const hasta = sp.hasta ? parseFechaISO(sp.hasta) : hoy;

  const gastos = await db.gasto.findMany({
    where: { ...(localId ? { localId } : {}), fecha: { gte: inicioDia(desde), lte: finDia(hasta) } },
    orderBy: { fecha: "desc" },
    include: { local: true, usuario: true },
  });
  const total = gastos.reduce((a, g) => a + g.monto, 0);
  const porTipo = Object.keys(TIPOS_GASTO)
    .map((t) => ({ tipo: t, total: gastos.filter((g) => g.tipo === t).reduce((a, g) => a + g.monto, 0) }))
    .filter((t) => t.total > 0);

  const rapidos = [
    { t: "Hoy", d: hoy, h: hoy },
    { t: "Ayer", d: sumarDias(hoy, -1), h: sumarDias(hoy, -1) },
    { t: "Últimos 7 días", d: sumarDias(hoy, -6), h: hoy },
    { t: "Últimos 30 días", d: sumarDias(hoy, -29), h: hoy },
  ];
  const activo = rapidos.find((r) => aISO(r.d) === aISO(desde) && aISO(r.h) === aISO(hasta))?.t;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader titulo="Gastos" ayuda="Anote aquí todo lo que se paga con la plata del local, con la explicación de en qué se gastó." />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,30rem)_1fr]">
        <GastoForm esAdmin={s.rol === "ADMIN"} locales={locales} localDefecto={localId ?? locales[0]?.id} />

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Gastos anotados</h2>
          <div className="no-print flex flex-wrap gap-2">
            {rapidos.map((r) => (
              <Link
                key={r.t}
                href={`/gastos?desde=${aISO(r.d)}&hasta=${aISO(r.h)}`}
                className={clsx("btn", activo === r.t ? "bg-oro-700 text-white" : "border-2 border-stone-300 bg-white hover:bg-stone-50")}
              >
                {r.t}
              </Link>
            ))}
          </div>

          <div className="rounded-2xl bg-red-50 px-5 py-4">
            <p className="text-lg">
              Total gastado {activo ? activo.toLowerCase() : "en el periodo"}: <span className="text-2xl font-bold text-red-700">{cop(total)}</span>
            </p>
            {porTipo.length > 1 && (
              <p className="mt-1 text-base text-stone-600">
                {porTipo.map((t) => `${TIPOS_GASTO[t.tipo]} ${cop(t.total)}`).join(" · ")}
              </p>
            )}
          </div>

          <div className="card">
            {gastos.length === 0 ? (
              <Vacio texto={activo === "Hoy" ? "Hoy no se ha anotado ningún gasto." : "No hay gastos en estas fechas."} />
            ) : (
              <ul className="divide-y divide-stone-100">
                {gastos.map((g) => (
                  <li key={g.id} className="flex items-start gap-4 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-semibold">{g.justificacion}</p>
                      <p className="text-base text-stone-500">
                        {TIPOS_GASTO[g.tipo]} · {cuando(g.fecha)} · {g.usuario.nombre}
                        {!localId && ` · ${g.local.nombre}`}
                      </p>
                      {g.soporte && (
                        <a href={`/api/soporte/${g.id}`} target="_blank" rel="noopener" className="mt-1 inline-flex items-center gap-1 text-base font-medium text-oro-800 hover:underline">
                          <Paperclip className="h-4 w-4" /> Ver recibo
                        </a>
                      )}
                    </div>
                    <p className="text-xl font-bold tabular-nums">{cop(g.monto)}</p>
                    {s.rol === "ADMIN" && (
                      <BotonConfirmar
                        action={eliminarGasto}
                        claseBoton="btn-secondary min-h-[2.75rem] px-3 text-red-700"
                        textoBoton={<Trash2 className="h-5 w-5" aria-label="Borrar" />}
                        titulo="¿Borrar este gasto?"
                        mensaje={<>Se borrará «{g.justificacion}» por {cop(g.monto)}. Esto no se puede deshacer.</>}
                        textoConfirmar="Sí, borrar"
                        campos={{ id: g.id }}
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
