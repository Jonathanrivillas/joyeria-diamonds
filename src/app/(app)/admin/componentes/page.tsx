import { ArrowRight, Ban, Check, Gem, Inbox, Plus, Save, ShoppingBag, Trash2, Wallet } from "lucide-react";
import { requireAdmin } from "@/lib/session";
import {
  ActionBar,
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardLink,
  ConfirmButton,
  DataRow,
  EmptyState,
  Icon,
  IconBadge,
  List,
  ListItem,
  Logo,
  PageContainer,
  PageHeader,
  ProgressBar,
  RemovableChip,
  Section,
  Stat,
  StatCard,
  StatGrid,
  StatPanel,
  StatusBadge,
  Table,
  Td,
  Th,
  Tr,
  iconSizes,
  type IconSize,
  type Tone,
} from "@/components/ui";
import { DemoCalendario, DemoFormularios, DemoModal, DemoSeleccion } from "./demos";

const TONOS: Tone[] = ["neutral", "brand", "success", "danger", "warning", "info"];
/** Paleta de la marca: la base de todo el sitio. */
const MARCA = [
  { hex: "#020202", clase: "bg-neutral-950", uso: "Botón principal, menú, selección (brand / neutral-950)" },
  { hex: "#A6A6A6", clase: "bg-neutral-400", uso: "Íconos secundarios, desactivado. No para texto (neutral-400)" },
  { hex: "#D9D9D9", clase: "bg-neutral-300", uso: "Bordes de campos y tarjetas (neutral-300)" },
  { hex: "#FFFFFF", clase: "bg-white", uso: "Tarjetas y formularios" },
];
/** Colores de estado: solo en insignias, avisos y cifras. */
const COLORES = [
  { nombre: "success", uso: "Cuadra, ingresos, confirmaciones", clase: "bg-success-600" },
  { nombre: "danger", uso: "Faltantes, gastos, anulaciones, errores", clase: "bg-danger-600" },
  { nombre: "warning", uso: "Pendientes, sobrantes", clase: "bg-warning-500" },
  { nombre: "info", uso: "Ayudas y explicaciones", clase: "bg-info-600" },
];

async function noHaceNada() {
  "use server";
}

