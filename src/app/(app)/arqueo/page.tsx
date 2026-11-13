import Link from "next/link";
import clsx from "clsx";
import { ClipboardCheck, CheckCircle2, ChevronRight, AlertCircle } from "lucide-react";
import { db } from "@/lib/db";
import { requireSesion, getAlcance } from "@/lib/session";
import { inicioDia } from "@/lib/fechas";
import { cuando, gramos } from "@/lib/format";
import { PageHeader, Vacio } from "@/components/ui";
import { iniciarArqueo } from "./actions";

export default async function ArqueoPage() {
  const s = await requireSesion();
  const { localId, locales } = await getAlcance(s);
  const hoy = inicioDia(new Date());
  const localesVista = localId ? locales.filter((l) => l.id === localId) : locales;

  const [arqueos, deHoy] = await Promise.all([
    db.arqueo.findMany({
      where: localId ? { localId } : {},
      orderBy: { fecha: "desc" },
      take: 60,
      include: { local: true, usuario: true, detalles: { select: { estado: true } } },
    }),
    db.arqueo.findMany({ where: { ...(localId ? { localId } : {}), OR: [{ fecha: { gte: hoy } }, { estado: "ABIERTO" }] }, orderBy: { fecha: "desc" } }),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        titulo="Arqueo"
        ayuda="El arqueo es contar la mercancía y compararla con lo que dice el sistema, como en la planilla de papel. Se hace una vez al día."
      />

      <div className="mb-8 space-y-4">
        {localesVista.map((l) => {
          const abierto = deHoy.find((a) => a.localId === l.id && a.estado === "ABIERTO");
          const hecho = deHoy.find((a) => a.localId === l.id && a.estado === "CERRADO" && a.fecha >= hoy);
          return (
            <div key={l.id} className={clsx("card flex flex-wrap items-center gap-4 p-6", !hecho && "border-2 border-oro-300")}>
              {hecho && !abierto ? (
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              ) : abierto ? (
                <AlertCircle className="h-10 w-10 text-amber-600" />
              ) : (
                <ClipboardCheck className="h-10 w-10 text-oro-600" />
              )}
              <div className="min-w-[14rem] flex-1">
                <p className="text-xl font-bold">
                  {localesVista.length > 1 ? l.nombre : "Arqueo de hoy"}
                </p>
                <p className="text-lg text-stone-600">
                  {abierto
                    ? "Hay un arqueo empezado sin terminar."
                    : hecho
                      ? hecho.pesoContadoCg === hecho.pesoSistemaCg
                        ? "El arqueo de hoy ya está hecho. Todo cuadró ✓"
                        : `El arqueo de hoy ya está hecho, con diferencia de ${gramos(hecho.pesoContadoCg - hecho.pesoSistemaCg)}.`
                      : "Todavía no se ha hecho el arqueo de hoy."}
                </p>
              </div>
              {abierto ? (
                <Link href={`/arqueo/${abierto.id}`} className="btn-primary btn-grande">
                  Continuar el arqueo
                </Link>
              ) : (
                <form action={iniciarArqueo}>
                  <input type="hidden" name="localId" value={l.id} />
                  <button className={hecho ? "btn-secondary" : "btn-primary btn-grande"}>
                    {hecho ? "Hacer otro arqueo" : "Empezar el arqueo"}
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>

      <h2 className="mb-3 text-xl font-bold text-stone-700">Arqueos anteriores</h2>
      <div className="card">
        {arqueos.length === 0 ? (
          <Vacio texto="Aún no hay arqueos." />
        ) : (
          <ul className="divide-y divide-stone-100">
            {arqueos.map((a) => {
              const dif = a.pesoContadoCg - a.pesoSistemaCg;
              const conDif = a.detalles.some((d) => d.estado && d.estado !== "OK");
              const cerrado = a.estado === "CERRADO";
              return (
                <li key={a.id}>
                  <Link href={`/arqueo/${a.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-stone-50">
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-semibold">{cuando(a.fecha)}</p>
                      <p className="text-base text-stone-500">
                        {a.usuario.nombre}
                        {!localId && ` · ${a.local.nombre}`}
                      </p>
                    </div>
                    {!cerrado ? (
                      <span className="badge bg-amber-100 text-amber-900">Sin terminar</span>
                    ) : conDif ? (
                      <span className="badge bg-red-100 text-red-800">
                        Diferencia {gramos(dif)}
                        {a.ajustesAplicados ? " · corregido" : ""}
                      </span>
                    ) : (
                      <span className="badge bg-emerald-100 text-emerald-800">✓ Cuadró</span>
                    )}
                    <ChevronRight className="h-6 w-6 text-stone-400" />
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
