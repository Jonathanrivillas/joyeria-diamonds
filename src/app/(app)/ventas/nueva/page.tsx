import { db } from "@/lib/db";
import { requirePermiso, getAlcance } from "@/lib/session";
import { precioDelDia } from "@/lib/precio";
import { PageContainer } from "@/components/ui";
import { VentaForm } from "./venta-form";
import { letraBonita, FRASE_NEGOCIO } from "@/lib/fuentes";

export default async function NuevaVentaPage({ searchParams }: { searchParams: Promise<{ fe?: string }> }) {
  // ?fe=1 → venta con factura electrónica (se envía a Alegra). Sin él, la venta de siempre.
  const facturaElectronica = (await searchParams).fe === "1";
  const s = await requirePermiso("vender");
  const { localId, locales } = await getAlcance(s);
  const [categorias, existencias, precio, proveedores, joyas] = await Promise.all([
    db.categoria.findMany({ where: { activa: true }, orderBy: { orden: "asc" } }),
    db.existencia.findMany(),
    precioDelDia(),
    db.proveedor.findMany({ where: { activo: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    // Joyas preciosas disponibles (se venden una por una por su código).
    db.pieza.findMany({
      where: { estado: "DISPONIBLE" },
      orderBy: { codigo: "asc" },
      select: { id: true, codigo: true, tipo: true, descripcion: true, pesoCg: true, precio: true, localId: true, categoriaId: true },
    }),
  ]);

  return (
    <PageContainer width="fluid">
      <VentaForm
        // La key reinicia el formulario al pasar de venta normal a factura electrónica y al revés.
        key={facturaElectronica ? "fe" : "normal"}
        facturaElectronica={facturaElectronica}
        proveedores={proveedores}
        joyas={joyas}
        precioGramo={precio.valor}
        frase={
          <p className={`${letraBonita.className} text-[1.45rem] leading-tight text-brand-700 sm:text-4xl`}>
            {FRASE_NEGOCIO}
          </p>
        }
        esAdmin={s.rol === "ADMIN"}
        locales={locales.map((l) => ({ id: l.id, nombre: l.nombre }))}
        localDefecto={localId ?? s.localId ?? locales[0]?.id ?? null}
        categorias={categorias.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          controlaPeso: c.controlaPeso,
          esServicio: c.esServicio,
          porPieza: c.porPieza,
          // Todo se vende por gramos al precio del día (configurado en el inicio).
          precio: c.esServicio ? 0 : c.controlaPeso ? precio.valor : c.precioUnidadSugerido,
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
