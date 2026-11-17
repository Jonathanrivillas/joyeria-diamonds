import { PackageOpen } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin, getAlcance } from "@/lib/session";
import { gramos, fechaHora } from "@/lib/format";
import { Card, CardHeader, EmptyState, PageContainer, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { EntradaForm } from "./entrada-form";

export default async function EntradasPage() {
  const s = await requireAdmin();
  const { localId, locales } = await getAlcance(s);
  const [categorias, recientes] = await Promise.all([
    db.categoria.findMany({ where: { activa: true }, orderBy: { orden: "asc" } }),
    db.movimiento.findMany({
      where: { tipo: "ENTRADA", ...(localId ? { localId } : {}) },
      orderBy: { fecha: "desc" },
      take: 15,
      include: { categoria: true, local: true, usuario: true },
    }),
  ]);

  return (
    <PageContainer>
      <PageHeader
        title="Ingresar mercancía"
        back={{ href: "/inventario", label: "Volver al inventario" }}
        help="Use esto cuando llegan piezas nuevas al local. Se suman al inventario."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,28rem)_1fr]">
        <EntradaForm
          locales={locales.map((l) => ({ id: l.id, nombre: l.nombre }))}
          localDefecto={localId ?? locales[0]?.id}
          categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre, controlaPeso: c.controlaPeso }))}
        />
        <Card>
          <CardHeader title="Últimos ingresos" />
          {recientes.length === 0 ? (
            <EmptyState icon={PackageOpen} title="Todavía no se ha ingresado mercancía." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Fecha</Th>
                  <Th>Local</Th>
                  <Th>Categoría</Th>
                  <Th numeric>Peso</Th>
                  <Th numeric>Cant.</Th>
                  <Th>Nota</Th>
                </tr>
              </thead>
              <tbody>
                {recientes.map((m) => (
                  <Tr key={m.id}>
                    <Td className="whitespace-nowrap">{fechaHora(m.fecha)}</Td>
                    <Td>{m.local.nombre}</Td>
                    <Td>{m.categoria.nombre}</Td>
                    <Td numeric>{gramos(m.pesoCg)}</Td>
                    <Td numeric>{m.cantidad}</Td>
                    <Td className="text-sm text-neutral-500">{m.nota}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}
