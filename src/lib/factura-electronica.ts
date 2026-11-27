// Envía a Alegra una venta YA GUARDADA. Nunca lanza error: deja el resultado en la venta.
//
// Estados (Venta.alegraEstado):
//   PENDIENTE  → falta enviarla.
//   ENVIANDO   → se está enviando ahora (candado contra doble clic).
//   ENVIADA    → Alegra la creó.
//   ERROR      → Alegra la RECHAZÓ: no se creó nada, se puede reintentar sin riesgo.
//   VERIFICAR  → Alegra NO RESPONDIÓ (o el servidor se cayó a mitad): la factura PUEDE existir.
//                No se reintenta sola: el administrador la busca en Alegra ("Venta L1-000123")
//                y confirma si ya está o si hay que enviarla otra vez. Así nunca sale duplicada.
import { db } from "@/lib/db";
import { aISO } from "@/lib/fechas";
import { gramos } from "@/lib/format";
import { mensajeSeguro } from "@/lib/errores";
import {
  AlegraRechazo,
  AlegraSinRespuesta,
  buscarOCrearCliente,
  crearFacturaAlegra,
  crearProductoAlegra,
  CONSUMIDOR_FINAL,
  type TipoDocumento,
} from "@/lib/alegra";

/** Un ENVIANDO más viejo que esto significa que el envío se cortó (ej. se reinició el servidor). */
const ENVIO_COLGADO_MS = 2 * 60_000;

export const mensajeVerificar = (numero: string) =>
  `Alegra no confirmó si recibió la factura. Búsquela en Alegra por "Venta ${numero}" antes de volver a enviarla, para no duplicarla.`;

/** ¿La venta quedó "Enviando" porque el envío se cortó a mitad? */
export function envioColgado(v: { alegraEstado: string | null; alegraIntentoEn: Date | null }) {
  return v.alegraEstado === "ENVIANDO" && (!v.alegraIntentoEn || Date.now() - v.alegraIntentoEn.getTime() > ENVIO_COLGADO_MS);
}

export async function facturarVenta(ventaId: number): Promise<{ ok: boolean; mensaje: string }> {
  const v = await db.venta.findUnique({ where: { id: ventaId }, include: { items: { include: { categoria: true } } } });
  if (!v) return { ok: false, mensaje: "La venta no existe." };
  if (!v.facturaElectronica) return { ok: false, mensaje: "Esta venta se hizo sin factura electrónica." };
  if (v.estado === "ANULADA") return { ok: false, mensaje: "La venta está anulada." };
  if (v.alegraEstado === "ENVIADA") return { ok: true, mensaje: `Ya tiene factura electrónica ${v.alegraNumero}.` };

  // Un envío que se cortó a mitad pasa a VERIFICAR: no se reintenta a ciegas.
  if (envioColgado(v)) {
    await db.venta.updateMany({
      where: { id: ventaId, alegraEstado: "ENVIANDO" },
      data: { alegraEstado: "VERIFICAR", alegraError: mensajeVerificar(v.numero) },
    });
    return { ok: false, mensaje: mensajeVerificar(v.numero) };
  }

  // Candado: solo PENDIENTE o ERROR (rechazada) se pueden enviar. VERIFICAR necesita que una
  // persona confirme primero (ver resolverVerificacion).
  const tomada = await db.venta.updateMany({
    where: { id: ventaId, alegraEstado: { in: ["PENDIENTE", "ERROR"] } },
    data: { alegraEstado: "ENVIANDO", alegraError: null, alegraIntentoEn: new Date() },
  });
  if (tomada.count === 0) {
    return v.alegraEstado === "VERIFICAR"
      ? { ok: false, mensaje: mensajeVerificar(v.numero) }
      : { ok: false, mensaje: "La factura ya se está enviando. Espere un momento y recargue." };
  }

  let creandoFactura = false;
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
      : await buscarOCrearCliente({ tipoDoc: "CC", documento: CONSUMIDOR_FINAL, nombre: "Consumidor Final" });

    // Desde aquí, si Alegra no responde, la factura PUEDE haberse creado.
    creandoFactura = true;
    const factura = await crearFacturaAlegra({
      referencia: v.numero,
      clienteId,
      fecha: aISO(v.fecha),
      metodoPago: v.metodoPago,
      items: v.items.map((i) => ({
        alegraItemId: i.categoria.alegraItemId!,
        descripcion: [i.descripcion || i.categoria.nombre, i.pesoCg > 0 ? gramos(i.pesoCg) : null, i.cantidad > 1 ? `${i.cantidad} unidades` : null]
          .filter(Boolean)
          .join(" – "),
        precio: i.subtotal,
      })),
    });

    await db.venta.update({
      where: { id: ventaId },
      data: { alegraEstado: "ENVIADA", alegraId: factura.id, alegraNumero: factura.numero, alegraError: null },
    });
    return { ok: true, mensaje: `Factura electrónica ${factura.numero} creada.` };
  } catch (e) {
    // Sin respuesta al crear la factura → puede existir → VERIFICAR. Cualquier otro caso
    // (rechazo, falla antes de crearla) → ERROR, que se puede reintentar sin riesgo.
    const dudosa = creandoFactura && e instanceof AlegraSinRespuesta;
    const mensaje = dudosa
      ? mensajeVerificar(v.numero)
      : e instanceof AlegraRechazo || e instanceof AlegraSinRespuesta
        ? e.message
        : mensajeSeguro(e, `facturarVenta ${v.numero}`);
    if (!(e instanceof AlegraRechazo)) console.error(`[factura ${v.numero}]`, e);
    await db.venta.update({
      where: { id: ventaId },
      data: { alegraEstado: dudosa ? "VERIFICAR" : "ERROR", alegraError: mensaje },
    });
    return { ok: false, mensaje };
  }
}

/**
 * El administrador ya buscó en Alegra una factura en VERIFICAR:
 * - si la encontró, escribe su número y queda ENVIADA (no se envía otra);
 * - si no está, se marca para enviarla de nuevo.
 */
export async function resolverVerificacion(
  ventaId: number,
  decision: { existe: true; numero: string } | { existe: false },
): Promise<{ ok: boolean; mensaje: string }> {
  const v = await db.venta.findUnique({ where: { id: ventaId } });
  if (!v || !v.facturaElectronica) return { ok: false, mensaje: "La venta no existe o no lleva factura electrónica." };
  if (v.alegraEstado !== "VERIFICAR" && !envioColgado(v)) return { ok: false, mensaje: "Esta factura no está pendiente de verificar." };

  if (decision.existe) {
    const numero = decision.numero.trim();
    if (!numero || numero.length > 40) return { ok: false, mensaje: "Escriba el número de la factura que encontró en Alegra." };
    await db.venta.update({ where: { id: ventaId }, data: { alegraEstado: "ENVIADA", alegraNumero: numero, alegraError: null } });
    return { ok: true, mensaje: `Listo: quedó registrada la factura electrónica ${numero}.` };
  }
  await db.venta.update({ where: { id: ventaId }, data: { alegraEstado: "ERROR", alegraError: null } });
  return facturarVenta(ventaId);
}
