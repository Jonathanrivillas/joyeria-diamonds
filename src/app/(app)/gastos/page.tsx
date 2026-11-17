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
import { iconoGasto } from "@/components/gastos/tipos-gasto";
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

  const gastos = await db.gasto.findMany({
    where: { ...(localId ? { localId } : {}), fecha: { gte: inicioDia(desde), lte: finDia(hasta) } },
    orderBy: { fecha: "desc" },
    include: { local: true, usuario: true },
  });
  const activos = gastos.filter((g) => g.estado === "ACTIVO");
  const total = activos.reduce((a, g) => a + g.monto, 0);
  const porTipo = Object.keys(TIPOS_GASTO)
    .map((t) => ({ tipo: t, total: activos.filter((g) => g.tipo === t).reduce((a, g) => a + g.monto, 0) }))
    .filter((t) => t.total > 0)
    .sort((a, b) => b.total - a.total);

  const rangos = rangosRapidos(hoy);
  const activo = rangoActivo(rangos, desde, hasta)?.etiqueta;

  return (
    <PageContainer width="fluid">
      <PageHeader title="Gastos" help="Anote aquí todo lo que se paga con la plata del local, con la explicación de en qué se gastó." />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,34rem)_1fr]">
        <GastoForm esAdmin={s.rol === "ADMIN"} locales={locales} localDefecto={localId ?? locales[0]?.id} />

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
                    <li key={t.tipo} className="flex items-center gap-2 text-base">
                      <Icon icon={iconoGasto(t.tipo)} size="sm" className="text-neutral-500" />
                      <span className="flex-1">{TIPOS_GASTO[t.tipo]}</span>
                      <span className="font-semibold tabular-nums">{cop(t.total)}</span>
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
                      meta={[TIPOS_GASTO[g.tipo], cuando(g.fecha), g.usuario.nombre, !localId && g.local.nombre].filter(Boolean).join(" · ")}
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
