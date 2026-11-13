import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { fechaHora, gramos } from "@/lib/format";
import { PageHeader, Vacio } from "@/components/ui";
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
    <div>
      <PageHeader
        titulo="Traslados"
        ayuda="Use esto para llevar piezas de un local al otro. Se descuentan del local que las envía y se suman al que las recibe."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,28rem)_1fr]">
        <TrasladoForm
          locales={locales.map((l) => ({ id: l.id, nombre: l.nombre }))}
          categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre, controlaPeso: c.controlaPeso }))}
        />
        <div className="card overflow-x-auto">
          {traslados.length === 0 ? (
            <Vacio texto="Aún no hay traslados" />
          ) : (
            <table className="tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Origen → Destino</th>
                  <th>Categoría</th>
                  <th className="num">Peso</th>
                  <th className="num">Cant.</th>
                  <th>Usuario</th>
                  <th>Nota</th>
                </tr>
              </thead>
              <tbody>
                {traslados.flatMap((t) =>
                  t.items.map((i) => (
                    <tr key={i.id}>
                      <td className="whitespace-nowrap">{fechaHora(t.fecha)}</td>
                      <td>{t.origen.nombre} → {t.destino.nombre}</td>
                      <td>{i.categoria.nombre}</td>
                      <td className="num">{gramos(i.pesoCg)}</td>
                      <td className="num">{i.cantidad}</td>
                      <td>{t.usuario.nombre}</td>
                      <td className="text-xs text-stone-500">{t.nota}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
