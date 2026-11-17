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
      <div className="grid gap-6 lg:grid-cols-[minmax(0,28rem)_1fr]">
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
                  <Th>Fecha</Th>
                  <Th>Origen → Destino</Th>
                  <Th>Categoría</Th>
                  <Th numeric>Peso</Th>
                  <Th numeric>Cant.</Th>
                  <Th>Usuario</Th>
                  <Th>Nota</Th>
                </tr>
              </thead>
              <tbody>
                {traslados.flatMap((t) =>
                  t.items.map((i) => (
                    <Tr key={i.id}>
                      <Td className="whitespace-nowrap">{fechaHora(t.fecha)}</Td>
                      <Td>
                        {t.origen.nombre} → {t.destino.nombre}
                      </Td>
                      <Td>{i.categoria.nombre}</Td>
                      <Td numeric>{gramos(i.pesoCg)}</Td>
                      <Td numeric>{i.cantidad}</Td>
                      <Td>{t.usuario.nombre}</Td>
                      <Td className="text-sm text-neutral-500">{t.nota}</Td>
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
