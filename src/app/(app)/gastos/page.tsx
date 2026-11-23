import { Paperclip, Ban, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { requireSesion, getAlcance } from "@/lib/session";
import { aISO, finDia, inicioDia, parseFechaISO } from "@/lib/fechas";
import { cop, cuando, plural, TIPOS_GASTO } from "@/lib/format";
import { rangoActivo, rangosRapidos } from "@/lib/rangos";
import {
  Button,
  Card,
  ConfirmButton,
  EmptyState,
  Icon,
  IconBadge,
  Input,
  List,
  ListItem,
  PageContainer,
  PageHeader,
  Section,
  Stat,
  StatPanel,
  cn,
} from "@/components/ui";
import { GRUPOS_GASTO, iconoGasto } from "@/components/gastos/tipos-gasto";
import { RangoFechas } from "@/components/filtros/rango-fechas";
import { GastoForm } from "./gasto-form";
import { anularGasto } from "./actions";

export default async function GastosPage({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string }> }) {
  const sp = await searchParams;
  const s = await requireSesion();
  const { localId, locales } = await getAlcance(s);
  const hoy = inicioDia(new Date());
  const desde = sp.desde ? parseFechaISO(sp.desde) : hoy;
  const hasta = sp.hasta ? parseFechaISO(sp.hasta) : hoy;

  const [gastos, proveedores] = await Promise.all([
    db.gasto.findMany({
      where: { ...(localId ? { localId } : {}), fecha: { gte: inicioDia(desde), lte: finDia(hasta) } },
      orderBy: { fecha: "desc" },
      include: { local: true, usuario: true, proveedor: true },
    }),
    db.proveedor.findMany({ where: { activo: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
  ]);
  const activos = gastos.filter((g) => g.estado === "ACTIVO");
  const total = activos.reduce((a, g) => a + g.monto, 0);
  const sumar = (tipos: string[]) => activos.filter((g) => tipos.includes(g.tipo)).reduce((a, g) => a + g.monto, 0);
  const porTipo = GRUPOS_GASTO.map((grupo) => ({
    grupo,
    total: sumar(grupo.subtipos ? grupo.subtipos.map((st) => st.id) : [grupo.id]),
    detalle: (grupo.subtipos ?? [])
      .map((st) => ({ id: st.id, nombre: st.nombre, total: sumar([st.id]) }))
      .filter((st) => st.total > 0)
      .sort((a, b) => b.total - a.total),
  }))
    .filter((t) => t.total > 0)
    .sort((a, b) => b.total - a.total);

  const rangos = rangosRapidos(hoy);
  const activo = rangoActivo(rangos, desde, hasta)?.etiqueta;

  return (
    <PageContainer width="fluid">
      <PageHeader title="Gastos" help="Anote aquí todo lo que se paga con la plata del local, con la explicación de en qué se gastó." />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)]">
        <GastoForm esAdmin={s.rol === "ADMIN"} locales={locales} localDefecto={localId ?? locales[0]?.id} proveedores={proveedores} />

        <Section title="Gastos anotados">
          <RangoFechas ruta="/gastos" rangos={rangos} activo={activo} desde={aISO(desde)} hasta={aISO(hasta)} max={aISO(hoy)} />

          <StatPanel columns={porTipo.length > 0 ? 2 : 1}>
            <Stat
              label={`Total gastado ${activo ? activo.toLowerCase() : "en esas fechas"}`}
              value={cop(total)}
              detail={plural(activos.length, "gasto", "gastos")}
            />
            {porTipo.length > 0 && (
              <div className="p-5">
                <p className="text-base text-neutral-600">En qué se fue</p>
                <ul className="mt-2 space-y-1.5">
                  {porTipo.map((t) => (
                    <li key={t.grupo.id} className="text-base">
                      <div className="flex items-center gap-2">
                        <Icon icon={t.grupo.icon} size="sm" className="text-neutral-500" />
                        <span className="flex-1">{t.grupo.nombre}</span>
                        <span className="font-semibold tabular-nums">{cop(t.total)}</span>
                      </div>
                      {t.detalle.length > 0 && (
                        <ul className="mt-1 space-y-1 pl-7 text-neutral-600">
                          {t.detalle.map((st) => (
                            <li key={st.id} className="flex items-center gap-2">
                              <span className="flex-1">{st.nombre}</span>
                              <span className="tabular-nums">{cop(st.total)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </StatPanel>

          <Card>
            {gastos.length === 0 ? (
              <EmptyState icon={Wallet} title={activo === "Hoy" ? "Hoy no se ha anotado ningún gasto." : "No hay gastos en estas fechas."} />
            ) : (
              <List>
                {gastos.map((g) => {
                  const anulado = g.estado === "ANULADO";
                  return (
                    <ListItem
                      key={g.id}
                      muted={anulado}
                      leading={<IconBadge icon={iconoGasto(g.tipo)} tone="neutral" size="sm" />}
                      title={<span className="whitespace-normal">{g.justificacion}</span>}
                      meta={[
                        g.proveedor ? `${TIPOS_GASTO[g.tipo] ?? g.tipo}: ${g.proveedor.nombre}` : TIPOS_GASTO[g.tipo] ?? g.tipo,
                        cuando(g.fecha), g.usuario.nombre, !localId && g.local.nombre].filter(Boolean).join(" · ")}
                      end={
                        <div className="flex items-center gap-3">
                          <p className={cn("text-xl font-bold tabular-nums", anulado && "text-neutral-500 line-through")}>{cop(g.monto)}</p>
                          {s.rol === "ADMIN" && !anulado && (
                            <ConfirmButton
                              action={anularGasto}
                              variant="danger-outline"
                              icon={<Icon icon={Ban} />}
                              aria-label="Anular gasto"
                              title="¿Anular este gasto?"
                              message={<>«{g.justificacion}» por {cop(g.monto)} dejará de contar en los totales, pero quedará guardado en el historial.</>}
                              confirmLabel="Sí, anular"
                              fields={{ id: g.id }}
                            >
                              <Input label="¿Por qué lo anula?" name="motivo" required placeholder="Ej: se anotó dos veces" />
                            </ConfirmButton>
                          )}
                        </div>
                      }
                    >
                      {anulado && <p className="text-base font-semibold text-danger-700">Anulado: {g.motivoAnulacion}</p>}
                      {g.soporte && (
                        <Button variant="link" href={`/api/soporte/${g.id}`} native target="_blank" rel="noopener" icon={Paperclip} className="mt-1">
                          Ver recibo
                        </Button>
                      )}
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Card>
        </Section>
      </div>
    </PageContainer>
  );
}
