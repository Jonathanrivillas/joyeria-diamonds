"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSesion, exigirPermiso, localParaOperar } from "@/lib/session";
import { puedeVer } from "@/lib/permisos";
import { precioDelDia } from "@/lib/precio";
import { registrarMovimiento, siguienteNumeroFactura } from "@/lib/inventario";
import { auditar } from "@/lib/auditoria";
import { facturarVenta, resolverVerificacion } from "@/lib/factura-electronica";
import { ErrorUsuario, mensajeSeguro } from "@/lib/errores";

const ItemSchema = z.object({
  categoriaId: z.number().int().positive(),
  descripcion: z.string().max(120).default(""),
  pesoCg: z.number().int().min(0).max(10_000_000), // hasta 100 kg
  cantidad: z.number().int().positive().max(10_000),
  precioGramo: z.number().int().min(0).max(100_000_000),
  hechura: z.number().int().min(0).max(100_000_000).default(0),
  piezaId: z.number().int().positive().optional(), // joya preciosa (categorías porPieza)
});

const VentaSchema = z.object({
  localId: z.number().int().positive().nullable(),
  clienteNombre: z.string().max(120).optional(),
  clienteDocumento: z.string().max(40).optional(),
  metodoPago: z.enum(["EFECTIVO", "TRANSFERENCIA", "TARJETA"]),
  proveedorId: z.number().int().positive().nullable().optional(),
  canal: z.enum(["TIENDA", "REDES"]).default("TIENDA"),
  red: z.enum(["WHATSAPP", "INSTAGRAM", "FACEBOOK", "OTRA"]).optional(),
  redOtra: z.string().max(60).optional(),
  facturaElectronica: z.boolean().default(false),
  clienteTipoDoc: z.enum(["CC", "NIT", "CE", "PP"]).optional(),
  clienteCorreo: z.string().max(120).optional(),
  items: z.array(ItemSchema).min(1, "Agregue al menos una pieza").max(100),
});

export type NuevaVentaInput = z.infer<typeof VentaSchema>;

