// Envía a Alegra una venta YA GUARDADA. Nunca lanza error: deja el resultado
// en la venta (ENVIADA o ERROR) para mostrarlo y poder reintentar.
import { db } from "@/lib/db";
import { aISO } from "@/lib/fechas";
import { gramos } from "@/lib/format";
import {
  buscarOCrearCliente,
  crearFacturaAlegra,
  crearProductoAlegra,
  CONSUMIDOR_FINAL,
  type TipoDocumento,
} from "@/lib/alegra";


export async function facturarVenta(
  ventaId: number,
): Promise<{ ok: boolean; mensaje: string }> {
  const v = await db.venta.findUnique({
    where: { id: ventaId },
    include: { items: { include: { categoria: true } } },
  });
  if (!v) return { ok: false, mensaje: "La venta no existe." };
  if (v.estado === "ANULADA")
    return { ok: false, mensaje: "La venta está anulada." };
  if (v.alegraEstado === "ENVIADA")
    return {
      ok: true,
      mensaje: `Ya tiene factura electrónica ${v.alegraNumero}.`,
    };

  // Candado contra doble clic: solo una petición a la vez puede pasarla a ENVIANDO.
  const tomada = await db.venta.updateMany({
    where: {
      id: ventaId,
      OR: [
        { alegraEstado: null },
        { alegraEstado: { in: ["PENDIENTE", "ERROR"] } },
      ],
    },
    data: {
      facturaElectronica: true,
      alegraEstado: "ENVIANDO",
      alegraError: null,
    },
  });
  if (tomada.count === 0)
    return {
      ok: false,
      mensaje: "La factura ya se está enviando. Espere un momento.",
    };

  try {
    // Tipos de pieza nuevos (ej. Joyas preciosas) se enlazan solos: se crea su producto en Alegra.
    for (const i of v.items) {
      if (i.categoria.alegraItemId) continue;
      const alegraItemId = await crearProductoAlegra(i.categoria.nombre);
      await db.categoria.update({ where: { id: i.categoria.id }, data: { alegraItemId } });
      for (const j of v.items) if (j.categoriaId === i.categoriaId) j.categoria.alegraItemId = alegraItemId;
    }

    const clienteId = v.clienteDocumento
      ? await buscarOCrearCliente({
          tipoDoc: (v.clienteTipoDoc ?? "CC") as TipoDocumento,
          documento: v.clienteDocumento,
          nombre: v.clienteNombre ?? "Cliente",
          correo: v.clienteCorreo,
        })
      : await buscarOCrearCliente({
          tipoDoc: "CC",
          documento: CONSUMIDOR_FINAL,
          nombre: "Consumidor Final",
        });

    const factura = await crearFacturaAlegra({
      clienteId,
      fecha: aISO(v.fecha),
      metodoPago: v.metodoPago,
      items: v.items.map((i) => ({
        alegraItemId: i.categoria.alegraItemId!,
        descripcion: [
          i.descripcion || i.categoria.nombre,
          i.pesoCg > 0 ? gramos(i.pesoCg) : null,
          i.cantidad > 1 ? `${i.cantidad} unidades` : null,
        ]
          .filter(Boolean)
          .join(" – "),
        precio: i.subtotal,
      })),
    });

    await db.venta.update({
      where: { id: ventaId },
      data: {
        alegraEstado: "ENVIADA",
        alegraId: factura.id,
        alegraNumero: factura.numero,
      },
    });
    return {
      ok: true,
      mensaje: `Factura electrónica ${factura.numero} creada.`,
    };
  } catch (e) {
    const mensaje = (e as Error).message;
    await db.venta.update({
      where: { id: ventaId },
      data: { alegraEstado: "ERROR", alegraError: mensaje },
    });
    return { ok: false, mensaje };
  }
}
