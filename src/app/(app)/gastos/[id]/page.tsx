import { notFound } from "next/navigation";
import { Ban, Paperclip } from "lucide-react";
import { db } from "@/lib/db";
import { requirePermiso } from "@/lib/session";
import { cop, fechaHora, TIPOS_GASTO } from "@/lib/format";
import { Alert, Button, Card, ConfirmButton, Icon, Input, LabeledValue, PageContainer, PageHeader, StatusBadge } from "@/components/ui";
import { grupoDeGasto } from "@/components/gastos/tipos-gasto";
import { anularGasto } from "../actions";

/** Detalle de un gasto: todos sus datos, el recibo y (admin) anularlo. */
export default async function GastoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requirePermiso("gastos");
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const g = await db.gasto.findUnique({ where: { id }, include: { local: true, usuario: true, proveedor: true } });
  if (!g) notFound();
  if (s.rol !== "ADMIN" && g.localId !== s.localId) notFound();

  const anulado = g.estado === "ANULADO";
  const anuladoPor = g.anuladoPorId ? await db.usuario.findUnique({ where: { id: g.anuladoPorId }, select: { nombre: true } }) : null;
  const grupo = grupoDeGasto(g.tipo);

  return (
    <PageContainer width="md">
      <PageHeader title="Gasto" back={{ href: "/gastos/historial", label: "Volver a todos los gastos" }} />

      <Card padding="lg">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-200 pb-4">
          <div className="min-w-0">
            <p className="text-base text-neutral-500">{grupo && grupo.id !== g.tipo ? `${grupo.nombre} · ${TIPOS_GASTO[g.tipo] ?? g.tipo}` : TIPOS_GASTO[g.tipo] ?? g.tipo}</p>
            <h2 className="text-2xl font-bold">{g.justificacion}</h2>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-bold tabular-nums ${anulado ? "text-neutral-500 line-through" : ""}`}>{cop(g.monto)}</p>
            <StatusBadge status={g.estado} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2">
          <LabeledValue label="Fecha">{fechaHora(g.fecha)}</LabeledValue>
          <LabeledValue label="Local">{g.local.nombre}</LabeledValue>
          <LabeledValue label="Lo anotó">{g.usuario.nombre}</LabeledValue>
          {g.proveedor && <LabeledValue label="Proveedor">{g.proveedor.nombre}</LabeledValue>}
        </div>

        {g.soporte ? (
          <Button variant="secondary" href={`/api/soporte/${g.id}`} native target="_blank" rel="noopener" icon={Paperclip}>
            Ver el recibo
          </Button>
        ) : (
          <p className="text-base text-neutral-500">Este gasto no tiene foto del recibo.</p>
        )}

        {anulado && (
          <Alert tone="danger" className="mt-6" title="Este gasto fue anulado">
            {g.motivoAnulacion}
            {anuladoPor && g.anuladoEn && ` · ${anuladoPor.nombre}, ${fechaHora(g.anuladoEn)}`}
          </Alert>
        )}
      </Card>

      {s.rol === "ADMIN" && !anulado && (
        <Card padding="md" className="no-print">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-base text-neutral-600">¿Se anotó mal? Puede anularlo: deja de contar en los totales pero queda en el historial.</p>
            <ConfirmButton
              action={anularGasto}
              variant="danger-outline"
              icon={<Icon icon={Ban} />}
              label="Anular gasto"
              title="¿Anular este gasto?"
              message={<>«{g.justificacion}» por {cop(g.monto)} dejará de contar en los totales.</>}
              confirmLabel="Sí, anular"
              fields={{ id: g.id }}
            >
              <Input label="¿Por qué lo anula?" name="motivo" required placeholder="Ej: se anotó dos veces" />
            </ConfirmButton>
          </div>
        </Card>
      )}
    </PageContainer>
  );
}
