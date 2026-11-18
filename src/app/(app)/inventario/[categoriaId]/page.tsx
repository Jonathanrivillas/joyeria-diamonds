import { notFound } from "next/navigation";
import { History } from "lucide-react";
import { db } from "@/lib/db";
import { requireSesion, getAlcance } from "@/lib/session";
import { gramos, entero, fechaHora, TIPOS_MOVIMIENTO } from "@/lib/format";
import { Card, EmptyState, PageContainer, PageHeader, Table, Td, Th, Tr, cn } from "@/components/ui";

/** "+5,20" en verde o "-5,20" en rojo. */
function Cambio({ valor, texto }: { valor: number; texto: string }) {
  return (
    <span className={cn(valor < 0 ? "text-danger-600" : "text-success-700")}>
      {valor > 0 ? "+" : ""}
      {texto}
    </span>
  );
}

export default async function KardexPage({ params }: { params: Promise<{ categoriaId: string }> }) {
  const { categoriaId } = await params;
  const s = await requireSesion();
  const { localId } = await getAlcance(s);
  const cat = await db.categoria.findUnique({ where: { id: Number(categoriaId) } });
  if (!cat) notFound();

  const whereLocal = localId ? { localId } : {};
  const [movs, saldo] = await Promise.all([
    db.movimiento.findMany({
      where: { ...whereLocal, categoriaId: cat.id },
      orderBy: { fecha: "desc" },
      take: 300,
      include: { usuario: true, local: true },
    }),
    db.existencia.aggregate({ where: { ...whereLocal, categoriaId: cat.id }, _sum: { pesoCg: true, cantidad: true } }),
  ]);

  // Saldo corrido hacia atrás desde el saldo actual
  let p = saldo._sum.pesoCg ?? 0;
  let c = saldo._sum.cantidad ?? 0;
  const filas = movs.map((m) => {
    const fila = { ...m, saldoPeso: p, saldoCant: c };
    p -= m.pesoCg;
    c -= m.cantidad;
    return fila;
  });

  return (
    <PageContainer>
      <PageHeader
        title={`Movimientos de ${cat.nombre}`}
        subtitle={`Hay ahora: ${cat.controlaPeso ? gramos(saldo._sum.pesoCg ?? 0) + " · " : ""}${entero(saldo._sum.cantidad ?? 0)} piezas`}
        back={{ href: "/inventario", label: "Volver al inventario" }}
        help="Cada vez que entra o sale mercancía queda anotado aquí, con quién lo hizo. La columna «Quedó» muestra cuánto había después de cada movimiento."
      />
      <Card>
        {filas.length === 0 ? (
          <EmptyState icon={History} title="Esta categoría todavía no tiene movimientos." />
        ) : (
          <Table>
            {/* Pocas columnas, con la información relacionada junta, para que quepa sin desplazarse. */}
            <thead>
              <tr>
                <Th>Cuándo</Th>
                <Th>Qué pasó</Th>
                <Th numeric>Entró / salió</Th>
                <Th numeric className="hidden sm:table-cell">Quedó</Th>
              </tr>
            </thead>
            <tbody>
              {filas.map((m) => (
                <Tr key={m.id}>
                  <Td>
                    <span className="block sm:whitespace-nowrap">{fechaHora(m.fecha)}</span>
                    <span className="block text-sm text-neutral-500">
                      {m.usuario.nombre}
                      {!localId && ` · ${m.local.nombre}`}
                    </span>
                  </Td>
                  <Td>
                    <span className="block font-medium">{TIPOS_MOVIMIENTO[m.tipo] ?? m.tipo}</span>
                    {(m.referencia || m.nota) && (
                      <span className="block text-sm text-neutral-500">
                        {m.referencia && <span className="font-mono">{m.referencia}</span>}
                        {m.referencia && m.nota && " · "}
                        {m.nota}
                      </span>
                    )}
                  </Td>
                  <Td numeric className="whitespace-nowrap">
                    <span className="block">
                      <Cambio valor={m.pesoCg} texto={gramos(m.pesoCg)} />
                    </span>
                    <span className="block text-sm">
                      <Cambio valor={m.cantidad} texto={`${m.cantidad} pzs`} />
                    </span>
                    {/* En celular, el saldo va aquí en vez de en su propia columna. */}
                    <span className="mt-1 block text-sm text-neutral-500 sm:hidden">Quedó {gramos(m.saldoPeso)}</span>
                  </Td>
                  <Td numeric className="hidden whitespace-nowrap sm:table-cell">
                    <span className="block font-semibold">{gramos(m.saldoPeso)}</span>
                    <span className="block text-sm text-neutral-500">{entero(m.saldoCant)} pzs</span>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </PageContainer>
  );
}
