import { ChevronRight, ClipboardCheck } from "lucide-react";
import { db } from "@/lib/db";
import { requireSesion, getAlcance } from "@/lib/session";
import { aISO, inicioDia, sumarDias } from "@/lib/fechas";
import { fechaLarga, hora } from "@/lib/format";
import { Button, Card, Chip, ChipGroup, EmptyState, List, ListItem, PageContainer, PageHeader, Section } from "@/components/ui";
import { ArqueoHoyResumen, ArqueoResultadoBadge, type ArqueoLocalHoy } from "@/components/arqueo/arqueo-estado";
import { iniciarArqueo } from "./actions";

export default async function ArqueoPage({ searchParams }: { searchParams: Promise<{ dif?: string }> }) {
  const sp = await searchParams;
  const soloDiferencia = sp.dif === "1";
  const s = await requireSesion();
  const { localId, locales } = await getAlcance(s);
  const hoy = inicioDia(new Date());
  const localesVista = localId ? locales.filter((l) => l.id === localId) : locales;

  const [arqueos, deHoy] = await Promise.all([
    db.arqueo.findMany({
      where: {
        ...(localId ? { localId } : {}),
        ...(soloDiferencia ? { estado: "CERRADO", detalles: { some: { estado: { in: ["FALTA", "SOBRA"] } } } } : {}),
      },
      orderBy: { fecha: "desc" },
      take: 60,
      include: { local: true, usuario: true, detalles: { select: { estado: true } } },
    }),
    db.arqueo.findMany({
      where: { ...(localId ? { localId } : {}), OR: [{ fecha: { gte: hoy } }, { estado: "ABIERTO" }] },
      orderBy: { fecha: "desc" },
    }),
  ]);

  const estadoHoy: ArqueoLocalHoy[] = localesVista.map((l) => ({
    localId: l.id,
    nombre: l.nombre,
    abiertoId: deHoy.find((a) => a.localId === l.id && a.estado === "ABIERTO")?.id,
    cerrado: deHoy.find((a) => a.localId === l.id && a.estado === "CERRADO" && a.fecha >= hoy),
  }));

  // ---- Arqueos anteriores agrupados por día ----
  const ayer = aISO(sumarDias(hoy, -1));
  const grupos: { iso: string; titulo: string; arqueos: typeof arqueos }[] = [];
  for (const a of arqueos) {
    const iso = aISO(a.fecha);
    let g = grupos.at(-1);
    if (!g || g.iso !== iso) {
      g = { iso, titulo: iso === aISO(hoy) ? "Hoy" : iso === ayer ? "Ayer" : fechaLarga(a.fecha), arqueos: [] };
      grupos.push(g);
    }
    g.arqueos.push(a);
  }

  return (
    <PageContainer width="fluid">
      <PageHeader
        title="Arqueo"
        help="El arqueo es contar la mercancía y compararla con lo que dice el sistema, como en la planilla de papel. Se hace una vez al día."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,32rem)_1fr]">
        <ArqueoHoyResumen
          locales={estadoHoy}
          accion={(l) =>
            l.abiertoId ? (
              <Button href={`/arqueo/${l.abiertoId}`} iconRight={ChevronRight}>
                Continuar
              </Button>
            ) : (
              <form action={iniciarArqueo}>
                <input type="hidden" name="localId" value={l.localId} />
                <Button type="submit" variant={l.cerrado ? "ghost" : "primary"}>
                  {l.cerrado ? "Hacer otro" : "Empezar"}
                </Button>
              </form>
            )
          }
        />

        <Section title="Arqueos anteriores">
          <ChipGroup>
            <Chip href="/arqueo" selected={!soloDiferencia}>
              Todos
            </Chip>
            <Chip href="/arqueo?dif=1" selected={soloDiferencia}>
              Solo los que no cuadraron
            </Chip>
          </ChipGroup>

          <Card>
            {arqueos.length === 0 ? (
              soloDiferencia ? (
                <EmptyState icon={ClipboardCheck} title="Todos los arqueos cuadraron.">
                  <Button variant="secondary" href="/arqueo">
                    Ver todos
                  </Button>
                </EmptyState>
              ) : (
                <EmptyState icon={ClipboardCheck} title="Aún no hay arqueos." />
              )
            ) : (
              grupos.map((g, i) => (
                <section key={g.iso} aria-label={g.titulo} className={i > 0 ? "border-t border-neutral-200" : undefined}>
                  <h3 className={`bg-neutral-50 px-5 py-3 text-base font-bold text-neutral-800 ${i === 0 ? "rounded-t-2xl" : ""}`}>{g.titulo}</h3>
                  <List>
                    {g.arqueos.map((a) => (
                      <ListItem
                        key={a.id}
                        href={`/arqueo/${a.id}`}
                        title={localId ? hora(a.fecha) : `${a.local.nombre} · ${hora(a.fecha)}`}
                        meta={`Contó: ${a.usuario.nombre}`}
                        end={
                          <ArqueoResultadoBadge
                            cerrado={a.estado === "CERRADO"}
                            conDiferencia={a.detalles.some((d) => d.estado && d.estado !== "OK")}
                            diferenciaCg={a.pesoContadoCg - a.pesoSistemaCg}
                            corregido={a.ajustesAplicados}
                          />
                        }
                      />
                    ))}
                  </List>
                </section>
              ))
            )}
          </Card>
        </Section>
      </div>
    </PageContainer>
  );
}
