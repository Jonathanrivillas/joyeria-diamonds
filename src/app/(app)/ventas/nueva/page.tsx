import { db } from "@/lib/db";
import { requireSesion, getAlcance } from "@/lib/session";
import { precioDelDia } from "@/lib/precio";
import { PageContainer } from "@/components/ui";
import { VentaForm } from "./venta-form";

export default async function NuevaVentaPage() {
  const s = await requireSesion();
  const { localId, locales } = await getAlcance(s);
  const [categorias, existencias, precio] = await Promise.all([
    db.categoria.findMany({ where: { activa: true }, orderBy: { orden: "asc" } }),
    db.existencia.findMany(),
    precioDelDia(),
  ]);

  return (
    <PageContainer width="fluid">
      <VentaForm
        esAdmin={s.rol === "ADMIN"}
        locales={locales.map((l) => ({ id: l.id, nombre: l.nombre }))}
        localDefecto={localId ?? s.localId ?? locales[0]?.id ?? null}
        categorias={categorias.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          controlaPeso: c.controlaPeso,
          // Todo se vende por gramos al precio del día (configurado en el inicio).
          precio: c.controlaPeso ? precio.valor : c.precioUnidadSugerido,
        }))}
        existencias={existencias.map((e) => ({
          localId: e.localId,
          categoriaId: e.categoriaId,
          pesoCg: e.pesoCg,
          cantidad: e.cantidad,
        }))}
      />
    </PageContainer>
  );
}
