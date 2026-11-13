import { notFound } from "next/navigation";
import clsx from "clsx";
import { db } from "@/lib/db";
import { requireSesion, getAlcance } from "@/lib/session";
import { gramos, entero, fechaHora, TIPOS_MOVIMIENTO } from "@/lib/format";
import { PageHeader, Vacio } from "@/components/ui";

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
    <div>
      <PageHeader
        titulo={`Movimientos de ${cat.nombre}`}
        subtitulo={`Hay ahora: ${cat.controlaPeso ? gramos(saldo._sum.pesoCg ?? 0) + " · " : ""}${entero(saldo._sum.cantidad ?? 0)} piezas`}
        volver={{ href: "/inventario", texto: "Volver al inventario" }}
        ayuda="Cada vez que entra o sale mercancía queda anotado aquí, con quién lo hizo. La columna «Quedó» muestra cuánto había después de cada movimiento."
      />
      <div className="card overflow-x-auto">
        {filas.length === 0 ? (
          <Vacio texto="Sin movimientos" />
        ) : (
          <table className="tabla">
            <thead>
              <tr>
                <th>Cuándo</th>
                {!localId && <th>Local</th>}
                <th>Qué pasó</th>
                <th>Factura / ref.</th>
                <th className="num">Gramos</th>
                <th className="num">Piezas</th>
                <th className="num">Quedó (g)</th>
                <th className="num">Quedó (pzs)</th>
                <th>Quién</th>
                <th>Nota</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap">{fechaHora(m.fecha)}</td>
                  {!localId && <td>{m.local.nombre}</td>}
                  <td>{TIPOS_MOVIMIENTO[m.tipo] ?? m.tipo}</td>
                  <td className="font-mono text-xs">{m.referencia ?? ""}</td>
                  <td className={clsx("num", m.pesoCg < 0 ? "text-red-600" : "text-emerald-700")}>
                    {m.pesoCg > 0 ? "+" : ""}
                    {gramos(m.pesoCg, false)}
                  </td>
                  <td className={clsx("num", m.cantidad < 0 ? "text-red-600" : "text-emerald-700")}>
                    {m.cantidad > 0 ? "+" : ""}
                    {m.cantidad}
                  </td>
                  <td className="num font-medium">{gramos(m.saldoPeso, false)}</td>
                  <td className="num font-medium">{m.saldoCant}</td>
                  <td>{m.usuario.nombre}</td>
                  <td className="text-xs text-stone-500">{m.nota ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
