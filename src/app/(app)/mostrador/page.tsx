import Link from "next/link";
import { Calculator, FileText, Printer, Receipt, ShoppingBag } from "lucide-react";
import { db } from "@/lib/db";
import { requirePermiso } from "@/lib/session";
import { puedeVer } from "@/lib/permisos";
import { finDia, inicioDia } from "@/lib/fechas";
import { cop, cuando, fechaLarga, gramos, plural, saludo } from "@/lib/format";
import { precioDelDia } from "@/lib/precio";
import { letraBonita, FRASE_NEGOCIO } from "@/lib/fuentes";
import { Button, Card, CardHeader, EmptyState, Icon, List, PageContainer, PageHeader, Stat, StatPanel, cn } from "@/components/ui";
import { VentaFila } from "@/components/ventas/venta-fila";

/** Botón grande del mostrador: ícono, título y una línea que dice para qué sirve. */
function Accion({ href, icon, titulo, texto, principal }: { href: string; icon: typeof ShoppingBag; titulo: string; texto: string; principal?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-4 rounded-2xl border p-5 transition active:scale-[0.98] sm:flex-col sm:p-6 sm:text-center",
        principal ? "border-brand-800 bg-brand-800 text-white hover:bg-brand-900" : "border-neutral-300 bg-white hover:border-neutral-500 hover:bg-neutral-50"
      )}
    >
      <Icon icon={icon} size="xl" className="shrink-0" />
      <span>
        <span className="block text-xl font-bold">{titulo}</span>
        <span className={cn("block text-base", principal ? "text-brand-100" : "text-neutral-500")}>{texto}</span>
      </span>
    </Link>
  );
}

/**
 * Pantalla de entrada de la vendedora: el precio del gramo de hoy en grande, sus botones de
 * siempre (vender, calcular un precio, factura electrónica) y SUS ventas de hoy.
 */
export default async function MostradorPage() {
  const s = await requirePermiso("vender");
  const hoy = new Date();
  const [precio, ventas] = await Promise.all([
    precioDelDia(),
    db.venta.findMany({
      where: { usuarioId: s.id, fecha: { gte: inicioDia(hoy), lte: finDia(hoy) } },
      orderBy: { fecha: "desc" },
      include: { local: true, items: { include: { categoria: true } } },
    }),
  ]);
  const activas = ventas.filter((v) => v.estado === "ACTIVA");
  const total = activas.reduce((a, v) => a + v.total, 0);
  const peso = activas.reduce((a, v) => a + v.items.reduce((b, i) => b + i.pesoCg, 0), 0);
  const ultima = activas[0];
  const verTotales = puedeVer(s, "totales");
  const primerNombre = s.nombre.split(" ")[0];

  return (
    <PageContainer width="fluid" className="space-y-6">
      <PageHeader
        eyebrow={fechaLarga(hoy)}
        title={`${saludo()}, ${primerNombre}`}
        center={<p className={`${letraBonita.className} text-[5.8vw] leading-tight text-brand-700 sm:text-3xl`}>{FRASE_NEGOCIO}</p>}
      />

      {/* Pantalla ancha: a la izquierda lo de vender; a la derecha mis ventas. En celular, una columna. */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <div className="space-y-6">
      {/* Lo que más preguntan los clientes: el precio del gramo de hoy. */}
      <Card padding="lg" className="text-center">
        <p className="text-lg text-neutral-600">Precio del gramo hoy</p>
        {precio.valor > 0 ? (
          <p className="mt-1 text-5xl font-bold tabular-nums sm:text-6xl">{cop(precio.valor)}</p>
        ) : (
          <p className="mt-2 text-xl font-semibold text-warning-800">El administrador todavía no ha puesto el precio.</p>
        )}
        {precio.valor > 0 && !precio.confirmadoHoy && (
          <p className="mt-2 text-base text-warning-800">El administrador aún no lo confirma hoy{precio.fecha ? ` (lo puso ${cuando(precio.fecha)})` : ""}.</p>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Accion href="/ventas/nueva" icon={ShoppingBag} titulo="Nueva venta" texto="Cobrar piezas o trabajos" principal />
        <Accion href="/mostrador/calcular" icon={Calculator} titulo="¿Cuánto vale?" texto="Calcular el precio para el cliente" />
        <Accion href="/ventas/nueva?fe=1" icon={FileText} titulo="Factura electrónica" texto="Venta con factura para la DIAN" />
      </div>

      {verTotales && (
        <StatPanel columns={3}>
          <Stat label="Vendí hoy" value={cop(total)} />
          <Stat label="Facturas" value={activas.length} />
          <Stat label="Oro vendido" value={gramos(peso)} />
        </StatPanel>
      )}
      </div>

      <Card>
        <CardHeader
          title="Mis ventas de hoy"
          description={ventas.length ? plural(activas.length, "factura", "facturas") : undefined}
          action={
            ultima && (
              <Button href={`/ventas/${ultima.id}?imprimir=1`} variant="secondary" icon={Printer}>
                Reimprimir la última
              </Button>
            )
          }
        />
        {ventas.length === 0 ? (
          <EmptyState icon={Receipt} title="Todavía no ha hecho ventas hoy." description="Cuando venda, aquí aparecen sus facturas para verlas o imprimirlas." />
        ) : (
          <List>
            {ventas.map((v) => (
              <VentaFila key={v.id} venta={v} soloHora />
            ))}
          </List>
        )}
      </Card>
      </div>
    </PageContainer>
  );
}
