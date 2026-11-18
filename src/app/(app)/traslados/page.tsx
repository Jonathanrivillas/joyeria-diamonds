import { ArrowLeftRight } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { fechaHora, gramos } from "@/lib/format";
import { Card, CardHeader, EmptyState, PageContainer, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { TrasladoForm } from "./traslado-form";

export default async function TrasladosPage() {
  await requireAdmin();
  const [locales, categorias, traslados] = await Promise.all([
    db.local.findMany({ orderBy: { id: "asc" } }),
    db.categoria.findMany({ where: { activa: true }, orderBy: { orden: "asc" } }),
    db.traslado.findMany({
      orderBy: { fecha: "desc" },
      take: 50,
      include: { origen: true, destino: true, usuario: true, items: { include: { categoria: true } } },
    }),
  ]);

  return (
    <PageContainer>
      <PageHeader
        title="Traslados"
        help="Use esto para llevar piezas de un local al otro. Se descuentan del local que las envía y se suman al que las recibe."
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
        <TrasladoForm
          locales={locales.map((l) => ({ id: l.id, nombre: l.nombre }))}
          categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre, controlaPeso: c.controlaPeso }))}
        />
        <Card>
          <CardHeader title="Últimos traslados" />
          {traslados.length === 0 ? (
            <EmptyState icon={ArrowLeftRight} title="Aún no hay traslados." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Qué se movió</Th>
                  <Th numeric>Cuánto</Th>
                </tr>
              </thead>
              <tbody>
                {traslados.flatMap((t) =>
                  t.items.map((i) => (
                    <Tr key={i.id}>
                      <Td>
                        <span className="block font-medium">
                          {i.categoria.nombre}: {t.origen.nombre} → {t.destino.nombre}
                        </span>
                        <span className="block text-sm text-neutral-500">
                          {fechaHora(t.fecha)} · {t.usuario.nombre}
                          {t.nota && ` · ${t.nota}`}
                        </span>
                      </Td>
                      <Td numeric className="whitespace-nowrap">
                        <span className="block font-semibold">{gramos(i.pesoCg)}</span>
                        <span className="block text-sm text-neutral-500">{i.cantidad} pzs</span>
                      </Td>
                    </Tr>
                  ))
                )}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}