export async function crearVenta(input: NuevaVentaInput): Promise<{ error?: string; id?: number }> {
  const s = await requireSesion();
  if (!puedeVer(s, "vender")) return { error: "No tiene permiso para vender. Pídaselo al administrador." };
  const parsed = VentaSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise los datos de la venta e intente otra vez." };
  const v = parsed.data;

  if (v.facturaElectronica) {
    if (!v.clienteNombre?.trim()) return { error: "Para la factura electrónica escriba el nombre del cliente." };
    if (!v.clienteDocumento?.replace(/\D/g, "")) return { error: "Para la factura electrónica escriba el número de documento." };
    if (!/^\S+@\S+\.\S+$/.test(v.clienteCorreo?.trim() ?? "")) return { error: "Escriba un correo válido: allá le llega la factura al cliente." };
  }

  if (v.canal === "REDES" && !v.red) return { error: "Toque por cuál red se hizo la venta." };
  if (v.red === "OTRA" && !v.redOtra?.trim()) return { error: "Escriba por cuál red se hizo la venta." };

  // Solo una transferencia puede llegar a la cuenta de un proveedor, y el proveedor debe estar activo.
  const proveedorId = v.metodoPago === "TRANSFERENCIA" ? v.proveedorId ?? null : null;
  if (proveedorId && !(await db.proveedor.findFirst({ where: { id: proveedorId, activo: true } })))
    return { error: "Ese proveedor ya no está activo. Escoja otra cuenta." };


  let localId: number;
  try {
    localId = localParaOperar(s, v.localId);
  } catch (e) {
    return { error: mensajeSeguro(e, "crearVenta: local") };
  }

  const categorias = await db.categoria.findMany({ where: { id: { in: v.items.map((i) => i.categoriaId) } } });
  const catMap = new Map(categorias.map((c) => [c.id, c]));
  for (const i of v.items) {
    const c = catMap.get(i.categoriaId);
    if (!c) return { error: "Uno de los tipos de pieza ya no existe. Recargue la página y arme la venta otra vez." };
    if (!c.activa) return { error: `"${c.nombre}" ya no se vende. Quítelo de la venta.` };
  }

  // El vendedor vende al precio que puso el administrador: aquí se impone, sin importar lo que mande la pantalla.
  if (s.rol !== "ADMIN") {
    const oficial = (await precioDelDia()).valor;
    for (const i of v.items) {
      const c = catMap.get(i.categoriaId);
      if (!c || c.esServicio || c.porPieza) continue; // trabajos: el valor que se cobra; joyas: su propio precio
      i.precioGramo = c.controlaPeso ? oficial : c.precioUnidadSugerido;
      i.hechura = 0;
      if (i.precioGramo <= 0)
        return {
          error: c.controlaPeso
            ? "El administrador todavía no ha puesto el precio del gramo de hoy."
            : `El precio por pieza de "${c.nombre}" no está configurado. Avise al administrador.`,
        };
    }
  }

  // Joyas preciosas: peso y precio salen de la joya guardada, no de lo que mande la pantalla.
  const piezaIds = v.items.map((i) => i.piezaId).filter((id): id is number => !!id);
  if (new Set(piezaIds).size !== piezaIds.length) return { error: "Una joya está dos veces en la venta." };
  const piezas = await db.pieza.findMany({ where: { id: { in: piezaIds } } });
  const piezaMap = new Map(piezas.map((p) => [p.id, p]));
  for (const i of v.items) {
    const c = catMap.get(i.categoriaId);
    if (!c?.porPieza) continue;
    const p = i.piezaId ? piezaMap.get(i.piezaId) : undefined;
    if (!p || p.categoriaId !== c.id) return { error: `Escoja la joya de ${c.nombre} por su código.` };
    if (p.estado !== "DISPONIBLE") return { error: `La joya ${p.codigo} ya se vendió.` };
    if (p.localId !== localId) return { error: `La joya ${p.codigo} está en otro local.` };
  }

  const items = v.items.map((i) => {
    const c = catMap.get(i.categoriaId)!;
    const pieza = c.porPieza && i.piezaId ? piezaMap.get(i.piezaId) : undefined;
    if (pieza) {
      return {
        ...i,
        pesoCg: pieza.pesoCg,
        cantidad: 1,
        precioGramo: pieza.precio, // en joyas preciosas es el precio de la pieza
        hechura: 0,
        subtotal: pieza.precio,
        controlaPeso: c.controlaPeso,
        esServicio: false,
        pieza,
      };
    }
    const subtotal = c.controlaPeso
      ? Math.round((i.pesoCg * i.precioGramo) / 100) + i.hechura
      : i.precioGramo * i.cantidad + i.hechura;
    return { ...i, pesoCg: c.controlaPeso ? i.pesoCg : 0, subtotal, controlaPeso: c.controlaPeso, esServicio: c.esServicio, pieza: undefined };
  });
  if (items.some((i) => i.controlaPeso && i.pesoCg <= 0)) return { error: "Escriba el peso de cada pieza." };
  if (items.some((i) => i.esServicio && (i.subtotal <= 0 || !i.descripcion.trim())))
    return { error: "Escriba el valor y qué trabajo es en cada fabricación o reparación." };
  const total = items.reduce((a, i) => a + i.subtotal, 0);
  if (total > 2_000_000_000) return { error: "El total es demasiado alto. Revise el peso y el precio." };

  try {
    const venta = await db.$transaction(async (tx) => {
      const numero = await siguienteNumeroFactura(tx, localId);
      const venta = await tx.venta.create({
        data: {
          numero,
          localId,
          usuarioId: s.id,
          clienteNombre: v.clienteNombre?.trim() || null,
          clienteDocumento: v.clienteDocumento?.trim() || null,
          metodoPago: v.metodoPago,
          proveedorId,
          canal: v.canal,
          red: v.canal === "REDES" ? v.red : null,
          redOtra: v.canal === "REDES" && v.red === "OTRA" ? v.redOtra?.trim() : null,
          clienteTipoDoc: v.facturaElectronica ? v.clienteTipoDoc ?? "CC" : null,
          clienteCorreo: v.facturaElectronica ? v.clienteCorreo?.trim() || null : null,
          facturaElectronica: v.facturaElectronica,
          alegraEstado: v.facturaElectronica ? "PENDIENTE" : null,
          total,
        },
      });
      for (const i of items) {
        // Fabricación y reparación son trabajos: no salen del inventario ni tienen costo de mercancía.
        const { costoSalida } = i.esServicio
          ? { costoSalida: { medida: 0, valor: 0 } }
          : await registrarMovimiento(tx, {
              localId,
              categoriaId: i.categoriaId,
              usuarioId: s.id,
              tipo: "VENTA",
              pesoCg: -i.pesoCg,
              cantidad: -i.cantidad,
              referencia: numero,
              // Una joya preciosa sale con su costo exacto (o sin costo si no lo tiene).
              costoExacto: i.pieza ? { medida: i.pieza.costo > 0 ? i.pieza.pesoCg : 0, valor: i.pieza.costo } : undefined,
            });
        if (i.pieza) {
          // Solo si sigue disponible: evita vender la misma joya dos veces al mismo tiempo.
          const marcada = await tx.pieza.updateMany({ where: { id: i.pieza.id, estado: "DISPONIBLE", localId }, data: { estado: "VENDIDA" } });
          if (marcada.count === 0) throw new ErrorUsuario(`La joya ${i.pieza.codigo} ya se vendió o la movieron a otro local.`);
        }
        await tx.ventaItem.create({
          data: {
            ventaId: venta.id,
            categoriaId: i.categoriaId,
            descripcion: i.descripcion,
            pesoCg: i.pesoCg,
            cantidad: i.cantidad,
            precioGramo: i.precioGramo,
            hechura: i.hechura,
            subtotal: i.subtotal,
            costoMedida: costoSalida.medida,
            costo: costoSalida.valor,
            piezaId: i.pieza?.id ?? null,
          },
        });
      }
      return venta;
    }); // el tiempo de la transacción se define para todo el sistema en src/lib/db.ts
    // Primero se guarda la venta; después se envía a Alegra. Si Alegra falla, la venta no se pierde.
    if (v.facturaElectronica) await facturarVenta(venta.id);
    revalidatePath("/", "layout");
    return { id: venta.id };

  } catch (e) {
    return { error: mensajeSeguro(e, "crearVenta") };
  }
}

