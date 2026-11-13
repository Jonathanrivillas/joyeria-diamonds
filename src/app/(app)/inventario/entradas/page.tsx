import { db } from "@/lib/db";
import { requireAdmin, getAlcance } from "@/lib/session";
import { gramos, fechaHora } from "@/lib/format";
import { PageHeader } from "@/components/ui";
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
    <div>
      <PageHeader
        titulo="Ingresar mercancía"
        volver={{ href: "/inventario", texto: "Volver al inventario" }}
        ayuda="Use esto cuando llegan piezas nuevas al local. Se suman al inventario."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,28rem)_1fr]">
        <EntradaForm
          locales={locales.map((l) => ({ id: l.id, nombre: l.nombre }))}
          localDefecto={localId ?? locales[0]?.id}
          categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre, controlaPeso: c.controlaPeso }))}
        />
        <div className="card overflow-x-auto">
          <p className="border-b border-stone-200 px-5 py-4 text-xl font-bold">Últimos ingresos</p>
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Local</th>
                <th>Categoría</th>
                <th className="num">Peso</th>
                <th className="num">Cant.</th>
                <th>Nota</th>
              </tr>
            </thead>
            <tbody>
              {recientes.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap">{fechaHora(m.fecha)}</td>
                  <td>{m.local.nombre}</td>
                  <td>{m.categoria.nombre}</td>
                  <td className="num">{gramos(m.pesoCg)}</td>
                  <td className="num">{m.cantidad}</td>
                  <td className="text-xs text-stone-500">{m.nota}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