export default async function ComponentesPage() {
  await requireAdmin();
  return (
    <PageContainer className="space-y-10">
      <PageHeader
        title="Sistema de diseño"
        subtitle="Todos los componentes de la aplicación en un solo lugar"
        back={{ href: "/admin", label: "Volver a Administración" }}
        help="Las pantallas se arman solo con estos componentes (src/components/ui). Si necesita algo nuevo, agréguelo allá para que se vea igual en todo el sitio."
      />

      <Section title="Colores de la marca">
        <div className="grid gap-3 sm:grid-cols-2">
          {MARCA.map((c) => (
            <Card key={c.hex} padding="sm">
              <div className="flex items-center gap-3">
                <span className={`h-10 w-10 shrink-0 rounded-xl border border-neutral-300 ${c.clase}`} />
                <div>
                  <p className="font-mono font-semibold">{c.hex}</p>
                  <p className="text-sm text-neutral-500">{c.uso}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Colores de estado">
        <div className="grid gap-3 sm:grid-cols-2">
          {COLORES.map((c) => (
            <Card key={c.nombre} padding="sm">
              <div className="flex items-center gap-3">
                <span className={`h-10 w-10 shrink-0 rounded-xl ${c.clase}`} />
                <div>
                  <p className="font-mono font-semibold">{c.nombre}</p>
                  <p className="text-sm text-neutral-500">{c.uso}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Logo">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card padding="md">
            <div className="flex flex-wrap items-end gap-6">
              <Logo size="sm" />
              <Logo size="md" />
              <Logo size="lg" />
              <Logo size="xl" />
            </div>
          </Card>
          <div className="flex flex-wrap items-end gap-6 rounded-2xl bg-neutral-950 p-5">
            <Logo size="md" />
            <Logo size="xl" />
          </div>
        </div>
      </Section>

      <Section title="Botones">
        <Card padding="md">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button icon={Check}>Principal</Button>
              <Button variant="secondary" icon={Save}>
                Secundario
              </Button>
              <Button variant="success" icon={Check}>
                Éxito
              </Button>
              <Button variant="danger" icon={Trash2}>
                Peligro
              </Button>
              <Button variant="danger-outline" icon={Ban}>
                Peligro suave
              </Button>
              <Button variant="ghost">Fantasma</Button>
              <Button variant="link">Enlace</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Pequeño</Button>
              <Button>Mediano</Button>
              <Button size="lg" icon={ShoppingBag}>
                Grande
              </Button>
              <Button icon={Plus} aria-label="Solo ícono" />
              <Button loading loadingText="Guardando...">
                Guardar
              </Button>
              <Button disabled>Desactivado</Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <ConfirmButton
                action={noHaceNada}
                label="Botón con confirmación"
                icon={<Icon icon={Ban} />}
                variant="danger-outline"
                title="¿Seguro que quiere hacer esto?"
                message="Así se pide confirmación antes de algo que no se puede deshacer."
              />
              <DemoModal />
            </div>
          </div>
        </Card>
      </Section>

      <Section title="Íconos">
        <Card padding="md">
          <div className="flex flex-wrap items-end gap-6">
            {(Object.keys(iconSizes) as IconSize[]).map((s) => (
              <div key={s} className="flex flex-col items-center gap-1">
                <Icon icon={Gem} size={s} className="text-brand-700" />
                <span className="font-mono text-sm text-neutral-500">{s}</span>
              </div>
            ))}
            {TONOS.map((t) => (
              <IconBadge key={t} icon={Wallet} tone={t} />
            ))}
          </div>
        </Card>
      </Section>

      <Section title="Insignias y avisos">
        <Card padding="md">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {TONOS.map((t) => (
                <Badge key={t} tone={t}>
                  {t}
                </Badge>
              ))}
              <Badge tone="success" solid icon={Check}>
                Cuadra
              </Badge>
              {["OK", "FALTA", "SOBRA", "ACTIVA", "ANULADA", "ABIERTO", "CERRADO"].map((e) => (
                <StatusBadge key={e} status={e} />
              ))}
            </div>
            <Alert tone="info">Aviso de ayuda.</Alert>
            <Alert tone="success">Se guardó correctamente.</Alert>
            <Alert tone="warning">Hay algo pendiente.</Alert>
            <Alert tone="danger" title="No se pudo guardar">
              Revise los datos e intente de nuevo.
            </Alert>
          </div>
        </Card>
      </Section>

      <Section title="Tarjetas y cifras">
        <StatGrid columns={4}>
          <StatCard label="Neutra" value="$ 1.200.000" detail="Detalle" />
          <StatCard label="Ventas" value="$ 3.450.000" tone="brand" />
          <StatCard label="Le queda" value="$ 2.100.000" tone="success" highlight />
          <StatCard label="Gastos" value="$ 350.000" tone="danger" />
        </StatGrid>
        <StatPanel>
          <Stat label="Vendido" value="$ 3.450.000" detail="12 facturas · 48,20 g" />
          <Stat label="Gastado" value="$ 350.000" detail="3 gastos" />
          <Stat label="Le queda" value="$ 3.100.000" detail="ventas menos gastos" />
        </StatPanel>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader title="Tarjeta con encabezado" description="Y una descripción" action={<Button variant="link">Acción</Button>} />
            <CardBody>
              <div className="space-y-2">
                <DataRow label="Fila de datos" value="$ 10.000" />
                <DataRow label="Destacada" value="$ 20.000" tone="brand" strong />
              </div>
            </CardBody>
            <CardFooter>
              <ProgressBar value={3} max={5} label="Ejemplo de avance" />
            </CardFooter>
          </Card>
          <div className="space-y-4">
            <CardLink href="/admin/componentes">
              <IconBadge icon={Gem} />
              <div>
                <p className="text-lg font-bold">Tarjeta enlace</p>
                <p className="text-neutral-600">Toda la tarjeta se puede tocar.</p>
              </div>
            </CardLink>
            {TONOS.slice(1).map((t) => (
              <Card key={t} tone={t} padding="sm">
                <p className="font-mono">Card tone=&quot;{t}&quot;</p>
              </Card>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Listas, tablas y estados vacíos">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <List>
              <ListItem href="/admin/componentes" title="Fila con enlace" meta="Información secundaria" end={<p className="text-xl font-bold">$ 250.000</p>} />
              <ListItem title="Fila anulada" meta="Se atenúa y se tacha" muted end={<Badge tone="danger">Anulada</Badge>} />
            </List>
          </Card>
          <Card>
            <EmptyState icon={Inbox} title="No hay nada todavía." description="Así se ve una lista vacía.">
              <Button icon={Plus}>Agregar</Button>
            </EmptyState>
          </Card>
        </div>
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>Categoría</Th>
                <Th numeric>Gramos</Th>
                <Th numeric>Piezas</Th>
              </tr>
            </thead>
            <tbody>
              <Tr>
                <Td>Cadenas</Td>
                <Td numeric>120,50</Td>
                <Td numeric>14</Td>
              </Tr>
              <Tr>
                <Td>Anillos</Td>
                <Td numeric>48,20</Td>
                <Td numeric>22</Td>
              </Tr>
            </tbody>
          </Table>
        </Card>
      </Section>

      <Section title="Selección">
        <Card padding="md">
          <DemoSeleccion />
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <RemovableChip href="/admin/componentes">Efectivo</RemovableChip>
            <RemovableChip href="/admin/componentes">Búsqueda: “María”</RemovableChip>
          </div>
        </Card>
        <ActionBar className="static" summary={<p><span className="font-semibold">3 piezas</span> · <span className="font-bold">$ 1.250.000</span></p>}>
          <Button iconRight={ArrowRight}>Ver la venta</Button>
        </ActionBar>
      </Section>

      <Section title="Calendario">
        <Card padding="md">
          <DemoCalendario />
        </Card>
      </Section>

      <Section title="Formularios">
        <Card padding="lg">
          <DemoFormularios />
        </Card>
      </Section>
    </PageContainer>
  );
}
