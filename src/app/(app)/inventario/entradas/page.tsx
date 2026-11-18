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
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
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
                  <Th>Qué llegó</Th>
                  <Th numeric>Cuánto</Th>
                </tr>
              </thead>
              <tbody>
                {recientes.map((m) => (
                  <Tr key={m.id}>
                    <Td>
                      <span className="block font-medium">{m.categoria.nombre}</span>
                      <span className="block text-sm text-neutral-500">
                        {m.local.nombre} · {fechaHora(m.fecha)}
                        {m.nota && ` · ${m.nota}`}
                      </span>
                    </Td>
                    <Td numeric className="whitespace-nowrap">
                      <span className="block font-semibold">{gramos(m.pesoCg)}</span>
                      <span className="block text-sm text-neutral-500">{m.cantidad} pzs</span>
                    </Td>
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