/** Vuelve a la factura con un aviso (los errores lanzados se ven en inglés y genéricos en producción). */
const volverAFactura = (id: number, clave: "ok" | "error", msg: string) =>
  redirect(`/ventas/${id}?${clave}=${encodeURIComponent(msg)}`);

export async function anularVenta(form: FormData) {
  const s = await requireSesion();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id) || id <= 0) redirect("/ventas");
  if (s.rol !== "ADMIN") volverAFactura(id, "error", "Solo el administrador puede anular facturas.");
  const motivo = String(form.get("motivo") || "").trim();
  if (!motivo) volverAFactura(id, "error", "Escriba por qué anula la factura.");
  if (motivo.length > 300) volverAFactura(id, "error", "El motivo es muy largo (máximo 300 letras).");

  let error: string | null = null;
  try {
    await db.$transaction(async (tx) => {
      const venta = await tx.venta.findUnique({ where: { id }, include: { items: { include: { categoria: true } } } });
      if (!venta) throw new ErrorUsuario("Esa factura no existe.");
      // Una factura electrónica ya enviada a la DIAN sigue valiendo aunque se anule aquí: se anula
      // con una nota crédito en Alegra.
      if (venta.alegraEstado === "ENVIADA" || venta.alegraEstado === "ENVIANDO" || venta.alegraEstado === "VERIFICAR")
        throw new ErrorUsuario("Esta venta tiene (o puede tener) factura electrónica: anúlela con una nota crédito en Alegra.");
      // Candado: solo una anulación pasa (con un doble clic se devolvía el inventario dos veces).
      const tomada = await tx.venta.updateMany({
        where: { id, estado: "ACTIVA" },
        data: { estado: "ANULADA", motivoAnulacion: motivo, anuladaPorId: s.id, anuladaEn: new Date() },
      });
      if (tomada.count === 0) throw new ErrorUsuario("Esta factura ya estaba anulada.");
      await auditar(s, "VENTA_ANULADA", { entidad: "Venta", entidadId: id, detalle: { numero: venta.numero, total: venta.total, motivo } }, tx);
      for (const i of venta.items.filter((i) => !i.categoria.esServicio)) {
        await registrarMovimiento(tx, {
          localId: venta.localId,
          categoriaId: i.categoriaId,
          usuarioId: s.id,
          tipo: "ANULACION",
          pesoCg: i.pesoCg,
          cantidad: i.cantidad,
          referencia: venta.numero,
          nota: `Anulación: ${motivo}`,
          // Vuelve al inventario con el mismo costo con que salió.
          costo: { medida: i.costoMedida, valor: i.costo },
        });
        // La joya preciosa vuelve a estar disponible para la venta.
        if (i.piezaId) await tx.pieza.update({ where: { id: i.piezaId }, data: { estado: "DISPONIBLE" } });
      }
    });
  } catch (e) {
    error = mensajeSeguro(e, "anularVenta");
  }
  revalidatePath("/", "layout");
  if (error) volverAFactura(id, "error", error);
  volverAFactura(id, "ok", "La factura quedó anulada y las piezas volvieron al inventario.");
}

/** Vuelve a enviar a Alegra una venta con factura electrónica que quedó pendiente o con error. */
export async function reintentarFactura(form: FormData) {
  const s = await exigirPermiso("vender", "facturas");
  const id = Number(form.get("id"));
  if (!Number.isInteger(id) || id <= 0) redirect("/ventas");
  const venta = await db.venta.findUnique({ where: { id }, select: { localId: true, facturaElectronica: true } });
  if (!venta || (s.rol !== "ADMIN" && venta.localId !== s.localId)) redirect("/ventas");
  // Solo las ventas que se hicieron CON factura electrónica: una venta normal no se convierte en factura DIAN.
  if (!venta.facturaElectronica) volverAFactura(id, "error", "Esta venta se hizo sin factura electrónica.");
  const r = await facturarVenta(id);
  revalidatePath(`/ventas/${id}`);
  volverAFactura(id, r.ok ? "ok" : "error", r.mensaje);
}

/**
 * Factura en "Verificar en Alegra": el administrador ya la buscó en Alegra y dice si está
 * (con su número) o si hay que enviarla de nuevo.
 */
export async function resolverFacturaDudosa(form: FormData) {
  const s = await requireSesion();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id) || id <= 0) redirect("/ventas");
  if (s.rol !== "ADMIN") volverAFactura(id, "error", "Solo el administrador puede resolver esto.");
  const existe = form.get("existe") === "si";
  const r = await resolverVerificacion(id, existe ? { existe: true, numero: String(form.get("numero") || "") } : { existe: false });
  revalidatePath(`/ventas/${id}`);
  volverAFactura(id, r.ok ? "ok" : "error", r.mensaje);
}
