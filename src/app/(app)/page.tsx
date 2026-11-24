import type { LucideIcon } from "lucide-react";
import { db } from "@/lib/db";
import { requirePermiso, getAlcance } from "@/lib/session";
import { puedeVer } from "@/lib/permisos";
import { resumenRango } from "@/lib/consultas";
import { finDia, inicioDia } from "@/lib/fechas";
import { cop, cuando, gramos, entero, fechaLarga, plural, saludo } from "@/lib/format";
import { precioDelDia } from "@/lib/precio";
import { PrecioDelDia } from "@/components/precio/precio-del-dia";
import { Button, Card, CardHeader, CardLink, Icon, List, PageContainer, PageHeader, Section, Stat, StatPanel } from "@/components/ui";
import { MODULOS } from "@/components/layout/navegacion";
import { ArqueoHoyResumen } from "@/components/arqueo/arqueo-estado";
import { VentaFila } from "@/components/ventas/venta-fila";
import { letraBonita, FRASE_NEGOCIO } from "@/lib/fuentes";

/** Acceso rápido a un módulo: liviano, con flecha, para no competir con "Nueva venta". */
function Acceso({ href, titulo, texto, icon }: { href: string; titulo: string; texto: string; icon: LucideIcon }) {
  return (
    <CardLink href={href}>
      <Icon icon={icon} size="lg" className="text-neutral-700" />
      <div className="min-w-0">
        <p className="text-lg font-bold">{titulo}</p>
        <p className="text-base text-neutral-500">{texto}</p>
      </div>
    </CardLink>
  );
}

export default async function InicioPage() {
  const s = await requirePermiso("inicio");
  const { localId, locales } = await getAlcance(s);
  const hoy = inicioDia(new Date());
  const whereLocal = localId ? { localId } : {};
  const localesVista = localId ? locales.filter((l) => l.id === localId) : locales;

  const [precio, res, stock, arqueos, ventasHoy] = await Promise.all([
    precioDelDia(),
    resumenRango(localId, hoy, finDia(hoy)),
    db.existencia.aggregate({ where: whereLocal, _sum: { pesoCg: true, cantidad: true } }),
    db.arqueo.findMany({
      where: { ...whereLocal, OR: [{ fecha: { gte: hoy } }, { estado: "ABIERTO" }] },
      orderBy: { fecha: "desc" },
    }),
    db.venta.findMany({
      where: { ...whereLocal, fecha: { gte: hoy } },
      orderBy: { fecha: "desc" },
      take: 5,
      include: { local: true, items: { include: { categoria: true } } },
    }),
  ]);

  const primerNombre = s.nombre.split(/[ (]/)[0];
  const hayMovimientos = res.numVentas > 0 || res.numGastos > 0;
  const arqueoPorLocal = localesVista.map((l) => ({
    localId: l.id,
    nombre: l.nombre,
    abiertoId: arqueos.find((a) => a.localId === l.id && a.estado === "ABIERTO")?.id,
    cerrado: arqueos.find((a) => a.localId === l.id && a.estado === "CERRADO" && a.fecha >= hoy),
  }));

  return (
    <PageContainer className="space-y-8">
      <PageHeader
        eyebrow={fechaLarga(new Date())}
        title={`${saludo()}, ${primerNombre}`}
        center={
          <p className={`${letraBonita.className} text-2xl leading-tight text-neutral-700 sm:text-3xl`}>
            {FRASE_NEGOCIO}
          </p>
        }
        actions={
          puedeVer(s, "vender") && (
            <Button href={MODULOS.vender.href} size="lg" icon={MODULOS.vender.icon}>
              Nueva venta
            </Button>
          )
        }
      />

      {/* Lo pendiente va primero: el precio del gramo de hoy y el arqueo. */}
      <PrecioDelDia
        valor={precio.valor}
        confirmadoHoy={precio.confirmadoHoy}
        ultimaVez={precio.fecha ? cuando(precio.fecha) : null}
        puedeCambiar={s.rol === "ADMIN"}
      />
      <ArqueoHoyResumen locales={arqueoPorLocal} />

      <Section title="Resumen de hoy">
        {hayMovimientos ? (
          <StatPanel>
            <Stat
              label="Vendido"
              value={cop(res.totalVentas)}
              detail={`${plural(res.numVentas, "factura", "facturas")} · ${gramos(res.gramosVendidos)}`}
            />
            <Stat label="Gastado" value={cop(res.totalGastos)} detail={plural(res.numGastos, "gasto", "gastos")} />
            <Stat label="Le queda" value={cop(res.neto)} tone={res.neto < 0 ? "danger" : "neutral"} detail="ventas menos gastos" />
          </StatPanel>
        ) : (
          <Card padding="md">
            <p className="text-lg text-neutral-600">Aún no hay ventas ni gastos hoy. Aquí verá cuánto lleva vendido y cuánto le queda.</p>
          </Card>
        )}
      </Section>

      <Section title="Accesos rápidos">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {puedeVer(s, "gastos") && <Acceso href={MODULOS.gastos.href} titulo="Anotar un gasto" texto="En qué se gastó plata" icon={MODULOS.gastos.icon} />}
          {puedeVer(s, "arqueo") && <Acceso href={MODULOS.arqueo.href} titulo="Hacer el arqueo" texto="Contar la mercancía" icon={MODULOS.arqueo.icon} />}
          {puedeVer(s, "inventario") && (
          <Acceso
            href={MODULOS.inventario.href}
            titulo="Ver inventario"
            texto={`${gramos(stock._sum.pesoCg ?? 0)} · ${entero(stock._sum.cantidad ?? 0)} piezas`}
            icon={MODULOS.inventario.icon}
          />
          )}
        </div>
      </Section>

      {ventasHoy.length > 0 && (
        <Card as="section">
          <CardHeader
            title="Ventas de hoy"
            action={
              puedeVer(s, "facturas") && (
                <Button variant="link" href={MODULOS.facturas.href}>
                  Ver todas las facturas
                </Button>
              )
            }
          />
          <List>
            {ventasHoy.map((v) => (
              <VentaFila key={v.id} venta={v} mostrarLocal={!localId} />
            ))}
          </List>
        </Card>
      )}
    </PageContainer>
  );
}
