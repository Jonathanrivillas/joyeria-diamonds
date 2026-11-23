import { notFound } from "next/navigation";
import { Home, ShoppingBag, Ban, RotateCw, FileCheck } from "lucide-react";
import { db } from "@/lib/db";
import { requireSesion } from "@/lib/session";
import { cop, gramos, fechaHora, METODOS_PAGO, canalVenta } from "@/lib/format";
import {
  Alert,
  Button,
  Card,
  ConfirmButton,
  DataRow,
  Icon,
  Input,
  LabeledValue,
  Logo,
  PageContainer,
  PageHeader,
  PrintButton,
  StatusBadge,
  SubmitButton,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { anularVenta, reintentarFactura } from "../actions";

export default async function VentaDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nueva?: string; cambio?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const s = await requireSesion();
  const v = await db.venta.findUnique({
    where: { id: Number(id) },
    include: { local: true, usuario: true, proveedor: true, items: { include: { categoria: true } } },
  });
  if (!v) notFound();
  if (s.rol !== "ADMIN" && v.localId !== s.localId) notFound();

  const peso = v.items.reduce((a, i) => a + i.pesoCg, 0);
  const cambio = Number(sp.cambio) || 0;

  return (
    <PageContainer width="md">
      <PageHeader
        title={`Factura ${v.numero}`}
        back={{ href: "/ventas", label: "Volver a las facturas" }}
        actions={!sp.nueva && <PrintButton />}
      />

      {sp.nueva && (
        <div className="no-print space-y-4">
          <Alert tone="success" title="¡Venta guardada!">
            Factura {v.numero} por {cop(v.total)}. Las piezas ya se descontaron del inventario.
          </Alert>
          {cambio > 0 && (
            <Card tone="success" padding="md">
              <div className="text-center">
                <p className="text-lg text-success-800">Recuerde devolver</p>
                <p className="text-3xl font-bold tabular-nums text-success-900">{cop(cambio)}</p>
              </div>
            </Card>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <PrintButton label="Imprimir factura" size="lg" variant="primary" />
            <Button href="/ventas/nueva" size="lg" variant="secondary" icon={ShoppingBag}>
              Hacer otra venta
            </Button>
            <Button href="/" size="lg" variant="ghost" icon={Home}>
              Ir al inicio
            </Button>
          </div>
        </div>
      )}

      <Card padding="lg">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-200 pb-4">
          <div className="flex items-center gap-3">
            <Logo size="lg" />
            <div>
              <p className="text-xl font-bold">{v.local.nombre}</p>
              <p className="text-base text-neutral-500">{v.local.direccion}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-xl font-bold">{v.numero}</p>
            <p className="text-base text-neutral-500">{fechaHora(v.fecha)}</p>
            <div className="mt-1">
              <StatusBadge status={v.estado} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
          <LabeledValue label="Cliente">
            <p>{v.clienteNombre ?? "Consumidor final"}</p>
            {v.clienteDocumento && (
              <p className="text-neutral-500">
                {v.clienteTipoDoc ?? "C.C."} {v.clienteDocumento}
              </p>
            )}
          </LabeledValue>
          <LabeledValue label="Atendió">{v.usuario.nombre}</LabeledValue>
          <LabeledValue label="Forma de pago">
            <p>{METODOS_PAGO[v.metodoPago]}</p>
            {v.proveedor && <p className="text-neutral-500">Llegó a la cuenta de {v.proveedor.nombre}</p>}
          </LabeledValue>
          <LabeledValue label="Dónde se vendió">{canalVenta(v)}</LabeledValue>
        </div>


        <Table>
          <thead>
            <tr>
              <Th>Pieza</Th>
              <Th numeric>Peso</Th>
              <Th numeric>Cant.</Th>
              <Th numeric className="hidden sm:table-cell">Precio</Th>
              <Th numeric>Valor</Th>
            </tr>
          </thead>
          <tbody>
            {v.items.map((i) => (
              <Tr key={i.id}>
                <Td>
                  <span className="font-semibold">{i.categoria.nombre}</span>
                  {i.descripcion && <span className="block text-sm text-neutral-500">{i.descripcion}</span>}
                  {i.hechura > 0 && <span className="block text-sm text-neutral-500">Incluye hechura {cop(i.hechura)}</span>}
                  {/* En celular el precio va aquí y no en su propia columna, para que la tabla quepa. */}
                  <span className="block text-sm text-neutral-500 sm:hidden">
                    {cop(i.precioGramo)}
                    {i.categoria.controlaPeso ? " el gramo" : " c/u"}
                  </span>
                </Td>
                <Td numeric>{i.categoria.controlaPeso ? gramos(i.pesoCg) : "—"}</Td>
                <Td numeric>{i.cantidad}</Td>
                <Td numeric className="hidden sm:table-cell">
                  {cop(i.precioGramo)}
                  {i.categoria.controlaPeso ? " /g" : ""}
                </Td>
                <Td numeric className="font-semibold">
                  {cop(i.subtotal)}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>

        <div className="mt-4 flex justify-end">
          <div className="w-72 space-y-1">
            <DataRow size="sm" label="Peso total" value={gramos(peso)} />
            <DataRow size="xl" label="Total" value={cop(v.total)} tone="brand" className="border-t-2 border-neutral-200 pt-2" />
          </div>
        </div>

        {v.estado === "ANULADA" && (
          <Alert tone="danger" className="mt-6">
            Esta factura fue anulada. Motivo: {v.motivoAnulacion}
          </Alert>
        )}
      </Card>

            {v.facturaElectronica && v.estado === "ACTIVA" && (
        <div className="no-print">
          {v.alegraEstado === "ENVIADA" ? (
            <Alert tone="success" title="Factura electrónica creada">
              <span className="inline-flex items-center gap-2">
                <Icon icon={FileCheck} /> Factura {v.alegraNumero} en Alegra
                {v.clienteCorreo && <> · se envía a {v.clienteCorreo}</>}
              </span>
            </Alert>
          ) : v.alegraEstado === "ENVIANDO" ? (
            <Alert tone="info" title="Enviando la factura electrónica...">
              Espere un momento y recargue la página.
            </Alert>
          ) : (
            <Alert tone="warning" title="La factura electrónica no se pudo crear">
              <p>{v.alegraError ?? "Quedó pendiente de enviar a Alegra."}</p>
              <p className="mt-1">La venta sí quedó guardada. Puede intentarlo otra vez.</p>
              <form action={reintentarFactura} className="mt-3">
                <input type="hidden" name="id" value={v.id} />
                <SubmitButton variant="secondary" loadingText="Enviando a Alegra...">
                  <Icon icon={RotateCw} /> Reintentar factura electrónica
                </SubmitButton>
              </form>
            </Alert>
          )}
        </div>
      )}


      {s.rol === "ADMIN" && v.estado === "ACTIVA" && (
        <Card padding="md" className="no-print">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-base text-neutral-600">¿Se equivocó en esta factura? Puede anularla y las piezas vuelven al inventario.</p>
            <ConfirmButton
              action={anularVenta}
              variant="danger-outline"
              icon={<Icon icon={Ban} />}
              label="Anular factura"
              title={`¿Anular la factura ${v.numero}?`}
            message={
              <>
                La venta de {cop(v.total)} quedará anulada y las piezas vuelven al inventario. Esto no se puede deshacer.
                {v.alegraEstado === "ENVIADA" && (
                  <strong className="mt-2 block">
                    Esta venta tiene factura electrónica {v.alegraNumero}: después de anular, haga la nota crédito en Alegra.
                  </strong>
                )}
              </>
            }
              confirmLabel="Sí, anular la factura"
              fields={{ id: v.id }}
            >
              <Input label="¿Por qué la anula?" name="motivo" required placeholder="Ej: se digitó mal el peso" />
            </ConfirmButton>
          </div>
        </Card>
      )}
    </PageContainer>
  );
}
